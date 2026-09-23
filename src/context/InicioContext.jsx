// Futty v2.0 — Contexto do Início (11-set). Faz 1 pedido só (GET /api/inicio)
// em vez dos ~9 que a tela disparava em paralelo — motor em São Paulo, quem usa
// em Lisboa paga ~240ms por pedido, e cada um deles era um round-trip só para
// abrir a tela.
//
// Montado condicionalmente em Layout.jsx (só quando pathname === '/home'),
// envolvendo children + BottomNav — assim o próprio BottomNav (que também
// precisa de "equipas do utilizador" e do estado de votação) pode ler daqui em
// vez de disparar os seus próprios pedidos enquanto está na página do Início.
// Fora dessa página o contexto não existe (useInicio() devolve null) e tudo
// volta ao comportamento de sempre.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { usePerfil } from './PerfilContext';
import { useSessao } from './SessaoContext';
import { lerCache, gravarCache } from '../lib/cacheLocal';
import { semearAds } from '../lib/ads';
import { preaquecer } from '../lib/preaquecerDados';
import { aoVoltar } from '../lib/regresso';

const CACHE_CHAVE = 'inicio';

// VELOCIDADE 8 (16-set) — quando o app volta do segundo plano, a partir de que
// idade vale a pena ir buscar o Início outra vez. 60 s: abaixo disso a tela é
// praticamente a mesma e o pedido só gastava rede; acima, pode já haver jogo
// novo, presença confirmada ou resultado lançado. Foi o que o Pedro apanhou no
// build 19: horas com o app aberto, nenhum jogo novo à vista.
const IDADE_PARA_RECARREGAR_MS = 60000;

const InicioContext = createContext(null);

export function InicioProvider({ children }) {
  const { session } = useAuth();
  const userId = session?.user?.id || null;
  const { hidratar: hidratarPerfil } = usePerfil();
  // SessaoProvider fica ACIMA do Layout (ver App.jsx) e o InicioProvider é
  // montado como filho do Layout — é descendente, por isso useSessao() aqui
  // vê o contexto de verdade. /api/inicio já traz teams/votacao_status; em vez
  // de o SessaoContext duplicar esse pedido ao chegar direto em /home, este
  // Provider empurra os dados para lá assim que a resposta chega.
  const { hidratarTeams, hidratarVotacaoStatus } = useSessao();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const carregando = !dados && !erro;

  // Guarda contra corrida: uma resposta tardia (efeito de montagem ou um
  // reload() anterior) não pode pisar o estado de um pedido mais recente.
  const geracaoRef = useRef(0);
  // Quando o /api/inicio respondeu pela última vez. É a idade disto que decide
  // se vale a pena recarregar quando o app volta à frente.
  const ultimaCargaRef = useRef(0);

  // reload() exposto ao contexto — para consumidores chamarem a partir de
  // handlers (ex.: depois de uma ação falhar), nunca a partir de um efeito.
  const carregar = useCallback(async () => {
    const minhaGeracao = ++geracaoRef.current;
    try {
      const d = await apiFetch('/api/inicio');
      if (geracaoRef.current !== minhaGeracao) return null;
      ultimaCargaRef.current = Date.now();
      setDados(d);
      setErro('');
      // O /api/me do AuthGuard já correu antes de qualquer rota montar (é ele
      // que decide se a conta está suspensa) — isto não evita ESSE pedido, mas
      // mantém o PerfilContext fresco com o `me` que /api/inicio acabou de
      // trazer, sem o Início disparar um /api/me próprio por cima.
      if (d?.me) hidratarPerfil(d.me);
      // Mesma lógica para o SessaoContext — teams/votacao_status já vieram
      // neste payload, sem o SessaoContext precisar do seu próprio /api/teams.
      if (d?.teams?.teams) hidratarTeams(d.teams.teams);
      // O slug vai junto (Velocidade 9): sem ele o SessaoContext não sabe a que
      // time este status pertence e volta a pedi-lo na tela seguinte.
      if (d?.votacao_status !== undefined) hidratarVotacaoStatus(d.votacao_status, d?.teams?.teams?.[0]?.slug ?? null);
      // Velocidade 9: os slots de publicidade de TODAS as telas vieram aqui —
      // nenhuma delas precisa de pedir o seu (lib/ads.js). Só do dado FRESCO:
      // anúncio de cache podia ser de uma campanha que já acabou.
      if (d?.ads) semearAds(d.ads);
      gravarCache(userId, CACHE_CHAVE, d);
      return d;
    } catch (e) {
      if (geracaoRef.current !== minhaGeracao) return null;
      setErro(e.message || 'Não foi possível carregar o Início.');
      return null;
    }
  }, [hidratarPerfil, hidratarTeams, hidratarVotacaoStatus, userId]);

  // Carga inicial ao montar (mesmo padrão do PerfilContext: o efeito chama a
  // API diretamente, em vez de invocar `carregar`, para o setState correr
  // dentro do .then()/.catch() e não sincronamente no corpo do efeito).
  //
  // BUG (13-set → corrigido 14-set, "Velocidade 3"): este Provider é montado
  // em Layout.jsx por PATHNAME (pathname === '/home'), FORA do AuthGuard —
  // ao contrário do que o comentário acima sugeria, isto NÃO espera o
  // getSession() do Supabase resolver. Com deps [] (carrega 1x ao montar), o
  // efeito capturava `userId` (e hidratarPerfil/hidratarTeams/
  // hidratarVotacaoStatus, cada um fechado sobre ESSE userId nulo) do
  // primeiro render — se esse primeiro render acontecia antes da sessão
  // resolver, `gravarCache(null, …)` era ignorado (cacheLocal.js exige
  // userId) e as hidratações para outros contextos silenciosamente não
  // escreviam nada. Em localhost a sessão já vinha resolvida do storage antes
  // do 1º paint (raro reproduzir); em produção (rede real) não. Agora o
  // efeito depende de [userId] e sai cedo sem ele — corre de novo, com o
  // userId certo, assim que a sessão resolver.
  useEffect(() => {
    if (!userId) return undefined;
    let ativo = true;
    const minhaGeracao = ++geracaoRef.current;

    // Cache local (13-set, "Velocidade 3"): mostra o Início da última visita
    // na hora (sem LoadingFutty) — o /api/inicio de verdade corre por trás e
    // substitui (e regrava o cache) assim que responder. Hidrata Perfil/Sessao
    // também a partir do cache, para o resto da app sentir o mesmo ganho.
    const doCache = lerCache(userId, CACHE_CHAVE);
    if (doCache) {
      Promise.resolve().then(() => {
        if (!ativo || geracaoRef.current !== minhaGeracao) return;
        setDados(doCache);
        setErro('');
        // deCache:true — isto é o cache do PRÓPRIO Início, não o /api/inicio
        // fresco (ver comentário em PerfilContext.hidratar).
        if (doCache?.me) hidratarPerfil(doCache.me, { deCache: true });
        if (doCache?.teams?.teams) hidratarTeams(doCache.teams.teams);
        if (doCache?.votacao_status !== undefined) hidratarVotacaoStatus(doCache.votacao_status, doCache?.teams?.teams?.[0]?.slug ?? null);
      });
    }

    apiFetch('/api/inicio')
      .then((d) => {
        if (!ativo || geracaoRef.current !== minhaGeracao) return;
        ultimaCargaRef.current = Date.now();
        setDados(d);
        setErro('');
        if (d?.me) hidratarPerfil(d.me);
        if (d?.teams?.teams) hidratarTeams(d.teams.teams);
        if (d?.votacao_status !== undefined) hidratarVotacaoStatus(d.votacao_status, d?.teams?.teams?.[0]?.slug ?? null);
        if (d?.ads) semearAds(d.ads); // Velocidade 9 — ver `carregar()`
        gravarCache(userId, CACHE_CHAVE, d);
        // IDEIA DO DONO (Velocidade 6B): com o Início já pintado, o app aproveita
        // o aparelho parado para baixar os dados e as imagens das outras abas.
        // O primeiro toque em qualquer aba passa a não custar rede nenhuma.
        preaquecer(userId, d);
      })
      .catch((e) => {
        if (!ativo || geracaoRef.current !== minhaGeracao) return;
        if (doCache) {
          console.warn('[InicioContext] /api/inicio falhou, mantendo cache:', e.message);
          return;
        }
        setErro(e.message || 'Não foi possível carregar o Início.');
      });
    return () => {
      ativo = false;
    };
  }, [userId, hidratarPerfil, hidratarTeams, hidratarVotacaoStatus]);

  // VELOCIDADE 8 (16-set) — o app voltou à frente. Se o último /api/inicio já
  // tem mais de 60 s, busca-se outra vez POR TRÁS: `carregar()` troca os dados
  // quando a resposta chegar e `carregando` continua falso (só é verdade sem
  // dados nenhuns), por isso a pessoa nunca vê um F de carregamento — vê a tela
  // que deixou e, um instante depois, a tela actualizada.
  useEffect(() => {
    if (!userId) return undefined;
    return aoVoltar(() => {
      if (Date.now() - ultimaCargaRef.current < IDADE_PARA_RECARREGAR_MS) return;
      carregar();
    });
  }, [userId, carregar]);

  const value = { dados, carregando, erro, reload: carregar };
  return <InicioContext.Provider value={value}>{children}</InicioContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useInicio() {
  // SEM throw de propósito: fora do InicioProvider isto é null, e os
  // consumidores opcionais (useTeams, BottomNav, AdCard) tratam null como
  // "não estou dentro do Início, comporta-te como sempre".
  return useContext(InicioContext);
}
