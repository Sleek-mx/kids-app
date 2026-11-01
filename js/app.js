/* Router + home. Everything else is a section module. */

import { el, clear, loadJSON, esc } from './ui.js';
import * as games from './games.js';
import * as homework from './homework.js';
import * as make from './make.js';
import * as learn from './learn.js';

const view = document.getElementById('view');

const SECTIONS = { games, homework, make, ai: learn };

const TONES = {
  games: ['--coral', '--coral-ink'],
  homework: ['--teal', '--teal-ink'],
  make: ['--violet', '--violet-ink'],
  ai: ['--sky', '--sky-ink'],
  '': ['--coral', '--coral-ink'],
};

let cleanup = () => {};

/* ---------- home ---------- */

const SECTIONS_COPY = [
  {
    key: 'games',
    href: '#/games',
    ico: '🎮',
    title: 'Games',
    copy: 'Five quick games — memory, times tables, word scramble, maths sprint and pattern echo. Each one remembers your best score.',
    go: 'Play something',
  },
  {
    key: 'homework',
    href: '#/homework',
    ico: '📚',
    title: 'Homework',
    copy: '173 real exam questions across eight subjects with worked answers, plus a quick practice quiz you can set yourself.',
    go: 'Get unstuck',
  },
  {
    key: 'make',
    href: '#/make',
    ico: '🛠️',
    title: 'Make',
    copy: '135 things to build, fizz, draw, crochet and move — all from stuff already in the house. Plus eleven short stories.',
    go: 'Find something to do',
  },
  {
    key: 'ai',
    href: '#/ai',
    ico: '🤖',
    title: 'Learn AI',
    copy: 'Six short lessons on how smart machines really work, why they get things wrong, and how to stay safe around them.',
    go: 'Start lesson one',
  },
];

async function renderHome() {
  const stats = [
    ['5', 'Games'],
    ['173', 'Exam questions'],
    ['135', 'Things to make'],
    ['6', 'AI lessons'],
  ];

  view.innerHTML = `
    <section class="hero">
      <span class="eyebrow">Free · no sign-up · works offline</span>
      <h1 class="display">Something to play,<br>something to <em>learn</em>.</h1>
      <p class="lede">One place for the whole afternoon: quick games when you are bored, real homework help when you are stuck, and a proper explanation of how AI works — written for kids, not for adults.</p>
      <div class="hero-stats">
        ${stats.map(([n, label]) => `<div class="stat"><b>${n}</b><span>${esc(label)}</span></div>`).join('')}
      </div>
    </section>

    <section class="section-grid">
      ${SECTIONS_COPY.map((s) => `
        <a class="section-card" data-tone="${s.key}" href="${s.href}">
          <span class="ico" aria-hidden="true">${s.ico}</span>
          <h2>${esc(s.title)}</h2>
          <p>${esc(s.copy)}</p>
          <span class="go">${esc(s.go)} <span aria-hidden="true">→</span></span>
        </a>`).join('')}
    </section>

    <section class="card">
      <h2>Built for three kids, in one app</h2>
      <p class="muted">Ivy is ten and likes science, crochet and drawing. Liam likes anything that moves, fizzes or gets built. Sammie is in secondary school and needs real exam practice. Their three separate apps were folded into this one, so there is a single link to remember.</p>
      <p class="small muted">Nothing here needs an account. Your scores and finished lessons stay on this device. The only thing that leaves is the text you type when you ask for an explanation.</p>
    </section>
  `;
}

/* ---------- router ---------- */

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean).map(decodeURIComponent);
  return { name: parts[0] || '', params: parts.slice(1) };
}

function setTone(name) {
  const [accent, ink] = TONES[name] || TONES[''];
  const root = document.documentElement.style;
  root.setProperty('--accent', `var(${accent})`);
  root.setProperty('--accent-ink', `var(${ink})`);
}

function setNav(name) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

let renderToken = 0;

async function route() {
  const { name, params } = parseHash();
  const section = SECTIONS[name];

  cleanup();
  cleanup = () => {};

  setTone(section ? name : '');
  setNav(section ? name : '');

  const token = ++renderToken;
  clear(view);
  window.scrollTo(0, 0);

  if (!section) {
    await renderHome();
    return;
  }

  view.innerHTML = '<div class="loading">Loading…</div>';

  try {
    const dispose = await section.render(view, params);
    if (token !== renderToken) return;
    if (typeof dispose === 'function') cleanup = dispose;
  } catch (err) {
    if (token !== renderToken) return;
    console.error(err);
    view.innerHTML = `
      <div class="empty">
        <div class="ico" aria-hidden="true">😕</div>
        <h2>That page did not load</h2>
        <p class="muted">${esc(err.message || 'Something went wrong.')}</p>
        <p><a class="btn btn--ghost" href="#/">Back to the start</a></p>
      </div>`;
  }
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);
if (document.readyState !== 'loading') route();

/* Re-render the active section when the app comes back after being away,
   but never while a game is mid-play — that would wipe the board. */
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') hiddenAt = Date.now();
  else if (hiddenAt && Date.now() - hiddenAt > 30 * 60 * 1000) route();
});

/* ---------- service worker ---------- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
