const CACHE = ‘crewpsr-v2’;
const ASSETS = [’/’, ‘/index.html’, ‘/manifest.json’];

// Install: cache all assets
self.addEventListener(‘install’, e => {
e.waitUntil(
caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
);
});

// Activate: clean old caches
self.addEventListener(‘activate’, e => {
e.waitUntil(
caches.keys().then(keys =>
Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
).then(() => self.clients.claim())
);
});

// Fetch: serve from cache, fall back to network
self.addEventListener(‘fetch’, e => {
e.respondWith(
caches.match(e.request).then(cached => {
return cached || fetch(e.request).then(response => {
const clone = response.clone();
caches.open(CACHE).then(c => c.put(e.request, clone));
return response;
});
})
);
});

// Listen for manual update request from app
self.addEventListener(‘message’, e => {
if (e.data === ‘FORCE_UPDATE’) {
caches.delete(CACHE).then(() => {
self.registration.unregister().then(() => {
self.clients.matchAll().then(clients => {
clients.forEach(c => c.postMessage(‘RELOAD’));
});
});
});
}
});