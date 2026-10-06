// Futty v2.0 — Hook de dados do ranking de uma equipa (modelo definitivo).
// Cache local: mostra o ranking da última visita na
// hora, atualiza por trás.
import { useApiComCache } from './useApiComCache';

// Uma lista vazia ESTÁVEL. `data?.ranking || []` criava um array
// novo a cada render enquanto os dados não chegavam — e uma identidade nova a
// cada render faz qualquer consumidor que compare listas (useMemo, useEffect,
// useListaProgressiva) achar que a lista mudou, sempre.
const VAZIO = [];

export function useRanking(slug) {
  const path = slug ? `/api/teams/${slug}/ranking` : null;
  // revalidarDepoisDaPintura: com cache velho, a lista pinta antes de
  // o pedido sair — ver a nota em useApiComCache.js.
  const { data, loading, error, reload } = useApiComCache(path, slug ? `ranking:${slug}` : null, { revalidarDepoisDaPintura: true });
  return {
    team: data?.team || null,
    ranking: data?.ranking || VAZIO,
    loading,
    error,
    reload,
  };
}
