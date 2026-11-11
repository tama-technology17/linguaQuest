# AGENTS.md

## Project
LinguaQuest: vanilla JS language-learning game (HTML/CSS/ES Modules, no build step, no framework). All UI text is Indonesian. Runs via any static server.

## Run
- `python3 -m http.server 8080` (or `npx serve .`), then open http://localhost:8080
- Must be served over HTTP, not `file://` (ES Modules).
- No tests/lint/build configured; verify with `node --check js/*.js data/*.js` and a jsdom smoke test.

## Structure
- `index.html` → `js/app.js` (router/views). State in `js/state.js` (LocalStorage key `linguaquest.v1`).
- `js/lessons.js` builds sessions; `js/exercises.js` renders the 6 exercise types.
- `data/languages.js` registers 8 languages; each `data/<lang>.js` holds units/lessons/items.
- Per-language accent color set in data file (`accent`/`accentSoft`) and applied via `--lang-accent`.

## Conventions
- Item shape: `{ t, r, m, e }` (target, romanization, Indonesian meaning, emoji). Non-Latin languages populate `r`; Latin ones set `r: null`.
- Word identity for Leitner: `${lesson.id}::${itemIndex}`.
- Adding a language: create `data/<id>.js`, import/register in `data/languages.js`; no other wiring needed.
- Adding content: append units/lessons/items in the data file; keep ≥5 units, ≥10 items/lesson.
- Icons: Font Awesome 6 Free, vendored at `vendor/fontawesome/` and linked in `index.html`. Use `ui.icon(name)` / `ui.iHTML(name)` and `ui.btn(cls, label, icon, handler)`; never hand-draw SVG icons or use emoji as the only icon. Emoji is allowed only for exercise picture content.
- The single hand-authored SVG is the brand logo at `assets/logo.svg` (favicon). Icons remain Font Awesome.
- Visual assets are vendored under `vendor/` (fonts + Font Awesome); do not add external icon/font CDNs so the app works offline / on Termux.
- Motion: CSS keyframes are gated by `prefers-reduced-motion`; JS checks it before confetti/count-up. Keep animations short and user-triggered; no endless decorative loops.

## Gotchas
- `locked` lesson state is derived from previous lesson completion in `renderLanguage`; compute before creating the node.
- `speechSynthesis` may be unavailable; `exercises.js` degrades gracefully.
- Reduced motion: CSS disables animations; `audio.js` and `ui.confetti` also check `matchMedia`.
- Hearts reset to 5 only on session finish; mid-lesson exit leaves reduced hearts.