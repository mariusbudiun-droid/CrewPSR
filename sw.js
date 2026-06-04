// CrewPSR Service Worker — Stale-While-Revalidate strategy (v1.11.0+)
//
// Why this exists: previously we used network-first with a 3s timeout per file.
// The result was that any flaky/offline connection (e.g. in-flight) caused the
// whole app to hang for many seconds before showing cached content. Sometimes
// it never recovered at all.
//
// New strategy:
//   1. ALWAYS serve from cache immediately (instant, works fully offline).
//   2. In background, fetch the network copy. If it differs from the cached
//      version, update the cache silently.
//   3. When the network confirms a new APP_VERSION is available (different
//      cache name), tell all open clients to reload — auto-update.
//
// Result:
//   - App always opens instantly, even offline.
//   - Online users get the new version on next page load after we publish.
//   - No manual "Check for updates" tap needed (kept for backward compatibility).

const APP_VERSION = '1.11.5';
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
  '/releases.js',
  '/icon-192.png',
  '/icon-512.png',
];

// ── Install: precache everything ─────────────────────────────────
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

// ── Activate: delete old caches, take control immediately ────────
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
      .then(() => {
        // Tell every open client to reload — the new SW is now active and
        // they need to load the fresh code. This is the auto-update bit.
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(c => c.postMessage({ type: 'NEW_VERSION', version: APP_VERSION }));
        });
      })
  );
});

// ── Stale-while-revalidate ───────────────────────────────────────
// Serve from cache instantly. In parallel, fetch network and update cache.
// If network fails, we don't care — we already responded from cache.
function staleWhileRevalidate(request) {
  return caches.open(CACHE).then(cache => {
    return cache.match(request).then(cached => {
      // Kick off background network fetch (don't await — let it run in parallel)
      const networkFetch = fetch(request, { cache: 'no-store' })
        .then(networkRes => {
          // Only cache valid responses (200 OK from our origin)
          if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
            cache.put(request, networkRes.clone()).catch(() => {});
          }
          return networkRes;
        })
        .catch(() => null); // Network errors are silent — we already have cache

      // If cached: return cached IMMEDIATELY (don't wait for network)
      // If not cached: wait for network, fall back to offline response
      if (cached) return cached;
      return networkFetch.then(res => {
        if (res) return res;
        // No cache, no network — last resort
        if (request.mode === 'navigate') return cache.match('/index.html');
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    });
  });
}

// ── Fetch handler ────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Don't intercept the API endpoint — let it go straight to network.
  // Offline import isn't possible anyway (needs server).
  if (url.pathname.startsWith('/api/')) return;

  // Only handle same-origin requests
  if (!url.origin.startsWith(self.location.origin)) return;

  e.respondWith(staleWhileRevalidate(e.request));
});

// ── Manual force-update message (kept for backward compatibility) ─
// The old "Check for updates" button sends FORCE_UPDATE. We still support it
// but it's no longer strictly necessary — auto-update via 'activate' handles it.
self.addEventListener('message', e => {
  if (e.data === 'FORCE_UPDATE') {
    caches.delete(CACHE).then(() => {
      self.clients.matchAll().then(clients => {
        clients.forEach(c => c.postMessage('RELOAD'));
      });
    });
  }
});
