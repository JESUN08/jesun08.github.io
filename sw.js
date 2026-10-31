const CACHE = 'jesun-v11';
const ASSETS = ['/', '/index.html', '/manifest.json',
  '/icons/android-chrome-192x192.png', '/icons/android-chrome-512x512.png', '/icons/favicon.ico'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(ASSETS.map(a => c.add(a)))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  // Only same-site GET requests (Supabase and CDNs go straight to the network)
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;

  // Pages: network first so updates show right away; cache is the offline backup
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(r, copy));
        return res;
      }).catch(() => caches.match(r).then(m => m || caches.match('/index.html')))
    );
    return;
  }

  // Other files: cached copy first, refreshed in the background
  e.respondWith(
    caches.match(r).then(cached => {
      const net = fetch(r).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
