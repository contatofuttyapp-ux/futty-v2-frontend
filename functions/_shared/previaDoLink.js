// Futty v2.0 — Rodada 29J, achado 121: a prévia do link (WhatsApp, iMessage, redes) era sempre a
// MESMA, inclusive no convite — o app é SPA e esses robôs não executam JavaScript, só leem o HTML
// cru que a Cloudflare entrega. O index.html tem og:title/og:description/og:image corretos, mas são
// os ÚNICOS: nenhuma página (/p/, /s/, /c/, /convite/) tinha os seus. O sorteio não dizia o time, o
// convite — o que faz o app crescer — não dizia quem está convidando, o campeonato não dizia o nome.
//
// Busca O MÍNIMO no motor (uma leitura pública, sem sessão) e troca <title> + as metatags antes de
// entregar — só para quem parece ser um desses robôs (`ehRastreador`); uma pessoa abrindo o link no
// navegador nunca paga a ida extra ao motor, o pedido segue reto para o SPA de sempre.
//
// As funções de dados (ehRastreador, caminhoDoP, previaDe*) são puras — testadas em
// scripts/unidade/previa-do-link.test.mjs. `aplicarPrevia` usa HTMLRewriter (global do runtime da
// Cloudflare, não existe no Node puro) e por isso fica fora do que o teste de unidade exercita.

export const MOTOR_PADRAO = 'https://futty-api-685039278359.southamerica-east1.run.app';

// facebookexternalhit/Facebot = o robô da Meta por baixo do WhatsApp E do Facebook — é UM só, dois
// nomes. O resto são os outros apps/redes que também pré-buscam a prévia do link.
const RASTREADORES = /facebookexternalhit|Facebot|WhatsApp|Twitterbot|TelegramBot|Slackbot|LinkedInBot|Discordbot|SkypeUriPreview|Pinterest|redditbot/i;

export function ehRastreador(userAgent) {
  return RASTREADORES.test(userAgent || '');
}

/** GET a um caminho público do motor. null em qualquer falha — a prévia nunca pode travar a página. */
export async function motorJson(apiOrigin, caminho) {
  try {
    const motor = String(apiOrigin || MOTOR_PADRAO).trim().replace(/\/+$/, '');
    const r = await fetch(`${motor}${caminho}`);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/**
 * O que /p/* pede ao motor, a partir do caminho: "/p/campeonato/<slug>/<id>" (vista do campeonato)
 * ou "/p/<slug>/<gameId>" (sorteio) — o mesmo "/p/*" cobre as duas páginas (App.jsx).
 */
export function caminhoDoP(pathname) {
  const partes = String(pathname || '').split('/').filter(Boolean); // ['p', ...]
  if (partes[0] !== 'p') return null;
  if (partes[1] === 'campeonato' && partes[2] && partes[3]) {
    return { tipo: 'campeonato', caminho: `/api/p/campeonato/${partes[2]}/${partes[3]}` };
  }
  if (partes[1] && partes[2]) {
    return { tipo: 'sorteio', caminho: `/api/p/${partes[2]}` };
  }
  return null;
}

/** O código de /s/<código> ou o token de /c/<token> e /convite/<token> — sempre o 2º segmento. */
export function segundoSegmento(pathname) {
  const partes = String(pathname || '').split('/').filter(Boolean);
  return partes[1] || null;
}

export function previaDoSorteio(dados) {
  const nome = dados?.equipa?.nome;
  if (!nome) return null;
  return {
    titulo: `${nome} · sorteio dos times`,
    descricao: 'Sorteio justo, ranking e figurinha de colecionador.',
    imagem: dados.equipa.logo_url || null,
  };
}

export function previaDoCampeonato(dados) {
  const nomeTime = dados?.equipa?.nome;
  const camp = dados?.campeonato;
  if (!nomeTime || !camp) return null;
  const formato = camp.formato === 'mata' ? 'mata-mata' : 'pontos corridos';
  const times = Array.isArray(camp.times) ? camp.times.length : 0;
  return {
    titulo: `${camp.nome ? `${camp.nome} · ` : ''}${nomeTime} · campeonato`,
    descricao: `${times} ${times === 1 ? 'time' : 'times'} · ${formato}.`,
    imagem: dados.equipa.logo_url || null,
  };
}

export function previaDoConvite(dados) {
  const nome = dados?.team?.nome;
  if (!dados?.valido || !nome) return null;
  return {
    titulo: `${nome} · convite para o time`,
    // A frase fixa de boas-vindas da casa (VOZ-FUTTY.md §1) — a mesma que o time vê ao entrar.
    descricao: 'Aqui a gente confirma presença, sorteia os times, guarda o ranking e faz sua figurinha.',
    imagem: dados.team.logo_url || null,
  };
}

/** Troca <title>, a description e og:title/og:description/og:image — só o que `previa` trouxer. */
export function aplicarPrevia(resposta, previa) {
  if (!previa) return resposta;
  const rewriter = new HTMLRewriter();
  if (previa.titulo) {
    rewriter.on('title', { element(el) { el.setInnerContent(previa.titulo); } });
    rewriter.on('meta[property="og:title"]', { element(el) { el.setAttribute('content', previa.titulo); } });
  }
  if (previa.descricao) {
    rewriter.on('meta[name="description"]', { element(el) { el.setAttribute('content', previa.descricao); } });
    rewriter.on('meta[property="og:description"]', { element(el) { el.setAttribute('content', previa.descricao); } });
  }
  if (previa.imagem) {
    rewriter.on('meta[property="og:image"]', { element(el) { el.setAttribute('content', previa.imagem); } });
  }
  return rewriter.transform(resposta);
}

/** /p/* — sorteio ou campeonato. */
export async function manipularP({ request, env, next }) {
  if (!ehRastreador(request.headers.get('User-Agent'))) return next();
  const url = new URL(request.url);
  const achado = caminhoDoP(url.pathname);
  if (!achado) return next();
  const dados = await motorJson(env.API_ORIGIN, achado.caminho);
  const previa = achado.tipo === 'campeonato' ? previaDoCampeonato(dados) : previaDoSorteio(dados);
  const resposta = await next();
  return aplicarPrevia(resposta, previa);
}

/** /s/<código> — o link curto do sorteio; resolve para o jogo e usa a mesma prévia do sorteio. */
export async function manipularS({ request, env, next }) {
  if (!ehRastreador(request.headers.get('User-Agent'))) return next();
  const url = new URL(request.url);
  const codigo = segundoSegmento(url.pathname);
  if (!codigo) return next();
  const alvo = await motorJson(env.API_ORIGIN, `/api/s/${encodeURIComponent(codigo)}`);
  const resposta = await next();
  if (!alvo?.gameId) return resposta;
  const dados = await motorJson(env.API_ORIGIN, `/api/p/${alvo.gameId}`);
  return aplicarPrevia(resposta, previaDoSorteio(dados));
}

/** /c/<token> e /convite/<token> — o mesmo convite, dois formatos de link (teams.js aceita os dois). */
export async function manipularConvite({ request, env, next }) {
  if (!ehRastreador(request.headers.get('User-Agent'))) return next();
  const url = new URL(request.url);
  const token = segundoSegmento(url.pathname);
  if (!token) return next();
  const dados = await motorJson(env.API_ORIGIN, `/api/convite/${encodeURIComponent(token)}`);
  const resposta = await next();
  return aplicarPrevia(resposta, previaDoConvite(dados));
}
