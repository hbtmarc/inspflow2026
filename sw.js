const CACHE_VERSION = 'inspflow-v2.0.0';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const HTML_CACHE = `${CACHE_VERSION}-html`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './offline.html',
  './404.html',
  './manifest.webmanifest',
  './app.css',
  './app.js',
  './story.json',
  './assets/img/inspflow/menu-atividades.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => !name.startsWith(CACHE_VERSION))
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isStaticRequest(request) {
  const { destination, url } = request;
  if (['style', 'script', 'image', 'font'].includes(destination)) return true;

  return (
    url.includes('.json') ||
    url.includes('.webmanifest') ||
    url.includes('.svg') ||
    url.includes('.css') ||
    url.includes('.js')
  );
}

async function networkFirstHtml(request) {
  const htmlCache = await caches.open(HTML_CACHE);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      htmlCache.put(request, response.clone());
    }
    return response;
  } catch {
    const cachedByRequest = await htmlCache.match(request);
    if (cachedByRequest) return cachedByRequest;

    const shellCache = await caches.open(SHELL_CACHE);
    const cachedIndex = await shellCache.match('./index.html');
    if (cachedIndex) return cachedIndex;

    const offlinePage = await shellCache.match('./offline.html');
    if (offlinePage) return offlinePage;

    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function cacheFirstStatic(request) {
  const staticCache = await caches.open(STATIC_CACHE);
  const cached = await staticCache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      staticCache.put(request, response.clone());
    }
    return response;
  } catch {
    const shellCache = await caches.open(SHELL_CACHE);
    const fallback = await shellCache.match('./offline.html');
    return fallback || new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const isNavigation = request.mode === 'navigate' || request.destination === 'document';
  if (isNavigation) {
    event.respondWith(networkFirstHtml(request));
    return;
  }

  if (isStaticRequest(request)) {
    event.respondWith(cacheFirstStatic(request));
  }
});
