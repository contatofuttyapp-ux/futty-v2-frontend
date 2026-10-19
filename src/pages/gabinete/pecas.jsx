// Futty v2.0 — As peças que as abas do Gabinete dividem: o semáforo e o cartão de número.

import { CARD, CORES } from './estilos';

function Semaforo({ cor, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: CORES[cor] || CORES.cinza, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: '#ddd' }}>{children}</span>
    </span>
  );
}

function Card6({ n, legenda, sub }) {
  return (
    <div style={{ ...CARD, padding: 16 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', fontFamily: "'Rajdhani',sans-serif" }}>{n}</div>
      {sub ? <div style={{ fontSize: 12, color: '#f0c94a', marginTop: 2 }}>{sub}</div> : null}
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 6 }}>{legenda}</div>
    </div>
  );
}

export { Card6, Semaforo };
