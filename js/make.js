/* Make: 135 activities from the two lab apps, plus the story shelf. */

import { esc, loadJSON, shuffle, pick, store, toast } from './ui.js';

let dataPromise = null;
let storiesPromise = null;

function activities() {
  if (!dataPromise) dataPromise = loadJSON('data/activities.json');
  return dataPromise;
}

function stories() {
  if (!storiesPromise) storiesPromise = loadJSON('data/stories.json');
  return storiesPromise;
}

const CAT_ORDER = ['science', 'craft', 'draw', 'move', 'build', 'fizz', 'crochet'];

/* ---------- grid ---------- */

async function renderGrid(view, params) {
  const { categories, items } = await activities();

  const cat = params[0] && categories[params[0]] ? params[0] : 'all';
  const query = params[1] ? decodeURIComponent(params[1]) : '';

  let list = items.slice().sort((a, b) => CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat));
  if (cat !== 'all') list = list.filter((x) => x.cat === cat);
  if (query) {
    const q = query.toLowerCase();
    list = list.filter((x) =>
      [x.title, x.why, ...(x.stuff || []), ...(x.steps || [])]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }

  view.innerHTML = `
    <header>
      <span class="eyebrow">Make something</span>
      <h1 class="display" style="margin:12px 0 10px">${items.length} things to do</h1>
      <p class="lede">All built from stuff already in a Kenyan house. Heat, blades and flames always name the adult in the step itself.</p>
    </header>

    <div class="toolbar">
      <input class="field" type="search" id="act-search" placeholder="Search — volcano, paper, bubbles…" value="${esc(query)}" aria-label="Search activities">
      <button class="btn btn--accent" type="button" id="surprise">Surprise me</button>
      <a class="btn btn--ghost" href="#/make/stories">Story shelf</a>
    </div>

    <div class="chips" role="group" aria-label="Filter by type">
      <button class="chip" type="button" data-cat="all" aria-pressed="${cat === 'all'}">Everything</button>
      ${CAT_ORDER.map((c) => `
        <button class="chip" type="button" data-cat="${c}" aria-pressed="${cat === c}">${esc(categories[c])}</button>`).join('')}
    </div>

    <p class="small muted" id="act-count">${list.length} activit${list.length === 1 ? 'y' : 'ies'}</p>

    <div class="act-grid" id="act-grid">
      ${list.map((x) => `
        <button class="act" type="button" data-id="${esc(x.id)}">
          <div class="top">
            <span class="badge" data-cat="${esc(x.cat)}">${esc(categories[x.cat] || x.cat)}</span>
            <span class="tiny muted">${esc(x.level || '')}</span>
          </div>
          <h3>${esc(x.title)}</h3>
          <div class="meta"><span>${esc(x.mins)} min</span><span>${esc(x.by)}</span></div>
          <span class="why">${esc(x.why || '')}</span>
        </button>`).join('')}
    </div>

    ${list.length === 0 ? `<div class="empty"><div class="ico" aria-hidden="true">🔍</div><p>Nothing matches that. Try a different word.</p></div>` : ''}
  `;

  view.querySelector('#act-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (b) location.hash = `#/make/a/${b.dataset.id}`;
  });

  view.querySelector('.chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    const next = b.dataset.cat;
    location.hash = next === 'all' ? '#/make' : `#/make/${next}`;
  });

  const search = view.querySelector('#act-search');
  let debounce = null;
  search.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const value = search.value.trim();
      const base = cat === 'all' ? '#/make' : `#/make/${cat}`;
      const next = value ? `${base}/q/${encodeURIComponent(value)}` : base;
      history.replaceState(null, '', next);
      // re-render the grid in place, keeping focus in the field
      const pos = search.selectionStart;
      renderGrid(view, value ? [cat === 'all' ? '' : cat, value] : [cat === 'all' ? '' : cat]).then(() => {
        const f = view.querySelector('#act-search');
        if (f) {
          f.focus();
          f.setSelectionRange(pos, pos);
        }
      });
    }, 220);
  });

  view.querySelector('#surprise').addEventListener('click', () => {
    const item = pick(items);
    location.hash = `#/make/a/${item.id}`;
  });

  return () => clearTimeout(debounce);
}

/* ---------- detail ---------- */

async function renderActivity(view, id) {
  const { categories, items } = await activities();
  const item = items.find((x) => x.id === id);

  if (!item) {
    view.innerHTML = `
      <div class="empty">
        <div class="ico" aria-hidden="true">🤷</div>
        <h2>That activity is not here</h2>
        <p><a class="btn btn--ghost" href="#/make">Back to everything</a></p>
      </div>`;
    return () => {};
  }

  const doneKey = `make.done.${item.id}`;
  const done = store.get(doneKey, false);

  view.innerHTML = `
    <header>
      <a class="tab" href="#/make" style="padding-left:0">← Everything</a>
      <div class="toolbar" style="gap:8px;margin:10px 0">
        <span class="badge" data-cat="${esc(item.cat)}">${esc(categories[item.cat] || item.cat)}</span>
        <span class="small muted">${esc(item.mins)} min · ${esc(item.level || '')} · from ${esc(item.by)}'s lab</span>
      </div>
      <h1 class="display" style="margin:0 0 10px;font-size:clamp(26px,4.6vw,40px)">${esc(item.title)}</h1>
      <p class="lede">${esc(item.why || '')}</p>
    </header>

    <section class="card">
      <h2 style="font-size:18px">You need</h2>
      <ul class="stuff">${(item.stuff || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    </section>

    <section class="card">
      <h2 style="font-size:18px;margin-bottom:14px">What to do</h2>
      <ol class="steps">${(item.steps || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    </section>

    ${item.care ? `<div class="callout"><strong>Ask an adult</strong>${esc(item.care)}</div>` : ''}
    ${item.twist ? `<div class="callout" style="border-color:var(--violet);background:#f6f3ff"><strong>Take it further</strong>${esc(item.twist)}</div>` : ''}
    ${item.film ? `<div class="callout" style="border-color:var(--teal);background:#f0fbfa"><strong>Film it</strong>${esc(item.film)}</div>` : ''}

    <div class="btn-row">
      <button class="btn ${done ? 'btn--ghost' : 'btn--accent'}" type="button" id="mark">${done ? '✓ Made it' : 'Mark as made'}</button>
      <a class="btn btn--ghost" href="#/make">Find another</a>
    </div>
  `;

  view.querySelector('#mark').addEventListener('click', (e) => {
    const now = !store.get(doneKey, false);
    store.set(doneKey, now);
    e.currentTarget.textContent = now ? '✓ Made it' : 'Mark as made';
    e.currentTarget.classList.toggle('btn--accent', !now);
    e.currentTarget.classList.toggle('btn--ghost', now);
    toast(now ? 'Ticked off. Nice.' : 'Un-ticked.');
  });

  return () => {};
}

/* ---------- stories ---------- */

async function renderStories(view) {
  const { items } = await stories();

  view.innerHTML = `
    <header>
      <a class="tab" href="#/make" style="padding-left:0">← Make</a>
      <h1 class="display" style="margin:8px 0 10px">Story shelf</h1>
      <p class="lede">${items.length} short stories — a few in Kiswahili — each with questions at the end. About eight minutes each.</p>
    </header>
    <div class="q-list">
      ${items.map((s) => `
        <button class="q-row" type="button" data-id="${esc(s.id)}">
          <span class="num">${esc(s.minutes || 5)}′</span>
          <span class="body">
            <span class="topic">${esc(s.title)}</span>
            <span class="snip">${esc((s.body || '').slice(0, 130))}</span>
          </span>
        </button>`).join('')}
    </div>`;

  view.querySelector('.q-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (b) location.hash = `#/make/story/${b.dataset.id}`;
  });

  return () => {};
}

async function renderStory(view, id) {
  const { items } = await stories();
  const story = items.find((s) => s.id === id);

  if (!story) {
    view.innerHTML = `<div class="empty"><div class="ico">📖</div><p>That story is not here.</p><p><a class="btn btn--ghost" href="#/make/stories">Story shelf</a></p></div>`;
    return () => {};
  }

  const questions = story.questions || [];

  view.innerHTML = `
    <header>
      <a class="tab" href="#/make/stories" style="padding-left:0">← Story shelf</a>
      <h1 class="display" style="margin:8px 0 10px;font-size:clamp(24px,4.4vw,36px)">${esc(story.title)}</h1>
      <p class="small muted">${esc(story.minutes || 5)} minute read${story.lang === 'sw' ? ' · Kiswahili' : ''} · from ${esc(story.by)}'s lab</p>
    </header>
    <article class="card story-body">${(story.body || '').split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`).join('')}</article>
    ${questions.length ? `
      <section class="card">
        <h2 style="font-size:18px;margin-bottom:14px">Talk about it</h2>
        <ol class="steps">${questions.map((q) => `<li>${esc(typeof q === 'string' ? q : q.text || q.q || '')}</li>`).join('')}</ol>
      </section>` : ''}
    <div class="btn-row"><a class="btn btn--ghost" href="#/make/stories">Another story</a></div>
  `;

  return () => {};
}

/* ---------- entry ---------- */

export async function render(view, params) {
  const [kind, a, b] = params;

  if (!kind) return renderGrid(view, ['']);
  if (kind === 'stories') return renderStories(view);
  if (kind === 'story') return renderStory(view, a);
  if (kind === 'a') return renderActivity(view, a);
  if (kind === 'q') return renderGrid(view, ['', a]);

  // kind is a category
  return renderGrid(view, [kind, b]);
}
