// Futty v2.0 — Contexto de autenticação (sessão Supabase)
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { limparCacheLocal } from '../lib/cacheLocal';
import { limparCromos } from '../lib/cromoCache';

const AuthContext = createContext(null);

// VELOCIDADE 5 (14-set) — SESSÃO OTIMISTA.
//
// O app inteiro esperava por `supabase.auth.getSession()` antes de desenhar o que
// quer que fosse. Parece barato e não é: quando o token já passou da hora (mais de
// 1 h desde a última abertura, que é o caso normal de quem abre o app uma vez por
// dia), esse getSession faz um refresh PELA REDE até São Paulo — e só depois a
// primeira tela começa a existir. Era o pedaço mais caro da primeira abertura no
// iPhone.
//
// Aqui lê-se a MESMA sessão que o Supabase guardou, do mesmo sítio e de forma
// SÍNCRONA, a tempo do primeiro render. Não é um atalho: é o dado que o próprio
// getSession ia devolver, só que sem esperar pela ida e volta. A tela sai do cache
// local na hora e o refresh continua a correr por trás — quando chega, o
// onAuthStateChange substitui a sessão; se falhar de vez (refresh token inválido),
// a sessão vai a null e o AuthGuard manda para /login como sempre mandou.
//
// O token lido pode estar expirado, e tudo bem: quem fala com a API é o
// lib/api.js, que chama getSession() e aí sim espera pelo token fresco. A troca é
// exactamente essa — a tela desenha já, os DADOS chegam quando chegarem.
function sessaoGuardada() {
  try {
    // Mesma chave que o supabase-js monta: `sb-<ref>-auth-token`, com o ref a sair
    // do subdomínio do projeto. Derivada, nunca escrita à mão — se o projeto do
    // banco mudar, isto acompanha sozinho.
    const ref = new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0];
    const bruto = localStorage.getItem(`sb-${ref}-auth-token`);
    if (!bruto) return null;
    const s = JSON.parse(bruto);
    // Só serve se der para agir: token para assinar, refresh para renovar e o
    // utilizador para as telas desenharem. Faltando um, é lixo de versão antiga.
    return s?.access_token && s?.refresh_token && s?.user ? s : null;
  } catch {
    // Modo privado, storage desligado, JSON corrompido — segue o caminho lento.
    return null;
  }
}

export function AuthProvider({ children }) {
  const inicial = sessaoGuardada();
  const [session, setSession] = useState(inicial);
  // Com sessão guardada não há nada por saber: o arranque não mostra loading.
  const [loading, setLoading] = useState(!inicial);

  useEffect(() => {
    // Sessão inicial
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Subscrição a alterações de auth (login/logout/refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    // Celular compartilhado (13-set): limpa o cache local ANTES do signOut —
    // a próxima conta que entrar neste aparelho não pode ver, nem por 1
    // render, o perfil/equipas de quem saiu. O cromo do Início (14-set,
    // "Velocidade 4") mora em IndexedDB e não em localStorage, por isso tem de
    // ser apagado à parte — é a cara da pessoa, seria o pior a sobrar.
    signOut: () => {
      limparCacheLocal();
      limparCromos().catch(() => {});
      return supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth tem de ser usado dentro de <AuthProvider>');
  }
  return ctx;
}
