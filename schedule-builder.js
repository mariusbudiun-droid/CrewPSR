// ══════════════════════════════════════════════════════════════
// SCHEDULE BUILDER (Marius mode) — full-screen, roster-free
// ══════════════════════════════════════════════════════════════
//
// Rebuilds the weekly flight schedule from colleagues' eCrew rosters.
// The roster shows only FLIGHTS (not which aircraft), so:
//   • per day we collect the distinct MORNING rotations and distinct
//     EVENING rotations seen across all imported rosters (target: 2 each);
//   • morning's two rotations are the two aircraft (A1 / A2);
//   • evening is linked to morning by the TURNAROUND rule — the plane that
//     returns in the morning is the one that leaves again in the afternoon;
//   • A1/A2 labelling defaults to "earliest morning departure = A1", with a
//     per-day swap.
// No roster number is asked: imports just merge by day + shift, deduped by
// date, and confidence = how many distinct days confirm a rotation.
// Everything is LOCAL (APP.scheduleBuilder); nothing goes to Supabase.

const SB_SEASON_START    = '2026-11-01';
const SB_TURNAROUND_MIN  = 20;    // min minutes between a morning arrival and the afternoon departure of the same plane
const SB_DOW_ORDER = [1,2,3,4,5,6,0];
const SB_DOW_NAME  = {1:'Lunedì',2:'Martedì',3:'Mercoledì',4:'Giovedì',5:'Venerdì',6:'Sabato',0:'Domenica'};

// ── Draft store ──────────────────────────────────────────────────
function _sbGetDraft() {
  if (!APP.scheduleBuilder || typeof APP.scheduleBuilder !== 'object') {
    APP.scheduleBuilder = { seasonStart: SB_SEASON_START, candidates: [], overrides: {} };
  }
  const d = APP.scheduleBuilder;
  if (!Array.isArray(d.candidates)) d.candidates = [];
  if (!d.seasonStart) d.seasonStart = SB_SEASON_START;
  if (!d.overrides || typeof d.overrides !== 'object') d.overrides = {};
  if (!d.overrides.target) d.overrides.target = {}; // key 'dow-shift' -> 0|1|2
  if (!d.overrides.swap)   d.overrides.swap = {};   // key 'dow' -> true
  if (!d.overrides.pick)   d.overrides.pick = {};   // key 'dow-shift' -> [sig,sig]
  return d;
}

// ── Time + flight helpers ────────────────────────────────────────
function _sbMin(t) { if (!t || !t.includes(':')) return 99999; const [h,m]=t.split(':').map(Number); return h*60+m; }
function _sbSortFlights(f) { return [...f].sort((a,b)=>_sbMin(a.dep)-_sbMin(b.dep)); }
function _sbFirstDep(f) { const s=_sbSortFlights(f); return s.length?_sbMin(s[0].dep):99999; }
function _sbLastArr(f) { const s=_sbSortFlights(f); return s.length?_sbMin(s[s.length-1].arr):-1; }
function _sbSig(f) { return _sbSortFlights(f).map(x=>`${x.from}-${x.to}@${x.dep}`).join('|'); }
function _sbRoutes(f) { return _sbSortFlights(f).map(x=>`${x.from}-${x.to}`).join(' · '); }
function _sbSubMin(t, mins) { let v=_sbMin(t)-mins; if(v<0)v+=1440; return String(Math.floor(v/60)).padStart(2,'0')+':'+String(v%60).padStart(2,'0'); }

// ── Candidates from AI output (no roster, no aircraft) ───────────
function _sbCandidatesFromVision(days) {
  const draft = _sbGetDraft();
  const start = draft.seasonStart;
  const out = [];
  for (const d of days) {
    if (!d.date) continue;
    if (start && d.date < start) continue;                 // season cutoff
    const isFlight = d.flights && d.flights.length > 0 &&
                     d.type !== 'off' && d.type !== 'hsby' && d.type !== 'ad';
    if (!isFlight) continue;

    const offset = _italyOffset(d.date);                   // UTC→Italy (from roster-import.js)
    const flights = _sbSortFlights(d.flights.map(f => ({
      from: f.from || 'PSR', to: f.to || '',
      dep: f.dep ? _addHoursToTime(f.dep, offset) : '',
      arr: f.arr ? _addHoursToTime(f.arr, offset) : '',
    })));

    // early/late by bulk of flown minutes around noon
    let before=0, after=0;
    for (const f of flights) {
      if (!f.dep || !f.arr) continue;
      let s=_sbMin(f.dep), e=_sbMin(f.arr); if (e<=s) e+=1440;
      before += Math.max(0, Math.min(e,720)-s);
      after  += Math.max(0, e-Math.max(s,720));
    }
    out.push({
      date: d.date,
      dow: new Date(d.date+'T12:00:00').getDay(),
      shift: after>before ? 'late' : 'early',
      flights,
    });
  }
  return out;
}

function _sbAddCandidates(list) {
  const draft = _sbGetDraft();
  for (const c of list) {
    const i = draft.candidates.findIndex(x => x.date === c.date); // dedup by date
    if (i >= 0) draft.candidates[i] = c; else draft.candidates.push(c);
  }
  save();
}

// ── Rotations per (dow, shift): cluster candidates by flight signature ─
function _sbRotations(dow, shift) {
  const draft = _sbGetDraft();
  const map = {};
  for (const c of draft.candidates) {
    if (c.dow !== dow || c.shift !== shift) continue;
    const sig = _sbSig(c.flights);
    if (!map[sig]) map[sig] = { sig, flights: c.flights, dates: new Set() };
    map[sig].dates.add(c.date);
  }
  const rots = Object.values(map).map(r => ({ sig:r.sig, flights:r.flights, count:r.dates.size }));
  rots.sort((a,b) => b.count - a.count || _sbFirstDep(a.flights) - _sbFirstDep(b.flights));
  return rots;
}

// Chosen rotations for a slot: honour a manual pick, else top 2 by confidence.
function _sbChosen(dow, shift) {
  const draft = _sbGetDraft();
  const all = _sbRotations(dow, shift);
  const pick = draft.overrides.pick[`${dow}-${shift}`];
  if (pick && pick.length) {
    const bySig = Object.fromEntries(all.map(r => [r.sig, r]));
    return pick.map(s => bySig[s]).filter(Boolean);
  }
  return all.slice(0, 2);
}

function _sbTarget(dow, shift) {
  const t = _sbGetDraft().overrides.target[`${dow}-${shift}`];
  return (t === 0 || t === 1 || t === 2) ? t : 2;
}

// Status of one (dow, shift) slot-pair. Conflict = more raw rotations than the
// target AND the user hasn't manually picked which ones are correct.
function _sbSlotStatus(dow, shift) {
  const need = _sbTarget(dow, shift);
  const raw  = _sbRotations(dow, shift).length;
  const key  = `${dow}-${shift}`;
  const pick = _sbGetDraft().overrides.pick[key];
  const hasPick = !!(pick && pick.length >= Math.min(need, raw) && need > 0);
  const chosenCount = _sbChosen(dow, shift).length;
  const conflict = raw > need && !hasPick;
  return { need, raw, chosenCount, conflict, hasPick };
}

// ── Turnaround linking → two aircraft lines, labelled A1/A2 ──────
function _sbDayLines(dow) {
  let early = _sbChosen(dow, 'early').slice();
  let late  = _sbChosen(dow, 'late').slice();

  // Pair each early (by earliest return) with the late that departs soonest
  // after it with a plausible turnaround.
  const lines = [];
  const earlyByArr = early.slice().sort((a,b)=>_sbLastArr(a.flights)-_sbLastArr(b.flights));
  const latePool = late.slice();
  for (const e of earlyByArr) {
    const arr = _sbLastArr(e.flights);
    let bestI = -1, bestDep = Infinity;
    for (let i=0;i<latePool.length;i++){
      const dep=_sbFirstDep(latePool[i].flights);
      if (dep >= arr + SB_TURNAROUND_MIN && dep < bestDep) { bestDep=dep; bestI=i; }
    }
    if (bestI < 0 && latePool.length) { // no plausible gap: take earliest remaining
      bestI = latePool.reduce((bi,l,i,arr2)=>_sbFirstDep(l.flights)<_sbFirstDep(arr2[bi].flights)?i:bi,0);
    }
    const l = bestI>=0 ? latePool.splice(bestI,1)[0] : null;
    lines.push({ early:e, late:l });
  }
  // Any late with no early (e.g. missing morning data) becomes its own line.
  for (const l of latePool) lines.push({ early:null, late:l });

  // Label A1/A2: earliest morning departure = A1 (fallback: earliest late dep).
  lines.sort((a,b)=>{
    const ka = a.early ? _sbFirstDep(a.early.flights) : (a.late?_sbFirstDep(a.late.flights):99999);
    const kb = b.early ? _sbFirstDep(b.early.flights) : (b.late?_sbFirstDep(b.late.flights):99999);
    return ka - kb;
  });
  if (_sbGetDraft().overrides.swap[dow] && lines.length >= 2) {
    [lines[0], lines[1]] = [lines[1], lines[0]];
  }
  return lines; // lines[0]=A1, lines[1]=A2
}

// ── Coverage summary ─────────────────────────────────────────────
function _sbCoverage() {
  let covered=0, totalSlots=0, missing=0, conflicts=0;
  for (const dow of SB_DOW_ORDER) {
    for (const shift of ['early','late']) {
      const st = _sbSlotStatus(dow, shift);
      totalSlots += st.need;
      covered    += Math.min(st.chosenCount, st.need);
      missing    += Math.max(0, st.need - st.chosenCount);
      if (st.conflict) conflicts++;
    }
  }
  return { covered, totalSlots, missing, conflicts, complete: missing===0 && conflicts===0 };
}

// ══════════════════════════════════════════════════════════════
// UI — full-screen (no swipe-dismiss)
// ══════════════════════════════════════════════════════════════
function _sbScreen() {
  let s = document.getElementById('scheduleBuilderScreen');
  if (!s) {
    s = document.createElement('div');
    s.id = 'scheduleBuilderScreen';
    s.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:600;overflow-y:auto;-webkit-overflow-scrolling:touch';
    document.body.appendChild(s);
  }
  return s;
}
function _sbHeader(titleText, backFn) {
  return `
    <div style="position:sticky;top:0;z-index:5;background:var(--surface);border-bottom:1px solid var(--border);
                display:flex;align-items:center;gap:12px;padding:max(14px,env(safe-area-inset-top)) 16px 14px">
      <button onclick="${backFn}" style="padding:8px 14px;border-radius:10px;border:1.5px solid var(--border);
              background:var(--bg);font-family:'Outfit',sans-serif;font-size:14px;font-weight:700;color:var(--text);cursor:pointer">←</button>
      <div style="font-size:18px;font-weight:800;color:var(--text)">${titleText}</div>
    </div>`;
}

function openScheduleBuilder() {
  const sm = document.getElementById('settingModal');
  if (sm) sm.classList.remove('open');

  const cov = _sbCoverage();
  const draft = _sbGetDraft();

  const dot = (state) => {
    const c = state==='ok'?'var(--green)':state==='conflict'?'var(--red)':state==='noflight'?'var(--text3)':'var(--border)';
    return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c};margin:0 2px"></span>`;
  };
  const shiftDots = (dow, shift) => {
    const st = _sbSlotStatus(dow, shift);
    if (st.need===0) return dot('noflight');
    if (st.conflict) { let o=''; for(let i=0;i<st.raw;i++) o+=dot('conflict'); return o; }
    let out='';
    for (let i=0;i<st.need;i++) out += (i<st.chosenCount ? dot('ok') : dot('empty'));
    return out;
  };

  const rows = SB_DOW_ORDER.map(dow => `
    <div onclick="openSbDay(${dow})" style="display:grid;grid-template-columns:76px 1fr 1fr 16px;align-items:center;
                gap:8px;padding:12px 14px;border-bottom:1px solid var(--border);cursor:pointer">
      <div style="font-weight:700;font-size:13px;color:var(--text)">${SB_DOW_NAME[dow]}</div>
      <div style="text-align:center">${shiftDots(dow,'early')}</div>
      <div style="text-align:center">${shiftDots(dow,'late')}</div>
      <div style="color:var(--text3);text-align:right">›</div>
    </div>`).join('');

  const banner = cov.complete
    ? `<div style="background:var(--green-lt);border:1px solid var(--green);border-radius:12px;padding:12px 14px;
          margin-bottom:12px;font-size:13px;color:var(--text);font-weight:600">
         ✅ Completo — pronto da esportare</div>`
    : `<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 14px;
          margin-bottom:12px;display:flex;gap:14px;justify-content:space-around;text-align:center">
         <div><div style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:800;color:var(--text)">${cov.covered}/${cov.totalSlots}</div>
           <div style="font-size:10px;letter-spacing:0.5px;text-transform:uppercase;color:var(--text3)">slot</div></div>
         <div><div style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:800;color:${cov.missing?'var(--text)':'var(--green)'}">${cov.missing}</div>
           <div style="font-size:10px;letter-spacing:0.5px;text-transform:uppercase;color:var(--text3)">mancanti</div></div>
         <div><div style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:800;color:${cov.conflicts?'var(--red)':'var(--green)'}">${cov.conflicts}</div>
           <div style="font-size:10px;letter-spacing:0.5px;text-transform:uppercase;color:var(--text3)">conflitti</div></div>
       </div>`;

  _sbScreen().innerHTML = `
    ${_sbHeader('🗓️ Schedule Builder', 'closeScheduleBuilder()')}
    <div style="padding:16px;padding-bottom:max(32px,env(safe-area-inset-bottom))">
      <div style="font-size:12px;color:var(--text2);line-height:1.5;margin-bottom:12px">
        Carica i roster dei colleghi. Solo voli dal <strong>${draft.seasonStart}</strong>.
        Tocca un giorno per vedere i voli e sistemare.
      </div>

      <button class="btn" onclick="sbImportRoster()" style="margin-bottom:12px">📷 Carica un roster</button>

      ${banner}

      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden">
        <div style="display:grid;grid-template-columns:76px 1fr 1fr 16px;gap:8px;padding:9px 14px;
                    border-bottom:1px solid var(--border);font-size:10px;font-weight:700;letter-spacing:0.5px;
                    text-transform:uppercase;color:var(--text3)">
          <div>Giorno</div><div style="text-align:center">Mattino</div><div style="text-align:center">Sera</div><div></div>
        </div>
        ${rows}
      </div>

      <button class="btn secondary" style="margin-top:14px" onclick="sbExport()">📤 Esporta codice schedule</button>
      ${draft.candidates.length ? `<button class="btn secondary" style="margin-top:8px;color:var(--red);border-color:var(--red)" onclick="sbClearDraft()">🗑️ Cancella tutto</button>` : ''}
    </div>`;
}

function closeScheduleBuilder() {
  const s = document.getElementById('scheduleBuilderScreen');
  if (s) s.remove();
  openMariusPanel();
}

// ── Day detail ───────────────────────────────────────────────────
function openSbDay(dow) {
  const draft = _sbGetDraft();

  const shiftBlock = (shift, labelText) => {
    const rots = _sbRotations(dow, shift);
    const chosen = _sbChosen(dow, shift);
    const need = _sbTarget(dow, shift);
    const chosenSigs = new Set(chosen.map(r=>r.sig));

    let rotHtml;
    if (need === 0) {
      rotHtml = `<div style="font-size:13px;color:var(--text3);padding:8px 0">Segnato: nessun volo</div>`;
    } else if (rots.length === 0) {
      rotHtml = `<div style="font-size:13px;color:var(--text3);padding:8px 0">Nessun dato ancora — carica altri roster</div>`;
    } else {
      rotHtml = rots.map(r => {
        const picked = chosenSigs.has(r.sig);
        const conflict = rots.length > need;
        return `
          <div style="border:1px solid ${picked?'var(--green)':'var(--border)'};border-radius:10px;
                      padding:10px 12px;margin-bottom:8px;background:${picked?'var(--green-lt)':'var(--surface)'}">
            <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text);line-height:1.6">${_sbRoutes(r.flights)}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:4px">
              ${r.flights.map(f=>f.dep+'→'+f.arr).join('  ·  ')}
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
              <span style="font-size:11px;color:var(--text3)">confermato da ${r.count} giorno${r.count===1?'':'i'}</span>
              ${conflict ? `<button onclick="sbTogglePick(${dow},'${shift}','${r.sig}')"
                   style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:8px;cursor:pointer;
                          border:1px solid ${picked?'var(--green)':'var(--border)'};
                          background:${picked?'var(--green)':'var(--bg)'};color:${picked?'#fff':'var(--text)'}">
                   ${picked?'✓ scelto':'scegli'}</button>` : ''}
            </div>
          </div>`;
      }).join('');
    }

    const nf = need === 0;
    return `
      <div style="margin-bottom:18px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="font-size:13px;font-weight:800;color:var(--text)">${labelText}
            <span style="font-weight:400;color:var(--text3);font-size:12px"> · ${Math.min(chosen.length,need)}/${need}</span></div>
          <button onclick="sbToggleNoFlight(${dow},'${shift}')"
            style="font-size:11px;font-weight:600;padding:4px 10px;border-radius:8px;cursor:pointer;
                   border:1px solid var(--border);background:${nf?'var(--text3)':'var(--bg)'};color:${nf?'#fff':'var(--text2)'}">
            ${nf?'↩︎ annulla nessun volo':'nessun volo qui'}</button>
        </div>
        ${_sbSlotStatus(dow,shift).conflict ? `<div style="font-size:11px;color:var(--red);margin-bottom:6px">⚠️ trovate ${rots.length} rotazioni diverse: scegli le ${need} corrette</div>` : ''}
        ${rotHtml}
      </div>`;
  };

  // Aircraft-line preview (turnaround linking + A1/A2)
  const lines = _sbDayLines(dow);
  const lineHtml = ['A1','A2'].map((lbl,i) => {
    const ln = lines[i];
    if (!ln) return '';
    const e = ln.early ? _sbRoutes(ln.early.flights) : '—';
    const l = ln.late  ? _sbRoutes(ln.late.flights)  : '—';
    return `
      <div style="border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:6px">
        <div style="font-size:12px;font-weight:800;color:var(--blue)">Aereo ${i+1}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:3px"><strong>M:</strong> ${e}</div>
        <div style="font-size:11px;color:var(--text2)"><strong>S:</strong> ${l}</div>
      </div>`;
  }).join('');

  _sbScreen().innerHTML = `
    ${_sbHeader(SB_DOW_NAME[dow], 'openScheduleBuilder()')}
    <div style="padding:16px;padding-bottom:max(32px,env(safe-area-inset-bottom))">
      ${shiftBlock('early','☀️ Mattino')}
      ${shiftBlock('late','🌙 Sera')}

      <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text3);margin:4px 0 8px">
        Assegnazione aerei (turnaround)</div>
      ${lineHtml || `<div style="font-size:12px;color:var(--text3)">Servono le rotazioni per agganciare gli aerei.</div>`}
      ${lines.length>=2 ? `<button class="btn secondary" style="margin-top:6px" onclick="sbSwap(${dow})">↔ Scambia A1 / A2</button>` : ''}

      <button class="btn secondary" style="margin-top:16px" onclick="openScheduleBuilder()">← Tutti i giorni</button>
    </div>`;
}

// ── Mutations (re-render day after each) ─────────────────────────
function sbToggleNoFlight(dow, shift) {
  const o = _sbGetDraft().overrides;
  const key = `${dow}-${shift}`;
  if (o.target[key] === 0) delete o.target[key]; else o.target[key] = 0;
  save();
  openSbDay(dow);
}
function sbTogglePick(dow, shift, sig) {
  const o = _sbGetDraft().overrides;
  const key = `${dow}-${shift}`;
  let cur = o.pick[key] ? o.pick[key].slice() : _sbChosen(dow, shift).map(r=>r.sig);
  if (cur.includes(sig)) cur = cur.filter(s=>s!==sig);
  else { cur.push(sig); if (cur.length > _sbTarget(dow,shift)) cur.shift(); }
  o.pick[key] = cur;
  save();
  openSbDay(dow);
}
function sbSwap(dow) {
  const o = _sbGetDraft().overrides;
  o.swap[dow] = !o.swap[dow];
  save();
  openSbDay(dow);
}
function sbClearDraft() {
  if (!confirm('Cancellare tutti i dati raccolti? Non si può annullare.')) return;
  const start = _sbGetDraft().seasonStart;
  APP.scheduleBuilder = { seasonStart: start, candidates: [], overrides: {} };
  save();
  openScheduleBuilder();
}

// ── Import (no roster prompt) ────────────────────────────────────
function sbImportRoster() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.style.cssText = 'position:fixed;top:-100px;left:-100px;opacity:0;width:1px;height:1px';
  document.body.appendChild(input);
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    document.body.removeChild(input);
    if (!file) return;
    _showImportOverlay('Leggo il roster…\nPuò volerci fino a 1 minuto\n⚠️ Non chiudere l\'app');
    try {
      const base64 = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(',')[1]); r.onerror=rej; r.readAsDataURL(file); });
      const resp = await fetch('/api/import-roster', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ imageBase64: base64, mediaType: file.type||'image/jpeg', role:'cabin' }),
      });
      const result = await resp.json();
      _hideImportOverlay();
      if (!resp.ok || !result.success) throw new Error(result.error || `Errore server ${resp.status}`);
      const cands = _sbCandidatesFromVision(result.days || []);
      if (!cands.length) { _showImportError('Nessun volo utile trovato (controlla che sia il roster giusto e dopo il 1° nov).'); return; }
      _sbAddCandidates(cands);
      _showImportError(`✓ Aggiunti ${cands.length} giorni di volo.`);
      setTimeout(() => { const o=document.getElementById('importOverlay'); if(o)o.remove(); openScheduleBuilder(); }, 1100);
    } catch (err) {
      _hideImportOverlay();
      console.error('SB import error:', err);
      _showImportError('Errore: ' + (err.message || 'sconosciuto'));
    }
  };
  setTimeout(()=>input.click(), 80);
}

// ── Export: generate schedule.js SCHEDULE.days code ──────────────
function sbExport() {
  const cov = _sbCoverage();
  const lines = [];
  lines.push('  days: {');
  for (const dow of SB_DOW_ORDER) {
    const ls = _sbDayLines(dow);
    const planeObj = (ln) => {
      const e = ln && ln.early ? _sbSortFlights(ln.early.flights) : [];
      const l = ln && ln.late  ? _sbSortFlights(ln.late.flights)  : [];
      const fmt = arr => arr.map(f=>`          { route:"${f.from}-${f.to}", dep:"${f.dep}", arr:"${f.arr}" },`).join('\n');
      const repE = e.length ? _sbSubMin(e[0].dep,45) : '';
      const repL = l.length ? _sbSubMin(l[0].dep,45) : '';
      return `      {\n        reportEarly: "${repE}",\n        early: [\n${fmt(e)}\n        ],\n        reportLate: "${repL}",\n        late: [\n${fmt(l)}\n        ]\n      }`;
    };
    lines.push(`    ${dow}: { // ${SB_DOW_NAME[dow]}`);
    lines.push(`      a1: ${planeObj(ls[0]).trim()},`);
    lines.push(`      a2: ${planeObj(ls[1]).trim()}`);
    lines.push(`    },`);
  }
  lines.push('  }');
  const code = `// Generato dallo Schedule Builder — rivedi prima di pubblicare\nconst SCHEDULE = {\n  version: "V4",\n  period:  "01 Nov 2026 – 31 Mar 2027",\n${lines.join('\n')}\n};`;

  const warn = cov.complete ? '' : `⚠️ Schedule INCOMPLETO (${cov.missing} slot mancanti, ${cov.conflicts} conflitti). Esporto comunque quello che c'è.\n\n`;

  _sbScreen().innerHTML = `
    ${_sbHeader('📤 Esporta', 'openScheduleBuilder()')}
    <div style="padding:16px;padding-bottom:max(32px,env(safe-area-inset-bottom))">
      <div style="font-size:12px;color:var(--text2);line-height:1.5;margin-bottom:10px">
        ${warn}Copia questo e sostituisci il blocco <code>SCHEDULE</code> in <code>schedule.js</code>.
        Controlla report time e assegnazione A1/A2 prima di pubblicare.
      </div>
      <textarea readonly onclick="this.select()" style="width:100%;box-sizing:border-box;height:46vh;
        font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.5">${code.replace(/</g,'&lt;')}</textarea>
      <button class="btn" style="margin-top:10px" onclick="sbCopyExport(this)">📋 Copia</button>
      <button class="btn secondary" style="margin-top:8px" onclick="openScheduleBuilder()">← Indietro</button>
    </div>`;
  window._sbExportCode = code;
}
function sbCopyExport(btn) {
  const t = window._sbExportCode || '';
  if (navigator.clipboard) navigator.clipboard.writeText(t).then(()=>{ if(btn) btn.textContent='✓ Copiato'; });
}

window.openScheduleBuilder = openScheduleBuilder;
window.closeScheduleBuilder = closeScheduleBuilder;
window.openSbDay = openSbDay;
window.sbImportRoster = sbImportRoster;
window.sbClearDraft = sbClearDraft;
window.sbToggleNoFlight = sbToggleNoFlight;
window.sbTogglePick = sbTogglePick;
window.sbSwap = sbSwap;
window.sbExport = sbExport;
window.sbCopyExport = sbCopyExport;
window._sbGetDraft = _sbGetDraft;
