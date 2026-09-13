// Futty v2.0 — Contexto de autenticação (sessão Supabase)
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { limparCacheLocal } from '../lib/cacheLocal';
import { limparCromos } from '../lib/cromoCache';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

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
