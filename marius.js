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
const MARIUS_DEFAULT_SEASON_START = '2026-11-01';

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
  const rosterSet = new Set(draft.candidates.map(c => c.roster).filter(Boolean));

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
            ? `${dayCount} flying day${dayCount===1?'':'s'} from ${rosterSet.size} roster${rosterSet.size===1?'':'s'} collected`
            : 'Build the new season schedule from colleagues’ rosters'}
        </div>
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

// ══════════════════════════════════════════════════════════════
// SCHEDULE BUILDER — data layer (Part 1)
// ══════════════════════════════════════════════════════════════
//
// Draft shape (APP.scheduleBuilder):
//   {
//     seasonStart: 'YYYY-MM-DD',
//     candidates: [
//       {
//         id, roster, date, dow,            // dow 0..6 (0=Sun)
//         shift: 'early'|'late',            // detected from flight times
//         aircraft: 'a1'|'a2'|null,         // from AI assignment, null if CUSTOM
//         flights: [{from,to,dep,arr}],     // Italy local time, sorted
//         importedAt
//       }, ...
//     ]
//   }
//
// Part 1 only ACCUMULATES candidates. The grid that merges them per
// day/aircraft/shift (with conflict + completeness colouring) is Part 2.

function _sbGetDraft() {
  if (!APP.scheduleBuilder || typeof APP.scheduleBuilder !== 'object') {
    APP.scheduleBuilder = { seasonStart: MARIUS_DEFAULT_SEASON_START, candidates: [] };
  }
  if (!Array.isArray(APP.scheduleBuilder.candidates)) APP.scheduleBuilder.candidates = [];
  if (!APP.scheduleBuilder.seasonStart) APP.scheduleBuilder.seasonStart = MARIUS_DEFAULT_SEASON_START;
  return APP.scheduleBuilder;
}

function _sbSortFlights(flights) {
  const toMin = t => { if (!t || !t.includes(':')) return 99999; const [h,m] = t.split(':').map(Number); return h*60+m; };
  return [...flights].sort((a,b) => toMin(a.dep) - toMin(b.dep));
}

// Turn the raw AI day objects (same shape the normal import receives) into
// schedule-builder candidates. Reuses the UTC→Italy conversion helpers from
// roster-import.js so times match the rest of the app. Does NOT write to
// APP.assignments / APP.customFlights — the personal calendar is untouched.
function _sbCandidatesFromVision(days, rosterNum) {
  const draft = _sbGetDraft();
  const seasonStart = draft.seasonStart;
  const out = [];

  for (const d of days) {
    if (!d.date) continue;
    // Season cutoff: ignore anything before the new schedule starts.
    if (seasonStart && d.date < seasonStart) continue;

    // Only flying days matter for the schedule. OFF/HSBY/AD/leave are skipped.
    const isFlight = (d.flights && d.flights.length > 0) &&
                     d.type !== 'off' && d.type !== 'hsby' && d.type !== 'ad';
    if (!isFlight) continue;

    const offset = _italyOffset(d.date);
    const flights = _sbSortFlights(d.flights.map(f => ({
      from: f.from || 'PSR',
      to:   f.to   || '',
      dep:  f.dep ? _addHoursToTime(f.dep, offset) : '',
      arr:  f.arr ? _addHoursToTime(f.arr, offset) : '',
    })));

    // Detect early/late from the bulk of flown minutes (same rule as import).
    const toM = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
    const noon = 720;
    let before = 0, after = 0;
    for (const f of flights) {
      if (!f.dep || !f.arr) continue;
      let s = toM(f.dep), e = toM(f.arr);
      if (e <= s) e += 1440;
      before += Math.max(0, Math.min(e, noon) - s);
      after  += Math.max(0, e - Math.max(s, noon));
    }
    const shift = after > before ? 'late' : 'early';

    // Aircraft from AI assignment when it was confident (A1x/A2x), else null.
    let aircraft = null;
    if (d.assignment === 'A1E' || d.assignment === 'A1L') aircraft = 'a1';
    else if (d.assignment === 'A2E' || d.assignment === 'A2L') aircraft = 'a2';

    const dow = new Date(d.date + 'T12:00:00').getDay();

    out.push({
      id: `${rosterNum||'?'}-${d.date}-${Math.random().toString(36).slice(2,7)}`,
      roster: rosterNum || null,
      date: d.date,
      dow,
      shift,
      aircraft,
      flights,
      importedAt: Date.now(),
    });
  }
  return out;
}

// Merge new candidates into the draft, de-duplicating exact repeats
// (same roster + same date) so re-importing the same roster doesn't pile up.
function _sbAddCandidates(newOnes) {
  const draft = _sbGetDraft();
  for (const c of newOnes) {
    const dupIdx = draft.candidates.findIndex(
      x => x.roster === c.roster && x.date === c.date
    );
    if (dupIdx >= 0) draft.candidates[dupIdx] = c; // replace with fresh read
    else draft.candidates.push(c);
  }
  save();
}

// ══════════════════════════════════════════════════════════════
// SCHEDULE BUILDER — screen (Part 1 UI: collect & review raw candidates)
// ══════════════════════════════════════════════════════════════
function openScheduleBuilder() {
  const title = document.getElementById('settingModalTitle');
  const body  = document.getElementById('settingModalBody');
  if (!title || !body) return;

  const draft = _sbGetDraft();

  // Group candidates by day-of-week for a quick completeness read.
  const DOWNAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const byDow = {};
  for (let i = 0; i < 7; i++) byDow[i] = { a1: new Set(), a2: new Set(), unknown: 0 };
  for (const c of draft.candidates) {
    if (c.aircraft === 'a1') byDow[c.dow].a1.add(c.shift);
    else if (c.aircraft === 'a2') byDow[c.dow].a2.add(c.shift);
    else byDow[c.dow].unknown++;
  }

  // Monday-first display order.
  const order = [1,2,3,4,5,6,0];
  const gridRows = order.map(dow => {
    const g = byDow[dow];
    const cell = set => {
      const e = set.has('early'), l = set.has('late');
      const dot = ok => `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${ok?'var(--green)':'var(--border)'};margin:0 1px"></span>`;
      return `${dot(e)}${dot(l)}`;
    };
    return `
      <div style="display:grid;grid-template-columns:48px 1fr 1fr 40px;align-items:center;
                  gap:6px;padding:7px 8px;border-bottom:1px solid var(--border);font-size:12px">
        <div style="font-weight:700;color:var(--text)">${DOWNAMES[dow]}</div>
        <div style="text-align:center">${cell(g.a1)}</div>
        <div style="text-align:center">${cell(g.a2)}</div>
        <div style="text-align:center;color:var(--text3);font-size:11px">${g.unknown||''}</div>
      </div>`;
  }).join('');

  const total = draft.candidates.length;
  const rosterSet = new Set(draft.candidates.map(c => c.roster).filter(Boolean));

  title.textContent = '🗓️ Schedule Builder';
  body.innerHTML = `
    <div style="font-size:12px;color:var(--text2);line-height:1.6;margin-bottom:12px">
      Load rosters from colleagues (different roster numbers) to collect the
      new season's flights. Only flights from
      <strong>${draft.seasonStart}</strong> onward are kept. Your own calendar
      is never touched.
    </div>

    <div style="display:flex;gap:8px;margin-bottom:14px">
      <div class="marius-stat">
        <div class="marius-stat-num">${total}</div>
        <div class="marius-stat-lbl">flying days</div>
      </div>
      <div class="marius-stat">
        <div class="marius-stat-num">${rosterSet.size}</div>
        <div class="marius-stat-lbl">rosters</div>
      </div>
    </div>

    <button class="btn" onclick="sbImportRoster()" style="margin-bottom:6px">
      📷 Load a roster
    </button>
    <div style="font-size:11px;color:var(--text3);text-align:center;margin-bottom:16px">
      You'll pick whose roster it is after the AI reads it
    </div>

    <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;
                color:var(--text3);margin-bottom:6px">Coverage (Early · Late)</div>
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;
                overflow:hidden;margin-bottom:6px">
      <div style="display:grid;grid-template-columns:48px 1fr 1fr 40px;gap:6px;padding:7px 8px;
                  border-bottom:1px solid var(--border);font-size:10px;font-weight:700;
                  letter-spacing:0.5px;color:var(--text3);text-transform:uppercase">
        <div>Day</div><div style="text-align:center">Aereo 1</div>
        <div style="text-align:center">Aereo 2</div><div style="text-align:center">?</div>
      </div>
      ${gridRows}
    </div>
    <div style="font-size:11px;color:var(--text3);line-height:1.5;margin-bottom:16px">
      Green dots = that shift is covered for that aircraft. The "?" column counts
      days the AI couldn't assign to an aircraft — you'll place those in Part 2.
    </div>

    ${total ? `
      <button class="btn secondary" onclick="sbClearDraft()"
              style="color:var(--red);border-color:var(--red)">
        🗑️ Clear all collected data
      </button>` : ''}

    <button class="btn secondary" style="margin-top:8px" onclick="openMariusPanel()">
      ← Back
    </button>
  `;
  document.getElementById('settingModal').classList.add('open');
}

function sbClearDraft() {
  if (!confirm('Clear all collected schedule data? This cannot be undone.')) return;
  const start = _sbGetDraft().seasonStart;
  APP.scheduleBuilder = { seasonStart: start, candidates: [] };
  save();
  openScheduleBuilder();
}

// ── Schedule-only import: read a roster, DON'T touch the calendar ──
function sbImportRoster() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.cssText = 'position:fixed;top:-100px;left:-100px;opacity:0;width:1px;height:1px';
  document.body.appendChild(input);

  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    document.body.removeChild(input);
    if (!file) return;

    _showImportOverlay('Reading roster…\nThis can take up to 1 minute\n⚠️ Please don\'t close the app');

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/import-roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType: file.type || 'image/jpeg', role: 'cabin' }),
      });
      const result = await response.json();
      _hideImportOverlay();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `Server error ${response.status}`);
      }
      if (!result.days || result.days.length === 0) {
        _showImportError('No roster data found. Try a clearer screenshot.');
        return;
      }

      // Stash the raw days; we ask which roster this belongs to before saving.
      window._sbPendingDays = result.days;
      _sbAskRoster();

    } catch (err) {
      _hideImportOverlay();
      console.error('Schedule-builder import error:', err);
      _showImportError('Error: ' + (err.message || 'Unknown error'));
    }
  };

  setTimeout(() => input.click(), 80);
}

// After a successful read, ask whose roster it is (so candidates are tagged
// and we can tell a 2-roster confirmation from a single source later).
function _sbAskRoster() {
  const days = window._sbPendingDays || [];
  const draft = _sbGetDraft();
  const flyingPreview = days.filter(d =>
    d.flights && d.flights.length > 0 && d.type !== 'off' && d.type !== 'hsby' && d.type !== 'ad'
  );
  const afterCutoff = flyingPreview.filter(d => !draft.seasonStart || d.date >= draft.seasonStart);

  const title = document.getElementById('settingModalTitle');
  const body  = document.getElementById('settingModalBody');

  const opts = [];
  for (let r = 1; r <= 16; r++) opts.push(`<option value="${r}">Roster ${r}</option>`);

  title.textContent = 'Whose roster is this?';
  body.innerHTML = `
    <div style="font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:14px">
      The AI found <strong>${flyingPreview.length}</strong> flying day${flyingPreview.length===1?'':'s'},
      <strong>${afterCutoff.length}</strong> of them on/after ${draft.seasonStart}.
      Select which roster this screenshot belongs to.
    </div>
    <select id="sbRosterSelect" style="margin-bottom:14px">
      <option value="">— Select roster —</option>
      ${opts.join('')}
    </select>
    <button class="btn" onclick="sbConfirmRoster()">Add to schedule</button>
    <button class="btn secondary" style="margin-top:8px"
            onclick="window._sbPendingDays=null; openScheduleBuilder()">Cancel</button>
  `;
  document.getElementById('settingModal').classList.add('open');
}

function sbConfirmRoster() {
  const sel = document.getElementById('sbRosterSelect');
  const rosterNum = sel && sel.value ? parseInt(sel.value) : null;
  if (!rosterNum) { alert('Please select which roster this is.'); return; }

  const days = window._sbPendingDays || [];
  const candidates = _sbCandidatesFromVision(days, rosterNum);
  _sbAddCandidates(candidates);
  window._sbPendingDays = null;

  // Confirmation toast then back to the builder.
  _showImportError(`✓ Added ${candidates.length} flying day${candidates.length===1?'':'s'} from Roster ${rosterNum}.`);
  const ov = document.getElementById('importOverlay');
  if (ov) {
    const icon = ov.querySelector('div');
    if (icon) icon.textContent = '✅';
  }
  setTimeout(() => {
    const o = document.getElementById('importOverlay');
    if (o) o.remove();
    openScheduleBuilder();
  }, 1200);
}

// ── Boot: restore chrome if already unlocked ─────────────────────
function initMariusMode() {
  if (APP.mariusMode) applyMariusChrome();
}

window.mariusLogoTap     = mariusLogoTap;
window.mariusCheckPassword = mariusCheckPassword;
window.exitMariusMode    = exitMariusMode;
window.openMariusPanel   = openMariusPanel;
window.openScheduleBuilder = openScheduleBuilder;
window.sbImportRoster    = sbImportRoster;
window.sbConfirmRoster   = sbConfirmRoster;
window.sbClearDraft      = sbClearDraft;
window.initMariusMode    = initMariusMode;
