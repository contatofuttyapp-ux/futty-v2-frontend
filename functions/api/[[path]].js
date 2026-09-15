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
// O APP NATIVO NÃO PASSA POR AQUI (ver src/lib/api.js): no app o WebView tem
// origem própria (capacitor://localhost) e fala direto com o Cloud Run. Lá quem
// resolve o preflight é o maxAge do CORS (backend/server.js).
//
// A mídia também não passa por aqui: os endereços que o motor devolve já são
// absolutos (https://futty-api…/api/media/<token>).

const MOTOR_PADRAO = 'https://futty-api-685039278359.southamerica-east1.run.app';

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  // API_ORIGIN deixa apontar um preview para outro motor (ex.: um futty-api-dev)
  // sem mexer no código. Sem ela, é a produção.
  const motor = String(env.API_ORIGIN || MOTOR_PADRAO).trim().replace(/\/+$/, '');

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

  // VELOCIDADE 6B (15-set): a mídia é imutável por construção — o URL é um token
  // assinado que muda quando o conteúdo muda (ver backend/utils/mediaToken.js), e
  // o motor já responde `Cache-Control: public, max-age=1 ano, immutable`. Aqui
  // diz-se à Cloudflare para a guardar na BORDA: a segunda pessoa a ver a mesma
  // foto recebe-a do datacenter mais perto dela, sem o salto até São Paulo.
  // Só a mídia — tudo o resto leva Authorization e é de uma pessoa só.
  const ehMidia = url.pathname.startsWith('/api/media/');
  const opcoes = ehMidia ? { cf: { cacheEverything: true, cacheTtl: 31536000 } } : undefined;

  const t0 = Date.now();
  const resposta = await fetch(pedido, opcoes);
  const msEdge = Date.now() - t0;

  const saida = new Response(resposta.body, resposta);

  // O Server-Timing do motor (app;dur=…) passa intacto e ganha companhia: `edge`
  // é o tempo do salto daqui até São Paulo. Com os dois lado a lado, o
  // diagnóstico separa "o motor está lento" de "a rede até São Paulo é longa"
  // sem ninguém ter de adivinhar.
  const doMotor = resposta.headers.get('Server-Timing');
  saida.headers.set('Server-Timing', [doMotor, `edge;dur=${msEdge}`].filter(Boolean).join(', '));

  // Dados de uma pessoa, num pedido com Authorization: não podem ficar em cache
  // partilhado nenhum. A exceção é /api/media/<token>, que é imagem e já vem com
  // o Cache-Control do motor — forçar no-store nela faria o feed rebuscar cada
  // foto a cada rolagem.
  if (!ehMidia) {
    saida.headers.set('Cache-Control', 'no-store');
  }

  return saida;
}
