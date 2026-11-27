const CACHE_NAME = 'papan-bunga-finance-v47';
const ASSETS_TO_CACHE = [
  './',
  './index.html?v=47',
  './manifest.json?v=47',
  './css/style.css?v=47',
  './css/components.css?v=47',
  './js/verifikasi-kunci.js?v=47',
  './js/key-finance.js?v=47',
  './js/db.js?v=47',
  './js/gdrive-sync.js?v=47',
  './js/firebase-sync.js?v=47',
  './js/app.js?v=47',
  './js/modules/dashboard.js?v=47',
  './js/modules/pesanan.js?v=47',
  './js/modules/proses.js?v=47',
  './js/modules/keuangan.js?v=47',
  './js/modules/hutang.js?v=47',
  './js/modules/jadwal.js?v=47',
  './js/modules/laporan.js?v=47',
  './js/modules/pengaturan.js?v=47',
  'https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(e.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(e.request).catch(() => {
        const accept = e.request.headers.get('accept');
        if (accept && accept.includes('text/html')) {
          return caches.match('./index.html?v=47');
        }
      });
    })
  );
});
