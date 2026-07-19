// Futty v2.0 — Silhueta-jogador v4 (aprovada): o fallback de PESSOAS sem foto.
// Substitui as iniciais de jogador em todo o app (EscudoEquipa de EQUIPAS mantém
// iniciais). Geometria da casa: cabeça octógono 45° + ombros em rectas com cortes
// 45° (parente dos frames V1). Vida = RESPIRAÇÃO do traço (~5.5s, como o radar da
// vitrine): stroke-opacity sobe/desce, fill acompanha, halo do traço acende.
// currentColor puro — veste a cor do contexto (kit do sorteio incluído).
// reduced-motion: estático. "?" subtil vende o "revela o teu cromo".
import '../styles/app.css';

export default function SilhuetaJogador({ size = '72%', color, interrogacao = true, style }) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
      style={{ width: size, height: size, color: color || 'rgba(255,255,255,0.5)', display: 'block', ...style }}
    >
      <g className="sil-halo" stroke="currentColor" strokeWidth="6" strokeLinejoin="miter" fill="none">
        <polygon points="40,12 56,12 64,20 64,36 56,44 40,44 32,36 32,20" />
        <path d="M14 88 L14 70 L24 58 L40 52 L56 52 L72 58 L82 70 L82 88 Z" />
      </g>
      <g className="sil-corpo" stroke="currentColor" strokeWidth="3" strokeLinejoin="miter" fill="currentColor">
        <polygon points="40,12 56,12 64,20 64,36 56,44 40,44 32,36 32,20" />
        <path d="M14 88 L14 70 L24 58 L40 52 L56 52 L72 58 L82 70 L82 88 Z" />
      </g>
      {interrogacao ? (
        <text x="48" y="34" textAnchor="middle" fontFamily="'Rajdhani', sans-serif" fontSize="16" fontWeight="700" fill="currentColor" opacity="0.28">?</text>
      ) : null}
    </svg>
  );
}
