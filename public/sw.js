// Service Worker - Network First strategy for PWA updates
const CACHE_VERSION = 'rcm-v2';

self.addEventListener('install', (event) => {
  // Activate immediately, don't wait
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((name) => name !== CACHE_VERSION).map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GET requests
  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return;

  // For navigation requests (HTML pages) - always network first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // For Next.js static assets (_next/static/) - cache first (they have hashed names)
  if (request.url.includes('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Everything else - network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
