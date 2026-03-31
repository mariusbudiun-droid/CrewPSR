function renderCalendar() {
  const today = new Date();
  if (!calYear) { calYear = today.getFullYear(); calMonth = today.getMonth(); }
  const todayStr = toDateStr(today);

  document.getElementById('calMonthTitle').textContent = `${MONTHS[calMonth]} ${calYear}`;

  const firstDow = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
  // Monday-first: offset = (firstDow + 6) % 7
  const offset = (firstDow + 6) % 7;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const grid = document.getElementById('calGrid');

  const MON_FIRST = ['M','T','W','T','F','S','S'];
  let html = MON_FIRST.map(d => `<div class="cal-dow">${d}</div>`).join('');

  for (let i = 0; i < offset; i++) html += `<div class="cal-day empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const day = cycleDay(APP.roster, ds);
    const type = shiftType(day);
    const isToday = ds === todayStr;
    const assign = APP.assignments[ds];

    const dow = new Date(ds).getDay();
    const sched = SCHEDULE.days[dow];

    // Build cell content based on assignment
    let cellContent = '';
    if (assign && (assign.startsWith('A1') || assign.startsWith('A2'))) {
      const useA2 = assign.startsWith('A2');
      const useLate = assign.endsWith('L');
      const plane = useA2 ? sched?.a2 : sched?.a1;
      const flights = useLate ? plane?.late : plane?.early;
      const dests = flights
        ? flights.filter(f => f.route.startsWith('PSR-'))
                 .map(f => f.route.replace('PSR-',''))
        : [];
      cellContent = dests.length
        ? dests.map(d => `<div class="dest">${d}</div>`).join('')
        : '';
    } else if (assign === 'CUSTOM') {
      const cfl = APP.customFlights?.[ds] || [];
      const dests = [...new Set(
        cfl.filter(f => f.to && f.to !== 'PSR').map(f => f.to)
      )];
      cellContent = dests.length
        ? dests.map(d => `<div class="dest">${d}</div>`).join('')
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
          // Find first dep and last arr
          const toMins = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
          const start = toMins(withTimes[0].dep);
          const end   = toMins(withTimes[withTimes.length-1].arr);
          const noon  = 12 * 60;
          // Minutes before and after noon within duty window
          const beforeNoon = Math.max(0, Math.min(noon, end) - start);
          const afterNoon  = Math.max(0, end - Math.max(noon, start));
          return afterNoon > beforeNoon ? 'late' : 'early';
        })()
      : type
      : type;

    html += `<div class="cal-day ${calType} ${isToday ? 'today-ring' : ''}" onclick="openDay('${ds}')">
      <div class="dn">${d}</div>
      ${cellContent}
    </div>`;
  }

  grid.innerHTML = html;
}

function calNav(d) {
  calMonth += d;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  renderCalendar();
}

// Swipe-down to close modal
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
// DAY MODAL
// ══════════════════════════════════════════════════════════════
function openDay(ds) {
  const date = new Date(ds);
  const dow  = date.getDay();
  const day  = cycleDay(APP.roster, ds);
  const type = shiftType(day);
  const sched = SCHEDULE.days[dow];
  const assign = APP.assignments[ds];
  const isEarly = type === 'early';

  document.getElementById('dayDetailTitle').textContent =
    `${DAYS_FULL[dow]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
  document.getElementById('dayDetailBadge').innerHTML =
    `<div class="shift-pill ${type}">${shiftLabelStr(day)}</div>`;

  let body = '';

  // Assignment picker — always show all options
  body += `<div style="font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--text3); margin-bottom:10px">Assignment</div>`;

  if (sched) {
    const options = [
      { id:'A1E', label:'Aereo 1 · Early', color:'var(--early)', report: sched.a1.reportEarly, flights: sched.a1.early },
      { id:'A1L', label:'Aereo 1 · Late',  color:'var(--late)',  report: sched.a1.reportLate,  flights: sched.a1.late  },
      { id:'A2E', label:'Aereo 2 · Early', color:'var(--early)', report: sched.a2.reportEarly, flights: sched.a2.early },
      { id:'A2L', label:'Aereo 2 · Late',  color:'var(--late)',  report: sched.a2.reportLate,  flights: sched.a2.late  },
    ];
    const selClass = { A1E:'selected-a1', A1L:'selected-a2', A2E:'selected-a1', A2L:'selected-a2' };
    options.forEach(opt => {
      const sel = assign === opt.id;
      body += `<div class="assign-option ${sel ? selClass[opt.id] : ''}" onclick="setAssign('${ds}','${opt.id}')">
        <div>
          <div class="assign-label" style="color:${opt.color}">✈ ${opt.label}</div>
          <div class="assign-flights">Report ${opt.report} · ${opt.flights.map(f=>f.route).join(' · ')}</div>
        </div>
        <div class="assign-check">${sel ? '✓' : ''}</div>
      </div>`;
    });
  }

  // HSBY / AD with time inputs when selected
  const hsel = assign === 'HSBY';
  const asel = assign === 'AD';
  const hData = APP.assignDetails?.[ds];

  body += `<div class="assign-option ${hsel ? 'selected-hsby' : ''}" onclick="setAssign('${ds}','HSBY')">
    <div class="assign-label" style="color:var(--yellow)">🏠 Home Standby</div>
    <div class="assign-check">${hsel ? '✓' : ''}</div>
  </div>`;

  if (hsel) {
    body += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:8px; padding:0 2px">
      <div>
        <div style="font-size:10px; color:var(--text3); font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px">Start</div>
        <input type="text" inputmode="numeric" maxlength="5" placeholder="06:00"
          value="${hData?.start||''}"
          oninput="handleTimeInput(this,'${ds}',null,'start')"
          style="margin-bottom:0; font-family:'JetBrains Mono',monospace; font-size:16px; font-weight:600; text-align:center; letter-spacing:2px">
      </div>
      <div>
        <div style="font-size:10px; color:var(--text3); font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px">End</div>
        <input type="text" inputmode="numeric" maxlength="5" placeholder="14:00"
          value="${hData?.end||''}"
          oninput="handleTimeInput(this,'${ds}',null,'end')"
          style="margin-bottom:0; font-family:'JetBrains Mono',monospace; font-size:16px; font-weight:600; text-align:center; letter-spacing:2px">
      </div>
    </div>`;
  }

  body += `<div class="assign-option ${asel ? 'selected-ad' : ''}" onclick="setAssign('${ds}','AD')">
    <div class="assign-label" style="color:var(--red)">🏢 Airport Duty</div>
    <div class="assign-check">${asel ? '✓' : ''}</div>
  </div>`;

  if (asel) {
    body += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:8px; padding:0 2px">
      <div>
        <div style="font-size:10px; color:var(--text3); font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px">Start</div>
        <input type="text" inputmode="numeric" maxlength="5" placeholder="06:00"
          value="${hData?.start||''}"
          oninput="handleTimeInput(this,'${ds}',null,'start')"
          style="margin-bottom:0; font-family:'JetBrains Mono',monospace; font-size:16px; font-weight:600; text-align:center; letter-spacing:2px">
      </div>
      <div>
        <div style="font-size:10px; color:var(--text3); font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px">End</div>
        <input type="text" inputmode="numeric" maxlength="5" placeholder="14:00"
          value="${hData?.end||''}"
          oninput="handleTimeInput(this,'${ds}',null,'end')"
          style="margin-bottom:0; font-family:'JetBrains Mono',monospace; font-size:16px; font-weight:600; text-align:center; letter-spacing:2px">
      </div>
    </div>`;
  }

  // Custom flight option
  const cFlights = APP.customFlights?.[ds] || [];
  const csel = assign === 'CUSTOM';
  body += `<div class="assign-option ${csel ? 'selected-a1' : ''}" onclick="setAssign('${ds}','CUSTOM')">
    <div>
      <div class="assign-label" style="color:var(--blue)">✏️ Custom flights</div>
      ${csel && cFlights.length > 0 ? `<div class="assign-flights">${cFlights.filter(f=>f.from&&f.to).map(f=>f.from+'-'+f.to).join(' · ')}</div>` : ''}
    </div>
    <div class="assign-check">${csel ? '✓' : ''}</div>
  </div>`;

  if (csel) {
    const report = cFlights.length ? calcReport(cFlights) : null;
    body += `<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; padding:0 2px">
      ${report && report !== '—' ? `<div style="display:inline-flex; align-items:center; gap:6px; background:var(--blue-lt); border-radius:8px; padding:6px 12px; font-size:13px; font-weight:600; color:var(--blue)">🕐 Report ${report}</div>` : '<div></div>'}
      <button onclick="openCustomFlights('${ds}')"
        style="padding:8px 16px; border-radius:10px; border:1.5px solid var(--blue); background:var(--blue-lt);
               font-family:'Outfit',sans-serif; font-size:13px; font-weight:700; color:var(--blue); cursor:pointer">
        ${cFlights.length > 0 ? '✏️ Edit flights' : '+ Add flights'}
      </button>
    </div>`;
  }

  if (assign) {
    body += `<button class="btn secondary" style="margin-top:4px; margin-bottom:8px" onclick="setAssign('${ds}',null)">✕ Clear</button>`;
  }

  // Leave / absence types
  const alSel   = assign === 'AL';
  const vtoSel  = assign === 'VTO';
  const sickSel = assign === 'SICK';
  const ulSel   = assign === 'UL';
  const plSel   = assign === 'PL';
  body += `<div class="assign-option ${alSel ? 'selected-al' : ''}" onclick="setAssign('${ds}','AL')">
    <div><div class="assign-label" style="color:var(--off)">🏖️ Annual Leave (AL)</div></div>
    <div class="assign-check">${alSel ? '✓' : ''}</div>
  </div>`;
  body += `<div class="assign-option ${vtoSel ? 'selected-vto' : ''}" onclick="setAssign('${ds}','VTO')">
    <div><div class="assign-label" style="color:var(--off)">🌿 VTO · Voluntary Time Off</div></div>
    <div class="assign-check">${vtoSel ? '✓' : ''}</div>
  </div>`;
  body += `<div class="assign-option ${sickSel ? 'selected-sick' : ''}" onclick="setAssign('${ds}','SICK')">
    <div><div class="assign-label" style="color:#e11d48">🏥 Sick Leave (SICK)</div></div>
    <div class="assign-check">${sickSel ? '✓' : ''}</div>
  </div>`;
  body += `<div class="assign-option ${ulSel ? 'selected-ul' : ''}" onclick="setAssign('${ds}','UL')">
    <div><div class="assign-label" style="color:var(--off)">💸 Unpaid Leave (UL)</div></div>
    <div class="assign-check">${ulSel ? '✓' : ''}</div>
  </div>`;
  body += `<div class="assign-option ${plSel ? 'selected-pl' : ''}" onclick="setAssign('${ds}','PL')">
    <div><div class="assign-label" style="color:var(--off)">🧑‍🧑‍🧒‍🧒 Parental Leave (PL)</div></div>
    <div class="assign-check">${plSel ? '✓' : ''}</div>
  </div>`;

  // Done button
  body += `<button class="btn" style="margin-bottom:16px" onclick="closeDayDetail()">✓ Done</button>`;

  // Swap candidates
  if (type !== 'off') {
    body += `<div style="font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--text3); margin-bottom:10px">Available for swap</div>`;
    const candidates = swapCandidates(APP.roster, day);
    body += candidates.map(c => buildSwapCard(c)).join('') ||
      `<div style="font-size:13px; color:var(--text3)">No colleagues available</div>`;

    // Same shift colleagues (compact)
    const sameShiftList = (() => {
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
    })();
    if (sameShiftList.length) {
      body += `<div style="font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--text3); margipx 0 6px">Same shift today</div>`;
      body += buildSameShiftCards(sameShiftList);
    }
  }

  document.getElementById('dayDetailBody').innerHTML = body;
  document.getElementById('dayDetailScreen').style.display = 'block';
  document.getElementById('dayDetailScreen').scrollTop = 0;
}

function setAssign(ds, val) {
  if (!APP.assignments) APP.assignments = {};
  if (val) APP.assignments[ds] = val;
  else {
    delete APP.assignments[ds];
    if (APP.customFlights) delete APP.customFlights[ds];
    if (APP.assignDetails) delete APP.assignDetails[ds];
  }
  save();
  openDay(ds);
  renderCalendar();
  if (APP.notif?.enabled) scheduleAllNotifications();
}

function openCustomFlights(ds) {
  const date = new Date(ds);
  const dow = date.getDay();
  document.getElementById('customFlightsTitle').textContent =
    `${DAYS_FULL[dow]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
  renderCustomFlightsBody(ds);
  document.getElementById('customFlightsScreen').style.display = 'block';
  document.getElementById('customFlightsScreen').scrollTop = 0;
}

function closeCustomFlights() {
  const screen = document.getElementById('customFlightsScreen');
  // Get the ds from the current body
  const ds = screen.getAttribute('data-ds');
  screen.style.display = 'none';
  if (ds) openDay(ds);
}

function renderCustomFlightsBody(ds) {
  const screen = document.getElementById('customFlightsScreen');
  screen.setAttribute('data-ds', ds);
  const cFlights = APP.customFlights?.[ds] || [];
  const report = cFlights.length ? calcReport(cFlights) : null;

  let html = '';

  if (report && report !== '—') {
    html += `<div style="display:flex; align-items:center; gap:8px; background:var(--blue-lt);
               border-radius:12px; padding:12px 16px; margin-bottom:16px; font-size:15px; font-weight:700; color:var(--blue)">
      🕐 Report ${report}
    </div>`;
  }

  cFlights.forEach((f, idx) => {
    html += buildCustomFlightRow(ds, idx, f);
  });

  html += `<button class="btn secondary" style="margin-top:4px" onclick="addCustomFlight('${ds}')">+ Add leg</button>`;
  if (cFlights.length > 0) {
    html += `<button class="btn" style="margin-top:8px" onclick="closeCustomFlights()">✓ Done</button>`;
  }

  document.getElementById('customFlightsBody').innerHTML = html;
}

function buildCustomFlightRow(ds, idx, f) {
  return `<div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:14px; margin-bottom:10px; position:relative; box-shadow:var(--shadow)">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px">
      <div style="font-size:12px; font-weight:700; letter-spacing:1px; color:var(--text3); text-transform:uppercase">Leg ${idx+1}</div>
      <button onclick="removeCustomFlight('${ds}',${idx})"
        style="background:var(--red-lt); border:none; border-radius:8px; color:var(--red);
               font-size:12px; font-weight:700; padding:4px 10px; cursor:pointer">Remove</button>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px">
      <div>
        <div style="font-size:10px; font-weight:700; letter-spacing:1px; color:var(--text3); margin-bottom:4px; text-transform:uppercase">From</div>
        <input type="text" maxlength="4" placeholder="PSR" value="${f.from||''}"
          oninput="updateCustomFlight('${ds}',${idx},'from',this.value.toUpperCase()); this.value=this.value.toUpperCase()"
          style="margin-bottom:0; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:16px; letter-spacing:3px; text-align:center; text-transform:uppercase">
      </div>
      <div>
        <div style="font-size:10px; font-weight:700; letter-spacing:1px; color:var(--text3); margin-bottom:4px; text-transform:uppercase">To</div>
        <input type="text" maxlength="4" placeholder="FCO" value="${f.to||''}"
          oninput="updateCustomFlight('${ds}',${idx},'to',this.value.toUpperCase()); this.value=this.value.toUpperCase()"
          style="margin-bottom:0; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:16px; letter-spacing:3px; text-align:center; text-transform:uppercase">
      </div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
      <div>
        <div style="font-size:10px; font-weight:700; letter-spacing:1px; color:var(--text3); margin-bottom:4px; text-transform:uppercase">Dep</div>
        <input type="text" inputmode="numeric" maxlength="5" placeholder="06:00" value="${f.dep||''}"
          oninput="handleTimeInput(this,'${ds}',${idx},'dep')"
          style="margin-bottom:0; font-family:'JetBrains Mono',monospace; font-size:16px; font-weight:600; text-align:center; letter-spacing:2px">
      </div>
      <div>
        <div style="font-size:10px; font-weight:700; letter-spacing:1px; color:var(--text3); margin-bottom:4px; text-transform:uppercase">Arr</div>
        <input type="text" inputmode="numeric" maxlength="5" placeholder="07:30" value="${f.arr||''}"
          oninput="handleTimeInput(this,'${ds}',${idx},'arr')"
          style="margin-bottom:0; font-family:'JetBrains Mono',monospace; font-size:16px; font-weight:600; text-align:center; letter-spacing:2px">
      </div>
    </div>
  </div>`;
}

function handleTimeInput(el, ds, idx, field) {
  let v = el.value.replace(/\D/g, '');
  if (v.length >= 3) v = v.slice(0,2) + ':' + v.slice(2,4);
  el.value = v;
  if (v.length === 5) {
    if (idx !== null) {
      updateCustomFlight(ds, idx, field, v);
    } else {
      saveDetail(ds, field, v);
    }
  }
}

function calcReport(flights) {
  const first = flights.find(f => f.dep);
  if (!first) return '—';
  const [h, m] = first.dep.split(':').map(Number);
  let total = h * 60 + m - 45;
  if (total < 0) total += 1440;
  return String(Math.floor(total/60)).padStart(2,'0') + ':' + String(total%60).padStart(2,'0');
}

function addCustomFlight(ds) {
  if (!APP.customFlights) APP.customFlights = {};
  if (!APP.customFlights[ds]) APP.customFlights[ds] = [];
  APP.customFlights[ds].push({from:'PSR', to:'', dep:'', arr:''});
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
  // Refresh report pill if on custom screen
  const screen = document.getElementById('customFlightsScreen');
  if (screen && screen.style.display !== 'none') {
    const cFlights = APP.customFlights[ds] || [];
    const report = calcReport(cFlights);
    const pill = screen.querySelector('[data-report]');
    if (pill && report && report !== '—') pill.textContent = '🕐 Report ' + report;
  }
}

function saveDetail(ds, field, val) {
  if (!APP.assignDetails) APP.assignDetails = {};
  if (!APP.assignDetails[ds]) APP.assignDetails[ds] = {};
  APP.assignDetails[ds][field] = val;
  save();
  renderHome();
}
