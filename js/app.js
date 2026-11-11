import { loadState, getState, saveState, addXp, updateStreak, setHearts, getHearts, langProgress, markLessonComplete, isLessonComplete, getSettings, setSetting, recordDailyLesson } from './state.js';
import { LANGUAGES, getLanguage } from '../data/languages.js';
import * as ui from './ui.js';
import * as audio from './audio.js';
import { buildSession } from './lessons.js';
import { renderExercise } from './exercises.js';

loadState();
audio.setSoundStateRef(getState());

const app = document.getElementById('app');

const state = { view: 'home', params: {} };

const LANG_ICONS = {
  en: 'earth-americas', es: 'earth-americas',
  fr: 'earth-europe', de: 'earth-europe',
  ja: 'earth-asia', ko: 'earth-asia', zh: 'earth-asia',
  ar: 'earth-africa',
};
const UNIT_ICONS = { u1: 'hand', u2: 'hashtag', u3: 'utensils', u4: 'plane', u5: 'comments' };

function setView(name, params = {}) {
  state.view = name;
  state.params = params;
  try { window.scrollTo(0, 0); } catch (e) { /* jsdom / restricted embeds */ }
  render();
}

function makeTopbar({ title, onBack, actions = [] }) {
  const tb = ui.el('div', { class: 'topbar' });
  const left = ui.el('div', { class: 'topbar-left' });
  if (onBack) left.appendChild(ui.btn('btn btn-ghost btn-sm', 'Kembali', 'arrow-left', onBack));
  const brand = ui.el('div', { class: 'brand' }, [ui.logoMark(), ui.el('span', {}, title)]);
  left.appendChild(brand);
  tb.appendChild(left);
  const act = ui.el('div', { class: 'actions' });
  actions.forEach(a => act.appendChild(a));
  tb.appendChild(act);
  return tb;
}

function heartsPill(n) {
  const p = ui.el('span', { class: 'pill hearts' });
  p.innerHTML = `${ui.iHTML('heart')}<span>${n}</span>`;
  return p;
}

function progressBar(value) {
  const pb = ui.el('div', { class: 'progress' });
  const fill = ui.el('span');
  fill.style.width = Math.max(0, Math.min(100, value)) + '%';
  pb.appendChild(fill);
  return pb;
}

function render() {
  app.innerHTML = '';
  const s = getState();
  if (s.user.sound !== undefined) s.settings.sound = s.user.sound;
  if (state.params.langId) {
    const l = getLanguage(state.params.langId);
    if (l) ui.setLangAccent(l);
  } else {
    ui.setLangAccent({ accent: '#E74C3C', accentSoft: '#FDECEA' });
  }
  switch (state.view) {
    case 'home': renderHome(); break;
    case 'language': renderLanguage(); break;
    case 'lesson': renderLesson(); break;
    case 'summary': renderSummary(); break;
    case 'badges': renderBadges(); break;
    case 'missions': renderMissions(); break;
    case 'settings': renderSettings(); break;
    default: renderHome();
  }
}

// ---------- Home ----------
function renderHome() {
  const s = getState();
  const tk = (new Date()).toISOString().slice(0,10);
  if (s.user.dailyDate !== tk) { s.user.dailyDate = tk; s.user.dailyXp = 0; s.user.dailyLessons = 0; saveState(); }

  app.appendChild(makeTopbar({
    title: 'LinguaQuest',
    actions: [
      ui.btn('btn btn-ghost btn-sm', 'Misi', 'bullseye', () => setView('missions')),
      ui.btn('btn btn-ghost btn-sm', 'Badge', 'medal', () => setView('badges')),
      ui.btn('btn btn-ghost btn-sm', 'Pengaturan', 'gear', () => setView('settings')),
    ],
  }));

  const screen = ui.el('div', { class: 'screen' });
  const c = ui.el('div', { class: 'container' });

  // hero with mascot + speech bubble
  const hero = ui.el('div', { class: 'hero' });
  const heroArt = ui.el('div', { class: 'hero-art' });
  const orb = ui.el('div', { class: 'hero-orb' });
  ui.renderMascot(orb, 'happy');
  heroArt.appendChild(orb);
  const bubble = ui.el('div', { class: 'hero-bubble' });
  let bubbleMsg = 'Mau lanjut petualangan bahasa hari ini?';
  if (s.user.dailyXp >= s.user.dailyGoal) bubbleMsg = 'Target harian tercapai. Mau tantangan lagi?';
  else if (s.user.streak >= 3) bubbleMsg = `Streak ${s.user.streak} hari. Pertahankan, ya!`;
  bubble.appendChild(ui.el('strong', {}, 'Halo, penjelajah!'));
  bubble.appendChild(ui.el('span', {}, bubbleMsg));
  heroArt.appendChild(bubble);
  hero.appendChild(heroArt);

  const heroCopy = ui.el('div', { class: 'hero-copy' });
  heroCopy.appendChild(ui.el('h1', {}, 'Belajar bahasa, rasanya seperti main game.'));
  heroCopy.appendChild(ui.el('p', { class: 'lead' }, 'Pilih bahasa, selesaikan level 3–5 menit, kumpulkan XP, dan jaga streak harianmu.'));
  const cta = ui.el('div', { class: 'cta-row' });
  const continueLang = getLastLanguage();
  if (continueLang) {
    cta.appendChild(ui.btn('btn btn-primary btn-lg', `Lanjut ${getLanguage(continueLang).name}`, 'play', () => setView('language', { langId: continueLang })));
  }
  cta.appendChild(ui.btn('btn btn-secondary btn-lg', 'Pilih bahasa', 'compass', () => document.getElementById('langlist').scrollIntoView({ behavior: 'smooth' })));
  heroCopy.appendChild(cta);
  hero.appendChild(heroCopy);
  c.appendChild(hero);

  // HUD
  const hud = ui.el('div', { class: 'hud' });
  const hudItems = [
    { icon: 'star', cls: 'xp', label: `${s.user.xp} XP` },
    { icon: 'bolt', cls: '', label: `Lv ${s.user.level}` },
    { icon: 'fire', cls: 'streak', label: `${s.user.streak} hari` },
    { icon: 'heart', cls: 'hearts', label: `${s.user.hearts}` },
  ];
  hudItems.forEach((h, i) => {
    const p = ui.el('span', { class: `pill ${h.cls}`, style: `--i:${i}` });
    p.innerHTML = `${ui.iHTML(h.icon)}<span>${h.label}</span>`;
    hud.appendChild(p);
  });
  c.appendChild(hud);

  // daily goal
  const goalDone = s.user.dailyXp >= s.user.dailyGoal;
  const goal = ui.el('div', { class: 'card goal-card' + (goalDone ? ' done' : '') });
  const goalTop = ui.el('div', { class: 'goal-top' });
  const goalLabel = ui.el('div', { class: 'goal-label' });
  goalLabel.appendChild(ui.icon('bullseye'));
  goalLabel.appendChild(ui.el('strong', {}, 'Target harian'));
  goalTop.appendChild(goalLabel);
  goalTop.appendChild(ui.el('span', { class: 'small' }, `${s.user.dailyXp}/${s.user.dailyGoal} XP`));
  goal.appendChild(goalTop);
  goal.appendChild(progressBar((s.user.dailyXp / s.user.dailyGoal) * 100));
  c.appendChild(goal);

  // language list
  const list = ui.el('div', { id: 'langlist' });
  const listHead = ui.el('div', { class: 'section-head' });
  listHead.appendChild(ui.el('h2', {}, 'Pilih bahasa'));
  listHead.appendChild(ui.el('span', { class: 'small' }, `${LANGUAGES.length} bahasa tersedia`));
  list.appendChild(listHead);

  const grid = ui.el('div', { class: 'lang-grid' });
  LANGUAGES.forEach((l, i) => {
    const p = langProgress(l.id);
    const done = p.completedLessons.length;
    const total = l.units.reduce((a, u) => a + u.lessons.length, 0);
    const pct = Math.round((done / total) * 100);
    const card = ui.el('div', {
      class: 'card lang-card',
      style: `--i:${i}; --card-accent:${l.accent};`,
      tabindex: '0',
      role: 'button',
      'aria-label': `Belajar ${l.name}`,
    });
    card.addEventListener('click', () => setView('language', { langId: l.id }));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView('language', { langId: l.id }); } });

    const dot = ui.el('div', { class: 'lang-dot', style: `background:${l.accent}` });
    dot.appendChild(ui.icon(LANG_ICONS[l.id] || 'globe'));
    card.appendChild(dot);

    const info = ui.el('div', { class: 'lang-info' });
    info.appendChild(ui.el('strong', {}, l.name));
    const meta = ui.el('div', { class: 'lang-meta' });
    meta.appendChild(ui.el('span', {}, l.native));
    meta.appendChild(ui.el('span', { class: 'meta-sep' }, '·'));
    meta.appendChild(ui.el('span', {}, `${done}/${total} pelajaran`));
    info.appendChild(meta);
    const mini = ui.el('div', { class: 'mini-progress' });
    mini.appendChild(ui.el('span', { style: `width:${pct}%; background:${l.accent}` }));
    info.appendChild(mini);
    card.appendChild(info);

    const right = ui.el('div', { class: 'lang-right' });
    right.appendChild(ui.el('span', { class: 'pct' }, `${pct}%`));
    right.appendChild(ui.icon('chevron-right'));
    card.appendChild(right);
    grid.appendChild(card);
  });
  list.appendChild(grid);
  c.appendChild(list);

  screen.appendChild(c);
  app.appendChild(screen);
}

function getLastLanguage() {
  const s = getState();
  const ids = Object.keys(s.progress);
  if (ids.length === 0) return null;
  for (const id of ids) {
    if (s.progress[id].completedLessons.length > 0) return id;
  }
  return ids[0];
}

// ---------- Language ----------
function renderLanguage() {
  const { langId } = state.params;
  const lang = getLanguage(langId);
  if (!lang) { setView('home'); return; }
  ui.setLangAccent(lang);

  app.appendChild(makeTopbar({
    title: lang.name,
    onBack: () => setView('home'),
    actions: [ui.btn('btn btn-ghost btn-sm', 'Misi', 'bullseye', () => setView('missions'))],
  }));

  const screen = ui.el('div', { class: 'screen' });
  const c = ui.el('div', { class: 'container' });

  const p = langProgress(langId);
  const total = lang.units.reduce((a, u) => a + u.lessons.length, 0);
  const done = p.completedLessons.length;
  const allLessonsFlat = lang.units.flatMap(u => u.lessons);
  const nextLessonId = allLessonsFlat.find(l => !isLessonComplete(langId, l.id))?.id;

  const header = ui.el('div', { class: 'card lang-hero' });
  const iconBox = ui.el('div', { class: 'lang-hero-icon', style: `background:${lang.accent}` });
  iconBox.appendChild(ui.icon(LANG_ICONS[langId] || 'globe'));
  header.appendChild(iconBox);
  const hInfo = ui.el('div', { class: 'lang-hero-info' });
  hInfo.appendChild(ui.el('h2', {}, lang.native));
  hInfo.appendChild(ui.el('p', { class: 'small' }, `${done} dari ${total} pelajaran selesai`));
  header.appendChild(hInfo);
  header.appendChild(progressBar((done / total) * 100));
  c.appendChild(header);

  lang.units.forEach((unit, uiIdx) => {
    const unitEl = ui.el('div', { class: 'unit' });
    const uh = ui.el('div', { class: 'unit-header' });
    uh.appendChild(ui.el('div', { class: 'num' }, String(uiIdx + 1)));
    const uIcon = ui.el('div', { class: 'unit-icon' });
    uIcon.appendChild(ui.icon(UNIT_ICONS[unit.id] || 'book-open'));
    uh.appendChild(uIcon);
    uh.appendChild(ui.el('h3', {}, unit.title));
    unitEl.appendChild(uh);

    const path = ui.el('div', { class: 'path' });
    const row = ui.el('div', { class: 'path-row' });
    unit.lessons.forEach((lesson) => {
      const col = ui.el('div', { class: 'path-col' });
      const allLessons = allLessonsFlat;
      const idx = allLessons.indexOf(lesson);
      const prev = idx > 0 ? allLessons[idx - 1] : null;
      const locked = !!(prev && !isLessonComplete(langId, prev.id));
      const complete = isLessonComplete(langId, lesson.id);
      const node = ui.el('div', {
        class: 'node' + (complete ? ' done' : '') + (locked ? ' locked' : '') + (!locked && lesson.id === nextLessonId ? ' next' : ''),
        tabindex: locked ? '-1' : '0',
        role: 'button',
        style: `--i:${idx}`,
        'aria-label': `${lesson.title}${locked ? ' (terkunci)' : ''}`,
      });
      if (locked) node.appendChild(ui.icon('lock'));
      else node.appendChild(ui.el('span', { class: 'node-num' }, String(idx + 1)));
      const stars = p.unitStars[lesson.id] || 0;
      if (stars > 0) {
        const star = ui.el('span', { class: 'star' });
        star.appendChild(ui.icon('star'));
        node.appendChild(star);
      }
      if (!locked) {
        node.addEventListener('click', () => startLesson(langId, lesson));
        node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startLesson(langId, lesson); } });
      }
      col.appendChild(node);
      col.appendChild(ui.el('div', { class: 'node-label' }, lesson.title));
      row.appendChild(col);
    });
    path.appendChild(row);
    unitEl.appendChild(path);
    c.appendChild(unitEl);
  });

  screen.appendChild(c);
  app.appendChild(screen);
}

function startLesson(langId, lesson) {
  const session = buildSession(langId, lesson);
  state.session = session;
  setView('lesson', { langId, lessonId: lesson.id });
}

// ---------- Lesson session ----------
function renderLesson() {
  const { langId } = state.params;
  const lang = getLanguage(langId);
  ui.setLangAccent(lang);
  const session = state.session;
  if (!session) { setView('language', { langId }); return; }

  app.appendChild(makeTopbar({
    title: session.lesson.title,
    actions: [
      heartsPill(getHearts()),
      ui.btn('btn btn-ghost btn-sm', '', 'xmark', () => {
        ui.modal({
          title: 'Keluar dari pelajaran?',
          body: 'Progres sesi ini akan hilang. Kamu bisa memulainya lagi dari peta.',
          actions: [
            { label: 'Lanjut belajar', class: 'btn btn-secondary' },
            { label: 'Keluar', icon: 'arrow-right-from-bracket', class: 'btn btn-danger', onClick: () => setView('language', { langId }) },
          ],
        });
      }, { attrs: { 'aria-label': 'Keluar dari pelajaran' } }),
    ],
  }));

  const screen = ui.el('div', { class: 'screen' });
  const c = ui.el('div', { class: 'container' });

  const lessonProgress = progressBar((session.index / session.exercises.length) * 100);
  const lessonFill = lessonProgress.querySelector('span');
  c.appendChild(lessonProgress);

  const exArea = ui.el('div', { class: 'exercise' });
  const mascotWrap = ui.el('div', { class: 'mascot-wrap' });
  const mascotBox = ui.el('div', { id: 'mascot' });
  mascotWrap.appendChild(mascotBox);
  ui.renderMascot(mascotBox, 'idle');
  exArea.appendChild(mascotWrap);

  const exContainer = ui.el('div', { id: 'ex' });
  exArea.appendChild(exContainer);
  c.appendChild(exArea);
  screen.appendChild(c);
  app.appendChild(screen);

  renderCurrentExercise(exContainer, mascotBox, session, langId, lessonFill);
}

function renderCurrentExercise(container, mascotBox, session, langId, lessonFill) {
  container.innerHTML = '';
  if (session.index >= session.exercises.length || getHearts() <= 0) {
    finishSession(langId, session);
    return;
  }
  const ex = session.exercises[session.index];
  const meta = ui.EXERCISE_META[ex.type] || { icon: 'book-open', label: 'Latihan' };
  const ribbon = ui.el('div', { class: 'type-ribbon' });
  ribbon.appendChild(ui.icon(meta.icon));
  ribbon.appendChild(ui.el('span', {}, meta.label));
  container.appendChild(ribbon);

  renderExercise({
    exercise: ex,
    container,
    langId,
    onAnswer: (correct, xpGain) => {
      if (correct) {
        session.correct += 1;
        session.xp += xpGain;
        ui.renderMascot(mascotBox, 'happy');
        ui.feedback('Benar!', true);
        ui.floatXp(xpGain, mascotBox);
        audio.soundCorrect();
        ui.confetti(document.body, 18);
      } else {
        session.wrong += 1;
        const h = getHearts() - 1;
        setHearts(h);
        const heartsEl = document.querySelector('.pill.hearts');
        if (heartsEl) {
          heartsEl.innerHTML = `${ui.iHTML('heart')}<span>${h}</span>`;
          heartsEl.classList.add('lost');
          setTimeout(() => heartsEl.classList.remove('lost'), 500);
        }
        ui.renderMascot(mascotBox, 'sad');
        ui.feedback('Coba lagi', false);
        audio.soundWrong();
      }
      session.index += 1;
      if (lessonFill) lessonFill.style.width = (session.index / session.exercises.length) * 100 + '%';
      if (ex.wordId) {
        import('./state.js').then(m => m.reviewCard(langId, ex.wordId, correct));
      }
      setTimeout(() => renderCurrentExercise(container, mascotBox, session, langId, lessonFill), 950);
    }
  });
}

function finishSession(langId, session) {
  const total = session.exercises.length;
  const acc = total ? Math.round((session.correct / total) * 100) : 0;
  const stars = acc >= 90 ? 3 : acc >= 70 ? 2 : acc >= 50 ? 1 : 0;
  markLessonComplete(langId, session.lesson.id, stars);
  const leveled = addXp(session.xp);
  recordDailyLesson();
  updateStreak();
  checkBadges(langId, session, acc);
  setHearts(5);
  state.summary = { langId, session, acc, stars, xp: session.xp, leveled };
  setView('summary', { langId });
}

function checkBadges(langId, session, acc) {
  const s = getState();
  if (s.progress[langId].completedLessons.length === 1) {
    ui.toast('Badge baru: Langkah Pertama!', 'seedling');
    import('./state.js').then(m => m.unlockBadge('first_lesson'));
  }
  if (acc === 100) {
    ui.toast('Badge baru: Sempurna!', 'star');
    import('./state.js').then(m => m.unlockBadge('perfect'));
  }
  if (s.user.streak >= 3) {
    import('./state.js').then(m => m.unlockBadge('streak3'));
  }
  if (s.user.level >= 5) {
    import('./state.js').then(m => m.unlockBadge('level5'));
  }
}

// ---------- Summary ----------
function renderSummary() {
  const { langId } = state.params;
  const lang = getLanguage(langId);
  ui.setLangAccent(lang);
  const sm = state.summary;
  const session = sm.session;

  app.appendChild(makeTopbar({ title: 'Ringkasan Sesi', onBack: () => setView('language', { langId }) }));

  const screen = ui.el('div', { class: 'screen center' });
  const c = ui.el('div', { class: 'container' });

  const mascotBox = ui.el('div', { class: 'mascot-wrap' });
  const m = ui.el('div');
  mascotBox.appendChild(m);
  ui.renderMascot(m, sm.acc >= 70 ? 'cheer' : 'happy');
  c.appendChild(mascotBox);

  c.appendChild(ui.el('h1', {}, sm.acc >= 90 ? 'Luar biasa!' : sm.acc >= 70 ? 'Bagus!' : 'Terus semangat!'));
  c.appendChild(ui.el('p', { class: 'small', style: 'margin: 8px 0 24px;' }, `Akurasi ${sm.acc}%`));

  const grid = ui.el('div', { class: 'summary-grid' });
  const cards = [
    { icon: 'star', value: sm.xp, prefix: '+', suffix: '', lbl: 'XP diperoleh' },
    { icon: 'bullseye', value: sm.acc, prefix: '', suffix: '%', lbl: 'Akurasi' },
    { icon: 'check-double', value: `${session.correct}/${session.exercises.length}`, lbl: 'Jawaban benar' },
  ];
  cards.forEach((it, i) => {
    const card = ui.el('div', { class: 'stat-card', style: `--i:${i}` });
    const top = ui.el('div', { class: 'stat-icon' });
    top.appendChild(ui.icon(it.icon));
    card.appendChild(top);
    const val = ui.el('div', { class: 'val' });
    if (typeof it.value === 'number') {
      ui.countUp(val, it.value, { prefix: it.prefix || '', suffix: it.suffix || '' });
    } else {
      val.textContent = it.value;
    }
    card.appendChild(val);
    card.appendChild(ui.el('div', { class: 'lbl' }, it.lbl));
    grid.appendChild(card);
  });

  // stars card
  const starCard = ui.el('div', { class: 'stat-card', style: '--i:3' });
  const starIcon = ui.el('div', { class: 'stat-icon' });
  starIcon.appendChild(ui.icon('star'));
  starCard.appendChild(starIcon);
  const starVal = ui.el('div', { class: 'val stars' });
  for (let i = 0; i < 3; i++) {
    const s = ui.el('span', { class: i < sm.stars ? 'on' : 'off' });
    s.appendChild(ui.icon('star'));
    starVal.appendChild(s);
  }
  starCard.appendChild(starVal);
  starCard.appendChild(ui.el('div', { class: 'lbl' }, 'Bintang'));
  grid.appendChild(starCard);

  c.appendChild(grid);

  if (sm.leveled) {
    const lvl = ui.el('div', { class: 'card levelup-card' });
    lvl.appendChild(ui.icon('arrow-trend-up'));
    lvl.appendChild(ui.el('strong', {}, `Naik ke Level ${getState().user.level}!`));
    c.appendChild(lvl);
    audio.soundLevelUp();
  }

  const actions = ui.el('div', { class: 'summary-actions' });
  actions.appendChild(ui.btn('btn btn-primary btn-lg', 'Kembali ke peta', 'map', () => setView('language', { langId })));
  actions.appendChild(ui.btn('btn btn-secondary', 'Beranda', 'house', () => setView('home')));
  c.appendChild(actions);

  screen.appendChild(c);
  app.appendChild(screen);
  if (sm.acc >= 90) ui.confetti(document.body, 60);
}

// ---------- Badges ----------
function renderBadges() {
  const s = getState();
  const topbar = makeTopbar({ title: 'Badge', onBack: () => setView('home') });
  app.appendChild(topbar);
  const screen = ui.el('div', { class: 'screen' });
  const c = ui.el('div', { class: 'container' });
  c.appendChild(ui.el('h1', { style: 'margin-bottom:16px;' }, 'Koleksi Badge'));

  const badges = [
    { id: 'first_lesson', name: 'Langkah Pertama', icon: 'seedling', desc: 'Selesaikan pelajaran pertama' },
    { id: 'perfect', name: 'Sempurna', icon: 'star', desc: 'Akurasi 100% di satu sesi' },
    { id: 'streak3', name: 'Rajin 3 Hari', icon: 'fire', desc: 'Streak 3 hari berturut-turut' },
    { id: 'level5', name: 'Level 5', icon: 'medal', desc: 'Capai level 5' },
    { id: 'polyglot', name: 'Poliglot', icon: 'earth-asia', desc: 'Belajar 3 bahasa' },
    { id: 'xp500', name: '500 XP', icon: 'trophy', desc: 'Kumpulkan 500 XP' },
  ];
  const grid = ui.el('div', { class: 'badge-grid' });
  badges.forEach((b, i) => {
    if (b.id === 'polyglot' && Object.keys(s.progress).filter(k => s.progress[k].completedLessons.length > 0).length >= 3) {
      if (!s.badges.includes(b.id)) { s.badges.push(b.id); saveState(); }
    }
    if (b.id === 'xp500' && s.user.xp >= 500) {
      if (!s.badges.includes(b.id)) { s.badges.push(b.id); saveState(); }
    }
    const isLocked = !s.badges.includes(b.id);
    const item = ui.el('div', { class: 'badge-item' + (isLocked ? ' locked' : ''), style: `--i:${i}` });
    const iconBox = ui.el('div', { class: 'icon' });
    iconBox.appendChild(ui.icon(b.icon));
    item.appendChild(iconBox);
    item.appendChild(ui.el('div', { class: 'name' }, b.name));
    item.appendChild(ui.el('div', { class: 'small' }, b.desc));
    grid.appendChild(item);
  });
  c.appendChild(grid);
  screen.appendChild(c);
  app.appendChild(screen);
}

// ---------- Missions ----------
function renderMissions() {
  const topbar = makeTopbar({ title: 'Misi Harian', onBack: () => setView('home') });
  app.appendChild(topbar);
  const screen = ui.el('div', { class: 'screen' });
  const c = ui.el('div', { class: 'container' });
  c.appendChild(ui.el('h1', { style: 'margin-bottom:16px;' }, 'Misi Harian'));
  const missions = [
    { id: 'm1', text: 'Selesaikan 1 pelajaran' },
    { id: 'm2', text: 'Kumpulkan 30 XP' },
    { id: 'm3', text: 'Jaga streak harian' },
  ];
  const s = getState();
  missions[0].done = (s.user.dailyLessons || 0) >= 1;
  missions[1].done = (s.user.dailyXp || 0) >= 30;
  missions[2].done = s.user.streak >= 1;
  const missionList = ui.el('div', { class: 'mission-list' });
  missions.forEach((m) => {
    const row = ui.el('div', { class: 'mission' + (m.done ? ' done' : '') });
    const check = ui.el('div', { class: 'check' });
    check.appendChild(ui.icon('check'));
    if (!m.done) check.classList.add('empty');
    row.appendChild(check);
    row.appendChild(ui.el('span', {}, m.text));
    missionList.appendChild(row);
  });
  c.appendChild(missionList);

  const ch = ui.el('div', { class: 'card challenge-card' });
  const chIcon = ui.el('div', { class: 'challenge-icon' });
  chIcon.appendChild(ui.icon('stopwatch'));
  ch.appendChild(chIcon);
  ch.appendChild(ui.el('h3', {}, 'Tantangan Acak'));
  ch.appendChild(ui.el('p', { class: 'small', style: 'margin:6px 0 14px;' }, 'Selesaikan satu sesi speed round untuk bonus XP.'));
  ch.appendChild(ui.btn('btn btn-primary', 'Mulai tantangan', 'bolt', () => {
    const langId = state.params.langId || getLastLanguage() || 'en';
    const lang = getLanguage(langId);
    const lesson = lang.units[0].lessons[0];
    const session = buildSession(langId, lesson, { forceType: 'speed' });
    state.session = session;
    setView('lesson', { langId });
  }));
  c.appendChild(ch);
  screen.appendChild(c);
  app.appendChild(screen);
}

// ---------- Settings ----------
function renderSettings() {
  const topbar = makeTopbar({ title: 'Pengaturan', onBack: () => setView('home') });
  app.appendChild(topbar);
  const screen = ui.el('div', { class: 'screen' });
  const c = ui.el('div', { class: 'container' });
  c.appendChild(ui.el('h1', { style: 'margin-bottom:16px;' }, 'Pengaturan'));

  const soundRow = ui.el('div', { class: 'settings-row' });
  const soundLabel = ui.el('div', { class: 'settings-label' });
  soundLabel.appendChild(ui.icon('volume-high'));
  soundLabel.appendChild(ui.el('span', {}, 'Efek suara'));
  soundRow.appendChild(soundLabel);
  const soundBtn = ui.el('button', { class: 'btn btn-secondary btn-sm' });
  const paintSound = (on) => {
    soundBtn.innerHTML = '';
    soundBtn.appendChild(ui.icon(on ? 'volume-high' : 'volume-xmark'));
    soundBtn.appendChild(ui.el('span', {}, on ? 'Aktif' : 'Mati'));
  };
  paintSound(getSettings().sound);
  soundBtn.addEventListener('click', () => {
    const v = !getSettings().sound;
    setSetting('sound', v);
    getState().user.sound = v;
    saveState();
    paintSound(v);
  });
  soundRow.appendChild(soundBtn);
  c.appendChild(soundRow);

  const resetRow = ui.el('div', { class: 'settings-row' });
  const resetLabel = ui.el('div', { class: 'settings-label' });
  resetLabel.appendChild(ui.icon('rotate-left'));
  resetLabel.appendChild(ui.el('span', {}, 'Reset progres'));
  resetRow.appendChild(resetLabel);
  resetRow.appendChild(ui.btn('btn btn-danger btn-sm', 'Reset', 'trash-can', () => {
    ui.modal({ title: 'Reset progres?', body: 'Semua XP, streak, dan pelajaran akan dihapus.', actions: [
      { label: 'Batal', class: 'btn btn-secondary' },
      { label: 'Reset', icon: 'trash-can', class: 'btn btn-danger', onClick: () => { import('./state.js').then(m => { m.resetState(); setView('home'); }); } },
    ]});
  }));
  c.appendChild(resetRow);

  screen.appendChild(c);
  app.appendChild(screen);
}

// expose for debugging
window.__LQ__ = { setView, getState };

render();
