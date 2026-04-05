/**
 * service-worker.js — VoiceCalc PWA Service Worker
 * ──────────────────────────────────────────────────
 * Strategy: Cache-First for static assets, Network-First for HTML.
 * Enables full offline support after first load.
 */

'use strict';

const CACHE_NAME    = 'voicecalc-v1.0.0';
const DYNAMIC_CACHE = 'voicecalc-dynamic-v1';

/* ── Assets to pre-cache ──────────────────────────── */
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/calculator.js',
  '/js/finance.js',
  '/js/voice.js',
  '/js/history.js',
  '/manifest.json',
  '/assets/icon.png',
  // Google Fonts (cached dynamically on first load)
];

/* ══════════════════════════════════════════════════
   Install — Pre-cache static assets
══════════════════════════════════════════════════ */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing VoiceCalc v1.0.0');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Pre-cache failed for some assets:', err);
        // Don't block install if a non-critical asset fails
        return self.skipWaiting();
      })
  );
});

/* ══════════════════════════════════════════════════
   Activate — Clean up old caches
══════════════════════════════════════════════════ */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        const deleteOld = cacheNames
          .filter(name => name !== CACHE_NAME && name !== DYNAMIC_CACHE)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          });
        return Promise.all(deleteOld);
      })
      .then(() => self.clients.claim())
  );
});

/* ══════════════════════════════════════════════════
   Fetch — Cache strategies
══════════════════════════════════════════════════ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests from same origin or known CDNs
  if (request.method !== 'GET') return;

  // Google Fonts — Stale-While-Revalidate
  if (url.hostname === 'fonts.googleapis.com' ||
      url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    return;
  }

  // HTML pages — Network-First (keeps content fresh)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets — Cache-First
  event.respondWith(cacheFirst(request));
});

/* ── Strategy: Cache-First ────────────────────────── */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    // Return offline fallback if available
    return offlineFallback(request);
  }
}

/* ── Strategy: Network-First ─────────────────────── */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await caches.match(request);
    return cached || offlineFallback(request);
  }
}

/* ── Strategy: Stale-While-Revalidate ───────────── */
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Fetch in background regardless
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

/* ── Offline Fallback ────────────────────────────── */
async function offlineFallback(request) {
  const cached = await caches.match('/index.html');
  if (cached) return cached;

  // Minimal offline page
  return new Response(
    `<!DOCTYPE html>
    <html><head><meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Offline — VoiceCalc</title>
    <style>
      body { font-family:sans-serif; background:#06060f; color:#f0f0ff;
             display:flex;align-items:center;justify-content:center;
             min-height:100vh;margin:0;text-align:center; }
      h1 { font-size:1.5rem; } p { opacity:.6; }
    </style></head><body>
    <div><h1>📵 You're offline</h1>
    <p>VoiceCalc needs an internet connection on first load.</p>
    <p>Please reconnect and refresh.</p></div>
    </body></html>`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}

/* ══════════════════════════════════════════════════
   Background Sync (future-ready)
══════════════════════════════════════════════════ */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-history') {
    console.log('[SW] Background sync: history');
    // Placeholder for future cloud sync
  }
});

/* ══════════════════════════════════════════════════
   Push Notifications (future-ready)
══════════════════════════════════════════════════ */
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'VoiceCalc', body: 'Notification' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body,
      icon:  '/assets/icon.png',
      badge: '/assets/icon.png',
    })
  );
});
