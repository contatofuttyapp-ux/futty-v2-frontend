// Futty v2.0 — Cliente da API backend (com JWT do utilizador)
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Converte um caminho relativo do backend (ex.: /uploads/x.png) em URL absoluto.
export function assetUrl(p) {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  return `${API_URL}${p}`;
}

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
