// Futty v2.0 — Hook de dados do ranking de uma equipa (modelo definitivo).
import { useApi } from './useApi';

export function useRanking(slug) {
  const path = slug ? `/api/teams/${slug}/ranking` : null;
  const { data, loading, error, reload } = useApi(path);
  return {
    team: data?.team || null,
    ranking: data?.ranking || [],
    loading,
    error,
    reload,
  };
}
