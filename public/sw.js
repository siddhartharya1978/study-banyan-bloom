const CACHE_NAME = 'banyan-tree-v2';
const STATIC_CACHE = 'banyan-static-v2';
const DYNAMIC_CACHE = 'banyan-dynamic-v2';

const urlsToCache = [
  '/',
  '/auth',
  '/dashboard',
  '/manifest.json',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Network-first for API calls
  if (url.pathname.includes('/functions/v1/') || url.pathname.includes('/rest/v1/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful API responses for offline fallback
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        if (fetchResponse && fetchResponse.status === 200) {
          const responseToCache = fetchResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return fetchResponse;
      });
    })
  );
});

// Background sync for reviews
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reviews') {
    event.waitUntil(syncPendingReviews());
  }
});

// Sync pending reviews from IndexedDB
async function syncPendingReviews() {
  try {
    console.log('[SW] Starting background sync for reviews...');
    
    // Open IndexedDB
    const db = await openDB();
    const tx = db.transaction('pending-reviews', 'readonly');
    const store = tx.objectStore('pending-reviews');
    const reviews = await getAllFromStore(store);
    
    console.log(`[SW] Found ${reviews.length} pending reviews to sync`);
    
    if (reviews.length === 0) return;
    
    // Get Supabase URL from cache or env
    const supabaseUrl = await getSupabaseUrl();
    if (!supabaseUrl) {
      console.error('[SW] Supabase URL not available');
      return;
    }
    
    // Sync each review
    for (const review of reviews) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/reviews`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': await getSupabaseKey(),
            'Authorization': `Bearer ${await getSupabaseKey()}`,
          },
          body: JSON.stringify(review),
        });
        
        if (response.ok) {
          // Remove synced review from IndexedDB
          const deleteTx = db.transaction('pending-reviews', 'readwrite');
          const deleteStore = deleteTx.objectStore('pending-reviews');
          await deleteStore.delete(review.id);
          console.log(`[SW] Synced review: ${review.id}`);
        }
      } catch (err) {
        console.error(`[SW] Failed to sync review ${review.id}:`, err);
      }
    }
    
    console.log('[SW] Background sync complete');
  } catch (error) {
    console.error('[SW] Sync error:', error);
  }
}

// Helper to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('banyan-offline', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-reviews')) {
        db.createObjectStore('pending-reviews', { keyPath: 'id' });
      }
    };
  });
}

// Helper to get all items from object store
function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Get Supabase URL - stored in localStorage or from HTML
async function getSupabaseUrl() {
  try {
    // Try to get from a cached config
    const cache = await caches.open(DYNAMIC_CACHE);
    const configResponse = await cache.match('/config');
    if (configResponse) {
      const config = await configResponse.json();
      return config.supabaseUrl;
    }
    return null;
  } catch {
    return null;
  }
}

// Get Supabase key
async function getSupabaseKey() {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const configResponse = await cache.match('/config');
    if (configResponse) {
      const config = await configResponse.json();
      return config.supabaseKey;
    }
    return null;
  } catch {
    return null;
  }
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data.type === 'STORE_CONFIG') {
    // Store Supabase config for background sync
    caches.open(DYNAMIC_CACHE).then((cache) => {
      cache.put('/config', new Response(JSON.stringify(event.data.config)));
    });
  }
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notification handling (for future use)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Banyan Tree';
  const options = {
    body: data.body || 'Time to study! 🌱',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/dashboard',
    },
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
