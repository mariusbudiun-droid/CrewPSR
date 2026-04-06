const CACHE = 'crewpsr-v1.7.1';

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
  '/notifications.js',
  '/swap.js',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Fetch each asset individually so one 404 doesn't kill everything
      const promises = ASSETS.map(url =>
        fetch(url, { cache: 'no-store' })
          .then(res => {
            if (!res.ok) {
              console.warn('[SW] Failed to cache:', url, res.status);
              return; // skip silently, don't throw
            }
            return cache.put(url, res);
          })
          .catch(err => {
            console.warn('[SW] Fetch error for:', url, err);
          })
      );
      return Promise.all(promises);
    }).then(() => {
      console.log('[SW] Install complete, skipping waiting');
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      return fetch(e.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: return index.html for navigation requests
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'FORCE_UPDATE') {
    caches.delete(CACHE).then(() => {
      self.clients.matchAll().then(clients => {
        clients.forEach(c => c.postMessage('RELOAD'));
      });
    });
  }
});