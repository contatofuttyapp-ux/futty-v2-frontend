// Futty v2.0 — Ecrã de carregamento inicial (logo + barra dourada).
import { useEffect, useState } from 'react';
import FuttyLogo from './FuttyLogo';

const CSS = `@keyframes loadBar { from { width: 20%; opacity: 0.5; } to { width: 80%; opacity: 1; } }`;

export default function LoadingScreen({ onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      onTransitionEnd={() => {
        if (!visible) onDone?.();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#050810',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 22,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <style>{CSS}</style>
      <FuttyLogo size="lg" showIcon={false} />
      <div style={{ width: 180, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#d4a017', borderRadius: 2, animation: 'loadBar 1.5s ease-in-out infinite alternate' }} />
      </div>
    </div>
  );
}
