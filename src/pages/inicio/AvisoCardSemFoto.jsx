// Futty v2.0 — Início: o aviso de quem ainda não pôs foto no card.
import { Link } from 'react-router-dom';
import { AgoraNao } from './AgoraNao';
import { fraseDoAviso, subDoAviso, textoDoAviso } from './estilos';

export default function AvisoCardSemFoto({ agoraNao, aviso, dispensarCtaFigurinha }) {
  return (
    <>
        {aviso?.tipo === 'card' && aviso.item.variante === 'sem-foto' ? (
          <div data-aviso="card" className="hud-corners" style={{ marginBottom: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,160,23,0.4)' }}>
            <Link to="/figurinha" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px 4px', textDecoration: 'none', color: 'inherit' }}>
              <span style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
                <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#101012', border: '1.5px solid rgba(212,160,23,0.5)', clipPath: 'polygon(16% 0, 84% 0, 100% 16%, 100% 84%, 84% 100%, 16% 100%, 0 84%, 0 16%)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(212,160,23,0.65)" strokeWidth="1.6"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
                </span>
              </span>
              <span style={textoDoAviso}>
                <span style={{ display: 'block', fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 15 }}>Complete seu card</span>
                <span style={subDoAviso}>Seu card com a foto fica pronto na hora.</span>
              </span>
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 11, color: '#f0c94a', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>Adicionar →</span>
            </Link>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 14px 6px' }}>
              <AgoraNao onClick={() => agoraNao('card')} />
            </div>
          </div>
        ) : aviso?.tipo === 'card' ? (
          <div data-aviso="card" className="hud-corners" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginBottom: 12, background: 'rgba(139,92,246,0.12)', border: '1px solid var(--purple)' }}>
            <span style={fraseDoAviso}>Complete seu card</span>
            <Link to="/figurinha" className="btn btn--purple btn--sm hud-corners-s" onClick={dispensarCtaFigurinha}>Ir para Figurinha</Link>
            <AgoraNao onClick={() => agoraNao('card')} />
          </div>
        ) : null}
    </>
  );
}
