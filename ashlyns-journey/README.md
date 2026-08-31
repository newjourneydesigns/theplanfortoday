# Ashlyn's Journey to Narnia — digital fundraising board

A live, shareable version of the printed "pick a square" poster. Donors open the
link, tap a square, it's marked off for everyone instantly, and Venmo opens
pre-filled with the amount to **@erinochenski**. 50 squares, $750 goal.

**Live site:** https://ashlyns-journey-to-narnia.netlify.app

Plain HTML/CSS/JS — no framework, no build step. State lives in the Supabase
project **NJD-PORTAL** (tables/functions prefixed `narnia_`); hosting is Netlify
(publish dir set by the repo-root `netlify.toml`).

## How it works

- `index.html` / `styles.css` / `app.js` — the whole app. Config (Supabase URL,
  publishable key, Venmo handle, poll interval) sits at the top of `app.js`.
  The publishable key is safe to ship: the database only permits reading tiles
  and calling the `narnia_*` functions.
- The page polls every 12 s while visible (plus refetches on focus/return), so
  everyone sees claims within seconds. Realtime is already enabled server-side
  if you ever want push updates instead.
- Donor tap → confirm → square is claimed via `narnia_claim_tile` (which only
  ever flips an *unclaimed* square, so two donors can't take the same one) →
  Venmo opens pre-filled. If someone beat them to the square, they get a toast
  asking them to pick another.
- **Undo (donor side):** each claim saves a private token in that browser, so the
  person who claimed a square can tap it again and "Undo my claim" if it was a
  mistake — but only from the same device. The token column is not readable
  through the public API, so nobody can undo anyone else's square.
- **Sold-out state:** when all 50 squares are claimed the board shows a "Fully
  funded!" banner, a 100% bar, and taps just give a celebratory message.
- `assets/` artwork is cropped from the original poster scan
  (`assets/poster-source.png`) by `tools/make_assets.py` (needs Pillow).

## Encouragement wall

Below the board, anyone can leave Ashlyn a short note (optional first name; blank
shows "A friend"). Notes appear instantly. A small built-in profanity filter
blocks the most obvious bad words — it is intentionally basic, so **your owner
tools are the real backstop**:

- In owner mode, every note gets **Hide** (removes it from public view but keeps
  it, so you can Unhide later) and **Delete** (removes it for good). Owner mode
  also shows hidden notes, dimmed, so you can restore them.
- Notes are capped at 280 characters; no emails or last names are collected.
- Rendering uses `textContent`, so a note can never inject markup or scripts.

## Owner mode (for un-marking squares if a payment never arrives)

1. Tap the small key (⚷) next to the Venmo line in the footer — or open the
   site with `?owner=1`.
2. Enter the owner PIN.
3. Tap any square to toggle it: un-mark one whose payment fell through, or mark
   one by hand (e.g. a cash gift). **Reset board** clears every square
   (type `RESET` to confirm). **Exit** leaves owner mode.

Five wrong PIN attempts lock owner sign-in for 15 minutes (donor claiming is
unaffected).

### Changing the PIN / clearing a lockout

Run in the Supabase SQL editor (project NJD-PORTAL):

```sql
-- change the PIN
update public.narnia_board_config
   set pin_hash = extensions.crypt('NEW_PIN_HERE', extensions.gen_salt('bf', 10)),
       failed_attempts = 0, locked_until = null
 where id;

-- just clear a lockout
update public.narnia_board_config
   set failed_attempts = 0, locked_until = null
 where id;
```

## Database

`sql/schema.sql` is a reference copy of the applied migration
(`narnia_board_init`): tile table (public read-only via RLS), an API-invisible
config table holding the bcrypt PIN hash, and security-definer functions for
claim / verify-pin / set-tile / reset. The PIN itself is never stored in git or
migration history.

## Redeploying after a change

The site is a plain folder — any static deploy works:

- Ask Claude to redeploy, or
- Netlify UI → the site → **Deploys** → drag the `ashlyns-journey` folder in, or
- `npx netlify-cli deploy --prod` from the repo root (uses `netlify.toml`).

Local preview: `python3 -m http.server 8000` inside `ashlyns-journey/`.

## Regenerating artwork

```bash
pip install pillow
python3 tools/make_assets.py
```

Crop boxes are tuned to the 1536×1024 poster scan committed at
`assets/poster-source.png`.
