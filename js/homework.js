/* Homework: a self-marking practice quiz plus the 173-question revision bank. */

import { esc, loadJSON, el, shuffle, pick, range, toast, askAI } from './ui.js';

let bankPromise = null;

function bank() {
  if (!bankPromise) bankPromise = loadJSON('data/questions.json');
  return bankPromise;
}

/* ============================================================
   Practice generator
   ============================================================ */

const LEVELS = [
  { id: 'lower', name: 'Age 7–9', note: 'Adding, taking away, easy tables, halves' },
  { id: 'middle', name: 'Age 10–12', note: 'All tables, division, fractions, percentages' },
  { id: 'upper', name: 'Age 13+', note: 'Integers, percentages, simple algebra, ratio' },
];

const r = (n) => Math.floor(Math.random() * n);
const ri = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

function q(text, answer, distractorSpread) {
  const answer_ = Math.round(answer * 100) / 100;
  const set = new Set([answer_]);
  let guard = 0;
  while (set.size < 4 && guard < 60) {
    guard += 1;
    const spread = distractorSpread || Math.max(2, Math.round(Math.abs(answer_) * 0.2));
    const delta = (r(spread) + 1) * (Math.random() < 0.5 ? -1 : 1);
    const candidate = Math.round((answer_ + delta) * 100) / 100;
    if (candidate !== answer_) set.add(candidate);
  }
  return { text, answer: answer_, options: shuffle([...set]).slice(0, 4) };
}

function lowerQ() {
  switch (r(5)) {
    case 0: {
      const a = ri(5, 40);
      const b = ri(2, 30);
      return q(`${a} + ${b}`, a + b);
    }
    case 1: {
      const a = ri(15, 60);
      const b = ri(2, a - 1);
      return q(`${a} − ${b}`, a - b);
    }
    case 2: {
      const t = pick([2, 5, 10]);
      const n = ri(1, 10);
      return q(`${t} × ${n}`, t * n, 6);
    }
    case 3: {
      const n = ri(2, 20);
      return q(`Double ${n}`, n * 2, 5);
    }
    default: {
      const total = pick([8, 10, 12, 16, 20]);
      return q(`Half of ${total}`, total / 2, 4);
    }
  }
}

function middleQ() {
  switch (r(5)) {
    case 0: {
      const a = ri(3, 12);
      const b = ri(3, 12);
      return q(`${a} × ${b}`, a * b, 8);
    }
    case 1: {
      const b = ri(3, 12);
      const answer = ri(3, 12);
      return q(`${b * answer} ÷ ${b}`, answer, 5);
    }
    case 2: {
      const den = pick([2, 4, 5, 10]);
      const whole = den * ri(2, 12);
      return q(`${whole} ÷ ${den}`, whole / den, 6);
    }
    case 3: {
      const pct = pick([10, 20, 25, 50]);
      const whole = pick([40, 60, 80, 100, 120, 200]);
      return q(`${pct}% of ${whole}`, (whole * pct) / 100, Math.max(3, Math.round(whole * 0.1)));
    }
    default: {
      const a = ri(2, 9);
      const b = ri(2, 9);
      const c = ri(2, 20);
      return q(`${a} × ${b} + ${c}`, a * b + c, 9);
    }
  }
}

function upperQ() {
  switch (r(5)) {
    case 0: {
      const a = ri(3, 20);
      const b = ri(3, 20);
      const sign = pick(['+', '−']);
      return sign === '+' ? q(`−${a} + ${b}`, b - a, 6) : q(`${a} − ${b} − 4`, a - b - 4, 6);
    }
    case 1: {
      const pct = pick([5, 12, 15, 30, 45]);
      const whole = pick([80, 120, 160, 240, 300]);
      return q(`${pct}% of ${whole}`, Math.round((whole * pct) / 100), Math.round(whole * 0.08));
    }
    case 2: {
      const a = ri(2, 9);
      const x = ri(2, 12);
      const b = ri(1, 15);
      return q(`${a}x + ${b} = ${a * x + b}.  What is x?`, x, 3);
    }
    case 3: {
      const a = ri(2, 6);
      const b = ri(2, 6);
      const total = (a + b) * ri(2, 8);
      return q(`Share ${total} in the ratio ${a}:${b}. What is the bigger share?`, Math.round((total * Math.max(a, b)) / (a + b)), Math.round(total * 0.15));
    }
    default: {
      const a = ri(2, 9);
      const b = ri(2, 9);
      const c = ri(2, 6);
      return q(`(${a} + ${b}) × ${c}`, (a + b) * c, 10);
    }
  }
}

const GENERATORS = { lower: lowerQ, middle: middleQ, upper: upperQ };

function renderPractice(view, level) {
  let score = 0;
  let asked = 0;
  const TOTAL = 10;

  view.innerHTML = `
    <header>
      <a class="tab" href="#/homework" style="padding-left:0">← Homework</a>
      <h1 class="display" style="margin:8px 0 10px">Quick practice</h1>
      <p class="lede">Ten questions, marked as you go. Nothing is saved — this is just to warm up.</p>
    </header>
    <div class="card practice-card">
      <div class="chips" id="level-pick">
        ${LEVELS.map((l) => `<button class="chip" type="button" data-level="${l.id}" aria-pressed="${l.id === level}">${esc(l.name)}</button>`).join('')}
      </div>
      <p class="tiny muted" style="margin-top:8px" id="level-note">${esc(LEVELS.find((l) => l.id === level).note)}</p>
      <div id="practice-body" style="margin-top:18px"></div>
    </div>`;

  const body = view.querySelector('#practice-body');

  view.querySelector('#level-pick').addEventListener('click', (e) => {
    const b = e.target.closest('[data-level]');
    if (!b) return;
    level = b.dataset.level;
    view.querySelectorAll('[data-level]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.level === level)));
    view.querySelector('#level-note').textContent = LEVELS.find((l) => l.id === level).note;
    score = 0;
    asked = 0;
    next();
  });

  function next() {
    if (asked >= TOTAL) return finish();
    const item = GENERATORS[level]();
    asked += 1;

    body.innerHTML = `
      <div class="hud" style="margin-bottom:6px">
        <div class="hud-item"><b>${asked}/${TOTAL}</b><span>Question</span></div>
        <div class="hud-item"><b>${score}</b><span>Right</span></div>
      </div>
      <p class="q-prompt">${esc(item.text)}</p>
      <div class="opt-grid">
        ${item.options.map((v) => `<button class="opt" type="button" data-v="${v}">${v}</button>`).join('')}
      </div>
      <p class="feedback" role="status" id="pfb"></p>`;

    body.querySelector('.opt-grid').addEventListener('click', (e) => {
      const btn = e.target.closest('.opt');
      if (!btn || btn.disabled) return;
      const right = Number(btn.dataset.v) === item.answer;
      body.querySelectorAll('.opt').forEach((b) => {
        b.disabled = true;
        if (Number(b.dataset.v) === item.answer) b.dataset.state = 'right';
      });
      if (!right) btn.dataset.state = 'wrong';
      const fb = body.querySelector('#pfb');
      fb.dataset.kind = right ? 'right' : 'wrong';
      fb.textContent = right ? 'Right!' : `The answer is ${item.answer}`;
      if (right) score += 1;
      setTimeout(next, right ? 550 : 1300);
    });
  }

  function finish() {
    body.innerHTML = `
      <div class="result">
        <span class="big">${score}/${TOTAL}</span>
        <p class="muted">${score >= 8 ? 'Very solid. Try the next level up.' : score >= 5 ? 'Half and half — another round will help.' : 'Worth slowing down and checking each step.'}</p>
        <div class="btn-row" style="justify-content:center;margin-top:14px">
          <button class="btn btn--accent" type="button" id="again">Ten more</button>
          <a class="btn btn--ghost" href="#/homework">Revision papers</a>
        </div>
      </div>`;
    body.querySelector('#again').addEventListener('click', () => {
      score = 0;
      asked = 0;
      next();
    });
  }

  next();
  return () => {};
}

/* ============================================================
   Revision bank
   ============================================================ */

async function renderOverview(view) {
  const data = await bank();
  const total = data.subjects.reduce((n, s) => n + s.papers.reduce((m, p) => m + p.questions.length, 0), 0);

  view.innerHTML = `
    <header>
      <span class="eyebrow">Homework</span>
      <h1 class="display" style="margin:12px 0 10px">Stuck? Start here.</h1>
      <p class="lede">A warm-up quiz you can set yourself, and ${total} real exam questions with worked answers — the same ones from the old revision app.</p>
    </header>

    <a class="section-card" data-tone="homework" href="#/homework/practice" style="min-height:0">
      <span class="ico" aria-hidden="true">⚡</span>
      <h2>Quick practice</h2>
      <p>Ten self-marking questions, chosen for your age. Maths only, and it takes about three minutes.</p>
      <span class="go">Start practising <span aria-hidden="true">→</span></span>
    </a>

    <section>
      <h2 style="font-size:20px;margin-bottom:12px">Revision papers</h2>
      <p class="small muted" style="margin-bottom:16px">Secondary school level. Pick a subject, then a paper, then a question. Every question has a worked answer you can reveal.</p>
      <div class="subj-grid">
        ${data.subjects.map((s, i) => {
          const count = s.papers.reduce((n, p) => n + p.questions.length, 0);
          return `<button class="subj" type="button" data-s="${i}">
            <b>${esc(s.name)}</b>
            <span>${count} question${count === 1 ? '' : 's'} · ${s.papers.length} paper${s.papers.length === 1 ? '' : 's'}</span>
          </button>`;
        }).join('')}
      </div>
    </section>

    <div class="card">
      <h2>How to use the answers properly</h2>
      <p class="muted small">Try the question first, on paper, before you open the answer. Reading a worked answer feels like learning but mostly is not. The point is to find the exact step where your attempt went off.</p>
    </div>`;

  view.querySelector('.subj-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-s]');
    if (b) location.hash = `#/homework/s/${b.dataset.s}`;
  });

  return () => {};
}

async function renderSubject(view, sIdx) {
  const data = await bank();
  const subject = data.subjects[Number(sIdx)];
  if (!subject) return notFound(view);

  view.innerHTML = `
    <header>
      <a class="tab" href="#/homework" style="padding-left:0">← All subjects</a>
      <h1 class="display" style="margin:8px 0 10px">${esc(subject.name)}</h1>
      <p class="lede">${subject.papers.length} paper${subject.papers.length === 1 ? '' : 's'}. Pick one to see its questions.</p>
    </header>
    <div class="q-list">
      ${subject.papers.map((p, i) => {
        const count = p.questions.length;
        return `<button class="q-row" type="button" data-p="${i}">
          <span class="num">${i + 1}</span>
          <span class="body">
            <span class="topic">${esc(p.code || 'Paper')} — ${esc(p.title || '')}</span>
            <span class="snip">${count} question${count === 1 ? '' : 's'}</span>
          </span>
        </button>`;
      }).join('')}
    </div>`;

  view.querySelector('.q-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]');
    if (b) location.hash = `#/homework/p/${sIdx}/${b.dataset.p}`;
  });

  return () => {};
}

async function renderPaper(view, sIdx, pIdx) {
  const data = await bank();
  const subject = data.subjects[Number(sIdx)];
  const paper = subject?.papers[Number(pIdx)];
  if (!paper) return notFound(view);

  view.innerHTML = `
    <header>
      <a class="tab" href="#/homework/s/${esc(sIdx)}" style="padding-left:0">← ${esc(subject.name)}</a>
      <h1 class="display" style="margin:8px 0 10px;font-size:clamp(26px,4.6vw,38px)">${esc(paper.title || paper.code || 'Paper')}</h1>
      <p class="lede">${paper.questions.length} question${paper.questions.length === 1 ? '' : 's'}. Tap one to open it.</p>
    </header>
    <div class="q-list">
      ${paper.questions.map((item, i) => `
        <button class="q-row" type="button" data-q="${i}">
          <span class="num">${esc(item.n || i + 1)}</span>
          <span class="body">
            <span class="topic">${esc(item.topic || 'Question')}</span>
            <span class="snip">${esc((item.text || '').slice(0, 160))}</span>
          </span>
        </button>`).join('')}
    </div>`;

  view.querySelector('.q-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]');
    if (b) location.hash = `#/homework/q/${sIdx}/${pIdx}/${b.dataset.q}`;
  });

  return () => {};
}

async function renderQuestion(view, sIdx, pIdx, qIdx) {
  const data = await bank();
  const subject = data.subjects[Number(sIdx)];
  const paper = subject?.papers[Number(pIdx)];
  const item = paper?.questions[Number(qIdx)];
  if (!item) return notFound(view);

  view.innerHTML = `
    <header>
      <a class="tab" href="#/homework/p/${esc(sIdx)}/${esc(pIdx)}" style="padding-left:0">← ${esc(paper.code || 'Paper')}</a>
      <h1 class="display" style="margin:8px 0 12px;font-size:clamp(24px,4vw,34px)">${esc(item.topic || 'Question ' + item.n)}</h1>
      <div class="toolbar" style="gap:8px">
        <span class="marks">${esc(item.marks ? item.marks + ' marks' : 'Question ' + item.n)}</span>
        <span class="small muted">${esc(subject.name)} · ${esc(paper.code || '')}</span>
      </div>
    </header>

    <section class="card q-detail">
      ${item.context ? `<p class="small muted"><strong>Context:</strong> ${esc(item.context)}</p>` : ''}
      <p class="q-text">${esc(breakParts(item.text))}</p>

      <div class="btn-row" style="margin-top:18px">
        <button class="btn btn--accent" type="button" id="reveal">Show the worked answer</button>
        <button class="btn btn--ghost" type="button" id="explain">Explain it to me</button>
      </div>

      <div class="answer-box" id="answer" hidden>
        <h3 style="margin-bottom:10px">Worked answer</h3>
        <p class="q-text">${esc(breakParts(item.answer) || 'No worked answer was recorded for this one.')}</p>
        ${item.notes ? `<p class="small muted" style="margin-top:12px"><strong>Examiner note:</strong> ${esc(item.notes)}</p>` : ''}
      </div>

      <div id="explain-out" style="margin-top:16px"></div>
    </section>`;

  const box = view.querySelector('#answer');
  view.querySelector('#reveal').addEventListener('click', (e) => {
    const open = box.hidden;
    box.hidden = !open;
    e.currentTarget.textContent = open ? 'Hide the answer' : 'Show the worked answer';
  });

  view.querySelector('#explain').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const out = view.querySelector('#explain-out');
    btn.disabled = true;
    out.innerHTML = '<p class="small muted">Thinking…</p>';
    try {
      const res = await askAI('api/explain', {
        subject: subject.name,
        question: item.text,
        answer: item.answer,
      });
      out.innerHTML = `
        <div class="card" style="background:#f6f9ff;border-color:#c3d9fb">
          <h3 style="margin-bottom:8px">In plain words</h3>
          <p class="small" style="white-space:pre-wrap">${esc(res.explanation || '')}</p>
        </div>`;
    } catch (err) {
      out.innerHTML = `<p class="small" style="color:var(--red)">Could not reach the helper. ${esc(err.message || '')}</p>`;
    } finally {
      btn.disabled = false;
    }
  });

  return () => {};
}

function breakParts(text) {
  return String(text || '').replace(/\s*\(([a-h])\)\s/g, '\n($1) ').trim();
}

function notFound(view) {
  view.innerHTML = `
    <div class="empty">
      <div class="ico" aria-hidden="true">🔍</div>
      <h2>That question is not here</h2>
      <p><a class="btn btn--ghost" href="#/homework">Back to homework</a></p>
    </div>`;
  return () => {};
}

/* ============================================================
   Entry
   ============================================================ */

export async function render(view, params) {
  const [kind, a, b, c] = params;

  if (!kind) return renderOverview(view);
  if (kind === 'practice') return renderPractice(view, 'lower');
  if (kind === 's') return renderSubject(view, a);
  if (kind === 'p') return renderPaper(view, a, b);
  if (kind === 'q') return renderQuestion(view, a, b, c);

  return notFound(view);
}
