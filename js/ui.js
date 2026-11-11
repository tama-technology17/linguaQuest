// UI helpers: rendering, icons, mascot, confetti, modal, toast

import { getState } from './state.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const MASCOT_ICON = {
  idle: 'face-smile',
  happy: 'face-grin-stars',
  sad: 'face-sad-tear',
  cheer: 'face-grin-hearts',
};

export function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined) e.setAttribute(k, v);
  }
  const arr = Array.isArray(children) ? children : [children];
  for (const c of arr) {
    if (c === null || c === undefined) continue;
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else e.appendChild(c);
  }
  return e;
}

// Font Awesome helpers — always use the library, never hand-drawn icons.
export function iHTML(name, extra = '') {
  return `<i class="fa-solid fa-${name} ${extra}" aria-hidden="true"></i>`;
}

export function icon(name, extra = '') {
  const i = document.createElement('i');
  i.className = `fa-solid fa-${name} ${extra}`.trim();
  i.setAttribute('aria-hidden', 'true');
  return i;
}

export function btn(className, label, iconName, onClick, opts = {}) {
  const b = el('button', { class: className, onclick: onClick, ...(opts.attrs || {}) });
  if (iconName) b.appendChild(icon(iconName));
  if (label) b.appendChild(el('span', {}, label));
  if (label && !b.getAttribute('aria-label')) b.setAttribute('aria-label', label);
  return b;
}

// Brand mark. This is the one hand-authored SVG in the app (a logo, not an icon);
// everything iconographic still comes from Font Awesome.
export function logoMark(className = 'brand-mark') {
  const img = el('img', {
    class: className,
    src: 'assets/logo.svg',
    alt: '',
    width: '26',
    height: '26',
    'aria-hidden': 'true',
    decoding: 'async',
  });
  return img;
}

export function renderMascot(container, mood = 'idle') {
  container.innerHTML = '';
  const m = el('div', {
    class: `mascot ${mood}`,
    role: 'img',
    'aria-label': `Maskot Lingua, ${mood === 'sad' ? 'menyemangati' : mood === 'happy' || mood === 'cheer' ? 'senang' : 'siap belajar'}`,
  });
  m.innerHTML = iHTML(MASCOT_ICON[mood] || MASCOT_ICON.idle);
  container.appendChild(m);
  // retrigger animation
  m.classList.remove(mood);
  void m.offsetWidth;
  m.classList.add(mood);
}

export function confetti(container = document.body, count = 40) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const wrap = el('div', { class: 'confetti' });
  const colors = ['#E74C3C', '#F4B93B', '#2E7D6B', '#F4C430', '#FF8A6B', '#6EC6FF'];
  for (let i = 0; i < count; i++) {
    const sp = el('span');
    sp.style.left = Math.random() * 100 + 'vw';
    sp.style.background = colors[Math.floor(Math.random() * colors.length)];
    sp.style.animationDelay = (Math.random() * 0.3) + 's';
    sp.style.transform = `rotate(${Math.random()*360}deg)`;
    wrap.appendChild(sp);
  }
  container.appendChild(wrap);
  setTimeout(() => wrap.remove(), 1400);
}

export function feedback(text, ok = true) {
  const wrap = el('div', { class: 'feedback' });
  const b = el('div', { class: `badge ${ok ? 'ok' : 'no'}` });
  b.innerHTML = `${iHTML(ok ? 'circle-check' : 'circle-xmark')}<span>${text}</span>`;
  wrap.appendChild(b);
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 900);
}

export function toast(msg, iconName = 'circle-check') {
  const t = el('div', { class: 'toast' });
  t.innerHTML = `${iHTML(iconName)}<span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2400);
}

export function floatXp(amount, anchor) {
  if (!amount || amount <= 0) return;
  const f = el('div', { class: 'xp-float' }, `+${amount} XP`);
  const rect = anchor ? anchor.getBoundingClientRect() : null;
  f.style.left = rect ? `${rect.left + rect.width / 2}px` : '50%';
  f.style.top = rect ? `${rect.top}px` : '40%';
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 1100);
}

export function countUp(node, target, { duration = 650, suffix = '', prefix = '' } = {}) {
  if (
    typeof requestAnimationFrame !== 'function' ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  ) {
    node.textContent = prefix + target + suffix;
    return;
  }
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    node.textContent = prefix + Math.round(target * eased) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export function modal({ title, body, actions = [] }) {
  const backdrop = el('div', { class: 'modal-backdrop' });
  const m = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
  m.appendChild(el('h2', {}, title));
  if (body) m.appendChild(typeof body === 'string' ? el('p', { class: 'small' }, body) : body);
  const act = el('div', { class: 'actions' });
  for (const a of actions) {
    const b = el('button', { class: a.class || 'btn btn-secondary', onclick: () => { backdrop.remove(); if (a.onClick) a.onClick(); } });
    if (a.icon) b.appendChild(icon(a.icon));
    if (a.label) b.appendChild(el('span', {}, a.label));
    act.appendChild(b);
  }
  m.appendChild(act);
  backdrop.appendChild(m);
  document.body.appendChild(backdrop);
  return backdrop;
}

export function setLangAccent(lang) {
  const root = document.documentElement;
  root.style.setProperty('--lang-accent', lang.accent);
  root.style.setProperty('--lang-accent-soft', lang.accentSoft);
}

// Small metadata for the exercise type ribbon.
export const EXERCISE_META = {
  flashcard: { icon: 'clone', label: 'Flashcard' },
  mcq: { icon: 'circle-question', label: 'Pilihan ganda' },
  memory: { icon: 'brain', label: 'Cocokkan pasangan' },
  builder: { icon: 'puzzle-piece', label: 'Susun kalimat' },
  listen: { icon: 'volume-high', label: 'Latihan mendengar' },
  speed: { icon: 'stopwatch', label: 'Speed round' },
};
