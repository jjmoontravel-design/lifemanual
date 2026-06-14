const CACHE = "lifemanual-v32";
const ASSETS = ["./", "index.html", "data-journey.js", "data-daily.js", "data-guides.js", "data-characters.js", "data-replies.js", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
// Note: character art (characters/*.jpg) and idle videos (characters/*-idle.mp4) are
// cached on-demand by the network-first fetch handler, not preloaded here.

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first so updates show up quickly; cache fallback keeps it working offline.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
