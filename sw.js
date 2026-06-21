const CACHE = "lifemanual-v198";
const ASSETS = ["./", "index.html", "data-journey.js", "data-daily.js", "data-guides.js", "data-interests.js", "data-characters.js", "data-replies.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "barney-happy.png", "barney-hungry.png", "barney-sleep.png", "barney-excited.png", "barney-idle.png", "barney-idle.mp4", "barney-happy.mp4", "barney-bored.mp4", "barney-hungry.mp4", "barney-sleep.mp4", "barney-wave.mp4", "barney-knock.mp4", "bunny-wave.webp", "bunny-knock.mp4", "bunny-idle.mp4", "bunny-happy.mp4", "bunny-bored.mp4", "bunny-hungry.mp4", "bunny-sleep.mp4", "elephant-idle.mp4", "elephant-happy.mp4", "elephant-bored.mp4", "elephant-hungry.mp4", "elephant-sleep.mp4", "elephant-knock.mp4", "elephant-wave.mp4", "bear-knock.mp4", "dolphin-new.mp4", "jellyfish.mp4", "galaxy-bg.jpg", "galaxy-journey.jpg", "galaxy-guides.jpg", "galaxy-sched.jpg", "galaxy-you.jpg", "ufo.mp4", "warp.mp4", "kawaii-bg.jpg", "kawaii-journey.jpg", "kawaii-guides.jpg", "kawaii-sched.jpg", "kawaii-you.jpg", "kawaii-sparkle.mp4", "kawaii-confetti.mp4", "kawaii-petals.mp4", "forest-bg.jpg", "forest-journey.jpg", "forest-guides.jpg", "forest-sched.jpg", "forest-you.jpg", "forest-fireflies.mp4", "forest-rays.mp4", "forest-leaves.mp4"];

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

// Event alarm timers — stored here so they survive while SW is alive
const _alarms = new Map();

self.addEventListener("message", e => {
  const d = e.data;
  if (!d) return;

  // App sends { type:"SET_ALARM", id, fireAt, title, emoji } when event is saved
  if (d.type === "SET_ALARM") {
    const delay = d.fireAt - Date.now();
    if (delay < 0 || delay > 24 * 60 * 60 * 1000) return; // ignore past / >24h
    if (_alarms.has(d.id)) clearTimeout(_alarms.get(d.id));
    const tid = setTimeout(() => {
      self.registration.showNotification("📅 Life Manual", {
        body: `${d.emoji} ${d.title} starts in 5 minutes!`,
        icon: "icon-192.png",
        badge: "icon-192.png",
        tag: "ev-" + d.id,
        requireInteraction: true,
        data: { tab: "schedule" }
      });
      _alarms.delete(d.id);
    }, delay);
    _alarms.set(d.id, tid);
  }

  // App sends { type:"CLEAR_ALARM", id } when event is deleted
  if (d.type === "CLEAR_ALARM") {
    if (_alarms.has(d.id)) { clearTimeout(_alarms.get(d.id)); _alarms.delete(d.id); }
  }
});

// Incoming push from Cloudflare — display it as a notification
self.addEventListener("push", e => {
  let payload = {};
  try { payload = e.data ? e.data.json() : {}; } catch(err) {}
  e.waitUntil(
    self.registration.showNotification(payload.title || "📅 Life Manual", {
      body: payload.body || "You have an upcoming event!",
      icon: payload.icon || "icon-192.png",
      badge: "icon-192.png",
      requireInteraction: true,
      tag: "lm-push",
      data: payload.data || { tab: "schedule" },
    })
  );
});

// Tapping a notification opens the app on the Schedule tab
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const tab = e.notification.data?.tab || "today";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes("index.html") || c.url.endsWith("/"));
      if (existing) { existing.focus(); existing.postMessage({ type: "OPEN_TAB", tab }); }
      else clients.openWindow("./?tab=" + tab);
    })
  );
});
