const CACHE = 'turbo-racer-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/js/config/constants.js',
  '/js/config/stages.js',
  '/js/config/cars.js',
  '/js/game/GameEngine.js',
  '/js/game/Track.js',
  '/js/game/PlayerCar.js',
  '/js/game/AICar.js',
  '/js/game/ObstacleManager.js',
  '/js/game/WeatherSystem.js',
  '/js/game/CameraSystem.js',
  '/js/game/AudioManager.js',
  '/js/game/ParticleSystem.js',
  '/js/game/GameState.js',
  '/js/ui/HUD.js',
  '/js/ui/Menus.js',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchAndCache = fetch(event.request).then(res => {
        if (res && res.ok && res.type === 'basic' || res.type === 'cors') {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return res;
      });
      return cached || fetchAndCache;
    })
  );
});
