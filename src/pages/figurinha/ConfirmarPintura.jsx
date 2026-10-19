// Futty v2.0 — Figurinha: a confirmação "Gerar figurinha com este uniforme?" (gasta 1 geração), num portal no body.
import { createPortal } from 'react-dom';
import { geracoesPorExtenso } from '../../utils/totalDeGeracoes';

export default function ConfirmarPintura({ confirmarPintura, gerandoIA, kitParaPintar, setKitParaPintar, totalGeracoes }) {
  return (
    <>
      {kitParaPintar
        ? createPortal(
            <div className="modal-overlay" role="presentation" onClick={() => !gerandoIA && setKitParaPintar(null)}>
              <div className="modal-card" role="dialog" aria-modal="true" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-card__inner" style={{ textAlign: 'center', display: 'grid', gap: 12, padding: '18px 16px 16px' }}>
                  <h2 data-confirmar-geracao style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 18, margin: 0 }}>
                    Gerar figurinha com este uniforme?
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                    {/* O mesmo número do contador: tudo o que a pessoa tem. De onde sai a geração (pacote ou crédito) o motor decide. */}
                    <span data-confirmar-total={totalGeracoes}>{`Isso usa 1 geração. Você tem ${geracoesPorExtenso(totalGeracoes)}.`}</span>
                  </p>
                  <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                    <span className="cta-gold-glow" style={{ display: 'flex' }}>
                      <button type="button" className="btn hud-corners cta-gold" style={{ flex: 1 }} onClick={confirmarPintura}>
                        Gerar
                      </button>
                    </span>
                    <button type="button" className="btn btn--ghost btn--sm" style={{ width: '100%' }} onClick={() => setKitParaPintar(null)}>
                      Agora não
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
