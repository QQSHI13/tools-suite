const CACHE_NAME = 'tools-suite-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './api-tester/index.html',
  './api-tester/favicon.svg',
  './api-tester/manifest.json',
  './color-picker-plus/index.html',
  './color-picker-plus/manifest.json',
  './csv-json/index.html',
  './csv-json/favicon.svg',
  './csv-json/manifest.json',
  './diff-viewer/index.html',
  './diff-viewer/style.css',
  './diff-viewer/diff.js',
  './diff-viewer/app.js',
  './diff-viewer/favicon.svg',
  './diff-viewer/manifest.json',
  './json-viewer/index.html',
  './json-viewer/favicon.ico',
  './json-viewer/manifest.json',
  './jwt-decoder/index.html',
  './jwt-decoder/favicon.ico',
  './jwt-decoder/manifest.json',
  './keycode-logger/index.html',
  './keycode-logger/manifest.json',
  './life-pattern-generator/index.html',
  './life-pattern-generator/manifest.json',
  './regex-tester/index.html',
  './regex-tester/manifest.json'
];

// Hard reload detection
let isHardReload = false;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch((err) => console.error('Cache install failed:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Handle skipWaiting messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'HARD_RELOAD') {
    isHardReload = true;
  }
});

// Stale-while-revalidate strategy with hard reload support
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        // If hard reload, always fetch fresh
        if (isHardReload) {
          return fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              isHardReload = false;
              return networkResponse;
            })
            .catch(() => cachedResponse);
        }

        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch((error) => {
            console.warn('Network fetch failed, serving from cache:', error);
            return cachedResponse;
          });

        return cachedResponse || fetchPromise;
      });
    })
  );
});
