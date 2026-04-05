// ══════════════════════════════════════════════════════════════
// INJECT STYLES — day detail redesign (self-contained)
// ══════════════════════════════════════════════════════════════
(function injectDDStyles() {
  if (document.getElementById('dd-styles')) return;
  const s = document.createElement('style');
  s.id = 'dd-styles';
  s.textContent = `
    #dayDetailScreen {
      position: fixed;
      inset: 0;
      background: var(--bg);
      z-index: 200;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .dd-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      height: max(52px, calc(44px + env(safe-area-inset-top)));
      padding-top: env(safe-area-inset-top);
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
      gap: 8px;
    }
    .dd-back {
      background: none;
      border: none;
      font-family: 'Outfit', sans-serif;
      font-size: 15px;
      font-weight: 600;
      color: var(--blue);
      cursor: pointer;
      padding: 4px 0;
      white-space: nowrap;
    }
    .dd-daynav {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
    }
    .dd-navbtn {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: var(--text2);
      cursor: pointer;
      padding: 5px 10px;
      white-space: nowrap;
    }
    .dd-body {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: 20px 16px 8px;
    }
    .dd-date-block {
      margin-bottom: 20px;
    }
    .dd-date {
      font-size: 20px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 8px;
      line-height: 1.2;
    }
    .dd-cycle-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .dd-cycle-badge.early { background: var(--early-lt); color: var(--early); }
    .dd-cycle-badge.late  { background: var(--late-lt);  color: var(--late);  }
    .dd-cycle-badge.off   { background: var(--off-lt);   color: var(--off);   }
    .dd-cycle-sub {
      font-size: 12px;
      color: var(--text3);
      margin-top: 5px;
    }
    .dd-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 14px 16px;
      margin-bottom: 12px;
    }
    .dd-report {
      display: flex;
      align-items: baseline;
      gap: 10px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 2px;
    }
    .dd-report-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: var(--text3);
      padding-bottom: 3px;
    }
    .dd-report-time {
      font-size: 28px;
      font-weight: 800;
      color: var(--blue);
      font-variant-numeric: tabular-nums;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: -1px;
    }
    .dd-plane-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: var(--text3);
      margin: 12px 0 0;
    }
    .dd-flight-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 9px 0;
      border-bottom: 1px solid var(--border);
    }
    .dd-flight-row:last-child { border-bottom: none; }
    .dd-flight-route {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 700;
      color: var(--text);
    }
    .dd-flight-times {
      font-size: 13px;
      color: var(--text2);
      font-variant-numeric: tabular-nums;
    }
    .dd-hsby  { border-left: 3px solid var(--yellow); }
    .dd-ad    { border-left: 3px solid var(--red);    }
    .dd-leave { border-left: 3px solid var(--off);    }
    .dd-sick  { border-left: 3px solid #e11d48;       }
    .dd-duty-icon {
      font-size: 26px;
      margin-bottom: 6px;
    }
    .dd-duty-name {
      font-size: 16px;
      font-weight: 700;
      color: var(--text);
    }
    .dd-duty-time {
      font-size: 14px;
      color: var(--text2);
      margin-top: 4px;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: 0.5px;
    }
    .dd-section {
      margin-bottom: 16px;
    }
    .dd-section-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: var(--text3);
      margin-bottom: 8px;
    }
    .dd-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .dd-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px 5px 8px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      cursor: default;
      color: var(--text2);
      background: var(--surface);
      border: 1px solid var(--border);
    }
    a.dd-pill { cursor: pointer; }
    .dd-pill.swap {
      background: var(--blue-lt);
      color: var(--blue);
      border-color: var(--border);
    }
    .dd-pill.maybe { opacity: 0.55; }
    .dd-pill-r {
      font-size: 10px;
      font-weight: 800;
      opacity: 0.55;
    }
    .dd-actions {
      display: flex;
      gap: 8px;
      padding: 10px 16px;
      padding-bottom: max(14px, env(safe-area-inset-bottom));
      background: var(--surface);
      border-top: 1px solid var(--border);
      flex-shrink: 0;
    }
    .dd-action-btn {
      flex: 1;
      padding: 10px 12px;
      border-radius: 10px;
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: 1.5px solid var(--blue);
      background: var(--blue);
      color: white;
      white-space: nowrap;
    }
    .dd-action-btn.ghost {
      background: transparent;
      color: var(--text2);
      border-color: var(--border);
      font-size: 12px;
      font-weight: 600;
      padding: 9px 12px;
    }
    .dd-action-btn.outline {
      background: transparent;
      color: var(--blue);
      border-color: var(--blue);
    }
    .dd-action-btn.danger {
      flex: 0 0 auto;
      background: transparent;
      color: var(--red);
      border-color: var(--border);
      font-size: 12px;
      padding: 9px 12px;
    }
    .dd-empty {
      text-align: center;
      padding: 24px 0 8px;
      color: var(--text3);
      font-size: 14px;
    }
  `;
  document.head.appendChild(s);
})();


// ══════════════════════════════════════════════════════════════
// CALENDAR GRID
// ══════════════════════════════════════════════════════════════
function renderCalendar() {
  const today = new Date();
  if (!calYear) {
    calYear = today.getFullYear();
    calMonth = today.getMonth();
  }

  const todayStr = toDateStr(today);
  document.getElementById('calMonthTitle').textContent = `${MONTHS[calMonth]} ${calYear}`;

  const firstDow = new Date(calYear, calMonth, 1).getDay();
  const offset = (firstDow + 6) % 7;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const grid = document.getElementById('calGrid');

  const MON_FIRST = ['M','T','W','T','F','S','S'];
  let html = MON_FIRST.map(d => `<div class="cal-dow">${d}</div>`).join('');

  for (let i = 0; i < offset; i++) {
    html += `<div class="cal-day empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const day = cycleDay(APP.roster, ds);
    const type = shiftType(day);
    const isToday = ds === todayStr;
    const assign = APP.assignments[ds];

    const dow = new Date(ds + 'T12:00:00').getDay();
    const sched = SCHEDULE.days[dow];

    let cellContent = '';

    if (assign && (assign.startsWith('A1') || assign.startsWith('A2'))) {
      const useA2 = assign.startsWith('A2');
      const useLate = assign.endsWith('L');
      const plane = useA2 ? sched?.a2 : sched?.a1;
      const flights = useLate ? plane?.late : plane?.early;
      const dests = flights
        ? flights.filter(f => f.route.startsWith('PSR-')).map(f => f.route.replace('PSR-', ''))
        : [];
      cellContent = dests.length
        ? dests.map(dest => `<div class="dest">${dest}</div>`).join('')
        : '';
    } else if (assign === 'CUSTOM') {
      const cfl = APP.customFlights?.[ds] || [];
      const dests = [...new Set(cfl.filter(f => f.to && f.to !== 'PSR').map(f => f.to))];
      cellContent = dests.length
        ? dests.map(dest => `<div class="dest">${dest}</div>`).join('')
        : `<div class="dest" style="font-size:10px">✏️</div>`;
    } else if (assign === 'HSBY') {
      cellContent = `<div class="duty-icon">☎️</div>`;
    } else if (assign === 'AD') {
      cellContent = `<div class="duty-icon">🏢</div>`;
    } else if (assign === 'AL') {
      cellContent = `<div class="duty-icon">🏖️</div>`;
    } else if (assign === 'VTO') {
      cellContent = `<div class="off-label">VTO</div>`;
    } else if (assign === 'SICK') {
      cellContent = `<div class="duty-icon">🏥</div>`;
    } else if (assign === 'UL') {
      cellContent = `<div class="duty-icon">💸</div>`;
    } else if (assign === 'PL') {
      cellContent = `<div class="duty-icon">🧑‍🧑‍🧒‍🧒</div>`;
    } else if (type === 'off') {
      cellContent = `<div class="off-label">OFF</div>`;
    }

    const calType = assign
      ? (assign === 'A1E' || assign === 'A2E') ? 'early'
      : (assign === 'A1L' || assign === 'A2L') ? 'late'
      : (assign === 'AL' || assign === 'VTO' || assign === 'UL' || assign === 'PL') ? 'off'
      : assign === 'SICK' ? 'sick'
      : assign === 'CUSTOM' ? (() => {
          const cfl = APP.customFlights?.[ds] || [];
          const withTimes = cfl.filter(f => f.dep && f.arr);
          if (!withTimes.length) return 'early';
          const toMins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
          const start = toMins(withTimes[0].dep);
          const end = toMins(withTimes[withTimes.length - 1].arr);
          const noon = 12 * 60;
          const beforeNoon = Math.max(0, Math.min(noon, end) - start);
          const afterNoon = Math.max(0, end - Math.max(noon, start));
          return afterNoon > beforeNoon ? 'late' : 'early';
        })()
      : type
      : type;

    html += `
      <div class="cal-day ${calType} ${isToday ? 'today-ring' : ''}" onclick="openDay('${ds}')">
        <div class="dn">${d}</div>
        ${cellContent}
      </div>
    `;
  }

  grid.innerHTML = html;
}

function calNav(d) {
  calMonth += d;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  renderCalendar();
}

function initModalSwipe() {
  document.querySelectorAll('.modal').forEach(modal => {
    let startY = 0;
    modal.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
    modal.addEventListener('touchend', e => {
      const dy = e.changedTouches[0].clientY - startY;
      if (dy > 60) {
        const backdrop = modal.closest('.modal-backdrop');
        if (backdrop) backdrop.classList.remove('open');
      }
    }, { passive: true });
  });
}


// ══════════════════════════════════════════════════════════════
// DAY DETAIL — complete redesign
// ══════════════════════════════════════════════════════════════
let _detailDs = null;
let _detailSwipeBound = false;

function openDay(ds) {
  _detailDs = ds;
  const screen = document.getElementById('dayDetailScreen');
  screen.style.display = 'flex';
  _renderDayDetail();
  screen.querySelector('.dd-body')?.scrollTo(0, 0);
  _bindDetailSwipe(screen);
}

function closeDayDetail() {
  document.getElementById('dayDetailScreen').style.display = 'none';
  renderHome();
  renderCalendar();
}

function _navDay(dir) {
  if (!_detailDs) return;
  const d = new Date(_detailDs + 'T12:00:00');
  d.setDate(d.getDate() + dir);
  _detailDs = toDateStr(d);
  _renderDayDetail();
  document.getElementById('dayDetailScreen').querySelector('.dd-body')?.scrollTo(0, 0);
}

function _bindDetailSwipe(el) {
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
    if (!horiz || !tracking) { tracking = false; return; }
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 55) _navDay(dx < 0 ? 1 : -1);
    tracking = false;
  });

  el.addEventListener('touchcancel', () => { tracking = false; });
}

function _renderDayDetail() {
  const ds = _detailDs;
  const date = new Date(ds + 'T12:00:00');
  const dow = date.getDay();
  const day = cycleDay(APP.roster, ds);
  const type = shiftType(day);
  const lbl = shiftLabel(day);
  const sched = SCHEDULE.days[dow];
  const assign = APP.assignments?.[ds];
  const detail = APP.assignDetails?.[ds];
  const isToday = ds === toDateStr(new Date());

  // Nav labels
  const prevD = new Date(date); prevD.setDate(prevD.getDate() - 1);
  const nextD = new Date(date); nextD.setDate(nextD.getDate() + 1);
  const prevLbl = `‹ ${DOW[prevD.getDay()]} ${prevD.getDate()}`;
  const nextLbl = `${DOW[nextD.getDay()]} ${nextD.getDate()} ›`;

  // Date line
  const dateLine = (isToday ? 'Today · ' : '') +
    `${DAYS_FULL[dow]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;

  // Badge class
  const badgeClass = type === 'early' ? 'early' : type === 'late' ? 'late' : 'off';
  const badgeLbl = lbl.main || 'Day off';

  // ── Duty block ──────────────────────────────────────────────
  let dutyHtml = '';

  if (assign === 'A1E' || assign === 'A1L' || assign === 'A2E' || assign === 'A2L') {
    const useA2 = assign.startsWith('A2');
    const useLate = assign.endsWith('L');
    const plane = useA2 ? sched?.a2 : sched?.a1;
    const report = useLate ? plane?.reportLate : plane?.reportEarly;
    const flights = useLate ? plane?.late : plane?.early;
    const planeLabel = (useA2 ? 'Aereo 2' : 'Aereo 1') + ' · ' + (useLate ? 'Late' : 'Early');

    const rows = (flights || []).map(f => `
      <div class="dd-flight-row">
        <span class="dd-flight-route">${f.route}</span>
        <span class="dd-flight-times">${f.dep} → ${f.arr}</span>
      </div>
    `).join('');

    dutyHtml = `
      <div class="dd-card">
        <div class="dd-report">
          <span class="dd-report-label">Report</span>
          <span class="dd-report-time">${report || '--:--'}</span>
        </div>
        <div class="dd-plane-label">${planeLabel}</div>
        ${rows}
      </div>
    `;

  } else if (assign === 'CUSTOM') {
    const cfl = APP.customFlights?.[ds] || [];
    const report = cfl.length ? calcReport(cfl) : null;
    const rows = cfl.filter(f => f.from && f.to).map(f => `
      <div class="dd-flight-row">
        <span class="dd-flight-route">${f.from}-${f.to}</span>
        <span class="dd-flight-times">${f.dep || '--:--'} → ${f.arr || '--:--'}</span>
      </div>
    `).join('');

    dutyHtml = `
      <div class="dd-card">
        ${report && report !== '—' ? `
          <div class="dd-report">
            <span class="dd-report-label">Report</span>
            <span class="dd-report-time">${report}</span>
          </div>
        ` : ''}
        <div class="dd-plane-label">Custom flights</div>
        ${rows || '<div style="color:var(--text3);font-size:13px;padding:8px 0">No flights added yet</div>'}
        <button onclick="openCustomFlights('${ds}')"
          style="margin-top:10px;padding:7px 14px;border-radius:8px;border:1.5px solid var(--blue);background:var(--blue-lt);font-family:\'Outfit\',sans-serif;font-size:12px;font-weight:700;color:var(--blue);cursor:pointer">
          ${cfl.length ? '✏ Edit flights' : '+ Add flights'}
        </button>
      </div>
    `;

  } else if (assign === 'HSBY') {
    const ts = detail?.start && detail?.end ? `${detail.start} – ${detail.end}`
             : detail?.start ? `from ${detail.start}` : '';
    dutyHtml = `
      <div class="dd-card dd-hsby">
        <div class="dd-duty-icon">☎️</div>
        <div class="dd-duty-name">Home Standby</div>
        ${ts ? `<div class="dd-duty-time">${ts}</div>` : ''}
      </div>
    `;

  } else if (assign === 'AD') {
    const ts = detail?.start && detail?.end ? `${detail.start} – ${detail.end}`
             : detail?.start ? `from ${detail.start}` : '';
    dutyHtml = `
      <div class="dd-card dd-ad">
        <div class="dd-duty-icon">🏢</div>
        <div class="dd-duty-name">Airport Duty</div>
        ${ts ? `<div class="dd-duty-time">${ts}</div>` : ''}
      </div>
    `;

  } else if (assign === 'AL') {
    dutyHtml = `<div class="dd-card dd-leave"><div class="dd-duty-icon">🏖️</div><div class="dd-duty-name">Annual Leave</div></div>`;
  } else if (assign === 'VTO') {
    dutyHtml = `<div class="dd-card dd-leave"><div class="dd-duty-icon">🌿</div><div class="dd-duty-name">Voluntary Time Off</div></div>`;
  } else if (assign === 'SICK') {
    dutyHtml = `<div class="dd-card dd-sick"><div class="dd-duty-icon">🏥</div><div class="dd-duty-name">Sick Leave</div></div>`;
  } else if (assign === 'UL') {
    dutyHtml = `<div class="dd-card dd-leave"><div class="dd-duty-icon">💸</div><div class="dd-duty-name">Unpaid Leave</div></div>`;
  } else if (assign === 'PL') {
    dutyHtml = `<div class="dd-card dd-leave"><div class="dd-duty-icon">👨‍👩‍👧‍👦</div><div class="dd-duty-name">Parental Leave</div></div>`;
  } else if (type === 'off') {
    dutyHtml = `<div class="dd-empty">Enjoy your day off 🌿</div>`;
  }

  // ── Crew section (compact) ───────────────────────────────────
  let crewHtml = '';

  if (type !== 'off') {
    const candidates = swapCandidates(APP.roster, day);
    const sameList = getSameShiftCrew(ds);

    if (candidates.length) {
      const pills = candidates.map(c => {
        const members = (APP.crew?.[c.roster] || []).filter(m => m && (m.name || (m.code && m.code.trim())));
        const name = members.length ? (members[0].name || members[0].code) : `Roster ${c.roster}`;
        const phone = members.length ? (members[0].phone || '').replace(/\D/g, '') : '';
        const cls = 'dd-pill swap' + (c.certain === false ? ' maybe' : '');
        const inner = `<span class="dd-pill-r">R${c.roster}</span>${name}`;
        return phone
          ? `<a class="${cls}" href="https://wa.me/${phone}" target="_blank" rel="noopener noreferrer">${inner}</a>`
          : `<span class="${cls}">${inner}</span>`;
      }).join('');

      crewHtml += `
        <div class="dd-section">
          <div class="dd-section-label">Swap available</div>
          <div class="dd-pills">${pills}</div>
        </div>
      `;
    }

    const ownCrew = (APP.crew?.[APP.roster] || []).filter(m => m && m.code && m.code.trim());

    if (ownCrew.length || sameList.length) {
      const ownPills = ownCrew.map(m => {
        const name = m.name || m.code;
        const phone = (m.phone || '').replace(/\D/g, '');
        const inner = `<span class="dd-pill-r" style="color:var(--green)">R${APP.roster}</span>${name}`;
        return phone
          ? `<a class="dd-pill" href="https://wa.me/${phone}" target="_blank" rel="noopener noreferrer" style="border-left:2px solid var(--green)">${inner}</a>`
          : `<span class="dd-pill" style="border-left:2px solid var(--green)">${inner}</span>`;
      }).join('');

      const otherPills = sameList.map(r => {
        const members = (APP.crew?.[r] || []).filter(m => m && (m.name || (m.code && m.code.trim())));
        const name = members.length ? (members[0].name || members[0].code) : `Roster ${r}`;
        const phone = members.length ? (members[0].phone || '').replace(/\D/g, '') : '';
        const inner = `<span class="dd-pill-r">R${r}</span>${name}`;
        return phone
          ? `<a class="dd-pill same" href="https://wa.me/${phone}" target="_blank" rel="noopener noreferrer">${inner}</a>`
          : `<span class="dd-pill same">${inner}</span>`;
      }).join('');

      crewHtml += `
        <div class="dd-section">
          <div class="dd-section-label">Same shift</div>
          <div class="dd-pills">${ownPills}${otherPills}</div>
        </div>
      `;
    }
  }

  // ── Action bar ──────────────────────────────────────────────
  let actionsHtml = '';
  if (!assign) {
    actionsHtml = `
      <div class="dd-actions">
        <button class="dd-action-btn ghost" onclick="_openDutyPicker('${ds}')">＋ Add duty</button>
        <button class="dd-action-btn ghost" onclick="_openLeavePicker('${ds}')">＋ Add leave</button>
      </div>
    `;
  } else {
    actionsHtml = `
      <div class="dd-actions">
        <button class="dd-action-btn outline" onclick="_openDutyPicker('${ds}')">Edit duty</button>
        <button class="dd-action-btn danger" onclick="_clearDuty('${ds}')">Clear</button>
      </div>
    `;
  }

  // ── Render ──────────────────────────────────────────────────
  document.getElementById('dayDetailScreen').innerHTML = `
    <div class="dd-header">
      <button class="dd-back" onclick="closeDayDetail()">‹ Back</button>
      <div class="dd-daynav">
        <button class="dd-navbtn" onclick="_navDay(-1)">${prevLbl}</button>
        <button class="dd-navbtn" onclick="_navDay(1)">${nextLbl}</button>
      </div>
    </div>
    <div class="dd-body">
      <div class="dd-date-block">
        <div class="dd-date">${dateLine}</div>
        <div class="dd-cycle-badge ${badgeClass}">${badgeLbl}</div>
        ${lbl.sub ? `<div class="dd-cycle-sub">${lbl.sub}</div>` : ''}
      </div>
      ${dutyHtml}
      ${crewHtml}
    </div>
    ${actionsHtml}
  `;
}


// ══════════════════════════════════════════════════════════════
// DUTY / LEAVE PICKERS — open in bottom sheet modal
// ══════════════════════════════════════════════════════════════
function _openDutyPicker(ds) {
  const date = new Date(ds + 'T12:00:00');
  const dow = date.getDay();
  const sched = SCHEDULE.days[dow];

  document.getElementById('settingModalTitle').textContent = 'Set duty';
  document.getElementById('settingModalBody').innerHTML = `
    <div style="max-height:60vh; overflow-y:auto">
      ${buildDutyOptions(ds, sched)}
    </div>
    <button class="btn secondary" style="margin-top:10px" onclick="closeModal('settingModal')">Cancel</button>
  `;
  document.getElementById('settingModal').classList.add('open');
}

function _openLeavePicker(ds) {
  document.getElementById('settingModalTitle').textContent = 'Set leave';
  document.getElementById('settingModalBody').innerHTML = `
    <div style="max-height:50vh; overflow-y:auto">
      ${buildLeaveOptions(ds)}
    </div>
    <button class="btn secondary" style="margin-top:10px" onclick="closeModal('settingModal')">Cancel</button>
  `;
  document.getElementById('settingModal').classList.add('open');
}

function _clearDuty(ds) {
  if (!APP.assignments) return;
  delete APP.assignments[ds];
  if (APP.customFlights) delete APP.customFlights[ds];
  if (APP.assignDetails) delete APP.assignDetails[ds];
  save();
  renderCalendar();
  renderHome();
  _renderDayDetail();
  if (APP.notif?.enabled) scheduleAllNotifications();
}


// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
function getSameShiftCrew(ds) {
  const day = cycleDay(APP.roster, ds);
  const isEarly = day >= 1 && day <= 5;
  const isLate  = day >= 9 && day <= 13;
  if (!isEarly && !isLate) return [];
  const res = [];
  for (let r = 1; r <= 16; r++) {
    if (r === APP.roster) continue;
    const theirDay = cycleDay(r, ds);
    if (isEarly && theirDay >= 1 && theirDay <= 5) res.push(r);
    if (isLate  && theirDay >= 9 && theirDay <= 13) res.push(r);
  }
  return res;
}

function getAssignDisplay(assign) {
  const labels = {
    A1E: 'Aereo 1 Early', A1L: 'Aereo 1 Late',
    A2E: 'Aereo 2 Early', A2L: 'Aereo 2 Late',
    CUSTOM: 'Custom Flights', HSBY: 'Home Standby',
    AD: 'Airport Duty',   AL: 'Annual Leave',
    VTO: 'VTO',           SICK: 'Sick Leave',
    UL: 'Unpaid Leave',   PL: 'Parental Leave'
  };
  return labels[assign] || assign || '—';
}

function buildDutyTimeInputs(ds) {
  const hData = APP.assignDetails?.[ds];
  return `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px; margin-bottom:8px; padding:0 2px">
      <div>
        <div style="font-size:10px; color:var(--text3); font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px">Start</div>
        <input type="text" inputmode="numeric" maxlength="5" placeholder="06:00"
          value="${hData?.start || ''}"
          oninput="handleTimeInput(this,'${ds}',null,'start')"
          style="margin-bottom:0; font-family:'JetBrains Mono',monospace; font-size:16px; font-weight:600; text-align:center; letter-spacing:2px">
      </div>
      <div>
        <div style="font-size:10px; color:var(--text3); font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px">End</div>
        <input type="text" inputmode="numeric" maxlength="5" placeholder="14:00"
          value="${hData?.end || ''}"
          oninput="handleTimeInput(this,'${ds}',null,'end')"
          style="margin-bottom:0; font-family:'JetBrains Mono',monospace; font-size:16px; font-weight:600; text-align:center; letter-spacing:2px">
      </div>
    </div>
  `;
}

function buildDutyOptions(ds, sched) {
  const assign = APP.assignments[ds];
  const cFlights = APP.customFlights?.[ds] || [];
  let body = '';

  if (sched) {
    const options = [
      { id: 'A1E', label: 'Aereo 1 · Early', color: 'var(--early)', report: sched.a1.reportEarly, flights: sched.a1.early, sel: 'selected-a1' },
      { id: 'A1L', label: 'Aereo 1 · Late',  color: 'var(--late)',  report: sched.a1.reportLate,  flights: sched.a1.late,  sel: 'selected-a2' },
      { id: 'A2E', label: 'Aereo 2 · Early', color: 'var(--early)', report: sched.a2.reportEarly, flights: sched.a2.early, sel: 'selected-a1' },
      { id: 'A2L', label: 'Aereo 2 · Late',  color: 'var(--late)',  report: sched.a2.reportLate,  flights: sched.a2.late,  sel: 'selected-a2' }
    ];
    options.forEach(opt => {
      const sel = assign === opt.id;
      body += `
        <div class="assign-option ${sel ? opt.sel : ''}" onclick="setAssign('${ds}','${opt.id}')">
          <div>
            <div class="assign-label" style="color:${opt.color}">✈ ${opt.label}</div>
            <div class="assign-flights">Report ${opt.report} · ${opt.flights.map(f => f.route).join(' · ')}</div>
          </div>
          <div class="assign-check">${sel ? '✓' : ''}</div>
        </div>
      `;
    });
  }

  const hsel = assign === 'HSBY';
  body += `
    <div class="assign-option ${hsel ? 'selected-hsby' : ''}" onclick="setAssign('${ds}','HSBY')">
      <div class="assign-label" style="color:var(--yellow)">☎️ Home Standby</div>
      <div class="assign-check">${hsel ? '✓' : ''}</div>
    </div>
  `;
  if (hsel) body += buildDutyTimeInputs(ds);

  const asel = assign === 'AD';
  body += `
    <div class="assign-option ${asel ? 'selected-ad' : ''}" onclick="setAssign('${ds}','AD')">
      <div class="assign-label" style="color:var(--red)">🏢 Airport Duty</div>
      <div class="assign-check">${asel ? '✓' : ''}</div>
    </div>
  `;
  if (asel) body += buildDutyTimeInputs(ds);

  const csel = assign === 'CUSTOM';
  body += `
    <div class="assign-option ${csel ? 'selected-a1' : ''}" onclick="setAssign('${ds}','CUSTOM')">
      <div>
        <div class="assign-label" style="color:var(--blue)">✏️ Custom Flights</div>
        ${csel && cFlights.length
          ? `<div class="assign-flights">${cFlights.filter(f => f.from && f.to).map(f => f.from + '-' + f.to).join(' · ')}</div>`
          : ''}
      </div>
      <div class="assign-check">${csel ? '✓' : ''}</div>
    </div>
  `;

  return body;
}

function buildLeaveOptions(ds) {
  const assign = APP.assignments[ds];
  const options = [
    { id: 'AL',   label: 'Annual Leave (AL)',         icon: '🏖️', color: 'var(--off)',  className: 'selected-al'   },
    { id: 'VTO',  label: 'VTO · Voluntary Time Off',  icon: '🌿', color: 'var(--off)',  className: 'selected-vto'  },
    { id: 'SICK', label: 'Sick Leave (SICK)',          icon: '🏥', color: '#e11d48',    className: 'selected-sick' },
    { id: 'UL',   label: 'Unpaid Leave (UL)',          icon: '💸', color: 'var(--off)',  className: 'selected-ul'   },
    { id: 'PL',   label: 'Parental Leave (PL)',        icon: '👨‍👩‍👧‍👦', color: 'var(--off)', className: 'selected-pl'   }
  ];
  return options.map(opt => {
    const sel = assign === opt.id;
    return `
      <div class="assign-option ${sel ? opt.className : ''}" onclick="setAssign('${ds}','${opt.id}')">
        <div><div class="assign-label" style="color:${opt.color}">${opt.icon} ${opt.label}</div></div>
        <div class="assign-check">${sel ? '✓' : ''}</div>
      </div>
    `;
  }).join('');
}


// ══════════════════════════════════════════════════════════════
// SET ASSIGNMENT
// ══════════════════════════════════════════════════════════════
function setAssign(ds, val) {
  if (!APP.assignments) APP.assignments = {};

  if (val) {
    APP.assignments[ds] = val;
  } else {
    delete APP.assignments[ds];
    if (APP.customFlights) delete APP.customFlights[ds];
    if (APP.assignDetails) delete APP.assignDetails[ds];
  }

  save();
  closeModal('settingModal');
  renderCalendar();
  renderHome();

  if (val === 'CUSTOM') {
    openCustomFlights(ds);
  } else {
    _detailDs = ds;
    _renderDayDetail();
  }

  if (APP.notif?.enabled) scheduleAllNotifications();
}


// ══════════════════════════════════════════════════════════════
// CUSTOM FLIGHTS
// ══════════════════════════════════════════════════════════════
function openCustomFlights(ds) {
  const date = new Date(ds + 'T12:00:00');
  const dow = date.getDay();
  document.getElementById('customFlightsTitle').textContent =
    `${DAYS_FULL[dow]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
  renderCustomFlightsBody(ds);
  document.getElementById('customFlightsScreen').style.display = 'block';
  document.getElementById('customFlightsScreen').scrollTop = 0;
}

function closeCustomFlights() {
  const screen = document.getElementById('customFlightsScreen');
  const ds = screen.getAttribute('data-ds');
  screen.style.display = 'none';
  if (ds) {
    _detailDs = ds;
    document.getElementById('dayDetailScreen').style.display = 'flex';
    _renderDayDetail();
  }
}

function renderCustomFlightsBody(ds) {
  const screen = document.getElementById('customFlightsScreen');
  screen.setAttribute('data-ds', ds);

  const cFlights = APP.customFlights?.[ds] || [];
  const report = cFlights.length ? calcReport(cFlights) : null;

  let html = '';

  if (report && report !== '—') {
    html += `
      <div data-report style="display:flex; align-items:center; gap:8px; background:var(--blue-lt); border-radius:12px; padding:12px 16px; margin-bottom:16px; font-size:15px; font-weight:700; color:var(--blue)">
        🕐 Report ${report}
      </div>
    `;
  }

  cFlights.forEach((f, idx) => { html += buildCustomFlightRow(ds, idx, f); });

  html += `<button class="btn secondary" style="margin-top:4px" onclick="addCustomFlight('${ds}')">+ Add leg</button>`;
  if (cFlights.length > 0) {
    html += `<button class="btn" style="margin-top:8px" onclick="closeCustomFlights()">✓ Done</button>`;
  }

  document.getElementById('customFlightsBody').innerHTML = html;
}

function buildCustomFlightRow(ds, idx, f) {
  return `
    <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:14px; margin-bottom:10px; position:relative">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px">
        <div style="font-size:12px; font-weight:700; letter-spacing:1px; color:var(--text3); text-transform:uppercase">Leg ${idx + 1}</div>
        <button onclick="removeCustomFlight('${ds}',${idx})"
          style="background:var(--red-lt); border:none; border-radius:8px; color:var(--red); font-size:12px; font-weight:700; padding:4px 10px; cursor:pointer">
          Remove
        </button>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px">
        <div>
          <div style="font-size:10px; font-weight:700; letter-spacing:1px; color:var(--text3); margin-bottom:4px; text-transform:uppercase">From</div>
          <input type="text" maxlength="4" placeholder="PSR" value="${f.from || ''}"
            oninput="updateCustomFlight('${ds}',${idx},'from',this.value.toUpperCase()); this.value=this.value.toUpperCase()"
            style="margin-bottom:0; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:16px; letter-spacing:3px; text-align:center; text-transform:uppercase">
        </div>
        <div>
          <div style="font-size:10px; font-weight:700; letter-spacing:1px; color:var(--text3); margin-bottom:4px; text-transform:uppercase">To</div>
          <input type="text" maxlength="4" placeholder="FCO" value="${f.to || ''}"
            oninput="updateCustomFlight('${ds}',${idx},'to',this.value.toUpperCase()); this.value=this.value.toUpperCase()"
            style="margin-bottom:0; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:16px; letter-spacing:3px; text-align:center; text-transform:uppercase">
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
        <div>
          <div style="font-size:10px; font-weight:700; letter-spacing:1px; color:var(--text3); margin-bottom:4px; text-transform:uppercase">Dep</div>
          <input type="text" inputmode="numeric" maxlength="5" placeholder="06:00" value="${f.dep || ''}"
            oninput="handleTimeInput(this,'${ds}',${idx},'dep')"
            style="margin-bottom:0; font-family:'JetBrains Mono',monospace; font-size:16px; font-weight:600; text-align:center; letter-spacing:2px">
        </div>
        <div>
          <div style="font-size:10px; font-weight:700; letter-spacing:1px; color:var(--text3); margin-bottom:4px; text-transform:uppercase">Arr</div>
          <input type="text" inputmode="numeric" maxlength="5" placeholder="07:30" value="${f.arr || ''}"
            oninput="handleTimeInput(this,'${ds}',${idx},'arr')"
            style="margin-bottom:0; font-family:'JetBrains Mono',monospace; font-size:16px; font-weight:600; text-align:center; letter-spacing:2px">
        </div>
      </div>
    </div>
  `;
}

function handleTimeInput(el, ds, idx, field) {
  let v = el.value.replace(/\D/g, '');
  if (v.length >= 3) v = v.slice(0, 2) + ':' + v.slice(2, 4);
  el.value = v;
  if (v.length === 5) {
    if (idx !== null) updateCustomFlight(ds, idx, field, v);
    else saveDetail(ds, field, v);
  }
}

function calcReport(flights) {
  const first = flights.find(f => f.dep);
  if (!first) return '—';
  const [h, m] = first.dep.split(':').map(Number);
  let total = h * 60 + m - 45;
  if (total < 0) total += 1440;
  return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
}

function addCustomFlight(ds) {
  if (!APP.customFlights) APP.customFlights = {};
  if (!APP.customFlights[ds]) APP.customFlights[ds] = [];
  APP.customFlights[ds].push({ from: 'PSR', to: '', dep: '', arr: '' });
  save();
  renderCustomFlightsBody(ds);
}

function removeCustomFlight(ds, idx) {
  if (!APP.customFlights?.[ds]) return;
  APP.customFlights[ds].splice(idx, 1);
  if (APP.customFlights[ds].length === 0) delete APP.customFlights[ds];
  save();
  renderCustomFlightsBody(ds);
}

function updateCustomFlight(ds, idx, field, val) {
  if (!APP.customFlights) APP.customFlights = {};
  if (!APP.customFlights[ds]) APP.customFlights[ds] = [];
  if (!APP.customFlights[ds][idx]) APP.customFlights[ds][idx] = {};
  APP.customFlights[ds][idx][field] = val;
  save();
  const screen = document.getElementById('customFlightsScreen');
  if (screen && screen.style.display !== 'none') renderCustomFlightsBody(ds);
}

function saveDetail(ds, field, val) {
  if (!APP.assignDetails) APP.assignDetails = {};
  if (!APP.assignDetails[ds]) APP.assignDetails[ds] = {};
  APP.assignDetails[ds][field] = val;
  save();
  renderHome();
}

// Expose globals
window._navDay = _navDay;
window._openDutyPicker = _openDutyPicker;
window._openLeavePicker = _openLeavePicker;
window._clearDuty = _clearDuty;
