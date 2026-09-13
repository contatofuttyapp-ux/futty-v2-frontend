// Futty v2.0 — Cliente Supabase (frontend)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Futty] Faltam variáveis de ambiente VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Verifique o arquivo .env do frontend.'
  );
}

// flowType 'pkce' explícito (Android, 14-set): o login Google nativo e os links de
// e-mail (recuperar senha) trocam um `code` por sessão à mão —
// components/DeepLinkListener.jsx chama exchangeCodeForSession(code) porque o
// WebView do Capacitor nunca navega para a URL de retorno (ela é entregue via
// appUrlOpen), então o detectSessionInUrl automático nunca dispara. Isso só
// funciona com PKCE (o link traz `code`, não o token direto).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'pkce' },
});
