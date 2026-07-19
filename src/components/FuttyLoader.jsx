// Futty v2.0 — Loader oficial da marca: o monograma F é PINTADO de um gesto.
// Substitui os loadings genéricos (spinner do lucide, texto "Carregando…").
//
// FASE 3.46 — antes animava-se o CONTORNO do F (lia-se como linha dupla). Agora
// anima-se o ESQUELETO: uma polyline que percorre a espinha do F, com um traço
// grosso (110) RECORTADO pelo contorno real. À medida que o stroke-dash avança, a
// escova pinta a letra; o clip garante que a forma é exactamente a do logo, por isso
// o esqueleto só precisa de estar dentro do listel, não de ser um eixo medial exacto.
//
// GEOMETRIA (medida em public/favicon.svg, viewBox 1080): o F é um listel contínuo de
// largura ~98 que faz DOIS ganchos — sobe a banda esquerda, sai na barra de topo,
// inverte, volta, desce, sai na barra do meio, inverte, volta, desce a haste. Ou seja
// o "gesto único" é literalmente a forma. Os pontos do esqueleto são os centros do
// listel em cada canto (média das duas margens). Cada gancho precisa de DOIS pontos
// (fim da ida + início da volta): com um só, o miter não fecha a cunha do canto
// superior direito e ficavam 6% do F por pintar (medido: 94.07% vs 99.99%).
// As duas pontas são prolongadas 70 para lá da borda — o clip corta-as rente, dando
// remates rectos perfeitos sem depender do strokeLinecap.
//
// PELE — a FORMA é a de sempre (F_CONTORNO/F_ESQUELETO); só a pintura mudou: a escova
// já não é ouro chapado, é a PELE METÁLICA v4 (gradiente ouro escuro→claro no stroke,
// bisel specular, glow leve) aprovada no harness. À medida que o pincel percorre a
// espinha, o metal biselado revela-se; no fim cobre o F inteiro.
import { useId } from 'react';
import { F_CONTORNO, F_ESQUELETO } from '../utils/futtyMonograma';

// Marcador de entrega — confirma no browser que o build novo do loader está servido.
if (typeof window !== 'undefined' && window.FUTTY_BUILD !== 'loader-ouro-v3') {
  window.FUTTY_BUILD = 'loader-ouro-v3';
  console.log("[FUTTY_BUILD] loader-ouro-v3 (branco morto: halo/pincel só ouro, specular ouro-quente, shine fora)");
}

// FASE 3.48 — +35% em todos os tamanhos (default 44 → 59; overlay 64 → 86; botão 16 → 22).
export default function FuttyLoader({ size = 59, label = 'Carregando…' }) {
  // ids únicos por instância: podem coexistir dois loaders no mesmo ecrã.
  const uid = useId().replace(/:/g, '');
  const clipId = `futty-loader-clip-${uid}`;
  const metalId = `futty-loader-metal-${uid}`;
  const metalDeepId = `futty-loader-metaldeep-${uid}`;
  const biselId = `futty-loader-bisel-${uid}`;
  const glowId = `futty-loader-glow-${uid}`;

  return (
    <div role="status" aria-live="polite" style={{ display: 'grid', justifyItems: 'center', gap: 10 }}>
      {/* FASE B — flutuação. As camadas (sombra no chão → bob → sway → svg) e o porquê
          de serem separadas estão explicados no app.css, em ".futty-f-bob". A mesma
          estrutura vive no FuttyLockup: mesma física nos dois F. */}
      <div style={{ position: 'relative', width: size, height: size }}>
        <span
          className="futty-f-shadow"
          aria-hidden="true"
          style={{ position: 'absolute', left: '15%', bottom: -6, width: '70%', height: 8, background: 'radial-gradient(ellipse, rgba(0,0,0,0.55), transparent 70%)', filter: 'blur(6px)', pointerEvents: 'none' }}
        />
        <div className="futty-f-bob">
          <div className="futty-f-sway">
      <svg
        width={size}
        height={size}
        viewBox="0 0 1080 1080"
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        <defs>
          <clipPath id={clipId}>
            <path d={F_CONTORNO} />
          </clipPath>
          {/* Pele: gradiente com os hexes REAIS amostrados do PNG de referência
              (ouro saturado e profundo, R>>G>>B; nada de creme pálido). */}
          <linearGradient id={metalId} gradientUnits="objectBoundingBox" x1="0.28" y1="0" x2="0.56" y2="1">
            <stop offset="0" stopColor="#d69512" />
            <stop offset="0.35" stopColor="#a86808" />
            <stop offset="0.62" stopColor="#8a5304" />
            <stop offset="0.82" stopColor="#5a3703" />
            <stop offset="1" stopColor="#341a02" />
          </linearGradient>
          {/* Gradiente PROFUNDO — só para o traço do pincel: sem o pico claro (esse vem
              do bisel). O metal em movimento fica na cor original/profunda; o claro vive
              no halo parado e na luz specular. */}
          <linearGradient id={metalDeepId} gradientUnits="objectBoundingBox" x1="0.28" y1="0" x2="0.56" y2="1">
            <stop offset="0" stopColor="#d69512" />
            <stop offset="0.3" stopColor="#b57305" />
            <stop offset="0.6" stopColor="#8a5304" />
            <stop offset="0.85" stopColor="#5a3703" />
            <stop offset="1" stopColor="#341a02" />
          </linearGradient>
          {/* Bisel specular de ALTO contraste — o metal vem do escuro↔claro:
              specular branco puro sobre a base escura do gradiente. */}
          <filter id={biselId} x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="b" />
            <feSpecularLighting in="b" surfaceScale="6" specularConstant="1.1" specularExponent="20" lightingColor="#e8b83a" result="s">
              <feDistantLight azimuth="228" elevation="55" />
            </feSpecularLighting>
            <feComposite in="s" in2="SourceAlpha" operator="in" result="sc" />
            <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="sc" /></feMerge>
          </filter>
          {/* Glow = cópia do próprio F desfocada. Herda o gradiente metálico, por isso
              o halo tem EXACTAMENTE as cores do metal (impossível "cor errada"). */}
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="26" />
          </filter>
        </defs>
        {/* Cópia-glow COMPLETA desde o frame zero: mesmo path, metal claro, desfocada a 0.45.
            É aqui que o "claro" vive — parado, atrás do pincel. */}
        <path d={F_CONTORNO} fill={`url(#${metalId})`} filter={`url(#${glowId})`} opacity="0.35" />
        {/* Trilho: o F fica legível no instante 0, antes da escova o pintar — em metal ténue. */}
        <path d={F_CONTORNO} fill={`url(#${metalId})`} opacity="0.22" />
        <g clipPath={`url(#${clipId})`}>
          {/* A escova. O clip dá-lhe a forma exacta do F; o stroke leva a pele metálica
              e o bisel specular, por isso o metal biselado pinta-se com o gesto. */}
          <path
            className="futty-loader-draw"
            d={F_ESQUELETO}
            pathLength="1"
            fill="none"
            stroke={`url(#${metalDeepId})`}
            strokeWidth="110"
            strokeLinejoin="miter"
            strokeMiterlimit="20"
            strokeLinecap="butt"
            filter={`url(#${biselId})`}
          />
        </g>
      </svg>
          </div>
        </div>
      </div>
      {label ? (
        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-dim)' }}>
          {label}
        </span>
      ) : null}
    </div>
  );
}
