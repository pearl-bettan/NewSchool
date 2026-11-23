// Hours/minutes picker for the "עד איזו שעה?" field. It looks and works like the browser's
// time picker (two columns), but the lists do not wrap: hours end at 23 and minutes at 59.
// The value stays "HH:MM", so quiz.js validates it exactly as before.
const pad = number => String(number).padStart(2, '0');
const UNITS = { hour: 24, minute: 60 };

function setup(picker) {
  if (picker.dataset.ready) return;
  picker.dataset.ready = 'true';
  const input = picker.querySelector('.time-picker-input');
  const panel = picker.querySelector('.time-picker-panel');
  const columns = [...picker.querySelectorAll('[data-time-unit]')];
  columns.forEach(column => {
    const unit = column.dataset.timeUnit;
    column.id = `${input.id}-${unit}s`;
    column.innerHTML = Array.from({ length: UNITS[unit] }, (_, value) =>
      `<div class="time-picker-option" role="option" id="${column.id}-${value}" data-value="${value}" aria-selected="false">${pad(value)}</div>`).join('');
  });
  input.setAttribute('aria-controls', columns.map(column => column.id).join(' '));

  const current = () => {
    const match = /^(\d\d):(\d\d)$/.exec(input.value);
    return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
  };
  function markSelected() {
    const time = current();
    columns.forEach(column => column.querySelectorAll('[role=option]').forEach(option => {
      option.setAttribute('aria-selected', String(!!time && Number(option.dataset.value) === time[column.dataset.timeUnit]));
    }));
  }
  function setActive(column, value, scroll = true) {
    const max = UNITS[column.dataset.timeUnit] - 1;
    const clamped = Math.min(max, Math.max(0, value)); // stop at the ends, no wrap-around
    column.querySelectorAll('.is-active').forEach(option => option.classList.remove('is-active'));
    const option = column.querySelector(`[data-value="${clamped}"]`);
    option.classList.add('is-active');
    column.setAttribute('aria-activedescendant', option.id);
    if (scroll) option.scrollIntoView({ block: 'nearest' });
    return clamped;
  }
  function choose(unit, value) {
    const time = current() ?? { hour: 0, minute: 0 };
    time[unit] = value;
    input.value = `${pad(time.hour)}:${pad(time.minute)}`;
    markSelected();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function open(focusColumn = false) {
    if (!panel.hidden) return;
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    markSelected();
    const time = current();
    columns.forEach(column => {
      const value = time ? time[column.dataset.timeUnit] : 0;
      setActive(column, value, false);
      const option = column.querySelector(`[data-value="${value}"]`);
      column.scrollTop = option.offsetTop - (column.clientHeight - option.offsetHeight) / 2;
    });
    if (focusColumn) columns[0].focus();
  }
  function close(focusInput = false) {
    if (panel.hidden) return;
    panel.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    if (focusInput) input.focus();
  }

  input.addEventListener('click', () => (panel.hidden ? open() : close()));
  input.addEventListener('keydown', event => {
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); open(true); }
    if (event.key === 'Escape') close();
    if (['Backspace', 'Delete'].includes(event.key) && input.value) {
      event.preventDefault();
      input.value = '';
      markSelected();
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  columns.forEach((column, index) => {
    column.addEventListener('click', event => {
      const option = event.target.closest('[role=option]');
      if (!option) return;
      const value = setActive(column, Number(option.dataset.value), false);
      choose(column.dataset.timeUnit, value);
      column.focus({ preventScroll: true });
    });
    column.addEventListener('keydown', event => {
      const active = Number(column.querySelector('.is-active')?.dataset.value ?? 0);
      const steps = { ArrowDown: 1, ArrowUp: -1, PageDown: 6, PageUp: -6 };
      if (event.key in steps) { event.preventDefault(); choose(column.dataset.timeUnit, setActive(column, active + steps[event.key])); }
      else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); choose(column.dataset.timeUnit, setActive(column, event.key === 'Home' ? 0 : Infinity)); }
      else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); columns[event.key === 'ArrowRight' ? 1 : 0].focus(); }
      else if (event.key === 'Enter' || event.key === 'Escape') { event.preventDefault(); close(true); }
      else if (event.key === 'Tab' && !event.shiftKey && index === columns.length - 1) close();
    });
  });
  document.addEventListener('pointerdown', event => { if (!picker.contains(event.target)) close(); });
  picker.addEventListener('focusout', event => { if (event.relatedTarget && !picker.contains(event.relatedTarget)) close(); });
  input.form?.addEventListener('reset', () => { close(); requestAnimationFrame(markSelected); });
}

// The quiz renders its questions from JavaScript, so set up pickers once they exist.
function setupAll() { document.querySelectorAll('[data-time-picker]').forEach(setup); }
setupAll();
new MutationObserver(setupAll).observe(document.body, { childList: true, subtree: true });
