// Futty v2.0 — Hooks de dados de equipas (encapsulam as chamadas à API).
import { useApi } from './useApi';
import { useInicio } from '../context/InicioContext';

/**
 * Lista de equipas do utilizador autenticado. Dentro do Início (InicioProvider
 * montado, ver Layout.jsx), lê de lá em vez de disparar o seu próprio
 * /api/teams — /api/inicio já traz isso (11-set, "1 pedido só"). Fora do
 * Início, comportamento de sempre.
 */
export function useTeams() {
  const inicio = useInicio(); // null fora do InicioProvider
  const dentroDoInicio = inicio !== null;
  const { data, loading, error } = useApi(dentroDoInicio ? null : '/api/teams');

  if (dentroDoInicio) {
    return { teams: inicio.dados?.teams?.teams || [], loading: inicio.carregando, error: inicio.erro };
  }
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
