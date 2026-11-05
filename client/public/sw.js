/* কৃষিবাংলা service worker — offline support for the static build.
 * - Navigations: network first, fall back to the cached app shell.
 * - Same-origin assets (JS/CSS/fonts/images/JSON): cache first, filled on first use.
 * - Cross-origin requests (live weather, optional AI) are never cached.
 * - /api/: never cache-first. Read-only content/market/weather GETs are network-first with an
 *   offline fallback; everything else (login, AI, admin, diary) goes straight to the network.
 */
const API_OFFLINE_OK = ['/api/content/bundle', '/api/market/latest', '/api/market/history', '/api/weather', '/api/config'];
const VERSION = 'agribangla-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.includes('/api/')) {
    if (!API_OFFLINE_OK.some((p) => url.pathname.endsWith(p) || url.pathname.includes(`${p}`))) return;
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || Response.error())),
    );
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
