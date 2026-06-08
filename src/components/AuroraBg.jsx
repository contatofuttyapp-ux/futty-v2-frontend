// Futty v2.0 — Fundo aurora (dourado + roxo): 4 blobs orgânicos a derivar e
// rodar lentamente + uma camada de partículas a flutuar. CSS puro (ver
// index.css), GPU; atrás de todo o conteúdo. Afinável em --aurora-opacity e
// --aurora-po (:root).
import { useState } from 'react';

const N_PARTICULAS = 22;

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

// ~50% branco, ~30% dourado, ~20% roxo.
function corParticula(r) {
  if (r < 0.5) return '#ffffff';
  if (r < 0.8) return 'rgba(212,160,23,1)';
  return 'rgba(139,92,246,1)';
}

// Gerado a nível de módulo (não no render) → Math.random fora do componente.
function gerarParticulas() {
  return Array.from({ length: N_PARTICULAS }, (_, i) => ({
    id: i,
    left: `${rand(0, 100).toFixed(2)}%`,
    top: `${rand(0, 100).toFixed(2)}%`,
    size: Number(rand(1.5, 4).toFixed(2)),
    cor: corParticula(Math.random()),
    dx: `${rand(-28, 28).toFixed(1)}px`,
    dur: `${rand(9, 16).toFixed(1)}s`,
    delay: `${(-rand(0, 16)).toFixed(1)}s`, // negativo → não começam todas juntas
  }));
}

function Particulas() {
  // Lazy useState: corre uma única vez ao montar.
  const [particulas] = useState(gerarParticulas);
  return (
    <div className="aurora-particles" aria-hidden="true">
      {particulas.map((p) => (
        <span
          key={p.id}
          className="aurora-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: p.cor,
            '--dx': p.dx,
            animationDuration: p.dur,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

export default function AuroraBg() {
  return (
    <div className="aurora-wrapper" aria-hidden="true">
      <div className="aurora-blob" />
      <div className="aurora-blob" />
      <div className="aurora-blob" />
      <div className="aurora-blob" />
      <Particulas />
    </div>
  );
}
