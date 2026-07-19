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
import { F_METAL_PATH } from '../utils/futtyMonograma';

// FASE 3.48 — +35% em todos os tamanhos (default 44 → 59; overlay 64 → 86; botão 16 → 22).
export default function FuttyLoader({ size = 59, label = 'Carregando…' }) {
  // ids únicos por instância: podem coexistir dois loaders no mesmo ecrã.
  const uid = useId().replace(/:/g, '');
  const metalId = `futty-loader-metal-${uid}`;
  const biselId = `futty-loader-bisel-${uid}`;

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
      {/* TRANSPLANTE EXACTO do harness f-metalico-v4 (byte a byte): viewBox 1024,
          F_METAL_PATH, o MESMO gradiente e filtro-bisel, stroke #d9b45a 0.8, glow igual.
          O efeito de "desenhar" é um fade simples (a máscara de revelação alterava o
          aspecto por o esqueleto viver noutra grelha, por isso morreu). */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 1024 1024"
        aria-hidden="true"
        style={{ display: 'block', filter: 'drop-shadow(0 0 10px rgba(212,160,23,0.38))' }}
      >
        <defs>
          <linearGradient id={metalId} gradientUnits="objectBoundingBox" x1="0.28" y1="0" x2="0.56" y2="1">
            <stop offset="0" stopColor="#f6e6ac" />
            <stop offset="0.12" stopColor="#c69a2e" />
            <stop offset="0.32" stopColor="#8f6415" />
            <stop offset="0.56" stopColor="#62430d" />
            <stop offset="0.8" stopColor="#452e07" />
            <stop offset="1" stopColor="#2c1c05" />
          </linearGradient>
          <filter id={biselId} x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="b" />
            <feSpecularLighting in="b" surfaceScale="4" specularConstant="0.85" specularExponent="22" lightingColor="#fff2c4" result="s">
              <feDistantLight azimuth="228" elevation="56" />
            </feSpecularLighting>
            <feComposite in="s" in2="SourceAlpha" operator="in" result="sc" />
            <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="sc" /></feMerge>
          </filter>
        </defs>
        <path className="futty-metal-fade" d={F_METAL_PATH} fillRule="evenodd" fill={`url(#${metalId})`} filter={`url(#${biselId})`} stroke="#d9b45a" strokeWidth="0.8" />
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
