// Manage different cache versions
const CACHE_NAME = 'Abalassembly-cache-v3';

// Define URLs to be cached
const urlsToCache = [
'./',
'./index.html',
'./style.css',
'./script.js',
'./image.jpg',
'./font.woff2',
'./Q-learning-by-reinforcement.js',
'./detection-board-marbles.js',
'./manifest.json'  
];

// Install event listener
self.addEventListener('install', function(event) {
event.waitUntil(
caches.open(CACHE_NAME)
.then(function(cache) {
console.log('Opened cache');
return cache.addAll(urlsToCache);
})
);
});

// Fetch event listener
self.addEventListener('fetch', function(event) {
event.respondWith(
caches.match(event.request)
.then(function(response) {
if (response) {
return response;
}
return fetch(event.request);
})
);
});

// Update event listener
self.addEventListener('activate', function(event) {
const cacheWhitelist = [CACHE_NAME];

event.waitUntil(
caches.keys().then(function(cacheNames) {
return Promise.all(
cacheNames.map(function(cacheName) {
if (cacheWhitelist.indexOf(cacheName) === -1) {
return caches.delete(cacheName);
}
})
);
})
);
});

// Cache strategies
self.addEventListener('fetch', function(event) {
if (event.request.url.endsWith('.jpg')) {
event.respondWith(
caches.open('image-cache').then(function(cache) {
return cache.match(event.request).then(function(response) {
return response || fetch(event.request).then(function(response) {
cache.put(event.request, response.clone());
return response;
});
});
})
);
} else {
event.respondWith(
caches.match(event.request).then(function(response) {
return response || fetch(event.request);
})
);
}
});

// Error handling
self.addEventListener('error', function(event) {
console.error('Error:', event.error);
});

// Preload files
const filesToPreload = [
'./about.html',
'./contact.html',
'./services.html'
];

self.addEventListener('install', function(event) {
event.waitUntil(
caches.open(CACHE_NAME).then(function(cache) {
return cache.addAll(filesToPreload);
})
);
});

// Push notifications
self.addEventListener('push', function(event) {
const title = 'New notification';
const options = {
body: 'This is a push notification',
icon: './notification-icon.png'
};
event.waitUntil(
self.registration.showNotification(title, options)
);
});
