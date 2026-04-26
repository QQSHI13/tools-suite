/**
 * Tools Suite Service Worker
 * Network-first for HTML, cache-first for assets
 */

const CACHE_NAME = 'tools-suite-v3';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './shared/utils.js',
  './api-tester/index.html',
  './api-tester/manifest.json',
  './color-picker-plus/index.html',
  './color-picker-plus/manifest.json',
  './csv-json/index.html',
  './csv-json/manifest.json',
  './diff-viewer/index.html',
  './diff-viewer/manifest.json',
  './json-viewer/index.html',
  './json-viewer/manifest.json',
  './jwt-decoder/index.html',
  './jwt-decoder/manifest.json',
  './keycode-logger/index.html',
  './keycode-logger/manifest.json',
  './life-pattern-generator/index.html',
  './life-pattern-generator/manifest.json',
  './regex-tester/index.html',
  './regex-tester/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const isHTML = event.request.mode === 'navigate' || 
                 event.request.destination === 'document' ||
                 event.request.url.endsWith('.html');

  if (isHTML) {
    // Network-first for HTML pages
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request)
            .then((cached) => cached || caches.match('./index.html'));
        })
    );
  } else {
    // Cache-first for assets
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
