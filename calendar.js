// ══════════════════════════════════════════════════════════════
// INJECT STYLES
// ══════════════════════════════════════════════════════════════
(function injectStyles() {
  if (document.getElementById('dd-styles')) return;
  const s = document.createElement('style');
  s.id = 'dd-styles';
  s.textContent = `
  #dayDetailScreen {
    position: fixed; inset: 0; background: var(--bg); z-index: 200;
    display: flex; flex-direction: column; overflow: hidden;
  }
  .dd-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 16px; height: max(52px, calc(44px + env(safe-area-inset-top)));
    padding-top: env(safe-area-inset-top); background: var(--surface);
    border-bottom: 1px solid var(--border); flex-shrink: 0; gap: 8px;
  }
  .dd-back {
    background: none; border: none; font-family: 'Outfit', sans-serif;
    font-size: 15px; font-weight: 600; color: var(--blue); cursor: pointer;
    padding: 4px 0; white-space: nowrap;
  }
  .dd-daynav { display: flex; gap: 6px; flex-shrink: 0; }
  .dd-navbtn {
    background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
    font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 600;
    color: var(--text2); cursor: pointer; padding: 5px 10px; white-space: nowrap;
  }
  .dd-body { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 20px 16px 8px; }
  .dd-date-block { margin-bottom: 20px; }
  .dd-date { font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 8px; line-height: 1.2; }
  .dd-cycle-badge {
    display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
  }
  .dd-cycle-badge.early { background: var(--early-lt); color: var(--early); }
  .dd-cycle-badge.late { background: var(--late-lt); color: var(--late); }
  .dd-cycle-badge.off { background: var(--off-lt); color: var(--off); }
  .dd-cycle-sub { font-size: 12px; color: var(--text3); margin-top: 5px; }
  .dd-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 14px; padding: 14px 16px; margin-bottom: 12px;
  }
  .dd-report {
    display: flex; align-items: baseline; gap: 10px; padding-bottom: 12px;
    border-bottom: 1px solid var(--border); margin-bottom: 2px;
  }
  .dd-report-label {
    font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
    text-transform: uppercase; color: var(--text3);
  }
  .dd-report-time {
    font-size: 28px; font-weight: 800; color: var(--blue);
    font-family: 'JetBrains Mono', monospace; letter-spacing: -1px;
  }
  .dd-hours-badge {
    margin-left: auto; font-size: 13px; font-weight: 700; color: var(--text3);
    font-family: 'JetBrains Mono', monospace;
  }
  .dd-plane-label {
    font-size: 11px; font-weight: 700; letter-spacing: 1.2px;
    text-transform: uppercase; color: var(--text3); margin: 12px 0 0;
  }
  .dd-flight-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 9px 0; border-bottom: 1px solid var(--border);
  }
  .dd-flight-row:last-child { border-bottom: none; }
  .dd-flight-route {
    font-family: 'JetBrains Mono', monospace; font-size: 13px;
    font-weight: 700; color: var(--text);
  }
  .dd-flight-times { font-size: 13px; color: var(--text2); font-variant-numeric: tabular-nums; }
  .dd-hsby { border-left: 3px solid var(--yellow); }
  .dd-ad { border-left: 3px solid var(--red); }
  .dd-leave { border-left: 3px solid var(--off); }
  .dd-sick { border-left: 3px solid #e11d48; }
  .dd-duty-name { font-size: 16px; font-weight: 700; color: var(--text); }
  .dd-duty-time { font-size: 14px; color: var(--text2); margin-top: 4px; font-family: 'JetBrains Mono', monospace; }
  .dd-section { margin-bottom: 8px; }
  .dd-section-label {
    font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
    text-transform: uppercase; color: var(--text3); margin-bottom: 8px;
  }
  .dd-collapsible-header {
    display: flex; align-items: center; justify-content: space-between; padding: 10px 14px;
    border-radius: 10px; background: var(--surface); border: 1px solid var(--border);
    cursor: pointer; margin-bottom: 4px; user-select: none;
  }
  .dd-collapsible-header:active { opacity: 0.75; }
  .dd-collapsible-title { font-size: 12px; font-weight: 700; color: var(--text2); letter-spacing: 0.5px; }
  .dd-collapsible-count { font-size: 11px; color: var(--text3); font-weight: 600; }
  .dd-collapsible-arrow { font-size: 14px; color: var(--text3); transition: transform 0.2s; }
  .dd-collapsible-arrow.open { transform: rotate(90deg); }
  .dd-collapsible-body { display: none; padding: 4px 0 8px; }
  .dd-collapsible-body.open { display: block; }
  .dd-actions {
    display: flex; gap: 8px; padding: 10px 16px;
    padding-bottom: max(14px, env(safe-area-inset-bottom));
    background: var(--surface); border-top: 1px solid var(--border); flex-shrink: 0;
  }
  .dd-action-btn {
    flex: 1; padding: 10px 12px; border-radius: 10px; font-family: 'Outfit', sans-serif;
    font-size: 13px; font-weight: 700; cursor: pointer; border: 1.5px solid var(--blue);
    background: var(--blue); color: white; white-space: nowrap;
  }
  .dd-action-btn.ghost {
    background: transparent; color: var(--text2); border-color: var(--border);
    font-size: 12px; font-weight: 600; padding: 9px 12px;
  }
  .dd-action-btn.outline { background: transparent; color: var(--blue); border-color: var(--blue); }
  .dd-empty { text-align: center; padding: 24px 0 8px; color: var(--text3); font-size: 14px; }

  .cal-topbar {
    display: flex; flex-direction: column; flex-shrink: 0;
    background: var(--surface); border-bottom: 1px solid var(--border);
  }
  .cal-topbar-row1 {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 16px; height: max(52px, calc(44px + env(safe-area-inset-top)));
    padding-top: env(safe-area-inset-top);
  }
  .cal-topbar-title { font-size: 17px; font-weight: 700; color: var(--text); }
  .cal-import-btn {
    padding: 6px 12px; border-radius: 8px; border: 1.5px solid var(--border);
    background: var(--bg); font-family: 'Outfit', sans-serif; font-size: 12px;
    font-weight: 600; color: var(--text2); cursor: pointer; white-space: nowrap;
  }
  .cal-topbar-row2 {
    display: flex; align-items: center; justify-content: space-between; padding: 6px 16px 10px;
  }
  .cal-month-indicator { font-size: 14px; font-weight: 700; color: var(--text); transition: opacity 0.2s; }
  .cal-month-hours-indicator { font-size: 12px; font-weight: 600; color: var(--blue); font-family: 'JetBrains Mono', monospace; }
  .cal-scroll { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
  #screen-calendar.active { display: flex !important; flex-direction: column; overflow: hidden; }
  .cal-month-block { margin-bottom: 20px; }
  .cal-month-sentinel { display: flex; align-items: baseline; justify-content: space-between; padding: 14px 16px 6px; }
  .cal-month-name { font-size: 15px; font-weight: 700; color: var(--text); }
  .cal-month-hours { font-size: 12px; font-weight: 600; color: var(--blue); font-family: 'JetBrains Mono', monospace; }
  .cal-dow-row { display: grid; grid-template-columns: repeat(7, 1fr); padding: 4px 8px 2px; }
  .cal-dow { text-align: center; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: var(--text3); padding: 2px 0; }
  .cal-grid-inner { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; padding: 0 8px 4px; }
  .cal-day {
    aspect-ratio: 1; border-radius: 8px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; cursor: pointer; padding: 2px; min-height: 40px;
  }
  .cal-day.empty { background: transparent; cursor: default; }
  .cal-day.early { background: var(--early-lt); }
  .cal-day.late { background: var(--late-lt); }
  .cal-day.off { background: var(--off-lt); }
  .cal-day.sick { background: var(--red-lt); }
  .cal-day.today-ring { outline: 2px solid var(--blue); outline-offset: -2px; }
  .cal-dn { font-size: 13px; font-weight: 700; color: var(--text); line-height: 1; }
  .cal-sub {
    font-size: 8px; font-weight: 700; letter-spacing: 0.3px; color: var(--text2);
    line-height: 1.1; text-align: center; max-width: 100%; overflow: hidden;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }
  .cal-day.early .cal-sub { color: var(--early); }
  .cal-day.late .cal-sub { color: var(--late); }
  .cal-day.off .cal-sub { color: var(--off); }
  .cal-day.sick .cal-sub { color: var(--red); }

  .shift-type-picker { display: flex; gap: 8px; margin-top: 10px; margin-bottom: 4px; }
  .shift-type-btn {
    flex: 1; padding: 9px 8px; border-radius: 10px; border: 1.5px solid var(--border);
    background: var(--bg); font-family: 'Outfit', sans-serif; font-size: 13px;
    font-weight: 600; color: var(--text2); cursor: pointer; text-align: center;
  }
  .shift-type-btn.active-early { background: var(--early-lt); border-color: var(--early); color: var(--early); }
  .shift-type-btn.active-late { background: var(--late-lt); border-color: var(--late); color: var(--late); }
  `;
  document.head.appendChild(s);
})();

// ══════════════════════════════════════════════════════════════
// CALENDAR
// ══════════════════════════════════════════════════════════════
const CAL_PAST = 12;
const CAL_FUTURE = 24;
let _calObserver = null;
let _calScrollHandler = null;

function renderCalendar() {
  const screen = document.getElementById('screen-calendar');
  if (!screen) return;

  const today = new Date();
  const todayStr = toDateStr(today);
  const originY = today.getFullYear();
  const originM = today.getMonth();

  if (!screen.querySelector('.cal-topbar')) {
    screen.innerHTML = `
      <div class="cal-topbar">
        <div class="cal-topbar-row1">
          <span class="cal-topbar-title">Calendar</span>
          <button class="cal-import-btn" onclick="triggerRosterImport()">Import Roster</button>
        </div>
        <div class="cal-topbar-row2">
          <span class="cal-month-indicator" id="calMonthIndicator"></span>
          <span class="cal-month-hours-indicator" id="calMonthHoursIndicator"></span>
        </div>
      </div>
      <div class="cal-scroll" id="calScroll"></div>
    `;
  }

  const scrollEl = document.getElementById('calScroll');
  scrollEl.innerHTML = '';

  if (_calObserver) {
    _calObserver.disconnect();
    _calObserver = null;
  }

  const frag = document.createDocumentFragment();

  for (let offset = -CAL_PAST; offset <= CAL_FUTURE; offset++) {
    let y = originY;
    let m = originM + offset;
    while (m < 0) { m += 12; y--; }
    while (m > 11) { m -= 12; y++; }

    const block = buildMonthBlock(y, m, todayStr);
    if (offset === 0) block.id = 'cal-current-month';
    frag.appendChild(block);
  }

  scrollEl.appendChild(frag);

  requestAnimationFrame(() => {
    const cur = document.getElementById('cal-current-month');
    if (cur) cur.scrollIntoView({ block: 'start' });
    setupMonthObserver();
  });
}

function setupMonthObserver() {
  if (_calObserver) {
    _calObserver.disconnect();
    _calObserver = null;
  }

  const scrollEl = document.getElementById('calScroll');
  const topbarEl = document.querySelector('.cal-topbar');
  if (!scrollEl || !topbarEl) return;

  function updateMonthLabel() {
    const topbarBottom = topbarEl.getBoundingClientRect().bottom;
    const sentinels = document.querySelectorAll('.cal-month-sentinel');
    let current = null;

    sentinels.forEach(s => {
      const rect = s.getBoundingClientRect();
      if (rect.top <= topbarBottom + 2) current = s;
    });

    if (current) {
      const y = parseInt(current.dataset.year, 10);
      const m = parseInt(current.dataset.month, 10);
      const { ft, dp } = calcMonthHours(y, m);

      const monthEl = document.getElementById('calMonthIndicator');
      const hrsEl = document.getElementById('calMonthHoursIndicator');

      if (monthEl) monthEl.textContent = `${MONTHS[m]} ${y}`;
      if (hrsEl) {
        hrsEl.innerHTML = ft > 0
          ? `<span style="color:var(--blue)">FT ${fmtHours(ft)}</span>&nbsp;&nbsp;<span style="color:var(--text3)">DP ${fmtHours(dp)}</span>`
          : '';
      }
    }
  }

  if (_calScrollHandler) {
    scrollEl.removeEventListener('scroll', _calScrollHandler);
  }

  _calScrollHandler = updateMonthLabel;
  updateMonthLabel();
  scrollEl.addEventListener('scroll', _calScrollHandler, { passive: true });
}

function buildMonthBlock(year, month, todayStr) {
  const block = document.createElement('div');
  block.className = 'cal-month-block';

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const offset = (firstDow + 6) % 7;

  const { ft: monthFt, dp: monthDp } = calcMonthHours(year, month);
  const hrsLabel = monthFt > 0
    ? `<span style="color:var(--blue)">FT ${fmtHours(monthFt)}</span>&nbsp;&nbsp;<span style="color:var(--text3)">DP ${fmtHours(monthDp)}</span>`
    : '';

  const sentinel = document.createElement('div');
  sentinel.className = 'cal-month-sentinel';
  sentinel.dataset.year = year;
  sentinel.dataset.month = month;
  sentinel.innerHTML = `
    <span class="cal-month-name">${MONTHS[month]} ${year}</span>
    ${hrsLabel ? `<span class="cal-month-hours">${hrsLabel}</span>` : '<span></span>'}
  `;
  block.appendChild(sentinel);

  const dowRow = document.createElement('div');
  dowRow.className = 'cal-dow-row';
  ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-dow';
    el.textContent = d;
    dowRow.appendChild(el);
  });
  block.appendChild(dowRow);

  const grid = document.createElement('div');
  grid.className = 'cal-grid-inner';

  for (let i = 0; i < offset; i++) {
    const e = document.createElement('div');
    e.className = 'cal-day empty';
    grid.appendChild(e);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dow = new Date(`${ds}T12:00:00`).getDay();
    const day = cycleDay(APP.roster, ds);
    const type = shiftType(day);
    const assign = APP.assignments?.[ds];
    const detail = APP.assignDetails?.[ds];
    const sched = SCHEDULE.days[dow];
    const isToday = ds === todayStr;

    const cell = document.createElement('div');
    cell.className = `cal-day ${cellClass(assign, type, ds, detail)} ${isToday ? 'today-ring' : ''}`;
    cell.innerHTML = `
      <div class="cal-dn">${d}</div>
      ${cellSub(ds, assign, type, sched) ? `<div class="cal-sub">${cellSub(ds, assign, type, sched)}</div>` : ''}
    `;
    cell.addEventListener('click', () => openDay(ds));
    grid.appendChild(cell);
  }

  block.appendChild(grid);
  return block;
}

function cellClass(assign, type, ds, detail) {
  if (!assign) return type === 'early' ? 'early' : type === 'late' ? 'late' : 'off';

  if (assign === 'A1E' || assign === 'A2E') return 'early';
  if (assign === 'A1L' || assign === 'A2L') return 'late';
  if (assign === 'SICK') return 'sick';

  if (assign === 'HSBY' || assign === 'AD') {
    const st = detail?.shiftType;
    if (st === 'early') return 'early';
    if (st === 'late') return 'late';
    return 'off';
  }

  if (['AL', 'VTO', 'UL', 'PL'].includes(assign)) return 'off';
  if (assign === 'CUSTOM') return customClass(ds);
  return type;
}

function customClass(ds) {
  const detail = APP.assignDetails?.[ds];
  if (detail?.shiftType === 'early') return 'early';
  if (detail?.shiftType === 'late') return 'late';

  const cfl = APP.customFlights?.[ds] || [];
  const wt = cfl.filter(f => f.dep && f.arr);
  if (!wt.length) return 'early';

  const toM = t => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const noon = 720;
  let before = 0;
  let after = 0;

  for (const f of wt) {
    let s = toM(f.dep);
    let e = toM(f.arr);
    if (e < s) e += 1440;
    const legBefore = Math.max(0, Math.min(e, noon) - s);
    const legAfter = Math.max(0, e - Math.max(s, noon));
    before += legBefore;
    after += legAfter;
  }

  return after > before ? 'late' : 'early';
}

function cellSub(ds, assign, type, sched) {
  if (!assign) return type === 'off' ? 'OFF' : '';

  if (['A1E', 'A1L', 'A2E', 'A2L'].includes(assign)) {
    const useA2 = assign.startsWith('A2');
    const useLate = assign.endsWith('L');
    const plane = useA2 ? sched?.a2 : sched?.a1;
    const flights = useLate ? plane?.late : plane?.early;
    const dests = (flights || [])
      .filter(f => f.route?.startsWith('PSR-'))
      .map(f => f.route.replace('PSR-', ''));
    return dests.join(', ');
  }

  if (assign === 'CUSTOM') {
    const cfl = APP.customFlights?.[ds] || [];
    const dests = [...new Set(
      cfl
        .filter(f => f.to && f.to !== 'PSR')
        .map(f => f.to)
    )];
    return dests.length ? dests.join(', ') : 'CUSTOM';
  }

  if (assign === 'HSBY' || assign === 'AD') {
    const cfl = APP.customFlights?.[ds] || [];
    const detail = APP.assignDetails?.[ds];
    if (detail?.calledToFly && cfl.length) {
      const dests = [...new Set(
        cfl
          .filter(f => f.to && f.to !== 'PSR')
          .map(f => f.to)
      )];
      return dests.length ? dests.join(', ') : assign;
    }
    return assign;
  }

  if (assign === 'AL') return 'AL';
  if (assign === 'VTO') return 'VTO';
  if (assign === 'SICK') return 'SICK';
  if (assign === 'UL') return 'UL';
  if (assign === 'PL') return 'PL';

  return assign;
}

// ══════════════════════════════════════════════════════════════
// HOURS
// ══════════════════════════════════════════════════════════════
function calcMonthHours(year, month) {
  let ft = 0;
  let dp = 0;
  const days = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= days; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const r = calcDayFtDp(ds);
    ft += r.ft;
    dp += r.dp;
  }

  return { ft, dp };
}

function calcDayHours(ds) {
  const assign = APP.assignments?.[ds];
  if (!assign) return 0;

  const dow = new Date(`${ds}T12:00:00`).getDay();
  const sched = SCHEDULE.days[dow];
  let flights = [];

  if (assign === 'CUSTOM') {
    flights = (APP.customFlights?.[ds] || []).filter(f => f.dep && f.arr);
  } else if (['A1E', 'A1L', 'A2E', 'A2L'].includes(assign)) {
    const useA2 = assign.startsWith('A2');
    const useLate = assign.endsWith('L');
    const plane = useA2 ? sched?.a2 : sched?.a1;
    flights = (useLate ? plane?.late : plane?.early || []).filter(f => f.dep && f.arr);
  }

  return flights.reduce((sum, f) => {
    const toM = t => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    let diff = toM(f.arr) - toM(f.dep);
    if (diff < 0) diff += 1440;
    return sum + diff / 60;
  }, 0);
}

function calcDayFtDp(ds) {
  const assign = APP.assignments?.[ds];
  if (!assign) return { ft: 0, dp: 0 };

  if (assign === 'AD') {
    const detail = APP.assignDetails?.[ds];
    if (detail?.start && detail?.end) {
      const toM = t => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };
      let dp = toM(detail.end) - toM(detail.start);
      if (dp < 0) dp += 1440;
      return { ft: 0, dp: dp / 60 };
    }
    return { ft: 0, dp: 8 };
  }

  if (assign === 'HSBY') {
    const detail = APP.assignDetails?.[ds];
    if (detail?.start && detail?.end) {
      const toM = t => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };
      let dur = toM(detail.end) - toM(detail.start);
      if (dur < 0) dur += 1440;
      return { ft: 0, dp: (dur / 60) * 0.25 };
    }
    return { ft: 0, dp: 2.25 };
  }

  const dow = new Date(`${ds}T12:00:00`).getDay();
  const sched = SCHEDULE.days[dow];
  let flights = [];

  if (assign === 'CUSTOM') {
    flights = (APP.customFlights?.[ds] || []).filter(f => f.dep && f.arr);
  } else if (['A1E', 'A1L', 'A2E', 'A2L'].includes(assign)) {
    const useA2 = assign.startsWith('A2');
    const useLate = assign.endsWith('L');
    const plane = useA2 ? sched?.a2 : sched?.a1;
    flights = (useLate ? plane?.late : plane?.early || []).filter(f => f.dep && f.arr);
  }

  if (!flights.length) return { ft: 0, dp: 0 };

  const toM = t => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  let ft = 0;
  for (const f of flights) {
    let diff = toM(f.arr) - toM(f.dep);
    if (diff < 0) diff += 1440;
    ft += diff;
  }

  const firstDep = toM(flights[0].dep);
  const lastArr = toM(flights[flights.length - 1].arr);
  let dp = lastArr + 30 - firstDep - 45;
  if (dp < 0 || lastArr < firstDep) dp += 1440;

  return { ft: ft / 60, dp: dp / 60 };
}

// ══════════════════════════════════════════════════════════════
// DAY DETAIL
// ══════════════════════════════════════════════════════════════
let _ddCollapseSeq = 0;
let _detailDs = null;
let _detailSwipeBound = false;

function buildRosterCard(rosterNum, members, accentColor, labelHtml = '') {
  const peopleHtml = members.length
    ? members.map(m => {
        const name = m.name || m.code || '';
        const phone = (m.phone || '').replace(/\D/g, '');
        return phone
          ? `<a class="wa-pill" href="https://wa.me/${phone}" target="_blank" rel="noopener noreferrer" style="font-size:11px;padding:3px 8px;">${name}</a>`
          : `<span style="font-size:11px;font-weight:600;color:var(--text);white-space:nowrap;">${name}</span>`;
      }).join('')
    : `<span style="font-size:11px;color:var(--text3);">No contacts</span>`;

  return `
    <div style="display:flex;align-items:center;gap:8px;padding:5px 10px;background:var(--surface);
      border:1px solid var(--border);border-left:3px solid ${accentColor};border-radius:8px;margin-bottom:4px;">
      <div style="background:${accentColor};color:white;width:24px;height:24px;border-radius:6px;
        display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;">
        ${rosterNum}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center;">
        ${labelHtml}
        ${peopleHtml}
      </div>
    </div>
  `;
}

function ddCollapsible(title, countLabel, content, startOpen = false) {
  const id = `ddc${_ddCollapseSeq++}`;
  const openClass = startOpen ? 'open' : '';
  return `
    <div class="dd-section">
      <div class="dd-collapsible-header" onclick="ddToggle('${id}')">
        <span class="dd-collapsible-title">${title}</span>
        <span style="display:flex;align-items:center;gap:6px;">
          ${countLabel ? `<span class="dd-collapsible-count">${countLabel}</span>` : ''}
          <span class="dd-collapsible-arrow ${openClass}" id="${id}-arrow">›</span>
        </span>
      </div>
      <div class="dd-collapsible-body ${openClass}" id="${id}-body">${content}</div>
    </div>
  `;
}

function ddToggle(id) {
  const body = document.getElementById(`${id}-body`);
  const arrow = document.getElementById(`${id}-arrow`);
  if (!body) return;
  body.classList.toggle('open');
  arrow?.classList.toggle('open');
}
window.ddToggle = ddToggle;

function openDay(ds) {
  _detailDs = ds;
  const screen = document.getElementById('dayDetailScreen');
  screen.style.display = 'flex';
  renderDayDetail();
  screen.querySelector('.dd-body')?.scrollTo(0, 0);
  bindDetailSwipe(screen);
}

function closeDayDetail() {
  document.getElementById('dayDetailScreen').style.display = 'none';
  renderHome();
  renderCalendar();
}

function navDay(dir) {
  if (!_detailDs) return;
  const d = new Date(`${_detailDs}T12:00:00`);
  d.setDate(d.getDate() + dir);
  _detailDs = toDateStr(d);
  renderDayDetail();
  document.getElementById('dayDetailScreen').querySelector('.dd-body')?.scrollTo(0, 0);
}

function bindDetailSwipe(el) {
  if (_detailSwipeBound) return;
  _detailSwipeBound = true;

  let sx = 0, sy = 0, tracking = false, horiz = false;

  el.addEventListener('touchstart', e => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    tracking = true;
    horiz = false;
  }, { passive: true });

  el.addEventListener('touchmove', e => {
    if (!tracking) return;
    const dx = e.touches[0].clientX - sx;
    const dy = e.touches[0].clientY - sy;
    if (!horiz) {
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) horiz = true;
      else if (Math.abs(dy) > 12) tracking = false;
    }
  }, { passive: true });

  el.addEventListener('touchend', e => {
    if (!horiz || !tracking) {
      tracking = false;
      return;
    }
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 55) navDay(dx < 0 ? 1 : -1);
    tracking = false;
  });

  el.addEventListener('touchcancel', () => { tracking = false; });
}

function renderDayDetail() {
  _ddCollapseSeq = 0;

  const ds = _detailDs;
  const date = new Date(`${ds}T12:00:00`);
  const dow = date.getDay();
  const day = cycleDay(APP.roster, ds);
  const type = shiftType(day);
  const lbl = shiftLabel(day);
  const sched = SCHEDULE.days[dow];
  const assign = APP.assignments?.[ds];
  const detail = APP.assignDetails?.[ds];
  const isToday = ds === toDateStr(new Date());

  const prevD = new Date(date);
  prevD.setDate(prevD.getDate() - 1);
  const nextD = new Date(date);
  nextD.setDate(nextD.getDate() + 1);

  const dateLine = isToday
    ? `Today • ${DAYS_FULL[dow]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`
    : `${DAYS_FULL[dow]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;

  const badgeClass = type === 'early' ? 'early' : type === 'late' ? 'late' : 'off';
  const { ft: dayFt, dp: dayDp } = calcDayFtDp(ds);

  const hrsText = (dayFt > 0 || dayDp > 0)
    ? `
      <div style="display:flex;flex-direction:column;gap:1px;margin-left:auto;text-align:right;">
        ${dayFt > 0 ? `<div style="font-size:12px;font-weight:700;color:var(--blue);font-family:'JetBrains Mono',monospace;">Flight Time ${fmtHours(dayFt)}</div>` : ''}
        ${dayDp > 0 ? `<div style="font-size:12px;font-weight:600;color:var(--text3);font-family:'JetBrains Mono',monospace;">Duty Period ${fmtHours(dayDp)}</div>` : ''}
      </div>
    `
    : '';

  let dutyHtml = '';

  if (['A1E', 'A1L', 'A2E', 'A2L'].includes(assign)) {
    const useA2 = assign.startsWith('A2');
    const useLate = assign.endsWith('L');
    const plane = useA2 ? sched?.a2 : sched?.a1;
    const report = useLate ? plane?.reportLate : plane?.reportEarly;
    const flights = useLate ? plane?.late : plane?.early;
    const label = `${useA2 ? 'Aereo 2' : 'Aereo 1'} ${useLate ? 'Late' : 'Early'}`;
    const rows = (flights || []).map(f => `
      <div class="dd-flight-row">
        <span class="dd-flight-route">${f.route}</span>
        <span class="dd-flight-times">${f.dep} ${f.arr}</span>
      </div>
    `).join('');

    dutyHtml = `
      <div class="dd-card">
        <div class="dd-report">
          <span class="dd-report-label">Report</span>
          <span class="dd-report-time">${report || '----'}</span>
          ${hrsText}
        </div>
        <div class="dd-plane-label">${label}</div>
        ${rows}
      </div>
    `;
  } else if (assign === 'CUSTOM') {
    const cfl = APP.customFlights?.[ds] || [];
    const report = cfl.length ? calcReport(cfl) : null;
    const rows = cfl
      .filter(f => f.from && f.to)
      .map(f => `
        <div class="dd-flight-row">
          <span class="dd-flight-route">${f.from}-${f.to}</span>
          <span class="dd-flight-times">${f.dep || '----'} ${f.arr || '----'}</span>
        </div>
      `).join('');

    dutyHtml = `
      <div class="dd-card">
        ${report && report !== '----' ? `
          <div class="dd-report">
            <span class="dd-report-label">Report</span>
            <span class="dd-report-time">${report}</span>
            ${hrsText}
          </div>` : ''}
        <div class="dd-plane-label">Custom flights</div>
        ${rows || `<div style="color:var(--text3);font-size:13px;padding:8px 0;">No flights added yet</div>`}
        <button onclick="openCustomFlights('${ds}')"
          style="margin-top:10px;padding:7px 14px;border-radius:8px;border:1.5px solid var(--blue);
          background:var(--blue-lt);font-family:Outfit,sans-serif;font-size:12px;font-weight:700;
          color:var(--blue);cursor:pointer;">
          ${cfl.length ? 'Edit flights' : 'Add flights'}
        </button>
      </div>
    `;
  } else if (assign === 'HSBY') {
    const st = detail?.shiftType;
    const ts = detail?.start && detail?.end ? `${detail.start} - ${detail.end}` : detail?.start ? `from ${detail.start}` : '';
    const stLabel = st ? ` • ${st.charAt(0).toUpperCase()}${st.slice(1)}` : '';
    const cfl = (APP.customFlights?.[ds] || []).filter(f => f.from && f.to);
    const flightRows = cfl.map(f => `
      <div class="dd-flight-row">
        <span class="dd-flight-route">${f.from}-${f.to}</span>
        <span class="dd-flight-times">${f.dep || '----'} ${f.arr || '----'}</span>
      </div>
    `).join('');

    dutyHtml = `
      <div class="dd-card dd-hsby">
        <div class="dd-duty-name">Home Standby${stLabel}${detail?.calledToFly ? ` <span style="color:var(--red);font-size:12px;">• called</span>` : ''}</div>
        ${ts ? `<div class="dd-duty-time">${ts}</div>` : ''}
        ${flightRows ? `<div class="dd-plane-label" style="margin-top:10px;">Flights</div>${flightRows}` : ''}
      </div>
    `;
  } else if (assign === 'AD') {
    const st = detail?.shiftType;
    const ts = detail?.start && detail?.end ? `${detail.start} - ${detail.end}` : detail?.start ? `from ${detail.start}` : '';
    const stLabel = st ? ` • ${st.charAt(0).toUpperCase()}${st.slice(1)}` : '';
    const cfl = (APP.customFlights?.[ds] || []).filter(f => f.from && f.to);
    const flightRows = cfl.map(f => `
      <div class="dd-flight-row">
        <span class="dd-flight-route">${f.from}-${f.to}</span>
        <span class="dd-flight-times">${f.dep || '----'} ${f.arr || '----'}</span>
      </div>
    `).join('');

    dutyHtml = `
      <div class="dd-card dd-ad">
        <div class="dd-duty-name">Airport Duty${stLabel}${detail?.calledToFly ? ` <span style="color:var(--red);font-size:12px;">• called</span>` : ''}</div>
        ${ts ? `<div class="dd-duty-time">${ts}</div>` : ''}
        ${flightRows ? `<div class="dd-plane-label" style="margin-top:10px;">Flights</div>${flightRows}` : ''}
      </div>
    `;
  } else if (assign === 'AL') {
    dutyHtml = `<div class="dd-card dd-leave"><div class="dd-duty-name">Annual Leave</div></div>`;
  } else if (assign === 'VTO') {
    dutyHtml = `<div class="dd-card dd-leave"><div class="dd-duty-name">Voluntary Time Off</div></div>`;
  } else if (assign === 'SICK') {
    dutyHtml = `<div class="dd-card dd-sick"><div class="dd-duty-name">Sick Leave</div></div>`;
  } else if (assign === 'UL') {
    dutyHtml = `<div class="dd-card dd-leave"><div class="dd-duty-name">Unpaid Leave</div></div>`;
  } else if (assign === 'PL') {
    dutyHtml = `<div class="dd-card dd-leave"><div class="dd-duty-name">Parental Leave</div></div>`;
  } else if (type === 'off') {
    dutyHtml = `<div class="dd-empty">Day off</div>`;
  }

  let crewHtml = '';
  const sameList = getSameShiftCrew(ds);
  const ownCrew = (APP.crew?.[APP.roster] || []).filter(m => m && (m.name || m.code));

  if (sameList.length || ownCrew.length) {
    let cards = '';

    if (ownCrew.length) {
      cards += buildRosterCard(
        APP.roster,
        ownCrew,
        'var(--green)',
        `<span style="font-size:10px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:0.5px;margin-right:4px;">You</span>`
      );
    }

    sameList.forEach(r => {
      const members = (APP.crew?.[r] || []).filter(m => m && (m.name || m.code));
      cards += buildRosterCard(r, members, 'var(--blue)', '');
    });

    const total = sameList.length + (ownCrew.length ? 1 : 0);
    crewHtml += ddCollapsible('Same shift', `${total} roster${total !== 1 ? 's' : ''}`, cards, false);
  }

  const syncColleaguesPlaceholder = APP.syncLoggedIn ? `<div id="syncColleaguesSection"></div>` : '';

  const actionsHtml = !assign
    ? `
      <div class="dd-actions">
        <button class="dd-action-btn ghost" onclick="openDutyPicker('${ds}')">Add duty</button>
        <button class="dd-action-btn ghost" onclick="openLeavePicker('${ds}')">Add leave</button>
      </div>
    `
    : `
      <div class="dd-actions">
        <button class="dd-action-btn outline" style="max-width:200px;margin:0 auto;" onclick="openDutyPicker('${ds}')">Edit duty</button>
      </div>
    `;

  document.getElementById('dayDetailScreen').innerHTML = `
    <div class="dd-header">
      <button class="dd-back" onclick="closeDayDetail()">Back</button>
      <div class="dd-daynav">
        <button class="dd-navbtn" onclick="navDay(-1)">${DOW[prevD.getDay()]} ${prevD.getDate()}</button>
        <button class="dd-navbtn" onclick="navDay(1)">${DOW[nextD.getDay()]} ${nextD.getDate()}</button>
      </div>
    </div>

    <div class="dd-body">
      <div class="dd-date-block">
        <div class="dd-date">${dateLine}</div>
        <div class="dd-cycle-badge ${badgeClass}">${lbl.main || 'Day off'}</div>
        ${lbl.sub ? `<div class="dd-cycle-sub">${lbl.sub}</div>` : ''}
      </div>

      ${dutyHtml}
      ${crewHtml}
      ${syncColleaguesPlaceholder}
    </div>

    ${actionsHtml}
  `;

  if (APP.syncLoggedIn && typeof syncGetColleaguesOnDate === 'function') {
    syncGetColleaguesOnDate(ds).then(colleagues => {
      const el = document.getElementById('syncColleaguesSection');
      if (!el) return;
      if (!colleagues.length) {
        el.remove();
        return;
      }

      const cards = colleagues.map(col => {
        const crewEntry = (APP.crew?.[col.roster_num] || []).find(m => m.code === col.crew_code);
        const members = [{
          name: col.display_name,
          code: col.crew_code,
          phone: crewEntry?.phone || ''
        }];
        const accent = col.assignment?.endsWith('L') ? 'var(--late)' : 'var(--blue)';
        return buildRosterCard(col.roster_num, members, accent, '');
      }).join('');

      el.innerHTML = ddCollapsible(
        'Same flight',
        `${colleagues.length} colleague${colleagues.length !== 1 ? 's' : ''}`,
        cards,
        true
      );
    }).catch(() => {
      const el = document.getElementById('syncColleaguesSection');
      if (el) el.remove();
    });
  }
}

// ══════════════════════════════════════════════════════════════
// SAME SHIFT — FIXED
// Priority:
// 1. Real assignment of the day
// 2. HSBY/AD shiftType
// 3. Fallback to roster cycle
// ══════════════════════════════════════════════════════════════
function getDutyBucket(ds, rosterNum) {
  const own = rosterNum === APP.roster;
  const assign = own ? APP.assignments?.[ds] : null;
  const detail = own ? APP.assignDetails?.[ds] : null;

  if (assign === 'A1E' || assign === 'A2E') return 'early';
  if (assign === 'A1L' || assign === 'A2L') return 'late';
  if (assign === 'CUSTOM') return customClass(ds);
  if (assign === 'HSBY' || assign === 'AD') {
    if (detail?.shiftType === 'early') return 'early';
    if (detail?.shiftType === 'late') return 'late';
    return null;
  }
  if (['AL', 'VTO', 'SICK', 'UL', 'PL', 'OFF'].includes(assign)) return null;

  const day = cycleDay(rosterNum, ds);
  if ([1, 2, 3, 4, 5].includes(day)) return 'early';
  if ([9, 10, 11, 12, 13].includes(day)) return 'late';
  return null;
}

function getSameShiftCrew(ds) {
  const myBucket = getDutyBucket(ds, APP.roster);
  if (!myBucket) return [];

  const res = [];
  for (let r = 1; r <= 16; r++) {
    if (r === APP.roster) continue;
    const theirBucket = getDutyBucket(ds, r);
    if (theirBucket === myBucket) res.push(r);
  }
  return res;
}

// ══════════════════════════════════════════════════════════════
// PICKERS / ASSIGN
// ══════════════════════════════════════════════════════════════
function openDutyPicker(ds) {
  const sched = SCHEDULE.days[new Date(`${ds}T12:00:00`).getDay()];
  const assign = APP.assignments?.[ds];
  const isHsbyAd = assign === 'HSBY' || assign === 'AD';

  document.getElementById('settingModalTitle').textContent = 'Set duty';
  document.getElementById('settingModalBody').innerHTML = `
    <div style="max-height:60vh;overflow-y:auto;">${buildDutyOptions(ds, sched)}</div>
    ${isHsbyAd ? `
      <button onclick="openDutyChange('${ds}')"
        style="width:100%;margin-top:12px;padding:11px;border-radius:10px;border:1.5px solid var(--blue);
        background:var(--blue-lt);font-family:Outfit,sans-serif;font-size:13px;font-weight:700;
        color:var(--blue);cursor:pointer;">
        Duty change
      </button>` : ''}
    ${assign ? `
      <button onclick="if(confirm('Sei sicuro di voler cancellare il duty?')){clearDuty('${ds}');closeModal('settingModal');}"
        style="width:100%;margin-top:8px;padding:11px;border-radius:10px;border:1.5px solid var(--red);
        background:transparent;font-family:Outfit,sans-serif;font-size:13px;font-weight:600;
        color:var(--red);cursor:pointer;">
        Clear duty
      </button>` : ''}
    <button class="btn secondary" style="margin-top:8px;" onclick="closeModal('settingModal')">Cancel</button>
  `;
  document.getElementById('settingModal').classList.add('open');
}

function openLeavePicker(ds) {
  document.getElementById('settingModalTitle').textContent = 'Set leave';
  document.getElementById('settingModalBody').innerHTML = `
    <div style="max-height:50vh;overflow-y:auto;">${buildLeaveOptions(ds)}</div>
    <button class="btn secondary" style="margin-top:10px;" onclick="closeModal('settingModal')">Cancel</button>
  `;
  document.getElementById('settingModal').classList.add('open');
}

function clearDuty(ds) {
  delete APP.assignments?.[ds];
  if (APP.customFlights) delete APP.customFlights[ds];
  if (APP.assignDetails) delete APP.assignDetails[ds];
  save();
  renderCalendar();
  renderHome();
  renderDayDetail();
  if (APP.notif?.enabled && typeof scheduleAllNotifications === 'function') scheduleAllNotifications();
}

function buildShiftTypePicker(ds, dutyType) {
  const current = APP.assignDetails?.[ds]?.shiftType;
  return `
    <div style="font-size:11px;color:var(--text3);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-top:10px;margin-bottom:6px;">Turno</div>
    <div class="shift-type-picker">
      <button class="shift-type-btn ${current === 'early' ? 'active-early' : ''}" onclick="setShiftType('${ds}','${dutyType}','early',this)">Early</button>
      <button class="shift-type-btn ${current === 'late' ? 'active-late' : ''}" onclick="setShiftType('${ds}','${dutyType}','late',this)">Late</button>
    </div>
  `;
}

function setShiftType(ds, dutyType, st, btn) {
  if (!APP.assignDetails) APP.assignDetails = {};
  if (!APP.assignDetails[ds]) APP.assignDetails[ds] = {};
  APP.assignDetails[ds].shiftType = st;
  save();

  const picker = btn.closest('.shift-type-picker');
  picker.querySelectorAll('.shift-type-btn').forEach(b => b.classList.remove('active-early', 'active-late'));
  btn.classList.add(st === 'early' ? 'active-early' : 'active-late');

  renderCalendar();
  if (_detailDs === ds) renderDayDetail();
  renderHome();
}

function buildDutyTimeInputs(ds) {
  const h = APP.assignDetails?.[ds];
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;margin-bottom:4px;padding:0 2px;">
      <div>
        <div style="font-size:10px;color:var(--text3);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Start</div>
        <input type="text" inputmode="numeric" maxlength="5" placeholder="06:00" value="${h?.start || ''}"
          oninput="handleTimeInput(this,'${ds}',null,'start')"
          style="margin-bottom:0;font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:600;text-align:center;letter-spacing:2px;">
      </div>
      <div>
        <div style="font-size:10px;color:var(--text3);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">End</div>
        <input type="text" inputmode="numeric" maxlength="5" placeholder="14:00" value="${h?.end || ''}"
          oninput="handleTimeInput(this,'${ds}',null,'end')"
          style="margin-bottom:0;font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:600;text-align:center;letter-spacing:2px;">
      </div>
    </div>
  `;
}

function handleTimeInput(input, ds, idx, key) {
  let v = input.value.replace(/[^\d]/g, '').slice(0, 4);
  if (v.length >= 3) v = `${v.slice(0,2)}:${v.slice(2)}`;
  input.value = v;

  if (!APP.assignDetails) APP.assignDetails = {};
  if (!APP.assignDetails[ds]) APP.assignDetails[ds] = {};
  APP.assignDetails[ds][key] = v;

  save();
  renderCalendar();
  if (_detailDs === ds) renderDayDetail();
  renderHome();
}
window.handleTimeInput = handleTimeInput;

function buildDutyOptions(ds, sched) {
  const assign = APP.assignments?.[ds];
  const cfl = APP.customFlights?.[ds] || [];
  let body = '';

  if (sched) {
    [
      { id: 'A1E', label: 'Aereo 1 Early', color: 'var(--early)', report: sched.a1.reportEarly, flights: sched.a1.early },
      { id: 'A1L', label: 'Aereo 1 Late', color: 'var(--late)', report: sched.a1.reportLate, flights: sched.a1.late },
      { id: 'A2E', label: 'Aereo 2 Early', color: 'var(--early)', report: sched.a2.reportEarly, flights: sched.a2.early },
      { id: 'A2L', label: 'Aereo 2 Late', color: 'var(--late)', report: sched.a2.reportLate, flights: sched.a2.late },
    ].forEach(opt => {
      const sel = assign === opt.id;
      body += `
        <div class="assign-option ${sel ? 'selected-a1' : ''}" onclick="setAssign('${ds}','${opt.id}')">
          <div>
            <div class="assign-label" style="color:${opt.color}">${opt.label}</div>
            <div class="assign-flights">Report ${opt.report} • ${(opt.flights || []).map(f => f.route).join(' · ')}</div>
          </div>
          <div class="assign-check">${sel ? '✓' : ''}</div>
        </div>
      `;
    });
  }

  const hsel = assign === 'HSBY';
  body += `
    <div class="assign-option ${hsel ? 'selected-hsby' : ''}" onclick="setAssign('${ds}','HSBY')">
      <div class="assign-label" style="color:var(--yellow)">Home Standby</div>
      <div class="assign-check">${hsel ? '✓' : ''}</div>
    </div>
    ${hsel ? buildShiftTypePicker(ds, 'HSBY') + buildDutyTimeInputs(ds) : ''}
  `;

  const asel = assign === 'AD';
  body += `
    <div class="assign-option ${asel ? 'selected-ad' : ''}" onclick="setAssign('${ds}','AD')">
      <div class="assign-label" style="color:var(--red)">Airport Duty</div>
      <div class="assign-check">${asel ? '✓' : ''}</div>
    </div>
    ${asel ? buildShiftTypePicker(ds, 'AD') + buildDutyTimeInputs(ds) : ''}
  `;

  const csel = assign === 'CUSTOM';
  body += `
    <div class="assign-option ${csel ? 'selected-a1' : ''}" onclick="setAssign('${ds}','CUSTOM')">
      <div>
        <div class="assign-label" style="color:var(--blue)">Custom Flights</div>
        ${csel && cfl.length ? `<div class="assign-flights">${cfl.filter(f => f.from && f.to).map(f => `${f.from}-${f.to}`).join(' · ')}</div>` : ''}
      </div>
      <div class="assign-check">${csel ? '✓' : ''}</div>
    </div>
  `;

  return body;
}

function buildLeaveOptions(ds) {
  const assign = APP.assignments?.[ds];
  return [
    { id: 'AL', label: 'Annual Leave (AL)', color: 'var(--off)' },
    { id: 'VTO', label: 'VTO (Voluntary Time Off)', color: 'var(--off)' },
    { id: 'SICK', label: 'Sick Leave (SICK)', color: '#e11d48' },
    { id: 'UL', label: 'Unpaid Leave (UL)', color: 'var(--off)' },
    { id: 'PL', label: 'Parental Leave (PL)', color: 'var(--off)' },
  ].map(opt => {
    const sel = assign === opt.id;
    return `
      <div class="assign-option ${sel ? 'selected-al' : ''}" onclick="setAssign('${ds}','${opt.id}')">
        <div class="assign-label" style="color:${opt.color}">${opt.label}</div>
        <div class="assign-check">${sel ? '✓' : ''}</div>
      </div>
    `;
  }).join('');
}

function setAssign(ds, val) {
  if (!APP.assignments) APP.assignments = {};
  if (val) APP.assignments[ds] = val;
  else delete APP.assignments[ds];

  if (val !== 'CUSTOM' && APP.customFlights) delete APP.customFlights[ds];

  if (!['HSBY', 'AD', 'CUSTOM'].includes(val) && APP.assignDetails) {
    delete APP.assignDetails[ds];
  }

  save();

  if (val === 'HSBY' || val === 'AD') {
    const sched = SCHEDULE.days[new Date(`${ds}T12:00:00`).getDay()];
    document.getElementById('settingModalBody').innerHTML = `
      <div style="max-height:60vh;overflow-y:auto;">${buildDutyOptions(ds, sched)}</div>
      <button class="btn secondary" style="margin-top:10px;" onclick="closeModal('settingModal')">Cancel</button>
    `;
    renderCalendar();
    renderHome();
    if (_detailDs === ds) renderDayDetail();
    return;
  }

  closeModal('settingModal');
  renderCalendar();
  renderHome();
  if (_detailDs === ds) renderDayDetail();

  if (val === 'CUSTOM' && typeof openCustomFlights === 'function') {
    openCustomFlights(ds);
  }

  if (APP.notif?.enabled && typeof scheduleAllNotifications === 'function') {
    scheduleAllNotifications();
  }
}

// ══════════════════════════════════════════════════════════════
// STUBS for custom flights / duty change
// Keep compatibility with rest of app
// ══════════════════════════════════════════════════════════════
function openDutyChange(ds) {
  alert('Duty change panel not included in this version yet.');
}
function openCustomFlights(ds) {
  alert('Custom flights editor remains your existing implementation.');
}
window.openCustomFlights = window.openCustomFlights || openCustomFlights;

// expose
window.renderCalendar = renderCalendar;
window.openDay = openDay;
window.closeDayDetail = closeDayDetail;
window.openDutyPicker = openDutyPicker;
window.openLeavePicker = openLeavePicker;
window.setAssign = setAssign;
window.setShiftType = setShiftType;
window.clearDuty = clearDuty;
window.navDay = navDay;
