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
  // Optimistic: mark it locally right away.
  tile.claimed = true;
  state.optimistic.set(tile.id, Date.now() + CONFIG.optimisticMs);
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
    .then((res) => (res.ok ? res.json() : null))
    .then((rows) => {
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
    .catch(() => { /* refetch on return will reconcile */ });

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
  if (isTouch) {
    location.href = appUrl;
    setTimeout(() => {
      if (!document.hidden) location.href = webUrl;
    }, 1400);
  } else {
    window.open(webUrl, '_blank', 'noopener');
  }
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

  refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, CONFIG.pollMs);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('focus', refresh);
  window.addEventListener('pageshow', refresh);
}

init();
