function prefillSwap() {
  if (APP.roster) {
    document.getElementById('swapRoster').value = APP.roster;
  }
  runSwap();
}

const OFF_DAYS = [6, 8, 14, 16];

function runSwap() {
  const myRoster = parseInt(document.getElementById('swapRoster').value);
  const myDay    = parseInt(document.getElementById('swapShift').value);
  const el       = document.getElementById('swapResults');

  if (!myRoster || !myDay) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="big">🔄</div>
        <p>Select roster and shift<br>to find colleagues</p>
      </div>`;
    return;
  }

  // Off days → reverse swap
  if (OFF_DAYS.includes(myDay)) {
    const today = new Date();
    // Find the date when myRoster is on myDay (use today as anchor)
    // We can't know an exact date from the swap tool — show roster list only
    const candidates = reverseSwapCandidatesByDay(myRoster, myDay);

    if (!candidates.length) {
      el.innerHTML = `<div class="empty-state"><div class="big">😕</div><h3>No one compatible</h3></div>`;
      return;
    }

    const legend = `
      <div style="display:flex;gap:12px;align-items:center;padding:0 16px 8px;font-size:11px;color:var(--text3)">
        <span style="display:flex;align-items:center;gap:4px">
          <span style="width:8px;height:8px;border-radius:50%;background:var(--green);display:inline-block"></span> sicuro
        </span>
        <span style="display:flex;align-items:center;gap:4px">
          <span style="width:8px;height:8px;border-radius:50%;background:var(--yellow);display:inline-block"></span> verifica riposo
        </span>
      </div>`;

    el.innerHTML = `<div class="section-title">You could work instead of</div>` +
      legend +
      candidates.map(c => buildReverseSwapCard(c)).join('');
    return;
  }

  // Normal working days
  const results = swapCandidates(myRoster, myDay);
  el.innerHTML = results.length
    ? results.map(c => buildSwapCard(c)).join('')
    : `<div class="empty-state"><div class="big">😕</div><h3>No one available</h3></div>`;
}

// Returns roster candidates for a given off day (no date needed — just cycle logic)
function reverseSwapCandidatesByDay(myRoster, myDay) {
  const rules = {
    6:  { certain: [1,2,3,4,5],    uncertain: [9,10,11,12,13] },
    8:  { certain: [9,10,11,12,13], uncertain: [1,2,3,4,5]    },
    14: { certain: [9,10,11,12,13], uncertain: []              },
    16: { certain: [9,10,11,12,13], uncertain: [1,2,3,4,5]    },
  };
  const rule = rules[myDay];
  if (!rule) return [];

  // For each roster, figure out what cycle day they are when myRoster is on myDay.
  // The offset between two rosters is fixed: rosterB_day = ((myDay - 1 + (myRoster - r)) % 16 + 16) % 16 + 1
  const result = [];
  for (let r = 1; r <= 16; r++) {
    if (r === myRoster) continue;
    const offset   = ((myRoster - r) % 16 + 16) % 16;
    const theirDay = ((myDay - 1 + offset) % 16) + 1;

    if (rule.certain.includes(theirDay))   result.push({ roster: r, certain: true  });
    else if (rule.uncertain.includes(theirDay)) result.push({ roster: r, certain: false });
  }

  result.sort((a, b) => (b.certain ? 1 : 0) - (a.certain ? 1 : 0));
  return result;
}

function buildReverseSwapCard(c) {
  const colleagues = (APP.crew?.[c.roster] || []).filter(x => x && x.code && x.code.trim());
  const borderColor = c.certain ? 'var(--green)' : 'var(--yellow)';
  const bgColor     = c.certain ? 'var(--green-lt)' : 'var(--yellow-lt)';

  const inner = colleagues.length > 0
    ? colleagues.map(x => {
        const phone = (x.phone || '').replace(/\D/g, '');
        const name  = x.name || x.code;
        return phone
          ? `<div style="margin-top:4px"><a class="wa-pill" href="https://wa.me/${phone}" target="_blank" rel="noopener noreferrer">${name}</a></div>`
          : `<div style="font-family:JetBrains Mono,monospace;font-size:13px;margin-top:4px">${name}</div>`;
      }).join('')
    : `<div class="swap-codes empty">No crew codes yet</div>`;

  return `
    <div class="swap-card" style="border-left:3px solid ${borderColor};background:${bgColor}20">
      <div class="swap-roster-badge">
        <span class="srb-label">Roster</span>
        <span class="srb-num">${c.roster}</span>
      </div>
      <div class="swap-info">${inner}</div>
    </div>`;
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
    section.innerHTML = `<div style="padding:16px;text-align:center;color:var(--text3);font-size:13px">Unlock the Crew tab first to view contacts</div>`;
    return;
  }

  let html = '';
  for (let R = 1; R <= 16; R++) {
    const colleagues = (APP.crew[R] || []).filter(c => c && c.code && c.code.trim());
    if (!colleagues.length) continue;

    const pills = colleagues.map(c => {
      const phone = (c.phone || '').replace(/\D/g, '');
      const name  = c.name || c.code;
      return phone
        ? `<a class="wa-pill" href="https://wa.me/${phone}" target="_blank" rel="noopener noreferrer" style="margin:2px">${name}</a>`
        : `<span style="font-family:monospace;font-size:12px;background:var(--bg2);padding:3px 8px;border-radius:6px;margin:2px">${name}</span>`;
    }).join('');

    html += `
      <div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;flex-wrap:wrap;gap:6px">
        <span style="font-family:monospace;font-size:11px;color:var(--blue);background:var(--blue-lt);padding:2px 8px;border-radius:6px;flex-shrink:0">R${R}</span>
        ${pills}
      </div>`;
  }

  section.innerHTML = html || `<div style="padding:16px;text-align:center;color:var(--text3);font-size:13px">No crew codes added yet</div>`;
}
