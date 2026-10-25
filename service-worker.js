// Keep this name stable: a new name deletes the saved images on activate, so bump only with a fill step first.
const CACHE_NAME = 'vanguards-end-v1';
// Caches from earlier names; their saved files are moved into CACHE_NAME before they are deleted.
const OLD_CACHES = ['triple-triad-v5', 'triple-triad-v6'];
// Small set cached at install so the game opens offline right away.
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './apple-touch-icon.png',
  './sunday_morning_gambit_2.mp3',
  './table_geometry.mp3',
  './assets-manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE).catch(() => Promise.resolve())
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    migrateOldCaches().then(() => caches.keys()).then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => fillMissingAssets())
  );
  self.clients.claim();
});

// Copy saved files from old caches into the new one, so an update never removes the card art.
function migrateOldCaches() {
  return caches.open(CACHE_NAME).then((target) =>
    Promise.all(OLD_CACHES.map((name) =>
      caches.has(name).then((exists) => {
        if (!exists) return null;
        return caches.open(name).then((old) => old.keys().then((reqs) =>
          Promise.all(reqs.map((req) =>
            target.match(req).then((hit) => hit ? null : old.match(req).then((res) => res && target.put(req, res)))
          ))
        ));
      })
    ))
  ).catch(() => null);
}

// Assets have content-hashed names, so a cached copy never goes stale: serve it first.
function cacheFirst(req) {
  return caches.open(CACHE_NAME).then((cache) =>
    cache.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      });
    })
  );
}

// Fill in any assets missing from the cache (runs when the page loads online).
function fillMissingAssets() {
  return fetch('./assets-manifest.json', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => caches.open(CACHE_NAME).then((cache) =>
      cache.keys().then((keys) => {
        const have = new Set(keys.map((k) => new URL(k.url).pathname));
        const missing = list.filter((p) => !have.has('/' + p) && !have.has(p));
        let i = 0;
        const worker = () => {
          if (i >= missing.length) return Promise.resolve();
          const p = missing[i++];
          return fetch(p).then((res) => (res.ok ? cache.put(p, res) : null)).catch(() => null).then(worker);
        };
        return Promise.all([worker(), worker(), worker(), worker()]);
      })
    ))
    .catch(() => null);
}

// The page: always ask the network so updates show right away; use the cached copy only when offline.
function networkFirst(req, event) {
  if (event) event.waitUntil(fillMissingAssets());
  return caches.open(CACHE_NAME).then((cache) =>
    fetch(req).then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => cache.match(req))
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (isPage) {
    event.respondWith(networkFirst(req, event));
    return;
  }
  if (url.pathname.includes('/assets/') || url.pathname.endsWith('.mp3') || url.pathname.endsWith('.png')) {
    event.respondWith(cacheFirst(req));
  }
});
