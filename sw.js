const CACHE = 'haohaochi-shell-v4';
const CORE = ['./', './index.html', './styles.css', './mobile.css', './src/app.js', './src/storage.js', './src/utils.js', './manifest.webmanifest', './assets/icon-192.png', './assets/icon-512.png'];
const shellPaths=new Set(CORE.map(p=>new URL(p,self.registration.scope).pathname));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('haohaochi-shell-')&&k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || !shellPaths.has(url.pathname)) return;
  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      if (fresh.ok && !url.search) {
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch {
      return (await caches.match(req)) || (req.mode === 'navigate' ? await caches.match('./index.html') : Response.error());
    }
  })());
});
