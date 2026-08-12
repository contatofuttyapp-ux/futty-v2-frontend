// Futty v2.0 — Seletor do avatar genérico (31-jul, ordem do dono). Bottom sheet
// com os 6 thumbnails (masc m1-m3, fem f1-f3); toque escolhe e fecha. Mesmo padrão
// do sheet de idioma em MeuPerfil.jsx: .modal-overlay + .hud-corners-topo, PORTAL
// para o <body> (o sheet nasce dentro de PageTransition, que cria um contexto de
// empilhamento próprio — sem o portal a bottom nav pintava por cima).
import { createPortal } from 'react-dom';
import { AVATARES_GENERICOS_TODOS } from '../utils/avatarGenerico';

export default function AvatarGenericoSheet({ aberto, onClose, escolhaActual, onEscolher }) {
  if (!aberto) return null;
  return createPortal(
    <div
      className="modal-overlay"
      role="presentation"
      onClick={onClose}
      style={{ alignItems: 'flex-end', padding: 0 }}
    >
      <div
        className="hud-corners-topo"
        role="dialog"
        aria-modal="true"
        aria-label="Escolher visual do card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', background: '#16161c', borderTop: '1px solid rgba(255,255,255,0.06)', paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
      >
        <div aria-hidden="true" style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)', margin: '10px auto 6px' }} />
        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', padding: '4px 16px 10px' }}>
          Visual do card
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '0 16px 16px' }}>
          {AVATARES_GENERICOS_TODOS.map((a) => {
            const ativo = escolhaActual === a.key;
            return (
              <button
                key={a.key}
                type="button"
                aria-pressed={ativo}
                aria-label={`Escolher visual ${a.key}`}
                onClick={() => { onEscolher(a.key); onClose(); }}
                style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <div
                  className="hud-corners-s"
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1 / 1',
                    backgroundImage: `url(${a.url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'top center',
                    border: ativo ? '2px solid #d4a017' : '1px solid var(--border-subtle)',
                    filter: ativo ? 'none' : 'saturate(0.8) brightness(0.88)',
                  }}
                >
                  {ativo ? (
                    <span
                      aria-hidden="true"
                      style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%', background: '#d4a017', color: '#0d0d12', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800 }}
                    >
                      ✓
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
