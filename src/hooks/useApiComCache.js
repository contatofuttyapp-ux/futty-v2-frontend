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
import { aoVoltar } from '../lib/regresso';

const FRESCO_PADRAO_MS = 30000;

/**
 * @param {string|null} path - mesmo contrato do useApi (null = não busca).
 * @param {string|null} cacheKey - chave do cache local (ex.: `team:${slug}`);
 *   null desliga o cache (mesmo comportamento do useApi puro).
 * @param {{ frescoMs?: number, revalidarDepoisDaPintura?: boolean }} [opts]
 *   frescoMs: janela em que o cache conta como fresco e o pedido é dispensado
 *   (0 desliga a janela — revalida sempre).
 *   revalidarDepoisDaPintura: com cache VELHO na tela, o pedido só sai depois de
 *   a tela pintar (dois quadros) — ver a nota abaixo.
 */
export function useApiComCache(path, cacheKey, opts = {}) {
  const { session } = useAuth();
  const userId = session?.user?.id || null;
  const frescoMs = opts.frescoMs ?? FRESCO_PADRAO_MS;
  const adiarRevalidacao = !!opts.revalidarDepoisDaPintura;

  // Leitura SÍNCRONA: o primeiro render já sai com dados, sem piscar.
  const ler = () => (cacheKey && userId ? lerCacheComIdade(userId, cacheKey) : null);
  const ehFresco = (entrada) => !!entrada && frescoMs > 0 && entrada.idadeMs < frescoMs;
  const [doCache, setDoCache] = useState(ler);
  // `forcado` fica verdadeiro quando o usuário pede dado novo (reload manual):
  // aí a janela de frescor é ignorada.
  const [forcado, setForcado] = useState(false);

  // RODADA 8A — revalidar DEPOIS de pintar (opt-in; o Ranking usa). Nos
  // relatórios do iPhone (builds 17 e 18, mesma conta e aparelho) o Ranking com
  // cache VELHO pintou em 1389, 2121 e 1866 ms — os dados chegaram antes da
  // pintura (704, 436, 809) —, e com cache FRESCO, sem pedido nenhum, em 226 a
  // 332 ms. A 1ª pintura dessa tela é cara no iPhone (23 linhas, pódio e botões
  // animados), e a resposta a chegar a meio dela custava mais um segundo. Com
  // isto a lista do cache pinta sozinha, e o pedido sai dois quadros depois.
  // O WebKit do PC não reproduz a demora; as marcas novas do Diagnóstico
  // (lista, listaNova, 1º quadro, maior quadro) confirmam no próximo relatório.
  const esperaPara = (entrada) => adiarRevalidacao && !!entrada && !ehFresco(entrada);
  const [esperandoPintura, setEsperandoPintura] = useState(() => esperaPara(doCache));

  // Troca de chave (navegar de um time para outro): ajusta o estado DURANTE o
  // render — é o padrão oficial do React para estado derivado de props, e evita
  // tanto o efeito (que só correria depois de já ter pintado o dado errado) como
  // o setState-em-efeito que o lint da casa proíbe.
  const [chaveVista, setChaveVista] = useState(cacheKey);
  if (chaveVista !== cacheKey) {
    const novo = ler();
    setChaveVista(cacheKey);
    setDoCache(novo);
    setForcado(false);
    setEsperandoPintura(esperaPara(novo));
  }

  const fresco = !forcado && ehFresco(doCache);

  useEffect(() => {
    if (!esperandoPintura) return undefined;
    // Dois quadros: o 1º ainda cai antes do desenho, o 2º já com a tela pintada
    // (o mesmo critério da pintura no Diagnóstico). Sem rAF, um instante depois.
    if (typeof requestAnimationFrame === 'undefined') {
      const id = setTimeout(() => setEsperandoPintura(false), 50);
      return () => clearTimeout(id);
    }
    let segundo = null;
    const primeiro = requestAnimationFrame(() => {
      segundo = requestAnimationFrame(() => setEsperandoPintura(false));
    });
    return () => {
      cancelAnimationFrame(primeiro);
      if (segundo != null) cancelAnimationFrame(segundo);
    };
  }, [esperandoPintura]);

  // `pausado` (e não path=null): o path continua vivo para o reload() manual —
  // puxar para atualizar tem de pedir mesmo com o cache fresco.
  const { data, loading, error, reload: reloadBase } = useApi(path, { pausado: fresco || esperandoPintura });

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

  // VELOCIDADE 8 (16-set) — o app voltou à frente: a aba que está na tela
  // revalida, se o que ela mostra já passou da janela de frescor. A idade lê-se
  // do cache OUTRA VEZ (não do `doCache` em estado): aquela foi medida no
  // instante da montagem e não envelhece sozinha — o app pode ter passado uma
  // hora em segundo plano com o mesmo objeto em memória.
  //
  // reloadBase(), não reload(): o `forcado` é para o "puxar para atualizar" da
  // pessoa e, uma vez ligado, desliga a janela de frescor para o resto da vida
  // do componente. Uma revalidação de fundo não deve deixar essa marca. E não
  // acende loading nenhum (ver useApi.reload): a tela não pisca.
  useEffect(() => {
    if (!path || !cacheKey || !userId) return undefined;
    return aoVoltar(() => {
      const agora = lerCacheComIdade(userId, cacheKey);
      if (agora && frescoMs > 0 && agora.idadeMs < frescoMs) return;
      reloadBase();
    });
  }, [path, cacheKey, userId, frescoMs, reloadBase]);

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
