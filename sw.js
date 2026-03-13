const CACHE_NAME = 'lagekarte-v2-cache-1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
  'https://unpkg.com/mgrs/dist/mgrs.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;
  
  // Don't cache supabase database requests directly, or API calls to nominatim/osrm/dwd
  const url = event.request.url;
  if (url.includes('supabase.co/rest') || 
      url.includes('supabase.co/realtime') ||
      url.includes('nominatim.openstreetmap.org') ||
      url.includes('router.project-osrm.org') ||
      url.includes('maps.dwd.de')) {
    return;
  }

  // Stale-while-revalidate strategy for UI assets
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(err => {
        console.log('Offline / Fetch failed:', err);
      });
      return cachedResponse || fetchPromise;
    })
  );
});
