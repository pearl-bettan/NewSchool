// Easter egg: typing the secret word "newschool" anywhere on the page (not inside a text
// field) scatters sticky notes with study tips. It works with any keyboard layout (it reads
// the physical keys, so Hebrew layout works too) and also while focus is inside the
// activity frames (they forward the word through activity-bridge.js).
const SECRET = 'newschool';
const TIPS = [
  'יעד טוב = מה + כמה + עד מתי',
  'משימה קטנה עדיפה על "ללמוד הכול"',
  'חזרה קצרה בתחילת כל מפגש',
  'תרגול בשאלות מראה מה באמת הבנתי',
  'הפסקה קצרה היא חלק מהתוכנית',
  'את היום האחרון משאירים קל',
  'שינה טובה = זיכרון טוב',
  'מה נשאר בזיכרון מאתמול?',
];
const COLORS = ['#fff3a8', '#ffd6e0', '#cdeffd', '#d4f5c9', '#ffe1b8'];
const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function watchSecretWord(onFound) {
  let typed = '';
  let lastKeyTime = 0;
  document.addEventListener('keydown', event => {
    const target = event.target;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (target.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return;
    const letter = /^Key([A-Z])$/.exec(event.code)?.[1]?.toLowerCase();
    if (!letter) return;
    if (event.timeStamp - lastKeyTime > 2000) typed = ''; // the word must be typed in one go
    lastKeyTime = event.timeStamp;
    typed = (typed + letter).slice(-SECRET.length);
    if (typed === SECRET) { typed = ''; onFound(); }
  });
}

let layer = null;
let hideTimer = 0;
function hideNotes() {
  clearTimeout(hideTimer);
  if (!layer) return;
  const current = layer;
  layer = null;
  current.classList.add('is-leaving');
  setTimeout(() => current.remove(), prefersReducedMotion() ? 0 : 400);
}
export function showStickyNotes() {
  if (layer) hideNotes();
  layer = document.createElement('div');
  layer.className = 'sticky-notes';
  const status = document.createElement('p');
  status.className = 'visually-hidden';
  status.setAttribute('role', 'status');
  layer.append(status);
  const count = innerWidth < 600 ? 4 : TIPS.length;
  const columns = innerWidth < 600 ? 2 : 4;
  const rows = Math.ceil(count / columns);
  const tips = [...TIPS].sort(() => Math.random() - 0.5).slice(0, count);
  tips.forEach((tip, index) => {
    const note = document.createElement('button');
    note.type = 'button';
    note.className = 'sticky-note';
    note.textContent = tip;
    note.setAttribute('aria-label', `${tip} (סגירת הפתקים)`);
    const cellX = (index % columns) / columns;
    const cellY = Math.floor(index / columns) / rows;
    note.style.setProperty('--x', `${(cellX + Math.random() * 0.4 / columns) * 100}vw`);
    note.style.setProperty('--y', `${(cellY + Math.random() * 0.35 / rows) * 100 + 4}vh`);
    note.style.setProperty('--rotate', `${(Math.random() * 14 - 7).toFixed(1)}deg`);
    note.style.setProperty('--delay', `${index * 70}ms`);
    note.style.setProperty('--note-color', COLORS[index % COLORS.length]);
    note.addEventListener('click', hideNotes);
    layer.append(note);
  });
  document.body.append(layer);
  // Announce after insertion so screen readers read it.
  requestAnimationFrame(() => { status.textContent = 'מצאת את המילה הסודית! הנה כמה טיפים ללמידה. אפשר ללחוץ על פתק או על Escape כדי לסגור.'; });
  hideTimer = setTimeout(hideNotes, 9000);
}
// Main page: listen here and for the word typed inside the activity frames.
// (Guarded so modules that import this file still load outside a browser.)
if (typeof window !== 'undefined' && window.parent === window) {
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && layer) hideNotes(); });
  watchSecretWord(showStickyNotes);
  window.addEventListener('message', event => {
    if (window.location.origin === 'null' || event.origin !== window.location.origin) return;
    if (event.data?.source === 'school-new-activity' && event.data.type === 'secret-word') showStickyNotes();
  });
}
