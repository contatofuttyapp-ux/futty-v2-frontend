// Futty v2.0 — Figurinha: o overlay sobre o card enquanto a figurinha pinta — e os desfechos (sem gerações, foto recusada, erro).
import BarraPintura from '../../components/BarraPintura';
import FuttyLoader from '../../components/FuttyLoader';
import FuttyLogo from '../../components/FuttyLogo';
import { CLIP_OCTOGONO, RECADO_FOTO_RECUSADA } from './constantes';

export default function OverlayGerando({ erroIA, erroIAmsg, escolherOutraFoto, fotoRecusada, gerarAvatarIA, lojaLigada, navigate, pintura, semGeracoes, setErroIA, setSemGeracoes, situacaoPintura }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 8, clipPath: CLIP_OCTOGONO, background: 'rgba(5,8,16,0.92)', display: 'grid', placeItems: 'center' }}>
      {erroIA && semGeracoes && lojaLigada ? (
        // P2 — as gerações acabaram e a loja está ligada: tentar de novo daria o mesmo 403, então o
        // caminho é comprar mais (Planos, Minha Figurinha em destaque). "Agora não" só fecha.
        <div style={{ display: 'grid', justifyItems: 'center', gap: 12, padding: 16, textAlign: 'center' }}>
          <span style={{ opacity: 0.55, lineHeight: 0 }}><FuttyLogo variant="metallic" size={64} /></span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Suas gerações acabaram. Comprar mais?</span>
          <span className="cta-gold-glow" style={{ display: 'flex' }}>
            <button type="button" className="btn hud-corners cta-gold" style={{ height: 38, paddingLeft: 16, paddingRight: 16, fontSize: 13 }} onClick={() => navigate('/planos?destaque=minha')}>
              Comprar mais
            </button>
          </span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setErroIA(false); setSemGeracoes(false); }}>
            Agora não
          </button>
        </div>
      ) : erroIA && fotoRecusada ? (
        // A cabeça cortou nas duas tentativas com ESTA foto. Tentar de novo daria o mesmo: o recado leva a
        // outra foto.
        <div style={{ display: 'grid', justifyItems: 'center', gap: 12, padding: 16, textAlign: 'center' }}>
          <span style={{ opacity: 0.55, lineHeight: 0 }}><FuttyLogo variant="metallic" size={64} /></span>
          <div style={{ display: 'grid', gap: 10, maxWidth: '30ch' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{RECADO_FOTO_RECUSADA.titulo}</span>
            <span style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.8)' }}>{RECADO_FOTO_RECUSADA.corpo}</span>
          </div>
          <button type="button" className="btn btn--purple hud-corners" style={{ height: 38, paddingLeft: 16, paddingRight: 16, fontSize: 13 }} onClick={escolherOutraFoto}>
            Escolher outra foto
          </button>
        </div>
      ) : erroIA ? (
        <div style={{ display: 'grid', justifyItems: 'center', gap: 12, padding: 16, textAlign: 'center' }}>
          {/* LEI DO F: logo oficial transparente (FuttyLogo SVG), estático no erro.
              O antigo /futty-logo-metallic.png (fundo preto sólido) está BANIDO. */}
          <span style={{ opacity: 0.55, lineHeight: 0 }}><FuttyLogo variant="metallic" size={64} /></span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{erroIAmsg || 'Não deu desta vez. Tente de novo.'}</span>
          <button type="button" className="btn btn--purple hud-corners" style={{ height: 38, paddingLeft: 16, paddingRight: 16, fontSize: 13 }} onClick={gerarAvatarIA}>
            Tentar novamente
          </button>
        </div>
      ) : situacaoPintura ? (
        // A barra HONESTA: avança pelo tempo típico até 90%, segura em "finalizando…" e nunca marca 100% antes
        // de a imagem existir. O F continua pintando em cima.
        <div style={{ display: 'grid', justifyItems: 'center', gap: 14, padding: 12 }}>
          <FuttyLoader size={96} label={null} />
          <BarraPintura situacao={situacaoPintura} estimativaSegundos={pintura.estimativaSegundos} />
        </div>
      ) : (
        <FuttyLoader size={129} label={null} />
      )}
    </div>
  );
}
