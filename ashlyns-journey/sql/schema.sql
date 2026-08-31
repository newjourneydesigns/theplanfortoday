-- ============================================================
-- Narnia fundraising board — reference copy of the migration
-- applied to Supabase project NJD-PORTAL as `narnia_board_init`.
-- Requires: pgcrypto (installed in schema `extensions` on Supabase).
--
-- Security model:
--   * narnia_board_tiles: public read only (RLS select policy).
--   * narnia_board_config: no grants, no policies -> invisible to the API.
--   * All writes go through SECURITY DEFINER RPCs; owner actions require
--     the PIN (bcrypt hash in config; 5 wrong tries = 15-minute lockout).
-- ============================================================

create table public.narnia_board_tiles (
  id         integer primary key check (id between 1 and 50),
  tier       text    not null check (tier in ('pointe','snowflake','crown','shield','wardrobe')),
  amount     integer not null check (amount in (5,10,15,20,25)),
  col        integer not null check (col between 1 and 10),
  claimed    boolean not null default false,
  claimed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.narnia_board_config (
  id              boolean primary key default true check (id),  -- single-row table
  pin_hash        text not null,
  failed_attempts integer not null default 0,
  locked_until    timestamptz
);

-- seed 50 tiles
insert into public.narnia_board_tiles (id, tier, amount, col)
select (r - 1) * 10 + c,
       (array['pointe','snowflake','crown','shield','wardrobe'])[r],
       (array[5,10,15,20,25])[r],
       c
from generate_series(1,5) r, generate_series(1,10) c;

-- lock down: RLS + grants
alter table public.narnia_board_tiles  enable row level security;
alter table public.narnia_board_config enable row level security;

revoke all on public.narnia_board_tiles  from anon, authenticated;
revoke all on public.narnia_board_config from anon, authenticated;
grant select on public.narnia_board_tiles to anon, authenticated;

create policy "narnia tiles are publicly readable"
  on public.narnia_board_tiles for select
  to anon, authenticated
  using (true);
-- narnia_board_config: NO policies, NO grants -> unreadable/unwritable via API.

-- private PIN check (throttled, NOT exposed to the API)
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
    update public.narnia_board_config
       set failed_attempts = 0, locked_until = null where id;
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

-- Donor claim: only flips an UNclaimed tile; returns [] if someone beat you to it.
create or replace function public.narnia_claim_tile(p_tile_id integer)
returns setof public.narnia_board_tiles
language sql
security definer
set search_path = ''
as $$
  update public.narnia_board_tiles
     set claimed = true, claimed_at = now(), updated_at = now()
   where id = p_tile_id and claimed = false
  returning *;
$$;

-- Owner: verify PIN for entering owner mode (goes through the throttle).
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
     set claimed = false, claimed_at = null, updated_at = now()
   where claimed;
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.narnia_claim_tile(integer)              to anon, authenticated;
grant execute on function public.narnia_verify_pin(text)                 to anon, authenticated;
grant execute on function public.narnia_set_tile(integer, boolean, text) to anon, authenticated;
grant execute on function public.narnia_reset_board(text)                to anon, authenticated;

-- realtime (future upgrade path; the client ships polling-only)
do $$
begin
  alter publication supabase_realtime add table public.narnia_board_tiles;
exception when others then
  raise notice 'realtime publication skipped: %', sqlerrm;
end $$;

-- ------------------------------------------------------------
-- PIN seed: run SEPARATELY (SQL editor / execute_sql) with the
-- real PIN so it never lands in migration history or git:
--
-- insert into public.narnia_board_config (id, pin_hash)
-- values (true, extensions.crypt('CHANGE_ME', extensions.gen_salt('bf', 10)))
-- on conflict (id) do update set pin_hash = excluded.pin_hash,
--   failed_attempts = 0, locked_until = null;
-- ------------------------------------------------------------
