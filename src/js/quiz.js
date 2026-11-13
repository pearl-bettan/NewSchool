import { QUESTIONS } from './quiz-data.js';
import { reportHeight, sendMessage } from './activity-bridge.js';
export const PASS_PERCENT = 60;
const PREFIX = { missing: '⚠ לא נבחרה תשובה.', invalid: '⚠ יש לתקן:', correct: '✓ נכון.', partial: '◐ כמעט.', wrong: '✗ לא מדויק.' };
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
    if (new Set(answer).size !== answer.length) return result('invalid', 0, 'בחרו כל משימה פעם אחת בלבד.');
    const points = answer.filter((value, index) => value === question.correct[index]).length / question.correct.length;
    return result(points === 1 ? 'correct' : points > 0 ? 'partial' : 'wrong', points);
  }
  if (question.type === 'goal') {
    const missingField = ['action', 'quantity', 'deadline'].find(field => answer[field] === '' || answer[field] === undefined || answer[field] === null);
    if (missingField) return result('missing', 0, question.feedback.missing, missingField);
    const quantity = Number(answer.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) return result('invalid', 0, 'הזינו כמות שלמה וחיובית של שאלות או עמודים.', 'quantity');
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(answer.deadline)) return result('invalid', 0, 'הזינו שעת סיום תקינה, למשל 19:00.', 'deadline');
    return question.correct.includes(answer.action) ? result('correct', question.maxPoints) : result('partial', question.maxPoints * 2 / 3);
  }
}
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
  if (question.type === 'order') fields = `<div class="order-fields">${[1, 2, 3].map(position => `<div class="order-field"><label for="${question.id}-${position}">מקום ${position}</label><select class="form-select" id="${question.id}-${position}" required aria-describedby="${question.id}-feedback"><option value="">בחרו משימה</option>${options}</select></div>`).join('')}</div>`;
  if (question.type === 'goal') fields = `<p class="form-hint" id="${question.id}-hint">בחרו פעולה מוגדרת. הכמות מתייחסת למספר השאלות או העמודים; בחרו היקף שמתאים למפגש שלכם.</p><div class="order-fields"><div class="order-field"><label for="${question.id}-action">מה עושים?</label><select id="${question.id}-action" data-goal-field="action" class="form-select" required aria-describedby="${question.id}-hint ${question.id}-feedback"><option value="">בחרו פעולה</option>${options}</select></div><div class="order-field"><label for="${question.id}-quantity">כמה שאלות או עמודים?</label><input id="${question.id}-quantity" data-goal-field="quantity" class="form-control" type="number" min="1" step="1" required aria-describedby="${question.id}-hint ${question.id}-feedback"></div><div class="order-field"><label for="${question.id}-deadline">עד איזו שעה?</label><input id="${question.id}-deadline" data-goal-field="deadline" class="form-control" type="time" required aria-describedby="${question.id}-feedback"></div></div>`;
  return `<fieldset id="${question.id}" data-type="${question.type}" class="question-card"><legend>${index + 1}. ${question.prompt} <span class="required-note">(חובה)</span></legend><div class="question-card-body">${fields}<div class="quiz-feedback" id="${question.id}-feedback" aria-live="polite"></div></div></fieldset>`;
}
function renderQuiz() { document.querySelector('#quiz-questions').innerHTML = QUESTIONS.map(renderQuestion).join(''); }
function readAnswer(element) {
  if (element.dataset.type === 'single') return element.querySelector('input:checked')?.value ?? '';
  if (element.dataset.type === 'multi') return [...element.querySelectorAll('input:checked')].map(input => input.value);
  if (element.dataset.type === 'order') return [...element.querySelectorAll('select')].map(input => input.value);
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
function showSummary(score, results) {
  const summary = document.querySelector('#quiz-summary');
  summary.hidden = false;
  const band = score.percent >= 80 ? 'יש לכם בסיס טוב לתוכנית ברורה. קחו את היעד שהרכבתם למפגש הבא.' : score.percent >= 40 ? 'אתם בדרך. עיינו במשוב וחדדו את הצעדים שעדיין לא ברורים.' : 'כדאי לחזור לדוגמאות, ואז לנסות שוב בקצב שלכם.';
  const steps = [...new Set(QUESTIONS.filter((question, index) => results[index].status !== 'correct').map(question => question.step))];
  const labels = { 'step-goal': 'שלב 1: יעד ברור', 'step-split': 'שלב 2: משימות קטנות', 'step-review': 'שלב 3: חזרה ותרגול' };
  const standalone = window.parent === window;
  document.querySelector('#summary-content').innerHTML = `<p class="score-value">${Number(score.points.toFixed(2))} מתוך ${score.maxPoints} · ${score.percent}%</p><p>${score.passed ? `הגעתם לרף ההצלחה (${PASS_PERCENT}%).` : `רף ההצלחה הוא ${PASS_PERCENT}%; אפשר לתקן ולבדוק שוב.`} ${band}</p>${steps.length ? `<p>כדאי לחזור אל:</p><ul>${steps.map(id => `<li><a href="${standalone ? '../index.html' : ''}#${id}" data-revisit="${id}">${labels[id]}</a></li>`).join('')}</ul>` : ''}`;
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

function initializeQuiz() {
  renderQuiz();
  const form = document.querySelector('#quiz-form');
  form.addEventListener('keydown', navigateRadioOptions);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const results = QUESTIONS.map(question => {
      const element = document.getElementById(question.id);
      const result = evaluateQuestion(question, readAnswer(element));
      showFeedback(element, result);
      return result;
    });
    const firstProblem = results.findIndex(result => ['missing', 'invalid'].includes(result.status));
    if (firstProblem !== -1) {
      document.querySelector('#quiz-summary').hidden = true;
      reportHeight();
      const question = document.getElementById(QUESTIONS[firstProblem].id);
      const firstEmptySelect = [...question.querySelectorAll('select')].find(select => !select.value);
      const invalidField = results[firstProblem].field;
      const firstInvalid = invalidField ? question.querySelector(`[data-goal-field="${invalidField}"]`) : null;
      (firstInvalid ?? firstEmptySelect ?? question.querySelector('input,select,textarea')).focus();
      return;
    }
    const score = calculateScore(results);
    showSummary(score, results);
    reportToLms(score);
    sendMessage('quiz-result', score);
    reportHeight();
    sendMessage('scroll-to-frame');
    requestAnimationFrame(() => document.querySelector('#summary-heading').focus());
  });
  form.addEventListener('reset', () => {
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
