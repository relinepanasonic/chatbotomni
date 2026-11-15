// Sales Chat service worker. It makes the app installable and keeps its look and icons ready.
// It never stores chat, data or API answers: the sales team always sees live numbers.
const VERSION = 'sales-chat-v1';
const SHELL = ['/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // only the look of the app is cached: icons and Next.js build files. Everything else goes to the network.
  const isStatic = url.pathname.startsWith('/_next/static/') || SHELL.includes(url.pathname);
  if (!isStatic) return;
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    })),
  );
});
