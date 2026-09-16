// Futty v2.0 — Login com Google, partilhado entre LandingPage/Login/Register (14-set,
// Android). Web mantém o redirect direto de sempre; nativo abre o OAuth do Google numa
// Chrome Custom Tab (skipBrowserRedirect + Browser.open) porque um WebView não pode
// completar o login do Google (a Google recusa OAuth dentro de WebView desde 2021).
// O retorno chega pelo esquema com.futty.app://auth/callback, capturado globalmente
// por components/DeepLinkListener.jsx — não pelo chamador desta função.
//
// VELOCIDADE 8 (16-set): o cliente chega por obterSupabase(). Não é capricho —
// o DeepLinkListener está montado na RAIZ e importa daqui a constante
// CALLBACK_URL_NATIVO; com o `import { supabase }` estático, essa constante de
// 40 caracteres arrastava os 200 KB do supabase-js para o modulepreload do
// arranque. Um import estático não se paga por símbolo, paga-se por módulo.
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { obterSupabase } from './supabaseAsync';

// Mesmo host que o AndroidManifest regista no intent-filter (auth) e que
// DeepLinkListener.jsx reconhece. Fixo — no nativo não há "from" por rota: a app
// decide para onde ir sozinha (AuthGuard/IndexRedirect) assim que a sessão chega.
export const CALLBACK_URL_NATIVO = 'com.futty.app://auth/callback';

/**
 * Inicia o login Google. No nativo devolve { error } depois de abrir a Custom Tab
 * (o resultado real do login chega depois, pelo listener global); na web devolve o
 * mesmo { error } de sempre do signInWithOAuth (que já navega o browser sozinho).
 */
export async function entrarComGoogle({ redirectTo }) {
  const supabase = await obterSupabase();
  if (Capacitor.isNativePlatform()) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: CALLBACK_URL_NATIVO, skipBrowserRedirect: true },
    });
    if (error) return { error };
    if (data?.url) await Browser.open({ url: data.url });
    return { error: null };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  return { error };
}
