const CACHE_NAME = 'm3-chicken-pos-v7';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/styles.css',
  './assets/app-state.js',
  './assets/bootstrap.js',
  './db/schema.js',
  './db/seed.js',
  './lib/tailwind.js',
  './lib/alpine.js',
  './lib/dexie.js',
  './modules/shared/loadHtml.js',
  './modules/shared/dataService.js',
  './modules/shared/backup.js',
  './modules/shared/settings.js',
  './modules/auth/config.js',
  './modules/auth/guard.js',
  './modules/auth/login.js',
  './modules/auth/logout.js',
  './modules/menu/menu.js',
  './modules/menu/menu.html',
  './modules/customer/customer.js',
  './modules/customer/customer.html',
  './modules/transaction/pos.js',
  './modules/transaction/pos.html',
  './modules/ledger/ledger.js',
  './modules/ledger/ledger.html',
  './modules/supplier/supplier.js',
  './modules/supplier/supplier.html',
  './modules/cashbook/cashbook.js',
  './modules/cashbook/cashbook.html',
  './modules/dashboard/dashboard.js',
  './modules/dashboard/dashboard.html',
  './modules/history/history.js',
  './modules/history/history.html',
  './modules/settings/settings.js',
  './modules/settings/settings.html'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn('Cache skip:', url, err))
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
