// ══════════════════════════════════════════════════════════════
// MARIUS MODE — hidden admin panel (local only)
// ══════════════════════════════════════════════════════════════
//
// A maintenance panel only the app owner sees. Unlocked by tapping the
// CrewPSR logo 3 times, then entering the admin password. The unlocked
// flag lives in localStorage (APP.mariusMode) so it persists, but it
// grants NOTHING on the server — everything here is local tooling that
// helps Marius prepare updates that are then shipped to everyone the
// normal way (new app version on GitHub/Vercel).
//
// Part 1 (this file): unlock + distinct admin UI + Schedule Builder's
//   data layer: import colleagues' rosters to ACCUMULATE flight data into
//   a local draft, WITHOUT touching the personal calendar/assignments.
// Part 2 (later): the visual 7×2 grid, manual A1↔A2 / early↔late moves,
//   conflict resolution, "no flights" marking, and code export.
//
// Extension points left open for later admin features: renderMariusPanel()
// is a simple tile list — diagnostics and in-app user approval each become
// one more tile + one more render function.

const MARIUS_PWD = 'Marius87';

// How many logo taps unlock the password prompt, and the time window.
const MARIUS_TAP_COUNT  = 3;
const MARIUS_TAP_WINDOW = 1500; // ms

let _mariusTaps = [];

// The schedule we build only becomes real from this date onward. Flights
// dated before it are ignored (they belong to the previous season).
// Stored on the draft so it survives reloads; this is just the default.

// ── Unlock flow ──────────────────────────────────────────────────
// Wired to the logo via onclick in index.html → mariusLogoTap().
function mariusLogoTap() {
  // Already unlocked → tapping the logo opens the panel directly.
  if (APP.mariusMode) { openMariusPanel(); return; }

  const now = Date.now();
  _mariusTaps = _mariusTaps.filter(t => now - t < MARIUS_TAP_WINDOW);
  _mariusTaps.push(now);

  if (_mariusTaps.length >= MARIUS_TAP_COUNT) {
    _mariusTaps = [];
    _promptMariusPassword();
  }
}

function _promptMariusPassword() {
  const title = document.getElementById('settingModalTitle');
  const body  = document.getElementById('settingModalBody');
  if (!title || !body) return;

  title.textContent = '🔧 Marius mode';
  body.innerHTML = `
    <div style="font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:14px">
      Enter the admin password to unlock maintenance tools.
    </div>
    <input type="password" id="mariusPwdInput" placeholder="Password"
           style="width:100%;box-sizing:border-box;margin-bottom:12px;text-align:center;
                  font-size:16px;letter-spacing:2px"
           onkeydown="if(event.key==='Enter') mariusCheckPassword()">
    <div id="mariusPwdErr" style="display:none;color:var(--red);font-size:13px;
         text-align:center;margin-bottom:10px">Wrong password</div>
    <button class="btn" onclick="mariusCheckPassword()">Unlock</button>
    <button class="btn secondary" style="margin-top:8px"
            onclick="closeModal('settingModal')">Cancel</button>
  `;
  document.getElementById('settingModal').classList.add('open');
  setTimeout(() => document.getElementById('mariusPwdInput')?.focus(), 150);
}

function mariusCheckPassword() {
  const input = document.getElementById('mariusPwdInput');
  if (!input) return;
  if (input.value !== MARIUS_PWD) {
    const err = document.getElementById('mariusPwdErr');
    if (err) err.style.display = 'block';
    input.value = '';
    input.focus();
    return;
  }
  APP.mariusMode = true;
  save();
  applyMariusChrome();
  openMariusPanel();
}

function exitMariusMode() {
  if (!confirm('Exit Marius mode? You can re-enable it by tapping the logo 3 times.')) return;
  APP.mariusMode = false;
  save();
  applyMariusChrome();
  closeModal('settingModal');
}

// ── Visual chrome: amber accent + badge while in Marius mode ─────
// Adds a body class the stylesheet keys off, plus a floating badge.
function applyMariusChrome() {
  const on = !!APP.mariusMode;
  document.body.classList.toggle('marius-mode', on);

  let badge = document.getElementById('mariusBadge');
  if (on) {
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'mariusBadge';
      badge.textContent = 'MARIUS MODE';
      badge.onclick = openMariusPanel;
      document.body.appendChild(badge);
    }
  } else if (badge) {
    badge.remove();
  }
}

// ══════════════════════════════════════════════════════════════
// PANEL
// ══════════════════════════════════════════════════════════════
function openMariusPanel() {
  const title = document.getElementById('settingModalTitle');
  const body  = document.getElementById('settingModalBody');
  if (!title || !body) return;

  const draft = _sbGetDraft();
  const dayCount = draft.candidates.length;

  title.textContent = '🔧 Marius mode';
  body.innerHTML = `
    <div style="font-size:12px;color:var(--text2);line-height:1.6;margin-bottom:16px">
      Owner tools. Everything here is local to this phone until you export
      and ship it to everyone.
    </div>

    <div class="marius-tile" onclick="openScheduleBuilder()">
      <div class="marius-tile-icon">🗓️</div>
      <div style="flex:1">
        <div class="marius-tile-title">Schedule Builder</div>
        <div class="marius-tile-sub">
          ${dayCount
            ? `${dayCount} giorni di volo raccolti`
            : 'Costruisci lo schedule dai roster dei colleghi'}
        </div>
      </div>
      <div style="color:var(--text3)">›</div>
    </div>

    <div class="marius-tile" onclick="openSalary()">
      <div class="marius-tile-icon">💶</div>
      <div style="flex:1">
        <div class="marius-tile-title">Stipendio</div>
        <div class="marius-tile-sub">Stima la busta paga dal roster (solo tu, solo locale)</div>
      </div>
      <div style="color:var(--text3)">›</div>
    </div>

    <div class="marius-tile marius-tile-muted">
      <div class="marius-tile-icon">🩺</div>
      <div style="flex:1">
        <div class="marius-tile-title">Diagnostics</div>
        <div class="marius-tile-sub">Coming soon</div>
      </div>
    </div>

    <div class="marius-tile marius-tile-muted">
      <div class="marius-tile-icon">✅</div>
      <div style="flex:1">
        <div class="marius-tile-title">Approve users</div>
        <div class="marius-tile-sub">Coming soon</div>
      </div>
    </div>

    <button class="btn secondary" style="margin-top:16px" onclick="exitMariusMode()">
      Exit Marius mode
    </button>
  `;
  document.getElementById('settingModal').classList.add('open');
}

// ── Boot: restore chrome if already unlocked ─────────────────────
function initMariusMode() {
  if (APP.mariusMode) applyMariusChrome();
}

window.mariusLogoTap     = mariusLogoTap;
window.mariusCheckPassword = mariusCheckPassword;
window.exitMariusMode    = exitMariusMode;
window.openMariusPanel   = openMariusPanel;
window.initMariusMode    = initMariusMode;
