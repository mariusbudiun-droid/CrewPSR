// ══════════════════════════════════════════════════════════════
// SHARE WEEKLY SCHEDULE (PDF)
// ══════════════════════════════════════════════════════════════
// Builds a one-file PDF of the whole week straight from SCHEDULE data:
// every day, both aircraft, report times and all flights.
//
// jsPDF is loaded lazily from CDN the first time the user taps Share, so it
// costs nothing at startup and doesn't bloat the offline cache. If the CDN is
// unreachable (offline), we fall back to sharing a plain-text version, which
// always works.

(function () {

  const JSPDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

  // Monday-first order. SCHEDULE.days is keyed 0=Sun … 6=Sat.
  const WEEK = [
    { key: 1, name: 'Monday'    },
    { key: 2, name: 'Tuesday'   },
    { key: 3, name: 'Wednesday' },
    { key: 4, name: 'Thursday'  },
    { key: 5, name: 'Friday'    },
    { key: 6, name: 'Saturday'  },
    { key: 0, name: 'Sunday'    },
  ];

  // ── Lazy CDN loader ──────────────────────────────────────────
  let _jspdfPromise = null;
  function loadJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (_jspdfPromise) return _jspdfPromise;

    _jspdfPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = JSPDF_CDN;
      s.onload = () => {
        if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
        else reject(new Error('jsPDF loaded but not available'));
      };
      s.onerror = () => reject(new Error('Could not load PDF library'));
      document.head.appendChild(s);
      // Don't hang forever on a flaky connection
      setTimeout(() => reject(new Error('PDF library timed out')), 15000);
    });
    return _jspdfPromise;
  }

  // ── PDF builder ──────────────────────────────────────────────
  function buildPdf(jsPDF) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const PAGE_W = 210, PAGE_H = 297;
    const M = 12;                 // margin
    const COL_W = (PAGE_W - M * 2 - 6) / 2;   // two columns + 6mm gutter
    const COL_X = [M, M + COL_W + 6];
    const BOTTOM = PAGE_H - 14;

    let y = M;

    function newPage() {
      doc.addPage();
      y = M;
    }

    // ── Header ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(30, 30, 40);
    doc.text('CrewPSR — Weekly Flight Schedule', M, y + 5);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(110, 110, 125);
    const sub = `Pescara (PSR)  ·  ${SCHEDULE.version}  ·  ${SCHEDULE.period}`;
    doc.text(sub, M, y);
    y += 5;
    doc.text('Report = 45 min before first departure  ·  Times shown as published', M, y);
    y += 6;

    doc.setDrawColor(220, 220, 230);
    doc.line(M, y, PAGE_W - M, y);
    y += 6;

    // ── Helper: draw one aircraft column, returns the height used ──
    function drawAircraft(x, yTop, label, plane) {
      let cy = yTop;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(45, 90, 200);
      doc.text(label, x, cy);
      cy += 4.4;

      function block(title, reportTime, flights) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.6);
        doc.setTextColor(80, 80, 95);
        doc.text(`${title} — Report ${reportTime || '—'}`, x, cy);
        cy += 3.9;

        doc.setFont('courier', 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(35, 35, 45);
        (flights || []).forEach(f => {
          const route = (f.route || '').padEnd(9, ' ');
          doc.text(`${route} ${f.dep || '--:--'} - ${f.arr || '--:--'}`, x + 1.5, cy);
          cy += 3.7;
        });
        if (!flights || flights.length === 0) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(150, 150, 160);
          doc.text('no flights', x + 1.5, cy);
          cy += 3.7;
        }
        cy += 1.6;
      }

      block('Morning', plane && plane.reportEarly, plane && plane.early);
      block('Evening', plane && plane.reportLate,  plane && plane.late);

      return cy - yTop;
    }

    // ── One block per day ──
    WEEK.forEach(day => {
      const sched = SCHEDULE.days[day.key] || {};
      const a1 = sched.a1, a2 = sched.a2;

      // Rough height needed for this day: header + tallest of the two columns
      const rows = Math.max(
        (a1 ? (a1.early || []).length + (a1.late || []).length : 0),
        (a2 ? (a2.early || []).length + (a2.late || []).length : 0)
      );
      const needed = 8 + 4.4 + (2 * 5.5) + rows * 3.7 + 6;
      if (y + needed > BOTTOM) newPage();

      // Day header bar
      doc.setFillColor(45, 90, 200);
      doc.rect(M, y, PAGE_W - M * 2, 6.4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text(day.name, M + 2.5, y + 4.5);
      y += 9.5;

      const h1 = drawAircraft(COL_X[0], y, 'Aereo 1', a1);
      const h2 = drawAircraft(COL_X[1], y, 'Aereo 2', a2);
      y += Math.max(h1, h2) + 3.5;
    });

    // ── Footer on every page ──
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(155, 155, 168);
      doc.text(
        `CrewPSR · generated ${new Date().toLocaleDateString('en-GB')}`,
        M, PAGE_H - 8
      );
      doc.text(`${p} / ${pages}`, PAGE_W - M, PAGE_H - 8, { align: 'right' });
    }

    return doc;
  }

  // ── Plain-text fallback (works offline) ──────────────────────
  function buildText() {
    const lines = [];
    lines.push('CrewPSR — Weekly Flight Schedule');
    lines.push(`Pescara (PSR) · ${SCHEDULE.version} · ${SCHEDULE.period}`);
    lines.push('Report = 45 min before first departure');
    lines.push('');

    WEEK.forEach(day => {
      const sched = SCHEDULE.days[day.key] || {};
      lines.push(`── ${day.name.toUpperCase()} ──`);
      [['Aereo 1', sched.a1], ['Aereo 2', sched.a2]].forEach(([label, plane]) => {
        if (!plane) return;
        lines.push(`${label}`);
        lines.push(`  Morning — Report ${plane.reportEarly || '—'}`);
        (plane.early || []).forEach(f => lines.push(`    ${f.route}  ${f.dep}-${f.arr}`));
        lines.push(`  Evening — Report ${plane.reportLate || '—'}`);
        (plane.late || []).forEach(f => lines.push(`    ${f.route}  ${f.dep}-${f.arr}`));
      });
      lines.push('');
    });

    return lines.join('\n');
  }

  // ── Share / download ─────────────────────────────────────────
  function shareBlob(blob, filename) {
    const file = new File([blob], filename, { type: blob.type });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({
        files: [file],
        title: 'CrewPSR — Weekly Schedule',
      }).catch(() => downloadBlob(blob, filename));
    }
    return Promise.resolve(downloadBlob(blob, filename));
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 30000);
  }

  function shareText(text) {
    if (navigator.share) {
      return navigator.share({ title: 'CrewPSR — Weekly Schedule', text })
        .catch(() => {});
    }
    // Last resort: clipboard
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(text)
        .then(() => alert('Schedule copied to clipboard.'))
        .catch(() => {});
    }
    return Promise.resolve();
  }

  // ── Public entry point ───────────────────────────────────────
  async function shareSchedulePdf() {
    const btn = document.getElementById('schedShareBtn');
    const setBusy = on => {
      if (!btn) return;
      btn.disabled = on;
      btn.textContent = on ? '⏳ …' : '📤 PDF';
    };

    setBusy(true);
    try {
      const jsPDF = await loadJsPdf();
      const doc = buildPdf(jsPDF);
      const blob = doc.output('blob');
      const tag = String(SCHEDULE.version || 'schedule').replace(/[^\w.-]/g, '');
      await shareBlob(blob, `CrewPSR-Schedule-${tag}.pdf`);
    } catch (err) {
      console.warn('PDF share failed, falling back to text:', err);
      // Offline or CDN blocked — share the text version instead.
      await shareText(buildText());
    } finally {
      setBusy(false);
    }
  }

  window.shareSchedulePdf = shareSchedulePdf;
})();
