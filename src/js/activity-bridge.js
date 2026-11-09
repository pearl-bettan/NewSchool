export function sendMessage(type, payload = {}) {
  if (window.parent === window || window.location.origin === 'null') return;
  window.parent.postMessage({ source: 'school-new-activity', type, ...payload }, window.location.origin);
}
export function reportHeight() {
  const content = document.querySelector('main');
  const height = Math.ceil(content.getBoundingClientRect().height + content.offsetTop + 8);
  sendMessage('resize', { height });
}
// Keep scoring modules importable outside a browser.
if (typeof window !== 'undefined') {
  if (window.parent !== window) document.documentElement.classList.add('embedded');
  window.addEventListener('load', reportHeight);
  window.addEventListener('resize', reportHeight);
  new ResizeObserver(reportHeight).observe(document.querySelector('main'));
  document.addEventListener('shown.bs.collapse', reportHeight);
  document.addEventListener('hidden.bs.collapse', reportHeight);
  document.fonts.ready.then(reportHeight);
}
