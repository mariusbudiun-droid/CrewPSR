
// ══════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════
let APP = {
  roster: null,
  refDate: null,
  pin: null,
  crew: {},
  notif: {
    enabled: false,
    report: true,
    dep: 'first',   // 'none' | 'first' | 'all'
    arr: 'last',    // 'none' | 'last' | 'all'
  },
  customFlights: {},  // { '2026-04-15': [{from,to,dep,arr}] }
  assignDetails: {},  // { "2026-04-15": { start: "08:00", end: "16:00" } }
};

const DOW   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

let calYear, calMonth;
let setupPinVal = '';
let loginPinVal = '';
let crewUnlocked = false;
let activeSchedDay = null;


// ══════════════════════════════════════════════════════════════
// SETUP
// ══════════════════════════════════════════════════════════════
function setupNext() {
  const r = document.getElementById('setupRoster').value;
  const d = document.getElementById('setupDate').value;
  if (!r || !d) { alert('Please fill in both fields.'); return; }
  APP.roster = parseInt(r);
  APP.refDate = d;
  for (let i = 1; i <= 16; i++) {
    if (!APP.crew[i]) APP.crew[i] = Array.from({length:5}, () => ({code:'',phone:'',name:''}));
  }
  document.getElementById('step1').classList.remove('active');
  document.getElementById('step2').classList.add('active');
}

function setupPin(k) {
  if (k === 'skip') { APP.pin = null; showWelcome(); return; }
  if (k === 'del')  { setupPinVal = setupPinVal.slice(0,-1); }
  else if (setupPinVal.length < 4) { setupPinVal += k; }
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById('spd' + i);
    if (el) el.classList.toggle('filled', i < setupPinVal.length);
  }
  if (setupPinVal.length === 4) { APP.pin = setupPinVal; setTimeout(showWelcome, 300); }
}

function showWelcome() {
  document.getElementById('step2').classList.remove('active');
  document.getElementById('step3').classList.add('active');
}

function finishSetup() {
  save();
  document.getElementById('setupScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'flex';
  initApp();
}

// ══════════════════════════════════════════════════════════════
// CREW PIN GATE
// ══════════════════════════════════════════════════════════════
let crewPinVal = '';

function toggleSwapCrew() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-crew').classList.add('active');
  if ((!APP.pin && !APP.usePassword) || crewUnlocked) {
    showCrewContent();
  } else if (APP.usePassword) {
    const gate = document.getElementById('crewPinGate');
    gate.style.display = 'block';
    document.getElementById('crewContent').style.display = 'none';
    gate.innerHTML = `
      <button onclick="nav('swap')" style="position:absolute;top:16px;left:16px;padding:8px 14px;
        border-radius:10px;border:1.5px solid var(--border);background:var(--bg);
        font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;color:var(--text);cursor:pointer">← Back</button>
      <div style="font-size:40px;margin-bottom:12px">👥</div>
      <div style="font-size:20px;font-weight:700;margin-bottom:4px">Crew Directory</div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:20px">🔒 Inserisci la password</div>
      <input type="password" id="crewPasswordInput" placeholder="Password"
        style="max-width:260px;text-align:center;font-size:16px;margin-bottom:12px;letter-spacing:2px"
        onkeydown="if(event.key==='Enter') checkCrewPassword()">
      <button class="btn" style="max-width:260px;margin:0 auto" onclick="checkCrewPassword()">🔓 Sblocca</button>
      <div class="pin-error" id="crewPinErr" style="margin-top:8px">Password errata ❌</div>`;
  } else {
    crewPinVal = '';
    updateCrewPinDots();
    document.getElementById('crewPinGate').style.display = 'block';
    document.getElementById('crewContent').style.display = 'none';
    document.getElementById('crewPinErr').style.display = 'none';
  }
}

function renderSwapCrewContent() {
  const section = document.getElementById('swapCrewSection');
  if (!section) return;
  if (!crewUnlocked && APP.pin) {
    section.innerHTML = '<div style="padding:16px; text-align:center; color:var(--text3); font-size:13px">🔒 Unlock the Crew tab first to view contacts</div>';
    return;
  }
  let html = '';
  for (let R = 1; R <= 16; R++) {
    const colleagues = (APP.crew[R] || []).filter(c => c && c.code && c.code.trim());
    if (colleagues.length === 0) continue;
    const pills = colleagues.map(c => {
      const phone = (c.phone||'').replace(/[\s\-\+]/g,'');
      const name = c.name || c.code;
      if (phone) return '<a class="wa-pill" href="https://wa.me/' + phone + '" target="_blank" style="margin:2px">' + name + '</a>';
      return '<span style="font-family:monospace;font-size:12px;background:var(--bg2);padding:3px 8px;border-radius:6px;margin:2px">' + name + '</span>';
    }).join('');
    html += '<div style="padding:10px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; flex-wrap:wrap; gap:6px">'
          + '<span style="font-family:monospace;font-size:11px;color:var(--blue);background:var(--blue-lt);padding:2px 8px;border-radius:6px;flex-shrink:0">R' + R + '</span>'
          + pills + '</div>';
  }
  section.innerHTML = html || '<div style="padding:16px; text-align:center; color:var(--text3); font-size:13px">No crew codes added yet</div>';
}

function crewPinKey(k) {
  if (k === 'del') crewPinVal = crewPinVal.slice(0,-1);
  else if (crewPinVal.length < 4) crewPinVal += k;
  updateCrewPinDots();
  if (crewPinVal.length === 4) {
    if (crewPinVal === APP.pin) {
      crewUnlocked = true;
      showCrewContent();
    } else {
      document.getElementById('crewPinErr').style.display = 'block';
      crewPinVal = '';
      setTimeout(() => { updateCrewPinDots(); document.getElementById('crewPinErr').style.display='none'; }, 1000);
    }
  }
}

function checkCrewPassword() {
  const input = document.getElementById('crewPasswordInput');
  if (!input) return;
  const v = input.value;
  if (v === APP.password) {
    crewUnlocked = true;
    showCrewContent();
  } else {
    const err = document.getElementById('crewPinErr');
    if (err) { err.style.display = 'block'; }
    input.value = '';
    input.focus();
  }
}

function updateCrewPinDots() {
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById('cpd' + i);
    if (el) el.classList.toggle('filled', i < crewPinVal.length);
  }
}

function showCrewContent() {
  document.getElementById('crewPinGate').style.display = 'none';
  document.getElementById('crewContent').style.display = 'block';
  renderCrewList();
}

function lockCrew() {
  crewUnlocked = false;
  crewPinVal = '';
  document.getElementById('crewPinGate').style.display = 'block';
  document.getElementById('crewContent').style.display = 'none';
  updateCrewPinDots();
}

// ══════════════════════════════════════════════════════════════
// SHARE & TUTORIAL
// ══════════════════════════════════════════════════════════════
function checkForUpdates() {
  const btn = document.getElementById('updateBtn');
  const msg = document.getElementById('updateMsg');
  btn.textContent = '⏳ Checking...';
  btn.disabled = true;
  msg.style.display = 'none';

  if (!navigator.onLine) {
    btn.innerHTML = '🔄 Check for updates';
    btn.disabled = false;
    msg.textContent = '✈️ Sei offline — sei già alla versione più recente installata!';
    msg.style.color = 'var(--yellow)';
    msg.style.display = 'block';
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  fetch(location.href, { method: 'HEAD', cache: 'no-store', signal: controller.signal })
    .then(res => {
      clearTimeout(timeout);
      if (!res || !res.ok) throw new Error('null or bad response');
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage('FORCE_UPDATE');
        setTimeout(() => location.reload(), 2000);
      } else {
        location.reload();
      }
    })
    .catch(err => {
      clearTimeout(timeout);
      btn.innerHTML = '🔄 Check for updates';
      btn.disabled = false;
      const isOffline = err.name === 'AbortError' || !navigator.onLine;
      msg.textContent = isOffline
        ? '✈️ Sei offline — sei già alla versione più recente installata!'
        : '⚠️ Impossibile raggiungere il server. Riprova quando sei connesso.';
      msg.style.color = 'var(--yellow)';
      msg.style.display = 'block';
    });
}



function shareApp() {
  if (navigator.share) {
    navigator.share({
      title: 'CrewPSR',
      text: 'Pescara cabin crew roster app — installa su iPhone o Android!',
      url: 'https://crew-psr-wyvq.vercel.app'
    }).catch(() => {});
  } else {
    navigator.clipboard && navigator.clipboard.writeText('https://crew-psr-wyvq.vercel.app');
    alert('Link copiato! https://crew-psr-wyvq.vercel.app');
  }
}

function toggleInfoSection(bodyId, arrowId) {
  const body = document.getElementById(bodyId);
  const arrow = document.getElementById(arrowId);
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  if (arrow) arrow.textContent = open ? '›' : '˅';
}

// ══════════════════════════════════════════════════════════════
// LANGUAGE
// ══════════════════════════════════════════════════════════════
function setLang(lang) {
  APP.lang = lang;
  save();
  renderSettings();
}

// ══════════════════════════════════════════════════════════════
// NAV (defined above, this is placeholder — actual nav defined above)
// ══════════════════════════════════════════════════════════════

function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function closeDayDetail() {
  document.getElementById('dayDetailScreen').style.display = 'none';
  renderHome();
  renderCalendar();
}

// ══════════════════════════════════════════════════════════════
// HOME — SWIPEABLE DAY SLIDER
// ══════════════════════════════════════════════════════════════
let homeCurrentDay = 0; // index 0 = today, 1 = tomorrow, etc.
const HOME_DAYS = 7;

function renderHome() {
  const today = new Date();
  const todayStr = toDateStr(today);
  const todayDow = today.getDay();
  document.getElementById('topDay').textContent = `${DOW[todayDow]} ${today.getDate()} ${MONTHS[today.getMonth()]}`;
  document.getElementById('topRoster').textContent = `Roster ${APP.roster}`;
  buildHomeSlides();
  goToHomeDay(homeCurrentDay, false);
}

function buildHomeSlides() {
  const slides = document.getElementById('homeSlides');
  const dots   = document.getElementById('homeDots');
  const today  = new Date();
  slides.innerHTML = '';
  dots.innerHTML = '';

  for (let i = 0; i < HOME_DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const ds  = toDateStr(d);
    const dow = d.getDay();
    const day = cycleDay(APP.roster, ds);
    const type = shiftType(day);
    const lbl  = shiftLabel(day);
    const sched = SCHEDULE.days[dow];
    const assign = APP.assignments[ds];
    const detail = APP.assignDetails?.[ds];

    // Report time — no plane label
    let reportHtml = '';
    if (assign && assign !== 'HSBY' && assign !== 'AD' && assign !== 'CUSTOM') {
      const useA2 = assign.startsWith('A2');
      const useLate = assign.endsWith('L');
      const plane = useA2 ? sched?.a2 : sched?.a1;
      const t = useLate ? plane?.reportLate : plane?.reportEarly;
      if (t) reportHtml = `<div class="report-time">🕐 Report ${t}</div>`;
    } else if (assign === 'CUSTOM') {
      const cfl = APP.customFlights?.[ds] || [];
      const report = cfl.length ? calcReport(cfl) : null;
      if (report && report !== '—') reportHtml = `<div class="report-time">🕐 Report ${report}</div>`;
    } else if (assign === 'HSBY') {
      const ts = detail?.start && detail?.end ? `${detail.start}–${detail.end}` : detail?.start ? `from ${detail.start}` : '';
      reportHtml = `<div class="report-time">🏠 Home Standby${ts ? ' · '+ts : ''}</div>`;
    } else if (assign === 'AD') {
      const ts = detail?.start && detail?.end ? `${detail.start}–${detail.end}` : detail?.start ? `from ${detail.start}` : '';
      reportHtml = `<div class="report-time">🏢 Airport Duty${ts ? ' · '+ts : ''}</div>`;
    }

    // Day label: TODAY / TOMORROW / DOW + date
    const dateStr2 = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`;
    const dayLabel = i === 0 ? `TODAY · ${dateStr2}` : i === 1 ? `TOMORROW · ${dateStr2}` : `${DOW[dow].toUpperCase()} · ${dateStr2}`;

    // Flights
    let flightsHtml = '';
    let flightsTitle = '';
    if (assign && assign !== 'HSBY' && assign !== 'AD' && assign !== 'CUSTOM' && sched) {
      flightsTitle = i === 0 ? "Today's Flights" : `${DOW[dow]}'s Flights`;
      const useA2 = assign.startsWith('A2');
      const useLate = assign.endsWith('L');
      const plane = useA2 ? sched.a2 : sched.a1;
      const flights = useLate ? plane.late : plane.early;
      flightsHtml = buildFlightBlock(flights, useA2 ? 'Aereo 2' : 'Aereo 1', useA2 ? 'a2' : 'a1');
    } else if (assign === 'CUSTOM') {
      const cfl = APP.customFlights?.[ds] || [];
      if (cfl.length) {
        flightsTitle = i === 0 ? "Today's Flights" : `${DOW[dow]}'s Flights`;
        const rows = cfl.filter(f => f.from && f.to).map(f =>
          `<div class="flight-row">
            <div class="flight-route">${f.from}-${f.to}</div>
            <div class="flight-times">${f.dep||'—'} → ${f.arr||'—'}</div>
          </div>`
        ).join('');
        flightsHtml = `<div class="flight-block"><div class="flight-block-header"><span class="plane-badge a1">Custom</span></div>${rows}</div>`;
      }
    }

    // Swap candidates (only on working days)
    let swapHtml = '';
    let swapTitle = '';
    let sameShiftHtml = '';
    let sameShiftTitle = '';
    if (type !== 'off') {
      swapTitle = i === 0 ? 'Available for swap today' : `Available for swap`;
      const candidates = swapCandidates(APP.roster, day);
      swapHtml = candidates.map(c => buildSwapCard(c)).join('') ||
        `<div class="card" style="color:var(--text3);text-align:center;font-size:13px">No colleagues available</div>`;

      // Same shift colleagues
      const isEarly = day >= 1 && day <= 5;
      const isLate  = day >= 9 && day <= 13;
      const sameShiftList = [];
      for (let r = 1; r <= 16; r++) {
        if (r === APP.roster) continue;
        const theirDay = cycleDay(r, ds);
        if (isEarly && theirDay >= 1 && theirDay <= 5) sameShiftList.push(r);
        if (isLate  && theirDay >= 9 && theirDay <= 13) sameShiftList.push(r);
      }
      if (sameShiftList.length) {
        sameShiftTitle = 'Same shift';
        sameShiftHtml = buildSameShiftCards(sameShiftList);
      }
    }

    const slide = document.createElement('div');
    slide.style.cssText = 'min-width:100%; width:100%; flex-shrink:0; overflow-y:auto; height:100%;';
    slide.innerHTML = `
      <div class="today-hero" style="margin-bottom:0">
        <div class="shift-type">${dayLabel}</div>
        <div class="shift-name">${lbl.main}</div>
        ${lbl.sub ? `<div class="cycle-info">${lbl.sub}</div>` : ''}
        ${reportHtml}
      </div>
      ${flightsTitle ? `<div class="section-title">${flightsTitle}</div>${flightsHtml}` : ''}
      ${swapTitle ? `<div class="section-title">${swapTitle}</div>${swapHtml}` :
        type === 'off' ? `<div class="card" style="margin:0 16px;text-align:center;color:var(--off);font-weight:600">🌿 Enjoy your day off!</div>` : ''}
      ${sameShiftTitle ? `<div class="section-title">${sameShiftTitle}</div>${sameShiftHtml}` : ''}`;
    slides.appendChild(slide);

    // Dot
    const dot = document.createElement('div');
    dot.className = 'home-dot' + (i === homeCurrentDay ? ' active' : '');
    dot.onclick = () => goToHomeDay(i);
    dots.appendChild(dot);
  }

  // Touch/swipe
  addSwipeListener(document.getElementById('homeSlider'), (dir) => {
    const next = homeCurrentDay + dir;
    if (next >= 0 && next < HOME_DAYS) goToHomeDay(next);
  });
}

function goToHomeDay(idx, animate = true) {
  homeCurrentDay = idx;
  const slides = document.getElementById('homeSlides');
  if (!animate) slides.style.transition = 'none';
  slides.style.transform = `translateX(-${idx * 100}%)`;
  if (!animate) setTimeout(() => slides.style.transition = 'transform 0.3s ease', 50);
  document.querySelectorAll('.home-dot').forEach((d, i) => {
    d.classList.toggle('active', i === idx);
  });
}

function addSwipeListener(el, callback) {
  if (!el) return;
  let startX = 0, startY = 0, swiped = false;
  el.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    swiped = false;
  }, { passive: true });
  el.addEventListener('touchmove', e => {
    if (swiped) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      swiped = true;
      callback(dx < 0 ? 1 : -1);
    }
  }, { passive: true });
}

function buildFlightBlock(flights, label, cls) {
  if (!flights || !flights.length) return '';
  const rows = flights.map(f => `
    <div class="flight-row">
      <div class="flight-route">${f.route}</div>
      <div class="flight-times">${f.dep} → ${f.arr}</div>
      ${f.note ? `<div class="flight-note">⚠️</div>` : ''}
    </div>`).join('');
  return `<div class="flight-block">
    <div class="flight-block-header">
      <span class="plane-badge ${cls}">${label}</span>
    </div>
    ${rows}
  </div>`;
}

function buildSameShiftCards(rosterList) {
  return rosterList.map(r => {
    const members = (APP.crew?.[r] || []).filter(m => m.name || m.phone);
    const peopleHtml = members.length
      ? members.map(info => {
          const name = info.name || '';
          const phone = (info.phone || '').replace(/\D/g, '');
          const waBtn = phone
            ? `<a href="https://wa.me/${phone}" target="_blank"
                style="display:inline-flex;align-items:center;gap:3px;background:#25d366;color:white;
                       border-radius:14px;font-size:10px;font-weight:600;padding:3px 8px;text-decoration:none">
                💬 WA</a>`
            : '';
          return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px">
            <span style="font-size:11px;font-weight:600;color:var(--text);white-space:nowrap">${name}</span>
            ${waBtn}
          </div>`;
        }).join('')
      : `<span style="font-size:11px;color:var(--text3)">—</span>`;
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;
                        background:var(--surface);border:1px solid var(--border);
                        border-left:3px solid var(--blue);border-radius:10px;margin-bottom:6px">
      <div style="background:var(--blue);color:white;width:30px;height:30px;border-radius:8px;
                  display:flex;align-items:center;justify-content:center;
                  font-size:13px;font-weight:800;flex-shrink:0">${r}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">${peopleHtml}</div>
    </div>`;
  }).join('');
}

function buildSwapCard(c) {
  const colleagues = (APP.crew[c.roster] || []).filter(x => x && x.code && x.code.trim());
  const inner = colleagues.length > 0
    ? colleagues.map(x => {
        const phone = (x.phone||'').replace(/[\s\-\+]/g,'');
        const name = x.name || x.code;
        return phone
          ? `<div style="margin-top:4px"><a class="wa-pill" href="https://wa.me/${phone}" target="_blank">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L.057 23.882l6.204-1.448A11.935 11.935 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.003-1.366l-.36-.213-3.681.859.924-3.573-.234-.368A9.818 9.818 0 1112 21.818z"/></svg>
              ${name}
            </a></div>`
          : `<div style="font-family:'JetBrains Mono',monospace;font-size:13px;margin-top:2px">${x.code}${x.name ? ' · '+x.name : ''}</div>`;
      }).join('')
    : `<div class="swap-codes empty">No crew codes yet</div>`;

    return `<div class="swap-card${c.certain === false ? ' maybe' : ''}">
    <div class="swap-roster-badge">
      <span class="srb-label">Roster</span>
      <span class="srb-num">${c.roster}</span>
    </div>
    <div class="swap-info">${inner}</div>
  </div>`;
}

// ══════════════════════════════════════════════════════════════
// CALENDAR
// ══════════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════
// SCHEDULE
// ══════════════════════════════════════════════════════════════
function renderSchedule() {
  document.getElementById('schedVersion').innerHTML =
    `✈ ${SCHEDULE.version} &nbsp;·&nbsp; ${SCHEDULE.period}`;

  if (activeSchedDay === null) activeSchedDay = new Date().getDay();
  document.getElementById('schedDaySelect').value = activeSchedDay;
  renderSchedContent();
}

function setSchedDay(d) {
  activeSchedDay = d;
  renderSchedContent();
}

function renderSchedContent() {
  const d = activeSchedDay;
  const sched = SCHEDULE.days[d];
  if (!sched) { document.getElementById('schedContent').innerHTML = ''; return; }

  const buildFlights = (flights) => flights.map(f =>
    `<div class="seg-flight">
      <div class="seg-route">${f.route}</div>
      <div class="seg-times">${f.dep} → ${f.arr}</div>
      ${f.note ? `<div class="seg-note">⚠️ ${f.note}</div>` : ''}
    </div>`
  ).join('');

  // Group by Early/Late, show Aereo 1 + Aereo 2 side-by-side within each
  const earlyBlock = `
    <div class="flight-segment">
      <div class="seg-header early" style="font-size:14px; letter-spacing:0; padding:12px 14px">
        ☀️ Early
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; border-bottom:1px solid var(--border)">
        <div style="padding:10px 12px; border-right:1px solid var(--border)">
          <div style="font-size:10px; font-weight:700; letter-spacing:1px; color:var(--text3); margin-bottom:6px; text-transform:uppercase">Aereo 1</div>
          <div class="seg-report"><span>🕐</span><strong>${sched.a1.reportEarly}</strong></div>
          ${buildFlights(sched.a1.early)}
        </div>
        <div style="padding:10px 12px">
          <div style="font-size:10px; font-weight:700; letter-spacing:1px; color:var(--text3); margin-bottom:6px; text-transform:uppercase">Aereo 2</div>
          <div class="seg-report"><span>🕐</span><strong>${sched.a2.reportEarly}</strong></div>
          ${buildFlights(sched.a2.early)}
        </div>
      </div>
    </div>`;

  const lateBlock = `
    <div class="flight-segment">
      <div class="seg-header late" style="font-size:14px; letter-spacing:0; padding:12px 14px">
        🌙 Late
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; border-bottom:1px solid var(--border)">
        <div style="padding:10px 12px; border-right:1px solid var(--border)">
          <div style="font-size:10px; font-weight:700; letter-spacing:1px; color:var(--text3); margin-bottom:6px; text-transform:uppercase">Aereo 1</div>
          <div class="seg-report"><span>🕐</span><strong>${sched.a1.reportLate}</strong></div>
          ${buildFlights(sched.a1.late)}
        </div>
        <div style="padding:10px 12px">
          <div style="font-size:10px; font-weight:700; letter-spacing:1px; color:var(--text3); margin-bottom:6px; text-transform:uppercase">Aereo 2</div>
          <div class="seg-report"><span>🕐</span><strong>${sched.a2.reportLate}</strong></div>
          ${buildFlights(sched.a2.late)}
        </div>
      </div>
    </div>`;

  document.getElementById('schedContent').innerHTML = earlyBlock + lateBlock;
}

// ══════════════════════════════════════════════════════════════
// SWAP FINDER
// ══════════════════════════════════════════════════════════════
function prefillSwap() {
  if (APP.roster) document.getElementById('swapRoster').value = APP.roster;
  runSwap();
}

function runSwap() {
  const myRoster = parseInt(document.getElementById('swapRoster').value);
  const myDay    = parseInt(document.getElementById('swapShift').value);
  const el = document.getElementById('swapResults');
  if (!myRoster || !myDay) {
    el.innerHTML = `<div class="empty-state"><div class="big">🔄</div><p>Select roster and shift</p></div>`;
    return;
  }
  const results = swapCandidates(myRoster, myDay);
  el.innerHTML = results.length
    ? results.map(c => buildSwapCard(c)).join('')
    : `<div class="empty-state"><div class="big">😔</div><h3>No one available</h3></div>`;
}

// ══════════════════════════════════════════════════════════════
// CREW DIRECTORY
// ══════════════════════════════════════════════════════════════
function renderCrewList() {
  const el = document.getElementById('crewList');
  let html = '';
  for (let R = 1; R <= 16; R++) {
    const colleagues = (APP.crew[R] || []).filter(c => c && c.code && c.code.trim());
    const pills = colleagues.map(c => {
      const phone = (c.phone||'').replace(/[\s\-\+]/g,'');
      const name = c.name || c.code;
      return phone
        ? `<a class="wa-pill" href="https://wa.me/${phone}" target="_blank" style="margin:2px">${name}</a>`
        : `<span style="font-family:'JetBrains Mono',monospace; font-size:12px; background:var(--bg2); padding:3px 8px; border-radius:6px; margin:2px">${name}</span>`;
    }).join('');
    html += `<div class="crew-roster-card">
      <div class="crew-roster-header" onclick="toggleCrewCard(${R})">
        <div style="display:flex; align-items:center; gap:10px">
          <span class="roster-pill">Roster ${R}</span>
          <span style="font-size:12px; color:var(--text3)">${colleagues.length ? colleagues.length + ' crew' : 'empty'}</span>
        </div>
        <span id="ca-${R}" style="color:var(--text3); font-size:13px">›</span>
      </div>
      <div class="crew-roster-body" id="cb-${R}">
        ${pills || '<div style="font-size:12px; color:var(--text3)">No crew added yet</div>'}
      </div>
    </div>`;
  }
  el.innerHTML = html;
}

function toggleCrewCard(R) {
  const b = document.getElementById('cb-' + R);
  const a = document.getElementById('ca-' + R);
  b.classList.toggle('open');
  a.textContent = b.classList.contains('open') ? '˅' : '›';
}

function openCrewEdit() {
  showCrewEditModal();
}

function loginPin(k) {
  if (k === 'del') loginPinVal = loginPinVal.slice(0,-1);
  else if (loginPinVal.length < 4) loginPinVal += k;
  updateLoginDots();
  if (loginPinVal.length === 4) {
    if (loginPinVal === APP.pin) {
      crewUnlocked = true;
      closeModal('pinModal');
      showCrewEditModal();
    } else {
      document.getElementById('pinModalErr').style.display = 'block';
      loginPinVal = '';
      setTimeout(() => { updateLoginDots(); document.getElementById('pinModalErr').style.display='none'; }, 1000);
    }
  }
}

function updateLoginDots() {
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById('lpd' + i);
    if (el) el.classList.toggle('filled', i < loginPinVal.length);
  }
}

function showCrewEditModal() {
  let html = '';
  for (let R = 1; R <= 16; R++) {
    const colleagues = APP.crew[R] || [];
    const rows = [0,1,2,3,4].map(k => {
      const c = colleagues[k] || {code:'',phone:'',name:''};
      return `<div class="colleague-edit-row" data-r="${R}" data-k="${k}">
        <input class="code-inp" data-r="${R}" data-k="${k}" data-f="code" value="${c.code||''}" placeholder="Code" oninput="crewSave()">
        <input class="phone-inp" data-r="${R}" data-k="${k}" data-f="phone" value="${c.phone||''}" placeholder="+39..." oninput="crewSave()">
        <input data-r="${R}" data-k="${k}" data-f="name" value="${c.name||''}" placeholder="Name" oninput="crewSave()">
      </div>`;
    }).join('');
    html += `<div style="margin-bottom:18px">
      <div style="font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--blue); margin-bottom:6px">Roster ${R}</div>
      <div style="font-size:10px; color:var(--text3); display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-bottom:4px"><span>Code</span><span>WhatsApp</span><span>Name</span></div>
      ${rows}
    </div>`;
  }

  document.getElementById('settingModalTitle').textContent = 'Edit Crew Directory';
  document.getElementById('settingModalBody').innerHTML =
    `<div style="max-height:62vh; overflow-y:auto">${html}</div>
     <button class="btn secondary" style="margin-top:10px" onclick="closeModal('settingModal'); renderCrewList(); runSwap()">Done</button>`;
  document.getElementById('settingModal').classList.add('open');
}

function crewSave() {
  document.querySelectorAll('.colleague-edit-row').forEach(row => {
    const R = parseInt(row.dataset.r);
    const k = parseInt(row.dataset.k);
    if (!APP.crew[R]) APP.crew[R] = Array.from({length:5}, () => ({code:'',phone:'',name:''}));
    ['code','phone','name'].forEach(f => {
      const inp = row.querySelector(`input[data-f="${f}"]`);
      if (inp) {
        if (!APP.crew[R][k]) APP.crew[R][k] = {};
        APP.crew[R][k][f] = f === 'code' ? inp.value.trim().toUpperCase() : inp.value.trim();
      }
    });
  });
  save();
}

// ══════════════════════════════════════════════════════════════
// EXPORT / IMPORT
// ══════════════════════════════════════════════════════════════
function exportCrew() {
  crewSave();
  const enc = btoa(unescape(encodeURIComponent(JSON.stringify(APP.crew))));
  document.getElementById('exportText').value = enc;
  document.getElementById('exportBox').style.display = 'block';
  document.getElementById('importBox').style.display = 'none';
}

function copyExport() {
  const t = document.getElementById('exportText').value;
  navigator.clipboard ? navigator.clipboard.writeText(t) : document.execCommand('copy');
  const m = document.getElementById('exportMsg');
  m.style.display = 'block';
  setTimeout(() => m.style.display = 'none', 2000);
}

function showImport() {
  document.getElementById('importBox').style.display = 'block';
  document.getElementById('exportBox').style.display = 'none';
}

function importCrew() {
  const raw = document.getElementById('importText').value.trim();
  const msg = document.getElementById('importMsg');
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(raw))));
    if (typeof data !== 'object' || !data[1]) throw new Error();
    APP.crew = data;
    save(); renderCrewList();
    msg.textContent = '✅ Imported!'; msg.style.color = 'var(--blue)'; msg.style.display = 'block';
    document.getElementById('importText').value = '';
    setTimeout(() => { document.getElementById('importBox').style.display='none'; msg.style.display='none'; }, 2000);
  } catch(e) {
    msg.textContent = '❌ Invalid code.'; msg.style.color = 'var(--red)'; msg.style.display = 'block';
  }
}

// ══════════════════════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════════════════════
function setNotifPref(key, val) {
  if (!APP.notif) APP.notif = {};
  if (key === 'enabled' && val) {
    // Request permission first
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        APP.notif.enabled = true;
        save();
        renderSettings();
        scheduleAllNotifications();
      } else {
        APP.notif.enabled = false;
        save();
        renderSettings();
        alert('Please enable notifications for CrewPSR in your device settings.');
      }
    });
    return;
  }
  APP.notif[key] = val;
  if (key === 'enabled' && !val) {
    // Cancel all scheduled notifications
    cancelAllNotifications();
  }
  save();
  renderSettings();
  if (APP.notif.enabled) scheduleAllNotifications();
}

function scheduleAllNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  cancelAllNotifications();
  // Schedule for today and next 7 days
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const ds = toDateStr(d);
    const assign = APP.assignments[ds];
    if (!assign) continue;
    const dow = d.getDay();
    const sched = SCHEDULE.days[dow];
    scheduleNotificationsForDay(ds, assign, sched);
  }
}

function scheduleNotificationsForDay(ds, assign, sched) {
  const n = APP.notif || {};
  let flights = [];

  if (assign === 'CUSTOM') {
    const cf = APP.customFlights?.[ds] || [];
    flights = cf.filter(f => f.from && f.to && f.dep).map(f => ({
      route: f.from + '-' + f.to, dep: f.dep, arr: f.arr
    }));
  } else if (assign.startsWith('A') && sched) {
    const useA2 = assign.startsWith('A2');
    const useLate = assign.endsWith('L');
    const plane = useA2 ? sched.a2 : sched.a1;
    flights = (useLate ? plane.late : plane.early) || [];
  }

  if (flights.length === 0) return;

  const datePrefix = ds; // YYYY-MM-DD

  // Report notification
  if (n.report !== false) {
    const firstDep = flights[0].dep;
    if (firstDep) {
      const reportTime = subtractMinutes(firstDep, 45);
      scheduleAt(datePrefix, reportTime,
        '⏰ Report time',
        `Report ${reportTime} · ${flights.map(f => f.route).join(' · ')}`,
        ds + '_report'
      );
    }
  }

  // Departure notifications
  if (n.dep === 'first' && flights[0]?.dep) {
    scheduleAt(datePrefix, flights[0].dep,
      `🛫 ${flights[0].route}`,
      `Departure ${flights[0].dep}`,
      ds + '_dep0'
    );
  } else if (n.dep === 'all') {
    flights.forEach((f, i) => {
      if (f.dep) scheduleAt(datePrefix, f.dep, `🛫 ${f.route}`, `Departure ${f.dep}`, ds + '_dep' + i);
    });
  }

  // Arrival notifications
  if (n.arr === 'last' && flights[flights.length-1]?.arr) {
    const last = flights[flights.length-1];
    scheduleAt(datePrefix, last.arr, `🛬 ${last.route}`, `Arrived ${last.arr}`, ds + '_arr_last');
  } else if (n.arr === 'all') {
    flights.forEach((f, i) => {
      if (f.arr) scheduleAt(datePrefix, f.arr, `🛬 ${f.route}`, `Arrived ${f.arr}`, ds + '_arr' + i);
    });
  }
}

function scheduleAt(dateStr, timeStr, title, body, id) {
  const [h, m] = timeStr.split(':').map(Number);
  const [y, mo, d] = dateStr.split('-').map(Number);
  const target = new Date(y, mo - 1, d, h, m, 0);
  const now = new Date();
  const delay = target - now;
  if (delay <= 0) return; // Already passed
  const tid = setTimeout(() => {
    if (Notification.permission === 'granted') {
      new Notification('CrewPSR · ' + title, { body, icon: 'icon-192.png', tag: id });
    }
  }, delay);
  // Store timeout id for cancellation
  if (!window._notifTimers) window._notifTimers = {};
  window._notifTimers[id] = tid;
}

function cancelAllNotifications() {
  if (!window._notifTimers) return;
  Object.values(window._notifTimers).forEach(tid => clearTimeout(tid));
  window._notifTimers = {};
}

function subtractMinutes(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number);
  let total = h * 60 + m - mins;
  if (total < 0) total += 1440;
  return String(Math.floor(total/60)).padStart(2,'0') + ':' + String(total%60).padStart(2,'0');
}

function setTheme(t) {
  APP.theme = t;
  save();
  applyTheme();
  renderSettings();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', APP.theme || 'system');
}

function renderSettings() {
  document.getElementById('settingRoster').textContent = APP.roster ? `Roster ${APP.roster}` : '—';
  document.getElementById('settingDate').textContent = APP.refDate || '—';
  document.getElementById('settingSchedVersion').textContent = `${SCHEDULE.version} · ${SCHEDULE.period}`;
  const sel = document.getElementById('themeSelect');
  if (sel) sel.value = APP.theme || 'system';
  // Notifications
  const n = APP.notif || {};
  const enabled = document.getElementById('notifEnabled');
  if (enabled) {
    enabled.checked = !!n.enabled;
    document.getElementById('notifOptions').style.display = n.enabled ? 'block' : 'none';
    document.getElementById('notifReport').checked = n.report !== false;
    document.getElementById('notifDep').value = n.dep || 'first';
    document.getElementById('notifArr').value = n.arr || 'last';
  }
}

function changeSetting(type) {
  const title = document.getElementById('settingModalTitle');
  const body  = document.getElementById('settingModalBody');

  if (type === 'roster') {
    title.textContent = 'Change Roster';
    const opts = Array.from({length:16}, (_,i) =>
      `<option value="${i+1}" ${APP.roster===i+1?'selected':''}>Roster ${i+1}</option>`).join('');
    body.innerHTML = `<select id="chRoster">${opts}</select>
      <button class="btn" onclick="APP.roster=parseInt(document.getElementById('chRoster').value);save();renderSettings();renderHome();closeModal('settingModal')">Save</button>
      <button class="btn secondary" onclick="closeModal('settingModal')">Cancel</button>`;
  } else if (type === 'date') {
    title.textContent = 'Change Cycle Date';
    body.innerHTML = `<input type="date" id="chDate" value="${APP.refDate||''}">
      <button class="btn" onclick="APP.refDate=document.getElementById('chDate').value;save();renderSettings();renderHome();renderCalendar();closeModal('settingModal')">Save</button>
      <button class="btn secondary" onclick="closeModal('settingModal')">Cancel</button>`;
  } else if (type === 'pin') {
    title.textContent = 'Sicurezza · Accesso';
    body.innerHTML = `
      <div style="font-size:13px;color:var(--text2);margin-bottom:14px">Scegli come proteggere la Crew Directory:</div>
      <label class="inp-label">Tipo di protezione</label>
      <select id="secType" onchange="
        document.getElementById('secPinF').style.display = this.value==='pin' ? '' : 'none';
        document.getElementById('secPassF').style.display = this.value==='password' ? '' : 'none';
      " style="margin-bottom:10px">
        <option value="pin" ${!APP.usePassword ? 'selected' : ''}>🔢 PIN (4 cifre)</option>
        <option value="password" ${APP.usePassword ? 'selected' : ''}>🔑 Password (testo libero)</option>
      </select>
      <div id="secPinF" style="${APP.usePassword ? 'display:none' : ''}">
        <label class="inp-label">Nuovo PIN (4 cifre)</label>
        <input type="password" id="newPinTxt" maxlength="4" inputmode="numeric"
          placeholder="es. 1234"
          style="text-align:center;letter-spacing:6px;font-size:20px;margin-bottom:8px">
      </div>
      <div id="secPassF" style="${APP.usePassword ? '' : 'display:none'}">
        <label class="inp-label">Nuova Password</label>
        <input type="password" id="newPassTxt" placeholder="Inserisci password"
          style="margin-bottom:8px">
      </div>
      <button class="btn" onclick="
        const t = document.getElementById('secType').value;
        if (t === 'pin') {
          const v = document.getElementById('newPinTxt').value;
          if (v.length !== 4 || isNaN(v)) { alert('Il PIN deve essere di 4 cifre'); return; }
          APP.pin = v; APP.usePassword = false; APP.password = null;
        } else {
          const v = document.getElementById('newPassTxt').value.trim();
          if (!v) { alert('Inserisci una password'); return; }
          APP.password = v; APP.usePassword = true; APP.pin = null;
        }
        save(); closeModal('settingModal'); renderSettings();
      ">💾 Salva</button>
      <button class="btn secondary" onclick="closeModal('settingModal')">Annulla</button>`;
    document.getElementById('settingModal').classList.add('open');
    return;
  }
  document.getElementById('settingModal').classList.add('open');
}

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
function initApp() {
  for (let i = 1; i <= 16; i++) {
    if (!APP.crew[i]) APP.crew[i] = Array.from({length:5}, () => ({code:'',phone:'',name:''}));
  }
  if (!APP.assignments) APP.assignments = {};
  if (!APP.assignDetails) APP.assignDetails = {};
  if (!APP.customFlights) APP.customFlights = {};
  if (!APP.notif) APP.notif = { enabled: false, report: true, dep: 'first', arr: 'last' };
  applyTheme();
  renderHome();
  renderSettings();
  setTimeout(() => { initModalSwipe(); if (APP.notif?.enabled) scheduleAllNotifications(); }, 100);
}

// Boot
if (load() && APP.roster && APP.refDate) {
  document.getElementById('setupScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'flex';
  initApp();
} else {
  document.getElementById('setupDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('step1').classList.add('active');
  document.getElementById('step2').classList.remove('active');
  document.getElementById('step3').classList.remove('active');
}
