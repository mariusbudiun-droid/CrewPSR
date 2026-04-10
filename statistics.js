// ══════════════════════════════════════════════════════════════
// STATISTICS
// ══════════════════════════════════════════════════════════════

// Airport → country lookup
const AIRPORT_COUNTRY = {
  PSR:'Italy',BGY:'Italy',MXP:'Italy',TRN:'Italy',CTA:'Italy',TPS:'Italy',CAG:'Italy',
  STN:'UK',LHR:'UK',LGW:'UK',MAN:'UK',
  CRL:'Belgium',BRU:'Belgium',
  OTP:'Romania',CLJ:'Romania',
  KRK:'Poland',WRO:'Poland',WAW:'Poland',
  KUN:'Lithuania',VNO:'Lithuania',
  TIA:'Albania',
  MLA:'Malta',
  PRG:'Czech Republic',
  VLC:'Spain',BCN:'Spain',MAD:'Spain',
  NRN:'Germany',CGN:'Germany',BER:'Germany',MUC:'Germany',
  VIE:'Austria',
  BUD:'Hungary',
  SOF:'Bulgaria',
  ATH:'Greece',
  FCO:'Italy',NAP:'Italy',
};

// Global helper — used by calendar.js too
function fmtHours(h) {
  if (!h || h <= 0) return '0h 00m';
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  if (mm === 60) return `${hh + 1}h 00m`;
  return `${hh}h ${String(mm).padStart(2, '0')}m`;
}
window.fmtHours = fmtHours;

function calcStats() {
  const assignments   = APP.assignments   || {};
  const customFlights = APP.customFlights || {};

  let totalMins    = 0;
  let yearMins     = 0;
  let flyingDays   = 0;
  let totalSectors = 0;
  const thisYear   = new Date().getFullYear();

  const airportCount = {};
  const routeCount   = {};
  const dayHoursMap  = {}; // ds → hours

  for (const [ds, assign] of Object.entries(assignments)) {
    const date  = new Date(ds + 'T12:00:00');
    const dow   = date.getDay();
    const sched = SCHEDULE.days[dow];
    let flights = [];

    if (assign === 'CUSTOM') {
      flights = (customFlights[ds] || []).filter(f => f.from && f.to && f.dep && f.arr);
    } else if (['A1E','A1L','A2E','A2L'].includes(assign)) {
      const useA2   = assign.startsWith('A2');
      const useLate = assign.endsWith('L');
      const plane   = useA2 ? sched?.a2 : sched?.a1;
      flights = ((useLate ? plane?.late : plane?.early) || [])
        .filter(f => f.dep && f.arr)
        .map(f => {
          const [from, to] = f.route.split('-');
          return { from, to, dep: f.dep, arr: f.arr };
        });
    }

    if (!flights.length) continue;

    flyingDays++;
    let dayMins = 0;

    for (const f of flights) {
      const toM = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
      let diff = toM(f.arr) - toM(f.dep);
      if (diff < 0) diff += 1440;
      dayMins += diff;
      totalSectors++;

      // Count airports
      if (f.from) airportCount[f.from] = (airportCount[f.from] || 0) + 1;
      if (f.to)   airportCount[f.to]   = (airportCount[f.to]   || 0) + 1;

      // Routes — only PSR→X direction
      if (f.from === 'PSR' && f.to) {
        const route = `PSR-${f.to}`;
        routeCount[route] = (routeCount[route] || 0) + 1;
      }
    }

    totalMins += dayMins;
    dayHoursMap[ds] = dayMins / 60;
    if (date.getFullYear() === thisYear) yearMins += dayMins;
  }

  // Top airports
  const topAirports = Object.entries(airportCount)
    .sort((a,b) => b[1]-a[1])
    .slice(0, 10);

  // Top routes
  const topRoutes = Object.entries(routeCount)
    .sort((a,b) => b[1]-a[1])
    .slice(0, 10);

  // Longest day
  let maxHours = 0;
  let longestDays = [];
  for (const [ds, h] of Object.entries(dayHoursMap)) {
    if (h > maxHours) { maxHours = h; longestDays = [ds]; }
    else if (h === maxHours && h > 0) longestDays.push(ds);
  }

  // Busiest month
  const monthMins = {};
  for (const [ds, assign] of Object.entries(assignments)) {
    const h = dayHoursMap[ds] || 0;
    if (!h) continue;
    const key = ds.slice(0, 7); // YYYY-MM
    monthMins[key] = (monthMins[key] || 0) + h * 60;
  }
  let busiestMonth = null, busiestMins = 0;
  for (const [k, m] of Object.entries(monthMins)) {
    if (m > busiestMins) { busiestMins = m; busiestMonth = k; }
  }

  // Countries
  const countries = new Set();
  for (const ap of Object.keys(airportCount)) {
    if (AIRPORT_COUNTRY[ap]) countries.add(AIRPORT_COUNTRY[ap]);
  }

  return {
    totalHours:   totalMins / 60,
    yearHours:    yearMins / 60,
    flyingDays,
    totalSectors,
    topAirports,
    topRoutes,
    longestDays,
    longestHours: maxHours,
    busiestMonth,
    busiestHours: busiestMins / 60,
    countries:    [...countries].sort(),
  };
}

function renderStatistics() {
  const s = calcStats();
  const el = document.getElementById('statsBody');
  if (!el) return;

  const fmtH = fmtHours;

  const fmtDate = ds => {
    const d = new Date(ds + 'T12:00:00');
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  const fmtMonth = key => {
    if (!key) return '—';
    const [y, m] = key.split('-');
    return `${MONTHS[parseInt(m)-1]} ${y}`;
  };

  // ── Summary cards ──
  let html = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px">
      ${_statCard('Total hours', fmtH(s.totalHours), 'var(--blue)')}
      ${_statCard(`${new Date().getFullYear()} hours`, fmtH(s.yearHours), 'var(--blue)')}
      ${_statCard('Flying days', s.flyingDays, 'var(--early)')}
      ${_statCard('Sectors', s.totalSectors, 'var(--early)')}
      ${_statCard('Countries', s.countries.length, 'var(--green)')}
      ${_statCard('Routes', Object.keys(s.topRoutes.reduce ? {} : {}).length || s.topRoutes.length, 'var(--green)')}
    </div>
  `;

  // ── Busiest month ──
  if (s.busiestMonth) {
    html += _section('Busiest month', `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">
        <span style="font-size:15px;font-weight:700;color:var(--text)">${fmtMonth(s.busiestMonth)}</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:var(--blue)">${fmtH(s.busiestHours)}</span>
      </div>`);
  }

  // ── Longest day ──
  if (s.longestDays.length) {
    const rows = s.longestDays.slice(0,3).map(ds => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:14px;color:var(--text)">${fmtDate(ds)}</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--blue)">${fmtH(s.longestHours)}</span>
      </div>`).join('');
    const note = s.longestDays.length > 1 ? ` <span style="font-size:11px;color:var(--text3);font-weight:600">×${s.longestDays.length}</span>` : '';
    html += _section('Longest day' + note, rows);
  }

  // ── Top 10 airports ──
  if (s.topAirports.length) {
    const rows = s.topAirports.map(([ap, count], i) => {
      const isBase = ap === 'PSR';
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:12px;font-weight:700;color:var(--text3);width:18px;text-align:right">${i+1}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:800;color:var(--text);flex:0 0 auto">${ap}</span>
          ${isBase ? `<span style="font-size:11px;color:var(--blue);font-weight:700;background:var(--blue-lt);padding:1px 6px;border-radius:6px">base</span>` : ''}
          <span style="font-size:12px;color:var(--text3);flex:1;${AIRPORT_COUNTRY[ap]?'':''}">
            ${AIRPORT_COUNTRY[ap] || ''}
          </span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--text2)">${count}</span>
        </div>`;
    }).join('');
    html += _section('Top 10 airports', rows);
  }

  // ── Top routes ──
  if (s.topRoutes.length) {
    const rows = s.topRoutes.map(([route, count], i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:12px;font-weight:700;color:var(--text3);width:18px;text-align:right">${i+1}</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:800;color:var(--text);flex:1">${route}</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--text2)">${count}×</span>
      </div>`).join('');
    html += _section('Top routes', rows);
  }

  // ── Countries ──
  if (s.countries.length) {
    const pills = s.countries.map(c =>
      `<span style="font-size:12px;font-weight:600;color:var(--text2);background:var(--surface);border:1px solid var(--border);padding:4px 10px;border-radius:8px">${c}</span>`
    ).join('');
    html += _section('Countries touched', `<div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0">${pills}</div>`);
  }

  // ── No data fallback ──
  if (!s.flyingDays) {
    html = `<div style="text-align:center;padding:48px 16px;color:var(--text3)">
      <div style="font-size:40px;margin-bottom:12px">📊</div>
      <div style="font-size:15px;font-weight:600">No flight data yet</div>
      <div style="font-size:13px;margin-top:6px">Assign duties in the calendar to see your stats</div>
    </div>`;
  }

  el.innerHTML = html;
}

function _statCard(label, value, color) {
  return `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px 16px">
      <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text3);margin-bottom:6px">${label}</div>
      <div style="font-size:22px;font-weight:800;color:${color};font-family:'JetBrains Mono',monospace;line-height:1">${value}</div>
    </div>`;
}

function _section(title, content) {
  return `
    <div style="margin-bottom:20px">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);margin-bottom:8px">${title}</div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:4px 16px">${content}</div>
    </div>`;
}

window.renderStatistics = renderStatistics;
