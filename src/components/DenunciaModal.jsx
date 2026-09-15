// Futty v2.0 — Modal de denúncia (Tijolo 3). 6 categorias, 1 toque, confirmação
// digna "recebido — vamos analisar" (nunca veredicto). POST /api/denuncias.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '../lib/api';

// As 6 categorias da SPEC-DENUNCIAS. "menor" com marca própria (regra dura).
const CATEGORIAS = [
  { v: 'nudez', l: 'Nudez / sexual' },
  { v: 'violencia', l: 'Violência / ódio' },
  { v: 'assedio', l: 'Assédio / bullying' },
  { v: 'spam', l: 'Spam / golpe' },
  { v: 'menor', l: 'Perigo a menor', menor: true },
  { v: 'outro', l: 'Outro' },
];

export default function DenunciaModal({ targetType, targetId, onClose, onResult }) {
  const [busy, setBusy] = useState(false);
  const [feito, setFeito] = useState(false);

  async function denunciar(categoria) {
    if (busy || feito) return;
    setBusy(true);
    try {
      await apiFetch('/api/denuncias', {
        method: 'POST',
        body: JSON.stringify({ target_type: targetType, target_id: targetId, categoria }),
      });
      setFeito(true); // confirmação digna, sem veredicto
    } catch (err) {
      const lim = /429|de hoje/i.test(err?.message || '');
      onResult?.({ tipo: lim ? 'info' : 'error', mensagem: lim ? 'Já recebemos as suas denúncias de hoje.' : err?.message || 'Erro ao denunciar.' });
      onClose?.();
    } finally {
      setBusy(false);
    }
  }

  // Portal para o body (Rodada 8A): abre de dentro de um post ou comentário, no
  // meio do [data-page] — fixed ali ancora na página, não na tela (LoadingFutty.jsx).
  return createPortal(
    <div className="modal-overlay" role="presentation" onClick={() => !busy && onClose?.()}>
      <div className="modal-card" role="dialog" aria-modal="true" style={{ maxWidth: 390 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__inner" style={{ textAlign: 'center' }}>
          {feito ? (
            <div style={{ padding: '18px 8px 6px' }}>
              <div style={{ width: 72, height: 72, margin: '0 auto 14px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'rgba(123,216,143,0.1)', border: '1.5px solid rgba(123,216,143,0.55)', color: '#7bd88f' }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </div>
              <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 22 }}>Recebido</h2>
              <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: '8px auto 16px', maxWidth: 280, lineHeight: 1.6 }}>
                Vamos analisar. Obrigado por cuidar da casa — a sua denúncia é anônima.
              </p>
              <button type="button" className="btn btn--sm cta-gold hud-corners-s" style={{ minWidth: 120 }} onClick={onClose}>Fechar</button>
            </div>
          ) : (
            <>
              <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 17, marginBottom: 3 }}>O que está acontecendo com este conteúdo?</h2>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>Escolha um — a análise é anônima.</p>
              <div style={{ display: 'grid', gap: 8 }}>
                {CATEGORIAS.map((c) => (
                  <button
                    key={c.v}
                    type="button"
                    disabled={busy}
                    onClick={() => denunciar(c.v)}
                    className="hud-corners-s"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 11, padding: '12px 13px', textAlign: 'left', cursor: busy ? 'default' : 'pointer',
                      fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 14,
                      background: c.menor ? 'rgba(253,164,175,0.06)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${c.menor ? 'rgba(253,164,175,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      color: c.menor ? '#fecdd3' : '#e6e6ee', opacity: busy ? 0.6 : 1,
                    }}
                  >
                    <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: c.menor ? '#fda4af' : '#8b5cf6' }} />
                    {c.l}
                  </button>
                ))}
              </div>
              <button type="button" className="btn btn--ghost btn--sm" style={{ marginTop: 12, width: '100%' }} disabled={busy} onClick={onClose}>
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
