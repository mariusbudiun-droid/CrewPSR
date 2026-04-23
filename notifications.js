function setNotifPref(key, val) {
  if (!APP.notif) {
    APP.notif = {
      enabled: false,
      report: true,
      dep: 'first',
      arr: 'last'
    };
  }

  if (key === 'enabled' && val) {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        APP.notif.enabled = true;
        save();
        renderSettings();
        scheduleAllNotifications();
      } else {
        APP.notif.enabled = false;
        save();
        renderSettings();
        alert('Please enable notifications for CrewPSR in your device settings.');
      }
    });
    return;
  }

  APP.notif[key] = val;

  if (key === 'enabled' && !val) {
    cancelAllNotifications();
  }

  save();
  renderSettings();

  if (APP.notif.enabled) {
    scheduleAllNotifications();
  }
}

function scheduleAllNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    cancelAllNotifications();
    return;
  }

  cancelAllNotifications();

  const today = new Date();

  for (let i = 0; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);

    const ds = toDateStr(d);
    const assign = APP.assignments?.[ds];
    if (!assign) continue;

    const dow = d.getDay();
    const sched = SCHEDULE.days[dow];

    scheduleNotificationsForDay(ds, assign, sched);
  }
}

function scheduleNotificationsForDay(ds, assign, sched) {
  const n = APP.notif || {};
  let flights = [];

  if (assign === 'CUSTOM') {
    const cf = APP.customFlights?.[ds] || [];
    flights = cf
      .filter(f => f.from && f.to && f.dep)
      .map(f => ({
        route: `${f.from} - ${f.to}`,
        dep: f.dep,
        arr: f.arr
      }));
  } else if (assign.startsWith('A') && sched) {
    const useA2 = assign.startsWith('A2');
    const useLate = assign.endsWith('L');
    const plane = useA2 ? sched.a2 : sched.a1;
    flights = useLate ? plane.late : plane.early;
  }

  if (!flights.length) return;

  if (n.report !== false) {
    const firstDep = flights[0]?.dep;
    if (firstDep) {
      const reportTime = subtractMinutes(firstDep, 45);
      scheduleAt(
        ds,
        reportTime,
        'Report time',
        `Report ${reportTime} • ${flights.map(f => f.route).join(', ')}`,
        `${ds}-report`
      );
    }
  }

  if (n.dep === 'first') {
    const first = flights[0];
    if (first?.dep) {
      scheduleAt(ds, first.dep, first.route, `Departure ${first.dep}`, `${ds}-dep-0`);
    }
  } else if (n.dep === 'all') {
    flights.forEach((f, i) => {
      if (f.dep) {
        scheduleAt(ds, f.dep, f.route, `Departure ${f.dep}`, `${ds}-dep-${i}`);
      }
    });
  }

  if (n.arr === 'last') {
    const last = flights[flights.length - 1];
    if (last?.arr) {
      scheduleAt(ds, last.arr, last.route, `Arrived ${last.arr}`, `${ds}-arr-last`);
    }
  } else if (n.arr === 'all') {
    flights.forEach((f, i) => {
      if (f.arr) {
        scheduleAt(ds, f.arr, f.route, `Arrived ${f.arr}`, `${ds}-arr-${i}`);
      }
    });
  }
}

function scheduleAt(dateStr, timeStr, title, body, id) {
  const [h, m] = timeStr.split(':').map(Number);
  const [y, mo, d] = dateStr.split('-').map(Number);

  const target = new Date(y, mo - 1, d, h, m, 0);
  const now = new Date();
  const delay = target - now;

  if (delay <= 0) return;

  const tid = setTimeout(() => {
    if (Notification.permission === 'granted') {
      new Notification(`CrewPSR • ${title}`, {
        body,
        icon: 'icon-192.png',
        tag: id
      });
    }
  }, delay);

  if (!window.notifTimers) window.notifTimers = {};
  window.notifTimers[id] = tid;
}

function cancelAllNotifications() {
  if (!window.notifTimers) return;

  Object.values(window.notifTimers).forEach(tid => clearTimeout(tid));
  window.notifTimers = {};
}

function subtractMinutes(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number);
  let total = h * 60 + m - mins;

  if (total < 0) total += 1440;

  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
