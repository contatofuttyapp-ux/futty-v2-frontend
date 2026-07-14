// Futty v2.0 — Ecrã de carregamento inicial (fallback do Suspense em App.jsx).
// FASE 3.49 — era logo metálico + barra dourada de progresso; aparecia ANTES de
// qualquer FuttyLoader e lia-se como um segundo loading, de outra marca. Agora é o
// mesmo F que todo o resto do app usa: um só loading, do primeiro ms ao fim.
// O contrato mantém-se (onDone, fade de saída, zIndex) — o App.jsx não muda.
import { useEffect, useState } from 'react';
import LoadingFutty from './LoadingFutty';

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
        display: 'grid',
        placeItems: 'center',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <LoadingFutty />
    </div>
  );
}
