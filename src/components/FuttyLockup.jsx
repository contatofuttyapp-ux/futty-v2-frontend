// Futty v2.0 — FASE 3.54 — Lockup da marca para a LandingPage: monograma F em metal,
// herói, com o wordmark "FUTTY" discreto por baixo.
//
// O F leva a receita completa (gradiente metálico no fill, sombra dura + difusa, glint,
// glow com respiração, entrada com escala). O wordmark é dourado liso e SEM animação —
// o palco é do F. Na landing o pulso permanente é permitido: é palco, não ferramenta.
//
// O wordmark migrou do `filter` hard-coded do FuttyLogo (invert/sepia/saturate...) para
// máscara: o filtro aplicava a mesma matriz a todos os pixéis e por isso nunca poderia
// produzir um gradiente nem uma cor exacta. O SVG são paths pretos sem classe (alfa 1),
// portanto serve directamente de máscara.
import { useId } from 'react';
import { F_CONTORNO } from '../utils/futtyMonograma';

// viewBox do wordmark: 0 0 989.45 355.51 → o rácio fixa a largura a partir da altura.
const WORDMARK_RACIO = 989.45 / 355.51;

// FASE 3.56 — EXTRUSÃO. O viewBox é 1080 e o F rende a ~124px, ou seja ~8.7 unidades
// de viewBox por pixel de ecrã. Os "1.5px por cópia" da receita são 13 unidades — mas
// a 13 as cópias descolavam e liam-se como fantasmas em vez de corpo. A 9 encostam e
// formam um bloco sólido. 5 cópias → ~45 unidades ≈ 5px de profundidade a 124px.
const EXTRUSAO_PASSO = 9;
const EXTRUSAO_CAMADAS = 5;
// Da mais funda (escura) para a mais próxima da face: o gradiente do "corpo" da letra.
const EXTRUSAO_CORES = ['#2e1f02', '#3a2703', '#463004', '#503705', '#5a3c05'];

export default function FuttyLockup({ size = 120, wordmarkSize = 44 }) {
  const uid = useId().replace(/:/g, '');
  const metalId = `futty-metal-${uid}`;
  const glintId = `futty-lockup-glint-${uid}`;
  const clipId = `futty-lockup-clip-${uid}`;
  const especularId = `futty-especular-${uid}`;

  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 14 }}>
      <svg
        className="futty-lockup-f"
        width={size}
        height={size}
        viewBox="0 0 1080 1080"
        role="img"
        aria-label="Futty"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          {/* FACE — FASE 3.63: quase CHAPADA no tom do título "FIGURINHA".
              O gradiente largo (#fdf0b0 → #6b4e06) dava média 221,175,43 contra os
              212,160,23 do título: Δ 20, e lia-se amarelo. Qualquer gradiente que
              termine em escuro puxa a média para longe do alvo — medido, as variantes
              testadas davam −18 a −39. A única forma de chegar a Δ<8 é colapsar a banda:
              ±5% de luminosidade à volta de rgb(212,160,23). A curvatura fica residual;
              o volume passa a viver na GEOMETRIA (extrusão + bisel), não na cor.
              O eixo por omissão do SVG é oeste→este (= 90deg em CSS) → rotate(45). */}
          <linearGradient id={metalId} gradientTransform="rotate(45 0.5 0.5)">
            <stop offset="0" stopColor="#dfa818" />
            <stop offset="0.5" stopColor="#d4a017" />
            <stop offset="1" stopColor="#c99816" />
          </linearGradient>
          <clipPath id={clipId}>
            <path d={F_CONTORNO} />
          </clipPath>
          <filter id={especularId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="34" />
          </filter>
          <linearGradient id={glintId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff6d0" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff6d0" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fff6d0" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* a) EXTRUSÃO — o corpo sólido, atrás. Da mais funda para a mais próxima. */}
        {EXTRUSAO_CORES.map((cor, i) => {
          const d = (EXTRUSAO_CAMADAS - i) * EXTRUSAO_PASSO;
          return <path key={i} d={F_CONTORNO} fill={cor} transform={`translate(${d} ${d})`} />;
        })}

        {/* b) FACE */}
        <path d={F_CONTORNO} fill={`url(#${metalId})`} />

        {/* c) BISEL + d) ESPECULAR + glint — tudo recortado pela face, para não
            transbordarem para a extrusão. */}
        <g clipPath={`url(#${clipId})`}>
          {/* Bisel: a aproximação que a receita admite. Dois strokes do MESMO path,
              deslocados em sentidos opostos — o claro para cima-esquerda (as arestas
              que apanham luz), o escuro para baixo-direita (as que ficam na sombra).
              O clip corta metade de cada um, e é isso que faz o chanfro. */}
          <path d={F_CONTORNO} fill="none" stroke="rgba(60,40,0,0.7)" strokeWidth="10" transform="translate(5 5)" />
          <path d={F_CONTORNO} fill="none" stroke="rgba(255,244,190,0.9)" strokeWidth="10" transform="translate(-5 -5)" />
          {/* Especular: a luz "molhada" no terço superior da haste. FASE 3.63 — 0.35 →
              0.10: a 0.35 clareava a face e puxava a média para longe do tom do título. */}
          <ellipse
            cx="392" cy="420" rx="78" ry="190"
            fill="#ffffff" opacity="0.10"
            filter={`url(#${especularId})`}
            transform="rotate(-15 392 420)"
          />
          <rect className="futty-lockup-glint" x="-1080" y="0" width="1080" height="1080" fill={`url(#${glintId})`} />
        </g>
      </svg>
      <span
        aria-hidden="true"
        style={{
          display: 'block',
          height: wordmarkSize,
          width: wordmarkSize * WORDMARK_RACIO,
          backgroundColor: '#d4a017',
          WebkitMaskImage: 'url(/futty-wordmark.svg)',
          maskImage: 'url(/futty-wordmark.svg)',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
        }}
      />
    </div>
  );
}
