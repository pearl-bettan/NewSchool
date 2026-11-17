// The main page owns the LMS session; embedded activities do not open their own.
const greeting = document.getElementById('learner-greeting');
const notice = document.getElementById('scorm-notice');
const wrapper = window.pipwerks;
let connected = false;

function startSession() {
  greeting.textContent = 'היי!';
  notice.hidden = false;
  if (!wrapper || !wrapper.SCORM) return;

  try {
    wrapper.debug.isActive = false;
    wrapper.SCORM.version = '1.2';
    // Status and exit reporting belong to the later submission milestone.
    wrapper.SCORM.handleCompletionStatus = false;
    wrapper.SCORM.handleExitMode = false;
    connected = wrapper.SCORM.init();
    if (!connected) return;

    notice.hidden = true;
    const name = wrapper.SCORM.get('cmi.core.student_name');
    if (name && typeof name === 'string') {
      const givenName = (name.includes(',') ? name.split(',').slice(1).join(',') : name).trim().split(/\s+/)[0];
      if (givenName) greeting.textContent = `היי, ${givenName}`;
    }
  } catch (error) {
    // The unit stays usable even when the LMS is unavailable.
    if (!connected) notice.hidden = false;
  }
}

startSession();
window.addEventListener('pagehide', () => {
  if (!connected) return;
  connected = false;
  try { wrapper.SCORM.quit(); } catch (error) { /* The page is closing. */ }
});
window.addEventListener('pageshow', event => {
  if (event.persisted) startSession();
});
