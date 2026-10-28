// Futty v2.0 — Proxy do /api na própria origem (Cloudflare Pages Functions).
//
// VELOCIDADE 4. Na web, as telas (futtyapp.com.br) e o motor (Cloud Run, São
// Paulo) são origens diferentes — e origem diferente quer dizer preflight: um
// OPTIONS de ida e volta ANTES de cada chamada que leva Authorization. Esta
// função põe o /api debaixo do mesmo domínio das telas: o browser deixa de ver
// cross-origin e o preflight simplesmente não acontece. Não é cache nem truque
// — é a chamada deixar de precisar pedir licença.
//
// De brinde, o salto daqui até São Paulo corre na rede da Cloudflare, com
// ligação já quente, em vez de um TLS novo aberto desde o celular da pessoa.
//
// O APP NATIVO NÃO PASSA POR AQUI PARA OS DADOS (ver src/lib/api.js): no app o WebView tem
// origem própria (capacitor://localhost) e fala direto com o Cloud Run. Lá quem
// resolve o preflight é o maxAge do CORS (backend/server.js).
//
// A MÍDIA passa — do site E do app (src/utils/avatar.js troca o endereço do Cloud Run pelo do site): a foto é imutável
// por construção (o token do URL muda quando o conteúdo muda) e fica guardada na BORDA da Cloudflare. A segunda pessoa a
// ver a mesma foto, em Lisboa ou em Manaus, recebe-a do datacenter mais perto, sem a ida até São Paulo — e o motor nem fica sabendo.

const MOTOR_PADRAO = 'https://futty-api-685039278359.southamerica-east1.run.app';
const UM_ANO_S = 31536000;

/**
 * GET /api/media/<token>: da borda, se já está lá (Cache API da Cloudflare); senão do motor, e guarda. A chave do cache é o URL inteiro
 * (o token e o `?w=`/`sq`/`rc`): cada tamanho é uma entrada.
 * O CORS é aberto (`*`) SÓ aqui: o canvas da Figurinha e do cartão do sorteio lê estas fotos com crossOrigin, do site e do app
 * (capacitor://localhost, https://localhost), e a mesma resposta guardada serve a todos — um `Access-Control-Allow-Origin` com a origem
 * de quem pediu primeiro quebraria o canvas dos outros. É seguro: a imagem não leva sessão, o URL já é a autorização (token HMAC).
 */
async function servirMidia({ request, motor, url, waitUntil }) {
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const chave = new Request(url.toString(), { method: 'GET' });
  const comCors = (resposta, borda) => {
    const saida = new Response(resposta.body, resposta);
    saida.headers.set('Access-Control-Allow-Origin', '*');
    saida.headers.delete('Vary');
    saida.headers.set('X-Futty-Borda', borda);
    return saida;
  };

  if (cache) {
    const guardada = await cache.match(chave);
    if (guardada) return comCors(guardada, 'HIT');
  }
  // Sem Origin, sem Authorization, sem cookie: a foto é a mesma para todo mundo.
  const t0 = Date.now();
  const doMotor = await fetch(new Request(`${motor}${url.pathname}${url.search}`, { method: 'GET' }), { cf: { cacheEverything: true, cacheTtl: UM_ANO_S } });
  const msEdge = Date.now() - t0;
  const publica = doMotor.status === 200 && /\bpublic\b/.test(doMotor.headers.get('Cache-Control') || '');
  if (cache && publica) {
    const guardar = cache.put(chave, doMotor.clone()).catch(() => {});
    if (waitUntil) waitUntil(guardar);
  }
  const saida = comCors(doMotor, 'MISS');
  saida.headers.set('Server-Timing', [doMotor.headers.get('Server-Timing'), `edge;dur=${msEdge}`].filter(Boolean).join(', '));
  if (request.method === 'HEAD') return new Response(null, saida);
  return saida;
}

export async function onRequest({ request, env, waitUntil }) {
  const url = new URL(request.url);
  // API_ORIGIN deixa apontar um preview para outro motor (ex.: um futty-api-dev)
  // sem mexer no código. Sem ela, é a produção.
  const motor = String(env.API_ORIGIN || MOTOR_PADRAO).trim().replace(/\/+$/, '');

  const ehMidia = url.pathname.startsWith('/api/media/');
  if (ehMidia && (request.method === 'GET' || request.method === 'HEAD')) return servirMidia({ request, motor, url, waitUntil });
  if (ehMidia && request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD', 'Access-Control-Max-Age': '86400' } });
  }

  // new Request(destino, request) leva método, corpo e headers (Authorization e
  // Content-Type incluídos) e preserva a query, que já vem no url.search. Os
  // headers do pedido que ENTRA são imutáveis; os de um Request construído aqui
  // não são — é por isso que dá para limpar as duas linhas abaixo.
  const pedido = new Request(`${motor}${url.pathname}${url.search}`, request);

  // Sem Origin o motor trata isto como pedido servidor-a-servidor e nem entra na
  // conversa de CORS (server.js: `if (!origin) return callback(null, true)`).
  // O Referer sai junto: o motor não o usa e não há porquê contar-lhe que tela
  // a pessoa estava a ver.
  pedido.headers.delete('origin');
  pedido.headers.delete('referer');

  const t0 = Date.now();
  const resposta = await fetch(pedido);
  const msEdge = Date.now() - t0;

  const saida = new Response(resposta.body, resposta);

  // O Server-Timing do motor (app;dur=…) passa intacto e ganha companhia: `edge`
  // é o tempo do salto daqui até São Paulo. Com os dois lado a lado, o
  // diagnóstico separa "o motor está lento" de "a rede até São Paulo é longa"
  // sem ninguém ter de adivinhar.
  const doMotor = resposta.headers.get('Server-Timing');
  saida.headers.set('Server-Timing', [doMotor, `edge;dur=${msEdge}`].filter(Boolean).join(', '));

  // Dados de uma pessoa, num pedido com Authorization: não podem ficar em cache partilhado nenhum (a mídia, que pode, saiu lá em cima).
  saida.headers.set('Cache-Control', 'no-store');

  return saida;
}
