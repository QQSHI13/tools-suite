const CACHE_NAME = 'json-viewer-v2';
const urlsToCache = [
  './',
  './index.html',
  './favicon.ico',
  './manifest.json'
];

// Hard reload detection - check if this is a forced refresh
let isHardReload = false;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch((err) => console.error('Cache install failed:', err))
  );
  // Skip waiting immediately for hard reload support
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
  // Take control of all clients immediately
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
  // Skip non-GET requests
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

        // Fetch from network in the background
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Update cache with fresh response
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch((error) => {
            console.warn('Network fetch failed, serving from cache:', error);
            // Return cached response if network fails
            return cachedResponse;
          });

        // Return cached version immediately (stale), revalidate in background
        return cachedResponse || fetchPromise;
      });
    })
  );
});
