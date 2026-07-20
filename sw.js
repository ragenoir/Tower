/* Minimal offline-friendly cache for Tower TD (zero-dep PWA). */
const CACHE = 'tower-td-v1.1.1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './js/config.js',
  './js/i18n.js',
  './js/data/towers.js',
  './js/data/enemies.js',
  './js/data/waves.js',
  './js/data/waves-meadow.js',
  './js/data/waves-canyon.js',
  './js/data/waves-ruins.js',
  './js/data/waves-rift.js',
  './js/events.js',
  './js/maps/pipeline.js',
  './js/maps/meadow.js',
  './js/maps/canyon.js',
  './js/maps/ruins.js',
  './js/maps/rift.js',
  './js/maps/validate.js',
  './js/maps/index.js',
  './js/storage.js',
  './js/achievements.js',
  './js/audio.js',
  './graphics/state.js',
  './graphics/map.js',
  './graphics/units.js',
  './graphics/fx.js',
  './js/game.js',
  './js/ui.js',
  './js/debug.js',
  './js/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        const copy = res.clone();
        if (res.ok && event.request.url.startsWith(self.location.origin)) {
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
