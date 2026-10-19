// Futty v2.0 — Figurinha: os selos de honra — do cache na hora, revalidados por trás (janela de 5 min), e quais aparecem no cromo
// (até 2, sem os ocultos pelo olhinho).
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { lerCacheComIdade, gravarCache } from '../../lib/cacheLocal';

export function useSelosDaFigurinha({ userId }) {
  const [selos, setSelos] = useState(() => lerCacheComIdade(userId, 'selos')?.dados ?? []);

  const [selosDoUsuario, setSelosDoUsuario] = useState(userId);

  if (selosDoUsuario !== userId) {
    setSelosDoUsuario(userId);
    setSelos(lerCacheComIdade(userId, 'selos')?.dados ?? []);
  }

  const [selosOcultos, setSelosOcultos] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('futty_selos_ocultos') || '[]')); } catch { return new Set(); }
  });

  useEffect(() => {
    let ativo = true;
    const comIdade = lerCacheComIdade(userId, 'selos');
    const doCache = comIdade?.dados ?? null;
    // Janela de frescor de 5 minutos NESTA tela (a do useApiComCache é de 30 s). Se o
    // pré-aquecimento acabou de trazer os selos, não se pedem outra vez.
    //
    // Um selo é uma conquista (campeonato, 1º do ranking) — não muda enquanto a pessoa
    // escolhe um fundo. Com 30 s, abrir a Figurinha um minuto depois do Início
    // pagava 540 ms por dois emblemas que já estavam em casa. Fora da janela,
    // revalida por trás: o cromo desenha com os selos do cache e redesenha uma
    // vez se algum tiver mudado.
    const frescos = comIdade && comIdade.idadeMs < 5 * 60 * 1000;
    if (frescos) return () => { ativo = false; };
    apiFetch('/api/me/selos', { segundoPlano: !!doCache })
      .then((d) => {
        if (!ativo) return;
        setSelos(d.selos || []);
        gravarCache(userId, 'selos', d.selos || []);
      })
      .catch((e) => {
        if (doCache) console.warn('[Figurinha] /api/me/selos falhou, mantendo cache:', e.message);
      });
    return () => { ativo = false; };
  }, [userId]);

  function toggleSelo(id) {
    setSelosOcultos((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id); else n.add(id);
      localStorage.setItem('futty_selos_ocultos', JSON.stringify([...n]));
      return n;
    });
  }

  const selosVisiveis = selos.filter((s) => !selosOcultos.has(s.id)).slice(0, 2);

  const selosKey = selosVisiveis.map((s) => `${s.id}:${s.tier}`).join('|');

  return { selos, selosOcultos, toggleSelo, selosVisiveis, selosKey };
}
