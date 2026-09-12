// Futty v2.0 — Ecrã de carregamento inicial (fallback do Suspense em App.jsx).
// FASE 3.49 — era logo metálico + barra dourada de progresso; aparecia ANTES de
// qualquer FuttyLoader e lia-se como um segundo loading, de outra marca. Agora é o
// mesmo F que todo o resto do app usa: um só loading, do primeiro ms ao fim.
// O contrato mantém-se (onDone, fade de saída, zIndex) — o App.jsx não muda.
import { useCallback, useEffect, useRef, useState } from 'react';
import LoadingFutty from './LoadingFutty';

export default function LoadingScreen({ onDone }) {
  const [visible, setVisible] = useState(true);
  const chamadoRef = useRef(false);

  const chamarOnDone = useCallback(() => {
    if (chamadoRef.current) return;
    chamadoRef.current = true;
    onDone?.();
  }, [onDone]);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1200);
    return () => clearTimeout(t);
  }, []);

  // Fallback (13-set, "Velocidade 3"): numa aba em 2º plano o browser pode
  // suspender/atrasar transições CSS — o onTransitionEnd nunca dispara e o
  // overlay fica montado para sempre, tapando o app quando a aba volta ao
  // foco. Se não disparar em 2s depois de visible=false, chama onDone mesmo
  // assim (chamadoRef trava a dupla chamada se o transitionend disparar logo
  // a seguir).
  useEffect(() => {
    if (visible) return undefined;
    const t = setTimeout(chamarOnDone, 2000);
    return () => clearTimeout(t);
  }, [visible, chamarOnDone]);

  return (
    <div
      onTransitionEnd={() => {
        if (!visible) chamarOnDone();
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
