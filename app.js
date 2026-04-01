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
  if (!APP.notif) APP.notif = { enabled: false, report: true, dep: 'first', arr: 'last' };

  applyTheme();
  renderHome();
  renderSettings();

  setTimeout(() => {
    initModalSwipe();
    if (APP.notif?.enabled) scheduleAllNotifications();
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
  document.getElementById('setupDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('step1').classList.add('active');
  document.getElementById('step2').classList.remove('active');
  document.getElementById('step3').classList.remove('active');
}
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('step1').classList.add('active');
  document.getElementById('step2').classList.remove('active');
  document.getElementById('step3').classList.remove('active');
}
