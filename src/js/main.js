const frames = [...document.querySelectorAll('.activity-frame')];
const sections = [...document.querySelectorAll('main > section')];
const progress = document.querySelector('[role="progressbar"]');
function updateProgress(index) {
  const percent = (index + 1) * 20;
  progress.setAttribute('aria-valuenow', percent);
  progress.querySelector('.progress-bar').style.width = `${percent}%`;
  document.querySelector('#progress-label').textContent = `שלב ${index + 1} מתוך 5`;
}
const visibleSections = new Set();
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => entry.isIntersecting ? visibleSections.add(entry.target) : visibleSections.delete(entry.target));
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
    const section = document.getElementById(event.data.id);
    section.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    section.querySelector('h2').setAttribute('tabindex', '-1');
    section.querySelector('h2').focus({ preventScroll: true });
  }
});
document.querySelectorAll('#main-nav a').forEach(link => link.addEventListener('click', () => {
  bootstrap.Collapse.getInstance(document.querySelector('#main-nav'))?.hide();
}));
