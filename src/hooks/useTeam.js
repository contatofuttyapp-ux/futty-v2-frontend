// Futty v2.0 — Hooks de dados de equipas (encapsulam as chamadas à API).
import { useApi } from './useApi';

/** Lista de equipas do utilizador autenticado. */
export function useTeams() {
  const { data, loading, error } = useApi('/api/teams');
  return { teams: data?.teams || [], loading, error };
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
