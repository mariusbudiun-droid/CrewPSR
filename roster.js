// ══════════════════════════════════════════════════════════════
// ROSTER LOGIC
// ══════════════════════════════════════════════════════════════
function cycleDay(rosterNum, dateStr) {
  if (!APP.refDate || !APP.roster) return null;
  const ref = new Date(APP.refDate); ref.setHours(0,0,0,0);
  const d   = new Date(dateStr);     d.setHours(0,0,0,0);
  const diff = Math.round((d - ref) / 86400000);
  const offset = APP.roster - rosterNum;
  return ((diff + offset) % 16 + 16) % 16 + 1;
}

function shiftType(day) {
  if (!day) return 'off';
  if (day >= 1 && day <= 5)  return 'early';
  if (day >= 9 && day <= 13) return 'late';
  return 'off';
}

function shiftLabel(day) {
  if (!day) return { main: '', sub: '' };
  if (day === 1) return { main: '1st Early', sub: 'after days off' };
  if (day === 2) return { main: '2nd Early', sub: '' };
  if (day === 3) return { main: '3rd Early', sub: '' };
  if (day === 4) return { main: '4th Early', sub: '' };
  if (day === 5) return { main: '5th Early', sub: 'last before days off' };
  if (day === 6) return { main: '1st Off', sub: 'after Early' };
  if (day === 7) return { main: '2nd Off', sub: 'after Early' };
  if (day === 8) return { main: '3rd Off', sub: 'after Early' };
  if (day === 9) return { main: '1st Late', sub: 'after days off' };
  if (day === 10) return { main: '2nd Late', sub: '' };
  if (day === 11) return { main: '3rd Late', sub: '' };
  if (day === 12) return { main: '4th Late', sub: '' };
  if (day === 13) return { main: '5th Late', sub: 'last before days off' };
  if (day === 14) return { main: '1st Off', sub: 'after Late' };
  if (day === 15) return { main: '2nd Off', sub: 'after Late' };
  if (day === 16) return { main: '3rd Off', sub: 'after Late' };
  return { main: '', sub: '' };
}

function shiftLabelStr(day) {
  const l = shiftLabel(day);
  return l.main;
}

function mod16(x) { return ((x - 1 + 16) % 16) + 1; }

// Reliable local date string YYYY-MM-DD (avoids timezone issues)
function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function swapCandidates(myRoster, myDay) {
  const isEarly = myDay <= 5;
  const N = isEarly ? myDay : myDay - 8;
  const r1 = isEarly ? mod16(myRoster + 8 + N)  : mod16(myRoster + N);
  const r2 = isEarly ? mod16(myRoster + 10 + N) : mod16(myRoster + 2 + N);
  const r3 = isEarly ? mod16(r1 + 8) : mod16(r2 + 8);
  const certain = [r1, r2].filter(r => r !== myRoster).map(r => ({ roster: r, certain: true }));
  const maybe   = [r3].filter(r => r !== myRoster && r !== r1 && r !== r2).map(r => ({ roster: r, certain: false }));
  return [...certain, ...maybe];
}
