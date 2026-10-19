// Futty v2.0 — Figurinha: o controle de tamanho (− / +) abaixo do card.
import { Plus, Minus } from 'lucide-react';

export default function ControleDeZoom({ avatarEhIA, fotoLocal, mudarZoom, temFoto, zoomDaFoto, zoomNoMaximo, zoomNoMinimo }) {
  return (
    <>
          {(avatarEhIA || temFoto) && !fotoLocal ? (
            // Os botões − e + precisam de 44 px (o mínimo para o dedo): a linha tem 44 de altura e as margens
            // negativas (−13 e −15) compensam, para a altura que ela ocupa na página ser 16 (44 − 13 − 15) — o
            // card e os botões de baixo não se mexem e a figurinha continua cabendo na primeira tela.
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0, height: 44, marginTop: -13, marginBottom: -15 }}>
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--label-color)', marginRight: 2 }}>{zoomDaFoto ? 'Zoom' : 'Tamanho'}</span>
              <button
                type="button"
                aria-label={zoomDaFoto ? 'Afastar a foto' : 'Reduzir tamanho do avatar'}
                className="fig-zoom-btn"
                onClick={() => mudarZoom(-1)}
                disabled={zoomNoMinimo}
              >
                <Minus size={14} />
              </button>
              <button
                type="button"
                aria-label={zoomDaFoto ? 'Aproximar a foto' : 'Aumentar tamanho do avatar'}
                className="fig-zoom-btn"
                onClick={() => mudarZoom(1)}
                disabled={zoomNoMaximo}
              >
                <Plus size={14} />
              </button>
            </div>
          ) : null}
    </>
  );
}
