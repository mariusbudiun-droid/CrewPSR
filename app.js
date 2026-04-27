// ══════════════════════════════════════════════════════════════
// VERSION
// ══════════════════════════════════════════════════════════════
// Bump this when releasing a new version. The number is shown in the
// Info screen footer AND used by sw.js for the cache name (so a bump
// invalidates the old cache automatically). Keep in sync with sw.js APP_VERSION.
const APP_VERSION = '1.9.3';

// ══════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════
let APP = {
  roster: null,
  refDate: null,
  pin: null,
  crew: {},
  customFlights: {},  // { '2026-04-15': [{from,to,dep,arr}] }
  assignDetails: {},  // { "2026-04-15": { start: "08:00", end: "16:00" } }
};

const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

let calYear, calMonth;
let setupPinVal = '';


// ══════════════════════════════════════════════════════════════
// SETUP
// ══════════════════════════════════════════════════════════════
function setupNext() {
  const r = document.getElementById('setupRoster').value;
  const d = document.getElementById('setupDate').value;
  if (!r || !d) {
    alert('Please fill in both fields.');
    return;
  }

  APP.roster = parseInt(r);
  APP.refDate = d;

  for (let i = 1; i <= 16; i++) {
    if (!APP.crew[i]) {
      APP.crew[i] = Array.from({ length: 5 }, () => ({ code: '', phone: '', name: '' }));
    }
  }

  document.getElementById('step1').classList.remove('active');
  document.getElementById('step2').classList.add('active');
}

function setupPin(k) {
  if (k === 'skip') {
    APP.pin = null;
    showWelcome();
    return;
  }

  if (k === 'del') {
    setupPinVal = setupPinVal.slice(0, -1);
  } else if (setupPinVal.length < 4) {
    setupPinVal += k;
  }

  for (let i = 0; i < 4; i++) {
    const el = document.getElementById('spd' + i);
    if (el) el.classList.toggle('filled', i < setupPinVal.length);
  }

  if (setupPinVal.length === 4) {
    APP.pin = setupPinVal;
    setTimeout(showWelcome, 300);
  }
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
    if (navigator.clipboard) {
      navigator.clipboard.writeText('https://crew-psr-wyvq.vercel.app');
    }
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
// NAV
// ══════════════════════════════════════════════════════════════
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function closeDayDetail() {
  document.getElementById('dayDetailScreen').style.display = 'none';
  renderHome();
  renderCalendar();
}


// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
function initApp() {
  for (let i = 1; i <= 16; i++) {
    if (!APP.crew[i]) {
      APP.crew[i] = Array.from({ length: 5 }, () => ({ code: '', phone: '', name: '' }));
    }
  }

  if (!APP.assignments) APP.assignments = {};
  if (!APP.assignDetails) APP.assignDetails = {};
  if (!APP.customFlights) APP.customFlights = {};

  applyTheme();
  renderHome();
  renderSettings();

  // Inject version into Info footer
  const verEl = document.getElementById('appVersionFooter');
  if (verEl) verEl.textContent = `CrewPSR · Pescara Cabin Crew · v${APP_VERSION}`;

  setTimeout(() => {
    initModalSwipe();
  }, 100);
}


// ══════════════════════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════════════════════
if (load() && APP.roster && APP.refDate) {
  document.getElementById('setupScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'flex';
  initApp();
} else {
  // Recovery: if data was partially loaded (e.g. roster exists but refDate is missing),
  // pre-fill the setup wizard so the user doesn't lose context.
  const dateField = document.getElementById('setupDate');
  if (dateField) {
    dateField.value = APP.refDate || new Date().toISOString().split('T')[0];
  }
  const rosterField = document.getElementById('setupRoster');
  if (rosterField && APP.roster) rosterField.value = APP.roster;

  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('step1').classList.add('active');
  document.getElementById('step2').classList.remove('active');
  document.getElementById('step3').classList.remove('active');
}
