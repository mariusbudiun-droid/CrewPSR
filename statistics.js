// ══════════════════════════════════════════════════════════════
// STATISTICS
// ══════════════════════════════════════════════════════════════

const AIRPORT_COUNTRY = {
  PSR:'Italy',BGY:'Italy',MXP:'Italy',TRN:'Italy',CTA:'Italy',TPS:'Italy',CAG:'Italy',
  STN:'UK',LHR:'UK',LGW:'UK',MAN:'UK',
  CRL:'Belgium',BRU:'Belgium',
  OTP:'Romania',CLJ:'Romania',
  KRK:'Poland',WRO:'Poland',WAW:'Poland',
  KUN:'Lithuania',VNO:'Lithuania',
  TIA:'Albania', MLA:'Malta', PRG:'Czech Republic',
  VLC:'Spain',BCN:'Spain',MAD:'Spain',
  NRN:'Germany',CGN:'Germany',BER:'Germany',MUC:'Germany',
  VIE:'Austria', BUD:'Hungary', SOF:'Bulgaria', ATH:'Greece',
  FCO:'Italy',NAP:'Italy',
};

// ── Global helpers ────────────────────────────────────────────
function fmtHours(h) {
  if (!h || h <= 0) return '0h 00m';
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  if (mm === 60) return `${hh + 1}h 00m`;
  return `${hh}h ${String(mm).padStart(2,'0')}m`;
}
window.fmtHours = fmtHours;

function _toMins(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function _getFlights(ds, assign) {
  const customFlights = APP.customFlights || {};
  const dow   = new Date(ds + 'T12:00:00').getDay();
  const sched = SCHEDULE.days[dow];

  if (assign === 'CUSTOM') {
    return (customFlights[ds] || []).filter(f => f.from && f.to && f.dep && f.arr);
  }
  if (['A1E','A1L','A2E','A2L'].includes(assign)) {
    const useA2   = assign.startsWith('A2');
    const useLate = assign.endsWith('L');
    const plane   = useA2 ? sched?.a2 : sched?.a1;
    return ((useLate ? plane?.late : plane?.early) || [])
      .filter(f => f.dep && f.arr)
      .map(f => {
        const [from, to] = f.route.split('-');
        return { from, to, dep: f.dep, arr: f.arr };
      });
  }
  return [];
}

function _calcFtDp(flights, assign, detail) {
  // AD: no FT, DP = full duration
  if (assign === 'AD') {
    if (detail?.start && detail?.end) {
      let dp = _toMins(detail.end) - _toMins(detail.start);
      if (dp < 0) dp += 1440;
      return { ft: 0, dp };
    }
    return { ft: 0, dp: 480 };
  }

  // HSBY: no FT, DP = 25% of duration
  if (assign === 'HSBY') {
    if (detail?.start && detail?.end) {
      let dur = _toMins(detail.end) - _toMins(detail.start);
      if (dur < 0) dur += 1440;
      return { ft: 0, dp: Math.round(dur * 0.25) };
    }
    return { ft: 0, dp: Math.round(9 * 60 * 0.25) };
  }

  if (!flights.length) return { ft: 0, dp: 0 };

  let ft = 0;
  for (const f of flights) {
    let diff = _toMins(f.arr) - _toMins(f.dep);
    if (diff < 0) diff += 1440;
    ft += diff;
  }

  const firstDep = _toMins(flights[0].dep);
  const lastArr  = _toMins(flights[flights.length - 1].arr);
  let dp = (lastArr + 30) - (firstDep - 45);
  if (dp < 0 || lastArr < firstDep - 60) dp += 1440;

  return { ft, dp };
}

function _calcTotalDuty(assign, detail, dp) {
  if (assign === 'HSBY') {
    if (detail?.start && detail?.end) {
      let dur = _toMins(detail.end) - _toMins(detail.start);
      if (dur < 0) dur += 1440;
      return dur;
    }
    return 9 * 60;
  }

  if (assign === 'AD') {
    if (detail?.start && detail?.end) {
      let dur = _toMins(detail.end) - _toMins(detail.start);
      if (dur < 0) dur += 1440;
      return dur;
    }
    return 8 * 60;
  }

  return dp;
}

function _isLateFinish(flights) {
  if (!flights.length) return false;
  const lastArr = flights[flights.length - 1].arr;
  if (!lastArr) return false;
  const mins = _toMins(lastArr);
  return mins >= 30 && mins < 360;
}

// ── General stats ─────────────────────────────────────────────
function calcStats() {
  const assignments = APP.assignments || {};

  let totalFtMins = 0;
  let totalDpMins = 0;
  let totalDutyMins = 0;
  let yearFtMins = 0;
  let yearDpMins = 0;
  let yearDutyMins = 0;

  let flyingDays = 0, totalSectors = 0;
  const thisYear = new Date().getFullYear();
  const airportCount = {}, routeCount = {}, dayFtMap = {}, dayDpMap = {};
  let lateFinishes = 0, lateFinishDates = [];

  for (const [ds, assign] of Object.entries(assignments)) {
    const flights = _getFlights(ds, assign);
    const detail  = APP.assignDetails?.[ds];
    if (!flights.length && assign !== 'AD' && assign !== 'HSBY') continue;

    if (flights.length) flyingDays++;

    const { ft, dp } = _calcFtDp(flights, assign, detail);
    const duty = _calcTotalDuty(assign, detail, dp);

    for (const f of flights) {
      totalSectors++;
      // Count only landings (destination) — each leg = 1 visit to that airport
      if (f.to) airportCount[f.to] = (airportCount[f.to] || 0) + 1;
      if (f.from === 'PSR' && f.to) routeCount[`PSR-${f.to}`] = (routeCount[`PSR-${f.to}`] || 0) + 1;
    }

    totalFtMins += ft;
    totalDpMins += dp;
    totalDutyMins += duty;

    dayFtMap[ds] = ft / 60;
    dayDpMap[ds] = dp / 60;

    const yr = new Date(ds + 'T12:00:00').getFullYear();
    if (yr === thisYear) {
      yearFtMins += ft;
      yearDpMins += dp;
      yearDutyMins += duty;
    }

    if (cycleDay(APP.roster, ds) === 13 && _isLateFinish(flights)) {
      lateFinishes++;
      lateFinishDates.push(ds);
    }
  }

  const topAirports = Object.entries(airportCount).sort((a,b) => b[1]-a[1]);
  const topRoutes   = Object.entries(routeCount).sort((a,b) => b[1]-a[1]);

  let maxFt = 0, longestFtDays = [];
  let maxDp = 0, longestDpDays = [];
  for (const ds of Object.keys(dayFtMap)) {
    const ft = dayFtMap[ds] || 0;
    const dp = dayDpMap[ds] || 0;
    if (ft > maxFt) { maxFt = ft; longestFtDays = [ds]; }
    else if (ft === maxFt && ft > 0) longestFtDays.push(ds);
    if (dp > maxDp) { maxDp = dp; longestDpDays = [ds]; }
    else if (dp === maxDp && dp > 0) longestDpDays.push(ds);
  }
  const longestDays = longestFtDays;

  const monthFtMins = {};
  for (const ds of Object.keys(dayFtMap)) {
    const key = ds.slice(0, 7);
    monthFtMins[key] = (monthFtMins[key] || 0) + dayFtMap[ds] * 60;
  }

  let busiestMonth = null, busiestFtMins = 0;
  for (const [k, m] of Object.entries(monthFtMins)) {
    if (m > busiestFtMins) {
      busiestFtMins = m;
      busiestMonth = k;
    }
  }

  const countries = new Set();
  for (const ap of Object.keys(airportCount)) {
    if (AIRPORT_COUNTRY[ap]) countries.add(AIRPORT_COUNTRY[ap]);
  }

  return {
    totalFt: totalFtMins / 60,
    totalDp: totalDpMins / 60,
    totalDuty: totalDutyMins / 60,
    yearFt: yearFtMins / 60,
    yearDp: yearDpMins / 60,
    yearDuty: yearDutyMins / 60,
    flyingDays,
    totalSectors,
    topAirports,
    topRoutes,
    longestDays: longestFtDays,
    longestFt: maxFt,
    longestDpDays,
    longestDp: maxDp,
    busiestMonth,
    busiestFt: busiestFtMins / 60,
    countries: [...countries].sort(),
    lateFinishes,
    lateFinishDates,
    dayFtMap,
    dayDpMap,
  };
}

// ── Monthly stats (year + month as params) ────────────────────
function calcMonthStats(year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2,'0')}`;
  const assignments = APP.assignments || {};

  let ftMins = 0, dpMins = 0, dutyMins = 0, flyingDays = 0, sectors = 0;
  const airportCount = {}, routeCount = {}, dayFtMap = {}, dayDpMap = {};
  let lateFinishes = 0, lateFinishDates = [];

  for (const [ds, assign] of Object.entries(assignments)) {
    if (!ds.startsWith(prefix)) continue;

    const flights = _getFlights(ds, assign);
    const detail  = APP.assignDetails?.[ds];
    if (!flights.length && assign !== 'AD' && assign !== 'HSBY') continue;

    if (flights.length) flyingDays++;

    const { ft, dp } = _calcFtDp(flights, assign, detail);
    const duty = _calcTotalDuty(assign, detail, dp);

    ftMins += ft;
    dpMins += dp;
    dutyMins += duty;

    if (ft > 0) {
      dayFtMap[ds] = ft / 60;
      dayDpMap[ds] = dp / 60;
    }

    sectors += flights.length;

    for (const f of flights) {
      // Count only landings (destination) — each leg = 1 visit to that airport
      if (f.to) airportCount[f.to] = (airportCount[f.to] || 0) + 1;
      if (f.from === 'PSR' && f.to) routeCount[`PSR-${f.to}`] = (routeCount[`PSR-${f.to}`] || 0) + 1;
    }

    if (cycleDay(APP.roster, ds) === 13 && _isLateFinish(flights)) {
      lateFinishes++;
      lateFinishDates.push(ds);
    }
  }

  let maxFt = 0, longestFtDays = [];
  let maxDp = 0, longestDpDays = [];
  for (const ds of Object.keys(dayFtMap)) {
    const ft = dayFtMap[ds] || 0;
    const dp = dayDpMap[ds] || 0;
    if (ft > maxFt) { maxFt = ft; longestFtDays = [ds]; }
    else if (ft === maxFt && ft > 0) longestFtDays.push(ds);
    if (dp > maxDp) { maxDp = dp; longestDpDays = [ds]; }
    else if (dp === maxDp && dp > 0) longestDpDays.push(ds);
  }

  return {
    label: `${MONTHS[month]} ${year}`,
    ft: ftMins / 60,
    dp: dpMins / 60,
    duty: dutyMins / 60,
    flyingDays,
    sectors,
    topAirports: Object.entries(airportCount).sort((a,b) => b[1]-a[1]),
    topRoutes: Object.entries(routeCount).sort((a,b) => b[1]-a[1]),
    longestDays: longestFtDays,
    longestFt: maxFt,
    longestDpDays,
    longestDp: maxDp,
    lateFinishes,
    lateFinishDates,
    dayFtMap,
    dayDpMap,
  };
}

// Yearly stats — same shape as calcMonthStats but spans an entire year.
function calcYearStats(year) {
  const prefix = String(year);
  const assignments = APP.assignments || {};

  let ftMins = 0, dpMins = 0, dutyMins = 0, flyingDays = 0, sectors = 0;
  const airportCount = {}, routeCount = {}, dayFtMap = {}, dayDpMap = {};
  const monthFtMins = {};
  let lateFinishes = 0, lateFinishDates = [];

  for (const [ds, assign] of Object.entries(assignments)) {
    if (!ds.startsWith(prefix + '-')) continue;

    const flights = _getFlights(ds, assign);
    const detail  = APP.assignDetails?.[ds];
    if (!flights.length && assign !== 'AD' && assign !== 'HSBY') continue;

    if (flights.length) flyingDays++;

    const { ft, dp } = _calcFtDp(flights, assign, detail);
    const duty = _calcTotalDuty(assign, detail, dp);

    ftMins += ft;
    dpMins += dp;
    dutyMins += duty;

    if (ft > 0) {
      dayFtMap[ds] = ft / 60;
      dayDpMap[ds] = dp / 60;
      const monthKey = ds.slice(0, 7);
      monthFtMins[monthKey] = (monthFtMins[monthKey] || 0) + ft;
    }

    sectors += flights.length;

    for (const f of flights) {
      // Count only landings (destination) — each leg = 1 visit to that airport
      if (f.to) airportCount[f.to] = (airportCount[f.to] || 0) + 1;
      if (f.from === 'PSR' && f.to) routeCount[`PSR-${f.to}`] = (routeCount[`PSR-${f.to}`] || 0) + 1;
    }

    if (cycleDay(APP.roster, ds) === 13 && _isLateFinish(flights)) {
      lateFinishes++;
      lateFinishDates.push(ds);
    }
  }

  let maxFt = 0, longestFtDays = [];
  let maxDp = 0, longestDpDays = [];
  for (const ds of Object.keys(dayFtMap)) {
    const ft = dayFtMap[ds] || 0;
    const dp = dayDpMap[ds] || 0;
    if (ft > maxFt) { maxFt = ft; longestFtDays = [ds]; }
    else if (ft === maxFt && ft > 0) longestFtDays.push(ds);
    if (dp > maxDp) { maxDp = dp; longestDpDays = [ds]; }
    else if (dp === maxDp && dp > 0) longestDpDays.push(ds);
  }

  let busiestMonth = null, busiestFtMins = 0;
  for (const [k, m] of Object.entries(monthFtMins)) {
    if (m > busiestFtMins) { busiestFtMins = m; busiestMonth = k; }
  }

  const countries = new Set();
  for (const ap of Object.keys(airportCount)) {
    if (AIRPORT_COUNTRY[ap]) countries.add(AIRPORT_COUNTRY[ap]);
  }

  return {
    label: String(year),
    year,
    ft: ftMins / 60,
    dp: dpMins / 60,
    duty: dutyMins / 60,
    flyingDays,
    sectors,
    topAirports: Object.entries(airportCount).sort((a,b) => b[1]-a[1]),
    topRoutes: Object.entries(routeCount).sort((a,b) => b[1]-a[1]),
    longestDays: longestFtDays,
    longestFt: maxFt,
    longestDpDays,
    longestDp: maxDp,
    busiestMonth,
    busiestFt: busiestFtMins / 60,
    countries: [...countries].sort(),
    lateFinishes,
    lateFinishDates,
    dayFtMap,
    dayDpMap,
  };
}

// Returns the list of years for which we have any flying data, descending.
// Used to populate the year selector in the Yearly tab.
function _yearsWithData() {
  const yrs = new Set();
  for (const ds of Object.keys(APP.assignments || {})) {
    const y = ds.slice(0, 4);
    if (/^\d{4}$/.test(y)) yrs.add(parseInt(y));
  }
  // Always include current year so user sees an empty year shell rather than nothing
  yrs.add(new Date().getFullYear());
  return [...yrs].sort((a, b) => b - a);
}

// Achievements — milestone-based, inspired by Strava/Garmin badges.
// Returns an array of { id, label, icon, achieved, target?, current?, hint? }.
function calcAchievements() {
  const s = calcStats();
  const sectors = s.totalSectors;
  const airports = s.topAirports.length;
  const countries = s.countries.length;
  const ftHours = s.totalFt;
  const flyingDays = s.flyingDays;
  const lateFin = s.lateFinishes;
  const routes = s.topRoutes.length;

  // Build tiered milestones — each tier: { target, label, icon }
  function tier(value, milestones, baseLabel, baseIcon) {
    // milestones is array of {target, icon, label}
    const items = milestones.map(m => ({
      ...m,
      achieved: value >= m.target,
      current: value,
    }));
    return items;
  }

  const list = [];

  // Sectors
  list.push(...tier(sectors, [
    { target: 50,   icon: '🛫', label: '50 sectors flown' },
    { target: 100,  icon: '✈️', label: '100 sectors flown' },
    { target: 250,  icon: '🚀', label: '250 sectors flown' },
    { target: 500,  icon: '🏆', label: '500 sectors flown' },
    { target: 1000, icon: '👑', label: '1,000 sectors flown' },
  ]));

  // Flying hours
  list.push(...tier(ftHours, [
    { target: 100,  icon: '⏱️', label: '100 flight hours' },
    { target: 500,  icon: '⏰', label: '500 flight hours' },
    { target: 1000, icon: '🕰️', label: '1,000 flight hours' },
    { target: 2000, icon: '💎', label: '2,000 flight hours' },
  ]));

  // Airports / destinations
  list.push(...tier(airports, [
    { target: 5,  icon: '📍', label: '5 different airports' },
    { target: 10, icon: '🗺️', label: '10 different airports' },
    { target: 20, icon: '🌍', label: '20 different airports' },
  ]));

  // Countries
  list.push(...tier(countries, [
    { target: 3,  icon: '🇪🇺', label: '3 countries visited' },
    { target: 5,  icon: '🌐', label: '5 countries visited' },
    { target: 10, icon: '🌎', label: '10 countries visited' },
  ]));

  // Flying days
  list.push(...tier(flyingDays, [
    { target: 30,  icon: '📅', label: '30 flying days' },
    { target: 100, icon: '📆', label: '100 flying days' },
    { target: 365, icon: '🎯', label: '365 flying days' },
  ]));

  // Late finishes (badge of honour for the survivors)
  list.push(...tier(lateFin, [
    { target: 1,  icon: '🌙', label: 'First late finish' },
    { target: 10, icon: '🦉', label: '10 late finishes' },
    { target: 25, icon: '🧛', label: '25 late finishes' },
  ]));

  // Routes
  list.push(...tier(routes, [
    { target: 5,  icon: '🛣️', label: '5 different routes' },
    { target: 15, icon: '🌟', label: '15 different routes' },
  ]));

  return list;
}


let _statsTab = 'month';
let _statsMonthOffset = 0;
let _statsYearOffset = 0;        // 0 = current year, -1 = previous, etc.
let _statsAchievementsOpen = false;

function renderStatistics() {
  const el = document.getElementById('statsBody');
  if (!el) return;

  const tabBtn = (id, label) => `
    <button onclick="_switchStatsTab('${id}')"
      style="flex:1;padding:10px;border:none;
             ${id !== 'month' ? 'border-left:1px solid var(--border);' : ''}
             font-family:'Outfit',sans-serif;font-size:13px;font-weight:700;cursor:pointer;
             background:${_statsTab===id?'var(--blue)':'var(--surface)'};
             color:${_statsTab===id?'white':'var(--text2)'}">
      ${label}
    </button>`;

  el.innerHTML = `
    <div style="display:flex;gap:0;margin-bottom:16px;background:var(--surface);
                border:1px solid var(--border);border-radius:12px;overflow:hidden">
      ${tabBtn('month', 'Monthly')}
      ${tabBtn('year',  'Yearly')}
      ${tabBtn('all',   'General')}
    </div>
    <div id="statsContent"></div>
  `;

  _renderStatsContent();
}

function _switchStatsTab(tab) {
  _statsTab = tab;
  if (tab === 'month') _statsMonthOffset = 0;
  if (tab === 'year')  _statsYearOffset  = 0;
  renderStatistics();
}
window._switchStatsTab = _switchStatsTab;

function _navMonth(dir) {
  _statsMonthOffset = Math.max(-12, Math.min(1, _statsMonthOffset + dir));
  _renderStatsContent();
}
window._navMonth = _navMonth;

function _navYear(dir) {
  // Allow navigation only across years where data exists, plus current year.
  const yrs = _yearsWithData();
  const currentYr = new Date().getFullYear() + _statsYearOffset;
  const idx = yrs.indexOf(currentYr);
  // yrs is sorted descending (newest first). dir=-1 means "older"; +1 means "newer".
  let newIdx = idx;
  if (dir < 0)      newIdx = Math.min(yrs.length - 1, idx + 1);
  else if (dir > 0) newIdx = Math.max(0, idx - 1);
  const newYr = yrs[newIdx];
  _statsYearOffset = newYr - new Date().getFullYear();
  _renderStatsContent();
}
window._navYear = _navYear;

function _toggleAchievements() {
  _statsAchievementsOpen = !_statsAchievementsOpen;
  _renderStatsContent();
}
window._toggleAchievements = _toggleAchievements;

function _getSelectedMonthYM() {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth() + _statsMonthOffset;
  while (m < 0)  { m += 12; y--; }
  while (m > 11) { m -= 12; y++; }
  return { y, m };
}

function _renderStatsContent() {
  const el = document.getElementById('statsContent');
  if (!el) return;

  const fmtH = fmtHours;
  const fmtDate = ds => {
    const d = new Date(ds + 'T12:00:00');
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };
  const fmtMonth = key => {
    if (!key) return '—';
    const [y, mo] = key.split('-');
    return `${MONTHS[parseInt(mo, 10) - 1]} ${y}`;
  };

  if (_statsTab === 'month') {
    const { y, m } = _getSelectedMonthYM();
    const data = calcMonthStats(y, m);

    const canNext = _statsMonthOffset < 1;
    const canPrev = _statsMonthOffset > -12;

    let html = `
      <div style="display:flex;align-items:center;justify-content:space-between;
                  margin-bottom:16px;padding:4px 0">
        <button onclick="_navMonth(-1)"
          style="background:none;border:none;font-size:22px;color:${canPrev?'var(--text2)':'var(--border)'};
                 cursor:${canPrev?'pointer':'default'};padding:4px 8px;border-radius:8px;
                 font-family:'Outfit',sans-serif" ${canPrev?'':'disabled'}>‹</button>
        <span style="font-size:16px;font-weight:700;color:var(--text)">${data.label}</span>
        <button onclick="_navMonth(1)"
          style="background:none;border:none;font-size:22px;color:${canNext?'var(--text2)':'var(--border)'};
                 cursor:${canNext?'pointer':'default'};padding:4px 8px;border-radius:8px;
                 font-family:'Outfit',sans-serif" ${canNext?'':'disabled'}>›</button>
      </div>`;

    if (!data.flyingDays && !data.duty) {
      html += `<div style="text-align:center;padding:40px 16px;color:var(--text3)">
        <div style="font-size:36px;margin-bottom:10px">📭</div>
        <div style="font-size:14px;font-weight:600">No duties assigned</div>
      </div>`;
      el.innerHTML = html;
      return;
    }

    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
      ${_statCard('Flight Time', fmtH(data.ft), 'var(--blue)')}
      ${_statCard('Duty Period', fmtH(data.dp), 'var(--blue)')}
      ${_statCard('Total Duty', fmtH(data.duty), 'var(--green)')}
      ${_statCard('Flying days', data.flyingDays, 'var(--early)')}
      ${_statCard('Sectors', data.sectors, 'var(--early)')}
      ${_statCard('Routes', data.topRoutes.length, 'var(--green)')}
      ${data.lateFinishes > 0 ? _statCard('Late finish', data.lateFinishes, 'var(--yellow)') : ''}
    </div>`;

    if (data.longestDays.length) {
      const ftRows = data.longestDays.map(ds => `
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:14px;color:var(--text)">${fmtDate(ds)}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;
                       font-weight:700;color:var(--blue)">${fmtH(data.longestFt)}</span>
        </div>`).join('');
      html += _section('Longest Flight Time', ftRows);
    }
    if (data.longestDpDays && data.longestDpDays.length) {
      const dpRows = data.longestDpDays.map(ds => `
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:14px;color:var(--text)">${fmtDate(ds)}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;
                       font-weight:700;color:var(--text2)">${fmtH(data.longestDp)}</span>
        </div>`).join('');
      html += _section('Longest Duty Period', dpRows);
    }

    if (data.lateFinishDates.length) {
      const rows = data.lateFinishDates.map(ds => {
        const flights = _getFlights(ds, APP.assignments[ds]);
        const lastArr = flights.length ? flights[flights.length - 1].arr : '—';
        return `<div style="display:flex;justify-content:space-between;align-items:center;
                    padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:14px;color:var(--text)">${fmtDate(ds)}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;
                       font-weight:700;color:var(--yellow)">→ ${lastArr}</span>
        </div>`;
      }).join('');
      html += _section('Late finish (after 00:30)', rows);
    }

    if (data.topAirports.length) {
      const rows = data.topAirports.map(([ap, count], i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:12px;font-weight:700;color:var(--text3);width:18px;text-align:right">${i + 1}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:800;
                       color:var(--text);flex:0 0 auto">${ap}</span>
          ${ap === 'PSR' ? `<span style="font-size:11px;color:var(--blue);font-weight:700;background:var(--blue-lt);padding:1px 6px;border-radius:6px">base</span>` : ''}
          <span style="font-size:12px;color:var(--text3);flex:1">${AIRPORT_COUNTRY[ap] || ''}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--text2)">${count}</span>
        </div>`).join('');
      html += _section('Airports', rows);
    }

    if (data.topRoutes.length) {
      const rows = data.topRoutes.map(([route, count], i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:12px;font-weight:700;color:var(--text3);width:18px;text-align:right">${i + 1}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:800;
                       color:var(--text);flex:1">${route}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--text2)">${count}×</span>
        </div>`).join('');
      html += _section('Routes', rows);
    }

    el.innerHTML = html;

  } else if (_statsTab === 'year') {
    const yrs = _yearsWithData();
    const currentYr = new Date().getFullYear() + _statsYearOffset;
    const data = calcYearStats(currentYr);
    const idx = yrs.indexOf(currentYr);
    const canPrev = idx < yrs.length - 1; // older year exists
    const canNext = idx > 0;              // newer year exists

    let html = `
      <div style="display:flex;align-items:center;justify-content:space-between;
                  margin-bottom:16px;padding:4px 0">
        <button onclick="_navYear(-1)"
          style="background:none;border:none;font-size:22px;color:${canPrev?'var(--text2)':'var(--border)'};
                 cursor:${canPrev?'pointer':'default'};padding:4px 8px;border-radius:8px;
                 font-family:'Outfit',sans-serif" ${canPrev?'':'disabled'}>‹</button>
        <div style="font-size:17px;font-weight:800;color:var(--text)">${data.label}</div>
        <button onclick="_navYear(1)"
          style="background:none;border:none;font-size:22px;color:${canNext?'var(--text2)':'var(--border)'};
                 cursor:${canNext?'pointer':'default'};padding:4px 8px;border-radius:8px;
                 font-family:'Outfit',sans-serif" ${canNext?'':'disabled'}>›</button>
      </div>`;

    if (!data.flyingDays && !data.duty) {
      html += `<div style="text-align:center;padding:48px 16px;color:var(--text3)">
        <div style="font-size:40px;margin-bottom:12px">📊</div>
        <div style="font-size:15px;font-weight:600">No data for ${data.label}</div>
      </div>`;
      el.innerHTML = html;
      return;
    }

    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px">
      ${_statCard('Flight Time', fmtH(data.ft), 'var(--blue)')}
      ${_statCard('Duty Period', fmtH(data.dp), 'var(--blue)')}
      ${_statCard('Total Duty', fmtH(data.duty), 'var(--green)')}
      ${_statCard('Flying days', data.flyingDays, 'var(--green)')}
      ${_statCard('Sectors', data.sectors, 'var(--green)')}
      ${_statCard('Countries', data.countries.length, 'var(--text2)')}
      ${data.lateFinishes > 0 ? _statCard('Late finishes', data.lateFinishes, 'var(--yellow)') : ''}
    </div>`;

    if (data.busiestMonth) {
      html += _section('Busiest month', `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">
          <span style="font-size:15px;font-weight:700;color:var(--text)">${fmtMonth(data.busiestMonth)}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;
                       color:var(--blue)">${fmtH(data.busiestFt)}</span>
        </div>`);
    }

    if (data.longestDays.length) {
      const rows = data.longestDays.slice(0, 3).map(ds => `
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:14px;color:var(--text)">${fmtDate(ds)}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;
                       font-weight:700;color:var(--blue)">${fmtH(data.longestFt)}</span>
        </div>`).join('');
      const note = data.longestDays.length > 1
        ? ` <span style="font-size:11px;color:var(--text3);font-weight:600">×${data.longestDays.length}</span>`
        : '';
      html += _section('Longest Flight Time' + note, rows);
    }

    if (data.lateFinishDates.length) {
      const rows = data.lateFinishDates.map(ds => {
        const flights = _getFlights(ds, APP.assignments[ds]);
        const lastArr = flights.length ? flights[flights.length - 1].arr : '—';
        return `<div style="display:flex;justify-content:space-between;align-items:center;
                    padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:14px;color:var(--text)">${fmtDate(ds)}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;
                       font-weight:700;color:var(--yellow)">→ ${lastArr}</span>
        </div>`;
      }).join('');
      html += _section(`Late finishes — after 00:30 (${data.lateFinishes})`, rows);
    }

    if (data.topAirports.length) {
      const rows = data.topAirports.map(([ap, count], i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:12px;font-weight:700;color:var(--text3);width:18px;text-align:right">${i + 1}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:800;
                       color:var(--text);flex:0 0 auto">${ap}</span>
          ${ap === 'PSR' ? `<span style="font-size:11px;color:var(--blue);font-weight:700;background:var(--blue-lt);padding:1px 6px;border-radius:6px">base</span>` : ''}
          <span style="font-size:12px;color:var(--text3);flex:1">${AIRPORT_COUNTRY[ap] || ''}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--text2)">${count}</span>
        </div>`).join('');
      html += _section('Airports', rows);
    }

    if (data.topRoutes.length) {
      const rows = data.topRoutes.map(([route, count], i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:12px;font-weight:700;color:var(--text3);width:18px;text-align:right">${i + 1}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:800;
                       color:var(--text);flex:1">${route}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--text2)">${count}×</span>
        </div>`).join('');
      html += _section('Routes', rows);
    }

    if (data.countries.length) {
      const pills = data.countries.map(c =>
        `<span style="font-size:12px;font-weight:600;color:var(--text2);background:var(--surface);
                      border:1px solid var(--border);padding:4px 10px;border-radius:8px">${c}</span>`
      ).join('');
      html += _section('Countries', `<div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0">${pills}</div>`);
    }

    el.innerHTML = html;

  } else {
    const s = calcStats();
    let html = '';

    if (!s.flyingDays && !s.totalDuty) {
      html = `<div style="text-align:center;padding:48px 16px;color:var(--text3)">
        <div style="font-size:40px;margin-bottom:12px">📊</div>
        <div style="font-size:15px;font-weight:600">No duty data yet</div>
        <div style="font-size:13px;margin-top:6px">Assign duties in the calendar to see your stats</div>
      </div>`;
      el.innerHTML = html;
      return;
    }

    const yr = new Date().getFullYear();
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px">
      ${_statCard('Flight Time', fmtH(s.totalFt), 'var(--blue)')}
      ${_statCard('Duty Period', fmtH(s.totalDp), 'var(--blue)')}
      ${_statCard('Total Duty', fmtH(s.totalDuty), 'var(--green)')}
      ${_statCard(`${yr} Flight Time`, fmtH(s.yearFt), 'var(--early)')}
      ${_statCard(`${yr} Duty Period`, fmtH(s.yearDp), 'var(--early)')}
      ${_statCard(`${yr} Total Duty`, fmtH(s.yearDuty), 'var(--green)')}
      ${_statCard('Flying days', s.flyingDays, 'var(--green)')}
      ${_statCard('Sectors', s.totalSectors, 'var(--green)')}
      ${_statCard('Countries', s.countries.length, 'var(--text2)')}
      ${_statCard('Routes', s.topRoutes.length, 'var(--text2)')}
      ${s.lateFinishes > 0 ? _statCard('Late finishes', s.lateFinishes, 'var(--yellow)') : ''}
    </div>`;

    if (s.busiestMonth) {
      html += _section('Busiest month', `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">
          <span style="font-size:15px;font-weight:700;color:var(--text)">${fmtMonth(s.busiestMonth)}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;
                       color:var(--blue)">${fmtH(s.busiestFt)}</span>
        </div>`);
    }

    if (s.longestDays.length) {
      const rows = s.longestDays.slice(0, 3).map(ds => `
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:14px;color:var(--text)">${fmtDate(ds)}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;
                       font-weight:700;color:var(--blue)">${fmtH(s.longestFt)}</span>
        </div>`).join('');

      const note = s.longestDays.length > 1
        ? ` <span style="font-size:11px;color:var(--text3);font-weight:600">×${s.longestDays.length}</span>`
        : '';

      html += _section('Longest Flight Time' + note, rows);
    }
    if (s.longestDpDays && s.longestDpDays.length) {
      const dpRows = s.longestDpDays.slice(0, 3).map(ds => `
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:14px;color:var(--text)">${fmtDate(ds)}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;
                       font-weight:700;color:var(--text2)">${fmtH(s.longestDp)}</span>
        </div>`).join('');
      html += _section('Longest Duty Period', dpRows);
    }

    if (s.lateFinishDates.length) {
      const rows = s.lateFinishDates.map(ds => {
        const flights = _getFlights(ds, APP.assignments[ds]);
        const lastArr = flights.length ? flights[flights.length - 1].arr : '—';
        return `<div style="display:flex;justify-content:space-between;align-items:center;
                    padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:14px;color:var(--text)">${fmtDate(ds)}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;
                       font-weight:700;color:var(--yellow)">→ ${lastArr}</span>
        </div>`;
      }).join('');
      html += _section(`Late finishes — after 00:30 (${s.lateFinishes})`, rows);
    }

    if (s.topAirports.length) {
      const rows = s.topAirports.map(([ap, count], i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:12px;font-weight:700;color:var(--text3);width:18px;text-align:right">${i + 1}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:800;
                       color:var(--text);flex:0 0 auto">${ap}</span>
          ${ap === 'PSR' ? `<span style="font-size:11px;color:var(--blue);font-weight:700;background:var(--blue-lt);padding:1px 6px;border-radius:6px">base</span>` : ''}
          <span style="font-size:12px;color:var(--text3);flex:1">${AIRPORT_COUNTRY[ap] || ''}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--text2)">${count}</span>
        </div>`).join('');
      html += _section('Airports', rows);
    }

    if (s.topRoutes.length) {
      const rows = s.topRoutes.map(([route, count], i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:12px;font-weight:700;color:var(--text3);width:18px;text-align:right">${i + 1}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:800;
                       color:var(--text);flex:1">${route}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--text2)">${count}×</span>
        </div>`).join('');
      html += _section('Routes', rows);
    }

    if (s.countries.length) {
      const pills = s.countries.map(c =>
        `<span style="font-size:12px;font-weight:600;color:var(--text2);background:var(--surface);
                      border:1px solid var(--border);padding:4px 10px;border-radius:8px">${c}</span>`
      ).join('');
      html += _section('Countries', `<div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0">${pills}</div>`);
    }

    // Achievements — collapsible section. Closed by default.
    const achs = calcAchievements();
    const earned = achs.filter(a => a.achieved).length;
    const total  = achs.length;
    const headerColor = earned > 0 ? 'var(--green)' : 'var(--text3)';
    html += `
      <div style="margin-top:18px;background:var(--surface);border:1px solid var(--border);
                  border-radius:14px;overflow:hidden">
        <button onclick="_toggleAchievements()"
          style="width:100%;display:flex;align-items:center;justify-content:space-between;
                 padding:14px 16px;background:none;border:none;cursor:pointer;
                 font-family:'Outfit',sans-serif;color:var(--text);text-align:left">
          <span style="display:flex;align-items:center;gap:8px">
            <span style="font-size:18px">🏅</span>
            <span style="font-size:14px;font-weight:700">Achievements</span>
            <span style="font-size:12px;font-weight:700;color:${headerColor};background:var(--bg);
                         padding:2px 8px;border-radius:6px;border:1px solid var(--border)">
              ${earned}/${total}
            </span>
          </span>
          <span style="font-size:14px;color:var(--text3);font-weight:700">${_statsAchievementsOpen ? '⌄' : '›'}</span>
        </button>
        ${_statsAchievementsOpen ? `
        <div style="padding:0 16px 14px">
          ${achs.map(a => `
            <div style="display:flex;align-items:center;gap:12px;padding:8px 0;
                        border-top:1px solid var(--border);
                        opacity:${a.achieved ? 1 : 0.45}">
              <div style="font-size:22px;width:32px;text-align:center;
                          filter:${a.achieved ? 'none' : 'grayscale(1)'}">${a.icon}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:700;color:var(--text)">${a.label}</div>
                <div style="font-size:11px;color:var(--text3);margin-top:2px">
                  ${a.achieved ? '✓ Achieved' : `${a.current} / ${a.target}`}
                </div>
              </div>
            </div>
          `).join('')}
        </div>` : ''}
      </div>`;

    el.innerHTML = html;
  }
}

// ── UI helpers ────────────────────────────────────────────────
function _statCard(label, value, color) {
  return `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px 16px">
      <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;
                  color:var(--text3);margin-bottom:6px">${label}</div>
      <div style="font-size:22px;font-weight:800;color:${color};
                  font-family:'JetBrains Mono',monospace;line-height:1">${value}</div>
    </div>`;
}

function _section(title, content) {
  return `
    <div style="margin-bottom:20px">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
                  color:var(--text3);margin-bottom:8px">${title}</div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;
                  padding:4px 16px">${content}</div>
    </div>`;
}

window.renderStatistics = renderStatistics;
