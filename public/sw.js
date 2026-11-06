// GELOCRIM PWA — Service Worker
// Estratégia: network-first para HTML/JS/CSS, cache-first para assets estáticos
const CACHE_NAME = 'gelocrim-pwa-v1';
const STATIC_ASSETS = [
  '/pwa',
  '/manifest.json',
];

// Instala e pré-cacheia assets essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  // Ativa imediatamente sem esperar abas antigas fecharem
  self.skipWaiting();
});

// Limpa caches antigos ao ativar
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first para tudo relacionado ao app
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignora requests para Supabase e outros domínios externos
  if (!url.origin.includes(self.location.origin)) return;

  // Ignora métodos não-GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Atualiza cache com resposta fresca
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline: tenta servir do cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Fallback para /pwa se offline e rota não cacheada
          if (url.pathname.startsWith('/pwa')) {
            return caches.match('/pwa');
          }
        });
      })
  );
});

// Notifica clientes quando uma nova versão está disponível
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
