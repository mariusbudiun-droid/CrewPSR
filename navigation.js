function nav(id) {
  // Hide more drawer if open
  const drawer  = document.getElementById('moreDrawer');
  const overlay = document.getElementById('moreOverlay');
  if (drawer)  drawer.style.display  = 'none';
  if (overlay) overlay.style.display = 'none';

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const screen = document.getElementById('screen-' + id);
  if (!screen) return;
  screen.classList.add('active');

  const navBtn  = document.getElementById('nav-' + id);
  const moreBtn = document.getElementById('nav-more');
  if (navBtn) navBtn.classList.add('active');
  else if (moreBtn) moreBtn.classList.add('active');

  if (id === 'calendar'   && typeof renderCalendar   === 'function') renderCalendar();
  if (id === 'home'       && typeof renderHome       === 'function') { homeCurrentDay = 0; renderHome(); }
  if (id === 'schedule'   && typeof renderSchedule   === 'function') renderSchedule();
  if (id === 'swap'       && typeof prefillSwap      === 'function') prefillSwap();
  if (id === 'settings'   && typeof renderSettings   === 'function') renderSettings();
  if (id === 'crew'       && typeof openCrewScreen   === 'function') openCrewScreen();
  if (id === 'statistics' && typeof renderStatistics === 'function') renderStatistics();
}

function toggleMore() {
  const screen  = document.getElementById('screen-more');
  const moreBtn = document.getElementById('nav-more');
  if (!screen) return;

  const isActive = screen.classList.contains('active');
  if (isActive) {
    // Go back to home if pressing More while More is open
    nav('home');
  } else {
    nav('more');
  }
}

// Kept for any remaining references
function closeMore() {}
