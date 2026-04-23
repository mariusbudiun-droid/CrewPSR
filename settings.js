function setTheme(t) {
  APP.theme = t;
  save();
  applyTheme();
  renderSettings();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', APP.theme || 'system');
}

function renderSettings() {
  document.getElementById('settingRoster').textContent =
    APP.roster ? `Roster ${APP.roster}` : '-';

  document.getElementById('settingDate').textContent =
    APP.refDate || '-';

  document.getElementById('settingSchedVersion').textContent =
    `${SCHEDULE.version} • ${SCHEDULE.period}`;

  const sel = document.getElementById('themeSelect');
  if (sel) sel.value = APP.theme || 'system';

  const n = APP.notif || {};
  const enabled = document.getElementById('notifEnabled');
  if (enabled) enabled.checked = !!n.enabled;

  document.getElementById('notifOptions').style.display =
    n.enabled ? 'block' : 'none';

  document.getElementById('notifReport').checked = n.report !== false;
  document.getElementById('notifDep').value = n.dep || 'first';
  document.getElementById('notifArr').value = n.arr || 'last';
}

function changeSetting(type) {
  const title = document.getElementById('settingModalTitle');
  const body = document.getElementById('settingModalBody');

  if (type === 'roster') {
    title.textContent = 'Change Roster';
    const opts = Array.from({ length: 16 }, (_, i) =>
      `<option value="${i + 1}" ${APP.roster == i + 1 ? 'selected' : ''}>Roster ${i + 1}</option>`
    ).join('');

    body.innerHTML = `
      <select id="chRoster">${opts}</select>
      <button class="btn" onclick="APP.roster=parseInt(document.getElementById('chRoster').value);save();renderSettings();renderHome();closeModal('settingModal')">Save</button>
      <button class="btn secondary" onclick="closeModal('settingModal')">Cancel</button>
    `;
  } else if (type === 'date') {
    title.textContent = 'Change Cycle Date';
    body.innerHTML = `
      <input type="date" id="chDate" value="${APP.refDate || ''}">
      <button class="btn" onclick="APP.refDate=document.getElementById('chDate').value;save();renderSettings();renderHome();renderCalendar();closeModal('settingModal')">Save</button>
      <button class="btn secondary" onclick="closeModal('settingModal')">Cancel</button>
    `;
  } else if (type === 'pin') {
    title.textContent = 'Sicurezza Accesso';
    body.innerHTML = `
      <div style="font-size:13px;color:var(--text2);margin-bottom:14px">Scegli come proteggere la Crew Directory</div>

      <label class="inp-label">Tipo di protezione</label>
      <select id="secType"
        onchange="
          document.getElementById('secPinF').style.display = this.value === 'pin' ? 'block' : 'none';
          document.getElementById('secPassF').style.display = this.value === 'password' ? 'block' : 'none';
        "
        style="margin-bottom:10px"
      >
        <option value="pin" ${!APP.usePassword ? 'selected' : ''}>PIN 4 cifre</option>
        <option value="password" ${APP.usePassword ? 'selected' : ''}>Password testo libero</option>
      </select>

      <div id="secPinF" style="${APP.usePassword ? 'display:none' : ''}">
        <label class="inp-label">Nuovo PIN 4 cifre</label>
        <input type="password" id="newPinTxt" maxlength="4" inputmode="numeric" placeholder="es. 1234"
          style="text-align:center;letter-spacing:6px;font-size:20px;margin-bottom:8px">
      </div>

      <div id="secPassF" style="${APP.usePassword ? '' : 'display:none'}">
        <label class="inp-label">Nuova Password</label>
        <input type="password" id="newPassTxt" placeholder="Inserisci password" style="margin-bottom:8px">
      </div>

      <button class="btn" onclick="
        const t = document.getElementById('secType').value;
        if (t === 'pin') {
          const v = document.getElementById('newPinTxt').value;
          if (v.length !== 4 || isNaN(v)) { alert('Il PIN deve essere di 4 cifre'); return; }
          APP.pin = v;
          APP.usePassword = false;
          APP.password = null;
        } else {
          const v = document.getElementById('newPassTxt').value.trim();
          if (!v) { alert('Inserisci una password'); return; }
          APP.password = v;
          APP.usePassword = true;
          APP.pin = null;
        }
        save();
        closeModal('settingModal');
        renderSettings();
      ">Salva</button>

      <button class="btn secondary" onclick="closeModal('settingModal')">Annulla</button>
    `;
  }

  document.getElementById('settingModal').classList.add('open');
}
