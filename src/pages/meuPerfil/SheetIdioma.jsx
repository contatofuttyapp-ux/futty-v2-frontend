// Futty v2.0 — Perfil: a folha de escolher o idioma, num portal.
import { createPortal } from 'react-dom';

export default function SheetIdioma({ IDIOMAS, idiomaActual, setSheetIdioma, sheetIdioma, trocarIdioma }) {
  return (
    <>
      {/* Bottom sheet do idioma. Reusa o .modal-overlay da casa (fixed, z80, scrim a
          72%) mas encosta o painel em baixo em vez de o centrar — daí o alignItems.
          Tocar fora fecha (onClick no overlay); o painel pára a propagação.
          O painel leva .hud-corners-topo: 45° só em cima, porque em baixo está
          colado ao bordo do ecrã.

          PORTAL PARA O <body>, e não é preferência: sem ele o sheet nascia DENTRO do
          PageTransition, que anima transform+opacity e por isso cria um CONTEXTO DE
          EMPILHAMENTO. O z-index: 80 do overlay ficava preso lá dentro, a competir só
          com irmãos da própria página; na raiz, o que contava era o z-index do
          PageTransition — `auto`, ou seja 0. A bottom nav é fixed z-50 na raiz, logo
          50 > 0 e a nav pintava por cima do sheet inteiro: as duas últimas línguas
          (한국어 e Français) ficavam escondidas atrás dela. Aumentar o 80 para 9999 não
          resolvia nada — de dentro de um contexto de empilhamento não se sai por
          números. Sai-se saindo: o portal põe o overlay como filho do <body>, onde os
          80 finalmente competem com os 50 da nav. E um modal DEVE tapar a nav.
          Nota: os outros dois modais desta página (sair, selector de admin) têm o
          mesmo defeito latente — safaram-se por serem centrados, longe da nav. */}
      {sheetIdioma ? createPortal(
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => setSheetIdioma(false)}
          style={{ alignItems: 'flex-end', padding: 0 }}
        >
          <div
            className="hud-corners-topo"
            role="dialog"
            aria-modal="true"
            aria-label="Escolher idioma"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', background: '#16161c', borderTop: '1px solid rgba(255,255,255,0.06)', paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
          >
            {/* Puxador: diz "isto arrasta-se/fecha-se" sem uma linha de texto. */}
            <div aria-hidden="true" style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)', margin: '10px auto 6px' }} />
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', padding: '4px 16px 10px' }}>
              Idioma / Language
            </div>
            {IDIOMAS.map((op, i) => {
              const ativo = idiomaActual === op.id;
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => { setSheetIdioma(false); trocarIdioma(op.id); }}
                  aria-pressed={ativo}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                    padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
                    borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{op.bandeira}</span>
                  <span style={{ flex: 1, fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: ativo ? 700 : 600, letterSpacing: '0.04em', color: ativo ? '#f0c94a' : 'rgba(255,255,255,0.75)' }}>
                    {op.nome}
                  </span>
                  {/* Check dourado só na activa. */}
                  {ativo ? <span aria-hidden="true" style={{ color: '#d4a017', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>✓</span> : null}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
