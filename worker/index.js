// ─── Life Manual — Cloudflare Worker ──────────────────────────────────────
// Handles: AI chat proxy  +  Web Push notifications for scheduled events
//
// KV binding name : LM_KV
// AI binding name : AI
// Cron schedule   : * * * * *  (every 1 minute)

const VAPID_PUBLIC_KEY = 'BMvjBh3udeYq2FstcB8Ru2njHwrMKmR4OKeYCH94inrO2RvuTWQc29l2iBQJasiBrAVq-BgRzY9IAbm9fWyUaZw';
// VAPID_PRIVATE_JWK is stored as a Cloudflare Secret (env.VAPID_PRIVATE_JWK) — not hardcoded here.
const VAPID_SUBJECT = 'mailto:jjmoontravel@gmail.com';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (data, s=200) => new Response(JSON.stringify(data), { status:s, headers:{...CORS,'Content-Type':'application/json'} });

// ─── Crypto helpers ────────────────────────────────────────────────────────
const enc = new TextEncoder();

function from64u(s) {
  const b64 = (s + '==='.slice((s.length+3)%4||4)).replace(/-/g,'+').replace(/_/g,'/');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}
function to64u(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
function concat(...bufs) {
  const total = bufs.reduce((n,b) => n + (b.byteLength ?? b.length), 0);
  const out = new Uint8Array(total); let i = 0;
  for (const b of bufs) { const u = b instanceof Uint8Array ? b : new Uint8Array(b); out.set(u, i); i += u.length; }
  return out;
}

// HKDF-Extract: PRK = HMAC-SHA-256(salt, ikm)
async function hkdfExtract(salt, ikm) {
  const key = await crypto.subtle.importKey('raw', salt.byteLength ? salt : new Uint8Array(32), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, ikm));
}

// HKDF-Expand: OKM = T(1)||T(2)||...  trimmed to `len` bytes
async function hkdfExpand(prk, info, len) {
  const key = await crypto.subtle.importKey('raw', prk, {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  let prev = new Uint8Array(0), out = new Uint8Array(0);
  for (let i = 1; out.length < len; i++) {
    const T = new Uint8Array(await crypto.subtle.sign('HMAC', key, concat(prev, info, new Uint8Array([i]))));
    out = concat(out, T); prev = T;
  }
  return out.slice(0, len);
}

// Encrypt push payload per RFC 8291 (Content-Encoding: aes128gcm)
async function encryptPush(subscription, payloadStr) {
  const auth  = from64u(subscription.keys.auth);    // 16 bytes — subscriber auth secret
  const uaPub = from64u(subscription.keys.p256dh);  // 65 bytes — subscriber public key

  // Ephemeral server key pair
  const eph = await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'}, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey)); // 65 bytes

  // ECDH → shared secret
  const uaPubKey = await crypto.subtle.importKey('raw', uaPub, {name:'ECDH',namedCurve:'P-256'}, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:uaPubKey}, eph.privateKey, 256));

  // Salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // IKM = HKDF(salt=auth, ikm=ecdhSecret, info="WebPush: info\0"||uaPub||asPub, len=32)
  const prk1 = await hkdfExtract(auth, ecdhSecret);
  const ikm  = await hkdfExpand(prk1, concat(enc.encode('WebPush: info\0'), uaPub, asPub), 32);

  // CEK + nonce from salt
  const prk2  = await hkdfExtract(salt, ikm);
  const cek   = await hkdfExpand(prk2, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdfExpand(prk2, enc.encode('Content-Encoding: nonce\0'), 12);

  // AES-128-GCM encrypt  (payload + 0x02 record delimiter)
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const plain  = concat(enc.encode(payloadStr), new Uint8Array([2]));
  const ct     = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce}, aesKey, plain));

  // Body: salt(16) + rs(4=4096) + keyid_len(1) + keyid(65) + ciphertext
  const rs = new Uint8Array(4); new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}

// Build + sign VAPID JWT (RFC 8292)
// privJwk is read from env.VAPID_PRIVATE_JWK (Cloudflare Secret)
async function vapidJwt(endpoint, privJwkStr) {
  const origin = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const hdr  = to64u(enc.encode(JSON.stringify({typ:'JWT',alg:'ES256'})));
  const body = to64u(enc.encode(JSON.stringify({aud:origin,exp:now+43200,sub:VAPID_SUBJECT})));
  const unsigned = `${hdr}.${body}`;
  const privKey = await crypto.subtle.importKey('jwk', JSON.parse(privJwkStr), {name:'ECDSA',namedCurve:'P-256'}, false, ['sign']);
  const sig = await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'}, privKey, enc.encode(unsigned));
  return `${unsigned}.${to64u(new Uint8Array(sig))}`;
}

// Send a single Web Push notification
async function sendPush(subscription, payload, privJwkStr) {
  const body = await encryptPush(subscription, JSON.stringify(payload));
  const jwt  = await vapidJwt(subscription.endpoint, privJwkStr);
  const res  = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'high',
    },
    body,
  });
  return res.status; // 201 = delivered, 410 = subscription expired
}

// ─── Cron: fire every minute, check for events due in ~10 min ──────────────
async function checkAlarms(env) {
  const index = JSON.parse(await env.LM_KV.get('users') || '[]');
  const now = Date.now();

  for (const userId of index) {
    const raw = await env.LM_KV.get('user:' + userId);
    if (!raw) continue;
    const data = JSON.parse(raw);
    if (!data.subscription || !data.events?.length) continue;

    for (const ev of data.events) {
      // Compute next fire time based on repeat
      const times = nextEventTimes(ev, now);
      for (const { fireAt, label } of times) {
        // Fire if this alarm falls within the current 1-minute cron window (with 30s buffer)
        if (fireAt >= now - 30000 && fireAt < now + 90000) {
          const status = await sendPush(data.subscription, {
            title: '📅 Life Manual',
            body: `${ev.emoji} ${ev.title} ${label}`,
            icon: '/icon-192.png',
            data: { tab: 'schedule' },
          }, env.VAPID_PRIVATE_JWK);
          // 410 = expired subscription, remove it
          if (status === 410) {
            data.subscription = null;
            await env.LM_KV.put('user:' + userId, JSON.stringify(data));
          }
        }
      }
    }
  }
}

// Returns up to 2 fire times for an event: 10-min warning + at-start
function nextEventTimes(ev, now) {
  const today = new Date(now);
  const pad = n => String(n).padStart(2, '0');
  const todayKey = today.getFullYear()+'-'+pad(today.getMonth()+1)+'-'+pad(today.getDate());
  const dow = today.getDay();
  const results = [];

  let targetDate = null;
  if (ev.repeat === 'daily') targetDate = todayKey;
  else if (ev.repeat === 'weekly') {
    const evDow = new Date(ev.date + 'T12:00').getDay();
    if (evDow === dow) targetDate = todayKey;
  } else {
    if (ev.date === todayKey) targetDate = todayKey;
  }

  if (!targetDate) return results;
  const [h, m] = ev.time.split(':').map(Number);
  const evMs = new Date(targetDate + 'T' + pad(h) + ':' + pad(m) + ':00').getTime();
  if (evMs - 10*60*1000 > now - 90000) results.push({ fireAt: evMs - 10*60*1000, label: 'in 10 minutes!' });
  if (evMs > now - 90000) results.push({ fireAt: evMs, label: 'is starting now!' });
  return results;
}

// ─── Request router ────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);

    // ── POST /push/register — save push subscription ──
    if (url.pathname === '/push/register' && request.method === 'POST') {
      const { userId, subscription } = await request.json();
      if (!userId || !subscription) return json({ error: 'missing fields' }, 400);
      const existing = JSON.parse(await env.LM_KV.get('user:' + userId) || '{}');
      existing.subscription = subscription;
      existing.events = existing.events || [];
      await env.LM_KV.put('user:' + userId, JSON.stringify(existing));
      // Add to user index
      const idx = JSON.parse(await env.LM_KV.get('users') || '[]');
      if (!idx.includes(userId)) { idx.push(userId); await env.LM_KV.put('users', JSON.stringify(idx)); }
      return json({ ok: true });
    }

    // ── POST /push/events — sync events list ──
    if (url.pathname === '/push/events' && request.method === 'POST') {
      const { userId, events } = await request.json();
      if (!userId) return json({ error: 'missing userId' }, 400);
      const existing = JSON.parse(await env.LM_KV.get('user:' + userId) || '{}');
      existing.events = events || [];
      await env.LM_KV.put('user:' + userId, JSON.stringify(existing));
      return json({ ok: true });
    }

    // ── POST / — AI chat proxy (existing) ──
    if (url.pathname === '/' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'bad request' }, 400); }
      const { message, name = 'friend', character = 'Barney' } = body;
      if (!message) return json({ error: 'missing message' }, 400);
      const system = `You are ${character}, a warm and practical life coach inside the Life Manual app. The user's name is ${name}. Keep replies to 2–4 sentences. Use 1 relevant emoji at the end. Be encouraging and specific. No filler phrases like "Great question!" — just answer directly and helpfully.`;
      const aiRes = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [{ role:'system', content:system }, { role:'user', content:message }],
        max_tokens: 200,
      });
      return json({ reply: aiRes?.response ?? "I'm here for you! 💜" });
    }

    return new Response('Not found', { status: 404, headers: CORS });
  },

  async scheduled(event, env) {
    await checkAlarms(env);
  },
};
