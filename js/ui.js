/* Small shared helpers: DOM, storage, sheet, toast. */

const PREFIX = 'sleekkids.v1.';

export const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* private mode, quota — nothing useful to do */
    }
  },
  del(key) {
    try { localStorage.removeItem(PREFIX + key); } catch { /* ignore */ }
  },
};

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Build an element from an HTML string. Returns the first element. */
export function el(htmlString) {
  const t = document.createElement('template');
  t.innerHTML = htmlString.trim();
  return t.content.firstElementChild;
}

export function frag(htmlString) {
  const t = document.createElement('template');
  t.innerHTML = htmlString.trim();
  return t.content;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/* ---------- data loading ---------- */

const cache = new Map();

export async function loadJSON(path) {
  if (cache.has(path)) return cache.get(path);
  const p = fetch(path, { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error(`${path}: ${r.status}`);
    return r.json();
  });
  cache.set(path, p);
  return p;
}

/* ---------- toast ---------- */

let toastTimer = null;
export function toast(message) {
  document.querySelector('.toast')?.remove();
  const node = el(`<div class="toast" role="status">${esc(message)}</div>`);
  document.body.appendChild(node);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.remove(), 2200);
}

/* ---------- bottom sheet ---------- */

export function openSheet({ title, content, labelledBy }) {
  const back = el(`
    <div class="sheet-back" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <div class="sheet">
        <div class="sheet-head">
          <h2 id="sheet-title">${esc(title || '')}</h2>
          <button class="sheet-close" type="button" aria-label="Close">✕</button>
        </div>
        <div class="sheet-body"></div>
      </div>
    </div>`);

  const body = back.querySelector('.sheet-body');
  if (content instanceof Node) body.appendChild(content);
  else body.innerHTML = content || '';

  const previousFocus = document.activeElement;

  function close() {
    back.remove();
    document.removeEventListener('keydown', onKey);
    document.body.style.removeProperty('overflow');
    if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  back.addEventListener('click', (e) => {
    if (e.target === back) close();
  });
  back.querySelector('.sheet-close').addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.style.overflow = 'hidden';
  document.body.appendChild(back);

  requestAnimationFrame(() => back.querySelector('.sheet-close').focus({ preventScroll: true }));
  if (labelledBy) back.setAttribute('aria-labelledby', labelledBy);

  return close;
}

/* ---------- misc ---------- */

export function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function range(n) {
  return Array.from({ length: n }, (_, i) => i);
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

/** Fire-and-forget AI call. Returns parsed JSON or throws. */
export async function askAI(endpoint, payload, timeoutMs = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}
