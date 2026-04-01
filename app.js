// ══════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════
let APP = {
  roster: null,
  refDate: null,
  pin: null,
  crew: {},
  notif: {
    enabled: false,
    report: true,
    dep: 'first',   // 'none' | 'first' | 'all'
    arr: 'last',    // 'none' | 'last' | 'all'
  },
  customFlights: {},  // { '2026-04-15': [{from,to,dep,arr}] }
  assignDetails: {},  // { "2026-04-15": { start: "08:00", end: "16:00" } }
};

const DOW   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

let calYear, calMonth;
let setupPinVal = '';
let loginPinVal = '';
let crewUnlocked = false;


// ══════════════════════════════════════════════════════════════
// SETUP
// ══════════════════════════════════════════════════════════════
function setupNext() {
  const r = document.getElementById('setupRoster').value;
  const d = document.getElementById('setupDate').value;
  if (!r || !d) { alert('Please fill in both fields.'); return; }
  APP.roster = parseInt(r);
  APP.refDate = d;
  for (let i = 1; i <= 16; i++) {
    if (!APP.crew[i]) APP.crew[i] = Array.from({length:5}, () => ({code:'',phone:'',name:''}));
  }
  document.getElementById('step1').classList.remove('active');
  document.getElementById('step2').classList.add('active');
}

function setupPin(k) {
  if (k === 'skip') { APP.pin = null; showWelcome(); return; }
  if (k === 'del')  { setupPinVal = setupPinVal.slice(0,-1); }
  else if (setupPinVal.length < 4) { setupPinVal += k; }
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById('spd' + i);
    if (el) el.classList.toggle('filled', i < setupPinVal.length);
  }
  if (setupPinVal.length === 4) { APP.pin = setupPinVal; setTimeout(showWelcome, 300); }
}

function showWelcome() {
  document.getElementById('step2').classList.remove('active');
  document.getElementById('step3').classList.add('active');
}

function finishSetup() {
  save();
  document.getElementById('setupScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'flex';
  initApp();
}

// ══════════════════════════════════════════════════════════════
// CREW PIN GATE
// ══════════════════════════════════════════════════════════════
let crewPinVal = '';

function crewPinKey(k) {
  if (k === 'del') crewPinVal = crewPinVal.slice(0,-1);
  else if (crewPinVal.length < 4) crewPinVal += k;
  updateCrewPinDots();
  if (crewPinVal.length === 4) {
    if (crewPinVal === APP.pin) {
      crewUnlocked = true;
      showCrewContent();
    } else {
      document.getElementById('crewPinErr').style.display = 'block';
      crewPinVal = '';
      setTimeout(() => { updateCrewPinDots(); document.getElementById('crewPinErr').style.display='none'; }, 1000);
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
    if (err) { err.style.display = 'block'; }
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
  document.getElementById('crewPinGate').style.display = 'none';
  document.getElementById('crewContent').style.display = 'block';
  renderCrewList();
}

function lockCrew() {
  crewUnlocked = false;
  crewPinVal = '';
  document.getElementById('crewPinGate').style.display = 'block';
  document.getElementById('crewContent').style.display = 'none';
  updateCrewPinDots();
}

// ══════════════════════════════════════════════════════════════
// SHARE & TUTORIAL
// ══════════════════════════════════════════════════════════════
function checkForUpdates() {
  const btn = document.getElementById('updateBtn');
  const msg = document.getElementById('updateMsg');
  btn.textContent = '⏳ Checking...';
  btn.disabled = true;
  msg.style.display = 'none';

  if (!navigator.onLine) {
    btn.innerHTML = '🔄 Check for updates';
    btn.disabled = false;
    msg.textContent = '✈️ Sei offline — sei già alla versione più recente installata!';
    msg.style.color = 'var(--yellow)';
    msg.style.display = 'block';
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  fetch(location.href, { method: 'HEAD', cache: 'no-store', signal: controller.signal })
    .then(res => {
      clearTimeout(timeout);
      if (!res || !res.ok) throw new Error('null or bad response');
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage('FORCE_UPDATE');
        setTimeout(() => location.reload(), 2000);
      } else {
        location.reload();
      }
    })
    .catch(err => {
      clearTimeout(timeout);
      btn.innerHTML = '🔄 Check for updates';
      btn.disabled = false;
      const isOffline = err.name === 'AbortError' || !navigator.onLine;
      msg.textContent = isOffline
        ? '✈️ Sei offline — sei già alla versione più recente installata!'
        : '⚠️ Impossibile raggiungere il server. Riprova quando sei connesso.';
      msg.style.color = 'var(--yellow)';
      msg.style.display = 'block';
    });
}



function shareApp() {
  if (navigator.share) {
    navigator.share({
      title: 'CrewPSR',
      text: 'Pescara cabin crew roster app — installa su iPhone o Android!',
      url: 'https://crew-psr-wyvq.vercel.app'
    }).catch(() => {});
  } else {
    navigator.clipboard && navigator.clipboard.writeText('https://crew-psr-wyvq.vercel.app');
    alert('Link copiato! https://crew-psr-wyvq.vercel.app');
  }
}

function toggleInfoSection(bodyId, arrowId) {
  const body = document.getElementById(bodyId);
  const arrow = document.getElementById(arrowId);
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  if (arrow) arrow.textContent = open ? '›' : '˅';
}

// ══════════════════════════════════════════════════════════════
// LANGUAGE
// ══════════════════════════════════════════════════════════════
function setLang(lang) {
  APP.lang = lang;
  save();
  renderSettings();
}

// ══════════════════════════════════════════════════════════════
// NAV (defined above, this is placeholder — actual nav defined above)
// ══════════════════════════════════════════════════════════════

function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function closeDayDetail() {
  document.getElementById('dayDetailScreen').style.display = 'none';
  renderHome();
  renderCalendar();
}

// ══════════════════════════════════════════════════════════════
// CREW DIRECTORY
// ══════════════════════════════════════════════════════════════
function renderCrewList() {
  const el = document.getElementById('crewList');
  let html = '';
  for (let R = 1; R <= 16; R++) {
    const colleagues = (APP.crew[R] || []).filter(c => c && c.code && c.code.trim());
    const pills = colleagues.map(c => {
      const phone = (c.phone||'').replace(/[\s\-\+]/g,'');
      const name = c.name || c.code;
      return phone
        ? `<a class="wa-pill" href="https://wa.me/${phone}" target="_blank" style="margin:2px">${name}</a>`
        : `<span style="font-family:'JetBrains Mono',monospace; font-size:12px; background:var(--bg2); padding:3px 8px; border-radius:6px; margin:2px">${name}</span>`;
    }).join('');
    html += `<div class="crew-roster-card">
      <div class="crew-roster-header" onclick="toggleCrewCard(${R})">
        <div style="display:flex; align-items:center; gap:10px">
          <span class="roster-pill">Roster ${R}</span>
          <span style="font-size:12px; color:var(--text3)">${colleagues.length ? colleagues.length + ' crew' : 'empty'}</span>
        </div>
        <span id="ca-${R}" style="color:var(--text3); font-size:13px">›</span>
      </div>
      <div class="crew-roster-body" id="cb-${R}">
        ${pills || '<div style="font-size:12px; color:var(--text3)">No crew added yet</div>'}
      </div>
    </div>`;
  }
  el.innerHTML = html;
}

function toggleCrewCard(R) {
  const b = document.getElementById('cb-' + R);
  const a = document.getElementById('ca-' + R);
  b.classList.toggle('open');
  a.textContent = b.classList.contains('open') ? '˅' : '›';
}

function openCrewEdit() {
  showCrewEditModal();
}

function loginPin(k) {
  if (k === 'del') loginPinVal = loginPinVal.slice(0,-1);
  else if (loginPinVal.length < 4) loginPinVal += k;
  updateLoginDots();
  if (loginPinVal.length === 4) {
    if (loginPinVal === APP.pin) {
      crewUnlocked = true;
      closeModal('pinModal');
      showCrewEditModal();
    } else {
      document.getElementById('pinModalErr').style.display = 'block';
      loginPinVal = '';
      setTimeout(() => { updateLoginDots(); document.getElementById('pinModalErr').style.display='none'; }, 1000);
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
    const rows = [0,1,2,3,4].map(k => {
      const c = colleagues[k] || {code:'',phone:'',name:''};
      return `<div class="colleague-edit-row" data-r="${R}" data-k="${k}">
        <input class="code-inp" data-r="${R}" data-k="${k}" data-f="code" value="${c.code||''}" placeholder="Code" oninput="crewSave()">
        <input class="phone-inp" data-r="${R}" data-k="${k}" data-f="phone" value="${c.phone||''}" placeholder="+39..." oninput="crewSave()">
        <input data-r="${R}" data-k="${k}" data-f="name" value="${c.name||''}" placeholder="Name" oninput="crewSave()">
      </div>`;
    }).join('');
    html += `<div style="margin-bottom:18px">
      <div style="font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--blue); margin-bottom:6px">Roster ${R}</div>
      <div style="font-size:10px; color:var(--text3); display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-bottom:4px"><span>Code</span><span>WhatsApp</span><span>Name</span></div>
      ${rows}
    </div>`;
  }

  document.getElementById('settingModalTitle').textContent = 'Edit Crew Directory';
  document.getElementById('settingModalBody').innerHTML =
    `<div style="max-height:62vh; overflow-y:auto">${html}</div>
     <button class="btn secondary" style="margin-top:10px" onclick="closeModal('settingModal'); renderCrewList(); runSwap()">Done</button>`;
  document.getElementById('settingModal').classList.add('open');
}

function crewSave() {
  document.querySelectorAll('.colleague-edit-row').forEach(row => {
    const R = parseInt(row.dataset.r);
    const k = parseInt(row.dataset.k);
    if (!APP.crew[R]) APP.crew[R] = Array.from({length:5}, () => ({code:'',phone:'',name:''}));
    ['code','phone','name'].forEach(f => {
      const inp = row.querySelector(`input[data-f="${f}"]`);
      if (inp) {
        if (!APP.crew[R][k]) APP.crew[R][k] = {};
        APP.crew[R][k][f] = f === 'code' ? inp.value.trim().toUpperCase() : inp.value.trim();
      }
    });
  });
  save();
}

// ══════════════════════════════════════════════════════════════
// EXPORT / IMPORT
// ══════════════════════════════════════════════════════════════
function exportCrew() {
  crewSave();
  const enc = btoa(unescape(encodeURIComponent(JSON.stringify(APP.crew))));
  document.getElementById('exportText').value = enc;
  document.getElementById('exportBox').style.display = 'block';
  document.getElementById('importBox').style.display = 'none';
}

function copyExport() {
  const t = document.getElementById('exportText').value;
  navigator.clipboard ? navigator.clipboard.writeText(t) : document.execCommand('copy');
  const m = document.getElementById('exportMsg');
  m.style.display = 'block';
  setTimeout(() => m.style.display = 'none', 2000);
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
    if (typeof data !== 'object' || !data[1]) throw new Error();
    APP.crew = data;
    save(); renderCrewList();
    msg.textContent = '✅ Imported!'; msg.style.color = 'var(--blue)'; msg.style.display = 'block';
    document.getElementById('importText').value = '';
    setTimeout(() => { document.getElementById('importBox').style.display='none'; msg.style.display='none'; }, 2000);
  } catch(e) {
    msg.textContent = '❌ Invalid code.'; msg.style.color = 'var(--red)'; msg.style.display = 'block';
  }
}


// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
function initApp() {
  for (let i = 1; i <= 16; i++) {
    if (!APP.crew[i]) APP.crew[i] = Array.from({length:5}, () => ({code:'',phone:'',name:''}));
  }
  if (!APP.assignments) APP.assignments = {};
  if (!APP.assignDetails) APP.assignDetails = {};
  if (!APP.customFlights) APP.customFlights = {};
  if (!APP.notif) APP.notif = { enabled: false, report: true, dep: 'first', arr: 'last' };
  applyTheme();
  renderHome();
  renderSettings();
  setTimeout(() => { initModalSwipe(); if (APP.notif?.enabled) scheduleAllNotifications(); }, 100);
}

// Boot
if (load() && APP.roster && APP.refDate) {
  document.getElementById('setupScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'flex';
  initApp();
} else {
  document.getElementById('setupDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('step1').classList.add('active');
  document.getElementById('step2').classList.remove('active');
  document.getElementById('step3').classList.remove('active');
}
