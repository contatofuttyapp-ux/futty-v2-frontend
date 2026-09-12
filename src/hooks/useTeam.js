// Futty v2.0 — Hooks de dados de equipas (encapsulam as chamadas à API).
import { useApi } from './useApi';
import { useSessao } from '../context/SessaoContext';

/**
 * Lista de equipas do utilizador autenticado. Lê do SessaoContext (12-set,
 * "Velocidade 2") — carregado 1x por sessão e partilhado por toda a app, em
 * vez de cada tela disparar o seu próprio /api/teams a cada navegação. Na
 * rota /home o SessaoContext é hidratado pelo InicioContext a partir do
 * payload agregado de /api/inicio (11-set, "1 pedido só") — este hook não
 * precisa saber disso, só lê o resultado final.
 */
export function useTeams() {
  const { teams, carregandoTeams, erroTeams } = useSessao();
  return { teams, loading: carregandoTeams, error: erroTeams };
}

/** Detalhes de uma equipa + membros. */
export function useTeam(slug) {
  const { data, loading, error, reload } = useApi(slug ? `/api/teams/${slug}` : null);
  return {
    team: data?.team || null,
    members: data?.members || [],
    loading,
    error,
    reload,
  };
}

/** Lista de jogos de uma equipa. */
export function useTeamGames(slug) {
  const { data, loading, error, reload } = useApi(slug ? `/api/teams/${slug}/games` : null);
  return {
    team: data?.team || null,
    games: data?.games || [],
    loading,
    error,
    reload,
  };
}
