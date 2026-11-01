/* Offline shell for Sleek Kids. Bump VERSION when any shell file changes. */

const VERSION = 'kids-v1';
const SHELL = [
  './',
  './index.html',
  './css/kids.css',
  './js/app.js',
  './js/ui.js',
  './js/games.js',
  './js/homework.js',
  './js/make.js',
  './js/learn.js',
  './data/activities.json',
  './data/stories.json',
  './data/questions.json',
  './data/syllabus.json',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) =>
      // Individual failures must not abort the whole install.
      Promise.allSettled(SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' })))),
    ).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache the AI endpoints.
  if (url.pathname.includes('/api/')) return;

  // Navigations: network first, fall back to the cached shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html').then((r) => r || Response.error())),
    );
    return;
  }

  // Everything else: serve from cache immediately, refresh in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached || Response.error());
      return cached || network;
    }),
  );
});
