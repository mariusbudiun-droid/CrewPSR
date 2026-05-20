// ══════════════════════════════════════════════════════════════
// EXPORT TO CALENDAR (.ics file)
// ══════════════════════════════════════════════════════════════
// Generates a standard iCalendar (.ics) file containing every assignment
// (flights, HSBY, AD, leaves) over a configurable date range. The user can
// import the file into iPhone Calendar, Google Calendar, Outlook etc.
//
// Why this exists: we removed in-app notifications because PWAs can't
// schedule reliable background alerts on iOS. By exporting to the native
// calendar, the user gets all the OS-level reminders automatically.
//
// All times are produced in EUROPE/ROME local time (TZID), so the OS
// shows them correctly regardless of the user's current device timezone.

(function () {

  // ── Date helpers ────────────────────────────────────────────
  function _pad(n) { return String(n).padStart(2, '0'); }

  // Format YYYYMMDDTHHMMSS for an ICS DTSTART/DTEND with TZID Europe/Rome.
  // We do NOT convert to UTC — the times stored in APP are already Italian local time.
  function _icsLocal(ds, time) {
    const [y, mo, d] = ds.split('-').map(Number);
    let hh = 0, mm = 0;
    if (time && time.includes(':')) {
      const [h, m] = time.split(':').map(Number);
      hh = h; mm = m;
    }
    return `${y}${_pad(mo)}${_pad(d)}T${_pad(hh)}${_pad(mm)}00`;
  }

  // Add minutes to a YYYY-MM-DD + HH:MM, returning {ds, time} possibly on next day.
  function _addMinutes(ds, time, mins) {
    const [y, mo, d] = ds.split('-').map(Number);
    const [h, m] = time.split(':').map(Number);
    const date = new Date(y, mo - 1, d, h, m + mins);
    return {
      ds:   `${date.getFullYear()}-${_pad(date.getMonth() + 1)}-${_pad(date.getDate())}`,
      time: `${_pad(date.getHours())}:${_pad(date.getMinutes())}`,
    };
  }

  // Escape commas, semicolons, backslashes, and newlines per RFC 5545.
  function _escape(s) {
    return String(s)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  // ── Per-day events ──────────────────────────────────────────
  function _flightsForDay(ds, assign) {
    if (typeof _getFlights === 'function') return _getFlights(ds, assign);
    // Fallback if statistics.js's _getFlights is unavailable for any reason.
    if (assign === 'CUSTOM') return APP.customFlights?.[ds] || [];
    if (typeof SCHEDULE === 'undefined') return [];
    const sched = SCHEDULE.days[new Date(ds + 'T12:00:00').getDay()];
    if (!sched || !assign) return [];
    if (assign.startsWith('A1')) return assign.endsWith('L') ? sched.a1.late  : sched.a1.early;
    if (assign.startsWith('A2')) return assign.endsWith('L') ? sched.a2.late  : sched.a2.early;
    return [];
  }

  function _buildEventsForDay(ds, assign, detail) {
    const events = [];
    const uidBase = `${ds}-${assign || 'NA'}@crewpsr`;

    // Leave types — single all-day event
    const leaveLabels = {
      AL:  '🌴 Annual Leave',
      VTO: '✋ VTO',
      SICK:'🤒 Sick',
      UL:  '📄 Unpaid Leave',
      PL:  '📄 Parental Leave',
    };
    if (leaveLabels[assign]) {
      const [y, mo, d] = ds.split('-').map(Number);
      const next = new Date(y, mo - 1, d + 1);
      const endDs = `${next.getFullYear()}-${_pad(next.getMonth() + 1)}-${_pad(next.getDate())}`;
      events.push({
        uid:     uidBase,
        summary: leaveLabels[assign],
        allDay:  true,
        startDs: ds,
        endDs,
        description: `CrewPSR — ${leaveLabels[assign]}`,
      });
      return events;
    }

    // HSBY / AD with start-end times
    if (assign === 'HSBY' || assign === 'AD') {
      const start = detail?.start;
      const end   = detail?.end;
      if (!start || !end) return events; // skip if no times set
      const startDs = ds, startTime = start;
      // If end < start it's the next day
      let endDs = ds, endTime = end;
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      if (eh * 60 + em <= sh * 60 + sm) {
        const [y, mo, d] = ds.split('-').map(Number);
        const next = new Date(y, mo - 1, d + 1);
        endDs = `${next.getFullYear()}-${_pad(next.getMonth() + 1)}-${_pad(next.getDate())}`;
      }
      events.push({
        uid:       uidBase,
        summary:   assign === 'HSBY' ? '☎️ HSBY' : '🏢 Airport Duty',
        startDs, startTime, endDs, endTime,
        description: `CrewPSR — ${assign === 'HSBY' ? 'Home Standby' : 'Airport Duty'}`,
        alarmsMinutes: [60], // 1h before
      });
      return events;
    }

    // Flight day — one event per flight + a "Report" reminder
    const flights = _flightsForDay(ds, assign);
    if (!flights || flights.length === 0) return events;

    const firstDep = flights[0]?.dep;
    if (firstDep) {
      const report = _addMinutes(ds, firstDep, -45);
      events.push({
        uid:       `${ds}-report@crewpsr`,
        summary:   '🕐 Report — CrewPSR',
        startDs:   report.ds,
        startTime: report.time,
        endDs:     ds,
        endTime:   firstDep,
        description: `Report 45 min before first departure (${firstDep}).\nFlights: ${flights.map(f => f.route || `${f.from}-${f.to}`).join(', ')}`,
        alarmsMinutes: [15], // 15 min before report
      });
    }

    flights.forEach((f, i) => {
      if (!f.dep || !f.arr) return;
      const route = f.route || `${f.from || ''}-${f.to || ''}`;
      // Cross-midnight arrival
      let endDs = ds, endTime = f.arr;
      const [dh, dm] = f.dep.split(':').map(Number);
      const [ah, am] = f.arr.split(':').map(Number);
      if (ah * 60 + am < dh * 60 + dm) {
        const [y, mo, d] = ds.split('-').map(Number);
        const next = new Date(y, mo - 1, d + 1);
        endDs = `${next.getFullYear()}-${_pad(next.getMonth() + 1)}-${_pad(next.getDate())}`;
      }
      // Show flight number in summary if known (only available for screenshot-imported flights).
      const fnum = f.flightNum ? `${f.flightNum} ` : '';
      events.push({
        uid:       `${ds}-flight-${i}@crewpsr`,
        summary:   `✈️ ${fnum}${route}`,
        startDs:   ds,
        startTime: f.dep,
        endDs,
        endTime,
        description: f.flightNum ? `Flight ${f.flightNum} • ${route}` : `CrewPSR — ${route}`,
      });
    });

    return events;
  }

  // ── ICS string builder ──────────────────────────────────────
  function _buildIcs(events) {
    const tzBlock = [
      'BEGIN:VTIMEZONE',
      'TZID:Europe/Rome',
      'BEGIN:STANDARD',
      'DTSTART:19701025T030000',
      'TZOFFSETFROM:+0200',
      'TZOFFSETTO:+0100',
      'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10',
      'TZNAME:CET',
      'END:STANDARD',
      'BEGIN:DAYLIGHT',
      'DTSTART:19700329T020000',
      'TZOFFSETFROM:+0100',
      'TZOFFSETTO:+0200',
      'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3',
      'TZNAME:CEST',
      'END:DAYLIGHT',
      'END:VTIMEZONE',
    ].join('\r\n');

    const stamp = (() => {
      const d = new Date();
      return `${d.getUTCFullYear()}${_pad(d.getUTCMonth() + 1)}${_pad(d.getUTCDate())}T${_pad(d.getUTCHours())}${_pad(d.getUTCMinutes())}${_pad(d.getUTCSeconds())}Z`;
    })();

    const body = events.map(ev => {
      const lines = ['BEGIN:VEVENT', `UID:${ev.uid}`, `DTSTAMP:${stamp}`];
      if (ev.allDay) {
        const dsToD = ds => ds.replace(/-/g, '');
        lines.push(`DTSTART;VALUE=DATE:${dsToD(ev.startDs)}`);
        lines.push(`DTEND;VALUE=DATE:${dsToD(ev.endDs)}`);
      } else {
        lines.push(`DTSTART;TZID=Europe/Rome:${_icsLocal(ev.startDs, ev.startTime)}`);
        lines.push(`DTEND;TZID=Europe/Rome:${_icsLocal(ev.endDs,   ev.endTime)}`);
      }
      lines.push(`SUMMARY:${_escape(ev.summary)}`);
      if (ev.description) lines.push(`DESCRIPTION:${_escape(ev.description)}`);
      if (ev.alarmsMinutes) {
        for (const min of ev.alarmsMinutes) {
          lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `TRIGGER:-PT${min}M`, `DESCRIPTION:${_escape(ev.summary)}`, 'END:VALARM');
        }
      }
      lines.push('END:VEVENT');
      return lines.join('\r\n');
    }).join('\r\n');

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CrewPSR//PSR Cabin Crew//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      tzBlock,
      body,
      'END:VCALENDAR',
    ].join('\r\n');
  }

  // ── UI ──────────────────────────────────────────────────────
  // ── Day shift classification ────────────────────────────────
  // Returns 'early', 'late', or 'other' (HSBY, AD, leaves — they don't filter by E/L).
  function _classifyDay(ds, assign, detail) {
    if (!assign) return 'other';
    if (assign === 'A1E' || assign === 'A2E') return 'early';
    if (assign === 'A1L' || assign === 'A2L') return 'late';

    if (assign === 'CUSTOM') {
      // Prefer the shiftType saved by the import (matches the calendar UI).
      if (detail?.shiftType === 'early') return 'early';
      if (detail?.shiftType === 'late')  return 'late';
      // Fallback: classify from flight times like _customClass does in calendar.js.
      const cfl = APP.customFlights?.[ds] || [];
      const wt = cfl.filter(f => f.dep && f.arr);
      if (!wt.length) return 'other';
      const toM = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
      const noon = 720;
      let before = 0, after = 0;
      for (const f of wt) {
        let s = toM(f.dep), e = toM(f.arr);
        if (e <= s) e += 1440;
        before += Math.max(0, Math.min(e, noon) - s);
        after  += Math.max(0, e - Math.max(s, noon));
      }
      return after > before ? 'late' : 'early';
    }

    // HSBY / AD: classify by which side of noon the duty spans the most.
    // A "Late" HSBY can start at 11:30 and end at 22:30 — start time alone is misleading.
    if (assign === 'HSBY' || assign === 'AD') {
      if (detail?.shiftType === 'early') return 'early';
      if (detail?.shiftType === 'late')  return 'late';
      const start = detail?.start;
      const end   = detail?.end;
      if (start && end && start.includes(':') && end.includes(':')) {
        const toM = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const noon = 720;
        let s = toM(start), e = toM(end);
        if (e <= s) e += 1440; // overnight
        const before = Math.max(0, Math.min(e, noon) - s);
        const after  = Math.max(0, e - Math.max(s, noon));
        return after > before ? 'late' : 'early';
      }
      return 'other';
    }

    return 'other'; // leaves
  }

  // ── State for two-step picker ───────────────────────────────
  let _exportRange = null;

  function _showRangePicker() {
    _exportRange = null;
    document.getElementById('settingModalTitle').textContent = 'Export to Calendar';
    document.getElementById('settingModalBody').innerHTML = `
      <div style="font-size:13px;color:var(--text2);margin-bottom:14px;line-height:1.5">
        Esporta i tuoi turni come file <strong>.ics</strong>.
        Aprilo nell'app Calendario di iPhone (o Google Calendar) per importarli.
        I reminder vengono gestiti dal sistema operativo.
      </div>
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
                  color:var(--text3);margin-bottom:8px">Step 1 — Period</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
        <button onclick="_pickRange(0)"
          style="padding:14px;border-radius:12px;border:1.5px solid var(--blue);
                 background:var(--blue-lt);font-family:'Outfit',sans-serif;
                 font-size:14px;font-weight:700;color:var(--blue);cursor:pointer;text-align:left">
          📅 Mese in corso
          <div style="font-size:11px;font-weight:400;color:var(--text2);margin-top:3px">
            Dal 1° all'ultimo giorno del mese
          </div>
        </button>
        <button onclick="_pickRange(1)"
          style="padding:14px;border-radius:12px;border:1.5px solid var(--blue);
                 background:var(--blue-lt);font-family:'Outfit',sans-serif;
                 font-size:14px;font-weight:700;color:var(--blue);cursor:pointer;text-align:left">
          📅 Prossimi 30 giorni
        </button>
        <button onclick="_pickRange(2)"
          style="padding:14px;border-radius:12px;border:1.5px solid var(--blue);
                 background:var(--blue-lt);font-family:'Outfit',sans-serif;
                 font-size:14px;font-weight:700;color:var(--blue);cursor:pointer;text-align:left">
          📅 Mese in corso + Prossimo
        </button>
        <button onclick="_pickRange(3)"
          style="padding:14px;border-radius:12px;border:1.5px solid var(--border);
                 background:var(--surface);font-family:'Outfit',sans-serif;
                 font-size:14px;font-weight:600;color:var(--text);cursor:pointer;text-align:left">
          🗓️ Tutto (tutti i turni salvati)
        </button>
      </div>
      <button class="btn secondary" onclick="closeModal('settingModal')">Cancel</button>
    `;
    document.getElementById('settingModal').classList.add('open');
  }

  function _pickRange(rangeKind) {
    _exportRange = rangeKind;
    _showShiftTypePicker();
  }

  function _showShiftTypePicker() {
    const rangeLabels = ['Mese in corso', 'Prossimi 30 giorni', 'Mese in corso + Prossimo', 'Tutto'];
    document.getElementById('settingModalBody').innerHTML = `
      <div style="font-size:13px;color:var(--text2);margin-bottom:6px">
        Period: <strong style="color:var(--text)">${rangeLabels[_exportRange]}</strong>
      </div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:14px;line-height:1.5">
        Scegli quali turni esportare. Suggerimento: crea due calendari separati su iPhone
        (es. "CrewPSR Early" giallo, "CrewPSR Late" viola) per avere colori diversi.
      </div>
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
                  color:var(--text3);margin-bottom:8px">Step 2 — Shift type</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
        <button onclick="_doExport('all')"
          style="padding:14px;border-radius:12px;border:1.5px solid var(--blue);
                 background:var(--blue-lt);font-family:'Outfit',sans-serif;
                 font-size:14px;font-weight:700;color:var(--blue);cursor:pointer;text-align:left">
          🗓️ Tutto
          <div style="font-size:11px;font-weight:400;color:var(--text2);margin-top:3px">
            Early + Late + HSBY/AD + Leave (un solo file)
          </div>
        </button>
        <button onclick="_doExport('early')"
          style="padding:14px;border-radius:12px;border:1.5px solid var(--early);
                 background:var(--early-lt);font-family:'Outfit',sans-serif;
                 font-size:14px;font-weight:700;color:var(--early);cursor:pointer;text-align:left">
          ☀️ Solo Early
          <div style="font-size:11px;font-weight:400;color:var(--text2);margin-top:3px">
            Solo i turni Early (A1E, A2E, CUSTOM early)
          </div>
        </button>
        <button onclick="_doExport('late')"
          style="padding:14px;border-radius:12px;border:1.5px solid var(--late);
                 background:var(--late-lt);font-family:'Outfit',sans-serif;
                 font-size:14px;font-weight:700;color:var(--late);cursor:pointer;text-align:left">
          🌙 Solo Late
          <div style="font-size:11px;font-weight:400;color:var(--text2);margin-top:3px">
            Solo i turni Late (A1L, A2L, CUSTOM late)
          </div>
        </button>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn secondary" style="flex:1" onclick="_showRangePickerFromInside()">← Back</button>
        <button class="btn secondary" style="flex:1" onclick="closeModal('settingModal')">Cancel</button>
      </div>
    `;
  }

  // Re-show range picker without resetting modal title.
  function _showRangePickerFromInside() {
    _showRangePicker();
  }

  // shiftFilter: 'all' | 'early' | 'late'
  function _doExport(shiftFilter) {
    const rangeKind = _exportRange;
    const today = new Date();
    let startDs, endDs;
    const fmt = d => `${d.getFullYear()}-${_pad(d.getMonth() + 1)}-${_pad(d.getDate())}`;

    if (rangeKind === 0) {
      startDs = fmt(new Date(today.getFullYear(), today.getMonth(), 1));
      endDs   = fmt(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    } else if (rangeKind === 1) {
      startDs = fmt(today);
      endDs   = fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30));
    } else if (rangeKind === 2) {
      startDs = fmt(new Date(today.getFullYear(), today.getMonth(), 1));
      endDs   = fmt(new Date(today.getFullYear(), today.getMonth() + 2, 0));
    } else {
      startDs = '0000-01-01';
      endDs   = '9999-12-31';
    }

    const allEvents = [];
    for (const [ds, assign] of Object.entries(APP.assignments || {})) {
      if (ds < startDs || ds > endDs) continue;
      const detail = APP.assignDetails?.[ds];

      if (shiftFilter !== 'all') {
        const cls = _classifyDay(ds, assign, detail);
        // Only include days matching the chosen shift type.
        // 'other' (leaves) are excluded from Early/Late filters — they're neither.
        if (cls !== shiftFilter) continue;
      }

      const evs = _buildEventsForDay(ds, assign, detail);
      allEvents.push(...evs);
    }

    if (!allEvents.length) {
      const filterLabel = shiftFilter === 'all' ? '' : ` ${shiftFilter}`;
      alert(`Nessun turno${filterLabel} nel range selezionato.`);
      return;
    }

    const ics = _buildIcs(allEvents);
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);

    const dateTag = `${today.getFullYear()}${_pad(today.getMonth() + 1)}${_pad(today.getDate())}`;
    const suffix  = shiftFilter === 'all' ? '' : `-${shiftFilter}`;
    const filename = `CrewPSR-${dateTag}${suffix}.ics`;

    // iOS Safari: use share sheet if available; otherwise fallback to <a download>.
    const file = new File([blob], filename, { type: 'text/calendar' });

    closeModal('settingModal');

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({
        files: [file],
        title: 'CrewPSR — Calendar',
        text: `${allEvents.length} eventi`,
      }).catch(() => {
        _fallbackDownload(url, filename);
      }).finally(() => {
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      });
    } else {
      _fallbackDownload(url, filename);
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  }

  function _fallbackDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1000);
  }

  // ── Public entry point ──────────────────────────────────────
  function exportToCalendar() {
    if (typeof closeMore === 'function') closeMore();
    if (!APP.assignments || Object.keys(APP.assignments).length === 0) {
      alert('Nessun turno da esportare. Aggiungi almeno un duty nel calendario.');
      return;
    }
    _showRangePicker();
  }

  window.exportToCalendar           = exportToCalendar;
  window._pickRange                 = _pickRange;
  window._doExport                  = _doExport;
  window._showRangePickerFromInside = _showRangePickerFromInside;
})();
