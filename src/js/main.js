import { finishLmsSession, isLmsConnected, submitToLms } from './scorm-session.js';
import { OPEN_ANSWER_LIMIT, SUSPEND_DATA_LIMIT, openAnswerPayload } from './quiz-data.js';

const frames = [...document.querySelectorAll('.activity-frame')];
const sections = [...document.querySelectorAll('main > section')];
const progress = document.querySelector('[role="progressbar"]');
const progressLinks = [...document.querySelectorAll('.progress-step')];
const navigationLinks = [...document.querySelectorAll('#main-nav .nav-link')];
const greetingButtons = [...document.querySelectorAll('.greeting-button')];
const globeControl = document.querySelector('#globe-motion-toggle');
const startLink = document.querySelector('.hero-actions a[href="#step-goal"]');

// Follow the visual order without positive tabindex values; preserve reverse navigation.
function redirectTab(from, target, backwards = false) {
  from?.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || event.shiftKey !== backwards || event.altKey || event.ctrlKey || event.metaKey) return;
    const next = target();
    if (!next || !next.getClientRects().length) return;
    event.preventDefault();
    next.focus();
  });
}
redirectTab(navigationLinks.at(-1), () => greetingButtons[0]);
redirectTab(document.querySelector('.navbar-toggler'), () =>
  navigationLinks.at(-1)?.getClientRects().length ? null : greetingButtons[0]);
redirectTab(greetingButtons[0], () => {
  const lastLink = navigationLinks.at(-1);
  return lastLink?.getClientRects().length ? lastLink : document.querySelector('.navbar-toggler');
}, true);
redirectTab(globeControl, () => startLink);
redirectTab(greetingButtons.at(-1), () => globeControl?.hidden ? startLink : null);
redirectTab(startLink, () => globeControl && !globeControl.hidden ? globeControl : greetingButtons.at(-1), true);
redirectTab(startLink, () => progressLinks[0]);
redirectTab(progressLinks[0], () => startLink, true);
let selectedSection = null;
let selectedSectionSeen = false;
let currentProgressIndex = 0;
// Keep the latest filled answers in memory until submission is implemented.
let checkedInteractions = null;
let latestQuizSnapshot = null;
let submissionFinished = false;
const submitLearning = document.querySelector('#submit-learning');
function setCheckedInteractions(interactions) {
  checkedInteractions = interactions;
  if (!submissionFinished) document.querySelector('#submission-status').textContent = '';
}
function alignProgressLine() {
  const track = progress.getBoundingClientRect();
  const marker = progressLinks[currentProgressIndex].querySelector('.progress-step-number').getBoundingClientRect();
  const vertical = track.height > track.width;
  const length = vertical ? marker.top + marker.height / 2 - track.top : track.right - (marker.left + marker.width / 2);
  const maxLength = vertical ? track.height : track.width;
  progress.querySelector('.progress-bar').style.setProperty('--progress-length', `${Math.max(0, Math.min(maxLength, length))}px`);
}
function updateProgress(index) {
  currentProgressIndex = index;
  const percent = (index + 1) * 20;
  progress.setAttribute('aria-valuenow', percent);
  document.querySelector('#progress-label').textContent = `שלב ${index + 1} מתוך 5`;
  progressLinks.forEach((link, position) => {
    if (position === index) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  });
  alignProgressLine();
}
window.addEventListener('resize', alignProgressLine);
window.addEventListener('load', alignProgressLine);
alignProgressLine();
function goToSection(id) {
  const section = document.getElementById(id);
  const index = sections.indexOf(section);
  if (index === -1) return;
  selectedSection = section;
  selectedSectionSeen = visibleSections.has(section);
  updateProgress(index);
  section.focus({ preventScroll: true });
  section.scrollIntoView({
    block: 'start',
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
  });
}
progressLinks.forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  goToSection(link.getAttribute('href').slice(1));
}));

const visibleSections = new Set();
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => entry.isIntersecting ? visibleSections.add(entry.target) : visibleSections.delete(entry.target));
  // Keep the clicked stage selected until it has appeared and then left the viewport.
  if (selectedSection) {
    if (visibleSections.has(selectedSection)) selectedSectionSeen = true;
    if (!selectedSectionSeen || visibleSections.has(selectedSection)) return;
    selectedSection = null;
  }
  const current = sections.filter(section => visibleSections.has(section)).at(-1);
  if (current) updateProgress(sections.indexOf(current));
}, { rootMargin: '-10% 0px -25% 0px' });
sections.forEach(section => observer.observe(section));
// The frame always takes the full height of its content, so the page has no inner scroll.
const frameContentHeights = new Map();
function setFrameHeight(frame, contentHeight) {
  frameContentHeights.set(frame, contentHeight);
  frame.style.height = `${contentHeight}px`;
}
window.addEventListener('resize', () => frameContentHeights.forEach((height, frame) => setFrameHeight(frame, height)));
window.addEventListener('message', event => {
  if (window.location.origin === 'null' || event.origin !== window.location.origin || event.data?.source !== 'school-new-activity') return;
  const frame = frames.find(item => item.contentWindow === event.source);
  if (!frame) return;
  if (event.data.type === 'resize' && Number.isFinite(event.data.height) && event.data.height > 0 && event.data.height < 50000) setFrameHeight(frame, event.data.height);
  if (event.data.type === 'scroll-to-frame') frame.scrollIntoView({ block: 'start', behavior: 'instant' });
  if (frame.id === 'quiz-frame' && event.data.type === 'quiz-invalidated') {
    setCheckedInteractions(null);
    latestQuizSnapshot = null;
  }
  if (frame.id === 'quiz-frame' && event.data.type === 'quiz-availability' && typeof event.data.complete === 'boolean') {
    submitLearning.disabled = submissionFinished || !event.data.complete;
  }
  if (frame.id === 'quiz-frame' && event.data.type === 'quiz-snapshot') {
    const { score, interactions, openAnswer } = event.data;
    if (typeof openAnswer === 'string' && openAnswer.trim() && openAnswer.length <= OPEN_ANSWER_LIMIT &&
      openAnswerPayload(openAnswer).length <= SUSPEND_DATA_LIMIT &&
      score && Number.isFinite(score.percent) && score.percent >= 0 && score.percent <= 100 &&
      Array.isArray(interactions) && interactions.length === 5 && interactions.every((item, index) =>
        item && item.id === `q${index + 1}` && ['correct', 'partial', 'wrong', 'invalid'].includes(item.status))) {
      latestQuizSnapshot = { score, interactions, openAnswer };
    }
  }
  if (frame.id === 'quiz-frame' && event.data.type === 'quiz-result') {
    const interactions = event.data.interactions;
    if (Array.isArray(interactions) && interactions.length === 5 && interactions.every((item, index) =>
      item && item.id === `q${index + 1}` && ['correct', 'partial', 'wrong'].includes(item.status))) {
      setCheckedInteractions(interactions);
    } else setCheckedInteractions(null);
    updateProgress(4);
  }
  if (event.data.type === 'revisit' && ['step-goal', 'step-split', 'step-review'].includes(event.data.id)) {
    goToSection(event.data.id);
  }
});
function getMoodleActivityUrl() {
  let frame = window;
  for (let depth = 0; depth < 10; depth++) {
    try {
      const current = new URL(frame.location.href);
      if (current.origin === window.location.origin && /\/mod\/scorm\/player\.php$/.test(current.pathname)) {
        const activityId = current.searchParams.get('a');
        const moduleId = current.searchParams.get('cm');
        const target = new URL('view.php', current);
        if (activityId && /^[0-9]+$/.test(activityId)) target.searchParams.set('a', activityId);
        else if (moduleId && /^[0-9]+$/.test(moduleId)) target.searchParams.set('id', moduleId);
        else return null;
        target.searchParams.set('preventskip', '1');
        return target.href;
      }
      if (frame === frame.parent) break;
      frame = frame.parent;
    } catch (error) {
      return null;
    }
  }
  return null;
}

submitLearning.addEventListener('click', () => {
  const status = document.querySelector('#submission-status');
  if (!isLmsConnected()) {
    status.textContent = 'לא ניתן להגיש: אין חיבור למערכת הלמידה והתשובות אינן נשמרות בה.';
  } else if (!latestQuizSnapshot) {
    status.textContent = 'לא התקבלו נתוני השאלון. יש לוודא שכל השאלות מולאו.';
  } else {
    const result = submitToLms(latestQuizSnapshot);
    if (result.ok) {
      submissionFinished = true;
      submitLearning.disabled = true;
      if (!finishLmsSession()) {
        status.textContent = 'התוצאה נשמרה, אך לא התקבל אישור לסיום החיבור. אפשר לחזור למודל ולבדוק את הניסיון.';
        return;
      }
      const returnUrl = getMoodleActivityUrl();
      const returnLink = document.querySelector('#return-to-moodle');
      status.classList.add('alert', 'alert-success');
      status.textContent = returnUrl ? 'הלומדה הוגשה בהצלחה והתוצאה נשמרה.' :
        'הלומדה הוגשה והתוצאה נשמרה. אפשר לסגור את החלון ולחזור למודל.';
      if (returnUrl) {
        returnLink.href = returnUrl;
        returnLink.hidden = false;
      }
      status.focus();
    } else if (result.reason === 'suspend-conflict') {
      status.textContent = 'קיימים במודל נתוני שמירה אחרים. כדי לא לדרוס אותם ההגשה נעצרה; יש לבדוק את הניסיון במודל.';
    } else if (result.reason === 'suspend-read') {
      status.textContent = 'לא ניתן לבדוק את נתוני השמירה במודל. ההגשה נעצרה בלי לשנות אותם; אפשר לנסות שוב או לפנות לתמיכה.';
    } else if (result.reason === 'suspend-length') {
      status.textContent = 'התשובה ארוכה מכדי להישמר. יש לקצר אותה ולנסות שוב.';
    } else if (result.reason === 'review') {
      status.textContent = 'לא ניתן להגיש במצב עיון או תצוגה מקדימה. יש לפתוח ניסיון רגיל במודל.';
    } else {
      status.textContent = 'לא התקבל אישור שמירה מלא ממערכת הלמידה. ייתכן שחלק מהנתונים נשמרו; יש לבדוק את דוח הניסיון במודל לפני ניסיון נוסף.';
      submissionFinished = true;
      submitLearning.disabled = true;
    }
  }
});

document.querySelectorAll('#main-nav a').forEach(link => link.addEventListener('click', () => {
  bootstrap.Collapse.getInstance(document.querySelector('#main-nav'))?.hide();
}));

document.querySelectorAll('.greeting-button').forEach(button => {
  function speakGreeting() {
    const status = document.querySelector('#speech-status');
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      status.textContent = 'השמעת הברכות אינה זמינה בדפדפן הזה.';
      return;
    }
    const language = button.dataset.language;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(item => item.lang.toLowerCase().split('-')[0] === language.toLowerCase().split('-')[0]);
    if (voices.length && !voice) {
      status.textContent = 'לא נמצא קול מתאים לשפה הזאת במכשיר.';
      return;
    }
    status.textContent = '';
    const utterance = new SpeechSynthesisUtterance(button.dataset.speech);
    utterance.lang = language;
    if (voice) utterance.voice = voice;
    utterance.onerror = event => {
      if (!['canceled', 'interrupted'].includes(event.error)) status.textContent = 'לא ניתן להשמיע את הברכה במכשיר הזה.';
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
  button.addEventListener('click', speakGreeting);
  button.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      speakGreeting();
    }
  });
});

const globeMotionButton = document.querySelector('#globe-motion-toggle');
if (globeMotionButton) {
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const globeMotion = document.querySelector('#globe-surface').animate([
    { transform: 'translateX(0px)' },
    { transform: 'translateX(-290px)' }
  ], { duration: 12000, iterations: Infinity, easing: 'linear' });

  function setGlobeMotion(running) {
    if (running) globeMotion.play();
    else globeMotion.pause();
    const label = running ? 'עצירת סיבוב הגלובוס' : 'הפעלת סיבוב הגלובוס';
    globeMotionButton.setAttribute('aria-label', label);
    globeMotionButton.title = label;
    globeMotionButton.querySelector('.globe-stop-icon').toggleAttribute('hidden', !running);
    globeMotionButton.querySelector('.globe-play-icon').toggleAttribute('hidden', running);
  }

  setGlobeMotion(!motionPreference.matches);
  globeMotionButton.hidden = false;
  globeMotionButton.addEventListener('click', () => setGlobeMotion(globeMotion.playState !== 'running'));
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) setGlobeMotion(false);
  });
}
