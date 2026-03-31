// ══════════════════════════════════════════════════════════════
// ROSTER IMPORT — Ryanair Connect PDF parser
// Requires PDF.js loaded via CDN in index.html
// ══════════════════════════════════════════════════════════════

// Italy DST: +2 (last Sun Mar → last Sun Oct), else +1
function getItalyOffset(dateStr) {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const dstStart = new Date(year, 2, 31);
  dstStart.setDate(31 - dstStart.getDay());
  const dstEnd = new Date(year, 9, 31);
  dstEnd.setDate(31 - dstEnd.getDay());
  d.setHours(12);
  return (d >= dstStart && d < dstEnd) ? 2 : 1;
}

function addHours(timeStr, hours) {
  if (!timeStr || timeStr === '') return '';
  timeStr = timeStr.replace(/\s*Z$/i, '').trim();
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + hours * 60;
  const hh = Math.floor((total % 1440) / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
}

const MON_MAP = {
  jan:0,feb:1,mar:2,apr:3,may:4,jun:5,
  jul:6,aug:7,sep:8,oct:9,nov:10,dec:11
};

function parseDateStr(raw) {
  const m = raw.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})/);
  if (!m) return null;
  const day   = parseInt(m[1]);
  const month = MON_MAP[m[2].toLowerCase()];
  let year    = parseInt(m[3]);
  if (year < 100) year += 2000;
  if (month === undefined) return null;
  return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function parseRosterText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const results = {};

  let currentDate = null;
  let currentDuty = null;
  let currentFlights = [];
  let hsbyStart = null;
  let hsbyEnd   = null;

  function flush() {
    if (!currentDate) return;
    const offset = getItalyOffset(currentDate);
    if (currentDuty === 'OFF') {
      results[currentDate] = { duty: 'OFF' };
    } else if (currentDuty === 'HSBY') {
      results[currentDate] = {
        duty: 'HSBY',
        start: hsbyStart ? addHours(hsbyStart, offset) : '',
        end:   hsbyEnd   ? addHours(hsbyEnd,   offset) : ''
      };
    } else if (currentDuty === 'AD') {
      results[currentDate] = {
        duty: 'AD',
        start: hsbyStart ? addHours(hsbyStart, offset) : '',
        end:   hsbyEnd   ? addHours(hsbyEnd,   offset) : ''
      };
    } else if (currentDuty === 'FLIGHTS' && currentFlights.length > 0) {
      results[currentDate] = {
        duty: 'CUSTOM',
        flights: currentFlights.map(f => ({
          from: f.from,
          to:   f.to,
          dep:  addHours(f.dep, offset),
          arr:  addHours(f.arr, offset)
        }))
      };
    }
    currentDate    = null;
    currentDuty    = null;
    currentFlights = [];
    hsbyStart      = null;
    hsbyEnd        = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const dateMatch = line.match(/^(\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4}|[A-Za-z]{3,},?\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})/);
    if (dateMatch) {
      flush();
      currentDate = parseDateStr(line);
      if (/\bOFF\b/.test(line)) { currentDuty = 'OFF'; }
      else if (/\bHSBY\b/.test(line)) {
        currentDuty = 'HSBY';
        const times = line.match(/(\d{2}:\d{2})\s*Z.*?(\d{2}:\d{2})\s*Z/);
        if (times) { hsbyStart = times[1]; hsbyEnd = times[2]; }
      }
      else if (/\bAD\b/.test(line) && !/FR\d/.test(line)) {
        currentDuty = 'AD';
        const times = line.match(/(\d{2}:\d{2})\s*Z.*?(\d{2}:\d{2})\s*Z/);
        if (times) { hsbyStart = times[1]; hsbyEnd = times[2]; }
      }
      continue;
    }

    if (!currentDate) continue;

    if (/^\s*OFF\s*$/.test(line)) {
      currentDuty = 'OFF';
      continue;
    }

    if (/\bHSBY\b/.test(line) && !/FR\d/.test(line)) {
      currentDuty = 'HSBY';
      const times = line.match(/(\d{2}:\d{2})\s*Z[^\d]*(\d{2}:\d{2})\s*Z/);
      if (times) { hsbyStart = times[1]; hsbyEnd = times[2]; }
      continue;
    }

    if (/\bAD\b/.test(line) && !/FR\d/.test(line)) {
      currentDuty = 'AD';
      const times = line.match(/(\d{2}:\d{2})\s*Z[^\d]*(\d{2}:\d{2})\s*Z/);
      if (times) { hsbyStart = times[1]; hsbyEnd = times[2]; }
      continue;
    }

    const flightMatch = line.match(/FR\d+\s*[|\s]\s*([A-Z]{3})\s*[|\s]\s*(\d{2}:\d{2})\s*Z\s*[|\s]\s*(\d{2}:\d{2})\s*Z\s*[|\s]\s*([A-Z]{3})/);
    if (flightMatch) {
      currentDuty = 'FLIGHTS';
      currentFlights.push({
        from: flightMatch[1],
        dep:  flightMatch[2],
        arr:  flightMatch[3],
        to:   flightMatch[4]
      });
      continue;
    }

    if (/CHECK-OUT/.test(line) && currentDuty === 'AD') {
      const t = line.match(/(\d{2}:\d{2})\s*Z/);
      if (t && !hsbyEnd) hsbyEnd = t[1];
    }
  }

  flush();
  return results;
}

// ── UI ──────────────────────────────────────────────────────

function triggerRosterImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/pdf';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    showImportLoading();
    readPdfAndImport(file);
  };
  input.click();
}

function showImportLoading() {
  const el = document.getElementById('rosterImportMsg');
  if (el) { el.textContent = '⏳ Reading PDF...'; el.style.display = 'block'; }
}

async function readPdfAndImport(file) {
  const msgEl = document.getElementById('rosterImportMsg');
  try {
    const pdfjsLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
if (!pdfjsLib) throw new Error('PDF.js non caricato');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      let lastY = null;
      let rowText = '';
      for (const item of content.items) {
        const y = Math.round(item.transform[5]);
        if (lastY !== null && y !== lastY) {
          fullText += rowText.trim() + '\n';
          rowText = '';
        }
        rowText += item.str + ' ';
        lastY = y;
      }
      if (rowText.trim()) fullText += rowText.trim() + '\n';
    }

    // MOSTRA IL TESTO ESTRATTO
    const pre = document.createElement('pre');
    pre.style.cssText = 'position:fixed;inset:0;z-index:999;background:white;color:black;font-size:11px;padding:16px;overflow:auto;white-space:pre-wrap';
    pre.textContent = fullText;
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close';
    closeBtn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:1000;padding:8px 14px;background:red;color:white;border:none;border-radius:8px;font-size:14px;font-weight:700';
    closeBtn.onclick = () => { pre.remove(); closeBtn.remove(); };
    document.body.appendChild(pre);
    document.body.appendChild(closeBtn);

  } catch(err) {
    if (msgEl) { msgEl.textContent = '❌ ' + err.message; msgEl.style.color='var(--red)'; msgEl.style.display='block'; }
  }
}

    const parsed = parseRosterText(fullText);
    const keys = Object.keys(parsed);

    if (keys.length === 0) {
      if (msgEl) {
        msgEl.textContent = '❌ No duties found. Make sure it\'s a Ryanair Connect roster PDF.';
        msgEl.style.color = 'var(--red)';
        msgEl.style.display = 'block';
      }
      return;
    }

    showImportPreview(parsed);

  } catch(err) {
    console.error('PDF import error:', err);
    if (msgEl) {
      msgEl.textContent = '❌ Could not read PDF. ' + (err.message || '');
      msgEl.style.color = 'var(--red)';
      msgEl.style.display = 'block';
    }
  }
}

function showImportPreview(parsed) {
  const keys = Object.keys(parsed).sort();
  const DOW2 = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTHS2 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  let html = `
    <div style="position:fixed;inset:0;background:var(--bg);z-index:300;overflow-y:auto;
                padding-bottom:max(20px,env(safe-area-inset-bottom))" id="importPreviewScreen">
      <div style="display:flex;align-items:center;justify-content:space-between;
                  padding:14px 16px;padding-top:max(14px,env(safe-area-inset-top));
                  background:var(--surface);border-bottom:1px solid var(--border);
                  position:sticky;top:0;z-index:10">
        <button onclick="document.getElementById('importPreviewScreen').remove();
                         document.getElementById('rosterImportMsg').style.display='none'"
          style="padding:8px 14px;border-radius:10px;border:1.5px solid var(--border);
                 background:var(--bg);font-family:'Outfit',sans-serif;font-size:14px;
                 font-weight:600;color:var(--text);cursor:pointer">✕ Cancel</button>
        <div style="font-size:16px;font-weight:700;color:var(--text)">Import Preview</div>
        <button onclick="confirmRosterImport()"
          style="padding:8px 16px;border-radius:10px;border:none;background:var(--blue);
                 font-family:'Outfit',sans-serif;font-size:14px;font-weight:700;
                 color:white;cursor:pointer">✅ Import</button>
      </div>
      <div style="padding:12px 16px 6px;font-size:12px;color:var(--text3)">
        ${keys.length} days found · Times converted to Italian time (UTC+2)
      </div>`;

  for (const ds of keys) {
    const d = new Date(ds + 'T12:00:00');
    const dow = DOW2[d.getDay()];
    const dateLabel = `${dow} ${d.getDate()} ${MONTHS2[d.getMonth()]}`;
    const entry = parsed[ds];

    let dutyHtml = '';
    let bg = 'var(--surface)';
    let borderColor = 'var(--border)';

    if (entry.duty === 'OFF') {
      dutyHtml = `<span style="color:var(--off);font-weight:700">🌿 Day Off</span>`;
      bg = 'var(--off-lt)'; borderColor = 'var(--off)';
    } else if (entry.duty === 'HSBY') {
      dutyHtml = `<span style="color:var(--yellow);font-weight:700">☎️ HSBY</span>
        <span style="font-size:12px;color:var(--text2);margin-left:8px">${entry.start||''}–${entry.end||''}</span>`;
      bg = 'var(--yellow-lt)'; borderColor = 'var(--yellow)';
    } else if (entry.duty === 'AD') {
      dutyHtml = `<span style="color:var(--red);font-weight:700">🏢 Airport Duty</span>
        <span style="font-size:12px;color:var(--text2);margin-left:8px">${entry.start||''}–${entry.end||''}</span>`;
      bg = 'var(--red-lt)'; borderColor = 'var(--red)';
    } else if (entry.duty === 'CUSTOM') {
      const routes = entry.flights.map(f =>
        `<div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text2)">
          ${f.from}-${f.to} &nbsp; ${f.dep}→${f.arr}
        </div>`).join('');
      dutyHtml = `<span style="color:var(--blue);font-weight:700">✈️ Flights</span>${routes}`;
      bg = 'var(--early-lt)'; borderColor = 'var(--early)';
    }

    html += `
      <div style="margin:0 16px 8px;padding:12px 14px;border-radius:12px;
                  background:${bg};border:1.5px solid ${borderColor}">
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px">${dateLabel}</div>
        ${dutyHtml}
      </div>`;
  }

  html += `
      <div style="padding:16px">
        <button onclick="confirmRosterImport()"
          style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--blue);
                 font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;
                 color:white;cursor:pointer">✅ Import ${keys.length} days</button>
      </div>
    </div>`;

  window._pendingImport = parsed;
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div.firstElementChild);

  const msgEl = document.getElementById('rosterImportMsg');
  if (msgEl) msgEl.style.display = 'none';
}

function confirmRosterImport() {
  const parsed = window._pendingImport;
  if (!parsed) return;

  if (!APP.assignments)   APP.assignments   = {};
  if (!APP.customFlights) APP.customFlights = {};
  if (!APP.assignDetails) APP.assignDetails = {};

  for (const [ds, entry] of Object.entries(parsed)) {
    if (entry.duty === 'OFF') {
      delete APP.assignments[ds];
      delete APP.customFlights[ds];
    } else if (entry.duty === 'HSBY') {
      APP.assignments[ds] = 'HSBY';
      APP.assignDetails[ds] = { start: entry.start, end: entry.end };
    } else if (entry.duty === 'AD') {
      APP.assignments[ds] = 'AD';
      APP.assignDetails[ds] = { start: entry.start, end: entry.end };
    } else if (entry.duty === 'CUSTOM') {
      APP.assignments[ds] = 'CUSTOM';
      APP.customFlights[ds] = entry.flights;
    }
  }

  save();

  const screen = document.getElementById('importPreviewScreen');
  if (screen) screen.remove();

  renderCalendar();
  renderHome();

  const msgEl = document.getElementById('rosterImportMsg');
  if (msgEl) {
    msgEl.textContent = `✅ Imported ${Object.keys(parsed).length} days successfully!`;
    msgEl.style.color = 'var(--green)';
    msgEl.style.display = 'block';
    setTimeout(() => { msgEl.style.display = 'none'; }, 4000);
  }

  window._pendingImport = null;
}
