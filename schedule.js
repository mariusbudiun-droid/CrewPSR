// ══════════════════════════════════════════════════════════════
// FLIGHT SCHEDULE DATA — V1 01 Apr – 04 May 2026
// ══════════════════════════════════════════════════════════════
const SCHEDULE = {
  version: "V1",
  period:  "01 Apr – 04 May 2026",
  days: {
    1: { // Monday
      a1: {
        reportEarly: "05:15",
        early: [
          { route:"PSR-CRL", dep:"06:00", arr:"08:05" },
          { route:"CRL-PSR", dep:"08:40", arr:"10:40" },
        ],
        reportLate: "14:20",
        late: [
          { route:"PSR-CRL", dep:"15:05", arr:"17:10" },
          { route:"CRL-PSR", dep:"17:35", arr:"19:35" },
          { route:"PSR-CTA", dep:"20:00", arr:"21:20" },
          { route:"CTA-PSR", dep:"21:45", arr:"23:10" },
        ]
      },
      a2: {
        reportEarly: "06:10",
        early: [
          { route:"PSR-CAG", dep:"06:55", arr:"08:10" },
          { route:"CAG-PSR", dep:"08:35", arr:"09:50" },
          { route:"PSR-OTP", dep:"10:20", arr:"12:10" },
          { route:"OTP-PSR", dep:"12:35", arr:"14:25" },
        ],
        reportLate: "14:30",
        late: [
          { route:"PSR-STN", dep:"15:15", arr:"17:50" },
          { route:"STN-PSR", dep:"18:15", arr:"20:40" },
          { route:"PSR-TRN", dep:"21:05", arr:"22:25" },
          { route:"TRN-PSR", dep:"22:50", arr:"00:05" },
        ]
      }
    },
    2: { // Tuesday
      a1: {
        reportEarly: "05:35",
        early: [
          { route:"PSR-NRN", dep:"06:20", arr:"08:25" },
          { route:"NRN-PSR", dep:"08:50", arr:"10:50" },
          { route:"PSR-TIA", dep:"11:20", arr:"12:35" },
          { route:"TIA-PSR", dep:"13:00", arr:"14:20" },
        ],
        reportLate: "14:25",
        late: [
          { route:"PSR-KRK", dep:"15:10", arr:"17:00" },
          { route:"KRK-PSR", dep:"17:25", arr:"19:10" },
          { route:"PSR-KUN", dep:"19:35", arr:"22:05" },
          { route:"KUN-PSR", dep:"22:30", arr:"00:55" },
        ]
      },
      a2: {
        reportEarly: "05:45",
        early: [
          { route:"PSR-MXP", dep:"06:30", arr:"07:55" },
          { route:"MXP-PSR", dep:"08:25", arr:"09:45" },
          { route:"PSR-CRL", dep:"10:20", arr:"12:25" },
          { route:"CRL-PSR", dep:"12:50", arr:"14:50" },
        ],
        reportLate: "14:55",
        late: [
          { route:"PSR-STN", dep:"15:40", arr:"18:15" },
          { route:"STN-PSR", dep:"18:40", arr:"21:05" },
          { route:"PSR-MLA", dep:"21:30", arr:"23:00" },
          { route:"MLA-PSR", dep:"23:25", arr:"00:55" },
        ]
      }
    },
    3: { // Wednesday
      a1: {
        reportEarly: "05:20",
        early: [
          { route:"PSR-CRL", dep:"06:05", arr:"08:10" },
          { route:"CRL-PSR", dep:"08:50", arr:"10:50" },
          { route:"PSR-PRG", dep:"11:15", arr:"12:55" },
          { route:"PRG-PSR", dep:"13:20", arr:"15:00" },
        ],
        reportLate: "15:10",
        late: [
          { route:"PSR-STN", dep:"15:55", arr:"18:30" },
          { route:"STN-PSR", dep:"18:55", arr:"21:20" },
          { route:"PSR-TPS", dep:"22:05", arr:"23:20" },
          { route:"TPS-PSR", dep:"23:45", arr:"00:55" },
        ]
      },
      a2: {
        reportEarly: "07:45",
        early: [
          { route:"PSR-VLC", dep:"08:30", arr:"10:45" },
          { route:"VLC-PSR", dep:"11:15", arr:"13:20" },
          { route:"PSR-TIA", dep:"13:45", arr:"15:00" },
          { route:"TIA-PSR", dep:"15:25", arr:"16:45" },
        ],
        reportLate: "16:50",
        late: [
          { route:"PSR-CTA", dep:"17:35", arr:"18:55" },
          { route:"CTA-PSR", dep:"19:20", arr:"20:45" },
          { route:"PSR-OTP", dep:"21:10", arr:"22:59" },
          { route:"OTP-PSR", dep:"23:25", arr:"01:15" },
        ]
      }
    },
    4: { // Thursday
      a1: {
        reportEarly: "06:15",
        early: [
          { route:"PSR-CRL", dep:"07:00", arr:"09:05" },
          { route:"CRL-PSR", dep:"09:40", arr:"11:40" },
          { route:"PSR-TPS", dep:"12:25", arr:"13:40" },
          { route:"TPS-PSR", dep:"14:05", arr:"15:15" },
        ],
        reportLate: "15:20",
        late: [
          { route:"PSR-KRK", dep:"16:05", arr:"17:55" },
          { route:"KRK-PSR", dep:"18:20", arr:"20:05" },
          { route:"PSR-BGY", dep:"20:45", arr:"22:00" },
          { route:"BGY-PSR", dep:"22:25", arr:"23:35" },
        ]
      },
      a2: {
        reportEarly: "06:40",
        early: [
          { route:"PSR-BGY", dep:"07:25", arr:"08:40" },
          { route:"BGY-PSR", dep:"09:05", arr:"10:15" },
          { route:"PSR-OTP", dep:"10:40", arr:"12:30", note:"Da confermare" },
          { route:"OTP-PSR", dep:"12:55", arr:"14:45", note:"Da confermare" },
        ],
        reportLate: "15:25",
        late: [
          { route:"PSR-STN", dep:"16:10", arr:"18:45" },
          { route:"STN-PSR", dep:"19:10", arr:"21:35" },
          { route:"PSR-CTA", dep:"22:00", arr:"23:20" },
          { route:"CTA-PSR", dep:"23:45", arr:"01:10" },
        ]
      }
    },
    5: { // Friday
      a1: {
        reportEarly: "05:45",
        early: [
          { route:"PSR-WRO", dep:"06:30", arr:"08:25" },
          { route:"WRO-PSR", dep:"08:50", arr:"10:40" },
          { route:"PSR-STN", dep:"11:05", arr:"13:40" },
          { route:"STN-PSR", dep:"14:05", arr:"16:30" },
        ],
        reportLate: "16:55",
        late: [
          { route:"PSR-TRN", dep:"17:40", arr:"19:00" },
          { route:"TRN-PSR", dep:"19:25", arr:"20:40" },
          { route:"PSR-KRK", dep:"21:05", arr:"22:55" },
          { route:"KRK-PSR", dep:"23:20", arr:"01:05" },
        ]
      },
      a2: {
        reportEarly: "06:30",
        early: [
          { route:"PSR-TPS", dep:"07:15", arr:"08:30" },
          { route:"TPS-PSR", dep:"08:55", arr:"10:05" },
          { route:"PSR-PRG", dep:"10:30", arr:"12:10" },
          { route:"PRG-PSR", dep:"12:35", arr:"14:15" },
        ],
        reportLate: "15:10",
        late: [
          { route:"PSR-CRL", dep:"15:55", arr:"18:00" },
          { route:"CRL-PSR", dep:"18:25", arr:"20:25" },
          { route:"PSR-CAG", dep:"20:50", arr:"22:05" },
          { route:"CAG-PSR", dep:"22:30", arr:"23:45" },
        ]
      }
    },
    6: { // Saturday
      a1: {
        reportEarly: "05:00",
        early: [
          { route:"PSR-CTA", dep:"05:45", arr:"07:05" },
          { route:"CTA-PSR", dep:"07:30", arr:"08:55" },
          { route:"PSR-KUN", dep:"09:30", arr:"12:00" },
          { route:"KUN-PSR", dep:"12:25", arr:"14:50" },
        ],
        reportLate: "14:55",
        late: [
          { route:"PSR-TRN", dep:"15:50", arr:"17:10" },
          { route:"TRN-PSR", dep:"17:35", arr:"18:50" },
          { route:"PSR-STN", dep:"19:15", arr:"21:50" },
          { route:"STN-PSR", dep:"22:15", arr:"00:40" },
        ]
      },
      a2: {
        reportEarly: "05:50",
        early: [
          { route:"PSR-CAG", dep:"06:35", arr:"07:50" },
          { route:"CAG-PSR", dep:"08:25", arr:"09:40" },
          { route:"PSR-VLC", dep:"10:10", arr:"12:25" },
          { route:"VLC-PSR", dep:"12:55", arr:"15:00" },
        ],
        reportLate: "15:05",
        late: [
          { route:"PSR-OTP", dep:"15:40", arr:"17:30" },
          { route:"OTP-PSR", dep:"17:55", arr:"19:45" },
          { route:"PSR-MLA", dep:"20:10", arr:"21:40" },
          { route:"MLA-PSR", dep:"22:05", arr:"23:35" },
        ]
      }
    },
    0: { // Sunday
      a1: {
        reportEarly: "05:00",
        early: [
          { route:"PSR-OTP", dep:"05:45", arr:"07:35" },
          { route:"OTP-PSR", dep:"08:00", arr:"09:50" },
          { route:"PSR-CTA", dep:"10:15", arr:"11:35" },
          { route:"CTA-PSR", dep:"12:15", arr:"13:40" },
        ],
        reportLate: "13:45",
        late: [
          { route:"PSR-PRG", dep:"14:30", arr:"16:10" },
          { route:"PRG-PSR", dep:"16:35", arr:"18:15" },
          { route:"PSR-VLC", dep:"18:40", arr:"20:55" },
          { route:"VLC-PSR", dep:"21:30", arr:"23:55" },
        ]
      },
      a2: {
        reportEarly: "06:20",
        early: [
          { route:"PSR-MXP", dep:"07:05", arr:"08:30" },
          { route:"MXP-PSR", dep:"08:55", arr:"10:15" },
          { route:"PSR-CRL", dep:"10:40", arr:"12:45" },
          { route:"CRL-PSR", dep:"13:10", arr:"15:10" },
        ],
        reportLate: "15:15",
        late: [
          { route:"PSR-TRN", dep:"16:00", arr:"17:20" },
          { route:"TRN-PSR", dep:"17:45", arr:"19:00" },
          { route:"PSR-STN", dep:"19:25", arr:"22:00" },
          { route:"STN-PSR", dep:"22:25", arr:"00:50" },
        ]
      }
    }
  }
};

// ══════════════════════════════════════════════════════════════
// SCHEDULE UI
// ══════════════════════════════════════════════════════════════

let activeSchedDay = null;

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

  if (!sched) {
    document.getElementById('schedContent').innerHTML = '';
    return;
  }

  const buildFlights = flights => flights.map(f => `
    <div class="seg-flight">
      <div class="seg-route">${f.route}</div>
      <div class="seg-times">${f.dep} → ${f.arr}</div>
      ${f.note ? `<div class="seg-note">⚠️ ${f.note}</div>` : ''}
    </div>
  `).join('');

  const earlyBlock = `
    <div class="flight-segment">
      <div class="seg-header early" style="font-size:14px; letter-spacing:0; padding:12px 14px">
        ☀️ Early
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; border-bottom:1px solid var(--border)">
        <div style="padding:10px 12px; border-right:1px solid var(--border)">
          <div style="font-size:10px; font-weight:700; letter-spacing:1px; color:var(--text3); margin-bottom:6px; text-transform:uppercase">Aereo 1</div>
          <div class="seg-report"><span>Report</span><strong>${sched.a1.reportEarly}</strong></div>
          ${buildFlights(sched.a1.early)}
        </div>
        <div style="padding:10px 12px">
          <div style="font-size:10px; font-weight:700; letter-spacing:1px; color:var(--text3); margin-bottom:6px; text-transform:uppercase">Aereo 2</div>
          <div class="seg-report"><span>Report</span><strong>${sched.a2.reportEarly}</strong></div>
          ${buildFlights(sched.a2.early)}
        </div>
      </div>
    </div>
  `;

  const lateBlock = `
    <div class="flight-segment">
      <div class="seg-header late" style="font-size:14px; letter-spacing:0; padding:12px 14px">
        🌙 Late
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; border-bottom:1px solid var(--border)">
        <div style="padding:10px 12px; border-right:1px solid var(--border)">
          <div style="font-size:10px; font-weight:700; letter-spacing:1px; color:var(--text3); margin-bottom:6px; text-transform:uppercase">Aereo 1</div>
          <div class="seg-report"><span>Report</span><strong>${sched.a1.reportLate}</strong></div>
          ${buildFlights(sched.a1.late)}
        </div>
        <div style="padding:10px 12px">
          <div style="font-size:10px; font-weight:700; letter-spacing:1px; color:var(--text3); margin-bottom:6px; text-transform:uppercase">Aereo 2</div>
          <div class="seg-report"><span>Report</span><strong>${sched.a2.reportLate}</strong></div>
          ${buildFlights(sched.a2.late)}
        </div>
      </div>
    </div>
  `;

  document.getElementById('schedContent').innerHTML = earlyBlock + lateBlock;
}
