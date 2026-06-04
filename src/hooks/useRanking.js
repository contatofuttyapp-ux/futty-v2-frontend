// Futty v2.0 — Hook de dados do ranking de uma equipa.
import { useApi } from './useApi';

export function useRanking(slug, periodo = 'geral') {
  const path = slug ? `/api/teams/${slug}/ranking?periodo=${periodo}` : null;
  const { data, loading, error, reload } = useApi(path);
  return {
    team: data?.team || null,
    ranking: data?.ranking || [],
    votacao: data?.votacao || null,
    loading,
    error,
    reload,
  };
}
