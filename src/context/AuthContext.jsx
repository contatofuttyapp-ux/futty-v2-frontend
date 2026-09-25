// Futty v2.0 — Contexto de autenticação (sessão Supabase)
import { createContext, useContext, useEffect, useState } from 'react';
import { obterSupabase } from '../lib/supabaseAsync';
import { limparCacheLocal } from '../lib/cacheLocal';
import { esquecerPreaquecimento } from '../lib/preaquecerDados';
import { limparCromos } from '../lib/cromoCache';
import { registrarSessaoInvalida } from '../lib/api';
import { criarTratador401, sairDesteAparelho } from '../lib/sessao';

const AuthContext = createContext(null);

// Celular compartilhado (13-set): ao sair, nada da conta fica no aparelho — o cache local, o
// pré-aquecimento e o cromo do Início (IndexedDB), que é a cara da pessoa.
function limparAparelho() {
  limparCacheLocal();
  esquecerPreaquecimento();
  limparCromos().catch(() => {});
}

// RODADA 28 — a sessão acabou SEM a pessoa pedir (outro aparelho saiu de todos, conta apagada,
// refresh revogado). O aparelho é limpo e o login explica porquê (Login.jsx lê esta marca).
let saidaPedida = false;
function sessaoTerminou() {
  if (saidaPedida) return;
  limparAparelho();
  try { sessionStorage.setItem('futty_sessao_terminou', '1'); } catch { /* modo privado: sai sem o aviso */ }
}

// O motor disse 401: renova uma vez; se não der, sai só deste aparelho (regras em lib/sessao.js).
// A saída dispara o SIGNED_OUT abaixo, que limpa o aparelho e deixa o aviso para o login.
registrarSessaoInvalida(criarTratador401(obterSupabase));

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
  const [inicial] = useState(sessaoGuardada);
  const [session, setSession] = useState(inicial);
  // Com sessão guardada não há nada por saber: o arranque não mostra loading.
  const [loading, setLoading] = useState(!inicial);

  // VELOCIDADE 8 (16-set) — o supabase-js chega por import dinâmico (ver
  // lib/supabaseAsync.js). O download começa aqui, no mesmo instante em que
  // começava antes; o que sai do caminho é a COMPILAÇÃO de 201 KB antes da 1ª
  // pintura. A sessão que desenha a 1ª tela já veio do localStorage, síncrona,
  // lá em cima (sessaoGuardada) — este efeito só confirma e passa a ouvir.
  useEffect(() => {
    let vivo = true;
    let subscricao = null;

    obterSupabase().then((supabase) => {
      if (!vivo) return;
      // Sessão inicial
      supabase.auth.getSession().then(({ data, error }) => {
        if (!vivo) return;
        // Rodada 28: sem rede no arranque, a sessão guardada fica (as telas abrem do cache); só
        // quando o Supabase RECUSOU a renovação é que ela acabou — e aí o login diz porquê.
        const semRede = error?.name === 'AuthRetryableFetchError';
        if (inicial && !data.session && !semRede) sessaoTerminou();
        setSession(data.session ?? (semRede ? inicial : null));
        setLoading(false);
      });

      // Subscrição a alterações de auth (login/logout/refresh)
      subscricao = supabase.auth.onAuthStateChange((evento, newSession) => {
        if (evento === 'SIGNED_OUT') {
          sessaoTerminou();
          saidaPedida = false;
        }
        setSession(newSession);
      }).data.subscription;
      if (!vivo) subscricao.unsubscribe();
    });

    return () => {
      vivo = false;
      if (subscricao) subscricao.unsubscribe();
    };
  }, [inicial]);

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    // Celular compartilhado (13-set): limpa o cache local ANTES do signOut —
    // a próxima conta que entrar neste aparelho não pode ver, nem por 1
    // render, o perfil/equipas de quem saiu.
    // RODADA 28: "Sair" é SÓ deste aparelho (scope local). O padrão do Supabase
    // é 'global', que derrubava a sessão da pessoa em TODOS os aparelhos — o
    // Pedro trocou de conta no celular e o Gabinete da Freaky no Chrome morreu.
    signOut: async () => {
      saidaPedida = true;
      limparAparelho();
      return sairDesteAparelho(obterSupabase);
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
