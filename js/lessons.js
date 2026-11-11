import { getLanguage } from '../data/languages.js';
import { isDue, getCardState } from './state.js';

function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pick(arr, n) { return shuffle(arr).slice(0, n); }

export function buildSession(langId, lesson, opts = {}) {
  const lang = getLanguage(langId);
  const items = lesson.items || [];
  const phrases = lesson.phrases || [];
  const exercises = [];

  // Leitner: prioritize due cards
  const dueItems = items.filter(it => isDue(langId, `${lesson.id}-${items.indexOf(it)}`));
  // We'll key wordId by item index within lesson: `${lesson.id}::${i}`
  const itemKey = (i) => `${lesson.id}::${i}`;

  // helper to make mcq options
  function mcqOptions(correctMeaning, allMeanings) {
    const distractors = shuffle(allMeanings.filter(m => m !== correctMeaning)).slice(0, 3);
    return shuffle([correctMeaning, ...distractors]);
  }
  const allMeanings = items.map(it => it.m);
  const allTargets = items.map(it => it.t);

  // Flashcards: 2
  for (const it of pick(items, 2)) {
    const i = items.indexOf(it);
    exercises.push({ type: 'flashcard', wordId: itemKey(i), target: it.t, roman: it.r, meaning: it.m, emoji: it.e });
  }

  // MCQ target -> meaning: 2
  for (const it of pick(items, 2)) {
    const i = items.indexOf(it);
    exercises.push({
      type: 'mcq', wordId: itemKey(i), direction: 'tm',
      prompt: 'Apa arti dari kata ini?',
      target: it.t, roman: it.r, meaning: it.m, emoji: it.e,
      options: mcqOptions(it.m, allMeanings), answer: it.m,
    });
  }

  // MCQ meaning -> target: 1
  {
    const it = pick(items, 1)[0];
    const i = items.indexOf(it);
    exercises.push({
      type: 'mcq', wordId: itemKey(i), direction: 'mt',
      prompt: 'Pilih kata yang tepat untuk arti ini:',
      target: it.t, roman: it.r, meaning: it.m, emoji: it.e,
      question: it.m,
      options: mcqOptions(it.t, allTargets), answer: it.t,
    });
  }

  // Memory match: 4 pairs. Prefer short entries so tiles stay readable.
  {
    const short = items.filter(it => it.m.length <= 24 && it.t.length <= 20);
    const pool = short.length >= 4 ? short : items;
    const chosen = pick(pool, 4);
    const pairs = chosen.map((it, idx) => ({ id: idx, a: it.t, b: it.m, item: it }));
    exercises.push({ type: 'memory', pairs });
  }

  // Builder
  {
    let phrase = phrases.length ? phrases[0] : null;
    if (!phrase) {
      // build simple phrase from 3 items
      const chosen = pick(items, 3);
      phrase = { t: chosen.map(c => c.t).join(' '), m: chosen.map(c => c.m).join(' ') };
    }
    let words = phrase.t.split(/\s+/).filter(Boolean);
    // CJK sentences often have no spaces; use character tiles but keep Latin runs whole.
    if (words.length < 2) {
      words = (phrase.t.match(/[A-Za-z0-9]+|\S/g) || [phrase.t]);
    }
    exercises.push({ type: 'builder', target: phrase.t, meaning: phrase.m, words: shuffle([...words]), answer: words });
  }

  // Listen & choose: 1
  {
    const it = pick(items, 1)[0];
    const i = items.indexOf(it);
    exercises.push({
      type: 'listen', wordId: itemKey(i),
      prompt: 'Dengarkan, lalu pilih yang benar',
      target: it.t, roman: it.r, meaning: it.m, emoji: it.e,
      options: mcqOptions(it.m, allMeanings), answer: it.m,
    });
  }

  // Speed round: if forced or append as final exercise with 5 rapid questions
  {
    const qs = pick(items, 5).map(it => {
      const i = items.indexOf(it);
      return {
        wordId: itemKey(i),
        target: it.t, roman: it.r, meaning: it.m,
        options: mcqOptions(it.m, allMeanings), answer: it.m,
      };
    });
    exercises.push({ type: 'speed', questions: qs });
  }

  // If forced type, filter to only that type? Simpler: if forceType speed, keep only speed
  let finalExercises = exercises;
  if (opts.forceType === 'speed') {
    finalExercises = exercises.filter(e => e.type === 'speed');
  }

  return {
    langId,
    lesson,
    exercises: finalExercises,
    index: 0,
    correct: 0,
    wrong: 0,
    xp: 0,
  };
}