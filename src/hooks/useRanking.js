// Futty v2.0 — Hook de dados do ranking de uma equipa (modelo definitivo).
// Cache local (13-set, "Velocidade 3"): mostra o ranking da última visita na
// hora, atualiza por trás.
import { useApiComCache } from './useApiComCache';

export function useRanking(slug) {
  const path = slug ? `/api/teams/${slug}/ranking` : null;
  // revalidarDepoisDaPintura (Rodada 8A): com cache velho, a lista pinta antes de
  // o pedido sair — ver a nota em useApiComCache.js.
  const { data, loading, error, reload } = useApiComCache(path, slug ? `ranking:${slug}` : null, { revalidarDepoisDaPintura: true });
  return {
    team: data?.team || null,
    ranking: data?.ranking || [],
    loading,
    error,
    reload,
  };
}
