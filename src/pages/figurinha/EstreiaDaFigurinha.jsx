// Futty v2.0 — Figurinha: a tela da estreia (1ª visita sem foto): adicionar a foto, a geração e o cromo pronto para compartilhar.
import { Share2 } from 'lucide-react';
import Topbar from '../../components/Topbar';
import BotaoLoja from '../../components/BotaoLoja';
import FuttyLoader from '../../components/FuttyLoader';
import { EstrelaIA, RECADO_FOTO_RECUSADA } from './constantes';

export default function EstreiaDaFigurinha({ avisoErro, concluirEstreia, escolherOutraFoto, estreiaFase, fileRef, fotoRecusada, limiteIA, onPickFile, overlayGerando, partilharCromo, pintura, previewUrl }) {
  return (
      <div className="app-shell">
        <Topbar hud="FIGURINHA" direita={<BotaoLoja />} />
        <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
          {/* Card */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
            <div className="fig-card-enter" style={{ position: 'relative', width: 'min(74vw, 300px)', aspectRatio: '2 / 3' }}>
              {previewUrl
                ? <img
                    src={previewUrl}
                    alt="figurinha"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                : /* O F a carregar, não o PlayerCard (geração anterior do cromo): seria um salto, não um carregamento. */
                  <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
                    <FuttyLoader size={96} label={null} />
                  </div>
              }
              {estreiaFase === 'gerando' ? overlayGerando : null}
            </div>
          </div>

          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />

          <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center', display: 'grid', gap: 12 }}>
            {estreiaFase === 'foto' ? (
              <>
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 22, color: '#fff', margin: 0 }}>
                  {fotoRecusada ? RECADO_FOTO_RECUSADA.titulo : <>Seu card está quase pronto <EstrelaIA size={14} color="#fff" /></>}
                </h2>
                <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,0.8)', margin: fotoRecusada ? '0 auto' : 0, maxWidth: fotoRecusada ? '30ch' : 'none' }}>{fotoRecusada ? RECADO_FOTO_RECUSADA.corpo : 'Adicione uma foto para personalizar seu cartão de jogador'}</p>
                <button type="button" className="btn btn--purple" style={{ width: '100%', height: 48, fontSize: 15 }} onClick={escolherOutraFoto}>{fotoRecusada ? 'Escolher outra foto' : 'Adicionar foto'}</button>
                <button type="button" onClick={concluirEstreia} style={{ border: 'none', background: 'transparent', color: 'var(--label-color)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Pular por agora →</button>
              </>
            ) : estreiaFase === 'gerando' ? (
              <>
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 20, color: '#fff', margin: 0 }}>Gerando sua figurinha… <EstrelaIA size={14} color="#fff" /></h2>
                <p className="texto-apoio texto-apoio--centro" style={{ marginTop: 0 }}>Leva uns {pintura?.estimativaSegundos || 45} segundos · pode sair da tela, a gente avisa</p>
              </>
            ) : (
              <>
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 24, color: '#fff', margin: 0 }}>Seu card está pronto!</h2>
                {limiteIA ? (
                  <p style={{ fontSize: 12, color: 'var(--label-color)', margin: 0 }}>Não deu para gerar agora: mostramos o card com sua foto.</p>
                ) : null}
                <button type="button" className="btn btn--purple" style={{ width: '100%', height: 48, fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={partilharCromo}>
                  <Share2 size={18} /> Compartilhar agora
                </button>
                <button type="button" className="btn btn--purple-outline" style={{ width: '100%', height: 44 }} onClick={concluirEstreia}>Personalizar</button>
                <button type="button" onClick={concluirEstreia} style={{ border: 'none', background: 'transparent', color: 'var(--label-color)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Pular →</button>
              </>
            )}
            {avisoErro}
          </div>
        </main>
      </div>
  );
}
