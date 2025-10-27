// ====== SERVICE WORKER ======
// Ganti versi ini setiap kali mengupdate app.js atau index.html
const CACHE_NAME = 'pwa-crud-full-v5';

const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json'
];

// — Install: cache shell assets —
self.addEventListener('install', (event) => {
  console.log('[SW] Installing new version...');
  self.skipWaiting(); // langsung pakai versi baru
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// — Activate: hapus cache lama + klaim kontrol —
self.addEventListener('activate', (event) => {
  console.log('[SW] Activated & cleaning old caches...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  clients.claim(); // kontrol halaman tanpa reload manual
});

// — Fetch handler —
// Aset lokal = cache-first
// API remote (Apps Script) = network-first
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Aset lokal
  if (url.origin === location.origin && ASSETS.includes(url.pathname.replace(/.*\//,''))) {
    event.respondWith(
      caches.match(req).then(res => res || fetch(req))
    );
    return;
  }

  // API Remote (Apps Script)
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
