const CACHE_NAME = 'Abalassembly-cache-v2';
const urlsToCache = [
'./',
'./index.html',
'./style.css',
'./script.js',
'./image.jpg',
'./font.woff2'
];

self.addEventListener('install', event => {
event.waitUntil(
caches.open(CACHE_NAME)
.then(cache => {
console.log('Opened cache');
return cache.addAll(urlsToCache);
})
);
});

self.addEventListener('fetch', event => {
event.respondWith(
caches.match(event.request)
.then(response => {
if (response) {
return response;
}
return fetch(event.request);
})
);
});
