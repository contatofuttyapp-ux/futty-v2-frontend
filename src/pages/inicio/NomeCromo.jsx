// Futty v2.0 — Início: o nome por baixo do cromo, que encolhe até caber numa linha.

import { useLayoutEffect, useRef } from 'react';

// Nome por baixo do cromo, em texto livre grande (o quadrado não o traz baked). Base 44px; encolhe até
// caber numa linha, como o nome da figurinha: a letra desce até o nome caber, em qualquer largura. Só
// como defesa teórica há um piso (PISO_NOME) e, abaixo dele, a reticência.
// A medida é a do TEXTO, em sub-pixel (Range), e não scrollWidth: scrollWidth é inteiro e, com
// text-overflow: ellipsis, o Chrome o devolve igual ao clientWidth mesmo com o texto meio pixel mais largo
// (360,45 numa caixa de 360) — o laço não entrava e a reticência aparecia por esse meio pixel. Texto e caixa
// medidos pelo mesmo getBoundingClientRect, para uma transformação no caminho (a entrada da página) afetar os
// dois igual; 1 px de folga para o arredondamento da pintura não virar "…".
// A medição é impura → useLayoutEffect, antes do paint, para o utilizador não ver um salto de tamanho.
// Reajusta em resize e quando as fontes carregam (a Rajdhani mede diferente da fallback).
const PISO_NOME = 9;
export function NomeCromo({ nome }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const larguraDoTexto = () => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getBoundingClientRect().width;
    };
    const ajustar = () => {
      let f = 44;
      el.style.fontSize = `${f}px`;
      const cabe = el.getBoundingClientRect().width - 1;
      if (cabe <= 0) return; // fora da tela (display: none): mede de novo quando aparecer
      // Primeiro o palpite proporcional (a largura do texto cresce com a letra), depois o ajuste fino de 1 em
      // 1 px até caber.
      const largura = larguraDoTexto();
      if (largura > cabe) {
        f = Math.max(PISO_NOME, Math.floor((f * cabe) / largura));
        el.style.fontSize = `${f}px`;
      }
      while (larguraDoTexto() > cabe && f > PISO_NOME) {
        f -= 1;
        el.style.fontSize = `${f}px`;
      }
    };
    ajustar();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(ajustar) : null;
    if (ro) ro.observe(el);
    if (document.fonts?.ready) document.fonts.ready.then(ajustar).catch(() => {});
    return () => ro && ro.disconnect();
  }, [nome]);
  return (
    <div
      ref={ref}
      style={{
        fontFamily: "'Rajdhani', sans-serif",
        fontWeight: 700,
        fontSize: 44,
        letterSpacing: '0.04em',
        // Sem forçar maiúsculas: o nome sai como a pessoa escreveu, igual à Resenha e ao resto do app.
        color: '#f0c94a',
        textAlign: 'center',
        lineHeight: 1.05,
        width: '100%',
        maxWidth: 360,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {nome}
    </div>
  );
}
