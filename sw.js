const CACHE_NAME = 'cloudstore-v32';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './offline-db.js',
  './sync-manager.js',
  './realtime-sync.js',
  './api.js',
  './ui.js',
  './sales.js',
  './reports.js',
  './restock-list.js',
  './category-manager.js',
  './filter-menu.js',
  './app.js',
  './theme-loader.js'
];

// Install event: Cache assets
self.addEventListener('install', (event) => {
  // Force this SW to become the active one immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      // Cache local assets only, external CDNs will be fetched on demand
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Some assets failed to cache:', err);
      });
    })
  );
});

// Activate event: Clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());

  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event: Serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Do NOT cache Supabase API requests
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});
