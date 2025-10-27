// PWA Service Worker dengan cache shell + network-first untuk API
const CACHE_NAME = 'pwa-crud-full-v2';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Cache-first untuk asset statis lokal
  if (url.origin === location.origin && ASSETS.includes(url.pathname.replace(/.*\//,''))) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
    return;
  }
  // Network-first (API Google Apps Script)
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
