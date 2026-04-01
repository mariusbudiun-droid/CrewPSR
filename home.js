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

      if (sameShiftList.length) {
        sameShiftTitle = 'Same shift';
        sameShiftHtml = buildSameShiftCards(sameShiftList);
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
      </div>

      ${flightsTitle ? `<div class="section-title">${flightsTitle}</div>${flightsHtml}` : ''}
      ${swapTitle ? `<div class="section-title">${swapTitle}</div>${swapHtml}` : ''}
      ${type === 'off' ? `<div class="card" style="margin:0 16px;text-align:center;color:var(--off);font-weight:600;">Enjoy your day off!</div>` : ''}
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

function buildSameShiftCards(rosterList) {
  return rosterList.map(r => {
    const members = (APP.crew?.[r] || []).filter(m => m.name || m.phone);

    const peopleHtml = members.length
      ? members.map(info => {
          const name = info.name || '';
          const phone = (info.phone || '').replace(/\D/g, '');
          const waBtn = phone
            ? `<a href="https://wa.me/${phone}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:3px;background:#25d366;color:white;border-radius:14px;font-size:10px;font-weight:600;padding:3px 8px;text-decoration:none;">WA</a>`
            : '';

          return `
            <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
              <span style="font-size:11px;font-weight:600;color:var(--text);white-space:nowrap;">${name}</span>
              ${waBtn}
            </div>
          `;
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
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"></path><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L.057 23.882l6.204-1.448A11.935 11.935 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.003-1.366l-.36-.213-3.681.859.924-3.573-.234-.368A9.818 9.818 0 1 1 12 21.818z"></path></svg>
                ${name}
              </a>
            </div>
            <div style="font-family:JetBrains Mono,monospace;font-size:13px;margin-top:2px;">${x.code}${x.name ? ` • ${x.name}` : ''}</div>
          `
          : `
            <div style="font-family:JetBrains Mono,monospace;font-size:13px;margin-top:2px;">${x.code}${x.name ? ` • ${x.name}` : ''}</div>
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
