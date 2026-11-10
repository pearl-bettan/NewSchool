const frames = [...document.querySelectorAll('.activity-frame')];
const sections = [...document.querySelectorAll('main > section')];
const progress = document.querySelector('[role="progressbar"]');
const progressLinks = [...document.querySelectorAll('.progress-step')];
const scrollBrush = document.querySelector('.scroll-brush');
if (scrollBrush) {
  let brushUpdatePending = false;
  function updateBrush() {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollableHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollableHeight)) : 0;
    scrollBrush.style.setProperty('--brush-offset', 100 * (1 - progress));
    brushUpdatePending = false;
  }
  function scheduleBrushUpdate() {
    if (!brushUpdatePending) {
      brushUpdatePending = true;
      requestAnimationFrame(updateBrush);
    }
  }
  window.addEventListener('scroll', scheduleBrushUpdate, { passive: true });
  window.addEventListener('resize', scheduleBrushUpdate);
  updateBrush();
}
let selectedSection = null;
let selectedSectionSeen = false;
function updateProgress(index) {
  const percent = (index + 1) * 20;
  progress.setAttribute('aria-valuenow', percent);
  progress.querySelector('.progress-bar').style.setProperty('--progress-percent', `${percent}%`);
  document.querySelector('#progress-label').textContent = `שלב ${index + 1} מתוך 5`;
  progressLinks.forEach((link, position) => {
    if (position === index) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  });
}
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
window.addEventListener('message', event => {
  if (window.location.origin === 'null' || event.origin !== window.location.origin || event.data?.source !== 'school-new-activity') return;
  const frame = frames.find(item => item.contentWindow === event.source);
  if (!frame) return;
  if (event.data.type === 'resize' && Number.isFinite(event.data.height) && event.data.height > 0 && event.data.height < 50000) frame.style.height = `${event.data.height}px`;
  if (event.data.type === 'scroll-to-frame') frame.scrollIntoView({ block: 'start', behavior: 'instant' });
  if (event.data.type === 'quiz-result') updateProgress(4);
  if (event.data.type === 'revisit' && ['step-goal', 'step-split', 'step-review'].includes(event.data.id)) {
    goToSection(event.data.id);
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
    globeMotionButton.textContent = running ? 'עצירת סיבוב הגלובוס' : 'הפעלת סיבוב הגלובוס';
  }

  setGlobeMotion(!motionPreference.matches);
  globeMotionButton.hidden = false;
  globeMotionButton.addEventListener('click', () => setGlobeMotion(globeMotion.playState !== 'running'));
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) setGlobeMotion(false);
  });
}
