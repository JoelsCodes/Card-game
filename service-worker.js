const CACHE_NAME = 'triple-triad-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './sunday_morning_gambit_2.mp3',
  './table_geometry.mp3'
];

// Install: Cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Ignore errors for assets that might not be available yet
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');

  if (isPage) {
    // Pages: network first so every visit gets the latest game when online,
    // falling back to the cached copy when offline.
    event.respondWith(
      fetch(req).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return response;
      }).catch(() => {
        return caches.match(req).then((r) => r || caches.match('./index.html'));
      })
    );
    return;
  }

  // Other assets (audio, manifest): cache first, fallback to network
  event.respondWith(
    caches.match(req).then((response) => {
      if (response) return response;
      return fetch(req).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return response;
      });
    })
  );
});
