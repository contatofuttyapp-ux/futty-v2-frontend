// Futty v2.0 — Logo da marca.
// variant: 'flat'/'metallic' (F de sempre — F_CONTORNO, viewBox 1080 — com a PELE
// METÁLICA v4: SVG inline, casa com o loader) | 'wordmark' (lettering "FUTTY").
import { useId } from 'react';
import { F_CONTORNO } from '../utils/futtyMonograma';

export default function FuttyLogo({ size = 32, variant = 'flat', color = '#d4a017' }) {
  const uid = useId().replace(/:/g, '');
  const metalId = `futty-logo-metal-${uid}`;
  const biselId = `futty-logo-bisel-${uid}`;
  const glowId = `futty-logo-glow-${uid}`;
  if (variant === 'flat' || variant === 'metallic') {
    // A FORMA é a de sempre (F_CONTORNO); só a pele mudou: gradiente ouro escuro→claro
    // + bisel specular + glow = cópia metálica desfocada — a mesma receita do FuttyLoader.
    return (
      <svg width={size} height={size} viewBox="0 0 1080 1080" aria-label="Futty" role="img" style={{ display: 'block' }}>
        <defs>
          {/* Hexes REAIS do PNG de referência (ouro saturado e profundo). */}
          <linearGradient id={metalId} gradientUnits="objectBoundingBox" x1="0.28" y1="0" x2="0.56" y2="1">
            <stop offset="0" stopColor="#d69512" />
            <stop offset="0.35" stopColor="#a86808" />
            <stop offset="0.62" stopColor="#8a5304" />
            <stop offset="0.82" stopColor="#5a3703" />
            <stop offset="1" stopColor="#341a02" />
          </linearGradient>
          {/* Bisel de alto contraste (specular branco puro). */}
          <filter id={biselId} x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="b" />
            <feSpecularLighting in="b" surfaceScale="6" specularConstant="1.1" specularExponent="20" lightingColor="#e8b83a" result="s">
              <feDistantLight azimuth="228" elevation="55" />
            </feSpecularLighting>
            <feComposite in="s" in2="SourceAlpha" operator="in" result="sc" />
            <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="sc" /></feMerge>
          </filter>
          {/* Glow = cópia do próprio F desfocada (herda o metal). */}
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="26" />
          </filter>
        </defs>
        <path d={F_CONTORNO} fill={`url(#${metalId})`} filter={`url(#${glowId})`} opacity="0.5" />
        <path d={F_CONTORNO} fill={`url(#${metalId})`} filter={`url(#${biselId})`} stroke="#d69512" strokeWidth="1" />
      </svg>
    );
  }
  if (variant === 'wordmark') {
    // O SVG tem os paths a preto por defeito; o filtro CSS recolore conforme `color`.
    const isWhite = color === '#ffffff' || color === 'white';
    const isPurple = color === '#8b5cf6' || color === 'purple';
    const filter = isWhite
      ? 'invert(1)' // preto → branco
      : isPurple
        ? 'invert(51%) sepia(96%) saturate(2344%) hue-rotate(234deg) brightness(103%) contrast(94%)' // preto → #8b5cf6
        : color === '#d4a017'
          ? 'invert(67%) sepia(55%) saturate(700%) hue-rotate(5deg) brightness(95%) contrast(95%)' // preto → dourado
          : 'none';
    return (
      <img
        src="/futty-wordmark.svg"
        alt="Futty"
        style={{ height: size, width: 'auto', display: 'block', filter }}
      />
    );
  }
  return null;
}
