const CACHE_NAME = 'fairbanks-planner-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch handler to satisfy Chrome 2026 PWA install requirements
  event.respondWith(
    fetch(event.request).catch((err) => {
      console.warn('Service worker fetch failed:', err);
    })
  );
});