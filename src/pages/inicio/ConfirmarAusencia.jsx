// Futty v2.0 — Início: a confirmação de ausência no próximo jogo, num portal.
import { createPortal } from 'react-dom';
import { diaDoJogo } from './diaDoJogo';

export default function ConfirmarAusencia({ confirmarAusencia, definirAusencia, proximoJogo, rsvpAbertoNoProximo, setConfirmarAusencia }) {
  return (
    <>
      {confirmarAusencia && proximoJogo && !rsvpAbertoNoProximo
        ? createPortal(
            <div className="modal-overlay" role="presentation" onClick={() => setConfirmarAusencia(false)}>
              <div className="modal-card modal-card--hud" role="dialog" aria-modal="true" aria-labelledby="aviso-ausencia-pergunta" onClick={(e) => e.stopPropagation()}>
                <div className="modal-card__inner">
                  <p id="aviso-ausencia-pergunta" style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 16 }}>
                    {diaDoJogo(proximoJogo.date, proximoJogo.fuso)
                      ? `Avisar o time que você não vai ao jogo de ${diaDoJogo(proximoJogo.date, proximoJogo.fuso)}?`
                      : 'Avisar o time que você não vai ao próximo jogo?'}
                  </p>
                  <button type="button" className="btn hud-corners-s cta-gold" style={{ width: '100%' }} onClick={() => definirAusencia(true)}>
                    Avisar
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm btn--hud hud-corners-s" style={{ width: '100%', marginTop: 10 }} onClick={() => setConfirmarAusencia(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
