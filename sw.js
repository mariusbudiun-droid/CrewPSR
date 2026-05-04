// CrewPSR Service Worker — Opzione C: Network-first for code, cache-first for assets
// Cache name is auto-versioned via APP_VERSION below — bump it in app.js and the SW
// will pick it up. Strategy:
//   1. HTML / JS / CSS / manifest → network-first with 3s timeout, fallback to cache.
//      Result: online users always see latest code; offline users use cache normally.
//   2. Images / icons / fonts → cache-first.
//      Result: never re-download static assets unless cache is purged.
//   3. If a network update fails mid-flight, the previous cached version is preserved
//      so the app never breaks.

const APP_VERSION = '1.9.8';
const CACHE = `crewpsr-v${APP_VERSION}`;

const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/style.css',
  '/app.js',
  '/home.js',
  '/calendar.js',
  '/crew.js',
  '/roster.js',
  '/roster-import.js',
  '/schedule.js',
  '/settings.js',
  '/storage.js',
  '/navigation.js',
  '/swap.js',
  '/sync.js',
  '/statistics.js',
  '/ical-export.js',
  '/icon-192.png',
  '/icon-512.png',
];

const NETWORK_FIRST_RE = /\.(html|js|css|json)$/i;
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      const promises = ASSETS.map(url =>
        fetch(url, { cache: 'no-store' })
          .then(res => {
            if (!res.ok) { console.warn('[SW] Failed:', url); return; }
            return cache.put(url, res);
          })
          .catch(err => { console.warn('[SW] Error:', url, err); })
      );
      return Promise.all(promises);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Network-first for HTML/JS/CSS — try the network with a timeout, fall back to cache.
// On network success we update the cache silently.
function networkFirst(request) {
  return new Promise(resolve => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      caches.match(request).then(cached => resolve(cached || fetchOrFail(request)));
    }, NETWORK_TIMEOUT_MS);

    fetch(request).then(response => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      if (response && response.status === 200 && response.type === 'basic') {
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(request, clone));
      }
      resolve(response);
    }).catch(() => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      caches.match(request).then(cached => {
        resolve(cached || fetchOrFail(request));
      });
    });
  });
}

function fetchOrFail(request) {
  return fetch(request).catch(() => {
    if (request.mode === 'navigate') return caches.match('/index.html');
    return new Response('', { status: 504, statusText: 'Offline' });
  });
}

// Cache-first for assets — return cache immediately, refresh in background.
function cacheFirst(request) {
  return caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (response && response.status === 200 && response.type === 'basic') {
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(request, clone));
      }
      return response;
    }).catch(() => {
      if (request.mode === 'navigate') return caches.match('/index.html');
      return new Response('', { status: 504, statusText: 'Offline' });
    });
  });
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  const url = new URL(e.request.url);
  // Treat "/" as HTML (navigate request)
  const isHtmlOrCode =
    e.request.mode === 'navigate' ||
    NETWORK_FIRST_RE.test(url.pathname) ||
    url.pathname === '/';

  if (isHtmlOrCode) {
    e.respondWith(networkFirst(e.request));
  } else {
    e.respondWith(cacheFirst(e.request));
  }
});

// Manual force-update kept for backward compatibility with the "Check for updates" button.
self.addEventListener('message', e => {
  if (e.data === 'FORCE_UPDATE') {
    caches.delete(CACHE).then(() => {
      self.clients.matchAll().then(clients => {
        clients.forEach(c => c.postMessage('RELOAD'));
      });
    });
  }
});
