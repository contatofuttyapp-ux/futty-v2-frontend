// Futty v2.0 — Mapa de performance (radar SVG puro, 5 eixos)
// valores: { presenca, gols, artilharia, vitorias, notas } em 0-100
const EIXOS = [
  { key: 'presenca', label: 'Presença' },
  { key: 'gols', label: 'Gols' },
  { key: 'artilharia', label: 'Artilharia' },
  { key: 'vitorias', label: 'Vitórias' },
  { key: 'notas', label: 'Notas' },
];

export default function RadarChart({ valores }) {
  const pad = 64;
  const innerW = 280;
  const innerH = 290;
  const cx = innerW / 2;
  const cy = innerH / 2;
  const R = 72;
  const N = EIXOS.length;

  const ang = (i) => (-90 + (i * 360) / N) * (Math.PI / 180);
  const vals = EIXOS.map((e) => Math.max(5, Math.min(100, Number(valores?.[e.key]) || 0)));

  const pts = vals
    .map((v, i) => {
      const t = v / 100;
      return `${cx + R * t * Math.cos(ang(i))},${cy + R * t * Math.sin(ang(i))}`;
    })
    .join(' ');

  const grid = [0.25, 0.5, 0.75, 1].map((f) =>
    EIXOS.map((_, i) => `${cx + R * f * Math.cos(ang(i))},${cy + R * f * Math.sin(ang(i))}`).join(' ')
  );

  const labelR = R + 52;
  const vbW = innerW + pad * 2;
  const vbH = innerH + pad * 2;

  return (
    <svg width="100%" viewBox={`0 0 ${vbW} ${vbH}`} style={{ maxWidth: 420, display: 'block', margin: '0 auto' }}>
      <g transform={`translate(${pad}, ${pad})`}>
        {grid.map((p, idx) => (
          <polygon key={idx} points={p} fill="none" stroke="rgba(124,58,237,0.3)" strokeWidth={1} />
        ))}
        {EIXOS.map((_, i) => (
          <line
            key={`axis-${i}`}
            x1={cx}
            y1={cy}
            x2={cx + R * Math.cos(ang(i))}
            y2={cy + R * Math.sin(ang(i))}
            stroke="rgba(124,58,237,0.2)"
            strokeWidth={1}
          />
        ))}
        <polygon points={pts} fill="rgba(0,229,160,0.2)" stroke="#00e5a0" strokeWidth={2} />
        {EIXOS.map((e, i) => {
          const lx = cx + labelR * Math.cos(ang(i));
          const ly = cy + labelR * Math.sin(ang(i));
          return (
            <text
              key={e.label}
              x={lx}
              y={ly}
              fill="#00e5a0"
              fontSize={12}
              fontWeight={800}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {e.label}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
