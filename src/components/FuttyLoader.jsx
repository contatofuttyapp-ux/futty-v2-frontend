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
import { useId } from 'react';

// Contorno do F (public/favicon.svg) — usado como clip e como trilho ténue.
const F_CONTORNO =
  'M392.28 576.53 L648.8 576.5 L659.27 541.52 L398.39 541.46 L472.99 285.11 L828.3 195.25 ' +
  'L839.06 152.39 L440.51 257.5 L210.76 1049.58 L110.36 1049.52 L360.67 177.16 L983.79 16.94 ' +
  'L913.11 270.83 L548.68 369.73 L532.74 441.62 L798.55 441.67 L732.82 676.38 L462.77 676.38 ' +
  'L354.76 1049.56 L249.78 1049.53 Z';

// Espinha do F: extremidade inferior esquerda → haste → barra de topo (gancho) →
// barra do meio (gancho) → extremidade inferior direita.
const F_ESQUELETO =
  'M141.16 1116.85 L400.59 217.33 L911.43 84.67 L870.71 233.04 L510.84 327.42 ' +
  'L465.57 491.54 L728.91 491.60 L690.81 626.44 L427.53 626.46 L282.40 1116.65';

export default function FuttyLoader({ size = 44, label = 'Carregando…' }) {
  // ids únicos por instância: podem coexistir dois loaders no mesmo ecrã.
  const uid = useId().replace(/:/g, '');
  const clipId = `futty-loader-clip-${uid}`;
  const shineId = `futty-loader-shine-${uid}`;

  return (
    <div role="status" aria-live="polite" style={{ display: 'grid', justifyItems: 'center', gap: 10 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 1080 1080"
        aria-hidden="true"
        style={{ display: 'block', filter: 'drop-shadow(0 0 9px rgba(212, 160, 23, 0.55))' }}
      >
        <defs>
          <clipPath id={clipId}>
            <path d={F_CONTORNO} />
          </clipPath>
          <linearGradient id={shineId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff6d0" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff6d0" stopOpacity="0.9" />
            <stop offset="1" stopColor="#fff6d0" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Trilho: o F fica legível no instante 0, antes da escova o pintar. */}
        <path d={F_CONTORNO} fill="rgba(212, 160, 23, 0.16)" />
        <g clipPath={`url(#${clipId})`}>
          {/* A escova. O clip dá-lhe a forma exacta do F. */}
          <path
            className="futty-loader-draw"
            d={F_ESQUELETO}
            pathLength="1"
            fill="none"
            stroke="#d4a017"
            strokeWidth="110"
            strokeLinejoin="miter"
            strokeMiterlimit="20"
            strokeLinecap="butt"
          />
          {/* Shine: varre a letra no fim de cada ciclo. */}
          <rect className="futty-loader-shine" x="-1080" y="0" width="1080" height="1080" fill={`url(#${shineId})`} />
        </g>
      </svg>
      {label ? (
        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-dim)' }}>
          {label}
        </span>
      ) : null}
    </div>
  );
}
