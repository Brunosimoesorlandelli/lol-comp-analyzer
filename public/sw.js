// ─── RiftForge Service Worker ────────────────────────────────────────────────
// Estratégia: Cache-first para assets estáticos, Network-first para DDragon API

const CACHE_NAME    = "riftforge-v1";
const DDRAGON_CACHE = "riftforge-ddragon-v1";

// Assets do app que queremos cachear para funcionamento offline
const APP_ASSETS = [
  "/",
  "/index.html",
];

// Instala e cacheia os assets principais
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Limpa caches antigos ao ativar
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== DDRAGON_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // ── DDragon (imagens e dados de campeões) — Cache-first com fallback ────────
  if (url.hostname === "ddragon.leagueoflegends.com") {
    event.respondWith(
      caches.open(DDRAGON_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            // Cacheia apenas respostas OK (não erros)
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => cached); // offline: retorna cache mesmo expirado
        })
      )
    );
    return;
  }

  // ── Assets do app — Cache-first ─────────────────────────────────────────────
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const networkFetch = fetch(event.request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache =>
              cache.put(event.request, response.clone())
            );
          }
          return response;
        });
        return cached || networkFetch;
      })
    );
    return;
  }

  // Resto: apenas network
  event.respondWith(fetch(event.request));
});
