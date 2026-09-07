const CACHE_NAME = 'zran-absensi-v3';
const ASSETS_TO_CACHE = [
  './',
  './halaman%20Login.html',
  './dashboard.html',
  './Data%20Karyawan.html',
  './Absensi.html',
  './Laporan.html',
  './staf-absensi.html',
  './Css/dashboard.css',
  './Css/data-karyawan.css',
  './Css/absensi.css',
  './Css/laporan.css',
  './Css/staf-absensi.css',
  './JS/firebase-config.js',
  './JS/dashboard.js',
  './JS/data-karyawan.js',
  './JS/absensi.js',
  './JS/laporan.js',
  './JS/staf-absensi.js',
  './manifest.json',
  './LOGO%20saja%20.png',
  './Logo%20Company.png'
];

// Install Service Worker & Pre-cache
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: Pre-caching app shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch(err => {
        console.warn('SW: Cache addAll skipped or partial:', err);
      })
  );
});

// Activate & Cleanup Old Caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Network-first strategy with safe caching for GET requests
self.addEventListener('fetch', event => {
  const req = event.request;

  // Caching hanya untuk GET dan protokol http/https
  if (req.method !== 'GET' || !req.url.startsWith('http')) {
    return;
  }

  // Abaikan request streaming/Firestore/googleapis dari cache
  if (req.url.includes('firestore.googleapis.com') || req.url.includes('identitytoolkit')) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, responseClone).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(req);
      })
  );
});

