// Futty v2.0 — Onboarding product tour (3 passos com spotlight).
// Mede o elemento alvo com getBoundingClientRect e recorta um "buraco" no overlay.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const GOLD = '#d4a017';
const PASSOS = [
  { sel: '[data-tour="player-card"]', texto: 'Este é o teu card. É como apareces para todos no teu time.' },
  { sel: '[data-tour="jogos-section"]', texto: 'Aqui vês os teus jogos e confirmas presença. Nunca percas um jogo!' },
  { sel: '[data-tour="bottom-nav"]', texto: 'Explora o ranking, a resenha e a tua figurinha.' },
];
const BW = 300; // largura do balão

export default function ProductTour({ onDone }) {
  const navigate = useNavigate();
  const [passo, setPasso] = useState(0);
  const [rect, setRect] = useState(null);

  // Mede o alvo do passo atual (async via rAF/listeners → evita set-state-in-effect).
  useEffect(() => {
    const medir = () => {
      const el = document.querySelector(PASSOS[passo].sel);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height, vw, vh });
      } else {
        setRect({ top: 0, left: 0, width: 0, height: 0, vw, vh, ausente: true });
      }
    };
    const raf = requestAnimationFrame(medir);
    window.addEventListener('resize', medir);
    window.addEventListener('scroll', medir, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', medir);
      window.removeEventListener('scroll', medir, true);
    };
  }, [passo]);

  function terminar() {
    onDone?.();
  }
  function irPara(destino) {
    onDone?.();
    navigate(destino);
  }

  const ultimo = passo === PASSOS.length - 1;
  if (!rect) return null;

  // Spotlight (buraco) — só se o alvo existir.
  const spot = !rect.ausente && rect.width > 0;
  const padL = 6;
  const holeTop = rect.top - padL;
  const holeLeft = rect.left - padL;
  const holeW = rect.width + padL * 2;
  const holeH = rect.height + padL * 2;

  // Posição do balão: abaixo se houver espaço, senão acima; centrado e clamped.
  const abaixo = spot ? rect.top + rect.height + 200 < rect.vh : true;
  const balloonLeft = spot
    ? Math.min(Math.max(rect.left + rect.width / 2 - BW / 2, 12), rect.vw - BW - 12)
    : Math.max(12, rect.vw / 2 - BW / 2);
  const balloonTop = spot
    ? abaixo
      ? holeTop + holeH + 14
      : null
    : rect.vh / 2 - 80;
  const balloonBottom = spot && !abaixo ? rect.vh - holeTop + 14 : null;
  // Seta apontando para o alvo.
  const arrowLeft = spot ? Math.min(Math.max(rect.left + rect.width / 2 - balloonLeft, 20), BW - 20) : BW / 2;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000 }}>
      {/* Overlay + spotlight */}
      {spot ? (
        <div
          style={{
            position: 'absolute',
            top: holeTop,
            left: holeLeft,
            width: holeW,
            height: holeH,
            borderRadius: 12,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.82)',
            pointerEvents: 'none',
            transition: 'all 0.2s ease',
          }}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.82)', pointerEvents: 'none' }} />
      )}

      {/* Saltar */}
      <button
        type="button"
        onClick={terminar}
        style={{ position: 'absolute', top: 16, right: 16, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
      >
        Saltar
      </button>

      {/* Balão */}
      <div
        style={{
          position: 'absolute',
          left: balloonLeft,
          ...(balloonTop != null ? { top: balloonTop } : {}),
          ...(balloonBottom != null ? { bottom: balloonBottom } : {}),
          width: BW,
          boxSizing: 'border-box',
          background: '#0d0d0d',
          border: `1px solid ${GOLD}`,
          borderRadius: 12,
          padding: '16px 20px',
          color: '#fff',
        }}
      >
        {/* Seta */}
        {spot ? (
          <span
            style={{
              position: 'absolute',
              left: arrowLeft - 8,
              ...(abaixo ? { top: -8 } : { bottom: -8 }),
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              ...(abaixo ? { borderBottom: `8px solid ${GOLD}` } : { borderTop: `8px solid ${GOLD}` }),
            }}
          />
        ) : null}

        <p style={{ fontSize: 14, lineHeight: 1.4, margin: 0 }}>{PASSOS[passo].texto}</p>

        {!ultimo ? (
          <button
            type="button"
            onClick={() => setPasso((p) => p + 1)}
            className="btn btn--primary btn--sm"
            style={{ width: '100%', marginTop: 14 }}
          >
            Próximo
          </button>
        ) : (
          <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
            <button type="button" onClick={terminar} className="btn btn--primary btn--sm" style={{ width: '100%' }}>
              Começar!
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => irPara('/criar-equipa')} className="btn btn--ghost btn--sm" style={{ flex: 1 }}>
                ➕ Criar time
              </button>
              <button type="button" onClick={() => irPara('/explorar')} className="btn btn--ghost btn--sm" style={{ flex: 1 }}>
                🔍 Explorar
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
          {passo + 1} / {PASSOS.length}
        </div>
      </div>
    </div>
  );
}
