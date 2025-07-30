const CACHE_NAME = 'wikinav-v1';
const STATIC_CACHE_NAME = 'wikinav-static-v1';
const DYNAMIC_CACHE_NAME = 'wikinav-dynamic-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/wikirabbit_transparent.svg',
  '/wikirabbit_transparent.jpg'
];

// Wikipedia API endpoints to cache
const WIKIPEDIA_API_CACHE = 'wikinav-wikipedia-v1';

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Installed');
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== WIKIPEDIA_API_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle Wikipedia API requests
  if (url.hostname === 'en.wikipedia.org' && url.pathname.startsWith('/w/api.php')) {
    event.respondWith(
      caches.open(WIKIPEDIA_API_CACHE)
        .then((cache) => {
          return cache.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('Service Worker: Serving Wikipedia API from cache:', request.url);
                // Serve from cache, but also update in background
                fetch(request)
                  .then((fetchResponse) => {
                    if (fetchResponse.ok) {
                      cache.put(request, fetchResponse.clone());
                    }
                  })
                  .catch((error) => {
                    console.log('Service Worker: Background fetch failed:', error);
                  });
                return cachedResponse;
              }
              
              // Not in cache, fetch and cache
              return fetch(request)
                .then((fetchResponse) => {
                  if (fetchResponse.ok) {
                    cache.put(request, fetchResponse.clone());
                  }
                  return fetchResponse;
                })
                .catch((error) => {
                  console.log('Service Worker: Wikipedia API fetch failed:', error);
                  // Return offline page or error response
                  return new Response(
                    JSON.stringify({ error: 'Offline - No cached version available' }),
                    { 
                      status: 503, 
                      statusText: 'Service Unavailable',
                      headers: { 'Content-Type': 'application/json' }
                    }
                  );
                });
            });
        })
    );
    return;
  }
  
  // Handle static assets with cache-first strategy
  if (request.method === 'GET' && (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html')
  )) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('Service Worker: Serving from cache:', request.url);
            return cachedResponse;
          }
          
          return fetch(request)
            .then((fetchResponse) => {
              // Only cache successful responses
              if (fetchResponse.ok) {
                const cacheName = STATIC_ASSETS.includes(url.pathname) ? 
                  STATIC_CACHE_NAME : DYNAMIC_CACHE_NAME;
                
                caches.open(cacheName)
                  .then((cache) => {
                    cache.put(request, fetchResponse.clone());
                  });
              }
              return fetchResponse;
            })
            .catch((error) => {
              console.log('Service Worker: Fetch failed:', error);
              // Return offline fallback for HTML requests
              if (request.headers.get('accept').includes('text/html')) {
                return caches.match('/');
              }
              throw error;
            });
        })
    );
    return;
  }
  
  // For all other requests, use network-first strategy
  event.respondWith(
    fetch(request)
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Handle background sync (for future use)
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Implement background sync logic here
      console.log('Service Worker: Performing background sync')
    );
  }
});

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New content available!',
    icon: '/wikirabbit_transparent.svg',
    badge: '/wikirabbit_transparent.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Explore',
        icon: '/wikirabbit_transparent.svg'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/wikirabbit_transparent.svg'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('WikiNav', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});