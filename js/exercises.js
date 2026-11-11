import * as ui from './ui.js';
import * as audio from './audio.js';

const SPEECH_LANG = { en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN', ar: 'ar-SA', es: 'es-ES', fr: 'fr-FR', de: 'de-DE' };

function speak(text, langId) {
  if (!('speechSynthesis' in window)) return false;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH_LANG[langId] || 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
    return true;
  } catch (e) { return false; }
}

function markOption(btn, correct) {
  const old = btn.querySelector('.opt-mark');
  if (old) old.remove();
  const mark = ui.el('span', { class: 'opt-mark' });
  mark.appendChild(ui.icon(correct ? 'circle-check' : 'circle-xmark'));
  btn.appendChild(mark);
}

export function renderExercise({ exercise, container, langId, onAnswer }) {
  switch (exercise.type) {
    case 'flashcard': return renderFlashcard(exercise, container, langId, onAnswer);
    case 'mcq': return renderMcq(exercise, container, langId, onAnswer);
    case 'memory': return renderMemory(exercise, container, langId, onAnswer);
    case 'builder': return renderBuilder(exercise, container, langId, onAnswer);
    case 'listen': return renderListen(exercise, container, langId, onAnswer);
    case 'speed': return renderSpeed(exercise, container, langId, onAnswer);
  }
}

// ---------- Flashcard ----------
function renderFlashcard(ex, container, langId, onAnswer) {
  const prompt = ui.el('div', { class: 'prompt' });
  prompt.appendChild(ui.el('div', { class: 'question' }, 'Hafalkan kata ini'));
  container.appendChild(prompt);

  const card = ui.el('div', { class: 'flashcard', tabindex: '0', role: 'button', 'aria-label': 'Flashcard, ketuk untuk membalik' });
  const flip = () => { card.classList.toggle('flipped'); audio.soundFlip(); };
  card.addEventListener('click', flip);
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });

  const inner = ui.el('div', { class: 'inner' });
  const front = ui.el('div', { class: 'face' });
  front.appendChild(ui.el('div', { class: 'target' }, ex.target));
  if (ex.roman) front.appendChild(ui.el('div', { class: 'roman' }, ex.roman));
  const hint = ui.el('div', { class: 'hint' });
  hint.appendChild(ui.icon('hand-pointer'));
  hint.appendChild(ui.el('span', {}, 'Ketuk untuk membalik'));
  front.appendChild(hint);

  const back = ui.el('div', { class: 'face back' });
  if (ex.emoji) back.appendChild(ui.el('div', { class: 'flash-emoji' }, ex.emoji));
  back.appendChild(ui.el('div', { class: 'target', style: 'font-size:1.6rem;' }, ex.meaning));
  back.appendChild(ui.el('div', { class: 'hint' }, 'Arti dalam bahasa Indonesia'));
  inner.appendChild(front);
  inner.appendChild(back);
  card.appendChild(inner);
  container.appendChild(card);

  const actions = ui.el('div', { class: 'answer-actions' });
  let answered = false;
  const lock = () => { answered = true; Array.from(actions.querySelectorAll('button')).forEach(b => { b.disabled = true; b.style.pointerEvents = 'none'; }); };
  actions.appendChild(ui.btn('btn btn-primary btn-block', 'Belum hafal', 'rotate-left', () => {
    if (answered) return;
    lock();
    onAnswer(false, 0);
  }));
  actions.appendChild(ui.btn('btn btn-secondary btn-block', 'Sudah tahu', 'check', () => {
    if (answered) return;
    lock();
    card.classList.add('flipped');
    setTimeout(() => onAnswer(true, 5), 380);
  }));
  container.appendChild(actions);
}

// ---------- MCQ ----------
function renderMcq(ex, container, langId, onAnswer) {
  const prompt = ui.el('div', { class: 'prompt' });
  prompt.appendChild(ui.el('div', { class: 'question' }, ex.prompt));
  if (ex.direction === 'tm') {
    prompt.appendChild(ui.el('div', { class: 'target' }, ex.target));
    if (ex.roman) prompt.appendChild(ui.el('div', { class: 'roman' }, ex.roman));
  } else {
    prompt.appendChild(ui.el('div', { class: 'target', style: 'font-size:1.4rem;' }, ex.question));
  }
  container.appendChild(prompt);
  if (ex.emoji && ex.direction === 'tm') container.appendChild(ui.el('div', { class: 'prompt-emoji' }, ex.emoji));

  const opts = ui.el('div', { class: 'options grid2' });
  let answered = false;
  ex.options.forEach((o, i) => {
    const btn = ui.el('button', { class: 'opt', style: `--i:${i}`, onclick: () => {
      if (answered) return;
      answered = true;
      const correct = o === ex.answer;
      btn.classList.add(correct ? 'correct' : 'wrong');
      markOption(btn, correct);
      if (!correct) {
        Array.from(opts.children).forEach(b => {
          if (b.dataset.value === ex.answer) { b.classList.add('correct'); markOption(b, true); }
        });
      }
      Array.from(opts.children).forEach(b => { b.disabled = true; });
      setTimeout(() => onAnswer(correct, correct ? 8 : 0), 720);
    } });
    btn.dataset.value = o;
    btn.textContent = o;
    opts.appendChild(btn);
  });
  container.appendChild(opts);
}

// ---------- Memory ----------
function renderMemory(ex, container, langId, onAnswer) {
  const prompt = ui.el('div', { class: 'prompt' });
  prompt.appendChild(ui.el('div', { class: 'question' }, 'Cocokkan pasangan yang sama'));
  container.appendChild(prompt);

  const grid = ui.el('div', { class: 'memory-grid' });
  container.appendChild(grid);

  const cards = [];
  ex.pairs.forEach((p, idx) => {
    cards.push({ key: `a-${idx}`, text: p.a, pair: idx, side: 'a' });
    cards.push({ key: `b-${idx}`, text: p.b, pair: idx, side: 'b' });
  });
  const shuffled = shuffle(cards);

  let flipped = [];
  let matched = 0;
  let finished = false;
  const totalPairs = ex.pairs.length;

  shuffled.forEach((c, i) => {
    const el = ui.el('div', { class: 'mem-card', tabindex: '0', role: 'button', style: `--i:${i}`, 'aria-label': 'Kartu memori' });
    const cover = ui.el('div', { class: 'cover' });
    cover.appendChild(ui.icon('question'));
    el.appendChild(cover);
    const label = ui.el('div', { class: 'mem-label' }, c.text);
    el.appendChild(label);

    const flipCard = () => {
      if (el.classList.contains('matched') || el.classList.contains('flipped')) return;
      if (flipped.length === 2) return;
      el.classList.add('flipped');
      audio.soundFlip();
      flipped.push({ el, card: c });
      if (flipped.length === 2) {
        const [x, y] = flipped;
        if (x.card.pair === y.card.pair) {
          x.el.classList.add('matched');
          y.el.classList.add('matched');
          matched += 1;
          flipped = [];
          audio.soundCorrect();
          if (matched === totalPairs) {
            if (finished) return;
            finished = true;
            setTimeout(() => onAnswer(true, 15), 620);
          }
        } else {
          setTimeout(() => {
            x.el.classList.remove('flipped');
            y.el.classList.remove('flipped');
            flipped = [];
          }, 900);
          audio.soundWrong();
        }
      }
    };
    el.addEventListener('click', flipCard);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flipCard(); } });
    grid.appendChild(el);
  });
}

// ---------- Builder ----------
function renderBuilder(ex, container, langId, onAnswer) {
  const prompt = ui.el('div', { class: 'prompt' });
  prompt.appendChild(ui.el('div', { class: 'question' }, 'Susun kata menjadi kalimat'));
  prompt.appendChild(ui.el('div', { class: 'meaning' }, ex.meaning));
  container.appendChild(prompt);

  const builder = ui.el('div', { class: 'builder' });
  builder.appendChild(ui.el('div', { class: 'builder-label' }, 'Kalimatmu:'));
  const slot = ui.el('div', { class: 'slot' });
  builder.appendChild(slot);
  builder.appendChild(ui.el('div', { class: 'builder-label' }, 'Bank kata:'));
  const bank = ui.el('div', { class: 'bank' });
  builder.appendChild(bank);
  container.appendChild(builder);

  const chosen = [];
  ex.words.forEach((w) => {
    const chip = ui.el('div', { class: 'chip', tabindex: '0', role: 'button' }, w);
    const pick = () => {
      if (chip.classList.contains('used')) return;
      chip.classList.add('used');
      chosen.push(w);
      const s = ui.el('div', { class: 'chip', tabindex: '0', role: 'button' }, w);
      s.addEventListener('click', remove);
      s.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); remove(); } });
      function remove() {
        const idx = chosen.indexOf(w);
        if (idx > -1) chosen.splice(idx, 1);
        chip.classList.remove('used');
        s.remove();
      }
      slot.appendChild(s);
      audio.soundClick();
    };
    chip.addEventListener('click', pick);
    chip.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    bank.appendChild(chip);
  });

  const actions = ui.el('div', { class: 'answer-actions', style: 'grid-template-columns:1fr;' });
  let checked = false;
  actions.appendChild(ui.btn('btn btn-primary btn-block', 'Periksa jawaban', 'check', () => {
    if (checked) return;
    checked = true;
    Array.from(actions.querySelectorAll('button')).forEach(b => { b.disabled = true; });
    const correct = chosen.join(' ') === ex.answer.join(' ');
    slot.classList.add(correct ? 'is-correct' : 'is-wrong');
    setTimeout(() => onAnswer(correct, correct ? 10 : 0), 720);
  }));
  container.appendChild(actions);
}

// ---------- Listen ----------
function renderListen(ex, container, langId, onAnswer) {
  const prompt = ui.el('div', { class: 'prompt' });
  prompt.appendChild(ui.el('div', { class: 'question' }, ex.prompt));
  container.appendChild(prompt);

  const playBtn = ui.el('button', { class: 'btn btn-secondary btn-lg play-audio', 'aria-label': 'Putar pelafalan' });
  playBtn.appendChild(ui.icon('volume-high'));
  playBtn.appendChild(ui.el('span', {}, 'Putar'));
  const play = () => {
    speak(ex.target, langId);
    playBtn.classList.add('playing');
    setTimeout(() => playBtn.classList.remove('playing'), 900);
  };
  playBtn.addEventListener('click', play);
  container.appendChild(playBtn);
  setTimeout(play, 400);

  const opts = ui.el('div', { class: 'options grid2' });
  let answered = false;
  ex.options.forEach((o, i) => {
    const btn = ui.el('button', { class: 'opt', style: `--i:${i}` });
    btn.dataset.value = o;
    btn.textContent = o;
    btn.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const correct = o === ex.answer;
      btn.classList.add(correct ? 'correct' : 'wrong');
      markOption(btn, correct);
      if (!correct) {
        Array.from(opts.children).forEach(b => {
          if (b.dataset.value === ex.answer) { b.classList.add('correct'); markOption(b, true); }
        });
      }
      Array.from(opts.children).forEach(b => { b.disabled = true; });
      setTimeout(() => onAnswer(correct, correct ? 8 : 0), 720);
    });
    opts.appendChild(btn);
  });
  container.appendChild(opts);
}

// ---------- Speed ----------
function renderSpeed(ex, container, langId, onAnswer) {
  const prompt = ui.el('div', { class: 'prompt' });
  prompt.appendChild(ui.el('div', { class: 'question' }, 'Speed round! Jawab secepat mungkin'));
  container.appendChild(prompt);

  const bar = ui.el('div', { class: 'speedbar' });
  const timerWrap = ui.el('div', { class: 'speed-stat' });
  timerWrap.appendChild(ui.icon('stopwatch'));
  const timerEl = ui.el('div', { class: 'timer' }, '30');
  timerWrap.appendChild(timerEl);
  const scoreWrap = ui.el('div', { class: 'speed-stat score' });
  scoreWrap.appendChild(ui.icon('bolt'));
  const scoreEl = ui.el('div', { class: 'score-big' }, '0');
  scoreWrap.appendChild(scoreEl);
  bar.appendChild(timerWrap);
  bar.appendChild(scoreWrap);
  container.appendChild(bar);

  const timebar = ui.el('div', { class: 'timebar' });
  const timeFill = ui.el('span');
  timeFill.style.width = '100%';
  timebar.appendChild(timeFill);
  container.appendChild(timebar);

  const qArea = ui.el('div', { id: 'speed-q' });
  container.appendChild(qArea);

  let qi = 0;
  let score = 0;
  let timeLeft = 30;
  let finished = false;

  function showQ() {
    qArea.innerHTML = '';
    if (qi >= ex.questions.length) qi = 0;
    const q = ex.questions[qi];
    let locked = false;
    qArea.appendChild(ui.el('div', { class: 'target speed-target' }, q.target));
    if (q.roman) qArea.appendChild(ui.el('div', { class: 'roman' }, q.roman));
    const opts = ui.el('div', { class: 'options grid2' });
    q.options.forEach((o, i) => {
      const btn = ui.el('button', { class: 'opt', style: `--i:${i}` }, o);
      btn.addEventListener('click', () => {
        if (finished || locked) return;
        locked = true;
        const correct = o === q.answer;
        btn.classList.add(correct ? 'correct' : 'wrong');
        markOption(btn, correct);
        if (correct) {
          score += 1;
          scoreEl.textContent = score;
          scoreEl.classList.remove('bump');
          void scoreEl.offsetWidth;
          scoreEl.classList.add('bump');
          audio.soundCorrect();
        } else {
          audio.soundWrong();
        }
        qi += 1;
        setTimeout(showQ, 220);
      });
      opts.appendChild(btn);
    });
    qArea.appendChild(opts);
  }
  showQ();

  const interval = setInterval(() => {
    timeLeft -= 1;
    timerEl.textContent = timeLeft;
    timeFill.style.width = (timeLeft / 30) * 100 + '%';
    if (timeLeft <= 10) timerWrap.classList.add('danger');
    if (timeLeft <= 0) {
      clearInterval(interval);
      finished = true;
      onAnswer(score > 0, score * 4);
    }
  }, 1000);
}

function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
