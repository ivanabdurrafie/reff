// Reff service worker: precached shell; pack JSON cached per version by the app
// (Cache API). Navigations fall back to the shell so hash routes never 404.
const CACHE = 'reff-shell-v1';
const SHELL = [
  './',
  './index.html',
  './css/tokens.css',
  './css/app.css',
  './js/app.js',
  './js/router.js',
  './js/store.js',
  './js/packs.js',
  './js/home.js',
  './js/setlist.js',
  './js/lyrics.js',
  './js/search.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './fonts/bodoni-moda-700-latin.woff2',
  './fonts/inter-latin.woff2',
  './packs/index.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE && k !== 'reff-packs-v1')
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // Pack JSON: app-managed cache (reff-packs-v1) wins; else network.
  if (url.pathname.includes('/packs/') && url.pathname.endsWith('.json')) {
    e.respondWith(
      caches.match(e.request).then(
        (hit) =>
          hit ||
          fetch(e.request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open('reff-packs-v1').then((c) => c.put(e.request, copy)).catch(() => {});
            }
            return res;
          })
      )
    );
    return;
  }

  // Shell + static: cache-first, refresh in background.
  e.respondWith(
    caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' }).then((cached) => {
      const network = fetch(e.request)
        .then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
