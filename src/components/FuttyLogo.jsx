// Futty v2.0 — Logo da marca.
// variant: 'flat'/'metallic' (F metálico do decalque, SVG inline — casa com o loader) |
// 'wordmark' (lettering "FUTTY" vetorizado, ainda imagem).
import { useId } from 'react';
import { F_METAL_PATH } from '../utils/futtyMonograma';

export default function FuttyLogo({ size = 32, variant = 'flat', color = '#d4a017' }) {
  const uid = useId().replace(/:/g, '');
  const metalId = `futty-logo-metal-${uid}`;
  const biselId = `futty-logo-bisel-${uid}`;
  if (variant === 'flat' || variant === 'metallic') {
    // Transplante EXACTO do harness v4 (igual ao FuttyLoader): viewBox 1024, F_METAL_PATH,
    // mesmo gradiente + filtro-bisel, stroke #d9b45a 0.8, glow igual. Casa com o loader.
    return (
      <svg width={size} height={size} viewBox="0 0 1024 1024" aria-label="Futty" role="img" style={{ display: 'block', filter: 'drop-shadow(0 0 8px rgba(212,160,23,0.38))' }}>
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
        <path d={F_METAL_PATH} fillRule="evenodd" fill={`url(#${metalId})`} filter={`url(#${biselId})`} stroke="#d9b45a" strokeWidth="0.8" />
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
