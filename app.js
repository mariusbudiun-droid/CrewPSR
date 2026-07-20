// ══════════════════════════════════════════════════════════════
// VERSION
// ══════════════════════════════════════════════════════════════
// Bump this when releasing a new version. The number is shown in the
// Info screen footer AND used by sw.js for the cache name (so a bump
// invalidates the old cache automatically). Keep in sync with sw.js APP_VERSION.
const APP_VERSION = '1.11.6';

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

// Detected refDate from the smart import. If set, takes priority over
// the manual date input on Continue.
let _setupDetectedDate = null;

// Enables the Continue button when we have everything we need:
// roster number + (smart-detected date OR manual date)
function _refreshSetupContinueState() {
  const btn = document.getElementById('setupContinueBtn');
  if (!btn) return;
  const r = document.getElementById('setupRoster')?.value;
  const dManual = document.getElementById('setupDate')?.value;
  const ok = !!r && (!!_setupDetectedDate || !!dManual);
  btn.disabled = !ok;
  btn.style.opacity = ok ? '1' : '0.4';
}

function setupNext() {
  const r = document.getElementById('setupRoster').value;
  const dManual = document.getElementById('setupDate')?.value;
  const d = _setupDetectedDate || dManual;
  if (!r || !d) {
    alert('Please select your roster and either upload a screenshot or enter a date.');
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

// ── Smart import: upload screenshot, AI extracts roster, deduce Day 1 ──
function setupSmartImport() {
  // Need roster number first to make sense of any detected pattern.
  const r = document.getElementById('setupRoster')?.value;
  if (!r) {
    alert('Please select your Roster Number first, then upload the screenshot.');
    document.getElementById('setupRoster')?.focus();
    return;
  }

  // Reuse the existing screenshot picker mechanism.
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.display = 'none';
  input.onchange = async () => {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    await _processSetupScreenshot(file);
    input.remove();
  };
  document.body.appendChild(input);
  input.click();
}

async function _processSetupScreenshot(file) {
  const statusEl  = document.getElementById('setupSmartStatus');
  const btnEl     = document.getElementById('setupSmartBtn');
  const setStatus = msg => { if (statusEl) statusEl.textContent = msg; };
  const setBtnEnabled = on => { if (btnEl) btnEl.disabled = !on; };

  setBtnEnabled(false);
  setStatus('📤 Uploading & reading roster…');

  try {
    // Convert image to base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

    const mediaType = file.type || 'image/jpeg';

    setStatus('🤖 AI is reading… up to 1 minute. ⚠️ Don\'t close the app');

    const response = await fetch('/api/import-roster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64, mediaType, role: APP.role || 'cabin' }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'AI could not read the roster.');
    }

    const days = result.days || [];
    if (days.length === 0) {
      throw new Error('No days found in the screenshot. Try a clearer image.');
    }

    // Find Day 1: first Early day that comes after at least one OFF (start of a cycle).
    // The AI returns days sorted by date in the screenshot (usually). We resort defensively.
    days.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // Helper: is this a working/early day (A1E or A2E)?
    const isEarly = d => d.assignment === 'A1E' || d.assignment === 'A2E';
    const isOff   = d => d.type === 'off' || d.assignment === 'OFF';

    let detected = null;
    for (let i = 0; i < days.length; i++) {
      const cur = days[i];
      if (!isEarly(cur)) continue;
      // First early in the screenshot — if it's at index 0, accept (best-effort)
      if (i === 0) {
        detected = cur.date;
        break;
      }
      // Look back: previous day must be Off (start of cycle)
      const prev = days[i - 1];
      if (isOff(prev)) {
        detected = cur.date;
        break;
      }
    }

    // Fallback: if no Off→Early transition, take the first Early found at all
    if (!detected) {
      const firstEarly = days.find(isEarly);
      if (firstEarly) detected = firstEarly.date;
    }

    if (!detected) {
      throw new Error('Could not find an Early day in your roster. Please try the manual date option below.');
    }

    _setupDetectedDate = detected;

    // Format detected date nicely (e.g. "Mon, 15 Mar 2026")
    const dt = new Date(detected + 'T12:00:00');
    const pretty = dt.toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });

    setStatus(`✅ Day 1 detected: ${pretty}`);
    if (btnEl) btnEl.textContent = '📷 Use a different screenshot';
    setBtnEnabled(true);
    _refreshSetupContinueState();

  } catch (err) {
    console.error('Setup smart import error:', err);
    setStatus(`❌ ${err.message || 'Something went wrong.'} Try again or use the manual option below.`);
    setBtnEnabled(true);
  }
}

// Wire up reactive enable/disable of Continue button.
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('setupRoster')?.addEventListener('change', _refreshSetupContinueState);
  document.getElementById('setupDate')?.addEventListener('input',  _refreshSetupContinueState);
});

window.setupSmartImport = setupSmartImport;
window.setupNext = setupNext;

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

  // Show "what's new" popup if user just upgraded to a newer version
  if (typeof autoShowReleasesIfNeeded === 'function') {
    autoShowReleasesIfNeeded();
  }
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
