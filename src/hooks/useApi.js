// Futty v2.0 — Hook genérico para um GET autenticado à API.
// Devolve { data, loading, error, reload } com estado de loading consistente.
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

export function useApi(path) {
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
    if (!path) return undefined;
    let active = true;
    apiFetch(path)
      .then((data) => active && setState({ data, error: '', loadedPath: path }))
      .catch((err) => active && setState({ data: null, error: err.message, loadedPath: path }));
    return () => {
      active = false;
    };
  }, [path]);

  // loading enquanto os dados carregados não corresponderem ao path atual.
  const loading = !!path && state.loadedPath !== path;
  return { data: state.data, error: state.error, loading, reload };
}
