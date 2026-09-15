// v3 (build 10, achado real): um 502 transitório do Cloudflare ficou GUARDADO
// no cache v2 e passou a ser servido mesmo depois do 502 já ter passado — o
// import dinâmico de um chunk quebrava com "Failed to fetch dynamically
// imported module" e o app não abria mais. Trocar o nome força todo aparelho
// a começar de um cache vazio; o `activate` (abaixo) apaga o v2 poluído.
// v4 (15-set, Velocidade 6B): entraram /avatares/, /sorteio-assets/ e /sons/.
// Subir o nome é o que faz o activate deitar fora o cache antigo.
const CACHE_NAME = 'futty-v4';
const STATIC_ASSETS = ['/', '/home', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Cacheável (13-set, "Velocidade 3"): só GET da MESMA origem — nunca outra
// origem (Supabase Auth/Storage teriam respostas privadas/assinadas cacheadas
// por engano, além de o SW nem controlar essas origens) nem /api/ (dados
// dinâmicos; o cache local em localStorage já cobre isso, ver
// src/lib/cacheLocal.js). Dentro da mesma origem, só o que faz sentido reter:
// assets versionados (hash no nome — nunca fica obsoleto), ícones, fontes
// locais, o manifest e a navegação (index.html, network-first como sempre foi).
function ehCacheavel(url, request) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith('/api/')) return false;
  if (request.mode === 'navigate') return true;
  return (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    // Velocidade 6B (15-set): a mídia que o app busca da web em vez de levar no
    // pacote (ver PASTAS_REMOTAS em src/utils/avatar.js). Já sai com
    // Cache-Control immutable em public/_headers — retê-la aqui fecha o ciclo:
    // depois da primeira vez, avatares genéricos, arte do sorteio e sons deixam
    // de tocar na rede, inclusive offline.
    url.pathname.startsWith('/avatares/') ||
    url.pathname.startsWith('/sorteio-assets/') ||
    url.pathname.startsWith('/sons/') ||
    url.pathname === '/manifest.json' ||
    /\.(woff2?|ttf|otf|eot)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (!ehCacheavel(url, e.request)) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        // Só guarda resposta BOA (200, mesma origem, não-opaca) — nunca um
        // 4xx/5xx transitório da CDN (foi um 502 guardado aqui que quebrou o
        // build 9: ficava preso no cache e era servido para sempre depois).
        if (r.ok && r.type === 'basic') {
          const clone = r.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          return r;
        }
        // Resposta ruim: nunca guarda. Se houver uma cópia boa guardada de
        // antes, serve essa em vez do erro transitório; senão, devolve a
        // resposta ruim mesmo (não há nada melhor para oferecer).
        return caches.match(e.request).then((doCache) => doCache || r);
      })
      .catch(() => caches.match(e.request))
  );
});

self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? {};
  const title = data.title || 'Futty';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: data.url || '/home',
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.openWindow(e.notification.data || '/home')
  );
});
