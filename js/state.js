// Central state + persistence (LocalStorage)

const KEY = 'linguaquest.v1';

const defaultState = () => ({
  user: { xp: 0, level: 1, streak: 0, lastStudyDate: null, hearts: 5, dailyGoal: 20, dailyXp: 0, dailyLessons: 0, dailyDate: null, sound: true, reducedMotion: false },
  progress: {}, // langId -> { completedLessons: [], unitStars: {} }
  leitner: {},  // langId -> { wordId: { box, nextReview } }
  badges: [],   // badge ids
  missions: {}, // date -> { id: progress }
  settings: { sound: true }
});

let state = null;

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch (e) { state = null; }
  if (!state) state = defaultState();
  // migrate/ensure
  state.user = { ...defaultState().user, ...state.user };
  state.progress = state.progress || {};
  state.leitner = state.leitner || {};
  state.badges = state.badges || [];
  state.missions = state.missions || {};
  state.settings = { ...defaultState().settings, ...state.settings };
  return state;
}

export function getState() { if (!state) loadState(); return state; }
export function saveState() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

export function resetState() { state = defaultState(); saveState(); return state; }

// Helpers
export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function addXp(amount) {
  const s = getState();
  s.user.xp += amount;
  // level: every 100 xp = level up (simple)
  const newLevel = Math.floor(s.user.xp / 100) + 1;
  const leveled = newLevel > s.user.level;
  s.user.level = newLevel;
  // daily
  const tk = todayKey();
  if (s.user.dailyDate !== tk) { s.user.dailyDate = tk; s.user.dailyXp = 0; s.user.dailyLessons = 0; }
  s.user.dailyXp += amount;
  saveState();
  return { leveled, newLevel };
}

export function updateStreak() {
  const s = getState();
  const tk = todayKey();
  if (s.user.lastStudyDate === tk) return s.user.streak;
  const yest = new Date(); yest.setDate(yest.getDate()-1);
  const yk = `${yest.getFullYear()}-${String(yest.getMonth()+1).padStart(2,'0')}-${String(yest.getDate()).padStart(2,'0')}`;
  if (s.user.lastStudyDate === yk) s.user.streak += 1;
  else s.user.streak = 1;
  s.user.lastStudyDate = tk;
  saveState();
  return s.user.streak;
}

export function recordDailyLesson() {
  const s = getState();
  const tk = todayKey();
  if (s.user.dailyDate !== tk) { s.user.dailyDate = tk; s.user.dailyXp = 0; s.user.dailyLessons = 0; }
  s.user.dailyLessons = (s.user.dailyLessons || 0) + 1;
  saveState();
}

export function setHearts(n) { const s = getState(); s.user.hearts = n; saveState(); }
export function getHearts() { return getState().user.hearts; }

export function langProgress(langId) {
  const s = getState();
  if (!s.progress[langId]) s.progress[langId] = { completedLessons: [], unitStars: {} };
  return s.progress[langId];
}

export function markLessonComplete(langId, lessonId, stars) {
  const p = langProgress(langId);
  if (!p.completedLessons.includes(lessonId)) p.completedLessons.push(lessonId);
  p.unitStars[lessonId] = Math.max(p.unitStars[lessonId] || 0, stars);
  saveState();
}

export function isLessonComplete(langId, lessonId) {
  return langProgress(langId).completedLessons.includes(lessonId);
}

// Leitner
export function getCardState(langId, wordId) {
  const s = getState();
  if (!s.leitner[langId]) s.leitner[langId] = {};
  if (!s.leitner[langId][wordId]) s.leitner[langId][wordId] = { box: 0, nextReview: 0 };
  return s.leitner[langId][wordId];
}

export function reviewCard(langId, wordId, correct) {
  const c = getCardState(langId, wordId);
  const intervals = [0, 1, 3, 7, 14, 30]; // days per box
  if (correct) {
    c.box = Math.min(c.box + 1, 5);
  } else {
    c.box = 0;
  }
  const days = intervals[c.box];
  const next = new Date(); next.setDate(next.getDate() + days);
  c.nextReview = next.getTime();
  saveState();
  return c;
}

export function isDue(langId, wordId) {
  const c = getCardState(langId, wordId);
  return (c.nextReview || 0) <= Date.now();
}

export function unlockBadge(id) {
  const s = getState();
  if (!s.badges.includes(id)) { s.badges.push(id); saveState(); return true; }
  return false;
}

export function hasBadge(id) { return getState().badges.includes(id); }

export function getSettings() { return getState().settings; }
export function setSetting(k, v) { const s = getState(); s.settings[k] = v; if (k === 'sound') s.user.sound = v; saveState(); }