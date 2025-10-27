// Versi cache baru → ubah angka setiap kali update (v3 → v4 → v5…)
const CACHE_NAME = 'pwa-crud-v3';

const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
];

// Install SW: cache aset statis
self.addEventListener('install', (e) => {
  console.log('[SW] Install');
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: hapus cache lama
self.addEventListener('activate', (e) => {
  console.log('[SW] Activate');
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
});

// Fetch handler: 
// - ASSETS: cache-first (offline tetap tampil)
// - API Google Apps Script: network-first (supaya data terbaru)
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  if (url.origin === location.origin) {
    // Untuk file statis
    if (ASSETS.includes(url.pathname.replace(/.*\//, ''))) {
      e.respondWith(
        caches.match(e.request).then((cached) => cached || fetch(e.request))
      );
      return;
    }
  }

  // Untuk API (Apps Script) → network dulu
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
