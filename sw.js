const CACHE = "lifemanual-v214";
const ASSETS = ["./", "index.html", "data-journey.js", "data-daily.js", "data-guides.js", "data-interests.js", "data-characters.js", "data-replies.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "barney-happy.png", "barney-hungry.png", "barney-sleep.png", "barney-excited.png", "barney-idle.png", "barney-idle.mp4", "barney-happy.mp4", "barney-bored.mp4", "barney-hungry.mp4", "barney-sleep.mp4", "barney-wave.mp4", "barney-knock.mp4", "bunny-wave.webp", "bunny-knock.mp4", "bunny-idle.mp4", "bunny-happy.mp4", "bunny-bored.mp4", "bunny-hungry.mp4", "bunny-sleep.mp4", "elephant-idle.mp4", "elephant-happy.mp4", "elephant-bored.mp4", "elephant-hungry.mp4", "elephant-sleep.mp4", "elephant-knock.mp4", "elephant-wave.mp4", "bear-knock.mp4", "beaver-idle.mp4", "beaver-happy.mp4", "beaver-bored.mp4", "beaver-hungry.mp4", "beaver-sleep.mp4", "beaver-knock.mp4", "panda-idle.mp4", "panda-happy.mp4", "panda-bored.mp4", "panda-hungry.mp4", "panda-sleep.mp4", "panda-knock.mp4", "wolf-idle.mp4", "wolf-happy.mp4", "wolf-bored.mp4", "wolf-hungry.mp4", "wolf-sleep.mp4", "wolf-knock.mp4", "capybara-idle.mp4", "capybara-happy.mp4", "capybara-bored.mp4", "capybara-hungry.mp4", "capybara-sleep.mp4", "capybara-knock.mp4", "cat-idle.mp4", "cat-happy.mp4", "cat-bored.mp4", "cat-hungry.mp4", "cat-sleep.mp4", "cat-knock.mp4", "penguin-idle.mp4", "penguin-happy.mp4", "penguin-bored.mp4", "penguin-hungry.mp4", "penguin-sleep.mp4", "penguin-knock.mp4", "owl-idle.mp4", "owl-happy.mp4", "owl-bored.mp4", "owl-hungry.mp4", "owl-sleep.mp4", "owl-knock.mp4", "ant-idle.mp4", "ant-happy.mp4", "ant-bored.mp4", "ant-hungry.mp4", "ant-sleep.mp4", "ant-knock.mp4", "dolphin-idle.mp4", "dolphin-happy.mp4", "dolphin-bored.mp4", "dolphin-hungry.mp4", "dolphin-sleep.mp4", "dolphin-knock.mp4", "dolphin-new.mp4", "lion-idle.mp4", "lion-happy.mp4", "lion-bored.mp4", "lion-hungry.mp4", "lion-sleep.mp4", "lion-knock.mp4", "jellyfish.mp4", "galaxy-bg.jpg", "galaxy-journey.jpg", "galaxy-guides.jpg", "galaxy-sched.jpg", "galaxy-sched.mp4", "galaxy-you.jpg", "ufo.mp4", "warp.mp4", "kawaii-bg.jpg", "kawaii-journey.jpg", "kawaii-guides.jpg", "kawaii-sched.jpg", "kawaii-you.jpg", "kawaii-sparkle.mp4", "kawaii-confetti.mp4", "kawaii-petals.mp4", "forest-bg.jpg", "forest-journey.jpg", "forest-guides.jpg", "forest-sched.jpg", "forest-you.jpg", "forest-fireflies.mp4", "forest-rays.mp4", "forest-leaves.mp4"];

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
