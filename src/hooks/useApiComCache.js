// Futty v2.0 — Wrapper de useApi com cache local (13-set, "Velocidade 3":
// stale-while-revalidate). Mostra a última resposta boa na hora (sem
// LoadingFutty) e busca por trás.
//
// VELOCIDADE 6B (15-set), duas mudanças:
//
// 1. A leitura do cache passou a ser SÍNCRONA, no useState inicial. Antes
//    acontecia num microtask depois do primeiro render — ou seja, o primeiro
//    render era sempre sem dados, e a tela piscava o LoadingFutty a CADA troca
//    de aba mesmo tendo tudo em cache.
//
// 2. `frescoMs`: se a entrada foi gravada há menos de X (o pré-aquecimento
//    acabou de passar por ali — ver lib/preaquecerDados.js), nem se pede de
//    novo. Passa-se path=null ao useApi e pronto: trocar de aba não custa
//    pedido nenhum. Passado esse prazo, volta ao comportamento de sempre
//    (pinta do cache, revalida por trás). O `reload()` manual ignora a janela.
import { useCallback, useEffect, useState } from 'react';
import { useApi } from './useApi';
import { useAuth } from './useAuth';
import { lerCacheComIdade, gravarCache } from '../lib/cacheLocal';

const FRESCO_PADRAO_MS = 30000;

/**
 * @param {string|null} path - mesmo contrato do useApi (null = não busca).
 * @param {string|null} cacheKey - chave do cache local (ex.: `team:${slug}`);
 *   null desliga o cache (mesmo comportamento do useApi puro).
 * @param {{ frescoMs?: number }} [opts] - janela em que o cache conta como
 *   fresco e o pedido é dispensado. 0 desliga a janela (revalida sempre).
 */
export function useApiComCache(path, cacheKey, opts = {}) {
  const { session } = useAuth();
  const userId = session?.user?.id || null;
  const frescoMs = opts.frescoMs ?? FRESCO_PADRAO_MS;

  // Leitura SÍNCRONA: o primeiro render já sai com dados, sem piscar.
  const ler = () => (cacheKey && userId ? lerCacheComIdade(userId, cacheKey) : null);
  const [doCache, setDoCache] = useState(ler);
  // `forcado` fica verdadeiro quando o utilizador pede dado novo (reload manual):
  // aí a janela de frescor é ignorada.
  const [forcado, setForcado] = useState(false);

  // Troca de chave (navegar de uma equipa para outra): ajusta o estado DURANTE o
  // render — é o padrão oficial do React para estado derivado de props, e evita
  // tanto o efeito (que só correria depois de já ter pintado o dado errado) como
  // o setState-em-efeito que o lint da casa proíbe.
  const [chaveVista, setChaveVista] = useState(cacheKey);
  if (chaveVista !== cacheKey) {
    setChaveVista(cacheKey);
    setDoCache(ler());
    setForcado(false);
  }

  const fresco = !forcado && !!doCache && frescoMs > 0 && doCache.idadeMs < frescoMs;

  // `pausado` (e não path=null): o path continua vivo para o reload() manual —
  // puxar para atualizar tem de pedir mesmo com o cache fresco.
  const { data, loading, error, reload: reloadBase } = useApi(path, { pausado: fresco });

  // Resposta fresca chegou — regrava o cache. Não é preciso largar o valor "de
  // cache": quem manda no retorno é o `data`, logo abaixo.
  useEffect(() => {
    if (!data || !cacheKey) return;
    gravarCache(userId, cacheKey, data);
  }, [data, userId, cacheKey]);

  useEffect(() => {
    if (error && doCache) {
      console.warn(`[useApiComCache] ${path} falhou, mantendo cache:`, error);
    }
  }, [error, doCache, path]);

  // reload() explícito tem de furar a janela de frescor.
  const reload = useCallback(async () => {
    setForcado(true);
    return reloadBase();
  }, [reloadBase]);

  return {
    data: data ?? doCache?.dados ?? null,
    loading: loading && !doCache,
    error: doCache ? '' : error,
    reload,
  };
}
