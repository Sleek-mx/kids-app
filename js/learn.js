/* Learn AI: six short lessons with a three-question check at the end. */

import { esc, loadJSON, store, toast } from './ui.js';

let syllabusPromise = null;
function syllabus() {
  if (!syllabusPromise) syllabusPromise = loadJSON('data/syllabus.json');
  return syllabusPromise;
}

const doneKey = 'ai.done';
function doneSet() {
  return new Set(store.get(doneKey, []));
}

function markDone(id) {
  const set = doneSet();
  if (set.has(id)) return false;
  set.add(id);
  store.set(doneKey, [...set]);
  return true;
}

/* ---------- list ---------- */

async function renderList(view) {
  const data = await syllabus();
  const done = doneSet();

  view.innerHTML = `
    <header>
      <span class="eyebrow">Learn AI</span>
      <h1 class="display" style="margin:12px 0 10px">How smart machines work</h1>
      <p class="lede">${esc(data.subtitle)}</p>
      <p class="small muted" style="margin-top:14px">${done.size} of ${data.lessons.length} finished.</p>
    </header>

    <div class="lesson-list">
      ${data.lessons.map((l) => `
        <button class="lesson" type="button" data-id="${esc(l.id)}" data-done="${done.has(l.id) ? 1 : 0}">
          <span class="n" aria-hidden="true">${esc(l.emoji)}</span>
          <span class="body">
            <b>${l.n}. ${esc(l.title)}</b>
            <span>${esc(l.bigIdea)}</span>
          </span>
          ${done.has(l.id) ? '<span class="done">Done</span>' : `<span class="tiny muted">${esc(l.minutes)} min</span>`}
        </button>`).join('')}
    </div>

    <div class="card">
      <h2>Why this is worth ten minutes</h2>
      <p class="muted small">Most explanations of AI are either marketing or maths. These six lessons are neither. They explain what the machine actually does, where it fails, and what you should never type into it — which is the part that matters when you are eleven.</p>
    </div>`;

  view.querySelector('.lesson-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (b) location.hash = `#/ai/${b.dataset.id}`;
  });

  return () => {};
}

/* ---------- lesson ---------- */

async function renderLesson(view, id) {
  const data = await syllabus();
  const index = data.lessons.findIndex((l) => l.id === id);
  const lesson = data.lessons[index];

  if (!lesson) {
    view.innerHTML = `<div class="empty"><div class="ico">🤖</div><h2>No lesson called that</h2><p><a class="btn btn--ghost" href="#/ai">All lessons</a></p></div>`;
    return () => {};
  }

  const next = data.lessons[index + 1];
  const done = doneSet().has(lesson.id);

  view.innerHTML = `
    <header>
      <a class="tab" href="#/ai" style="padding-left:0">← All lessons</a>
      <p class="tiny muted" style="margin:10px 0 4px;letter-spacing:.08em;text-transform:uppercase;font-weight:800">Lesson ${lesson.n} of ${data.lessons.length} · ${esc(lesson.minutes)} min</p>
      <h1 class="display" style="margin:0 0 14px;font-size:clamp(26px,4.8vw,42px)">${esc(lesson.title)}</h1>
    </header>

    <div class="bigidea">
      <strong>The one thing to remember</strong>
      <p>${esc(lesson.bigIdea)}</p>
    </div>

    <article class="lesson-body">
      ${lesson.body.map((p) => `<p>${esc(p)}</p>`).join('')}
    </article>

    <section>
      <h2 style="font-size:19px;margin-bottom:12px">Words to know</h2>
      <div class="words">
        ${lesson.words.map((w) => `<div class="word"><b>${esc(w.term)}</b><span>${esc(w.meaning)}</span></div>`).join('')}
      </div>
    </section>

    <section class="card" id="quiz-card">
      <h2 style="font-size:19px;margin-bottom:6px">Check yourself</h2>
      <p class="small muted" style="margin-bottom:16px">${lesson.quiz.length} questions. Get most of them right and the lesson is ticked off.</p>
      <div id="quiz"></div>
      <p class="feedback" id="quiz-score" role="status" style="margin-top:12px"></p>
      <div id="lesson-next" style="margin-top:16px"></div>
    </section>
  `;

  const quizBox = view.querySelector('#quiz');
  const scoreLine = view.querySelector('#quiz-score');
  const nextBox = view.querySelector('#lesson-next');
  let right = 0;
  let answered = 0;

  quizBox.innerHTML = lesson.quiz.map((item, qi) => `
    <div class="quiz-q" data-q="${qi}">
      <h3>${esc(item.q)}</h3>
      ${item.options.map((opt, oi) => `
        <button class="quiz-opt" type="button" data-q="${qi}" data-o="${oi}">${esc(opt)}</button>`).join('')}
      <p class="quiz-why" id="why-${qi}" hidden>${esc(item.why)}</p>
    </div>`).join('');

  quizBox.addEventListener('click', (e) => {
    const btn = e.target.closest('.quiz-opt');
    if (!btn || btn.disabled) return;
    const qi = Number(btn.dataset.q);
    const oi = Number(btn.dataset.o);
    const item = lesson.quiz[qi];
    const block = quizBox.querySelector(`.quiz-q[data-q="${qi}"]`);
    const isRight = oi === item.answer;

    block.querySelectorAll('.quiz-opt').forEach((b) => {
      b.disabled = true;
      if (Number(b.dataset.o) === item.answer) b.dataset.state = 'right';
    });
    if (!isRight) btn.dataset.state = 'wrong';
    block.querySelector(`#why-${qi}`).hidden = false;

    answered += 1;
    if (isRight) right += 1;

    scoreLine.dataset.kind = right === answered ? 'right' : 'wrong';
    scoreLine.textContent = `${right} of ${answered} right`;

    if (answered === lesson.quiz.length) finish();
  });

  function finish() {
    const passed = right >= Math.ceil(lesson.quiz.length * 0.67);
    if (passed) {
      const fresh = markDone(lesson.id);
      if (fresh) toast('Lesson complete.');
    }

    scoreLine.dataset.kind = passed ? 'right' : 'wrong';
    scoreLine.textContent = passed
      ? `${right} of ${lesson.quiz.length} — lesson complete.`
      : `${right} of ${lesson.quiz.length}. Read it again and retry — this one is worth getting.`;

    nextBox.innerHTML = `
      <div class="btn-row">
        ${passed && next ? `<a class="btn btn--accent" href="#/ai/${esc(next.id)}">Next: ${esc(next.title)}</a>` : ''}
        ${passed && !next ? '<a class="btn btn--accent" href="#/ai">All lessons — you finished them all</a>' : ''}
        ${!passed ? '<button class="btn btn--accent" type="button" id="retry">Try again</button>' : ''}
        <a class="btn btn--ghost" href="#/ai">All lessons</a>
      </div>`;

    const retry = nextBox.querySelector('#retry');
    if (retry) {
      retry.addEventListener('click', () => {
        renderLesson(view, lesson.id);
      });
    }
  }

  return () => {};
}

export async function render(view, params) {
  const id = params[0];
  if (!id) return renderList(view);
  return renderLesson(view, id);
}
