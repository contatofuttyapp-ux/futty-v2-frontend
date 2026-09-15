// Futty v2.0 — Hook genérico para um GET autenticado à API.
// Devolve { data, loading, error, reload } com estado de loading consistente.
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

// Dois componentes a pedir o MESMO path ao mesmo tempo dão uma ida à rede só:
// desde a Velocidade 7B essa coalescência vive no próprio apiFetch (lib/api.js),
// e vale também para quem chama apiFetch direto (pré-aquecimento, Figurinha).

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
    apiFetch(path)
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
