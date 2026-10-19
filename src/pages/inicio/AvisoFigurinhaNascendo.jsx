// Futty v2.0 — Início: o aviso de figurinha sendo pintada.
import { Link } from 'react-router-dom';
import { urlAsset, urlImagem } from '../../utils/avatar';
import { AgoraNao } from './AgoraNao';
import { fotoQueCobre, subDoAviso, textoDoAviso } from './estilos';

export default function AvisoFigurinhaNascendo({ agoraNao, aviso, user }) {
  return (
    <>
        {aviso?.tipo === 'figurinha-nascendo' && aviso.item.estado === 'gerando' ? (
          <div data-aviso="figurinha-nascendo" className="hud-corners" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 12, background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.4)' }}>
            <span className="figurinha-gerando-moldura" style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, clipPath: 'polygon(16% 0, 84% 0, 100% 16%, 100% 84%, 84% 100%, 16% 100%, 0 84%, 0 16%)', border: '1.5px solid rgba(212,160,23,0.5)', background: '#101012' }}>
              {user?.foto_url ? (
                <img src={urlImagem(urlAsset(user.foto_url), 128, { quadrado: true })} alt="" width={52} height={52} decoding="async" style={fotoQueCobre} />
              ) : null}
            </span>
            <span style={textoDoAviso}>
              <span style={{ display: 'block', fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 15 }}>Sua figurinha está sendo criada…</span>
              <span style={subDoAviso}>leva uns 45 segundos</span>
            </span>
          </div>
        ) : aviso?.tipo === 'figurinha-nascendo' ? (
          <div data-aviso="figurinha-nascendo" className="hud-corners" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 12, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.45)' }}>
            <span style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, clipPath: 'polygon(16% 0, 84% 0, 100% 16%, 100% 84%, 84% 100%, 16% 100%, 0 84%, 0 16%)', border: '1.5px solid rgba(248,113,113,0.5)', background: '#101012', overflow: 'hidden' }}>
              {user?.foto_url ? (
                <img src={urlImagem(urlAsset(user.foto_url), 128, { quadrado: true })} alt="" width={52} height={52} decoding="async" style={fotoQueCobre} />
              ) : null}
            </span>
            {/* Texto neutro: 'falhou' também cobre IA_INDISPONIVEL (motor recusado pela fal, nada a ver com a
                foto) — "tente outra foto" seria enganoso nesse caso. */}
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#f8b4b4', lineHeight: 1.4 }}>Não deu para gerar sua figurinha agora. Tente de novo na aba Figurinha.</span>
            <span style={{ flexShrink: 0, display: 'grid', justifyItems: 'center', gap: 2 }}>
              <Link to="/figurinha" className="btn btn--sm hud-corners-s cta-gold" style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em', textDecoration: 'none' }}>
                Ir para Figurinha
              </Link>
              <AgoraNao onClick={() => agoraNao('figurinha-falhou')} />
            </span>
          </div>
        ) : null}
    </>
  );
}
