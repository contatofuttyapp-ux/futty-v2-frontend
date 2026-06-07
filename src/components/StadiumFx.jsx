// Futty v2.0 — Fundo de estádio à noite: feixes de luz volumétricos + fumaça.
// CSS puro (ver index.css): anima só transform/opacity, fica atrás de todo o
// conteúdo (z-index negativo, pointer-events:none). Afina-se a intensidade em
// --beam-intensity / --smoke-intensity (index.css), num único sítio.

// Cones a partir dos pontos de luz (centro/lados); delays negativos = já
// dessincronizados ao montar.
const BEAMS = [
  { left: '6%', width: 190, delay: '0s', duration: '15s' },
  { left: '30%', width: 240, delay: '-4s', duration: '16s' },
  { left: '60%', width: 240, delay: '-8s', duration: '14s' },
  { left: '86%', width: 190, delay: '-11.5s', duration: '15.5s' },
];

const SMOKE = [
  { top: '28%', left: '8%', size: '60vw', delay: '0s', duration: '26s' },
  { top: '52%', left: '54%', size: '72vw', delay: '-10s', duration: '30s' },
  { top: '6%', left: '38%', size: '50vw', delay: '-18s', duration: '24s' },
];

export default function StadiumFx() {
  return (
    <div className="stadium-fx" aria-hidden="true">
      {BEAMS.map((b, i) => (
        <div
          key={`beam-${i}`}
          className="fx-beam"
          style={{ left: b.left, width: b.width, animationDelay: b.delay, animationDuration: b.duration }}
        />
      ))}
      {SMOKE.map((s, i) => (
        <div
          key={`smoke-${i}`}
          className="fx-smoke"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay, animationDuration: s.duration }}
        />
      ))}
    </div>
  );
}
