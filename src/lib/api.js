// Futty v2.0 — Cliente da API backend (com JWT do utilizador)
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
    throw new Error(body?.error || `Erro ${res.status}`);
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
