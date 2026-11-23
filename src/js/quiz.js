import { QUESTIONS, OPEN_ANSWER_LIMIT, SUSPEND_DATA_LIMIT, OPEN_ANSWER_CONCEPTS, CONCEPT_NOUN_PREFIXES, CONCEPT_VERB_PREFIXES, openAnswerPayload } from './quiz-data.js';
import { reportHeight, sendMessage } from './activity-bridge.js';
export const PASS_PERCENT = 60;
const PREFIX = { missing: '⚠ לא נבחרה תשובה.', invalid: '⚠ יש לתקן:', correct: '✓ נכון.', partial: '◐ תשובה חלקית.', wrong: '✗ לא מדויק.' };

// Check only the requested length and the four explicitly defined concepts.
export function evaluateOpenAnswer(answer) {
  const text = answer.normalize('NFC').replace(/[\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7]/g, '');
  const words = text.trim().split(/\s+/u).filter(word => /[\p{L}\p{N}]/u.test(word)).length;
  const concepts = OPEN_ANSWER_CONCEPTS.filter(concept => {
    const nouns = concept.nouns.flatMap(([noun, adjective]) => CONCEPT_NOUN_PREFIXES.flatMap(prefix => {
      if (!adjective) return [`${prefix}${noun}`];
      const definite = ['ה', 'בה', 'לה', 'מה', 'כה', 'וה', 'ובה', 'ולה', 'ומה', 'וכה'].includes(prefix);
      const impliedArticle = ['ב', 'ל', 'מ', 'כ', 'וב', 'ול', 'ומ', 'וכ'].includes(prefix);
      return [`${prefix}${noun}[\\s־-]+${definite ? 'ה' : impliedArticle ? 'ה?' : ''}${adjective}`];
    }));
    const verbs = (concept.verbs || []).flatMap(verb => CONCEPT_VERB_PREFIXES.map(prefix => `${prefix}${verb}`));
    return new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])(?:${[...nouns, ...verbs].join('|')})(?![\\p{L}\\p{M}\\p{N}])`, 'u').test(text);
  }).length;
  const missing = [];
  if (answer.length > OPEN_ANSWER_LIMIT) missing.push(`לקצר את התשובה ל־2,000 יחידות UTF-16 לכל היותר (כעת ${answer.length})`);
  if (openAnswerPayload(answer).length > SUSPEND_DATA_LIMIT) missing.push('לקצר את התשובה כדי שתתאים למקום הזמין לשמירה');
  if (words < 15) missing.push(`לפחות 15 מילים (כעת ${words})`);
  if (concepts < 2) missing.push(`לפחות שני מושגים שונים מהרשימה (כעת ${concepts})`);
  return { valid: missing.length === 0, words, concepts, message: missing.length ? `יש לתקן: ${missing.join('; ')}.` : 'התשובה כוללת לפחות 15 מילים ושני מושגים שונים.' };
}

export function evaluateQuestion(question, answer) {
  const result = (status, points = 0, message = question.feedback[status], field) => ({ status, points, maxPoints: question.maxPoints, message: `${PREFIX[status]} ${message}`, field });
  if (answer === undefined || answer === null || answer === '' || (Array.isArray(answer) && (!answer.length || answer.some(value => !value)))) return result('missing');
  if (question.type === 'single') return question.correct.includes(answer) ? result('correct', 1) : result('wrong');
  if (question.type === 'multi') {
    const selected = [...new Set(answer)];
    const correct = selected.filter(value => question.correct.includes(value)).length;
    const incorrect = selected.length - correct;
    const points = Math.max(0, (correct - incorrect) / question.correct.length);
    return result(points === 1 ? 'correct' : points > 0 ? 'partial' : 'wrong', points);
  }
  if (question.type === 'order') {
    if (new Set(answer).size !== answer.length) return result('invalid', 0, 'יש לבחור כל משימה פעם אחת בלבד.');
    const points = answer.filter((value, index) => value === question.correct[index]).length / question.correct.length;
    return result(points === 1 ? 'correct' : points > 0 ? 'partial' : 'wrong', points);
  }
  if (question.type === 'goal') {
    const missingField = ['action', 'quantity', 'deadline'].find(field => answer[field] === '' || answer[field] === undefined || answer[field] === null);
    if (missingField) return result('missing', 0, question.feedback.missing, missingField);
    const quantity = Number(answer.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) return result('invalid', 0, 'יש להזין כמות שלמה וחיובית של שאלות או עמודים.', 'quantity');
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(answer.deadline)) return result('invalid', 0, 'יש להזין שעת סיום תקינה, למשל 19:00.', 'deadline');
    return question.correct.includes(answer.action) ? result('correct', question.maxPoints) : result('partial', question.maxPoints * 2 / 3);
  }
}
// Calculate the score from the five graded results; the open answer is excluded.
export function calculateScore(results) {
  const points = results.reduce((sum, result) => sum + result.points, 0);
  const maxPoints = results.reduce((sum, result) => sum + result.maxPoints, 0);
  const percent = maxPoints ? Math.round(points / maxPoints * 100) : 0;
  return { points, maxPoints, percent, passed: maxPoints > 0 && points / maxPoints * 100 >= PASS_PERCENT };
}
export function reportToLms(score) {
  // TODO (stage 2): SCORM reporting hook.
}
function renderQuestion(question, index) {
  const options = question.options.map(option => `<option value="${option.id}">${option.text}</option>`).join('');
  let fields = '';
  if (['single', 'multi'].includes(question.type)) fields = question.options.map(option => `<div class="form-check"><input class="form-check-input" type="${question.type === 'single' ? 'radio' : 'checkbox'}" id="${question.id}-${option.id}" name="${question.id}" value="${option.id}" ${question.type === 'single' ? 'required' : ''} aria-describedby="${question.id}-feedback"><label class="form-check-label" for="${question.id}-${option.id}">${option.text}</label></div>`).join('');
  if (question.type === 'order') fields = `<div class="order-diary"><h3 class="order-diary-title"><span aria-hidden="true">▦</span> יומן הלמידה שלי</h3><div class="order-instructions" id="${question.id}-hint"><p class="order-hint-desktop">אפשר לגרור משימה למיקום המתאים ביומן. כדי להחזיר משימה למאגר, אפשר לגרור אותה חזרה או להשתמש בכפתור ההחזרה.</p><p class="order-hint-mobile">נבחר משימה ונלחץ על המיקום המתאים ביומן. כדי להחזיר משימה למאגר, אפשר להשתמש בכפתור ההחזרה.</p></div><div class="order-layout"><div class="order-bank-panel"><h4>מאגר המשימות</h4><div class="order-cards" data-order-bank role="group" aria-label="מאגר משימות לסידור">${question.options.map(option => `<button type="button" class="order-card" draggable="true" data-order-card="${option.id}" aria-pressed="false" aria-describedby="${question.id}-hint">${option.text}</button>`).join('')}<span data-order-empty hidden>כל המשימות שובצו</span></div><button type="button" class="order-return" data-order-return hidden>החזרה למאגר</button></div><div class="order-plan-panel"><h4>תכנון יום הלמידה</h4><div class="order-fields order-slots" role="group" aria-label="משימות ביומן">${[1, 2, 3].map(position => `<button type="button" class="order-slot" data-order-slot="${position}" data-value="" aria-pressed="false" aria-describedby="${question.id}-hint ${question.id}-feedback"><strong>משימה ${position}</strong><span>פנוי</span></button>`).join('')}</div></div></div></div><p class="visually-hidden" aria-live="polite" data-order-status></p>`;
  if (question.type === 'goal') fields = `<p class="form-hint" id="${question.id}-hint">נבחר פעולה מוגדרת. הכמות מתייחסת למספר השאלות או העמודים; נבחר היקף שמתאים למפגש הלמידה.</p><div class="order-fields"><div class="order-field"><label for="${question.id}-action">מה עושים?</label><select id="${question.id}-action" data-goal-field="action" class="form-select" required aria-describedby="${question.id}-hint ${question.id}-feedback"><option value="">בחירת פעולה</option>${options}</select></div><div class="order-field"><label for="${question.id}-quantity">כמה שאלות או עמודים?</label><input id="${question.id}-quantity" data-goal-field="quantity" class="form-control" type="number" min="1" step="1" required aria-describedby="${question.id}-hint ${question.id}-feedback"></div><div class="order-field"><label for="${question.id}-deadline">עד איזו שעה?</label><div class="time-picker" data-time-picker><input id="${question.id}-deadline" data-goal-field="deadline" class="form-control time-picker-input" type="text" readonly placeholder="--:--" dir="ltr" inputmode="none" autocomplete="off" required aria-haspopup="listbox" aria-expanded="false" aria-describedby="${question.id}-feedback"><div class="time-picker-panel" dir="ltr" hidden><div class="time-picker-column" role="listbox" tabindex="-1" aria-label="שעות" data-time-unit="hour"></div><div class="time-picker-column" role="listbox" tabindex="-1" aria-label="דקות" data-time-unit="minute"></div></div></div></div></div>`;
  return `<fieldset id="${question.id}" data-type="${question.type}" class="question-card"><legend>${index + 1}. ${question.prompt} <span class="required-note">(חובה)</span></legend><div class="question-card-body">${fields}<div class="quiz-feedback" id="${question.id}-feedback" aria-live="polite"></div></div></fieldset>`;
}
function renderQuiz() { document.querySelector('#quiz-questions').innerHTML = QUESTIONS.map(renderQuestion).join(''); }
function readAnswer(element) {
  if (element.dataset.type === 'single') return element.querySelector('input:checked')?.value ?? '';
  if (element.dataset.type === 'multi') return [...element.querySelectorAll('input:checked')].map(input => input.value);
  if (element.dataset.type === 'order') return [...element.querySelectorAll('[data-order-slot]')].map(slot => slot.dataset.value);
  if (element.dataset.type === 'goal') return Object.fromEntries(
    [...element.querySelectorAll('[data-goal-field]')].map(input => [input.dataset.goalField,
      input.validity.badInput ? 'invalid' : input.value.trim()])
  );
}
function showFeedback(element, result) {
  const feedback = element.querySelector('.quiz-feedback');
  feedback.className = `quiz-feedback feedback-${result.status}`;
  feedback.textContent = result.message;
  element.querySelectorAll('input,select,textarea').forEach(input => {
    if (['missing', 'invalid'].includes(result.status) && (!result.field || input.dataset.goalField === result.field)) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  });
}
function improvementTip(results, answers) {
  const lost = index => results[index].maxPoints - results[index].points;
  const areas = [
    { loss: lost(0) + lost(4), tip: 'כדאי לתרגל ניסוח יעד שכולל פעולה מוגדרת, כמות ושעת סיום.' },
    { loss: lost(1) + lost(2), tip: answers[1].includes('c')
      ? 'כדאי לפרוס את ההכנה על פני הימים ולהשאיר זמן לחזרה ולתרגול במקום לדחות הכול ללילה האחרון.'
      : 'כדאי לתכנן חזרה קצרה על החומר הקודם, למידה ותרגול, ולבדוק טעויות.' },
    { loss: lost(3), tip: 'כדאי לחלק נושא רחב למשימות קטנות עם פעולה והיקף שמבהירים מתי כל משימה מסתיימת.' }
  ];
  const focus = areas.reduce((best, area) => area.loss > best.loss ? area : best);
  return focus.loss > 0 ? focus.tip : 'כדאי ליישם את העקרונות בתכנון מפגש הלמידה הבא ולבדוק לאחריו מה עזר להתקדם.';
}
function showSummary(score, results, openResult, answers) {
  const summary = document.querySelector('#quiz-summary');
  const content = document.querySelector('#summary-content');
  const incomplete = !openResult.valid || results.some(result => ['missing', 'invalid'].includes(result.status));
  summary.hidden = false;
  content.replaceChildren();
  function addText(tag, text, className) {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    content.append(element);
    return element;
  }
  if (incomplete) {
    addText('p', 'הבוחן עדיין לא הושלם. כדאי לעיין במשוב שליד השאלות, להשלים או לתקן את התשובות ולבדוק שוב.');
    return;
  }
  addText('p', `ציון סופי: ${score.percent}`, 'score-value');
  addText('p', `רף המעבר: ${PASS_PERCENT} מתוך 100`);
  const performance = score.percent === 100 ? 'כל התשובות המדורגות נכונות — ניכרת הבנה של עקרונות תכנון הלמידה.'
    : score.passed ? 'רף המעבר הושג. התשובות מצביעות על בסיס טוב, ויש מקום לחזק חלק מהעקרונות.'
    : 'תמיד אפשר לנסות שוב! שווה לעבור על עקרונות הלמידה פעם נוספת לפני ניסיון חוזר.';
  addText('p', performance);
  addText('h3', 'טיפ להמשך');
  addText('p', improvementTip(results, answers));
}
function navigateRadioOptions(event) {
  if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
  const radio = event.target.closest('input[type="radio"]');
  if (!radio) return;

  const options = [...radio.closest('fieldset').querySelectorAll('input[type="radio"]:not(:disabled)')];
  const nextIndex = options.indexOf(radio) + (event.shiftKey ? -1 : 1);
  const nextOption = options[nextIndex];
  if (!nextOption) return;

  event.preventDefault();
  nextOption.focus();
}

// Keep one ordering state for drag, touch, and keyboard interactions.
function initializeOrdering(form) {
  const question = document.querySelector('#q3');
  const cards = [...question.querySelectorAll('[data-order-card]')];
  const slots = [...question.querySelectorAll('[data-order-slot]')];
  const bank = question.querySelector('[data-order-bank]');
  const empty = question.querySelector('[data-order-empty]');
  const returnButton = question.querySelector('[data-order-return]');
  const status = question.querySelector('[data-order-status]');
  let selected = '';
  let touch = null;
  let suppressClick = false;

  function select(value) {
    selected = value;
    cards.forEach(card => card.setAttribute('aria-pressed', String(card.dataset.orderCard === value)));
    slots.forEach(slot => slot.setAttribute('aria-pressed', String(Boolean(value) && slot.dataset.value === value)));
    returnButton.hidden = !value || !slots.some(slot => slot.dataset.value === value);
    if (value) status.textContent = `נבחרה המשימה ${cards.find(card => card.dataset.orderCard === value).textContent}. יש לבחור מקום.`;
  }
  function refresh() {
    cards.forEach(card => { card.hidden = slots.some(slot => slot.dataset.value === card.dataset.orderCard); });
    empty.hidden = cards.some(card => !card.hidden);
    slots.forEach(item => {
      const assigned = cards.find(option => option.dataset.orderCard === item.dataset.value);
      item.querySelector('span').textContent = assigned ? assigned.textContent : 'פנוי';
      item.draggable = Boolean(assigned);
    });
  }
  function place(value, slot) {
    const card = cards.find(item => item.dataset.orderCard === value);
    if (!card || (slot && !slots.includes(slot))) return;
    const previous = slots.find(item => item.dataset.value === value);
    const alreadyHere = slot && previous === slot;
    if (previous) previous.dataset.value = '';
    if (slot && !alreadyHere) slot.dataset.value = value;
    refresh();
    select('');
    status.textContent = !slot || alreadyHere ? `המשימה ${card.textContent} הוחזרה למאגר.` :
      `המשימה ${card.textContent} הוצבה במקום ${slot.dataset.orderSlot}.`;
    form.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function attachDrag(element, valueOf) {
    element.addEventListener('dragstart', event => {
      const value = valueOf();
      if (!value) { event.preventDefault(); return; }
      event.dataTransfer.setData('text/plain', value);
      event.dataTransfer.effectAllowed = 'move';
    });
    element.addEventListener('pointerdown', event => {
      const value = valueOf();
      if (event.pointerType !== 'touch' || !value) return;
      touch = { id: event.pointerId, x: event.clientX, y: event.clientY, value, ghost: null };
      element.setPointerCapture(event.pointerId);
    });
    element.addEventListener('pointermove', event => {
      if (!touch || touch.id !== event.pointerId) return;
      if (!touch.ghost && Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > 8) {
        touch.ghost = document.createElement('div');
        touch.ghost.className = 'order-drag-preview';
        touch.ghost.textContent = cards.find(card => card.dataset.orderCard === touch.value).textContent;
        touch.ghost.setAttribute('aria-hidden', 'true');
        document.body.append(touch.ghost);
      }
      if (touch.ghost) {
        touch.ghost.style.left = `${event.clientX}px`;
        touch.ghost.style.top = `${event.clientY}px`;
      }
    });
    const finishTouch = (event, cancelled) => {
      if (!touch || touch.id !== event.pointerId) return;
      if (touch.ghost) {
        touch.ghost.remove();
        const target = document.elementFromPoint(event.clientX, event.clientY);
        const slot = target?.closest('[data-order-slot]');
        if (!cancelled && slots.includes(slot)) place(touch.value, slot);
        else if (!cancelled && target?.closest('[data-order-bank]')) place(touch.value, null);
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 0);
      }
      touch = null;
    };
    element.addEventListener('pointerup', event => finishTouch(event, false));
    element.addEventListener('pointercancel', event => finishTouch(event, true));
  }
  cards.forEach(card => {
    card.addEventListener('click', () => {
      if (suppressClick) { suppressClick = false; return; }
      select(card.dataset.orderCard);
    });
    attachDrag(card, () => card.dataset.orderCard);
  });
  slots.forEach(slot => {
    attachDrag(slot, () => slot.dataset.value);
    slot.addEventListener('click', () => {
      if (suppressClick) { suppressClick = false; return; }
      if (selected) place(selected, slot);
      else if (slot.dataset.value) select(slot.dataset.value);
      else status.textContent = 'יש לבחור תחילה משימה, ואז את המקום הרצוי.';
    });
    slot.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; });
    slot.addEventListener('drop', event => {
      event.preventDefault();
      place(event.dataTransfer.getData('text/plain'), slot);
    });
  });
  returnButton.addEventListener('click', () => { if (selected) place(selected, null); });
  bank.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; });
  bank.addEventListener('drop', event => { event.preventDefault(); place(event.dataTransfer.getData('text/plain'), null); });
  form.addEventListener('reset', () => {
    select('');
    slots.forEach(slot => { slot.dataset.value = ''; slot.querySelector('span').textContent = 'פנוי'; });
    refresh();
    status.textContent = '';
  });
}

function initializeQuiz() {
  renderQuiz();
  const form = document.querySelector('#quiz-form');
  initializeOrdering(form);
  const openAnswer = document.querySelector('#q6-answer');
  const openFeedback = document.querySelector('#q6-feedback');
  function showOpenFeedback(result) {
    const messageChanged = openFeedback.textContent !== result.message;
    openFeedback.className = `quiz-feedback feedback-${result.valid ? 'correct' : 'invalid'}`;
    openFeedback.textContent = result.message;
    if (result.valid) openAnswer.removeAttribute('aria-invalid');
    else openAnswer.setAttribute('aria-invalid', 'true');
    if (messageChanged) reportHeight();
  }
  form.addEventListener('keydown', navigateRadioOptions);
  const invalidateCheckedAnswers = () => sendMessage('quiz-invalidated');
  const updateAvailability = () => {
    invalidateCheckedAnswers();
    const answers = QUESTIONS.map(question => readAnswer(document.getElementById(question.id)));
    const complete = evaluateOpenAnswer(openAnswer.value).valid && answers.every(answer => {
      if (Array.isArray(answer)) return answer.length > 0 && answer.every(Boolean);
      if (answer && typeof answer === 'object') return Object.values(answer).every(Boolean);
      return Boolean(answer);
    });
    sendMessage('quiz-availability', { complete });
    if (complete) {
      const results = QUESTIONS.map((question, index) => evaluateQuestion(question, answers[index]));
      sendMessage('quiz-snapshot', {
        score: calculateScore(results),
        openAnswer: openAnswer.value,
        interactions: QUESTIONS.map((question, index) => ({
          id: question.id, type: question.type, answer: answers[index],
          status: results[index].status, points: results[index].points
        }))
      });
    }
  };
  form.addEventListener('input', event => {
    if (event.target === openAnswer) showOpenFeedback(evaluateOpenAnswer(openAnswer.value));
    updateAvailability();
  });
  form.addEventListener('change', event => {
    if (event.target === openAnswer) showOpenFeedback(evaluateOpenAnswer(openAnswer.value));
    updateAvailability();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    // Checking must refresh the same submission data as editing an answer.
    updateAvailability();
    const answers = QUESTIONS.map(question => readAnswer(document.getElementById(question.id)));
    const results = QUESTIONS.map((question, index) => {
      const element = document.getElementById(question.id);
      const result = evaluateQuestion(question, answers[index]);
      return result;
    });
    const openResult = evaluateOpenAnswer(openAnswer.value);
    showOpenFeedback(openResult);
    const incomplete = !openResult.valid || results.some(result => ['missing', 'invalid'].includes(result.status));
    results.forEach((result, index) => {
      const element = document.getElementById(QUESTIONS[index].id);
      showFeedback(element, result);
    });
    const score = incomplete ? null : calculateScore(results);
    showSummary(score, results, openResult, answers);
    if (incomplete) {
      reportHeight();
      requestAnimationFrame(() => {
        const heading = document.querySelector('#summary-heading');
        heading.focus({ preventScroll: true });
        heading.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
      return;
    }
    reportToLms(score);
    sendMessage('quiz-result', { ...score, interactions: QUESTIONS.map((question, index) => ({
      id: question.id, type: question.type, answer: answers[index], status: results[index].status, points: results[index].points
    })) });
    reportHeight();
    requestAnimationFrame(() => {
      const heading = document.querySelector('#summary-heading');
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  });
  form.addEventListener('reset', () => {
    invalidateCheckedAnswers();
    sendMessage('quiz-availability', { complete: false });
    document.querySelectorAll('.quiz-feedback').forEach(element => { element.textContent = ''; element.className = 'quiz-feedback'; });
    form.querySelectorAll('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
    document.querySelector('#quiz-summary').hidden = true;
    requestAnimationFrame(() => { reportHeight(); form.querySelector('input').focus(); });
  });
  document.querySelector('#summary-content').addEventListener('click', event => {
    const link = event.target.closest('[data-revisit]');
    if (link && window.parent !== window) { event.preventDefault(); sendMessage('revisit', { id: link.dataset.revisit }); }
  });
  reportHeight();
}
if (typeof document !== 'undefined' && document.querySelector('#quiz-form')) initializeQuiz();
