-- ============================================================
-- Narnia fundraising board + encouragement wall
-- Reference copy of the migrations applied to Supabase project
-- NJD-PORTAL: narnia_board_init, narnia_board_fix_null_pin,
-- narnia_board_messages_init, narnia_board_self_unclaim.
-- Requires: pgcrypto (installed in schema `extensions` on Supabase).
--
-- Security model:
--   * narnia_board_tiles: public read of the non-secret columns only
--     (claim_token is NOT granted to anon, so nobody can read another
--     claimer's undo token). Writes go through security-definer RPCs.
--   * narnia_board_config: no grants, no policies -> invisible to the API.
--   * narnia_board_messages: public read of visible notes; posts + all
--     moderation go through RPCs.
--   * Owner actions require the PIN (bcrypt hash in config; NULL PIN
--     rejected; 5 wrong tries = 15-minute lockout).
-- ============================================================

-- ---------- tiles ----------
create table public.narnia_board_tiles (
  id          integer primary key check (id between 1 and 50),
  tier        text    not null check (tier in ('pointe','snowflake','crown','shield','wardrobe')),
  amount      integer not null check (amount in (5,10,15,20,25)),
  col         integer not null check (col between 1 and 10),
  claimed     boolean not null default false,
  claimed_at  timestamptz,
  updated_at  timestamptz not null default now(),
  claim_token text                             -- private per-claim token for donor self-undo
);

insert into public.narnia_board_tiles (id, tier, amount, col)
select (r - 1) * 10 + c,
       (array['pointe','snowflake','crown','shield','wardrobe'])[r],
       (array[5,10,15,20,25])[r],
       c
from generate_series(1,5) r, generate_series(1,10) c;

-- ---------- config (holds the bcrypt PIN hash) ----------
create table public.narnia_board_config (
  id              boolean primary key default true check (id),  -- single-row table
  pin_hash        text not null,
  failed_attempts integer not null default 0,
  locked_until    timestamptz
);

-- ---------- messages (encouragement wall) ----------
create table public.narnia_board_messages (
  id         bigint generated always as identity primary key,
  name       text,
  body       text not null,
  hidden     boolean not null default false,
  created_at timestamptz not null default now(),
  constraint narnia_msg_body_len check (char_length(body) between 1 and 280),
  constraint narnia_msg_name_len check (name is null or char_length(name) <= 40)
);
create index narnia_board_messages_visible_idx
  on public.narnia_board_messages (created_at desc) where not hidden;

-- ---------- RLS + grants ----------
alter table public.narnia_board_tiles    enable row level security;
alter table public.narnia_board_config   enable row level security;
alter table public.narnia_board_messages enable row level security;

revoke all on public.narnia_board_tiles    from anon, authenticated;
revoke all on public.narnia_board_config   from anon, authenticated;
revoke all on public.narnia_board_messages from anon, authenticated;

-- Tiles: read only the non-secret columns (claim_token withheld).
grant select (id, tier, amount, col, claimed, claimed_at, updated_at)
  on public.narnia_board_tiles to anon, authenticated;
grant select on public.narnia_board_messages to anon, authenticated;

create policy "narnia tiles are publicly readable"
  on public.narnia_board_tiles for select
  to anon, authenticated using (true);

create policy "narnia visible messages are publicly readable"
  on public.narnia_board_messages for select
  to anon, authenticated using (not hidden);
-- narnia_board_config: NO policies, NO grants -> unreadable/unwritable via API.

-- ---------- private PIN check (throttled; NOT exposed to the API) ----------
create or replace function public.narnia_check_pin(p_pin text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  cfg public.narnia_board_config%rowtype;
  ok  boolean;
begin
  -- extensions.crypt is STRICT: crypt(NULL, hash) is NULL, so without this a
  -- NULL PIN would make `ok` NULL, `not ok` NULL, and the owner-guard IF fall
  -- through. Reject NULL up front and coalesce the result to be safe.
  if p_pin is null then
    return false;
  end if;
  select * into cfg from public.narnia_board_config where id for update;
  if not found then
    raise exception 'Board is not configured yet.';
  end if;
  if cfg.locked_until is not null and cfg.locked_until > now() then
    raise exception 'Too many wrong PINs - locked until %. Try again later.',
      to_char(cfg.locked_until, 'HH24:MI UTC');
  end if;
  ok := cfg.pin_hash = extensions.crypt(p_pin, cfg.pin_hash);
  if ok then
    update public.narnia_board_config set failed_attempts = 0, locked_until = null where id;
  else
    update public.narnia_board_config
       set failed_attempts = failed_attempts + 1,
           locked_until = case when failed_attempts + 1 >= 5
                               then now() + interval '15 minutes' end
     where id;
  end if;
  return coalesce(ok, false);
end;
$$;
revoke execute on function public.narnia_check_pin(text) from public, anon, authenticated;

-- ---------- tile RPCs ----------
-- Donor claim: only flips an UNclaimed tile; records the caller's private token.
create or replace function public.narnia_claim_tile(p_tile_id integer, p_token text default null)
returns setof public.narnia_board_tiles
language sql
security definer
set search_path = ''
as $$
  update public.narnia_board_tiles
     set claimed = true, claimed_at = now(), updated_at = now(), claim_token = p_token
   where id = p_tile_id and claimed = false
  returning *;
$$;

-- Donor self-release: un-claim ONLY when the private token matches.
create or replace function public.narnia_release_tile(p_tile_id integer, p_token text)
returns setof public.narnia_board_tiles
language sql
security definer
set search_path = ''
as $$
  update public.narnia_board_tiles
     set claimed = false, claimed_at = null, updated_at = now(), claim_token = null
   where id = p_tile_id and claimed = true
     and p_token is not null and claim_token is not distinct from p_token
  returning *;
$$;

-- Owner: verify PIN for entering owner mode.
create or replace function public.narnia_verify_pin(p_pin text)
returns boolean
language sql
security definer
set search_path = ''
as $$ select public.narnia_check_pin(p_pin); $$;

-- Owner: set a tile either way (un-claim a no-show payment / mark a cash gift).
create or replace function public.narnia_set_tile(p_tile_id integer, p_claimed boolean, p_pin text)
returns setof public.narnia_board_tiles
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_pin is null or not public.narnia_check_pin(p_pin) then
    raise exception 'Incorrect PIN.';
  end if;
  return query
    update public.narnia_board_tiles
       set claimed = p_claimed,
           claimed_at = case when p_claimed then coalesce(claimed_at, now()) end,
           claim_token = null,
           updated_at = now()
     where id = p_tile_id
    returning *;
end;
$$;

-- Owner: prank recovery - clear the whole board.
create or replace function public.narnia_reset_board(p_pin text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare n integer;
begin
  if p_pin is null or not public.narnia_check_pin(p_pin) then
    raise exception 'Incorrect PIN.';
  end if;
  update public.narnia_board_tiles
     set claimed = false, claimed_at = null, claim_token = null, updated_at = now()
   where claimed;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------- message RPCs ----------
-- Obvious-profanity guard. Deliberately small; owner delete is the backstop.
create or replace function public.narnia_text_is_clean(p_text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_text !~* '\m(fuck|shit|bitch|cunt|asshole|dick|piss|bastard|slut|whore|nigger|nigga|faggot|fag|retard|cum|pussy|cock|twat|wank|dildo|douche)\M';
$$;

-- Anon: post a note. Trims, validates, filters, inserts visible, returns the row.
create or replace function public.narnia_post_message(p_name text, p_body text)
returns setof public.narnia_board_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_body text := btrim(coalesce(p_body, ''));
begin
  if v_body = '' then
    raise exception 'Please write a short note before sending.';
  end if;
  if char_length(v_body) > 280 then
    raise exception 'Please keep your note to 280 characters or fewer.';
  end if;
  if v_name is not null and char_length(v_name) > 40 then
    v_name := left(v_name, 40);
  end if;
  if not public.narnia_text_is_clean(v_body)
     or (v_name is not null and not public.narnia_text_is_clean(v_name)) then
    raise exception 'Let''s keep it kind for Ashlyn. Please reword your note.';
  end if;
  return query
    insert into public.narnia_board_messages (name, body) values (v_name, v_body) returning *;
end;
$$;

-- Owner: hide or unhide a note.
create or replace function public.narnia_set_message_hidden(p_id bigint, p_hidden boolean, p_pin text)
returns setof public.narnia_board_messages
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_pin is null or not public.narnia_check_pin(p_pin) then
    raise exception 'Incorrect PIN.';
  end if;
  return query
    update public.narnia_board_messages set hidden = p_hidden where id = p_id returning *;
end;
$$;

-- Owner: delete a note for good.
create or replace function public.narnia_delete_message(p_id bigint, p_pin text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare n integer;
begin
  if p_pin is null or not public.narnia_check_pin(p_pin) then
    raise exception 'Incorrect PIN.';
  end if;
  delete from public.narnia_board_messages where id = p_id;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Owner: list ALL notes (including hidden) for moderation, newest first.
create or replace function public.narnia_list_messages_admin(p_pin text)
returns setof public.narnia_board_messages
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_pin is null or not public.narnia_check_pin(p_pin) then
    raise exception 'Incorrect PIN.';
  end if;
  return query
    select * from public.narnia_board_messages order by created_at desc;
end;
$$;

-- ---------- grants ----------
grant execute on function public.narnia_claim_tile(integer, text)                 to anon, authenticated;
grant execute on function public.narnia_release_tile(integer, text)               to anon, authenticated;
grant execute on function public.narnia_verify_pin(text)                          to anon, authenticated;
grant execute on function public.narnia_set_tile(integer, boolean, text)          to anon, authenticated;
grant execute on function public.narnia_reset_board(text)                         to anon, authenticated;
grant execute on function public.narnia_post_message(text, text)                  to anon, authenticated;
grant execute on function public.narnia_set_message_hidden(bigint, boolean, text) to anon, authenticated;
grant execute on function public.narnia_delete_message(bigint, text)              to anon, authenticated;
grant execute on function public.narnia_list_messages_admin(text)                 to anon, authenticated;

-- ---------- realtime (future upgrade path; the client polls) ----------
alter publication supabase_realtime add table public.narnia_board_tiles;
alter publication supabase_realtime add table public.narnia_board_messages;

-- ------------------------------------------------------------
-- PIN seed: run SEPARATELY (SQL editor / execute_sql) with the
-- real PIN so it never lands in migration history or git:
--
-- insert into public.narnia_board_config (id, pin_hash)
-- values (true, extensions.crypt('CHANGE_ME', extensions.gen_salt('bf', 10)))
-- on conflict (id) do update set pin_hash = excluded.pin_hash,
--   failed_attempts = 0, locked_until = null;
-- ------------------------------------------------------------
