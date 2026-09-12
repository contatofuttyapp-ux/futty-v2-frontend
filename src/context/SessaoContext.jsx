// Futty v2.0 — Contexto de sessão (12-set, "Velocidade 2"): equipas do
// utilizador (/api/teams) e votação da equipa principal, carregadas 1x por
// sessão e partilhadas por toda a app — mesmo problema que o PerfilContext já
// resolveu para /api/me, agora para /api/teams. Achado da varredura: Layout,
// BottomNav (fora do Início), Feed, MeuPerfil e Ranking disparavam cada um o
// seu próprio GET /api/teams a cada navegação; Layout em particular tinha um
// bug real — chamava useTeams() no seu PRÓPRIO corpo, mas o InicioProvider é
// montado como FILHO do Layout, então useInicio() aí dentro nunca via o
// contexto do Início (contexto só flui para descendentes). Por isso este
// provider tem de ficar ACIMA do Layout na árvore (ver App.jsx).
//
// Na rota /home o InicioContext já traz teams/votacao_status dentro do
// payload agregado de /api/inicio (1 pedido só, decisão de 11-set) — para não
// duplicar esse pedido, este provider ADIA a sua própria carga inicial
// enquanto o pathname ATUAL for /home (reavaliado a cada navegação — nunca
// travado num pathname "da 1ª renderização": a "/" redireciona para "/home"
// via <Navigate>, e travar no pathname inicial perderia esse caso). Em vez
// disso o InicioContext HIDRATA este contexto (hidratarTeams/
// hidratarVotacaoStatus) assim que /api/inicio responde — o mesmo padrão que
// já usa para hidratar o PerfilContext com `me`. Se a hidratação nunca vier
// (ex.: /api/inicio falhou) e o utilizador sair de /home sem dados, o efeito
// reavalia e faz a carga própria como rede de segurança.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePerfil } from './PerfilContext';
import { apiFetch } from '../lib/api';

const SessaoContext = createContext(null);

export function SessaoProvider({ children }) {
  const { session } = useAuth();
  const userId = session?.user?.id || null;
  const { pathname } = useLocation();
  const { perfil: me, recarregar: reloadMe } = usePerfil();

  const noInicioAgora = pathname === '/home';

  const [teams, setTeams] = useState([]);
  // Chegando direto em /home, `teams` fica vazio até o InicioContext hidratar
  // — sem isto, `carregandoTeams` começaria falso e "vazio" pareceria "sem
  // equipas" em vez de "ainda a carregar".
  const [carregandoTeams, setCarregandoTeams] = useState(noInicioAgora);
  const [erroTeams, setErroTeams] = useState('');
  const [votacaoStatus, setVotacaoStatus] = useState(null);

  // Guarda contra corrida (troca de conta com pedido antigo ainda no ar).
  const userIdRef = useRef(userId);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const carregarTeams = useCallback(async () => {
    if (!userId) return null;
    setCarregandoTeams(true);
    try {
      const data = await apiFetch('/api/teams');
      if (userIdRef.current !== userId) return null; // ficou obsoleto
      const lista = data?.teams || [];
      setTeams(lista);
      setErroTeams('');
      return lista;
    } catch (e) {
      if (userIdRef.current !== userId) return null;
      setErroTeams(e.message || 'Não foi possível carregar as equipas.');
      return null;
    } finally {
      if (userIdRef.current === userId) setCarregandoTeams(false);
    }
  }, [userId]);

  // Já tentou (carga própria OU hidratação) alguma vez para o userId atual —
  // não dispara de novo sozinho (reloadTeams() explícito é que cobre o resto).
  const jaTentouTeamsRef = useRef(false);
  useEffect(() => {
    jaTentouTeamsRef.current = false; // reset ao trocar de conta
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      // Reset ao deslogar — adiado ao microtask (mesmo padrão do PerfilContext):
      // setState síncrono no corpo do efeito dispara cascading renders.
      let ativo = true;
      Promise.resolve().then(() => {
        if (!ativo) return;
        setTeams([]);
        setVotacaoStatus(null);
        setCarregandoTeams(false);
      });
      return () => {
        ativo = false;
      };
    }
    if (jaTentouTeamsRef.current || noInicioAgora) return undefined; // hidratarTeams() pode cobrir
    jaTentouTeamsRef.current = true;
    carregarTeams();
    return undefined;
  }, [userId, noInicioAgora, carregarTeams]);

  // Votação da equipa principal (1ª equipa) — mesmo critério do InicioContext
  // (routes/inicio.js: campSlug = teams[0]?.slug). Mesma rede de segurança:
  // se o slug mudar antes de qualquer hidratação chegar, tenta de novo.
  const votacaoTentadaParaRef = useRef(null); // slug já tentado (própria ou hidratada)
  useEffect(() => {
    const slug = teams[0]?.slug || null;
    if (!slug) {
      votacaoTentadaParaRef.current = null;
      // Adiado ao microtask pelo mesmo motivo do efeito acima.
      let ativo = true;
      Promise.resolve().then(() => {
        if (ativo) setVotacaoStatus(null);
      });
      return () => {
        ativo = false;
      };
    }
    if (votacaoTentadaParaRef.current === slug || noInicioAgora) return undefined; // hidratarVotacaoStatus() pode cobrir
    votacaoTentadaParaRef.current = slug;
    let ativo = true;
    apiFetch(`/api/teams/${slug}/votacao-status`)
      .then((d) => {
        if (ativo) setVotacaoStatus(d);
      })
      .catch(() => {
        if (ativo) setVotacaoStatus(null);
      });
    return () => {
      ativo = false;
    };
  }, [teams, noInicioAgora]);

  // Espelho de `teams` em ref: hidratarVotacaoStatus precisa do slug ATUAL
  // (equipa principal) sem depender de re-render para ler o valor mais recente.
  const teamsRef = useRef(teams);
  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  const hidratarTeams = useCallback((novasTeams) => {
    if (!Array.isArray(novasTeams)) return;
    setTeams(novasTeams);
    setErroTeams('');
    setCarregandoTeams(false);
    jaTentouTeamsRef.current = true; // já temos dado — sair de /home não deve refazer o pedido
  }, []);

  const hidratarVotacaoStatus = useCallback((status) => {
    setVotacaoStatus(status ?? null);
    votacaoTentadaParaRef.current = teamsRef.current[0]?.slug || null;
  }, []);

  const value = {
    me,
    reloadMe,
    teams,
    carregandoTeams,
    erroTeams,
    reloadTeams: carregarTeams,
    votacaoStatus,
    hidratarTeams,
    hidratarVotacaoStatus,
  };

  return <SessaoContext.Provider value={value}>{children}</SessaoContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSessao() {
  const ctx = useContext(SessaoContext);
  if (!ctx) {
    throw new Error('useSessao tem de ser usado dentro de <SessaoProvider>');
  }
  return ctx;
}
