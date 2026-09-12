// Futty v2.0 — Contexto do perfil (/api/me), fonte única partilhada por toda a app.
// Achado 3/23 (roteiro 10-set): cada página que precisava do utilizador chamava o
// seu próprio useApi('/api/me') — Início, Equipa, Perfil (2x!), Planos, os guards —
// cada navegação repetia o mesmo pedido. Agora carrega UMA vez por sessão (login) e
// todos os consumidores partilham o mesmo estado.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
import { lerCache, gravarCache } from '../lib/cacheLocal';

const CACHE_CHAVE = 'me';

const PerfilContext = createContext(null);

export function PerfilProvider({ children }) {
  const { session } = useAuth();
  const userId = session?.user?.id || null;

  const [perfil, setPerfil] = useState(null);
  const [erro, setErro] = useState(null);
  const [erroCode, setErroCode] = useState(null);
  // userId para o qual perfil/erro já refletem uma resposta (ou null = nenhuma
  // sessão). carregando é DERIVADO daqui — o mesmo truque do useApi (loadedPath),
  // que evita qualquer setState síncrono no corpo do efeito (lint
  // react-hooks/set-state-in-effect).
  const [carregadoParaId, setCarregadoParaId] = useState(undefined);
  const carregando = !!userId && carregadoParaId !== userId;

  // Guarda contra corrida: se o userId mudar (logout/troca de conta) enquanto um
  // pedido anterior ainda está no ar, a resposta tardia não pisa o estado actual.
  const userIdRef = useRef(userId);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // Carga inicial ao autenticar (login/arranque com sessão); limpa ao sair. Chave =
  // user.id, não o access_token — o token renova-se (~1h) sem precisar recarregar.
  useEffect(() => {
    let ativo = true;
    if (!userId) {
      Promise.resolve().then(() => {
        if (!ativo) return;
        setPerfil(null);
        setErro(null);
        setErroCode(null);
        setCarregadoParaId(null);
      });
      return () => {
        ativo = false;
      };
    }
    // Cache local (13-set, "Velocidade 3", stale-while-revalidate): mostra o
    // último /api/me bom na hora (sem LoadingFutty) enquanto o pedido de
    // verdade corre por trás — motor em São Paulo, quem está longe sente
    // ~240ms mesmo já com tudo centralizado num pedido só por sessão.
    const doCache = lerCache(userId, CACHE_CHAVE);
    if (doCache) {
      Promise.resolve().then(() => {
        if (!ativo) return;
        setPerfil(doCache);
        setErro(null);
        setErroCode(null);
        setCarregadoParaId(userId);
      });
    }

    apiFetch('/api/me')
      .then((data) => {
        if (!ativo) return;
        setPerfil(data);
        setErro(null);
        setErroCode(null);
        setCarregadoParaId(userId);
        gravarCache(userId, CACHE_CHAVE, data);
      })
      .catch((e) => {
        if (!ativo) return;
        if (doCache) {
          // Já mostrando o cache — mantém, sem risco a tela com erro.
          console.warn('[PerfilContext] /api/me falhou, mantendo cache:', e.message);
          return;
        }
        setPerfil(null);
        setErro(e.message || 'Não foi possível carregar o perfil.');
        setErroCode(e.code || null);
        setCarregadoParaId(userId);
      });
    return () => {
      ativo = false;
    };
  }, [userId]);

  // recarregar() exposto ao contexto — para consumidores chamarem a partir de
  // handlers (após guardar dados, trocar avatar, gerar avatar IA, etc.), nunca a
  // partir de um efeito. Silencioso: não risca `carregando` (revalidação em fundo).
  const carregar = useCallback(async () => {
    const idDoPedido = userId;
    if (!idDoPedido) return null;
    try {
      const data = await apiFetch('/api/me');
      if (userIdRef.current !== idDoPedido) return null; // ficou obsoleto
      setPerfil(data);
      setErro(null);
      setErroCode(null);
      gravarCache(idDoPedido, CACHE_CHAVE, data);
      return data;
    } catch (e) {
      if (userIdRef.current !== idDoPedido) return null;
      setErro(e.message || 'Não foi possível carregar o perfil.');
      setErroCode(e.code || null);
      return null;
    }
  }, [userId]);

  // Hidratação externa (11-set): o InicioContext já traz `me` dentro do payload
  // agregado de /api/inicio — em vez de disparar um /api/me próprio, ele chama
  // isto para preencher o mesmo estado que o efeito acima preencheria. Silencioso
  // como `carregar`: não risca nada que um consumidor já esteja a mostrar.
  const hidratar = useCallback(
    (data) => {
      if (!data || !userId) return;
      setPerfil(data);
      setErro(null);
      setErroCode(null);
      setCarregadoParaId(userId);
      gravarCache(userId, CACHE_CHAVE, data);
    },
    [userId]
  );

  const value = {
    perfil,
    carregando,
    erro,
    // Conta suspensa (requireAuth do backend) — o AuthGuard usa isto para mostrar
    // o ecrã próprio em vez do app.
    suspenso: erroCode === 'CONTA_SUSPENSA',
    recarregar: carregar,
    hidratar,
  };

  return <PerfilContext.Provider value={value}>{children}</PerfilContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePerfil() {
  const ctx = useContext(PerfilContext);
  if (!ctx) {
    throw new Error('usePerfil tem de ser usado dentro de <PerfilProvider>');
  }
  return ctx;
}
