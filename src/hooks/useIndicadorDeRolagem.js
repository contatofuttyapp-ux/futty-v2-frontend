// Futty v2.0 — Rodada 29L (achados 130 e 138): diz se um trilho horizontal tem mais conteúdo escondido à esquerda e/ou à direita. Quem usa
// põe `ref={aoMontar}` no trilho e `data-mais-esq` / `data-mais-dir` nele (o CSS da casa, em app.css, esmaece a borda e a pessoa vê que continua).
// Só re-renderiza quando um dos dois lados MUDA (não a cada pixel rolado).
import { useEffect, useState } from 'react';
import { estadoDaFaixa } from '../utils/faixaRolavel';

export function useIndicadorDeRolagem() {
  const [no, setNo] = useState(null);
  const [estado, setEstado] = useState({ esquerda: false, direita: false });

  useEffect(() => {
    if (!no) return undefined;
    let ativo = true;
    const medir = () => {
      if (!ativo) return;
      const proximo = estadoDaFaixa(no);
      setEstado((atual) => (atual.esquerda === proximo.esquerda && atual.direita === proximo.direita ? atual : proximo));
    };
    const primeira = requestAnimationFrame(medir);
    no.addEventListener('scroll', medir, { passive: true });
    window.addEventListener('resize', medir);
    const olheiro = typeof ResizeObserver === 'function' ? new ResizeObserver(medir) : null;
    olheiro?.observe(no);
    const mudancas = typeof MutationObserver === 'function' ? new MutationObserver(medir) : null;
    mudancas?.observe(no, { childList: true, subtree: true });
    // A fonte da casa (Rajdhani) muda a largura dos chips quando chega: mede de novo.
    document.fonts?.ready?.then(medir);
    return () => {
      ativo = false;
      cancelAnimationFrame(primeira);
      no.removeEventListener('scroll', medir);
      window.removeEventListener('resize', medir);
      olheiro?.disconnect();
      mudancas?.disconnect();
    };
  }, [no]);

  // `aoMontar` vai no `ref=` do trilho (é uma função, não um ref lido na renderização).
  return { aoMontar: setNo, no, esquerda: estado.esquerda, direita: estado.direita };
}
