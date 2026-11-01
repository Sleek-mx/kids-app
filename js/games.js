/* Five small games. Each mount() returns a dispose function. */

import { el, esc, store, shuffle, pick, range, toast, formatTime } from './ui.js';

const EMOJI = ['🦁', '🐙', '🚀', '🍉', '🌵', '🎈', '🐝', '⚡', '🍄', '🐬', '🌈', '🎸', '🦋', '🍭', '🔮', '🐳'];

const WORDS = [
  ['elephant', 'A huge grey animal with a long trunk.'],
  ['volcano', 'A mountain that can throw out hot rock.'],
  ['rainbow', 'Seven colours in the sky after rain.'],
  ['bicycle', 'Two wheels, pedals, and no engine.'],
  ['chocolate', 'Sweet, brown, and made from cocoa.'],
  ['dinosaur', 'Giant animals that lived long before us.'],
  ['umbrella', 'You open it when it rains.'],
  ['penguin', 'A bird that swims but cannot fly.'],
  ['library', 'A quiet place full of books.'],
  ['giraffe', 'The tallest animal, with a long neck.'],
  ['sandwich', 'Two slices of bread with something inside.'],
  ['computer', 'A machine that follows instructions.'],
  ['mountain', 'Very high land you have to climb.'],
  ['festival', 'A big happy celebration.'],
  ['question', 'Something you ask when you do not know.'],
  ['triangle', 'A shape with three sides.'],
  ['calendar', 'It tells you the days of the month.'],
  ['hospital', 'Where doctors and nurses work.'],
  ['kangaroo', 'It hops and carries a baby in a pouch.'],
  ['treasure', 'Something valuable that is hidden.'],
  ['umbrella', 'Keeps the rain off your head.'],
  ['electric', 'What makes a bulb light up.'],
  ['mushroom', 'A fungus that grows after rain.'],
  ['airplane', 'A machine that flies with wings.'],
  ['birthday', 'The day you celebrate being older.'],
  ['crocodile', 'A big reptile with a long snout.'],
  ['adventure', 'An exciting and slightly risky trip.'],
  ['butterfly', 'It starts as a caterpillar.'],
  ['telephone', 'You use it to talk to someone far away.'],
  ['waterfall', 'Water falling off a cliff.'],
];

const GAMES = [
  {
    id: 'memory',
    ico: '🃏',
    name: 'Memory Match',
    blurb: 'Flip two cards at a time and find the pairs. Fewest moves wins.',
    bestKey: 'memory.best',
    bestLabel: (v) => `${v} moves`,
  },
  {
    id: 'tables',
    ico: '✖️',
    name: 'Times Tables',
    blurb: 'Pick a table from 2 to 12 and answer ten questions.',
    bestKey: 'tables.best',
    bestLabel: (v) => `${v}/10`,
  },
  {
    id: 'scramble',
    ico: '🔤',
    name: 'Word Scramble',
    blurb: 'Tap the letters back into the right order. Ten words, with hints.',
    bestKey: 'scramble.best',
    bestLabel: (v) => `${v}/10`,
  },
  {
    id: 'sprint',
    ico: '⚡',
    name: 'Maths Sprint',
    blurb: 'Sixty seconds. Answer as many as you can before the clock runs out.',
    bestKey: 'sprint.best',
    bestLabel: (v) => `${v} right`,
  },
  {
    id: 'echo',
    ico: '🔔',
    name: 'Pattern Echo',
    blurb: 'Watch the colours light up, then tap them back in the same order.',
    bestKey: 'echo.best',
    bestLabel: (v) => `level ${v}`,
  },
];

/* ---------- shared bits ---------- */

function hud(items) {
  return `<div class="hud">${items
    .map(([label, id, value]) => `<div class="hud-item"><b id="${id}">${esc(value)}</b><span>${esc(label)}</span></div>`)
    .join('')}</div>`;
}

function setHud(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = String(value);
}

function bestOf(key) {
  return store.get(key, null);
}

function saveBest(key, value, better = (a, b) => a > b) {
  const current = store.get(key, null);
  if (current === null || better(value, current)) {
    store.set(key, value);
    return true;
  }
  return false;
}

/* ---------- memory ---------- */

function mountMemory(root, disposeRef) {
  const PAIRS = 8;
  let moves = 0;
  let matched = 0;
  let flipped = [];
  let lock = false;
  let startedAt = null;
  let ticker = null;

  const chosen = shuffle(EMOJI).slice(0, PAIRS);
  const cards = shuffle([...chosen, ...chosen]).map((face, i) => ({ face, i }));

  root.innerHTML = `
    <div class="game-head">
      <h2>Memory Match</h2>
      <div class="btn-row"><button class="btn btn--ghost btn--sm" type="button" data-act="restart">Restart</button></div>
    </div>
    ${hud([['Moves', 'hud-moves', '0'], ['Pairs', 'hud-pairs', `0/${PAIRS}`], ['Time', 'hud-time', '0s']])}
    <div class="mem-grid" role="grid" aria-label="Memory cards" style="margin-top:18px">
      ${cards.map((c, idx) => `
        <button class="mem-card" type="button" role="gridcell" data-idx="${idx}" aria-label="Card ${idx + 1}, hidden">
          <span class="face" aria-hidden="true">${c.face}</span>
        </button>`).join('')}
    </div>
    <div class="result" id="mem-result" hidden style="margin-top:18px"></div>
  `;

  const grid = root.querySelector('.mem-grid');

  function startClock() {
    if (startedAt) return;
    startedAt = Date.now();
    ticker = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt) / 1000);
      setHud('hud-time', formatTime(s));
    }, 1000);
  }

  function finish() {
    clearInterval(ticker);
    const seconds = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
    const record = saveBest('memory.best', moves, (a, b) => a < b);
    const box = root.querySelector('#mem-result');
    box.hidden = false;
    box.innerHTML = `
      <span class="big">${moves} moves</span>
      <p class="muted">Finished in ${formatTime(seconds)}.${record ? ' That is your best yet.' : ''}</p>
      <div class="btn-row" style="justify-content:center;margin-top:14px">
        <button class="btn btn--accent" type="button" data-act="restart">Play again</button>
        <a class="btn btn--ghost" href="#/games">Other games</a>
      </div>`;
    toast(record ? 'New best!' : 'Nice one.');
  }

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.mem-card');
    if (!btn || lock) return;
    if (btn.dataset.done === '1' || btn.dataset.open === '1') return;

    startClock();
    btn.dataset.open = '1';
    btn.setAttribute('aria-label', `Card ${Number(btn.dataset.idx) + 1}, ${cards[btn.dataset.idx].face}`);
    flipped.push(btn);

    if (flipped.length < 2) return;

    moves += 1;
    setHud('hud-moves', moves);

    const [a, b] = flipped;
    const same = cards[a.dataset.idx].face === cards[b.dataset.idx].face;

    if (same) {
      a.dataset.done = '1';
      b.dataset.done = '1';
      matched += 1;
      setHud('hud-pairs', `${matched}/${PAIRS}`);
      flipped = [];
      if (matched === PAIRS) finish();
      return;
    }

    lock = true;
    const timer = setTimeout(() => {
      a.dataset.open = '0';
      b.dataset.open = '0';
      a.setAttribute('aria-label', `Card ${Number(a.dataset.idx) + 1}, hidden`);
      b.setAttribute('aria-label', `Card ${Number(b.dataset.idx) + 1}, hidden`);
      flipped = [];
      lock = false;
    }, 700);
    disposeRef.push(() => clearTimeout(timer));
  });

  root.onclick = (e) => {
    if (e.target.closest('[data-act="restart"]')) {
      cleanup();
      mountMemory(root, disposeRef);
    }
  };

  function cleanup() {
    clearInterval(ticker);
  }
  disposeRef.push(cleanup);
}

/* ---------- times tables ---------- */

function mountTables(root, disposeRef) {
  let table = store.get('tables.last', 7);
  let round = 0;
  let score = 0;
  const TOTAL = 10;

  root.innerHTML = `
    <div class="game-head">
      <h2>Times Tables</h2>
      <div class="btn-row"><a class="btn btn--ghost btn--sm" href="#/games">Change game</a></div>
    </div>
    <div class="card">
      <p class="small muted" style="margin-bottom:10px">Which table do you want to practise?</p>
      <div class="chips" id="table-pick">
        ${range(11).map((i) => `<button class="chip" type="button" data-table="${i + 2}" aria-pressed="${i + 2 === table}">${i + 2}×</button>`).join('')}
      </div>
      <div class="btn-row" style="margin-top:18px"><button class="btn btn--accent" type="button" data-act="start">Start</button></div>
    </div>
    <div id="table-play"></div>
  `;

  root.querySelector('#table-pick').addEventListener('click', (e) => {
    const b = e.target.closest('[data-table]');
    if (!b) return;
    table = Number(b.dataset.table);
    store.set('tables.last', table);
    root.querySelectorAll('[data-table]').forEach((x) => {
      x.setAttribute('aria-pressed', String(Number(x.dataset.table) === table));
    });
  });

  root.querySelector('[data-act="start"]').addEventListener('click', () => {
    round = 0;
    score = 0;
    next();
  });

  const play = root.querySelector('#table-play');

  function next() {
    if (round >= TOTAL) return finish();
    round += 1;

    const n = 1 + Math.floor(Math.random() * 12);
    const answer = table * n;
    const options = shuffle(
      new Set([answer, answer + table, Math.max(1, answer - table), answer + 1, Math.max(1, answer - 1)]),
    ).slice(0, 4);
    if (!options.includes(answer)) options[0] = answer;

    play.innerHTML = `
      <div class="card" style="margin-top:16px">
        ${hud([['Question', 'hud-q', `${round}/${TOTAL}`], ['Score', 'hud-score', score]])}
        <p class="q-prompt">${table} × ${n}</p>
        <div class="opt-grid">
          ${shuffle(options).map((v) => `<button class="opt" type="button" data-v="${v}">${v}</button>`).join('')}
        </div>
        <p class="feedback" id="fb" role="status"></p>
      </div>`;

    play.querySelector('.opt-grid').addEventListener('click', (e) => {
      const btn = e.target.closest('.opt');
      if (!btn || btn.disabled) return;
      const right = Number(btn.dataset.v) === answer;
      play.querySelectorAll('.opt').forEach((b) => {
        b.disabled = true;
        if (Number(b.dataset.v) === answer) b.dataset.state = 'right';
      });
      if (!right) btn.dataset.state = 'wrong';
      const fb = play.querySelector('#fb');
      fb.dataset.kind = right ? 'right' : 'wrong';
      fb.textContent = right ? 'Yes!' : `${table} × ${n} is ${answer}`;
      if (right) {
        score += 1;
        setHud('hud-score', score);
      }
      const t = setTimeout(next, right ? 550 : 1200);
      disposeRef.push(() => clearTimeout(t));
    });
  }

  function finish() {
    const record = saveBest('tables.best', score);
    play.innerHTML = `
      <div class="result" style="margin-top:16px">
        <span class="big">${score}/${TOTAL}</span>
        <p class="muted">${score === TOTAL ? 'Every single one. Try a bigger table.' : record ? 'That is your best score so far.' : 'Keep going — the same table twice in a row helps.'}</p>
        <div class="btn-row" style="justify-content:center;margin-top:14px">
          <button class="btn btn--accent" type="button" data-act="again">Ten more</button>
          <a class="btn btn--ghost" href="#/games">Other games</a>
        </div>
      </div>`;
    play.querySelector('[data-act="again"]').addEventListener('click', () => {
      round = 0;
      score = 0;
      next();
    });
    if (record) toast('New best!');
  }
}

/* ---------- word scramble ---------- */

function mountScramble(root, disposeRef) {
  const TOTAL = 10;
  const words = shuffle(WORDS).slice(0, TOTAL);
  let round = 0;
  let score = 0;

  root.innerHTML = `
    <div class="game-head">
      <h2>Word Scramble</h2>
      <div class="btn-row"><a class="btn btn--ghost btn--sm" href="#/games">Change game</a></div>
    </div>
    <div id="scramble-play"></div>
  `;

  const play = root.querySelector('#scramble-play');

  function next() {
    if (round >= TOTAL) return finish();
    const [word, hint] = words[round];
    round += 1;

    const letters = shuffle(word.split(''));
    let typed = [];

    play.innerHTML = `
      <div class="card">
        ${hud([['Word', 'hud-w', `${round}/${TOTAL}`], ['Score', 'hud-s', score]])}
        <p class="small muted" style="text-align:center;margin:16px 0 4px">Tap the letters in the right order.</p>
        <div class="scramble-word" id="answer-row" aria-live="polite"></div>
        <p class="small muted" style="text-align:center;margin:16px 0 10px" id="hint">${esc(hint)}</p>
        <div class="scramble-word" id="bank"></div>
        <p class="feedback" id="fb" role="status" style="margin-top:14px"></p>
        <div class="btn-row" style="justify-content:center;margin-top:10px">
          <button class="btn btn--ghost btn--sm" type="button" data-act="clear">Clear</button>
          <button class="btn btn--ghost btn--sm" type="button" data-act="skip">Skip</button>
        </div>
      </div>`;

    const bank = play.querySelector('#bank');
    const answerRow = play.querySelector('#answer-row');
    const fb = play.querySelector('#fb');

    function paint() {
      answerRow.innerHTML = word.split('').map((_, i) => `
        <span class="tile" data-filled="${typed[i] ? 1 : 0}">${typed[i] ? esc(typed[i].letter) : ''}</span>`).join('');
      bank.querySelectorAll('.tile-btn').forEach((b) => {
        b.disabled = typed.some((t) => t.i === Number(b.dataset.i));
        b.style.visibility = typed.some((t) => t.i === Number(b.dataset.i)) ? 'hidden' : 'visible';
      });
    }

    bank.innerHTML = letters.map((letter, i) => `
      <button class="tile tile-btn" type="button" data-i="${i}" data-letter="${esc(letter)}" style="cursor:pointer;border:1px solid var(--line-strong);background:var(--paper-2)">${esc(letter)}</button>`).join('');

    bank.addEventListener('click', (e) => {
      const b = e.target.closest('.tile-btn');
      if (!b || b.disabled) return;
      typed.push({ i: Number(b.dataset.i), letter: b.dataset.letter });
      paint();
      if (typed.length === word.length) check();
    });

    function check() {
      const guess = typed.map((t) => t.letter).join('');
      const right = guess === word;
      fb.dataset.kind = right ? 'right' : 'wrong';
      fb.textContent = right ? 'Correct!' : `Not quite — it was “${word}”.`;
      if (right) {
        score += 1;
        setHud('hud-s', score);
      }
      bank.querySelectorAll('.tile-btn').forEach((b) => { b.disabled = true; });
      const t = setTimeout(next, right ? 700 : 1600);
      disposeRef.push(() => clearTimeout(t));
    }

    play.querySelector('[data-act="clear"]').addEventListener('click', () => {
      typed = [];
      fb.textContent = '';
      paint();
    });

    play.querySelector('[data-act="skip"]').addEventListener('click', () => {
      fb.dataset.kind = 'wrong';
      fb.textContent = `The word was “${word}”.`;
      bank.querySelectorAll('.tile-btn').forEach((b) => { b.disabled = true; });
      const t = setTimeout(next, 1400);
      disposeRef.push(() => clearTimeout(t));
    });

    paint();
  }

  function finish() {
    const record = saveBest('scramble.best', score);
    play.innerHTML = `
      <div class="result">
        <span class="big">${score}/${TOTAL}</span>
        <p class="muted">${score >= 8 ? 'Strong spelling.' : record ? 'Your best so far.' : 'Try again — you will spot the patterns faster.'}</p>
        <div class="btn-row" style="justify-content:center;margin-top:14px">
          <button class="btn btn--accent" type="button" data-act="again">Ten new words</button>
          <a class="btn btn--ghost" href="#/games">Other games</a>
        </div>
      </div>`;
    play.querySelector('[data-act="again"]').addEventListener('click', () => {
      cleanup();
      mountScramble(root, disposeRef);
    });
    if (record) toast('New best!');
  }

  next();

  function cleanup() { /* timers registered in disposeRef */ }
  disposeRef.push(cleanup);
}

/* ---------- maths sprint ---------- */

function makeQuestion(level) {
  const r = (n) => Math.floor(Math.random() * n);
  if (level === 'easy') {
    const kind = pick(['+', '-']);
    if (kind === '+') {
      const a = 2 + r(18);
      const b = 2 + r(18);
      return { text: `${a} + ${b}`, answer: a + b };
    }
    const a = 6 + r(16);
    const b = 1 + r(a - 1);
    return { text: `${a} − ${b}`, answer: a - b };
  }
  if (level === 'medium') {
    const kind = pick(['×', '÷', '×']);
    if (kind === '×') {
      const a = 2 + r(11);
      const b = 2 + r(11);
      return { text: `${a} × ${b}`, answer: a * b };
    }
    const b = 2 + r(10);
    const answer = 2 + r(11);
    return { text: `${b * answer} ÷ ${b}`, answer };
  }
  const kind = pick(['×+', '−×']);
  if (kind === '×+') {
    const a = 3 + r(10);
    const b = 3 + r(10);
    const c = 2 + r(20);
    return { text: `${a} × ${b} + ${c}`, answer: a * b + c };
  }
  const a = 40 + r(50);
  const b = 2 + r(9);
  const c = 2 + r(9);
  return { text: `${a} − ${b} × ${c}`, answer: a - b * c };
}

function mountSprint(root, disposeRef) {
  let level = store.get('sprint.level', 'easy');
  const SECONDS = 60;
  let score = 0;
  let streak = 0;
  let bestStreak = 0;
  let left = SECONDS;
  let current = null;
  let running = false;
  let clock = null;

  const LEVELS = [
    ['easy', 'Easy', 'Adding and taking away up to 20'],
    ['medium', 'Medium', 'Times tables and simple division'],
    ['hard', 'Hard', 'Two steps: multiply then add, subtract then multiply'],
  ];

  root.innerHTML = `
    <div class="game-head">
      <h2>Maths Sprint</h2>
      <div class="btn-row"><a class="btn btn--ghost btn--sm" href="#/games">Change game</a></div>
    </div>
    <div class="card">
      <p class="small muted" style="margin-bottom:10px">Pick a level. You get ${SECONDS} seconds.</p>
      <div class="chips" id="level-pick">
        ${LEVELS.map(([id, name, note]) => `
          <button class="chip" type="button" data-level="${id}" aria-pressed="${id === level}" title="${esc(note)}">${esc(name)}</button>`).join('')}
      </div>
      <div class="btn-row" style="margin-top:18px"><button class="btn btn--accent" type="button" data-act="start">Start the clock</button></div>
    </div>
    <div id="sprint-play"></div>
  `;

  root.querySelector('#level-pick').addEventListener('click', (e) => {
    const b = e.target.closest('[data-level]');
    if (!b || running) return;
    level = b.dataset.level;
    store.set('sprint.level', level);
    root.querySelectorAll('[data-level]').forEach((x) => {
      x.setAttribute('aria-pressed', String(x.dataset.level === level));
    });
  });

  root.querySelector('[data-act="start"]').addEventListener('click', start);

  const play = root.querySelector('#sprint-play');

  function start() {
    score = 0;
    streak = 0;
    bestStreak = 0;
    left = SECONDS;
    running = true;
    next();
    clock = setInterval(() => {
      left -= 1;
      setHud('hud-t', `${left}s`);
      if (left <= 0) finish();
    }, 1000);
    disposeRef.push(() => clearInterval(clock));
  }

  function next() {
    if (!running) return;
    current = makeQuestion(level);
    const spread = Math.max(2, Math.round(Math.abs(current.answer) * 0.18));
    const options = new Set([current.answer]);
    while (options.size < 4) {
      const delta = (Math.floor(Math.random() * spread) + 1) * (Math.random() < 0.5 ? -1 : 1);
      const candidate = current.answer + delta;
      if (candidate !== current.answer) options.add(candidate);
    }

    play.innerHTML = `
      <div class="card" style="margin-top:16px">
        ${hud([['Time', 'hud-t', `${left}s`], ['Score', 'hud-s', score], ['Streak', 'hud-k', streak]])}
        <p class="q-prompt">${esc(current.text)}</p>
        <div class="opt-grid">
          ${shuffle([...options]).map((v) => `<button class="opt" type="button" data-v="${v}">${v}</button>`).join('')}
        </div>
        <p class="feedback" id="fb" role="status"></p>
      </div>`;

    play.querySelector('.opt-grid').addEventListener('click', (e) => {
      const btn = e.target.closest('.opt');
      if (!btn || btn.disabled || !running) return;
      const right = Number(btn.dataset.v) === current.answer;
      play.querySelectorAll('.opt').forEach((b) => {
        b.disabled = true;
        if (Number(b.dataset.v) === current.answer) b.dataset.state = 'right';
      });
      if (!right) btn.dataset.state = 'wrong';
      const fb = play.querySelector('#fb');

      if (right) {
        score += 1;
        streak += 1;
        bestStreak = Math.max(bestStreak, streak);
        fb.dataset.kind = 'right';
        fb.textContent = streak >= 3 ? `Streak ${streak}!` : 'Right!';
        setHud('hud-s', score);
        setHud('hud-k', streak);
      } else {
        streak = 0;
        fb.dataset.kind = 'wrong';
        fb.textContent = `It was ${current.answer}`;
        setHud('hud-k', 0);
      }

      const t = setTimeout(next, right ? 260 : 900);
      disposeRef.push(() => clearTimeout(t));
    });
  }

  function finish() {
    if (!running) return;
    running = false;
    clearInterval(clock);
    const record = saveBest('sprint.best', score);
    play.innerHTML = `
      <div class="result" style="margin-top:16px">
        <span class="big">${score}</span>
        <p class="muted">correct in ${SECONDS} seconds. Best streak: ${bestStreak}.</p>
        <p class="small muted">${record ? 'That is your best score yet.' : 'Good run. Same level again and you will beat it.'}</p>
        <div class="btn-row" style="justify-content:center;margin-top:14px">
          <button class="btn btn--accent" type="button" data-act="again">Run again</button>
          <a class="btn btn--ghost" href="#/games">Other games</a>
        </div>
      </div>`;
    play.querySelector('[data-act="again"]').addEventListener('click', start);
    if (record) toast('New best!');
  }
}

/* ---------- pattern echo ---------- */

function mountEcho(root, disposeRef) {
  let sequence = [];
  let step = 0;
  let accepting = false;
  let level = 0;
  const PADS = ['coral', 'sun', 'teal', 'violet'];

  root.innerHTML = `
    <div class="game-head">
      <h2>Pattern Echo</h2>
      <div class="btn-row"><a class="btn btn--ghost btn--sm" href="#/games">Change game</a></div>
    </div>
    <div class="card">
      ${hud([['Level', 'hud-l', '0'], ['Best', 'hud-b', bestOf('echo.best') ?? 0]])}
      <p class="small muted" style="text-align:center;margin:18px 0 12px" id="echo-msg">Watch the colours, then tap them back.</p>
      <div class="pads">
        ${range(4).map((i) => `<button class="pad" type="button" data-pad="${i}" aria-label="Pad ${i + 1}" disabled></button>`).join('')}
      </div>
      <div class="btn-row" style="justify-content:center;margin-top:20px">
        <button class="btn btn--accent" type="button" data-act="start">Start</button>
      </div>
    </div>
  `;

  const pads = [...root.querySelectorAll('.pad')];
  const msg = root.querySelector('#echo-msg');

  function lit(i, ms = 380) {
    pads[i].dataset.lit = '1';
    return new Promise((resolve) => {
      const t = setTimeout(() => {
        pads[i].dataset.lit = '0';
        const t2 = setTimeout(resolve, 140);
        disposeRef.push(() => clearTimeout(t2));
      }, ms);
      disposeRef.push(() => clearTimeout(t));
    });
  }

  async function playSequence() {
    accepting = false;
    pads.forEach((p) => { p.disabled = true; });
    msg.textContent = 'Watch…';
    await new Promise((r) => {
      const t = setTimeout(r, 600);
      disposeRef.push(() => clearTimeout(t));
    });
    for (const i of sequence) {
      await lit(i);
    }
    step = 0;
    accepting = true;
    pads.forEach((p) => { p.disabled = false; });
    msg.textContent = 'Your turn.';
  }

  function nextLevel() {
    level += 1;
    setHud('hud-l', level);
    sequence.push(Math.floor(Math.random() * 4));
    playSequence();
  }

  pads.forEach((pad) => {
    pad.addEventListener('click', () => {
      if (!accepting) return;
      const i = Number(pad.dataset.pad);
      lit(i, 180);
      if (sequence[step] === i) {
        step += 1;
        if (step === sequence.length) {
          accepting = false;
          pads.forEach((p) => { p.disabled = true; });
          msg.textContent = 'Correct!';
          const t = setTimeout(nextLevel, 800);
          disposeRef.push(() => clearTimeout(t));
        }
        return;
      }

      // wrong
      accepting = false;
      pads.forEach((p) => { p.disabled = true; });
      const record = saveBest('echo.best', level - 1);
      msg.textContent = '';
      root.querySelector('.card').insertAdjacentHTML('beforeend', `
        <div class="result" style="margin-top:18px">
          <span class="big">Level ${level}</span>
          <p class="muted">You echoed ${sequence.length - 1} of ${sequence.length} correctly.${record ? ' New best.' : ''}</p>
          <div class="btn-row" style="justify-content:center;margin-top:14px">
            <button class="btn btn--accent" type="button" data-act="start">Try again</button>
            <a class="btn btn--ghost" href="#/games">Other games</a>
          </div>
        </div>`);
      setHud('hud-b', Math.max(bestOf('echo.best') ?? 0, level - 1));
    });
  });

  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="start"]')) {
      sequence = [];
      level = 0;
      step = 0;
      accepting = false;
      root.querySelectorAll('.result').forEach((n) => n.remove());
      nextLevel();
    }
  });
}

/* ---------- render ---------- */

const MOUNTS = {
  memory: mountMemory,
  tables: mountTables,
  scramble: mountScramble,
  sprint: mountSprint,
  echo: mountEcho,
};

export async function render(view, params) {
  const id = params[0];
  const disposeRef = [];

  if (!id) {
    view.innerHTML = `
      <header>
        <span class="eyebrow">Five games</span>
        <h1 class="display" style="margin:12px 0 10px">Pick something.</h1>
        <p class="lede">No downloads, no ads, no sign-up. Every game saves your best score on this device.</p>
      </header>
      <div class="game-picker">
        ${GAMES.map((g) => {
          const best = bestOf(g.bestKey);
          return `
            <button class="game-tile" type="button" data-game="${g.id}">
              <span class="ico" aria-hidden="true">${g.ico}</span>
              <b>${esc(g.name)}</b>
              <span>${esc(g.blurb)}</span>
              ${best !== null ? `<span class="best">Best: ${esc(g.bestLabel(best))}</span>` : ''}
            </button>`;
        }).join('')}
      </div>`;

    view.querySelector('.game-picker').addEventListener('click', (e) => {
      const t = e.target.closest('[data-game]');
      if (t) location.hash = `#/games/${t.dataset.game}`;
    });

    return () => {};
  }

  const game = GAMES.find((g) => g.id === id);
  const mount = MOUNTS[id];

  if (!game || !mount) {
    view.innerHTML = `
      <div class="empty">
        <div class="ico" aria-hidden="true">🤔</div>
        <h2>No game called that</h2>
        <p><a class="btn btn--ghost" href="#/games">Back to the games</a></p>
      </div>`;
    return () => {};
  }

  view.innerHTML = '<div class="game-shell"></div>';
  const root = view.querySelector('.game-shell');
  mount(root, disposeRef);

  return () => {
    disposeRef.forEach((fn) => {
      try { fn(); } catch { /* ignore */ }
    });
  };
}
