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
      .map(f => { const [from, to] = f.route.split('-'); return { from, to, dep: f.dep, arr: f.arr }; });
  }
  return [];
}

function _calcFtDp(flights, assign, detail) {
  // AD: no FT, DP = full duration
  if (assign === 'AD') {
    if (detail?.start && detail?.end) {
      const toM = _toMins;
      let dp = toM(detail.end) - toM(detail.start);
      if (dp < 0) dp += 1440;
      return { ft: 0, dp };
    }
    return { ft: 0, dp: 480 }; // default 8h in mins
  }
  // HSBY: no FT, DP = 25% of duration
  if (assign === 'HSBY') {
    if (detail?.start && detail?.end) {
      const toM = _toMins;
      let dur = toM(detail.end) - toM(detail.start);
      if (dur < 0) dur += 1440;
      return { ft: 0, dp: Math.round(dur * 0.25) };
    }
    return { ft: 0, dp: Math.round(9 * 60 * 0.25) }; // 9h × 25% = 135 mins
  }

  if (!flights.length) return { ft: 0, dp: 0 };
  const toM = _toMins;

  let ft = 0;
  for (const f of flights) {
    let diff = toM(f.arr) - toM(f.dep);
    if (diff < 0) diff += 1440;
    ft += diff;
  }

  const firstDep = toM(flights[0].dep);
  const lastArr  = toM(flights[flights.length - 1].arr);
  let dp = (lastArr + 30) - (firstDep - 45);
  if (dp < 0 || lastArr < firstDep - 60) dp += 1440;

  return { ft, dp };
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
  let totalFtMins = 0, totalDpMins = 0, yearFtMins = 0, yearDpMins = 0;
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

    for (const f of flights) {
      totalSectors++;
      if (f.from) airportCount[f.from] = (airportCount[f.from] || 0) + 1;
      if (f.to)   airportCount[f.to]   = (airportCount[f.to]   || 0) + 1;
      if (f.from === 'PSR' && f.to) routeCount[`PSR-${f.to}`] = (routeCount[`PSR-${f.to}`] || 0) + 1;
    }
    totalFtMins += ft;
    totalDpMins += dp;
    dayFtMap[ds] = ft / 60;
    dayDpMap[ds] = dp / 60;
    const yr = new Date(ds + 'T12:00:00').getFullYear();
    if (yr === thisYear) { yearFtMins += ft; yearDpMins += dp; }

    if (cycleDay(APP.roster, ds) === 13 && _isLateFinish(flights)) {
      lateFinishes++;
      lateFinishDates.push(ds);
    }
  }

  const topAirports = Object.entries(airportCount).sort((a,b) => b[1]-a[1]);
  const topRoutes   = Object.entries(routeCount).sort((a,b) => b[1]-a[1]);

  let maxFt = 0, longestDays = [];
  for (const [ds, h] of Object.entries(dayFtMap)) {
    if (h > maxFt) { maxFt = h; longestDays = [ds]; }
    else if (h === maxFt && h > 0) longestDays.push(ds);
  }

  const monthFtMins = {};
  for (const ds of Object.keys(dayFtMap)) {
    const key = ds.slice(0, 7);
    monthFtMins[key] = (monthFtMins[key] || 0) + dayFtMap[ds] * 60;
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
    totalFt: totalFtMins/60, totalDp: totalDpMins/60,
    yearFt: yearFtMins/60, yearDp: yearDpMins/60,
    flyingDays, totalSectors, topAirports, topRoutes,
    longestDays, longestFt: maxFt,
    busiestMonth, busiestFt: busiestFtMins/60,
    countries: [...countries].sort(),
    lateFinishes, lateFinishDates,
    dayFtMap, dayDpMap,
  };
}

// ── Monthly stats (year + month as params) ────────────────────
function calcMonthStats(year, month) {
  const prefix = `${year}-${String(month+1).padStart(2,'0')}`;
  const assignments = APP.assignments || {};

  let ftMins = 0, dpMins = 0, flyingDays = 0, sectors = 0;
  const airportCount = {}, routeCount = {}, dayFtMap = {}, dayDpMap = {};
  let lateFinishes = 0, lateFinishDates = [];

  for (const [ds, assign] of Object.entries(assignments)) {
    if (!ds.startsWith(prefix)) continue;
    const flights = _getFlights(ds, assign);
    const detail  = APP.assignDetails?.[ds];
    if (!flights.length && assign !== 'AD' && assign !== 'HSBY') continue;

    if (flights.length) flyingDays++;
    const { ft, dp } = _calcFtDp(flights, assign, detail);
    ftMins += ft;
    dpMins += dp;
    if (ft > 0) {
      dayFtMap[ds] = ft / 60;
      dayDpMap[ds] = dp / 60;
    }
    sectors += flights.length;

    for (const f of flights) {
      if (f.from) airportCount[f.from] = (airportCount[f.from] || 0) + 1;
      if (f.to)   airportCount[f.to]   = (airportCount[f.to]   || 0) + 1;
      if (f.from === 'PSR' && f.to) routeCount[`PSR-${f.to}`] = (routeCount[`PSR-${f.to}`] || 0) + 1;
    }

    if (cycleDay(APP.roster, ds) === 13 && _isLateFinish(flights)) {
      lateFinishes++;
      lateFinishDates.push(ds);
    }
  }

  let maxFt = 0, longestDays = [];
  for (const [ds, h] of Object.entries(dayFtMap)) {
    if (h > maxFt) { maxFt = h; longestDays = [ds]; }
    else if (h === maxFt && h > 0) longestDays.push(ds);
  }

  return {
    label:       `${MONTHS[month]} ${year}`,
    ft:          ftMins / 60,
    dp:          dpMins / 60,
    flyingDays,  sectors,
    topAirports: Object.entries(airportCount).sort((a,b) => b[1]-a[1]),
    topRoutes:   Object.entries(routeCount).sort((a,b) => b[1]-a[1]),
    longestDays, longestFt: maxFt,
    lateFinishes, lateFinishDates,
    dayFtMap, dayDpMap,
  };
}

// ── Total duty with 100% HSBY ─────────────────────────────────
function calcTotalDutyFull() {
  const assignments = APP.assignments || {};
  let total = 0;
  for (const [ds, assign] of Object.entries(assignments)) {
    const detail = APP.assignDetails?.[ds];
    if (assign === 'HSBY') {
      if (detail?.start && detail?.end) {
        let dur = _toMins(detail.end) - _toMins(detail.start);
        if (dur < 0) dur += 1440;
        total += dur / 60;
      } else {
        total += 9;
      }
    } else {
      total += _calcFtDp(_getFlights(ds, assign), assign, detail).dp / 60;
    }
  }
  return total;
}

// ── State ─────────────────────────────────────────────────────
let _statsTab        = 'month';
let _statsMonthOffset = 0; // 0 = current, +1 = next, -1 = last month, etc.

function renderStatistics() {
  const el = document.getElementById('statsBody');
  if (!el) return;

  el.innerHTML = `
    <div style="display:flex;gap:0;margin-bottom:16px;background:var(--surface);
                border:1px solid var(--border);border-radius:12px;overflow:hidden">
      <button onclick="_switchStatsTab('month')"
        style="flex:1;padding:10px;border:none;font-family:'Outfit',sans-serif;
               font-size:13px;font-weight:700;cursor:pointer;
               background:${_statsTab==='month'?'var(--blue)':'var(--surface)'};
               color:${_statsTab==='month'?'white':'var(--text2)'}">
        Monthly
      </button>
      <button onclick="_switchStatsTab('all')"
        style="flex:1;padding:10px;border:none;border-left:1px solid var(--border);
               font-family:'Outfit',sans-serif;font-size:13px;font-weight:700;cursor:pointer;
               background:${_statsTab==='all'?'var(--blue)':'var(--surface)'};
               color:${_statsTab==='all'?'white':'var(--text2)'}">
        General
      </button>
    </div>
    <div id="statsContent"></div>
  `;

  _renderStatsContent();
}

function _switchStatsTab(tab) {
  _statsTab = tab;
  if (tab === 'month') _statsMonthOffset = 0;
  renderStatistics();
}
window._switchStatsTab = _switchStatsTab;

function _navMonth(dir) {
  _statsMonthOffset = Math.max(-12, Math.min(1, _statsMonthOffset + dir));
  _renderStatsContent();
}
window._navMonth = _navMonth;

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

  const fmtH    = fmtHours;
  const fmtDate = ds => {
    const d = new Date(ds + 'T12:00:00');
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };
  const fmtMonth = key => {
    if (!key) return '—';
    const [y, mo] = key.split('-');
    return `${MONTHS[parseInt(mo)-1]} ${y}`;
  };

  if (_statsTab === 'month') {
    const { y, m } = _getSelectedMonthYM();
    const data = calcMonthStats(y, m);

    // ── Month navigator ──
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

    if (!data.flyingDays) {
      html += `<div style="text-align:center;padding:40px 16px;color:var(--text3)">
        <div style="font-size:36px;margin-bottom:10px">📭</div>
        <div style="font-size:14px;font-weight:600">No flights assigned</div>
      </div>`;
      el.innerHTML = html; return;
    }

    // Summary cards
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
      ${_statCard('Flight Time', fmtH(data.ft), 'var(--blue)')}
      ${_statCard('Duty Period', fmtH(data.dp), 'var(--text2)')}
      ${_statCard('Flying days', data.flyingDays, 'var(--early)')}
      ${_statCard('Sectors', data.sectors, 'var(--early)')}
      ${_statCard('Routes', data.topRoutes.length, 'var(--green)')}
      ${data.lateFinishes > 0 ? _statCard('Late finish', data.lateFinishes, 'var(--yellow)') : ''}
    </div>`;

    // Longest day
    if (data.longestDays.length) {
      const rows = data.longestDays.map(ds => `
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:14px;color:var(--text)">${fmtDate(ds)}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;
                       font-weight:700;color:var(--blue)">${fmtH(data.longestFt)}</span>
        </div>`).join('');
      const note = data.longestDays.length > 1
        ? ` <span style="font-size:11px;color:var(--text3);font-weight:600">×${data.longestDays.length}</span>` : '';
      html += _section('Longest day' + note, rows);
    }

    // Late finish dates
    if (data.lateFinishDates.length) {
      const rows = data.lateFinishDates.map(ds => {
        const flights = _getFlights(ds, APP.assignments[ds]);
        const lastArr = flights.length ? flights[flights.length-1].arr : '—';
        return `<div style="display:flex;justify-content:space-between;align-items:center;
                    padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:14px;color:var(--text)">${fmtDate(ds)}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;
                       font-weight:700;color:var(--yellow)">→ ${lastArr}</span>
        </div>`;
      }).join('');
      html += _section('Late finish (after 00:30)', rows);
    }

    // Airports
    if (data.topAirports.length) {
      const rows = data.topAirports.map(([ap, count], i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:12px;font-weight:700;color:var(--text3);width:18px;text-align:right">${i+1}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:800;
                       color:var(--text);flex:0 0 auto">${ap}</span>
          ${ap === 'PSR' ? `<span style="font-size:11px;color:var(--blue);font-weight:700;background:var(--blue-lt);padding:1px 6px;border-radius:6px">base</span>` : ''}
          <span style="font-size:12px;color:var(--text3);flex:1">${AIRPORT_COUNTRY[ap] || ''}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--text2)">${count}</span>
        </div>`).join('');
      html += _section('Airports', rows);
    }

    // Routes
    if (data.topRoutes.length) {
      const rows = data.topRoutes.map(([route, count], i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:12px;font-weight:700;color:var(--text3);width:18px;text-align:right">${i+1}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:800;
                       color:var(--text);flex:1">${route}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--text2)">${count}×</span>
        </div>`).join('');
      html += _section('Routes', rows);
    }

    el.innerHTML = html;

  } else {
    // ── General ──────────────────────────────────────────────
    const s = calcStats();
    let html = '';

    if (!s.flyingDays) {
      html = `<div style="text-align:center;padding:48px 16px;color:var(--text3)">
        <div style="font-size:40px;margin-bottom:12px">📊</div>
        <div style="font-size:15px;font-weight:600">No flight data yet</div>
        <div style="font-size:13px;margin-top:6px">Assign duties in the calendar to see your stats</div>
      </div>`;
      el.innerHTML = html; return;
    }

    const yr = new Date().getFullYear();
    // Total Duty including 100% HSBY
    const totalDutyFull = calcTotalDutyFull();
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
      ${_statCard('Total Flight Time', fmtH(s.totalFt), 'var(--blue)')}
      ${_statCard('Total Duty Period', fmtH(s.totalDp), 'var(--text2)')}
      ${_statCard(`${yr} Flight Time`, fmtH(s.yearFt), 'var(--early)')}
      ${_statCard(`${yr} Duty Period`, fmtH(s.yearDp), 'var(--early)')}
      ${_statCard('Flying days', s.flyingDays, 'var(--green)')}
      ${_statCard('Sectors', s.totalSectors, 'var(--green)')}
      ${_statCard('Countries', s.countries.length, 'var(--text2)')}
      ${_statCard('Routes', s.topRoutes.length, 'var(--text2)')}
      ${s.lateFinishes > 0 ? _statCard('Late finishes', s.lateFinishes, 'var(--yellow)') : ''}
    </div>`;
    // Total duty including 100% HSBY
    html += _section('Total Duty (incl. 100% HSBY)',
      '<div style="padding:8px 0">' +
      '<div style="font-size:22px;font-weight:800;color:var(--blue);font-family:\'JetBrains Mono\',monospace">' + fmtH(totalDutyFull) + '</div>' +
      '<div style="font-size:11px;color:var(--text3);margin-top:4px">Duty Period + 100% HSBY (invece di 25%). HSBY default: 9h se non specificato.</div>' +
      '</div>');

    if (s.busiestMonth) {
      html += _section('Busiest month', `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">
          <span style="font-size:15px;font-weight:700;color:var(--text)">${fmtMonth(s.busiestMonth)}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;
                       color:var(--blue)">${fmtH(s.busiestFt)}</span>
        </div>`);
    }

    if (s.longestDays.length) {
      const rows = s.longestDays.slice(0,3).map(ds => `
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:14px;color:var(--text)">${fmtDate(ds)}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;
                       font-weight:700;color:var(--blue)">${fmtH(s.longestFt)}</span>
        </div>`).join('');
      const note = s.longestDays.length > 1
        ? ` <span style="font-size:11px;color:var(--text3);font-weight:600">×${s.longestDays.length}</span>` : '';
      html += _section('Longest day' + note, rows);
    }

    if (s.lateFinishDates.length) {
      const rows = s.lateFinishDates.map(ds => {
        const flights = _getFlights(ds, APP.assignments[ds]);
        const lastArr = flights.length ? flights[flights.length-1].arr : '—';
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
          <span style="font-size:12px;font-weight:700;color:var(--text3);width:18px;text-align:right">${i+1}</span>
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
          <span style="font-size:12px;font-weight:700;color:var(--text3);width:18px;text-align:right">${i+1}</span>
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
