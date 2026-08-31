/* Ashlyn's Journey to Narnia — live fundraising board.
   Plain JS + Supabase REST (tiles table + security-definer RPCs).
   No frameworks, no build step. */

const CONFIG = {
  supabaseUrl: 'https://ldaufsxafavbpnifryic.supabase.co',
  // Publishable key — safe to ship in client code; the database only allows
  // reads and the narnia_* RPCs to this role.
  supabaseKey: 'sb_publishable_a3AVoQquWaTN1ZSZ_SBJWQ_3Obab-GC',
  venmoUser: 'erinochenski',
  goal: 750,
  pollMs: 12000,
  optimisticMs: 8000,
};

const TIERS = [
  { key: 'pointe',    amount: 5,  name: 'Pointe Shoes', icon: 'assets/icon-pointe.png' },
  { key: 'snowflake', amount: 10, name: 'Snowflakes',   icon: 'assets/icon-snowflake.png' },
  { key: 'crown',     amount: 15, name: 'Crowns',       icon: 'assets/icon-crown.png' },
  { key: 'shield',    amount: 20, name: 'Shields',      icon: 'assets/icon-shield.png' },
  { key: 'wardrobe',  amount: 25, name: 'Wardrobes',    icon: 'assets/icon-wardrobe.png' },
];

const state = {
  tiles: new Map(),      // id -> {id, tier, amount, claimed}
  optimistic: new Map(), // id -> expiry ms; keeps a just-claimed tile marked while the RPC lands
  pending: new Map(),    // id -> amount; claims whose RPC we couldn't confirm (retried on return)
  ownerPin: null,
};

/* ---------- Supabase REST ---------- */

function headers() {
  return {
    apikey: CONFIG.supabaseKey,
    Authorization: 'Bearer ' + CONFIG.supabaseKey,
    'Content-Type': 'application/json',
  };
}

async function api(path, options = {}) {
  const res = await fetch(CONFIG.supabaseUrl + path, { ...options, headers: headers() });
  if (!res.ok) {
    let message = 'Something went wrong (' + res.status + ')';
    try {
      const body = await res.json();
      if (body && body.message) message = body.message;
    } catch (_) { /* keep default */ }
    throw new Error(message);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const fetchTiles = () =>
  api('/rest/v1/narnia_board_tiles?select=id,tier,amount,claimed&order=id');
const rpc = (fn, args) =>
  api('/rest/v1/rpc/' + fn, { method: 'POST', body: JSON.stringify(args) });

/* ---------- DOM helpers ---------- */

const $ = (sel) => document.querySelector(sel);

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

/* ---------- Board ---------- */

function buildBoard() {
  const board = $('#board');
  TIERS.forEach((tier, ti) => {
    const section = el('section', 'tier');
    const head = el('div', 'tier-head');
    head.append(
      Object.assign(el('img'), { src: tier.icon, alt: '' }),
      el('span', 'tier-name', tier.name + ' — $' + tier.amount),
      el('span', 'tier-count')
    );
    const grid = el('div', 'tier-tiles');
    for (let c = 1; c <= 10; c++) {
      const id = ti * 10 + c;
      const btn = el('button', 'tile');
      btn.type = 'button';
      btn.dataset.id = id;
      const art = el('span', 'tile-art');
      art.append(
        Object.assign(el('img'), { src: tier.icon, alt: '' }),
        el('span', 'seal', '&hearts;')
      );
      art.querySelector('.seal').setAttribute('aria-hidden', 'true');
      btn.append(art, el('span', 'amt', '$' + tier.amount), el('span', 'claimed-note', 'Claimed'));
      btn.addEventListener('click', () => onTileTap(id));
      grid.append(btn);
    }
    section.append(head, grid);
    board.append(section);
  });
}

function applyState() {
  let raised = 0;
  const counts = new Map(TIERS.map((t) => [t.key, 0]));
  state.tiles.forEach((t) => {
    if (t.claimed) {
      raised += t.amount;
      counts.set(t.tier, (counts.get(t.tier) || 0) + 1);
    }
    const btn = document.querySelector('.tile[data-id="' + t.id + '"]');
    if (!btn) return;
    btn.classList.toggle('claimed', t.claimed);
    btn.setAttribute(
      'aria-label',
      t.claimed
        ? '$' + t.amount + ' square, already claimed'
        : 'Claim a $' + t.amount + ' square'
    );
  });
  document.querySelectorAll('.tier').forEach((section, i) => {
    const tier = TIERS[i];
    section.querySelector('.tier-count').textContent =
      (counts.get(tier.key) || 0) + ' of 10 claimed';
  });
  $('#raised').textContent = '$' + raised;
  $('#bar-fill').style.width = Math.min(100, (raised / CONFIG.goal) * 100) + '%';
  const meter = $('#progress-meter');
  if (meter) meter.setAttribute('aria-valuenow', raised);
}

async function refresh() {
  let rows;
  try {
    rows = await fetchTiles();
  } catch (_) {
    return; // offline / transient — the next poll will catch up
  }
  const now = Date.now();
  rows.forEach((r) => {
    const expiry = state.optimistic.get(r.id);
    if (expiry && !r.claimed && now < expiry) {
      r.claimed = true; // our own claim may not be committed yet
    } else if (expiry) {
      state.optimistic.delete(r.id);
    }
    state.tiles.set(r.id, r);
  });
  applyState();
}

/* ---------- Donor claim flow ---------- */

function onTileTap(id) {
  const tile = state.tiles.get(id);
  if (!tile) return;
  if (state.ownerPin) return ownerToggle(tile);
  if (tile.claimed) {
    return showToast("This one's claimed — thank you! Pick another.");
  }
  openClaimModal(tile);
}

function openClaimModal(tile) {
  const tier = TIERS.find((t) => t.key === tile.tier) || TIERS[0];
  showModal({
    icon: tier.icon,
    title: 'Claim this $' + tile.amount + ' square?',
    body:
      'It will be marked off for Ashlyn, and Venmo will open to ' +
      '<strong>@' + CONFIG.venmoUser + '</strong> with <strong>$' + tile.amount +
      '</strong> ready to send.',
    actions: [
      {
        label: 'Claim & pay with Venmo',
        className: 'btn btn-venmo',
        onClick: () => confirmClaim(tile),
      },
      { label: 'Not yet', className: 'btn', onClick: closeModal },
    ],
  });
}

function confirmClaim(tile) {
  // Re-check the live map: a poll may have marked this square claimed while the
  // donor sat on the modal. `tile` is the object captured at tap time and never
  // updates, so read the current row before committing to a payment.
  const live = state.tiles.get(tile.id);
  if (live && live.claimed) {
    closeModal();
    state.optimistic.delete(tile.id);
    applyState();
    showToast("This one was just claimed — pick another! Nothing was sent yet.");
    return;
  }

  // Optimistic: mark it locally right away.
  tile.claimed = true;
  if (live) live.claimed = true;
  state.optimistic.set(tile.id, Date.now() + CONFIG.optimisticMs);
  // Remember the claim before we hand off to Venmo — if the POST is cut short by
  // the app switch, we retry it when the donor returns (see retryPending).
  state.pending.set(tile.id, tile.amount);
  savePending();
  applyState();
  closeModal();

  // Fire the claim without awaiting — iOS can suppress the Venmo handoff if we
  // navigate after an await. keepalive lets the POST finish while backgrounded.
  fetch(CONFIG.supabaseUrl + '/rest/v1/rpc/narnia_claim_tile', {
    method: 'POST',
    keepalive: true,
    headers: headers(),
    body: JSON.stringify({ p_tile_id: tile.id }),
  })
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error('http ' + res.status))))
    .then((rows) => {
      state.pending.delete(tile.id);
      savePending();
      if (Array.isArray(rows) && rows.length === 0) {
        // Someone beat us to it.
        state.optimistic.delete(tile.id);
        showToast(
          'That square was just claimed by someone else — pick another! ' +
            'If you already paid, the owner can sort it out.'
        );
        refresh();
      }
    })
    .catch(() => {
      // Couldn't confirm the claim landed. Keep the pending record (retried on
      // return) and, if we're still on the page, tell the donor rather than
      // letting the square silently reopen under them.
      showToast(
        "We couldn't confirm that square just now — if you paid, don't worry, " +
          'the owner can mark it. You can also tap it again when you get back.'
      );
    });

  goToVenmo(tile.amount);
}

function goToVenmo(amount) {
  const note = encodeURIComponent("Ashlyn's Journey to Narnia - $" + amount + ' square');
  const appUrl =
    'venmo://paycharge?txn=pay&recipients=' + CONFIG.venmoUser +
    '&amount=' + amount + '&note=' + note;
  const webUrl =
    'https://venmo.com/u/' + CONFIG.venmoUser +
    '?txn=pay&amount=' + amount + '&note=' + note;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  if (!isTouch) {
    window.open(webUrl, '_blank', 'noopener');
    return;
  }

  // Try the app's custom scheme, then fall back to the web pay page ONLY if the
  // handoff didn't happen. The fallback timer is cancelled the moment the page
  // is hidden (app opened, or the "Open in Venmo?" sheet took over), so it can't
  // yank a donor off the board mid-sheet or after they return from paying.
  const start = Date.now();
  let timer = null;
  const cleanup = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', onHide);
  };
  const onHide = () => { if (document.hidden) cleanup(); };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', onHide);
  timer = setTimeout(() => {
    timer = null;
    cleanup();
    // Only if we're still on a fresh, visible board (app not installed). If the
    // timer was suspended while the donor was in Venmo, the clock jumped well
    // past our window — don't navigate them away on return.
    if (!document.hidden && Date.now() - start < 2600) {
      location.href = webUrl;
    }
  }, 1400);
  location.href = appUrl;
}

/* Pending claims — survive the Venmo app switch so a dropped POST can be retried. */

function savePending() {
  try {
    localStorage.setItem('narniaPending', JSON.stringify([...state.pending]));
  } catch (_) {}
}

function loadPending() {
  try {
    const raw = localStorage.getItem('narniaPending');
    if (raw) JSON.parse(raw).forEach(([id, amt]) => state.pending.set(Number(id), amt));
  } catch (_) {}
}

async function retryPending() {
  if (!state.pending.size) return;
  for (const id of [...state.pending.keys()]) {
    try {
      await rpc('narnia_claim_tile', { p_tile_id: id });
      // Success or [] (already claimed, possibly by our own earlier call) both
      // mean there's nothing left to retry for this square.
      state.pending.delete(id);
    } catch (_) { /* still unreachable — keep it for the next return */ }
  }
  savePending();
  refresh();
}

/* ---------- Owner mode ---------- */

function openPinModal() {
  showModal({
    title: 'Owner sign-in',
    body: '<input type="password" id="pin-input" class="pin" autocomplete="current-password" placeholder="Owner PIN">',
    actions: [
      { label: 'Enter owner mode', className: 'btn btn-primary', onClick: submitPin },
      { label: 'Cancel', className: 'btn', onClick: closeModal },
    ],
    onOpen: () => {
      const input = $('#pin-input');
      input.focus();
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitPin();
      });
    },
  });
}

async function submitPin() {
  const pin = ($('#pin-input') || {}).value || '';
  if (!pin) return;
  try {
    const ok = await rpc('narnia_verify_pin', { p_pin: pin });
    if (ok === true) {
      closeModal();
      enterOwnerMode(pin);
    } else {
      showToast('Incorrect PIN.');
    }
  } catch (err) {
    showToast(err.message);
  }
}

function enterOwnerMode(pin) {
  state.ownerPin = pin;
  try { sessionStorage.setItem('narniaPin', pin); } catch (_) {}
  document.body.classList.add('owner-mode');
  $('#owner-bar').hidden = false;
  showToast('Owner mode on — tap squares to mark or un-mark them.');
}

function exitOwnerMode() {
  state.ownerPin = null;
  try { sessionStorage.removeItem('narniaPin'); } catch (_) {}
  document.body.classList.remove('owner-mode');
  $('#owner-bar').hidden = true;
}

function ownerToggle(tile) {
  if (tile.claimed) {
    showModal({
      title: 'Un-mark this $' + tile.amount + ' square?',
      body: "Use this when a payment didn't come through.",
      actions: [
        {
          label: 'Un-mark it',
          className: 'btn btn-primary',
          onClick: () => { closeModal(); ownerSetTile(tile, false); },
        },
        { label: 'Cancel', className: 'btn', onClick: closeModal },
      ],
    });
  } else {
    ownerSetTile(tile, true); // e.g. a cash gift
  }
}

async function ownerSetTile(tile, claimed) {
  try {
    const rows = await rpc('narnia_set_tile', {
      p_tile_id: tile.id,
      p_claimed: claimed,
      p_pin: state.ownerPin,
    });
    if (Array.isArray(rows) && rows[0]) {
      state.tiles.set(rows[0].id, {
        id: rows[0].id, tier: rows[0].tier, amount: rows[0].amount, claimed: rows[0].claimed,
      });
      state.optimistic.delete(tile.id);
      applyState();
    }
  } catch (err) {
    showToast(err.message);
  }
}

function openResetModal() {
  showModal({
    title: 'Reset the whole board?',
    body:
      'Every square goes back to unclaimed. Type <strong>RESET</strong> to confirm.' +
      '<input type="text" id="reset-input" class="pin" autocomplete="off" placeholder="RESET">',
    actions: [
      {
        label: 'Reset board',
        className: 'btn btn-primary',
        onClick: async () => {
          const val = (($('#reset-input') || {}).value || '').trim().toUpperCase();
          if (val !== 'RESET') return showToast('Type RESET to confirm.');
          try {
            const n = await rpc('narnia_reset_board', { p_pin: state.ownerPin });
            closeModal();
            showToast('Board reset — ' + n + ' squares cleared.');
            refresh();
          } catch (err) {
            showToast(err.message);
          }
        },
      },
      { label: 'Cancel', className: 'btn', onClick: closeModal },
    ],
  });
}

/* ---------- Modal + toast ---------- */

function showModal({ icon, title, body, actions, onOpen }) {
  const card = $('#modal-card');
  card.innerHTML = '';
  if (icon) {
    card.append(Object.assign(el('img', 'modal-icon'), { src: icon, alt: '' }));
  }
  card.append(el('h2', 'modal-title', title), el('div', 'modal-body', body || ''));
  const row = el('div', 'modal-actions');
  actions.forEach((a) => {
    const btn = el('button', a.className, a.label);
    btn.type = 'button';
    btn.addEventListener('click', a.onClick);
    row.append(btn);
  });
  card.append(row);
  $('#modal-overlay').hidden = false;
  if (onOpen) onOpen();
}

function closeModal() {
  $('#modal-overlay').hidden = true;
}

let toastTimer;
function showToast(message, ms = 5000) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, ms);
}

/* ---------- Init ---------- */

function init() {
  buildBoard();

  $('#owner-key').addEventListener('click', () => {
    if (state.ownerPin) return; // already in owner mode
    openPinModal();
  });
  $('#btn-reset').addEventListener('click', openResetModal);
  $('#btn-exit').addEventListener('click', exitOwnerMode);
  $('#modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  let storedPin = null;
  try { storedPin = sessionStorage.getItem('narniaPin'); } catch (_) {}
  if (storedPin) enterOwnerMode(storedPin);
  else if (new URLSearchParams(location.search).get('owner')) openPinModal();

  loadPending();
  refresh().then(retryPending);
  setInterval(() => { if (!document.hidden) refresh(); }, CONFIG.pollMs);
  const onReturn = () => { if (!document.hidden) refresh().then(retryPending); };
  document.addEventListener('visibilitychange', onReturn);
  window.addEventListener('focus', onReturn);
  window.addEventListener('pageshow', onReturn);
}

init();
