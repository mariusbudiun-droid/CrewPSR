// ══════════════════════════════════════════════════════════════
// ROSTER IMPORT v2 — handles iOS OCR output from Ryanair Connect
// Two formats:
//   Format A (confirmed week): dates all first, duties jumbled after
//   Format B (planned):        each date followed by its own duties
// ══════════════════════════════════════════════════════════════

// ── OCR normalisation ────────────────────────────────────────
function normaliseOCR(text) {
return text
// digit + lowercase-L → two digits  (1l Apr → 11 Apr)
.replace(/(\d)l/g, ‘$11’)
// OBE / OFE / OBF are OCR misreads of OFF
.replace(/\bOB[EF]\b/gi, ‘OFF’)
.replace(/\bOF[EF]\b/gi, ‘OFF’)
// trailing Z misread as 2 or z in times  “06:40 2” → “06:40 Z”
.replace(/(\d{2}:\d{2})\s*[2z]\b/gi, ‘$1 Z’)
// “FR 1629” → “FR1629” (space inside flight number)
.replace(/\bFR\s+(\d+)/gi, ‘FR$1’)
// “:15” at line start is likely a truncated time — drop it
.replace(/^\s*:\d{2}\s*$/gm, ‘’)
// remove footnote noise lines
.replace(/^.*eCrew.*$/gim, ‘’)
.replace(/^.*printable roster.*$/gim, ‘’)
.replace(/^.*responsibility.*$/gim, ‘’)
.replace(/^.*primary ref.*$/gim, ‘’)
.replace(/^.*published.*$/gim, ‘’)
.replace(/^.*week 1.*$/gim, ‘’)
.replace(/^.*weeks 2.*$/gim, ‘’)
.replace(/^.*PLANNED.*$/gim, ‘— PLANNED —’)
// collapse multiple spaces / blank lines
.replace(/[ \t]+/g, ’ ’)
.replace(/\n{3,}/g, ‘\n\n’);
}

// ── Date parsing helpers ─────────────────────────────────────
const MON_MAP = {
jan:0,feb:1,mar:2,apr:3,may:4,jun:5,
jul:6,aug:7,sep:8,oct:9,nov:10,dec:11
};
const DOW_RE = /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/i;

function extractDateStr(line) {
// Format B: “Mon, 13 Apr 26” or “Mon 13 Apr 2026”
let m = line.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})/i);
if (m) return buildDate(m[1], m[2], m[3]);
// Format A: “3 Apr 26, Fri” or “3 Apr 26”
m = line.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})/i);
if (m) return buildDate(m[1], m[2], m[3]);
return null;
}

function buildDate(d, mon, y) {
const month = MON_MAP[mon.toLowerCase()];
if (month === undefined) return null;
let year = parseInt(y);
if (year < 100) year += 2000;
return `${year}-${String(month+1).padStart(2,'0')}-${String(parseInt(d)).padStart(2,'0')}`;
}

// Italy DST offset
function italyOffset(ds) {
const d = new Date(ds);
const yr = d.getFullYear();
const dst0 = new Date(yr, 2, 31); dst0.setDate(31 - dst0.getDay());
const dst1 = new Date(yr, 9, 31); dst1.setDate(31 - dst1.getDay());
d.setHours(12);
return (d >= dst0 && d < dst1) ? 2 : 1;
}

function addHours(t, h) {
if (!t) return ‘’;
const [hh, mm] = t.split(’:’).map(Number);
const tot = hh*60 + mm + h*60;
return `${String(Math.floor((tot%1440)/60)).padStart(2,'0')}:${String(tot%60).padStart(2,'0')}`;
}

// ── Time extractor ───────────────────────────────────────────
function extractTimes(chunk) {
const times = [];
const re = /\b(\d{1,2}):(\d{2})\s*Z/g;
let m;
while ((m = re.exec(chunk)) !== null) {
times.push(`${String(parseInt(m[1])).padStart(2,'0')}:${m[2]}`);
}
return times;
}

// ── Airport extractor ────────────────────────────────────────
// Only 3-letter uppercase words that look like airports (not FR\d, not English words)
const NON_AIRPORTS = new Set([
‘THE’,‘AND’,‘FOR’,‘OFF’,‘PSR’,‘Z’,‘FR’,‘END’,‘ARR’,‘DEP’,‘BEGIN’,
‘CHECK’,‘OUT’,‘DEC’,‘JAN’,‘FEB’,‘MAR’,‘APR’,‘MAY’,‘JUN’,
‘JUL’,‘AUG’,‘SEP’,‘OCT’,‘NOV’,‘SUN’,‘MON’,‘TUE’,‘WED’,‘THU’,‘FRI’,‘SAT’,
‘HSBY’,‘DUTY’,‘DATE’,‘TIME’,‘STR’ // STR is actually Strasbourg but causes issues
]);

function extractAirports(chunk) {
const airports = [];
const re = /\b([A-Z]{3})\b/g;
let m;
while ((m = re.exec(chunk)) !== null) {
if (!NON_AIRPORTS.has(m[1]) && !/^\d/.test(m[1])) {
airports.push(m[1]);
}
}
return airports;
}

// ── Flight number extractor ──────────────────────────────────
function extractFlightNums(chunk) {
const re = /\bFR(\d{3,5})\b/gi;
const res = [];
let m;
while ((m = re.exec(chunk)) !== null) res.push(‘FR’ + m[1]);
return res;
}

// ── Parse a single day’s chunk of text ──────────────────────
function parseDayChunk(ds, chunk) {
const upper = chunk.toUpperCase();
const offset = italyOffset(ds);

// OFF
if (/\bOFF\b/.test(upper) && !/CHECK-IN|FR\d{3}/.test(upper)) {
return { duty: ‘OFF’ };
}

// HSBY — no flights
if (/\bHSBY\b/.test(upper) && !/CHECK-IN|FR\d{3}/.test(upper)) {
const times = extractTimes(chunk);
// First two times are check-in / check-out
return {
duty: ‘HSBY’,
start: times[0] ? addHours(times[0], offset) : ‘’,
end:   times[1] ? addHours(times[1], offset) : ‘’
};
}

// AD — airport duty, no flights
if (/\bAD\b/.test(upper) && !/FR\d{3}/.test(upper)) {
const times = extractTimes(chunk);
return {
duty: ‘AD’,
start: times[0] ? addHours(times[0], offset) : ‘’,
end:   times[1] ? addHours(times[1], offset) : ‘’
};
}

// Flights — CHECK-IN present or FR number present
if (/CHECK-IN|FR\d{3}/i.test(chunk)) {
const flights = buildFlights(chunk, offset);
if (flights.length > 0) {
return { duty: ‘CUSTOM’, flights };
}
// Has flights but couldn’t parse them — mark as unknown
return null;
}

return null;
}

// ── Build flight legs from a chunk ───────────────────────────
function buildFlights(chunk, offset) {
// Strategy: find all times and airports, then pair them.
// Times come in pairs: dep Z, arr Z for each leg.
// Airports come in pairs: origin, destination for each leg.
// Between CHECK-IN and CHECK-OUT.

// Extract the section between CHECK-IN and CHECK-OUT
const ciMatch = chunk.match(/CHECK-IN([\s\S]*?)CHECK-OUT/i);
const section = ciMatch ? ciMatch[1] : chunk;

const times    = extractTimes(section);
const airports = extractAirports(section.toUpperCase());
const flightNums = extractFlightNums(section);

// We need at least 2 times per leg (dep + arr) and 2 airports per leg
const numLegs = Math.max(
Math.floor(times.length / 2),
Math.floor(airports.length / 2),
flightNums.length
);

if (numLegs === 0) return [];

const flights = [];
for (let i = 0; i < numLegs; i++) {
const dep  = times[i * 2]     ? addHours(times[i * 2], offset)     : ‘’;
const arr  = times[i * 2 + 1] ? addHours(times[i * 2 + 1], offset) : ‘’;
const from = airports[i * 2]   || ‘’;
const to   = airports[i * 2 + 1] || ‘’;
if (from || to || dep) {
flights.push({ from, to, dep, arr });
}
}
return flights;
}

// ══════════════════════════════════════════════════════════════
// MAIN PARSER
// ══════════════════════════════════════════════════════════════
function parseRosterText(raw) {
const text  = normaliseOCR(raw);
const lines = text.split(’\n’);
const results = {};

// ── Step 1: collect all date positions ──────────────────────
const datePositions = []; // { lineIdx, ds }
lines.forEach((line, i) => {
const ds = extractDateStr(line);
if (ds) datePositions.push({ lineIdx: i, ds });
});

if (datePositions.length === 0) return {};

// ── Step 2: for each date, grab its chunk and parse ─────────
for (let d = 0; d < datePositions.length; d++) {
const { lineIdx, ds } = datePositions[d];
const nextLineIdx = d + 1 < datePositions.length
? datePositions[d + 1].lineIdx
: lines.length;

```
// The chunk is the lines between this date and the next date
const chunk = lines.slice(lineIdx, nextLineIdx).join('\n');

const entry = parseDayChunk(ds, chunk);
if (entry) results[ds] = entry;
```

}

// ── Step 3: fallback for Format A (dates-first block) ───────
// If we got very few results relative to dates found,
// try to extract OFF/HSBY from the non-date area
if (Object.keys(results).length < datePositions.length * 0.5) {
tryFormatA(lines, datePositions, results);
}

return results;
}

// ── Format A fallback: dates listed first, duties after ──────
function tryFormatA(lines, datePositions, results) {
// Find the line where dates stop and duties start
// Heuristic: first line with CHECK-IN or HSBY after all dates
const lastDateLine = datePositions[datePositions.length - 1].lineIdx;
const dutyLines = lines.slice(lastDateLine + 1);
const dutyText  = dutyLines.join(’ ’);

// Extract duty sequences: each CHECK-IN block, HSBY, OFF
const tokens = [];
const re = /\b(CHECK-IN[\s\S]*?CHECK-OUT|HSBY|OFF)\b/gi;
let m;
while ((m = re.exec(dutyText)) !== null) tokens.push(m[0]);

// Assign tokens to dates that don’t have a result yet
const unassigned = datePositions.filter(dp => !results[dp.ds]);
tokens.forEach((tok, i) => {
if (i >= unassigned.length) return;
const { ds } = unassigned[i];
const entry = parseDayChunk(ds, tok);
if (entry) results[ds] = entry;
});
}

// ══════════════════════════════════════════════════════════════
// UI
// ══════════════════════════════════════════════════════════════
function triggerRosterImport() {
// Show the text-paste modal first — it’s the most reliable method
showPasteModal();
}

function showPasteModal() {
const existing = document.getElementById(‘rosterPasteModal’);
if (existing) existing.remove();

const div = document.createElement(‘div’);
div.id = ‘rosterPasteModal’;
div.style.cssText = `position:fixed; inset:0; background:var(--bg); z-index:300; display:flex; flex-direction:column; overflow:hidden;`;
div.innerHTML = `
<div style="
display:flex; align-items:center; justify-content:space-between;
padding:14px 16px; padding-top:max(14px, env(safe-area-inset-top));
background:var(--surface); border-bottom:1px solid var(--border);
position:sticky; top:0; z-index:10; flex-shrink:0
">
<button onclick="closePasteModal()"
style="padding:8px 14px; border-radius:10px; border:1.5px solid var(--border);
background:var(--bg); font-family:'Outfit',sans-serif; font-size:14px;
font-weight:600; color:var(--text); cursor:pointer">✕ Cancel</button>
<div style="font-size:16px; font-weight:700; color:var(--text)">Import Roster</div>
<div style="width:60px"></div>
</div>

```
<div style="flex:1; overflow-y:auto; padding:20px 16px; -webkit-overflow-scrolling:touch">

  <div style="background:var(--blue-lt); border-radius:12px; padding:14px 16px; margin-bottom:20px; border-left:3px solid var(--blue)">
    <div style="font-size:13px; font-weight:700; color:var(--blue); margin-bottom:6px">Come fare</div>
    <div style="font-size:12px; color:var(--text2); line-height:1.6">
      1. Apri Ryanair Connect sul browser<br>
      2. Vai al tuo roster<br>
      3. Fai screenshot → <strong>Foto → premi sull'immagine → seleziona tutto il testo rilevato</strong> (icona in basso a sinistra)<br>
      4. Copia e incolla qui sotto<br><br>
      <em>Oppure</em>, se hai il PDF, aprilo e copia tutto il testo.
    </div>
  </div>

  <div style="font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--text3); margin-bottom:8px">
    Incolla il testo del roster
  </div>
  <textarea id="rosterPasteInput"
    placeholder="Incolla qui il testo estratto dal roster..."
    style="
      width:100%; min-height:220px; box-sizing:border-box;
      background:var(--surface); border:1.5px solid var(--border);
      border-radius:12px; padding:14px; font-family:'JetBrains Mono',monospace;
      font-size:12px; color:var(--text); line-height:1.5; resize:vertical;
      -webkit-appearance:none; outline:none; margin-bottom:12px
    "
  ></textarea>

  <button onclick="processPastedRoster()"
    style="
      width:100%; padding:14px; border-radius:12px; border:none;
      background:var(--blue); font-family:'Outfit',sans-serif;
      font-size:15px; font-weight:700; color:white; cursor:pointer;
      margin-bottom:12px
    ">
    ✦ Analizza roster
  </button>

  <div style="text-align:center; color:var(--text3); font-size:12px; margin:4px 0 12px">oppure</div>

  <button onclick="triggerFileImport()"
    style="
      width:100%; padding:12px; border-radius:12px;
      border:1.5px solid var(--border); background:var(--bg);
      font-family:'Outfit',sans-serif; font-size:14px;
      font-weight:600; color:var(--text2); cursor:pointer;
      margin-bottom:20px
    ">
    📎 Importa file (PDF / immagine)
  </button>

  <div id="rosterImportMsg" style="display:none; text-align:center; font-size:13px; padding:8px; border-radius:8px"></div>
</div>
```

`;
document.body.appendChild(div);
}

function closePasteModal() {
const m = document.getElementById(‘rosterPasteModal’);
if (m) m.remove();
}

function processPastedRoster() {
const text = document.getElementById(‘rosterPasteInput’)?.value?.trim();
if (!text) {
showPasteMsg(‘Incolla prima il testo del roster.’, ‘var(–red)’);
return;
}
showPasteMsg(‘⏳ Analisi in corso…’, ‘var(–text2)’);
setTimeout(() => {
try {
const parsed = parseRosterText(text);
if (Object.keys(parsed).length > 0) {
closePasteModal();
showImportPreview(parsed);
} else {
showPasteMsg(‘❌ Nessun dato trovato. Controlla di aver incollato tutto il testo del roster.’, ‘var(–red)’);
}
} catch (err) {
showPasteMsg(’❌ Errore: ’ + (err.message || ‘parsing failed’), ‘var(–red)’);
}
}, 50);
}

function showPasteMsg(msg, color) {
const el = document.getElementById(‘rosterImportMsg’);
if (!el) return;
el.textContent = msg;
el.style.color = color;
el.style.display = ‘block’;
}

// ── File import (PDF / image OCR) ───────────────────────────
function triggerFileImport() {
const input = document.createElement(‘input’);
input.type  = ‘file’;
input.accept = ‘image/*,application/pdf,text/plain’;
input.onchange = async (e) => {
const file = e.target.files[0];
if (!file) return;
showPasteMsg(‘⏳ Processing file…’, ‘var(–text2)’);

```
try {
  let text = '';
  if (file.type === 'application/pdf') {
    text = await readPdfText(file);
  } else if (file.type.startsWith('image/')) {
    if (!window.Tesseract) {
      showPasteMsg('❌ Tesseract non caricato. Usa la funzione testo incollato.', 'var(--red)');
      return;
    }
    const { data: { text: t } } = await Tesseract.recognize(file, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          showPasteMsg(`⏳ OCR ${Math.round(m.progress * 100)}%`, 'var(--text2)');
        }
      }
    });
    text = t;
  } else if (file.type === 'text/plain') {
    text = await file.text();
  } else {
    showPasteMsg('❌ Formato non supportato.', 'var(--red)');
    return;
  }

  // Paste into textarea for user to review / correct before parsing
  const ta = document.getElementById('rosterPasteInput');
  if (ta) {
    ta.value = text;
    showPasteMsg('✅ Testo estratto. Premi "Analizza roster".', 'var(--blue)');
  }
} catch (err) {
  showPasteMsg('❌ ' + (err.message || 'Errore lettura file'), 'var(--red)');
}
```

};
input.click();
}

async function readPdfText(file) {
const pdfjsLib = window[‘pdfjs-dist/build/pdf’];
if (!pdfjsLib) throw new Error(‘PDF.js non disponibile’);
pdfjsLib.GlobalWorkerOptions.workerSrc =
‘https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js’;

const arrayBuffer = await file.arrayBuffer();
const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
let fullText = ‘’;

for (let p = 1; p <= pdf.numPages; p++) {
const page    = await pdf.getPage(p);
const content = await page.getTextContent();
let lastY = null, rowText = ‘’;
for (const item of content.items) {
const y = Math.round(item.transform[5]);
if (lastY !== null && y !== lastY) {
fullText += rowText.trim() + ‘\n’;
rowText = ‘’;
}
rowText += item.str + ’ ’;
lastY = y;
}
if (rowText.trim()) fullText += rowText.trim() + ‘\n’;
}
return fullText;
}

// ══════════════════════════════════════════════════════════════
// PREVIEW & CONFIRM  (unchanged API)
// ══════════════════════════════════════════════════════════════
function showImportPreview(parsed) {
const keys    = Object.keys(parsed).sort();
const DOW2    = [‘Sun’,‘Mon’,‘Tue’,‘Wed’,‘Thu’,‘Fri’,‘Sat’];
const MONTHS2 = [‘Jan’,‘Feb’,‘Mar’,‘Apr’,‘May’,‘Jun’,‘Jul’,‘Aug’,‘Sep’,‘Oct’,‘Nov’,‘Dec’];

let html = ` <div style="position:fixed;inset:0;background:var(--bg);z-index:300;overflow-y:auto; padding-bottom:max(20px,env(safe-area-inset-bottom))" id="importPreviewScreen"> <div style="display:flex;align-items:center;justify-content:space-between; padding:14px 16px;padding-top:max(14px,env(safe-area-inset-top)); background:var(--surface);border-bottom:1px solid var(--border); position:sticky;top:0;z-index:10"> <button onclick="closeImportPreview()" style="padding:8px 14px;border-radius:10px;border:1.5px solid var(--border); background:var(--bg);font-family:'Outfit',sans-serif;font-size:14px; font-weight:600;color:var(--text);cursor:pointer">✕ Cancel</button> <div style="font-size:16px;font-weight:700;color:var(--text)">Import Preview</div> <button onclick="confirmRosterImport()" style="padding:8px 16px;border-radius:10px;border:none;background:var(--blue); font-family:'Outfit',sans-serif;font-size:14px;font-weight:700; color:white;cursor:pointer">✅ Import</button> </div> <div style="padding:12px 16px 6px;font-size:12px;color:var(--text3)"> ${keys.length} giorni trovati · Orari convertiti in ora italiana </div>`;

for (const ds of keys) {
const d   = new Date(ds + ‘T12:00:00’);
const dow = DOW2[d.getDay()];
const dateLabel = `${dow} ${d.getDate()} ${MONTHS2[d.getMonth()]}`;
const entry = parsed[ds];

```
let dutyHtml = '';
let bg = 'var(--surface)';
let bc = 'var(--border)';

if (entry.duty === 'OFF') {
  dutyHtml = `<span style="color:var(--off);font-weight:700">🌿 Day Off</span>`;
  bg = 'var(--off-lt)'; bc = 'var(--off)';
} else if (entry.duty === 'HSBY') {
  const ts = [entry.start, entry.end].filter(Boolean).join(' – ');
  dutyHtml = `<span style="color:var(--yellow);font-weight:700">☎ HSBY</span>
    <span style="font-size:12px;color:var(--text2);margin-left:8px">${ts}</span>`;
  bg = 'var(--yellow-lt)'; bc = 'var(--yellow)';
} else if (entry.duty === 'AD') {
  const ts = [entry.start, entry.end].filter(Boolean).join(' – ');
  dutyHtml = `<span style="color:var(--red);font-weight:700">🏢 Airport Duty</span>
    <span style="font-size:12px;color:var(--text2);margin-left:8px">${ts}</span>`;
  bg = 'var(--red-lt)'; bc = 'var(--red)';
} else if (entry.duty === 'CUSTOM') {
  const routes = (entry.flights || []).map(f => `
    <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text2)">
      ${f.from || '?'}-${f.to || '?'} &nbsp; ${f.dep || '--:--'} → ${f.arr || '--:--'}
    </div>`).join('');
  dutyHtml = `<span style="color:var(--blue);font-weight:700">✈ Flights</span>${routes}`;
  bg = 'var(--early-lt)'; bc = 'var(--early)';
}

html += `
  <div style="margin:0 16px 8px;padding:12px 14px;border-radius:12px;
              background:${bg};border:1.5px solid ${bc}">
    <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px">${dateLabel}</div>
    ${dutyHtml}
  </div>`;
```

}

html += ` <div style="padding:16px"> <button onclick="confirmRosterImport()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--blue); font-family:'Outfit',sans-serif;font-size:15px;font-weight:700; color:white;cursor:pointer">✅ Import ${keys.length} giorni</button> </div> </div>`;

window._pendingImport = parsed;
const div = document.createElement(‘div’);
div.innerHTML = html;
document.body.appendChild(div.firstElementChild);
}

function closeImportPreview() {
const s = document.getElementById(‘importPreviewScreen’);
if (s) s.remove();
window._pendingImport = null;
}

function confirmRosterImport() {
const parsed = window._pendingImport;
if (!parsed) return;

if (!APP.assignments)   APP.assignments   = {};
if (!APP.customFlights) APP.customFlights = {};
if (!APP.assignDetails) APP.assignDetails = {};

for (const [ds, entry] of Object.entries(parsed)) {
if (entry.duty === ‘OFF’) {
delete APP.assignments[ds];
delete APP.customFlights[ds];
delete APP.assignDetails[ds];
} else if (entry.duty === ‘HSBY’) {
APP.assignments[ds]  = ‘HSBY’;
APP.assignDetails[ds] = { start: entry.start, end: entry.end };
delete APP.customFlights[ds];
} else if (entry.duty === ‘AD’) {
APP.assignments[ds]  = ‘AD’;
APP.assignDetails[ds] = { start: entry.start, end: entry.end };
delete APP.customFlights[ds];
} else if (entry.duty === ‘CUSTOM’) {
APP.assignments[ds]  = ‘CUSTOM’;
APP.customFlights[ds] = entry.flights;
delete APP.assignDetails[ds];
}
}

save();
closeImportPreview();
renderCalendar();
renderHome();

const count = Object.keys(parsed).length;
// show brief toast
const toast = document.createElement(‘div’);
toast.textContent = `✅ Importati ${count} giorni`;
toast.style.cssText = `position:fixed; bottom:max(24px,env(safe-area-inset-bottom)); left:50%; transform:translateX(-50%); background:var(--blue); color:white; padding:10px 20px; border-radius:20px; font-family:'Outfit',sans-serif; font-size:14px; font-weight:700; z-index:400; white-space:nowrap;`;
document.body.appendChild(toast);
setTimeout(() => toast.remove(), 3000);

window._pendingImport = null;
if (APP.notif?.enabled) scheduleAllNotifications();
}