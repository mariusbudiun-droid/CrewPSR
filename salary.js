// ══════════════════════════════════════════════════════════════
// STIPENDIO — payslip estimator (Marius mode only)
// ══════════════════════════════════════════════════════════════
//
// Estimates the Malta Air / Customer Service Agent 5+ net payslip, modelled
// on 9 real 2026 payslips (Jul & Sep 2026 reproduce to the cent). All data is
// LOCAL ONLY (APP.salaryHistory in localStorage) — never sent to Supabase,
// never visible to other users. Shown only while APP.mariusMode is true.
//
// Timing rule: payslip of month M pays the FIXED of M + the VARIABLES of M-1
// (hours, diaria, SBY, AL, BH, training, leave, commission). The variables are
// pre-filled from month M-1's roster already in CrewPSR, and are editable.

// ── Rate table (choose latest validFrom ≤ payMonth) ──────────────
const SALARY_RATES = [
  { validFrom:'2026-01', baseAnnual:3000, ivmgAnnual:7315.92, faiAnnual:730,  rateLow:4.69, rateHigh:4.69, diaria:40.00, alRate:29.06, training:36.30, convINPS:1511.38 },
  { validFrom:'2026-06', baseAnnual:3235, ivmgAnnual:8195.88, faiAnnual:1000, rateLow:4.80, rateHigh:5.38, diaria:42.11, alRate:35.00, training:36.30, convINPS:1511.38 },
  { validFrom:'2027-04', baseAnnual:3320, ivmgAnnual:8678,    faiAnnual:1000, rateLow:4.80, rateHigh:5.46, diaria:43.19, alRate:35.00, training:36.30, convINPS:1511.38 },
  { validFrom:'2028-04', baseAnnual:3405, ivmgAnnual:9160,    faiAnnual:1000, rateLow:4.80, rateHigh:5.54, diaria:44.27, alRate:35.00, training:36.30, convINPS:1511.38 },
  { validFrom:'2029-04', baseAnnual:3490, ivmgAnnual:9642,    faiAnnual:1000, rateLow:4.80, rateHigh:5.62, diaria:45.34, alRate:35.00, training:36.30, convINPS:1511.38 },
  { validFrom:'2030-04', baseAnnual:3575, ivmgAnnual:10124,   faiAnnual:1000, rateLow:4.80, rateHigh:5.70, diaria:46.42, alRate:35.00, training:36.30, convINPS:1511.38 },
];

const SALARY_RMG         = 62.75;        // leave day base (estimate)
const SALARY_CONTRIB_RATE= 0.1351367;    // 9.19 FPLD + 3.59 Fondo Volo + 0.26667 FIS + 0.30 CIGS + 0.167 FSTA
const SALARY_UNION       = 5;
const SALARY_HOURS_THRESHOLD = 600;

// Addizionali per year. 2026 values read from real payslips. For 2027+ the CLA
// gives a formula based on prior-year taxable; until that data exists we fall
// back to the 2026 values (flagged in a code comment) — refine per year.
const SALARY_ADDIZIONALI = {
  2026: { reg:15.83, comSaldo:4.91, comAcconto:2.78 },
};
function _salAddizionali(year) {
  return SALARY_ADDIZIONALI[year] || SALARY_ADDIZIONALI[2026];
}

function _salRates(payMonth) {
  let chosen = SALARY_RATES[0];
  for (const r of SALARY_RATES) {
    if (r.validFrom <= payMonth) chosen = r; else break;
  }
  return chosen;
}

function _daysInMonth(year, month1) { return new Date(year, month1, 0).getDate(); }

// ── Core calculation ─────────────────────────────────────────────
// input: { payMonth:'YYYY-MM', sbh, flyDays, sbyDays, alDays, bhDays,
//          trainingDays, leaveDays, leavePct, commission, hoursBeforeInYear }
// Roverride: optional fixed annual-income estimate (used by tests). When
//   omitted, R is computed from APP.salaryHistory for that year.
function computeSalary(input, Roverride) {
  const i = input;
  const r = _salRates(i.payMonth);
  const [yearStr, monStr] = i.payMonth.split('-');
  const year = parseInt(yearStr), month = parseInt(monStr); // month 1..12
  const dim = _daysInMonth(year, month);

  const leaveDays = +i.leaveDays || 0;
  const presence = Math.max(0, 1 - leaveDays / 26);

  // Fixed
  const base    = r.baseAnnual / 13 * presence;                 // taxed 100%
  const fixed50 = (r.ivmgAnnual + r.faiAnnual) / 12 * presence;  // taxed 50%

  // Hours with 600h annual threshold
  const sbh = +i.sbh || 0;
  const before = +i.hoursBeforeInYear || 0;
  const hLow  = Math.max(0, Math.min(sbh, SALARY_HOURS_THRESHOLD - before));
  const hHigh = sbh - hLow;
  const ivo   = hLow * r.rateLow + hHigh * r.rateHigh;          // taxed 50%

  const diaria   = (+i.flyDays || 0) * r.diaria;                // EXEMPT
  const sby      = (+i.sbyDays || 0) * r.diaria;                // taxed 100%
  const al       = (+i.alDays  || 0) * r.alRate;               // taxed 50%
  const bh       = (+i.bhDays  || 0) * r.alRate;               // taxed 50%
  const training = (+i.trainingDays || 0) * r.training;         // taxed 100%
  const leavePay = leaveDays * SALARY_RMG * (+i.leavePct || 0.30); // taxed 100%, no contrib
  const tredicesima = (month === 12) ? r.baseAnnual / 13 : 0;   // taxed 100%
  const commission = +i.commission || 0;

  const gross = base + fixed50 + ivo + diaria + sby + al + bh + training + leavePay + tredicesima + commission;

  // INPS contributions — on the conventional wage, NOT on gross
  const contribBase = Math.round(r.convINPS * Math.max(0, 26 - leaveDays) / 26);
  const contrib = contribBase * SALARY_CONTRIB_RATE;

  // IRPEF taxable base
  const taxable = Math.max(0,
    base + sby + training + leavePay + tredicesima + commission
    + 0.5 * (fixed50 + ivo + al + bh) - contrib);

  // IRPEF gross (annual brackets / 12)
  const s1 = 28000 / 12, s2 = 50000 / 12;
  let irpefGross;
  if (taxable <= s1) irpefGross = taxable * 0.23;
  else if (taxable <= s2) irpefGross = s1 * 0.23 + (taxable - s1) * 0.33;
  else irpefGross = s1 * 0.23 + (s2 - s1) * 0.33 + (taxable - s2) * 0.43;

  // R = estimated annual income
  const R = (Roverride != null) ? Roverride : _salEstimateR(year, i.payMonth, taxable);

  const detr = (R <= 15000 ? 1955
    : R <= 28000 ? 1910 + 1190 * (28000 - R) / 13000
    : R <= 50000 ? 1910 * (50000 - R) / 22000
    : 0) * dim / 365;

  const extra = (R <= 20000 ? 0
    : R <= 32000 ? 1000
    : R <= 40000 ? 1000 * (40000 - R) / 8000
    : 0) * dim / 365;

  const irpefNet = Math.max(0, irpefGross - detr - extra);

  const bonus100 = (R <= 15000 && irpefGross > detr - 75 * dim / 365) ? 1200 * dim / 365 : 0;
  const sommaEsente = taxable * (R <= 8500 ? 0.071 : R <= 15000 ? 0.053 : R <= 20000 ? 0.048 : 0);

  const a = _salAddizionali(year);
  const addizionali = (month <= 11 ? a.reg + a.comSaldo : 0) + (month >= 3 && month <= 11 ? a.comAcconto : 0);

  const net = gross - contrib - irpefNet + bonus100 + sommaEsente - addizionali - SALARY_UNION;

  return {
    net, gross, contrib, contribBase, taxable,
    irpefGross, irpefNet, detr, extra, bonus100, sommaEsente,
    addizionali, union: SALARY_UNION, R,
    parts: { base, fixed50, ivo, diaria, sby, al, bh, training, leavePay, tredicesima, commission },
    rate: r, presence, hLow, hHigh,
  };
}

// R from stored history: average monthly taxable of that year × 12 (incl. the
// month being computed), fallback 12000.
function _salEstimateR(year, payMonth, currentTaxable) {
  const hist = (APP && APP.salaryHistory) || {};
  const taxables = [];
  for (const [ym, rec] of Object.entries(hist)) {
    if (ym.startsWith(year + '-') && ym !== payMonth && rec && typeof rec.taxable === 'number') {
      taxables.push(rec.taxable);
    }
  }
  if (typeof currentTaxable === 'number') taxables.push(currentTaxable);
  if (!taxables.length) return 12000;
  const avg = taxables.reduce((a, b) => a + b, 0) / taxables.length;
  return avg * 12;
}

window.computeSalary = computeSalary;

// ══════════════════════════════════════════════════════════════
// PREFILL from the previous month's roster
// ══════════════════════════════════════════════════════════════
// The payslip of M pays M-1's variables, so we read month M-1.
function _salPrevMonth(payMonth) {
  const [y, m] = payMonth.split('-').map(Number); // m 1..12
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  return { year: py, month1: pm, ym: `${py}-${String(pm).padStart(2,'0')}` };
}

// Counting year for the 600h threshold starts in January (param could be 1 or 4).
function _salPrefill(payMonth, yearStartMonth = 1) {
  const prev = _salPrevMonth(payMonth);
  const out = {
    sbh: 0, flyDays: 0, sbyDays: 0, alDays: 0, leaveDays: 0,
    bhDays: 1, trainingDays: 0, hoursBeforeInYear: 0,
    prevLabel: prev.ym,
  };

  // Block hours + flying days from the month stats helper.
  if (typeof calcMonthStats === 'function') {
    const st = calcMonthStats(prev.year, prev.month1 - 1); // month arg is 0-based
    out.sbh = Math.round((st.ft || 0) * 100) / 100;
    out.flyDays = st.flyingDays || 0;
  }

  // Count SBY (HSBY+AD), AL and leave (PL) days directly from assignments.
  const prefix = prev.ym;
  const assigns = (APP && APP.assignments) || {};
  for (const [ds, a] of Object.entries(assigns)) {
    if (!ds.startsWith(prefix)) continue;
    if (a === 'HSBY' || a === 'AD') out.sbyDays++;
    else if (a === 'AL') out.alDays++;
    else if (a === 'PL') out.leaveDays++;
  }

  // Hours already paid earlier in the counting year (sum of block hours of the
  // months from yearStart up to the month BEFORE M-1, same year as M-1).
  if (typeof calcMonthStats === 'function') {
    let acc = 0;
    for (let mm = yearStartMonth; mm < prev.month1; mm++) {
      const st = calcMonthStats(prev.year, mm - 1);
      acc += st.ft || 0;
    }
    out.hoursBeforeInYear = Math.round(acc * 100) / 100;
  }

  return out;
}

// ══════════════════════════════════════════════════════════════
// UI (Marius mode)
// ══════════════════════════════════════════════════════════════
// Euro formatter — predictable on iOS.
function _money(n) { return '€ ' + Number(n).toFixed(2); }

function _salCurrentPayMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

// Rendered as a dedicated full-screen page (NOT the swipe-dismiss modal), so a
// long data-entry form can't be closed by accident. Closes only via the back
// button, which returns to the Marius panel.
function openSalary(payMonth) {
  const pm = payMonth || (window._salPayMonth) || _salCurrentPayMonth();
  window._salPayMonth = pm;

  // Prefill from roster, but if we have a saved record for this month, use it.
  const saved = (APP.salaryHistory || {})[pm];
  const pf = saved ? saved.input : _salPrefill(pm);
  const prev = _salPrevMonth(pm);

  const field = (id, label, val, step='1', hint='') => `
    <label style="display:block;font-size:11px;font-weight:700;letter-spacing:0.5px;
                  text-transform:uppercase;color:var(--text3);margin:10px 0 4px">${label}
      ${hint?`<span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--text3)"> · ${hint}</span>`:''}</label>
    <input id="${id}" type="number" inputmode="decimal" step="${step}" value="${val ?? ''}"
           style="width:100%;box-sizing:border-box;margin:0;font-family:'JetBrains Mono',monospace">`;

  // Close the Marius panel modal behind us, if open.
  const sm = document.getElementById('settingModal');
  if (sm) sm.classList.remove('open');

  // Full-screen overlay — created once, reused on re-render.
  let scr = document.getElementById('salaryScreen');
  if (!scr) {
    scr = document.createElement('div');
    scr.id = 'salaryScreen';
    scr.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:600;' +
      'overflow-y:auto;-webkit-overflow-scrolling:touch';
    document.body.appendChild(scr);
  }

  scr.innerHTML = `
    <div style="position:sticky;top:0;z-index:5;background:var(--surface);
                border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;
                padding:max(14px,env(safe-area-inset-top)) 16px 14px">
      <button onclick="closeSalary()"
        style="padding:8px 14px;border-radius:10px;border:1.5px solid var(--border);
               background:var(--bg);font-family:'Outfit',sans-serif;font-size:14px;
               font-weight:700;color:var(--text);cursor:pointer">←</button>
      <div style="font-size:18px;font-weight:800;color:var(--text)">💶 Stipendio</div>
    </div>

    <div style="padding:16px;padding-bottom:max(32px,env(safe-area-inset-bottom))">
      <div style="font-size:12px;color:var(--text2);line-height:1.5;margin-bottom:10px">
        Busta di <strong>${pm}</strong> = fisso di ${pm} + variabili di
        <strong>${prev.ym}</strong>. Campi precompilati dal roster, modificabili.
      </div>

      <label style="display:block;font-size:11px;font-weight:700;letter-spacing:0.5px;
                    text-transform:uppercase;color:var(--text3);margin:4px 0 4px">Mese busta</label>
      <input id="salPayMonth" type="month" value="${pm}" onchange="salChangeMonth()"
             style="width:100%;box-sizing:border-box;margin:0 0 4px">

      ${field('salSbh','Ore block (SBH) M-1', pf.sbh, '0.01')}
      ${field('salFlyDays','Giorni volo', pf.flyDays)}
      ${field('salSbyDays','Giorni SBY / terra', pf.sbyDays)}
      ${field('salAlDays','Giorni AL', pf.alDays)}
      ${field('salBhDays','Bank holiday', pf.bhDays ?? 1)}
      ${field('salTrainingDays','Giorni training', pf.trainingDays ?? 0)}
      ${field('salLeaveDays','Giorni congedo', pf.leaveDays ?? 0)}

      <label style="display:block;font-size:11px;font-weight:700;letter-spacing:0.5px;
                    text-transform:uppercase;color:var(--text3);margin:10px 0 4px">Tipo congedo</label>
      <select id="salLeavePct" style="width:100%;box-sizing:border-box;margin:0">
        <option value="0.30"${(pf.leavePct==0.30||pf.leavePct==null)?' selected':''}>30% parentale</option>
        <option value="0.80"${pf.leavePct==0.80?' selected':''}>80% primi 3 mesi</option>
        <option value="1.00"${pf.leavePct==1.00?' selected':''}>100% paternità</option>
      </select>

      ${field('salCommission','Commissione €', pf.commission ?? 0, '0.01')}
      ${field('salHoursBefore','Ore SBH già pagate (anno)', pf.hoursBeforeInYear ?? 0, '0.01', 'soglia 600')}

      <button class="btn" style="margin-top:16px" onclick="salCalc()">Calcola</button>
      <button class="btn secondary" style="margin-top:8px" onclick="salReprefill()">↻ Ricompila dal roster</button>

      <div id="salResult" style="margin-top:16px"></div>

      <button class="btn secondary" style="margin-top:16px" onclick="closeSalary()">← Indietro</button>
    </div>
  `;

  // Auto-calc on open so the result is there immediately.
  salCalc();
}

function closeSalary() {
  const scr = document.getElementById('salaryScreen');
  if (scr) scr.remove();
  openMariusPanel();
}

function _salReadForm() {
  const g = id => document.getElementById(id);
  const pm = g('salPayMonth')?.value || window._salPayMonth || _salCurrentPayMonth();
  window._salPayMonth = pm;
  return {
    payMonth: pm,
    sbh:        parseFloat(g('salSbh')?.value) || 0,
    flyDays:    parseInt(g('salFlyDays')?.value) || 0,
    sbyDays:    parseInt(g('salSbyDays')?.value) || 0,
    alDays:     parseInt(g('salAlDays')?.value) || 0,
    bhDays:     parseInt(g('salBhDays')?.value) || 0,
    trainingDays: parseInt(g('salTrainingDays')?.value) || 0,
    leaveDays:  parseInt(g('salLeaveDays')?.value) || 0,
    leavePct:   parseFloat(g('salLeavePct')?.value) || 0.30,
    commission: parseFloat(g('salCommission')?.value) || 0,
    hoursBeforeInYear: parseFloat(g('salHoursBefore')?.value) || 0,
  };
}

function salChangeMonth() {
  const pm = document.getElementById('salPayMonth')?.value;
  if (pm) openSalary(pm);
}

function salReprefill() {
  const pm = document.getElementById('salPayMonth')?.value || _salCurrentPayMonth();
  // Drop any saved record so prefill comes fresh from the roster.
  if (APP.salaryHistory && APP.salaryHistory[pm]) { delete APP.salaryHistory[pm]; save(); }
  openSalary(pm);
}

function salCalc() {
  const input = _salReadForm();
  const r = computeSalary(input);
  const el = document.getElementById('salResult');
  if (!el) return;

  const row = (lbl, val, strong=false) => `
    <div style="display:flex;justify-content:space-between;align-items:center;
                padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span style="color:${strong?'var(--text)':'var(--text2)'};${strong?'font-weight:700':''}">${lbl}</span>
      <span style="font-family:'JetBrains Mono',monospace;${strong?'font-weight:800;color:var(--text)':'color:var(--text2)'}">${_money(val)}</span>
    </div>`;

  el.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);
                border-left:3px solid var(--yellow);border-radius:14px;padding:16px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3)">Netto stimato</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:800;color:var(--yellow);margin-top:2px">${_money(r.net)}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:4px">reddito annuo stimato R ≈ ${_money(r.R)}</div>
    </div>

    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px 16px">
      ${row('Lordo', r.gross, true)}
      ${row('Contributi INPS', -r.contrib)}
      ${row('IRPEF netta', -r.irpefNet)}
      ${row('Bonus / tratt. integrativo', r.bonus100)}
      ${row('Somma esente (L.207/24)', r.sommaEsente)}
      ${row('Addizionali', -r.addizionali)}
      ${row('Sindacato', -r.union)}
      ${row('Imponibile IRPEF', r.taxable)}
    </div>

    <details style="margin-top:10px">
      <summary style="cursor:pointer;font-size:12px;color:var(--blue);font-weight:600">Dettaglio voci lordo</summary>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-top:8px">
        ${row('Base', r.parts.base)}
        ${row('IVMG + Ind. agg. volo (50%)', r.parts.fixed50)}
        ${row('Ore volo (IVO)', r.parts.ivo)}
        ${row('Diaria (esente)', r.parts.diaria)}
        ${row('SBY / terra', r.parts.sby)}
        ${row('AL', r.parts.al)}
        ${row('Bank holiday', r.parts.bh)}
        ${row('Training', r.parts.training)}
        ${row('Congedo', r.parts.leavePay)}
        ${r.parts.tredicesima?row('Tredicesima', r.parts.tredicesima):''}
        ${row('Commissione', r.parts.commission)}
      </div>
    </details>

    <button class="btn secondary" style="margin-top:12px" onclick="salSave()">💾 Salva questo mese</button>
    <div id="salSaveMsg" style="font-size:12px;color:var(--green);text-align:center;margin-top:6px;display:none">Salvato ✓</div>
  `;
}

// Save the month to local history so R and hoursBefore improve over time.
function salSave() {
  const input = _salReadForm();
  const r = computeSalary(input);
  if (!APP.salaryHistory) APP.salaryHistory = {};
  APP.salaryHistory[input.payMonth] = {
    input,
    taxable: r.taxable,
    net: r.net,
    gross: r.gross,
    savedAt: Date.now(),
  };
  save();
  const m = document.getElementById('salSaveMsg');
  if (m) { m.style.display = 'block'; setTimeout(() => { if(m) m.style.display='none'; }, 2500); }
}

window.openSalary     = openSalary;
window.closeSalary    = closeSalary;
window.salCalc        = salCalc;
window.salChangeMonth = salChangeMonth;
window.salReprefill   = salReprefill;
window.salSave        = salSave;
