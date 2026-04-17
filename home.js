let homeCurrentDay = 0;
const HOMEDAYS = 7;
let homeSwipeBound = false;

function renderHome() {
  const today = new Date();
  const todayDow = today.getDay();

  document.getElementById('topDay').textContent =
    `${DOW[todayDow]} ${today.getDate()} ${MONTHS[today.getMonth()]}`;
  document.getElementById('topRoster').textContent = `Roster ${APP.roster}`;

  buildHomeSlides();
  goToHomeDay(homeCurrentDay, false);

  if (!homeSwipeBound) {
    addSwipeListener(document.getElementById('homeSlider'), dir => {
      const next = homeCurrentDay + dir;
      if (next >= 0 && next < HOMEDAYS) goToHomeDay(next);
    });
    homeSwipeBound = true;
  }
}

function buildHomeSlides() {
  const slides = document.getElementById('homeSlides');
  const dots = document.getElementById('homeDots');
  const today = new Date();

  slides.innerHTML = '';
  dots.innerHTML = '';

  for (let i = 0; i < HOMEDAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);

    const ds = toDateStr(d);
    const dow = d.getDay();
    const day = cycleDay(APP.roster, ds);
    const type = shiftType(day);
    const lbl = shiftLabel(day);
    const sched = SCHEDULE.days[dow];
    const assign = APP.assignments?.[ds];
    const detail = APP.assignDetails?.[ds];

    let reportHtml = '';

    if (assign && assign !== 'HSBY' && assign !== 'AD' && assign !== 'CUSTOM') {
      const useA2 = assign.startsWith('A2');
      const useLate = assign.endsWith('L');
      const plane = useA2 ? sched?.a2 : sched?.a1;
      const t = useLate ? plane?.reportLate : plane?.reportEarly;

      if (t) {
        reportHtml = `<div class="report-time">Report ${t}</div>`;
      }
    } else if (assign === 'CUSTOM') {
      const cfl = APP.customFlights?.[ds] || [];
      const report = cfl.length ? calcReport(cfl) : null;

      if (report && report !== '--:--') {
        reportHtml = `<div class="report-time">Report ${report}</div>`;
      }
    } else if (assign === 'HSBY') {
      const ts = detail?.start && detail?.end
        ? `${detail.start}–${detail.end}`
        : detail?.start
          ? `from ${detail.start}`
          : '';
      reportHtml = `<div class="report-time">Home Standby${ts ? ` ${ts}` : ''}</div>`;
    } else if (assign === 'AD') {
      const ts = detail?.start && detail?.end
        ? `${detail.start}–${detail.end}`
        : detail?.start
          ? `from ${detail.start}`
          : '';
      reportHtml = `<div class="report-time">Airport Duty${ts ? ` ${ts}` : ''}</div>`;
    }

    const dateStr2 =
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;

    const dayLabel =
      i === 0
        ? `TODAY • ${dateStr2}`
        : i === 1
          ? `TOMORROW • ${dateStr2}`
          : `${DOW[dow].toUpperCase()} • ${dateStr2}`;

    let flightsHtml = '';
    let flightsTitle = '';

    if (assign && assign !== 'HSBY' && assign !== 'AD' && assign !== 'CUSTOM' && sched) {
      flightsTitle = i === 0 ? `Today's Flights` : `${DOW[dow]}'s Flights`;

      const useA2 = assign.startsWith('A2');
      const useLate = assign.endsWith('L');
      const plane = useA2 ? sched.a2 : sched.a1;
      const flights = useLate ? plane.late : plane.early;

      flightsHtml = buildFlightBlock(
        flights,
        useA2 ? 'Aereo 2' : 'Aereo 1',
        useA2 ? 'a2' : 'a1'
      );
    } else if (assign === 'CUSTOM') {
      const cfl = APP.customFlights?.[ds] || [];

      if (cfl.length) {
        flightsTitle = i === 0 ? `Today's Flights` : `${DOW[dow]}'s Flights`;

        const rows = cfl
          .filter(f => f.from && f.to)
          .map(f => `
            <div class="flight-row">
              <div class="flight-route">${f.from}-${f.to}</div>
              <div class="flight-times">${f.dep || '--:--'} → ${f.arr || '--:--'}</div>
            </div>
          `)
          .join('');

        flightsHtml = `
          <div class="flight-block">
            <div class="flight-block-header">
              <span class="plane-badge a1">Custom</span>
            </div>
            ${rows}
          </div>
        `;
      }
    }

    let swapHtml = '';
    let swapTitle = '';
    let sameShiftHtml = '';
    let sameShiftTitle = '';

    if (type !== 'off') {
      swapTitle = i === 0 ? 'Available for swap today' : 'Available for swap';

      const candidates = swapCandidates(APP.roster, day);
      swapHtml = candidates.length
        ? candidates.map(c => buildSwapCard(c)).join('')
        : `<div class="card" style="color:var(--text3);text-align:center;font-size:13px;">No colleagues available</div>`;

      const isEarly = day >= 1 && day <= 5;
      const isLate = day >= 9 && day <= 13;
      const sameShiftList = [];

      for (let r = 1; r <= 16; r++) {
        if (r === APP.roster) continue;
        const theirDay = cycleDay(r, ds);

        if (isEarly && theirDay >= 1 && theirDay <= 5) sameShiftList.push(r);
        if (isLate && theirDay >= 9 && theirDay <= 13) sameShiftList.push(r);
      }

      const ownCrew = (APP.crew?.[APP.roster] || []).filter(c => c && c.code && c.code.trim());

      if (ownCrew.length || sameShiftList.length) {
        sameShiftTitle = 'Same shift';
        sameShiftHtml = buildOwnCrewCard(APP.roster, ownCrew) + buildSameShiftCards(sameShiftList);
      }
    }

    // Reverse swap for off days (6, 8, 14, 16)
    let reverseHtml = '';
    if (type === 'off' && day !== 7 && day !== 15) {
      const revCandidates = typeof reverseSwapCandidates === 'function'
        ? reverseSwapCandidates(day, ds)
        : [];
      if (revCandidates.length) {
        const legend = `<div style="display:flex;gap:12px;padding:0 16px 6px;font-size:11px;color:var(--text3)">
          <span style="display:flex;align-items:center;gap:4px"><span style="width:7px;height:7px;border-radius:50%;background:var(--green);display:inline-block"></span> sicuro</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="width:7px;height:7px;border-radius:50%;background:var(--yellow);display:inline-block"></span> verifica riposo</span>
        </div>`;
        reverseHtml = legend + revCandidates.map(c => buildReverseSwapCardHome(c)).join('');
      }
    }

   const slide = document.createElement('div');
slide.className = 'home-slide';
slide.style.cssText = 'min-width:100%; width:100%; flex-shrink:0; overflow-y:auto; overflow-x:hidden; -webkit-overflow-scrolling:touch; min-height:100%;';
    slide.innerHTML = `
      <div class="today-hero" style="margin-bottom:0">
        <div class="shift-type">${dayLabel}</div>
        <div class="shift-name">${lbl.main}</div>
        ${lbl.sub ? `<div class="cycle-info">${lbl.sub}</div>` : ''}
        ${reportHtml}
        ${(() => {
  if (typeof calcDayFtDp !== 'function') return '';
  const { ft, dp } = calcDayFtDp(ds);
  if (!ft && !dp) return '';

  return `
    <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:10px">
      ${ft > 0 ? `
        <div style="display:flex;flex-direction:column;align-items:flex-start;gap:2px">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:var(--text3)">
            Flight Time
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:800;line-height:1;color:var(--blue)">
            ${typeof fmtHours === 'function' ? fmtHours(ft) : ft.toFixed(1) + 'h'}
          </div>
        </div>
      ` : ''}

      ${dp > 0 ? `
        <div style="display:flex;flex-direction:column;align-items:flex-start;gap:2px">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:var(--text3)">
            Duty Period
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:800;line-height:1;color:#f59e0b">
            ${typeof fmtHours === 'function' ? fmtHours(dp) : dp.toFixed(1) + 'h'}
          </div>
        </div>
      ` : ''}
    </div>
  `;
})()}
      </div>

      ${flightsTitle ? `<div class="section-title">${flightsTitle}</div>${flightsHtml}` : ''}
      ${swapTitle ? `<div class="section-title">${swapTitle}</div>${swapHtml}` : ''}
      ${type === 'off' && (day === 7 || day === 15) ? `<div class="card" style="margin:0 16px;text-align:center;color:var(--off);font-weight:600;">Enjoy your day off!</div>` : ''}
      ${type === 'off' && day !== 7 && day !== 15 && reverseHtml ? `<div class="section-title">You could work instead of</div>${reverseHtml}` : ''}
      ${type === 'off' && day !== 7 && day !== 15 && !reverseHtml ? `<div class="card" style="margin:0 16px;text-align:center;color:var(--off);font-weight:600;">Enjoy your day off!</div>` : ''}
      ${sameShiftTitle ? `<div class="section-title">${sameShiftTitle}</div>${sameShiftHtml}` : ''}
    `;

    slides.appendChild(slide);

    const dot = document.createElement('div');
    dot.className = `home-dot ${i === homeCurrentDay ? 'active' : ''}`;
    dot.onclick = () => goToHomeDay(i);
    dots.appendChild(dot);
  }
}

function goToHomeDay(idx, animate = true) {
  idx = Math.max(0, Math.min(HOMEDAYS - 1, idx));
  homeCurrentDay = idx;

  const slides = document.getElementById('homeSlides');
  if (!slides) return;

  if (!animate) slides.style.transition = 'none';
  slides.style.transform = `translateX(-${idx * 100}%)`;

  if (!animate) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        slides.style.transition = 'transform 0.3s ease';
      });
    });
  }

  document.querySelectorAll('.home-dot').forEach((d, i) => {
    d.classList.toggle('active', i === idx);
  });
}

function addSwipeListener(el, callback) {
  if (!el || el.dataset.swipeBound === '1') return;
  el.dataset.swipeBound = '1';

  let startX = 0;
  let startY = 0;
  let deltaX = 0;
  let deltaY = 0;
  let isTracking = false;
  let isHorizontal = false;
  let hasTriggered = false;

  el.addEventListener('touchstart', e => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    deltaX = 0;
    deltaY = 0;
    isTracking = true;
    isHorizontal = false;
    hasTriggered = false;
  }, { passive: true });

  el.addEventListener('touchmove', e => {
    if (!isTracking) return;

    const t = e.touches[0];
    deltaX = t.clientX - startX;
    deltaY = t.clientY - startY;

    if (!isHorizontal) {
      if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) {
        isHorizontal = true;
      } else if (Math.abs(deltaY) > 12 && Math.abs(deltaY) > Math.abs(deltaX)) {
        isTracking = false;
      }
    }
  }, { passive: true });

  el.addEventListener('touchend', () => {
    if (!isHorizontal || hasTriggered) {
      isTracking = false;
      return;
    }

    if (Math.abs(deltaX) >= 60) {
      hasTriggered = true;
      callback(deltaX < 0 ? 1 : -1);
    }

    isTracking = false;
  });

  el.addEventListener('touchcancel', () => {
    isTracking = false;
    isHorizontal = false;
    hasTriggered = false;
  });
}

function buildFlightBlock(flights, label, cls) {
  if (!flights || !flights.length) return '';

  const rows = flights.map(f => `
    <div class="flight-row">
      <div class="flight-route">${f.route}</div>
      <div class="flight-times">${f.dep} → ${f.arr}</div>
      ${f.note ? `<div class="flight-note">${f.note}</div>` : ''}
    </div>
  `).join('');

  return `
    <div class="flight-block">
      <div class="flight-block-header">
        <span class="plane-badge ${cls}">${label}</span>
      </div>
      ${rows}
    </div>
  `;
}

function buildOwnCrewCard(rosterNum, members) {
  if (!members.length) return '';
  const pills = members.map(m => {
    const name = m.name || m.code;
    const phone = (m.phone || '').replace(/\D/g, '');
    return phone
      ? `<a class="wa-pill" href="https://wa.me/${phone}" target="_blank" rel="noopener noreferrer">${name}</a>`
      : `<span style="font-size:11px;font-weight:600;color:var(--text);white-space:nowrap">${name}</span>`;
  }).join('');

  return `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--surface);
                border:1px solid var(--border);border-left:3px solid var(--green);border-radius:10px;
                margin:0 16px 6px">
      <div style="background:var(--green);color:white;width:30px;height:30px;border-radius:8px;
                  display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;
                  flex-shrink:0">${rosterNum}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
        <span style="font-size:10px;font-weight:700;color:var(--green);letter-spacing:0.5px;text-transform:uppercase">You</span>
        ${pills}
      </div>
    </div>
  `;
}

function buildSameShiftCards(rosterList) {
  return rosterList.map(r => {
    const members = (APP.crew?.[r] || []).filter(m => m && (m.name || m.phone || (m.code && m.code.trim())));

    const peopleHtml = members.length
      ? members.map(info => {
          const name = info.name || info.code || '';
          const phone = (info.phone || '').replace(/\D/g, '');

          return phone
            ? `<a class="wa-pill" href="https://wa.me/${phone}" target="_blank" rel="noopener noreferrer">${name}</a>`
            : `<span style="font-size:11px;font-weight:600;color:var(--text);white-space:nowrap;">${name}</span>`;
        }).join('')
      : `<span style="font-size:11px;color:var(--text3);">No contacts</span>`;

    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--blue);border-radius:10px;margin:0 16px 6px;">
        <div style="background:var(--blue);color:white;width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;">${r}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">${peopleHtml}</div>
      </div>
    `;
  }).join('');
}

function buildSwapCard(c) {
  const colleagues = (APP.crew?.[c.roster] || []).filter(x => x && x.code && x.code.trim());

  const inner = colleagues.length > 0
    ? colleagues.map(x => {
        const phone = (x.phone || '').replace(/\D/g, '');
        const name = x.name || x.code;

        return phone
          ? `
            <div style="margin-top:4px">
              <a class="wa-pill" href="https://wa.me/${phone}" target="_blank" rel="noopener noreferrer">
                ${name}
              </a>
            </div>
          `
          : `
            <div style="font-family:JetBrains Mono,monospace;font-size:13px;margin-top:4px;">
              ${name}
            </div>
          `;
      }).join('')
    : `<div class="swap-codes empty">No crew codes yet</div>`;

  return `
    <div class="swap-card ${c.certain === false ? 'maybe' : ''}">
      <div class="swap-roster-badge">
        <span class="srb-label">Roster</span>
        <span class="srb-num">${c.roster}</span>
      </div>
      <div class="swap-info">${inner}</div>
    </div>
  `;
}

function buildReverseSwapCardHome(c) {
  const colleagues = (APP.crew?.[c.roster] || []).filter(x => x && x.code && x.code.trim());
  const borderColor = c.certain ? 'var(--green)' : 'var(--yellow)';

  const inner = colleagues.length > 0
    ? colleagues.map(x => {
        const phone = (x.phone || '').replace(/\D/g, '');
        const name  = x.name || x.code;
        return phone
          ? `<div style="margin-top:4px"><a class="wa-pill" href="https://wa.me/${phone}" target="_blank" rel="noopener noreferrer">${name}</a></div>`
          : `<div style="font-family:JetBrains Mono,monospace;font-size:13px;margin-top:4px">${name}</div>`;
      }).join('')
    : `<div class="swap-codes empty">No crew codes yet</div>`;

  return `
    <div class="swap-card" style="border-left:3px solid ${borderColor}">
      <div class="swap-roster-badge">
        <span class="srb-label">Roster</span>
        <span class="srb-num">${c.roster}</span>
      </div>
      <div class="swap-info">${inner}</div>
    </div>`;
}
