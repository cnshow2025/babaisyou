// Service Worker：把遊戲檔案存在裝置上，讓遊戲可以離線遊玩。
// 策略：先用快取中的檔案立即回應，同時在背景下載最新版本更新快取，
// 所以推送新版本後，下一次開啟就會使用新檔案。
'use strict';

const CACHE = 'baba-web-v2';
const FILES = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './js/engine.js',
  './js/levels.js',
  './js/render.js',
  './js/main.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req)
        .then(res => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached || (req.mode === 'navigate' ? cache.match('./index.html') : Response.error()));
      if (cached) {
        event.waitUntil(network);
        return cached;
      }
      return network;
    })
  );
});
