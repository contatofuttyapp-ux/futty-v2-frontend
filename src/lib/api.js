// Futty v2.0 — Cliente da API backend (com JWT do utilizador)
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

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

// Faz um pedido autenticado à API, anexando o access token da sessão Supabase.
export async function apiFetch(path, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

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
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const fd = new FormData();
  fd.append(field, file);

  const headers = {};
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: fd });
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

// Upload de um ficheiro (multipart) para /api/feed/upload.
// NÃO usa apiFetch porque este força Content-Type JSON, que parte o FormData
// (o browser tem de definir o boundary do multipart sozinho).
export async function uploadFile(file) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const fd = new FormData();
  fd.append('file', file);

  const headers = {};
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  const res = await fetch(`${API_URL}/api/feed/upload`, { method: 'POST', headers, body: fd });

  let body = null;
  try {
    body = await res.json();
  } catch {
    // sem corpo JSON
  }
  if (!res.ok) throw new Error(body?.error || `Erro ${res.status}`);
  return body; // { url, media_type }
}
