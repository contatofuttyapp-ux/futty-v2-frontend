// Futty v2.0 — Telemetria ANÔNIMA de velocidade (Rodada 28, bloco E).
//
// Substitui o botão de Diagnóstico para todo mundo: quando uma tela fecha (a pessoa foi para outra),
// o app manda — uma vez por tela por sessão — quanto ela levou para ficar útil (a pintura sem F de
// carregamento, a mesma régua do Diagnóstico) e quanto cada chamada ao motor custou nela.
//
// Anônima por construção:
//   · sem Authorization, sem cookie: o motor não tem como saber de quem é;
//   · telas e rotas seguem como PADRÃO (/equipa/:slug/ranking) — slug de time, id, token, e-mail e
//     número nunca saem do aparelho (o motor normaliza de novo, com a mesma regra);
//   · o aparelho vai como faixa genérica ("android-medio"), nunca modelo nem id.
//
// Chega depois da 1ª pintura (components/MedidorNavegacao.jsx) — o arranque tem teto de 320 KiB — e
// se liga à caixa-preta por registrarFechoDeTela.
/* global __VERSAO_WEB__ */
import { Capacitor } from '@capacitor/core';
import { registrarFechoDeTela, estadoDaCaixaPreta } from './diagnostico';

// Mesmo destino do lib/api.js: relativo no site (a função da Cloudflare leva ao motor), absoluto no
// app da loja e no dev. Calculado na hora de mandar (o teste de unidade roda sem o import.meta.env).
function destino() {
  const env = import.meta.env || {};
  const motor = String(env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  return `${!Capacitor.isNativePlatform() && env.PROD ? '' : motor}/api/telemetria`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PALAVRA_DE_ROTA = /^[a-z]+(-[a-z]+)*$/;
const ANTES_DO_SLUG = new Set(['teams', 'equipas', 'equipa', 'admin']);
const MAX_ROTAS = 20;

/**
 * O padrão de uma rota, sem nada que identifique alguém ou algum time — a MESMA regra do motor
 * (backend/utils/telemetria.js): /equipa/missa-de-quinta-ogqq6/ranking → /equipa/:slug/ranking.
 */
export function normalizarRota(caminho) {
  const partes = String(caminho || '').split(/[?#]/)[0].split('/');
  return partes.map((seg, i) => {
    if (!seg) return seg;
    const anterior = partes[i - 1];
    if (ANTES_DO_SLUG.has(anterior)) return ':slug';
    if (anterior === 'p' && seg !== 'campeonato' && !UUID.test(seg)) return ':slug';
    if (anterior === 'campeonato' && partes[i - 2] === 'p') return ':slug';
    if (UUID.test(seg)) return ':id';
    if (seg.length <= 24 && PALAVRA_DE_ROTA.test(seg)) return seg;
    return ':x';
  }).join('/').slice(0, 100);
}

/** "android-medio": plataforma + faixa grossa de memória (ou núcleos). Nunca modelo. */
export function faixaDoAparelho({ plataforma, memoriaGb, nucleos }) {
  let faixa = null;
  if (typeof memoriaGb === 'number' && memoriaGb > 0) faixa = memoriaGb <= 2 ? 'baixo' : memoriaGb <= 4 ? 'medio' : 'alto';
  else if (typeof nucleos === 'number' && nucleos > 0) faixa = nucleos <= 4 ? 'baixo' : nucleos <= 6 ? 'medio' : 'alto';
  return faixa && ['ios', 'android', 'web'].includes(plataforma) ? `${plataforma}-${faixa}` : null;
}

/** "1.0.0 (34)" no app da loja; "web 3f2a1b9" (o commit do build) no site. */
export function versaoDoApp({ plataforma, infoApp, versaoWeb }) {
  if (plataforma !== 'web') return infoApp?.version ? `${infoApp.version}${infoApp.build ? ` (${infoApp.build})` : ''}`.slice(0, 40) : null;
  return `web ${versaoWeb || 'local'}`.slice(0, 40);
}

/**
 * O que vai ao motor sobre uma tela que fechou — só estes campos, nada mais. `null` se a tela nem
 * chegou a pintar (a pessoa saiu antes): melhor sem número do que com o número de outra coisa.
 */
export function montarEnvio(nav, ctx) {
  const msUtil = nav?.registo?.msPintura;
  if (!Number.isFinite(msUtil)) return null;
  const chamadas = {};
  for (const c of nav.chamadas || []) {
    if (typeof c?.rota !== 'string' || !Number.isFinite(c.ms)) continue;
    const rota = normalizarRota(c.rota);
    if (!rota.startsWith('/api/')) continue;
    const ms = Math.round(c.ms);
    // Duas chamadas ao mesmo padrão ficam com a pior: é a que segurou a tela.
    if (chamadas[rota] ? chamadas[rota].ms >= ms : Object.keys(chamadas).length >= MAX_ROTAS) continue;
    chamadas[rota] = { ms, motor: Number.isFinite(c.motorMs) ? Math.round(c.motorMs) : null };
  }
  const conexao = ctx.conexao || null;
  return {
    tela: normalizarRota(nav.rota),
    ms_util: Math.min(120000, Math.round(msUtil)),
    chamadas,
    versao_app: versaoDoApp(ctx),
    plataforma: ctx.plataforma,
    rede: (conexao?.type && conexao.type !== 'unknown' ? conexao.type : conexao?.effectiveType) || null,
    aparelho: faixaDoAparelho(ctx),
  };
}

function contexto() {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  return {
    plataforma: Capacitor.getPlatform(),
    infoApp: estadoDaCaixaPreta().infoApp,
    versaoWeb: typeof __VERSAO_WEB__ !== 'undefined' ? __VERSAO_WEB__ : null,
    conexao: nav.connection ? { type: nav.connection.type, effectiveType: nav.connection.effectiveType } : null,
    memoriaGb: nav.deviceMemory,
    nucleos: nav.hardwareConcurrency,
  };
}

// Uma vez por tela por sessão (a sessão é esta abertura do app).
const enviadas = new Set();

// Corre DENTRO da troca de rota (lib/diagnostico.js → marcarNavegacao): nunca pode lançar.
function aoFecharTela(nav) {
  try {
    const envio = montarEnvio(nav, contexto());
    if (!envio || enviadas.has(envio.tela)) return;
    enviadas.add(envio.tela);
    // Sem Authorization e sem cookie, de propósito. Falhar aqui não é problema de ninguém.
    fetch(destino(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit', body: JSON.stringify(envio) }).catch(() => {});
  } catch { /* medição: nunca derruba a navegação */ }
}

registrarFechoDeTela(aoFecharTela);
