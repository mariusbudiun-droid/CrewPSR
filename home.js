let homeCurrentDay = 0;
const HOMEDAYS = 7;
let homeSwipeBound = false;

function renderHome() {
  const today = new Date();
  const todayDow = today.getDay();

  document.getElementById('topDay').textContent =
    `${DOW[todayDow]} ${today.getDate()} ${MONTHS[today.getMonth()]}`;
  document.getElementById('topRoster').textContent = `Roster ${APP.roster}`;

  buildHomeSlides();
  goToHomeDay(homeCurrentDay, false);

  if (!homeSwipeBound) {
    addSwipeListener(document.getElementById('homeSlider'), dir => {
      const next = homeCurrentDay + dir;
      if (next >= 0 && next < HOMEDAYS) goToHomeDay(next);
    });
    homeSwipeBound = true;
  }
}

function buildHomeSlides() {
  const slides = document.getElementById('homeSlides');
  const dots = document.getElementById('homeDots');
  const today = new Date();

  slides.innerHTML = '';
  dots.innerHTML = '';

  for (let i = 0; i < HOMEDAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);

    const ds = toDateStr(d);
    const dow = d.getDay();
    const day = cycleDay(APP.roster, ds);
    const type = shiftType(day);
    const lbl = shiftLabel(day);
    const sched = SCHEDULE.days[dow];
    const assign = APP.assignments?.[ds];
    const detail = APP.assignDetails?.[ds];

    let reportHtml = '';

    if (assign && assign !== 'HSBY' && assign !== 'AD' && assign !== 'CUSTOM') {
      const useA2 = assign.startsWith('A2');
      const useLate = assign.endsWith('L');
      const plane = useA2 ? sched?.a2 : sched?.a1;
      const t = useLate ? plane?.reportLate 
