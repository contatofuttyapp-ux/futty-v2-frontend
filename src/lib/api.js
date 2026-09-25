// Futty v2.0 — Cliente da API backend (com JWT do utilizador)
import { Capacitor } from '@capacitor/core';
import { obterSupabase } from './supabaseAsync';
import { registarChamada, lerServerTiming, marcarDadosDaTela } from './diagnostico';

// VELOCIDADE 4 — de onde sai o /api depende de onde a tela está a correr:
//
//   web em produção  → caminho RELATIVO (''). O /api passa a viver no mesmo
//     domínio das telas, servido pela Cloudflare Pages Function
//     (functions/api/[[path]].js), que reencaminha para o Cloud Run. Mesma
//     origem = o browser não faz preflight nenhum. Cada chamada perde o OPTIONS
//     de ida e volta que a antecedia.
//
//   app nativo → URL do Cloud Run. O WebView tem origem própria
//     (capacitor://localhost no iOS, https://localhost no Android) e não existe
//     "mesma origem" possível: o que torna o preflight barato lá é o
//     Access-Control-Max-Age do backend (server.js), que o faz acontecer uma
//     vez em vez de a cada pedido.
//
//   dev (web) → URL do .env (localhost:3001 ou o IP da máquina no modo rede).
//     A Pages Function não corre no vite dev server; manter absoluto aqui é o
//     que deixa o LIGAR-FUTTY.bat e o teste no celular funcionarem como sempre.
//
// A mídia NÃO segue esta regra: continua a sair de VITE_API_URL/VITE_ASSETS_URL
// em utils/avatar.js, com URL absoluta, para não perder o cache longo.
const MOTOR = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const API_URL = !Capacitor.isNativePlatform() && import.meta.env.PROD ? '' : MOTOR;

// Resolução de assets: fonte única em utils/avatar.js (re-exportado como assetUrl).
export { urlAsset as assetUrl } from '../utils/avatar';

// VELOCIDADE 7B — o mesmo GET em paralelo é UMA ida à rede: quem chega com um
// pedido igual ainda no ar recebe a mesma promessa. O caso real: o
// pré-aquecimento pedia /api/me/selos (e o ranking) e a tela, aberta nesse
// instante, pedia outra vez. Só GET sem corpo; a entrada sai assim que a
// resposta chega (não é cache — esse é o cacheLocal). A chave leva o token:
// sessões diferentes nunca partilham resposta. Quem recebe o mesmo objeto não o
// deve alterar — nenhuma tela o faz (o estado do React é trocado, não mexido).
//
// Qualquer ESCRITA esvazia o mapa: um GET só aproveita outro que começou depois
// da última escrita. Sem isto, votar e recarregar o ranking podia pegar carona
// num GET que saiu antes do voto e devolver a lista velha.
const getsEmVoo = new Map();

// Faz um pedido autenticado à API, anexando o access token da sessão Supabase.
// `segundoPlano: true` (pré-aquecimento): a chamada não conta como dados da tela
// no Diagnóstico.
export async function apiFetch(path, { segundoPlano = false, ...options } = {}) {
  // VELOCIDADE 8: o cliente chega por import dinâmico (lib/supabaseAsync.js).
  // Aqui já se está dentro de uma função assíncrona que ia esperar pelo
  // getSession de qualquer maneira — o await a mais não custa ida à rede
  // nenhuma, e o AuthProvider já pediu o módulo na montagem.
  const supabase = await obterSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token || null;

  const metodo = (options.method || 'GET').toUpperCase();
  if (metodo !== 'GET' || options.body != null) {
    getsEmVoo.clear();
    return pedir(path, options, token, segundoPlano);
  }

  const chave = `${token || '-'}|${path}`;
  const emVoo = getsEmVoo.get(chave);
  if (emVoo) {
    // A tela pegou carona num pedido do pré-aquecimento: quando ele chegar, os
    // dados são dela também.
    if (!segundoPlano) emVoo.then(marcarDadosDaTela, marcarDadosDaTela);
    return emVoo;
  }
  const promessa = pedir(path, options, token, segundoPlano).finally(() => {
    if (getsEmVoo.get(chave) === promessa) getsEmVoo.delete(chave);
  });
  getsEmVoo.set(chave, promessa);
  return promessa;
}

async function pedir(path, options, token, segundoPlano) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // VELOCIDADE 4 — a caixa-preta mede AQUI, no único sítio por onde todas as
  // chamadas passam. Só rota, estado e tempos; nunca corpo nem token.
  const t0 = performance.now();
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const ms = performance.now() - t0;
  const { motorMs, edgeMs } = lerServerTiming(res.headers.get('Server-Timing'));
  registarChamada({ rota: path, metodo: (options.method || 'GET').toUpperCase(), status: res.status, ms, motorMs, edgeMs, segundoPlano });

  let body = null;
  try {
    body = await res.json();
  } catch {
    // resposta sem corpo JSON
  }

  if (!res.ok) {
    const err = new Error(body?.error || `Erro ${res.status}`);
    err.status = res.status;
    err.code = body?.code || null; // ex.: 'CONTA_SUSPENSA' → o AuthGuard distingue
    throw err;
  }
  return body;
}

// Upload genérico (multipart) para qualquer endpoint. Não usa apiFetch porque
// este força Content-Type JSON (o browser tem de definir o boundary sozinho).
export async function apiUpload(path, file, field = 'file') {
  return apiUploadCampos(path, { [field]: file });
}

// RODADA 19 — variante com vários campos (ex.: "avatar" + "original" no
// mesmo pedido) e método à escolha (POST/PUT). apiUpload acima passou a ser
// um atalho desta para não duplicar a lógica de sessão/erro.
export async function apiUploadCampos(path, campos, { method = 'POST' } = {}) {
  const supabase = await obterSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  getsEmVoo.clear(); // escrita: ver a nota de getsEmVoo
  const fd = new FormData();
  for (const [campo, arquivo] of Object.entries(campos)) {
    if (arquivo) fd.append(campo, arquivo);
  }

  const headers = {};
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  const res = await fetch(`${API_URL}${path}`, { method, headers, body: fd });
  let body = null;
  try {
    body = await res.json();
  } catch {
    // sem corpo JSON
  }
  if (!res.ok) {
    const err = new Error(body?.error || `Erro ${res.status}`);
    err.status = res.status;
    err.code = body?.code || null; // ex.: 'FOTO_FRACA' → mensagemUploadFoto distingue
    throw err;
  }
  return body;
}

// Upload de um ficheiro (multipart) para /api/feed/upload → { url, media_type }.
// Passa pelo mesmo caminho dos outros uploads (sessão, escrita esvazia o mapa de GETs, erro com status e
// código): eram duas cópias da mesma lógica, e o arranque tem teto de peso (verificar-dist).
export function uploadFile(file) {
  return apiUploadCampos('/api/feed/upload', { file });
}
