// Futty v2.0 — Captura o retorno do OAuth Google e dos links de e-mail (recuperar
// senha) no app nativo (14-set, Android). Fica montado na raiz, dentro do
// BrowserRouter (precisa de useNavigate) — mesmo padrão do RouteTitle.jsx: um
// componente global que só existe pelo efeito, sem desenhar nada.
//
// Por que isto existe: o Capacitor entrega URLs com esquema custom (com.futty.app://)
// através do evento nativo appUrlOpen, NUNCA navegando o WebView para lá — o
// detectSessionInUrl automático do supabase-js (pensado para browser normal) nunca
// vê essa URL. Por isso a troca do `code` por sessão é feita aqui, à mão, com
// exchangeCodeForSession (exige flowType 'pkce', ver lib/supabase.js).
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '../lib/supabase';
import { CALLBACK_URL_NATIVO } from '../lib/googleAuth';

export default function DeepLinkListener() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    const registo = CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
      if (!url || !url.startsWith(CALLBACK_URL_NATIVO)) return; // não é nosso — ignora
      // Fecha a Custom Tab já aqui (best-effort): tanto no sucesso quanto no erro,
      // o utilizador não deve voltar a olhar para o navegador externo.
      Browser.close().catch(() => {});
      try {
        const params = new URL(url).searchParams;
        const erro = params.get('error_description') || params.get('error');
        if (erro) {
          console.warn('[deepLink] callback com erro:', erro);
          return;
        }
        const code = params.get('code');
        if (!code) return;
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.warn('[deepLink] exchangeCodeForSession falhou:', error.message);
          return;
        }
        // type=recovery (link de "recuperar senha") — o Google/login normal não traz
        // esse parâmetro. onAuthStateChange já actualizou a sessão sozinho (AuthContext).
        // Dois destinos: recuperar senha leva à troca; login normal leva para /home — sem
        // isto, quem entra com o Google a partir de /login ou /register (Custom Tab +
        // appUrlOpen, o WebView nunca navega sozinho) ficava parado na tela de login,
        // autenticado por baixo dos panos e sem saber.
        if (params.get('type') === 'recovery') navigate('/alterar-password', { replace: true });
        else navigate('/home', { replace: true });
      } catch (e) {
        console.warn('[deepLink] falha ao processar appUrlOpen:', e.message);
      }
    });

    return () => {
      registo.then((h) => h.remove());
    };
  }, [navigate]);

  return null;
}
