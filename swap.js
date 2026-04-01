function prefillSwap() {
  if (APP.roster) {
    document.getElementById('swapRoster').value = APP.roster;
  }
  runSwap();
}

function runSwap() {
  const myRoster = parseInt(document.getElementById('swapRoster').value);
  const myDay = parseInt(document.getElementById('swapShift').value);
  const el = document.getElementById('swapResults');

  if (!myRoster || !myDay) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="big">🔄</div>
        <p>Select roster and shift<br>to find colleagues</p>
      </div>
    `;
    return;
  }

  const results = swapCandidates(myRoster, myDay);

  el.innerHTML = results.length
    ? results.map(c => buildSwapCard(c)).join('')
    : `
      <div class="empty-state">
        <div class="big">😕</div>
        <h3>No one available</h3>
      </div>
    `;
}

function toggleSwapCrew() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-crew').classList.add('active');

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

function renderSwapCrewContent() {
  const section = document.getElementById('swapCrewSection');
  if (!section) return;

  if (!crewUnlocked && APP.pin) {
    section.innerHTML = `
      <div style="padding:16px; text-align:center; color:var(--text3); font-size:13px">
        Unlock the Crew tab first to view contacts
      </div>
    `;
    return;
  }

  let html = '';

  for (let R = 1; R <= 16; R++) {
    const colleagues = (APP.crew[R] || []).filter(c => c && c.code && c.code.trim());
    if (!colleagues.length) continue;

    const pills = colleagues.map(c => {
      const phone = (c.phone || '').replace(/\D/g, '');
      const name = c.name || c.code;

      if (phone) {
        return `<a class="wa-pill" href="https://wa.me/${phone}" target="_blank" rel="noopener noreferrer" style="margin:2px">${name}</a>`;
      }

      return `<span style="font-family:monospace;font-size:12px;background:var(--bg2);padding:3px 8px;border-radius:6px;margin:2px">${name}</span>`;
    }).join('');

    html += `
      <div style="padding:10px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; flex-wrap:wrap; gap:6px">
        <span style="font-family:monospace;font-size:11px;color:var(--blue);background:var(--blue-lt);padding:2px 8px;border-radius:6px;flex-shrink:0">R${R}</span>
        ${pills}
      </div>
    `;
  }

  section.innerHTML = html || `
    <div style="padding:16px; text-align:center; color:var(--text3); font-size:13px">
      No crew codes added yet
    </div>
  `;
}
