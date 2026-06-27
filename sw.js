const CACHE = "lifemanual-v247";
const ASSETS = ["./", "index.html", "data-journey.js", "data-daily.js", "data-guides.js", "data-interests.js", "data-characters.js", "data-replies.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "barney-happy.png", "barney-hungry.png", "barney-sleep.png", "barney-excited.png", "barney-idle.png", "barney-idle.mp4", "barney-happy.mp4", "barney-bored.mp4", "barney-hungry.mp4", "barney-sleep.mp4", "barney-wave.mp4", "barney-knock.mp4", "bunny-wave.webp", "bunny-knock.mp4", "bunny-idle.mp4", "bunny-happy.mp4", "bunny-bored.mp4", "bunny-hungry.mp4", "bunny-sleep.mp4", "elephant-idle.mp4", "elephant-happy.mp4", "elephant-bored.mp4", "elephant-hungry.mp4", "elephant-sleep.mp4", "elephant-knock.mp4", "elephant-wave.mp4", "bear-knock.mp4", "beaver-idle.mp4", "beaver-happy.mp4", "beaver-bored.mp4", "beaver-hungry.mp4", "beaver-sleep.mp4", "beaver-knock.mp4", "panda-idle.mp4", "panda-happy.mp4", "panda-bored.mp4", "panda-hungry.mp4", "panda-sleep.mp4", "panda-knock.mp4", "wolf-idle.mp4", "wolf-happy.mp4", "wolf-bored.mp4", "wolf-hungry.mp4", "wolf-sleep.mp4", "wolf-knock.mp4", "capybara-idle.mp4", "capybara-happy.mp4", "capybara-bored.mp4", "capybara-hungry.mp4", "capybara-sleep.mp4", "capybara-knock.mp4", "cat-idle.mp4", "cat-happy.mp4", "cat-bored.mp4", "cat-hungry.mp4", "cat-sleep.mp4", "cat-knock.mp4", "penguin-idle.mp4", "penguin-happy.mp4", "penguin-bored.mp4", "penguin-hungry.mp4", "penguin-sleep.mp4", "penguin-knock.mp4", "owl-idle.mp4", "owl-happy.mp4", "owl-bored.mp4", "owl-hungry.mp4", "owl-sleep.mp4", "owl-knock.mp4", "ant-idle.mp4", "ant-happy.mp4", "ant-bored.mp4", "ant-hungry.mp4", "ant-sleep.mp4", "ant-knock.mp4", "dolphin-idle.mp4", "dolphin-happy.mp4", "dolphin-bored.mp4", "dolphin-hungry.mp4", "dolphin-sleep.mp4", "dolphin-knock.mp4", "dolphin-new.mp4", "lion-idle.mp4", "lion-happy.mp4", "lion-bored.mp4", "lion-hungry.mp4", "lion-sleep.mp4", "lion-knock.mp4", "fox-idle.mp4", "fox-happy.mp4", "fox-bored.mp4", "fox-hungry.mp4", "fox-sleep.mp4", "fox-knock.mp4", "deer-idle.mp4", "deer-happy.mp4", "deer-bored.mp4", "deer-hungry.mp4", "deer-sleep.mp4", "deer-knock.mp4", "turtle-idle.mp4", "turtle-happy.mp4", "turtle-bored.mp4", "turtle-hungry.mp4", "turtle-sleep.mp4", "turtle-knock.mp4", "eagle-idle.mp4", "eagle-happy.mp4", "eagle-bored.mp4", "eagle-hungry.mp4", "eagle-sleep.mp4", "eagle-knock.mp4", "tiger-idle.mp4", "tiger-happy.mp4", "tiger-bored.mp4", "tiger-hungry.mp4", "tiger-sleep.mp4", "tiger-knock.mp4", "raccoon-idle.mp4", "raccoon-happy.mp4", "raccoon-bored.mp4", "raccoon-hungry.mp4", "raccoon-sleep.mp4", "raccoon-knock.mp4", "jellyfish.mp4", "galaxy-bg.jpg", "galaxy-journey.jpg", "galaxy-guides.jpg", "galaxy-sched.jpg", "galaxy-sched.mp4", "galaxy-you.jpg", "ufo.mp4", "warp.mp4", "kawaii-bg.jpg", "kawaii-journey.jpg", "kawaii-guides.jpg", "kawaii-sched.jpg", "kawaii-you.jpg", "kawaii-sparkle.mp4", "kawaii-confetti.mp4", "kawaii-petals.mp4", "forest-bg.jpg", "forest-journey.jpg", "forest-guides.jpg", "forest-sched.jpg", "forest-you.jpg", "forest-fireflies.mp4", "forest-rays.mp4", "forest-leaves.mp4"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => _rearmAll())
  );
});

// Network-first so updates show up quickly; cache fallback keeps it working offline.
let _rearmedOnBoot = false;
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // Re-arm alarms once per SW boot (covers SW restarts after phone lock)
  if (!_rearmedOnBoot) { _rearmedOnBoot = true; _rearmAll(); }
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

// ── IDB: persist alarms so they survive SW restarts ──
const _idb = {
  _db: null,
  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('lm-alarms', 1);
      r.onupgradeneeded = e => e.target.result.createObjectStore('alarms', { keyPath: 'id' });
      r.onsuccess = e => { this._db = e.target.result; res(e.target.result); };
      r.onerror = rej;
    });
  },
  async save(alarm) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const tx = db.transaction('alarms', 'readwrite');
      tx.objectStore('alarms').put(alarm);
      tx.oncomplete = res; tx.onerror = rej;
    });
  },
  async del(id) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const tx = db.transaction('alarms', 'readwrite');
      tx.objectStore('alarms').delete(id);
      tx.oncomplete = res; tx.onerror = rej;
    });
  },
  async all() {
    const db = await this.open();
    return new Promise((res, rej) => {
      const tx = db.transaction('alarms', 'readonly');
      const r = tx.objectStore('alarms').getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => res([]);
    });
  }
};

// In-memory timer map
const _alarms = new Map();

function _notifOpts(d) {
  return {
    body: d.body || `${d.emoji || '📅'} ${d.title}`,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: 'ev-' + d.id,
    requireInteraction: true,
    data: { tab: d.tab || 'schedule' }
  };
}

async function _arm(d) {
  const delay = d.fireAt - Date.now();
  if (_alarms.has(d.id)) clearTimeout(_alarms.get(d.id));

  if (delay <= 0) {
    // Overdue — fire immediately (user missed it while phone was off)
    await self.registration.showNotification(d.notifTitle || '📅 Life Manual', _notifOpts(d)).catch(() => {});
    await _idb.del(d.id).catch(() => {});
    return;
  }
  if (delay > 25 * 60 * 60 * 1000) return; // >25h: skip, will re-arm next open

  const tid = setTimeout(async () => {
    await self.registration.showNotification(d.notifTitle || '📅 Life Manual', _notifOpts(d)).catch(() => {});
    await _idb.del(d.id).catch(() => {});
    _alarms.delete(d.id);
  }, delay);
  _alarms.set(d.id, tid);
}

async function _rearmAll() {
  try {
    const alarms = await _idb.all();
    await Promise.all(alarms.map(a => _arm(a)));
  } catch (e) {}
}

self.addEventListener("message", e => {
  const d = e.data;
  if (!d) return;

  if (d.type === "SET_ALARM") {
    _idb.save(d).catch(() => {});  // persist first so it survives SW restart
    _arm(d);
  }

  if (d.type === "CLEAR_ALARM") {
    _idb.del(d.id).catch(() => {});
    if (_alarms.has(d.id)) { clearTimeout(_alarms.get(d.id)); _alarms.delete(d.id); }
  }
});

// Incoming push from server — display it
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
