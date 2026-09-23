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
import { lerCache, gravarCache } from '../lib/cacheLocal';

const CACHE_TEAMS = 'teams';
const CACHE_VOTACAO = 'votacao_status';

const SessaoContext = createContext(null);

export function SessaoProvider({ children }) {
  const { session } = useAuth();
  const userId = session?.user?.id || null;
  const { pathname } = useLocation();
  const { perfil: me, recarregar: reloadMe } = usePerfil();

  // "/" conta como Início (Velocidade 7B): no arranque frio a rota é "/" por um
  // instante antes do <Navigate> para "/home", e bastava esse instante para
  // disparar /api/teams + votacao-status em paralelo com o /api/inicio que traz
  // os dois — 3 pedidos frios em vez de 1. O PerfilContext já fazia o mesmo.
  const noInicioAgora = pathname === '/home' || pathname === '/';

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
      gravarCache(userId, CACHE_TEAMS, lista);
      return lista;
    } catch (e) {
      if (userIdRef.current !== userId) return null;
      const doCache = lerCache(userId, CACHE_TEAMS);
      if (doCache) {
        console.warn('[SessaoContext] /api/teams falhou, mantendo cache:', e.message);
        return doCache;
      }
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

    // Cache local (13-set, "Velocidade 3"): mostra as equipas da última visita
    // na hora, sem `carregandoTeams` a tapar a tela — carregarTeams() por
    // trás substitui assim que a resposta fresca chegar.
    const doCache = lerCache(userId, CACHE_TEAMS);
    if (doCache) {
      Promise.resolve().then(() => {
        setTeams(doCache);
        setErroTeams('');
        setCarregandoTeams(false);
      });
    }

    carregarTeams();
    return undefined;
  }, [userId, noInicioAgora, carregarTeams]);

  // Votação da equipa principal (1ª equipa) — mesmo critério do InicioContext
  // (routes/inicio.js: campSlug = teams[0]?.slug). Mesma rede de segurança:
  // se o slug mudar antes de qualquer hidratação chegar, tenta de novo.
  const votacaoTentadaParaRef = useRef(null); // slug já tentado (própria ou hidratada)
  useEffect(() => {
    // VELOCIDADE 6B (15-set): este efeito esperava `teams` — ou seja, esperava o
    // /api/teams responder — antes de sequer começar o votacao-status. Duas idas
    // a São Paulo em fila, ~500 ms só de espera. Mas o slug do time principal
    // está no cache local desde a última visita: dá para arrancar já com ele.
    // Se o /api/teams trouxer outro slug (a pessoa mudou de time principal), o
    // efeito corre de novo com o slug certo — votacaoTentadaParaRef trata disso.
    const slug = teams[0]?.slug || lerCache(userId, CACHE_TEAMS)?.[0]?.slug || null;
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

    // Cache local (13-set, "Velocidade 3"): mostra o status da última visita
    // na hora; o pedido por trás substitui assim que responder.
    const doCache = lerCache(userId, CACHE_VOTACAO);
    let ativo = true;
    if (doCache) {
      Promise.resolve().then(() => {
        if (ativo) setVotacaoStatus(doCache);
      });
    }
    apiFetch(`/api/teams/${slug}/votacao-status`)
      .then((d) => {
        if (!ativo) return;
        setVotacaoStatus(d);
        gravarCache(userId, CACHE_VOTACAO, d);
      })
      .catch((e) => {
        if (!ativo) return;
        if (doCache) {
          console.warn('[SessaoContext] votacao-status falhou, mantendo cache:', e.message);
          return;
        }
        setVotacaoStatus(null);
      });
    return () => {
      ativo = false;
    };
  }, [teams, noInicioAgora, userId]);

  // Espelho de `teams` em ref: hidratarVotacaoStatus precisa do slug ATUAL
  // (equipa principal) sem depender de re-render para ler o valor mais recente.
  const teamsRef = useRef(teams);
  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  // userIdRef.current em vez do `userId` da closure (13-set → corrigido
  // 14-set, "Velocidade 3"): estas funções são chamadas de FORA (o
  // InicioContext guarda a referência que recebeu de useSessao() no seu
  // próprio efeito) — se essa chamada vier de um efeito cujo useCallback foi
  // criado num render anterior (userId ainda nulo), gravarCache(null, …)
  // seria ignorado mesmo com a chamada em si a acontecer depois da sessão
  // resolver. O ref é sempre o userId ATUAL, não o congelado na criação da
  // função — por isso as duas ficam com deps [] (identidade estável, nunca
  // recriadas à toa).
  const hidratarTeams = useCallback((novasTeams) => {
    if (!Array.isArray(novasTeams)) return;
    setTeams(novasTeams);
    setErroTeams('');
    setCarregandoTeams(false);
    jaTentouTeamsRef.current = true; // já temos dado — sair de /home não deve refazer o pedido
    gravarCache(userIdRef.current, CACHE_TEAMS, novasTeams);
  }, []);

  // VELOCIDADE 9 (23-set) — `slug` passa a vir de quem hidrata.
  //
  // A marca "já tentei para este time" era lida de `teamsRef.current`, e quem
  // hidrata (InicioContext) chama `hidratarTeams` e `hidratarVotacaoStatus` no
  // MESMO instante: a ref ainda tem o valor anterior — numa abertura fria, uma
  // lista vazia. A marca ficava `null`, e quando os times entravam o efeito de
  // baixo via "slug diferente do que tentei" e pedia o votacao-status outra
  // vez — exactamente o dado que o /api/inicio tinha acabado de trazer. Não se
  // via no Início (lá o efeito não corre); aparecia na tela SEGUINTE, uma ida a
  // São Paulo ao mudar para a Resenha.
  const hidratarVotacaoStatus = useCallback((status, slug = undefined) => {
    setVotacaoStatus(status ?? null);
    votacaoTentadaParaRef.current = (slug !== undefined ? slug : teamsRef.current[0]?.slug) || null;
    gravarCache(userIdRef.current, CACHE_VOTACAO, status ?? null);
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
