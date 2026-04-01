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

  if (id === 'crew') {
    const gate = document.getElementById('crewPinGate');
    const content = document.getElementById('crewContent');
    const err = document.getElementById('crewPinErr');

    if (!gate || !content) return;

    if (!APP.pin && !APP.usePassword) {
      crewUnlocked = true;
      if (typeof showCrewContent === 'function') showCrewContent();
      return;
    }

    if (APP.usePassword) {
      gate.style.display = 'block';
      content.style.display = 'none';
      gate.innerHTML = `
        <button onclick="nav('swap')" style="position:absolute;top:16px;left:16px;padding:8px 14px;border-radius:10px;border:1.5px solid var(--border);background:var(--bg);font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;color:var(--text);cursor:pointer">← Back</button>
        <div style="font-size:40px;margin-bottom:12px">👥</div>
        <div style="font-size:20px;font-weight:700;margin-bottom:4px">Crew Directory</div>
        <div style="font-size:13px;color:var(--text3);margin-bottom:20px">Inserisci la password</div>
        <input type="password" id="crewPasswordInput" placeholder="Password" style="max-width:260px;text-align:center;font-size:16px;margin-bottom:12px;letter-spacing:2px" onkeydown="if(event.key==='Enter') checkCrewPassword()">
        <button class="btn" style="max-width:260px;margin:0 auto" onclick="checkCrewPassword()">Sblocca</button>
        <div class="pin-error" id="crewPinErr" style="margin-top:8px;display:none">Password errata</div>
      `;
      return;
    }

    crewPinVal = '';
    if (typeof updateCrewPinDots === 'function') updateCrewPinDots();
    gate.style.display = 'block';
    content.style.display = 'none';
    if (err) err.style.display = 'none';
  }
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
