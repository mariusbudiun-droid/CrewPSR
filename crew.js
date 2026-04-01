let crewPinVal = '';
let loginPinVal = '';
let crewUnlocked = false;

function crewPinKey(k) {
  if (k === 'del') crewPinVal = crewPinVal.slice(0, -1);
  else if (crewPinVal.length < 4) crewPinVal += k;

  updateCrewPinDots();

  if (crewPinVal.length === 4) {
    if (crewPinVal === APP.pin) {
      crewUnlocked = true;
      showCrewContent();
    } else {
      const err = document.getElementById('crewPinErr');
      if (err) err.style.display = 'block';
      crewPinVal = '';
      setTimeout(() => {
        updateCrewPinDots();
        if (err) err.style.display = 'none';
      }, 1000);
    }
  }
}

function checkCrewPassword() {
  const input = document.getElementById('crewPasswordInput');
  if (!input) return;

  const v = input.value;

  if (v === APP.password) {
    crewUnlocked = true;
    showCrewContent();
  } else {
    const err = document.getElementById('crewPinErr');
    if (err) err.style.display = 'block';
    input.value = '';
    input.focus();
  }
}

function updateCrewPinDots() {
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById('cpd' + i);
    if (el) el.classList.toggle('filled', i < crewPinVal.length);
  }
}

function showCrewContent() {
  const gate = document.getElementById('crewPinGate');
  const content = document.getElementById('crewContent');
  if (gate) gate.style.display = 'none';
  if (content) content.style.display = 'block';
  renderCrewList();
}

function lockCrew() {
  crewUnlocked = false;
  crewPinVal = '';
  const gate = document.getElementById('crewPinGate');
  const content = document.getElementById('crewContent');
  if (gate) gate.style.display = 'block';
  if (content) content.style.display = 'none';
  updateCrewPinDots();
}

function renderCrewList() {
  const el = document.getElementById('crewList');
  if (!el) return;

  let html = '';

  for (let R = 1; R <= 16; R++) {
    const colleagues = (APP.crew[R] || []).filter(c => c && c.code && c.code.trim());

    const pills = colleagues.map(c => {
      const phone = (c.phone || '').replace(/\D/g, '');
      const name = c.name || c.code;

      return phone
        ? `<a class="wa-pill" href="https://wa.me/${phone}" target="_blank" rel="noopener noreferrer" style="margin:2px">${name}</a>`
        : `<span style="font-family:'JetBrains Mono',monospace; font-size:12px; background:var(--bg2); padding:3px 8px; border-radius:6px; margin:2px">${name}</span>`;
    }).join('');

    html += `
      <div class="crew-roster-card">
        <div class="crew-roster-header" onclick="toggleCrewCard(${R})">
          <div style="display:flex; align-items:center; gap:10px">
            <span class="roster-pill">Roster ${R}</span>
            <span style="font-size:12px; color:var(--text3)">${colleagues.length ? `${colleagues.length} crew` : 'empty'}</span>
          </div>
          <span id="ca-${R}" style="color:var(--text3); font-size:13px">›</span>
        </div>
        <div class="crew-roster-body" id="cb-${R}">
          ${pills || `<div style="font-size:12px; color:var(--text3)">No crew added yet</div>`}
        </div>
      </div>
    `;
  }

  el.innerHTML = html;
}

function toggleCrewCard(R) {
  const b = document.getElementById('cb-' + R);
  const a = document.getElementById('ca-' + R);
  if (!b || !a) return;
  b.classList.toggle('open');
  a.textContent = b.classList.contains('open') ? '⌄' : '›';
}

function openCrewEdit() {
  if (!APP.pin && !APP.usePassword) {
    showCrewEditModal();
    return;
  }

  loginPinVal = '';
  updateLoginDots();

  const err = document.getElementById('pinModalErr');
  const sub = document.getElementById('pinModalSub');
  const modal = document.getElementById('pinModal');

  if (err) err.style.display = 'none';
  if (sub) {
    sub.textContent = APP.usePassword
      ? 'Enter your password to edit'
      : 'Enter your PIN to edit';
  }

  if (APP.usePassword) {
    showCrewEditModal();
    if (modal) modal.classList.remove('open');
    return;
  }

  if (modal) modal.classList.add('open');
}

function loginPin(k) {
  if (k === 'del') loginPinVal = loginPinVal.slice(0, -1);
  else if (loginPinVal.length < 4) loginPinVal += k;

  updateLoginDots();

  if (loginPinVal.length === 4) {
    if (loginPinVal === APP.pin) {
      crewUnlocked = true;
      closeModal('pinModal');
      showCrewEditModal();
    } else {
      const err = document.getElementById('pinModalErr');
      if (err) err.style.display = 'block';
      loginPinVal = '';
      setTimeout(() => {
        updateLoginDots();
        if (err) err.style.display = 'none';
      }, 1000);
    }
  }
}

function updateLoginDots() {
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById('lpd' + i);
    if (el) el.classList.toggle('filled', i < loginPinVal.length);
  }
}

function showCrewEditModal() {
  let html = '';

  for (let R = 1; R <= 16; R++) {
    const colleagues = APP.crew[R] || [];

    const rows = [0, 1, 2, 3, 4].map(k => {
      const c = colleagues[k] || { code: '', phone: '', name: '' };

      return `
        <div class="colleague-edit-row" data-r="${R}" data-k="${k}">
          <input class="code-inp" data-r="${R}" data-k="${k}" data-f="code" value="${c.code}" placeholder="Code" oninput="crewSave()">
          <input class="phone-inp" data-r="${R}" data-k="${k}" data-f="phone" value="${c.phone}" placeholder="+39..." oninput="crewSave()">
          <input data-r="${R}" data-k="${k}" data-f="name" value="${c.name}" placeholder="Name" oninput="crewSave()">
        </div>
      `;
    }).join('');

    html += `
      <div style="margin-bottom:18px">
        <div style="font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--blue); margin-bottom:6px">Roster ${R}</div>
        <div style="font-size:10px; color:var(--text3); display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-bottom:4px">
          <span>Code</span><span>WhatsApp</span><span>Name</span>
        </div>
        ${rows}
      </div>
    `;
  }

  document.getElementById('settingModalTitle').textContent = 'Edit Crew Directory';
  document.getElementById('settingModalBody').innerHTML = `
    <div style="max-height:62vh; overflow-y:auto">${html}</div>
    <button class="btn secondary" style="margin-top:10px" onclick="closeModal('settingModal'); renderCrewList(); runSwap()">Done</button>
  `;
  document.getElementById('settingModal').classList.add('open');
}

function crewSave() {
  document.querySelectorAll('.colleague-edit-row').forEach(row => {
    const R = parseInt(row.dataset.r);
    const k = parseInt(row.dataset.k);

    if (!APP.crew[R]) {
      APP.crew[R] = Array.from({ length: 5 }, () => ({ code: '', phone: '', name: '' }));
    }

    ['code', 'phone', 'name'].forEach(f => {
      const inp = row.querySelector(`input[data-f="${f}"]`);
      if (inp) {
        if (!APP.crew[R][k]) APP.crew[R][k] = {};
        APP.crew[R][k][f] = f === 'code'
          ? inp.value.trim().toUpperCase()
          : inp.value.trim();
      }
    });
  });

  save();
}

function exportCrew() {
  crewSave();
  const enc = btoa(unescape(encodeURIComponent(JSON.stringify(APP.crew))));
  document.getElementById('exportText').value = enc;
  document.getElementById('exportBox').style.display = 'block';
  document.getElementById('importBox').style.display = 'none';
}

function copyExport() {
  const t = document.getElementById('exportText').value;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(t);
  } else {
    document.execCommand('copy');
  }

  const m = document.getElementById('exportMsg');
  if (m) {
    m.style.display = 'block';
    setTimeout(() => { m.style.display = 'none'; }, 2000);
  }
}

function showImport() {
  document.getElementById('importBox').style.display = 'block';
  document.getElementById('exportBox').style.display = 'none';
}

function importCrew() {
  const raw = document.getElementById('importText').value.trim();
  const msg = document.getElementById('importMsg');

  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(raw))));
    if (typeof data !== 'object' || !data['1']) throw new Error();

    APP.crew = data;
    save();
    renderCrewList();
    runSwap();

    msg.textContent = 'Imported!';
    msg.style.color = 'var(--blue)';
    msg.style.display = 'block';
    document.getElementById('importText').value = '';

    setTimeout(() => {
      document.getElementById('importBox').style.display = 'none';
      msg.style.display = 'none';
    }, 2000);
  } catch (e) {
    msg.textContent = 'Invalid code.';
    msg.style.color = 'var(--red)';
    msg.style.display = 'block';
  }
}

window.toggleCrewCard = toggleCrewCard;
window.crewPinKey = crewPinKey;
window.checkCrewPassword = checkCrewPassword;
window.lockCrew = lockCrew;
window.openCrewEdit = openCrewEdit;
window.loginPin = loginPin;
window.crewSave = crewSave;
window.exportCrew = exportCrew;
window.copyExport = copyExport;
window.showImport = showImport;
window.importCrew = importCrew;
