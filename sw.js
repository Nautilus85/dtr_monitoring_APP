// 1. Define Cache Name and Assets to Cache
const CACHE_NAME = 'dtr-calculator-cache-v1'; // Increment the version if you change assets
const urlsToCache = [
    '/', // Root path, often the index.html
    '/index.html',
    '/script.js',
    '/holiday.js',
    '/style.css',
    // Change your sw.js to match the sizes you declared in manifest.json:
    '/images/icon-192x192.png', 
    '/images/icon-512x512.png',
    // Add any other key assets (like bootstrap/font files if you use them)
];

// --- INSTALL EVENT ---
// Fired when the Service Worker is first installed.
self.addEventListener('install', event => {
    // Perform install steps
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching App Shell');
                // Add all critical files to the cache
                return cache.addAll(urlsToCache);
            })
    );
});

// --- FETCH EVENT ---
// Fired when the browser requests a resource (like a page, image, or script).
self.addEventListener('fetch', event => {
    event.respondWith(
        // Check if the request exists in the cache
        caches.match(event.request)
            .then(response => {
                // Cache hit - return the cached response
                if (response) {
                    return response;
                }
                
                // Cache miss - fetch from the network
                return fetch(event.request);
            })
            // IMPORTANT: If fetch fails (you're offline), return a fallback page or a generic error.
            // For simplicity, we skip a complex fallback here, relying on cached assets.
            .catch(error => {
                console.error('Service Worker: Fetch failed:', error);
            })
    );
});

// --- ACTIVATE EVENT ---
// Fired when the Service Worker is activated, usually used to clean up old caches.
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Delete old caches that are not in the whitelist
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
