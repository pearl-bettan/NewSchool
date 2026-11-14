import { reportHeight } from './activity-bridge.js';
export const BLOCK_TYPES = {
  learn: { label: 'למידה', icon: '📖', cssClass: 'block--learn' },
  review: { label: 'חזרה', icon: '🔁', cssClass: 'block--review' },
  practice: { label: 'תרגול', icon: '✏️', cssClass: 'block--practice' }
};
export const STUDY_PLAN = [
  { day: 1, label: 'יום 1', blocks: [
    { id: 'd1-b1', type: 'learn', topic: 'נושא א', task: 'קריאת סיכום וסימון מושגים', minutes: 30, why: 'מתחילים בנושא הכבד ביותר כשהריכוז גבוה. המשימה מוגדרת, ולכן קל להתחיל.' },
    { id: 'd1-b2', type: 'practice', topic: 'נושא א', task: 'פתרון 5 שאלות', minutes: 20, why: 'תרגול מיד אחרי הלמידה מראה מה הובן ומה כדאי לחזק.' }
  ] },
  { day: 2, label: 'יום 2', blocks: [
    { id: 'd2-b1', type: 'review', topic: 'נושא א', task: 'חזרה קצרה על המושגים', minutes: 15, why: 'פותחים בחומר מאתמול כדי לחזק את הזיכרון לפני שממשיכים.' },
    { id: 'd2-b2', type: 'learn', topic: 'נושא ב', task: 'קריאה ומיפוי הרעיונות', minutes: 30, why: 'לומדים נושא חדש אחרי חזרה קצרה, בחלון זמן ממוקד.' },
    { id: 'd2-b3', type: 'practice', topic: 'נושא ב', task: 'פתרון 5 שאלות', minutes: 20, why: 'אחרי הלמידה בודקים הבנה בשאלות, במקום להסתפק בקריאה.' }
  ] },
  { day: 3, label: 'יום 3', blocks: [
    { id: 'd3-b1', type: 'review', topic: 'נושאים א + ב', task: 'חזרה על המושגים מאתמול', minutes: 5, why: 'גם ביום האחרון פותחים בחזרה קצרה. מתמקדים במה שעדיין קשה.' },
    { id: 'd3-b2', type: 'learn', topic: 'נושא ג', task: 'למידה ממוקדת של הנושא הקל', minutes: 15, why: 'בדוגמה נושא ג קצר וקל יותר. כך נשאר יום אחרון קל יחסית.' },
    { id: 'd3-b3', type: 'practice', topic: 'נושאים א + ב + ג', task: 'שאלות מעורבות ובדיקת טעויות', minutes: 15, why: 'שאלות מכל הנושאים מדמות את הבוחן. בדיקת הטעויות היא גם חזרה מסכמת.' }
  ] }
];
function renderBlock(block) {
  const type = BLOCK_TYPES[block.type];
  return `<div class="accordion-item ${type.cssClass}"><h3 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${block.id}" aria-expanded="false" aria-controls="${block.id}"><span class="block-copy"><span class="block-type"><span aria-hidden="true">${type.icon}</span> ${type.label}</span><strong>${block.topic}</strong><span class="block-task">${block.task}</span><span class="block-minutes">${block.minutes} דקות · פתחו להסבר</span></span></button></h3><div id="${block.id}" class="accordion-collapse collapse"><div class="accordion-body"><strong>למה?</strong> ${block.why}</div></div></div>`;
}
function renderDay(day) {
  const minutes = day.blocks.reduce((sum, block) => sum + block.minutes, 0);
  return `<div class="col-12 col-lg-4"><article class="plan-day" aria-labelledby="day-title-${day.day}"><div class="day-heading"><h2 id="day-title-${day.day}">${day.label}</h2><span>${minutes} דקות בסך הכול</span></div><div class="accordion" id="day-${day.day}">${day.blocks.map(renderBlock).join('')}</div></article></div>`;
}
const studyPlan = document.querySelector('#study-plan');
studyPlan.innerHTML = STUDY_PLAN.map(renderDay).join('');

let pendingButton = null;

function openFocusedBlock() {
  const button = pendingButton;
  if (!button || document.activeElement !== button || !button.matches(':focus-visible')) return;

  const panel = document.getElementById(button.getAttribute('aria-controls'));
  bootstrap.Collapse.getOrCreateInstance(panel, { toggle: false }).show();
  if (panel.classList.contains('show')) pendingButton = null;
}

studyPlan.addEventListener('focusin', event => {
  const button = event.target.closest('.accordion-button');
  if (!button || !button.matches(':focus-visible')) return;
  pendingButton = button;
  openFocusedBlock();
});

studyPlan.addEventListener('focusout', event => {
  const button = event.target.closest('.accordion-button');
  if (!button) return;
  if (pendingButton === button) pendingButton = null;
});

studyPlan.addEventListener('shown.bs.collapse', openFocusedBlock);
studyPlan.addEventListener('hidden.bs.collapse', openFocusedBlock);
studyPlan.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') pendingButton = null;
});
studyPlan.addEventListener('pointerdown', () => { pendingButton = null; });

reportHeight();
