function nav(id) {
  closeMore();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  document.getElementById('screen-' + id).classList.add('active');
  const navBtn = document.getElementById('nav-' + id);
  if (navBtn) navBtn.classList.add('active');
  else document.getElementById('nav-more').classList.add('active');

  if (id === 'calendar') renderCalendar();
  if (id === 'home') { homeCurrentDay = 0; renderHome(); }
  if (id === 'schedule') renderSchedule();
  if (id === 'swap') prefillSwap();
  if (id === 'settings') renderSettings();
  if (id === 'crew') {
    if (!APP.pin && !APP.usePassword) {
      crewUnlocked = true;
      showCrewContent();
    } else if (APP.usePassword) {
      const gate = document.getElementById('crewPinGate');
      gate.style.display = 'block';
      document.getElementById('crewContent').style.display = 'none';
      gate.innerHTML = `
        <button onclick="nav('swap')" style="position:absolute;top:16px;left:16px;padding:8px 14px;border-radius:10px;border:1.5px solid var(--border);background:var(--bg);font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;color:var(--text);cursor:pointer">← Back</button>
        <div style="font-size:40px;margin-bottom:12px">👥</div>
        <div style="font-size:20px;font-weight:700;margin-bottom:4px">Crew Directory</div>
        <div style="font-size:13px;color:var(--text3);margin-bottom:20px">Inserisci la password</div>
        <input type="password" id="crewPasswordInput" placeholder="Password" style="max-width:260px;text-align:center;font-size:16px;margin-bottom:12px;letter-spacing:2px" onkeydown="if(event.key==='Enter') checkCrewPassword()">
        <button class="btn" style="max-width:260px;margin:0 auto" onclick="checkCrewPassword()">Sblocca</button>
        <div class="pin-error" id="crewPinErr" style="margin-top:8px">Password errata</div>
      `;
    } else {
      crewPinVal = '';
      updateCrewPinDots();
      document.getElementById('crewPinGate').style.display = 'block';
      document.getElementById('crewContent').style.display = 'none';
      document.getElementById('crewPinErr').style.display = 'none';
    }
  }
}

function toggleMore() {
  const drawer = document.getElementById('moreDrawer');
  const overlay = document.getElementById('moreOverlay');
  const isOpen = drawer.style.display !== 'none';
  drawer.style.display = isOpen ? 'none' : 'block';
  overlay.style.display = isOpen ? 'none' : 'block';
  document.getElementById('nav-more').classList.toggle('active', !isOpen);
}

function closeMore() {
  const drawer = document.getElementById('moreDrawer');
  const overlay = document.getElementById('moreOverlay');
  if (!drawer || !overlay) return;
  drawer.style.display = 'none';
  overlay.style.display = 'none';
}
