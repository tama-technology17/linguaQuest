// Simple sound effects via Web Audio API (no external files)

let ctx = null;
function getCtx() {
  if (ctx) return ctx;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
  return ctx;
}

function playTone(freqs, dur, type = 'sine', gain = 0.15) {
  const c = getCtx();
  if (!c) return;
  const s = getStateSafe();
  if (s && s.settings && s.settings.sound === false) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const now = c.currentTime;
  freqs.forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0, now + i * 0.08);
    g.gain.linearRampToValueAtTime(gain, now + i * 0.08 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + dur);
    o.connect(g).connect(c.destination);
    o.start(now + i * 0.08);
    o.stop(now + i * 0.08 + dur);
  });
}

function getStateSafe() {
  try { return window.__LQ_STATE__ || null; } catch (e) { return null; }
}

export function setSoundStateRef(ref) { window.__LQ_STATE__ = ref; }

export function soundCorrect() { playTone([523.25, 659.25, 783.99], 0.18, 'triangle', 0.14); }
export function soundWrong() { playTone([220, 180], 0.22, 'sawtooth', 0.12); }
export function soundLevelUp() { playTone([523.25, 659.25, 783.99, 1046.5], 0.2, 'triangle', 0.16); }
export function soundClick() { playTone([440], 0.08, 'sine', 0.08); }
export function soundFlip() { playTone([660], 0.1, 'sine', 0.08); }