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
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
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

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      });
      return cached || networkFetch;
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