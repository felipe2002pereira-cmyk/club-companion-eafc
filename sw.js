const CACHE_PREFIX = 'club-companion-';
const CACHE_NAME = `${CACHE_PREFIX}v0.2.0`;
const APP_ASSETS = ['./', './index.html', './app.webmanifest', './assets/app.css', './assets/icon.svg', './release.json', './src/main.js', './src/storage/database.js', './src/storage/backup.js', './src/domain/player-items.js', './src/domain/item-score.js', './src/domain/sbc-requirements.js', './src/domain/sbc-solver.js', './src/domain/gallery-planner.js', './src/domain/market-prices.js', './src/ui/club-view.js', './src/ui/sbc-view.js', './src/ui/gallery-view.js', './src/ui/market-view.js', './src/ui/settings-view.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (new URL(request.url).pathname.endsWith('/release.json')) {
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(async () => (await caches.match(request)) || Response.error()));
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      return cached || Response.error();
    }
  })());
});
