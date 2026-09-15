// Futty v2.0 — Hook genérico para um GET autenticado à API.
// Devolve { data, loading, error, reload } com estado de loading consistente.
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

// VELOCIDADE 6B (15-set) — dois componentes montados ao mesmo tempo a pedir o
// MESMO path davam dois pedidos iguais à rede. O caso real: a barra de baixo e
// o Ranking pedem ambos o votacao-status do time, e de Lisboa isso são duas
// idas de ~250 ms a São Paulo para a mesma resposta.
//
// Aqui guarda-se a promessa em voo por path: o segundo a chegar pega a mesma.
// A entrada sai do mapa assim que a promessa termina — isto NÃO é cache de
// resposta (esse é o cacheLocal), é só uma janela de coalescência.
const emVoo = new Map();

function buscarUmaVez(path) {
  const existente = emVoo.get(path);
  if (existente) return existente;
  const p = apiFetch(path).finally(() => {
    if (emVoo.get(path) === p) emVoo.delete(path);
  });
  emVoo.set(path, p);
  return p;
}

/**
 * @param {string|null} path - null = não busca.
 * @param {{ pausado?: boolean }} [opts] - `pausado` não dispara ao montar, mas
 *   mantém o `path` vivo para o `reload()` (Velocidade 6B: o cache está fresco,
 *   não vale a pena pedir — mas se a pessoa puxar para atualizar, pede).
 */
export function useApi(path, opts = {}) {
  const { pausado = false } = opts;
  const [state, setState] = useState({ data: null, error: '', loadedPath: null });

  // Recarrega o mesmo path (ex.: após uma ação). Devolve os dados ou null.
  const reload = useCallback(async () => {
    if (!path) return null;
    try {
      const data = await apiFetch(path);
      setState({ data, error: '', loadedPath: path });
      return data;
    } catch (err) {
      setState({ data: null, error: err.message, loadedPath: path });
      return null;
    }
  }, [path]);

  useEffect(() => {
    if (!path || pausado) return undefined;
    let active = true;
    buscarUmaVez(path)
      .then((data) => active && setState({ data, error: '', loadedPath: path }))
      .catch((err) => active && setState({ data: null, error: err.message, loadedPath: path }));
    return () => {
      active = false;
    };
  }, [path, pausado]);

  // loading enquanto os dados carregados não corresponderem ao path atual.
  // Pausado nunca está a carregar: quem chama já tem o que mostrar.
  const loading = !!path && !pausado && state.loadedPath !== path;
  return { data: state.data, error: state.error, loading, reload };
}
