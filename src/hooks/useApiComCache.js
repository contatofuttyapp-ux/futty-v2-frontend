// Futty v2.0 — Wrapper de useApi com cache local (13-set, "Velocidade 3":
// stale-while-revalidate). Mostra a última resposta boa na hora (sem
// LoadingFutty) e busca por trás — só usado onde a Velocidade 3 pediu
// (useTeam(slug) e o ranking da equipa); os outros consumidores de useApi
// ficam como estavam (pedidos que só fazem sentido frescos, ou telas onde
// "mostrar dado velho" seria mais confuso que esperar).
import { useEffect, useState } from 'react';
import { useApi } from './useApi';
import { useAuth } from './useAuth';
import { lerCache, gravarCache } from '../lib/cacheLocal';

/**
 * @param {string|null} path - mesmo contrato do useApi (null = não busca).
 * @param {string|null} cacheKey - chave do cache local (ex.: `team:${slug}`);
 *   null desliga o cache (mesmo comportamento do useApi puro).
 */
export function useApiComCache(path, cacheKey) {
  const { session } = useAuth();
  const userId = session?.user?.id || null;
  const { data, loading, error, reload } = useApi(path);

  const [dadosCache, setDadosCache] = useState(null);

  // Troca de chave (ex.: navegar de uma equipa para outra) — descarta o cache
  // antigo e carrega o da chave nova. Adiado ao microtask: nunca setState
  // síncrono no corpo do efeito (mesmo padrão do resto da app).
  useEffect(() => {
    let ativo = true;
    Promise.resolve().then(() => {
      if (ativo) setDadosCache(cacheKey ? lerCache(userId, cacheKey) : null);
    });
    return () => {
      ativo = false;
    };
  }, [cacheKey, userId]);

  // Resposta fresca chegou — regrava o cache e larga o valor "de cache" (o
  // dado fresco do useApi passa a ser a fonte).
  useEffect(() => {
    if (!data || !cacheKey) return undefined;
    gravarCache(userId, cacheKey, data);
    let ativo = true;
    Promise.resolve().then(() => {
      if (ativo) setDadosCache(null);
    });
    return () => {
      ativo = false;
    };
  }, [data, userId, cacheKey]);

  useEffect(() => {
    if (error && dadosCache) {
      console.warn(`[useApiComCache] ${path} falhou, mantendo cache:`, error);
    }
  }, [error, dadosCache, path]);

  return {
    data: data ?? dadosCache,
    loading: loading && !dadosCache,
    error: dadosCache ? '' : error,
    reload,
  };
}
