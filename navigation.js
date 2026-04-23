function nav(id) {
  closeMore();

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const screen = document.getElementById('screen-' + id);
  if (!screen) return;
  screen.classList.add('active');

  const navBtn = document.getElementById('nav-' + id);
  const moreBtn = document.getElementById('nav-more');
  if (navBtn) navBtn.classList.add('active');
  else if (moreBtn) moreBtn.classList.add('active');

  if (id === 'calendar' && typeof renderCalendar === 'function') renderCalendar();

  if (id === 'home' && typeof renderHome === 'function') {
    homeCurrentDay = 0;
    renderHome();
  }

  if (id === 'schedule' && typeof renderSchedule === 'function') renderSchedule();
  if (id === 'swap' && typeof prefillSwap === 'function') prefillSwap();
  if (id === 'settings' && typeof renderSettings === 'function') renderSettings();
  if (id === 'sync'     && typeof renderSyncScreen === 'function') renderSyncScreen();

  if (id === 'crew' && typeof openCrewScreen === 'function') openCrewScreen();
}

function toggleMore() {
  const drawer = document.getElementById('moreDrawer');
  const overlay = document.getElementById('moreOverlay');
  const moreBtn = document.getElementById('nav-more');

  if (!drawer || !overlay) return;

  const isOpen = drawer.style.display === 'block';
  drawer.style.display = isOpen ? 'none' : 'block';
  overlay.style.display = isOpen ? 'none' : 'block';

  if (moreBtn) moreBtn.classList.toggle('active', !isOpen);
}

function closeMore() {
  const drawer = document.getElementById('moreDrawer');
  const overlay = document.getElementById('moreOverlay');
  const moreBtn = document.getElementById('nav-more');

  if (drawer) drawer.style.display = 'none';
  if (overlay) overlay.style.display = 'none';
  if (moreBtn) moreBtn.classList.remove('active');
}
