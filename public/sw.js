const CACHE_NAME = 'fairbanks-planner-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through fetch handler to satisfy PWA install requirements
  event.respondWith(fetch(event.request));
});