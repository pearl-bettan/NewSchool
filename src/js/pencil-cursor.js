// Draws the pencil cursor inside the quiz with a mouse. Chrome stops showing a custom CSS
// cursor in an iframe below its first window height, so the system cursor is hidden
// (see .js-pencil in styles.css) and an image follows the mouse instead.
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
if (finePointer.matches) {
  const pencil = document.createElement('img');
  pencil.src = new URL('../assets/images/pencil-cursor.svg', import.meta.url).href;
  pencil.className = 'pencil-pointer';
  pencil.alt = '';
  pencil.setAttribute('aria-hidden', 'true');
  pencil.hidden = true;
  document.body.append(pencil);
  document.documentElement.classList.add('js-pencil');
  // Hotspot is the pencil tip at (2, 22), the same as the CSS cursor.
  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    pencil.style.transform = `translate(${event.clientX - 2}px, ${event.clientY - 22}px)`;
    pencil.hidden = false;
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { pencil.hidden = true; });
  window.addEventListener('blur', () => { pencil.hidden = true; });
}
