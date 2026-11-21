// Reff service worker: precached app shell, stale-while-revalidate for same-origin GETs.
// Packs are stored in IndexedDB by the app; the shell itself is the offline fallback (F33).
const CACHE = 'reff-shell-v6';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './tokens.css',
  './base.css',
  './app.js',
  './db.js',
  './packs.js',
  './search.js',
  './viewer.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './registry.json',
  './fonts/young-serif-latin.woff2',
  './fonts/young-serif-latin-ext.woff2',
  './fonts/instrument-sans-latin.woff2',
  './fonts/instrument-sans-latin-ext.woff2',
  // Framework7 kit (CSS + icons only, no F7 runtime)
  './vendor/framework7-bundle.min.css',
  './vendor/css/framework7-icons.css',
  './vendor/fonts/Framework7Icons-Regular.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
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
