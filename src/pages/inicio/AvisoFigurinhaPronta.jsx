// Futty v2.0 — Início: o aviso de figurinha pronta.
import { Link } from 'react-router-dom';
import { urlAsset, urlImagem } from '../../utils/avatar';
import { AgoraNao } from './AgoraNao';

export default function AvisoFigurinhaPronta({ agoraNao, aviso, brilhanteDireito, user }) {
  return (
    <>
        {aviso?.tipo === 'figurinha-pronta' ? (
          <div data-aviso="figurinha-pronta" className="hud-corners cta-gold-glow" style={{ marginBottom: 12, background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.55)' }}>
            <Link to="/figurinha" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px 4px', textDecoration: 'none', color: 'inherit' }}>
              <span style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, clipPath: 'polygon(16% 0, 84% 0, 100% 16%, 100% 84%, 84% 100%, 16% 100%, 0 84%, 0 16%)', border: '1.5px solid rgba(212,160,23,0.6)', background: '#101012' }}>
                {user?.foto_url ? (
                  <img src={urlImagem(urlAsset(user.foto_url), 128, { quadrado: true })} alt="" width={52} height={52} decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : null}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 15, color: '#f0c94a' }}>Você tem uma figurinha para gerar ✨</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                  {brilhanteDireito?.fonte === 'time' ? 'Cortesia do pacote do seu time' : 'Leva uns 45 segundos'}
                </span>
              </span>
              <span className="btn btn--sm hud-corners-s cta-gold" style={{ flexShrink: 0, fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em' }}>Gerar</span>
            </Link>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 14px 6px' }}>
              <AgoraNao onClick={() => agoraNao('figurinha-pronta')} />
            </div>
          </div>
        ) : null}
    </>
  );
}
