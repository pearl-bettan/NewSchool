import { OPEN_ANSWER_LIMIT, SUSPEND_DATA_LIMIT, openAnswerPayload } from './quiz-data.js';

// The main page owns the LMS session; embedded activities do not open their own.
const greeting = document.getElementById('learner-greeting');
const notice = document.getElementById('scorm-notice');
const wrapper = window.pipwerks;
let connected = false;
export function isLmsConnected() { return connected; }

function startSession() {
  greeting.textContent = 'היי!';
  notice.hidden = false;
  if (!wrapper || !wrapper.SCORM) return;

  try {
    wrapper.debug.isActive = false;
    wrapper.SCORM.version = '1.2';
    // Handle status and exit explicitly to preserve review mode.
    wrapper.SCORM.handleCompletionStatus = false;
    wrapper.SCORM.handleExitMode = false;
    connected = wrapper.SCORM.init();
    if (!connected) return;

    notice.hidden = true;
    const mode = wrapper.SCORM.get('cmi.core.lesson_mode');
    const lessonStatus = wrapper.SCORM.get('cmi.core.lesson_status');
    if (mode === 'normal' && lessonStatus === 'not attempted') {
      wrapper.SCORM.set('cmi.core.lesson_status', 'incomplete');
      wrapper.SCORM.save();
    }
    const name = wrapper.SCORM.get('cmi.core.student_name');
    if (name && typeof name === 'string') {
      const namePart = (name.includes(',') ? name.split(',').slice(1).join(',') : name).trim();
      const givenName = namePart.split(/\s+/)[0];
      const isName = /^\p{L}[\p{L}\p{M}'’׳״.־\-]*$/u.test(givenName) &&
        !/^(?:false|null|undefined|nan|unknown)$/i.test(givenName) &&
        !/^(?:not available|לא ידוע|ללא שם)$/iu.test(namePart);
      if (isName) greeting.textContent = `היי, ${givenName}`;
    }
  } catch (error) {
    // The unit stays usable even when the LMS is unavailable.
    if (!connected) notice.hidden = false;
  }
}

export function finishLmsSession() {
  if (!connected) return true;
  try {
    if (!wrapper.SCORM.quit()) return false;
    connected = false;
    return true;
  } catch (error) {
    return false;
  }
}

startSession();
window.addEventListener('pagehide', finishLmsSession);
window.addEventListener('pageshow', event => {
  if (event.persisted) startSession();
});

// Writes are made only when the learner submits, never when checking answers.
export function submitToLms(snapshot) {
  if (!connected) return { ok: false, reason: 'offline' };
  const scorm = wrapper.SCORM;
  try {
    const mode = scorm.get('cmi.core.lesson_mode');
    if (mode !== 'normal') return { ok: false, reason: 'review' };
    if (typeof snapshot.openAnswer !== 'string' || !snapshot.openAnswer.trim() ||
        snapshot.openAnswer.length > OPEN_ANSWER_LIMIT) return { ok: false, reason: 'suspend-length' };
    const payload = openAnswerPayload(snapshot.openAnswer);
    if (payload.length > SUSPEND_DATA_LIMIT) return { ok: false, reason: 'suspend-length' };
    const existing = scorm.get('cmi.suspend_data');
    if (scorm.debug.getCode() !== 0 || typeof existing !== 'string') return { ok: false, reason: 'suspend-read' };
    if (existing && existing !== payload) return { ok: false, reason: 'suspend-conflict' };
    const count = Number(scorm.get('cmi.interactions._count'));
    if (!Number.isInteger(count) || count < 0) return { ok: false, reason: 'error' };
    if (!existing && !scorm.set('cmi.suspend_data', payload)) return { ok: false, reason: 'error' };
    const savedAnswer = scorm.get('cmi.suspend_data');
    if (scorm.debug.getCode() !== 0 || savedAnswer !== payload) return { ok: false, reason: 'error' };
    for (const [offset, item] of snapshot.interactions.entries()) {
      const prefix = `cmi.interactions.${count + offset}.`;
      const type = item.type === 'order' ? 'sequencing' : item.type === 'goal' ? 'performance' : 'choice';
      const response = Array.isArray(item.answer) ? item.answer.join(',') :
        typeof item.answer === 'object' ? `${item.answer.action},${item.answer.quantity},${item.answer.deadline}` : item.answer;
      const result = item.status === 'partial' ? String(Number(item.points.toFixed(2))) :
        item.status === 'correct' ? 'correct' : item.status === 'wrong' ? 'wrong' : 'neutral';
      const fields = [['id', `${item.id}_${count + offset}`], ['type', type], ['student_response', response], ['result', result]];
      for (const [field, value] of fields) {
        if (!scorm.set(prefix + field, value)) return { ok: false, reason: 'error' };
      }
    }
    for (const [field, value] of [
      ['cmi.core.score.min', '0'], ['cmi.core.score.max', '100'],
      ['cmi.core.score.raw', String(snapshot.score.percent)],
      ['cmi.core.lesson_status', snapshot.score.passed ? 'passed' : 'failed'],
      ['cmi.core.exit', 'logout']
    ]) {
      if (!scorm.set(field, value)) return { ok: false, reason: 'error' };
    }
    if (!scorm.save()) return { ok: false, reason: 'error' };
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: 'error' };
  }
}
