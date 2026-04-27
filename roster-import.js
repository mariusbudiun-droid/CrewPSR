// ══════════════════════════════════════════════════════════════
// ROSTER IMPORT — Ryanair Connect PDF + Screenshot (AI vision)
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


// ══════════════════════════════════════════════════════════════
// IMPORT ENTRY POINT
// ══════════════════════════════════════════════════════════════
function triggerRosterImport() {
  // Show choice modal: Screenshot (AI) or text paste
  document.getElementById('settingModalTitle').textContent = 'Import Roster';
  document.getElementById('settingModalBody').innerHTML = `
    <div style="font-size:13px;color:var(--text2);margin-bottom:16px">
      Choose how to import your roster from Ryanair Connect.
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">

      <button onclick="triggerScreenshotImport()"
        style="padding:16px;border-radius:12px;border:1.5px solid var(--blue);
               background:var(--blue-lt);font-family:'Outfit',sans-serif;
               font-size:14px;font-weight:700;color:var(--blue);cursor:pointer;text-align:left">
        📷 Screenshot — AI reads it for you
        <div style="font-size:11px;font-weight:400;color:var(--text2);margin-top:4px">
          Take a screenshot of your roster in Ryanair Connect, then upload it here.
          Claude Vision reads the flights automatically.
        </div>
      </button>

      <button onclick="triggerTextImport()"
        style="padding:16px;border-radius:12px;border:1.5px solid var(--border);
               background:var(--surface);font-family:'Outfit',sans-serif;
               font-size:14px;font-weight:600;color:var(--text);cursor:pointer;text-align:left">
        📋 Paste text — copy from Ryanair Connect
        <div style="font-size:11px;font-weight:400;color:var(--text2);margin-top:4px">
          Select all text on the roster page, copy, and paste it here.
        </div>
      </button>

    </div>
    <button class="btn secondary" onclick="closeModal('settingModal')">Cancel</button>
  `;
  document.getElementById('settingModal').classList.add('open');
}

// ── Screenshot path (Vision API) ──────────────────────────────
function _showImportOverlay(msg) {
  let ov = document.getElementById('importOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'importOverlay';
    ov.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);
      z-index:9999;display:flex;flex-direction:column;align-items:center;
      justify-content:center;gap:16px`;
    document.body.appendChild(ov);
  }
  ov.innerHTML = `
    <div style="width:48px;height:48px;border:4px solid rgba(255,255,255,0.3);
                border-top-color:white;border-radius:50%;
                animation:spin 0.8s linear infinite"></div>
    <div style="color:white;font-family:'Outfit',sans-serif;font-size:15px;
                font-weight:600;text-align:center;padding:0 32px">${msg}</div>`;
  if (!document.getElementById('importSpinStyle')) {
    const s = document.createElement('style');
    s.id = 'importSpinStyle';
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }
  ov.style.display = 'flex';
}

function _hideImportOverlay() {
  const ov = document.getElementById('importOverlay');
  if (ov) ov.remove();
}

function _showImportError(msg) {
  let ov = document.getElementById('importOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'importOverlay';
    ov.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.75);
      z-index:9999;display:flex;flex-direction:column;align-items:center;
      justify-content:center;gap:16px;padding:32px`;
    document.body.appendChild(ov);
  }
  ov.innerHTML = `
    <div style="font-size:36px">❌</div>
    <div style="color:white;font-family:'Outfit',sans-serif;font-size:15px;
                font-weight:600;text-align:center;line-height:1.5">${msg}</div>
    <button onclick="document.getElementById('importOverlay').remove()"
      style="padding:12px 28px;border-radius:10px;border:none;background:white;
             font-family:'Outfit',sans-serif;font-size:14px;font-weight:700;
             color:#111;cursor:pointer;margin-top:8px">OK</button>`;
  ov.style.display = 'flex';
}

function triggerScreenshotImport() {
  closeModal('settingModal');

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.cssText = 'position:fixed;top:-100px;left:-100px;opacity:0;width:1px;height:1px';
  document.body.appendChild(input);

  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    document.body.removeChild(input);
    if (!file) return;

    _showImportOverlay('Sending to AI…\nThis takes ~15 seconds');

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const mediaType = file.type || 'image/jpeg';

      const response = await fetch('/api/import-roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });

      const result = await response.json();
      _hideImportOverlay();

      if (!response.ok || !result.success) {
        const detail = result.detail ? `\n${result.detail.substring(0,200)}` : '';
        throw new Error((result.error || `Server error ${response.status}`) + detail);
      }

      if (!result.days || result.days.length === 0) {
        _showImportError('No roster data found. Try a clearer screenshot.');
        return;
      }

      const parsed = convertVisionDays(result.days);
      if (Object.keys(parsed).length === 0) {
        _showImportError('Could not parse any days from the screenshot.');
        return;
      }
      showImportPreview(parsed);

    } catch (err) {
      _hideImportOverlay();
      console.error('Vision import error:', err);
      _showImportError('Error: ' + (err.message || 'Unknown error'));
    }
  };

  // Small delay needed on iOS before triggering
  setTimeout(() => input.click(), 80);
}

function _addHoursToTime(t, h) {
  if (!t || !t.includes(':')) return t;
  const [hh, mm] = t.split(':').map(Number);
  const total = (hh * 60 + mm + h * 60 + 1440) % 1440;
  return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
}

function _italyOffset(ds) {
  // CEST (UTC+2): last Sun Mar → last Sun Oct
  const d = new Date(ds + 'T12:00:00Z');
  const y = d.getUTCFullYear();
  const lastSunMar = new Date(Date.UTC(y,2,31));
  lastSunMar.setUTCDate(31 - lastSunMar.getUTCDay());
  const lastSunOct = new Date(Date.UTC(y,9,31));
  lastSunOct.setUTCDate(31 - lastSunOct.getUTCDay());
  return (d >= lastSunMar && d < lastSunOct) ? 2 : 1;
}

function _shiftType(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const toM = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
  const s    = toM(startTime);
  const e    = toM(endTime);
  const noon = 12 * 60; // 720

  // Handle overnight (end < start)
  const duration = e >= s ? e - s : e + 1440 - s;
  if (duration === 0) return null;

  // Minutes of duty that fall before noon
  let beforeNoon = 0;
  if (s < noon) {
    // duty starts before noon
    const effectiveEnd = e >= s ? Math.min(e, noon) : noon; // if overnight, count up to noon
    beforeNoon = effectiveEnd - s;
  }
  // everything else is after noon
  const afterNoon = duration - beforeNoon;

  return beforeNoon > afterNoon ? 'early' : 'late';
}

function convertVisionDays(days) {
  const result = {};
  for (const d of days) {
    if (!d.date) continue;
    const ds = d.date;
    const offset = _italyOffset(ds);

    if (d.type === 'off' || d.assignment === 'OFF') {
      result[ds] = { duty: 'OFF' };

    } else if (d.type === 'hsby' || d.assignment === 'HSBY') {
      const start = d.hsbyStart ? _addHoursToTime(d.hsbyStart, offset) : '';
      const end   = d.hsbyEnd   ? _addHoursToTime(d.hsbyEnd,   offset) : '';
      result[ds] = {
        duty: 'HSBY',
        start,
        end,
        shiftType: _shiftType(start, end),
      };

    } else if (d.type === 'ad' || d.assignment === 'AD') {
      const start = d.hsbyStart ? _addHoursToTime(d.hsbyStart, offset) : '';
      const end   = d.hsbyEnd   ? _addHoursToTime(d.hsbyEnd,   offset) : '';
      result[ds] = {
        duty: 'AD',
        start,
        end,
        shiftType: _shiftType(start, end),
      };

    } else if (d.type === 'al' || d.assignment === 'AL') {
      result[ds] = { duty: 'AL' };

    } else if (d.flights && d.flights.length > 0) {
      const assign = ['A1E','A1L','A2E','A2L'].includes(d.assignment) ? d.assignment : 'CUSTOM';
      const flights = d.flights.map(f => ({
        from:      f.from || 'PSR',
        to:        f.to   || '',
        dep:       f.dep  ? _addHoursToTime(f.dep, offset) : '',
        arr:       f.arr  ? _addHoursToTime(f.arr, offset) : '',
        flightNum: f.flightNum || '',
      }));

      // Calculate early/late from majority of actual flight minutes
      const toM = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
      const noon = 720;
      let before = 0, after = 0;
      for (const f of flights) {
        if (!f.dep || !f.arr) continue;
        let s = toM(f.dep), e = toM(f.arr);
        if (e <= s) e += 1440;
        before += Math.max(0, Math.min(e, noon) - s);
        after  += Math.max(0, e - Math.max(s, noon));
      }
      const shiftType = after > before ? 'late' : 'early';

      result[ds] = {
        duty:       'CUSTOM',
        assignment: assign,
        shiftType,
        flights,
      };
    }
  }
  return result;
}

// ── Text paste path (existing) ────────────────────────────────
function triggerTextImport() {
  closeModal('settingModal');
  // Show text paste UI inline in calendar screen
  const existing = document.getElementById('rosterTextPasteBox');
  if (existing) { existing.style.display = 'block'; return; }

  const box = document.createElement('div');
  box.id = 'rosterTextPasteBox';
  box.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:300;overflow-y:auto;padding-bottom:max(20px,env(safe-area-inset-bottom))';
  box.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
                padding:14px 16px;padding-top:max(14px,env(safe-area-inset-top));
                background:var(--surface);border-bottom:1px solid var(--border);
                position:sticky;top:0;z-index:10">
      <button onclick="document.getElementById('rosterTextPasteBox').remove()"
        style="padding:8px 14px;border-radius:10px;border:1.5px solid var(--border);
               background:var(--bg);font-family:'Outfit',sans-serif;font-size:14px;
               font-weight:600;color:var(--text);cursor:pointer">✕ Cancel</button>
      <div style="font-size:16px;font-weight:700;color:var(--text)">Paste Roster Text</div>
      <div style="width:70px"></div>
    </div>
    <div style="padding:16px">
      <div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.6">
        On Ryanair Connect, open your roster, select all text (tap & hold → Select All), copy, then paste below.
      </div>
      <textarea id="rosterPasteArea" placeholder="Paste roster text here..."
        style="height:200px;font-family:'JetBrains Mono',monospace;font-size:12px;
               margin-bottom:12px"></textarea>
      <button onclick="_processPastedRoster()"
        style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--blue);
               font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;
               color:white;cursor:pointer">Parse roster →</button>
    </div>`;
  document.body.appendChild(box);
}

function _processPastedRoster() {
  const text = document.getElementById('rosterPasteArea')?.value || '';
  if (!text.trim()) { showImportError('Please paste some text first.'); return; }
  document.getElementById('rosterTextPasteBox')?.remove();
  showImportLoading('Parsing...');
  const parsed = parseRosterText(text);
  if (Object.keys(parsed).length > 0) {
    showImportPreview(parsed);
  } else {
    showImportError('No roster data found. Try a clearer screenshot or copy more text.');
  }
}

// ── Shared UI ─────────────────────────────────────────────────
async function readPdfText(file) {
  const pdfjsLib = window['pdfjs-dist/build/pdf'];
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    let lastY = null, rowText = '';
    for (const item of content.items) {
      const y = Math.round(item.transform[5]);
      if (lastY !== null && y !== lastY) { fullText += rowText.trim() + '\n'; rowText = ''; }
      rowText += item.str + ' ';
      lastY = y;
    }
    if (rowText.trim()) fullText += rowText.trim() + '\n';
  }
  return fullText;
}

function showImportLoading(msg = 'Processing...') {
  const el = document.getElementById('rosterImportMsg');
  if (el) {
    el.textContent = `⏳ ${msg}`;
    el.style.color = 'var(--text2)';
    el.style.display = 'block';
  }
}

function showImportError(msg) {
  const el = document.getElementById('rosterImportMsg');
  if (el) {
    el.textContent = `❌ ${msg}`;
    el.style.color = 'var(--red)';
    el.style.display = 'block';
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
        <button onclick="closeImportPreview()"
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
        ${keys.length} days found · Times converted to Italian time
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
      bg = 'var(--off-lt)';
      borderColor = 'var(--off)';
    } else if (entry.duty === 'HSBY') {
      dutyHtml = `<span style="color:var(--yellow);font-weight:700">☎️ HSBY</span>
        <span style="font-size:12px;color:var(--text2);margin-left:8px">${entry.start || ''}–${entry.end || ''}</span>`;
      bg = 'var(--yellow-lt)';
      borderColor = 'var(--yellow)';
    } else if (entry.duty === 'AD') {
      dutyHtml = `<span style="color:var(--red);font-weight:700">🏢 Airport Duty</span>
        <span style="font-size:12px;color:var(--text2);margin-left:8px">${entry.start || ''}–${entry.end || ''}</span>`;
      bg = 'var(--red-lt)';
      borderColor = 'var(--red)';
    } else if (entry.duty === 'CUSTOM') {
      const routes = entry.flights.map(f => `
        <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text2)">
          ${f.from}-${f.to} &nbsp; ${f.dep}→${f.arr}
        </div>
      `).join('');
      dutyHtml = `<span style="color:var(--blue);font-weight:700">✈️ Flights</span>${routes}`;
      bg = 'var(--early-lt)';
      borderColor = 'var(--early)';
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

function closeImportPreview() {
  const screen = document.getElementById('importPreviewScreen');
  if (screen) screen.remove();

  const msgEl = document.getElementById('rosterImportMsg');
  if (msgEl) msgEl.style.display = 'none';

  window._pendingImport = null;
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
      delete APP.assignDetails[ds];

    } else if (entry.duty === 'HSBY') {
      APP.assignments[ds] = 'HSBY';
      APP.assignDetails[ds] = {
        start:     entry.start     || '',
        end:       entry.end       || '',
        shiftType: entry.shiftType || null,
      };
      delete APP.customFlights[ds];

    } else if (entry.duty === 'AD') {
      APP.assignments[ds] = 'AD';
      APP.assignDetails[ds] = {
        start:     entry.start     || '',
        end:       entry.end       || '',
        shiftType: entry.shiftType || null,
      };
      delete APP.customFlights[ds];

    } else if (['A1E','A1L','A2E','A2L'].includes(entry.duty)) {
      // Standard rotation identified by Vision API
      APP.assignments[ds] = entry.duty;
      delete APP.assignDetails[ds];
      // Store flights as custom so times are correct
      if (entry.flights && entry.flights.length) {
        APP.customFlights[ds] = entry.flights;
        APP.assignments[ds] = 'CUSTOM'; // store as custom with correct times
      } else {
        delete APP.customFlights[ds];
      }

    } else if (entry.duty === 'CUSTOM') {
      APP.assignments[ds] = 'CUSTOM';
      APP.customFlights[ds] = entry.flights;
      if (entry.shiftType) {
        if (!APP.assignDetails[ds]) APP.assignDetails[ds] = {};
        APP.assignDetails[ds].shiftType = entry.shiftType;
      } else {
        delete APP.assignDetails[ds];
      }

    } else if (entry.duty === 'AL') {
      APP.assignments[ds] = 'AL';
      delete APP.customFlights[ds];
      delete APP.assignDetails[ds];
    }
  }

  save();
  closeImportPreview();
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
