// Futty v2.0 — Perfil: a folha de excluir a conta, num portal.
import { createPortal } from 'react-dom';
import { inputStyle, labelStyle } from './estilos';

export default function SheetExcluirConta({ campoExcluirRef, confirmExcluir, confirmacaoOk, excluindo, excluirConta, setConfirmExcluir, setSheetExcluir, sheetExcluir }) {
  return (
    <>
      {/* Bottom sheet "Excluir conta" — mesmo padrão do sheet de idioma (portal para o <body>, painel encostado
          em baixo; ver nota longa acima de sheetIdioma sobre o porquê do portal). Fechar por fora fica ativo
          mesmo aqui: é reversível até o clique em "Excluir de vez".
          Com o teclado aberto a folha não some — o painel nunca passa de 100dvh, o texto rola dentro dele e o
          botão fica num rodapé que não rola. */}
      {sheetExcluir ? createPortal(
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => { if (!excluindo) setSheetExcluir(false); }}
          style={{ alignItems: 'flex-end', padding: 0 }}
        >
          <div
            className="hud-corners-topo"
            role="dialog"
            aria-modal="true"
            aria-label="Excluir minha conta"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxHeight: '100dvh', display: 'flex', flexDirection: 'column',
              background: '#16161c', borderTop: '1px solid rgba(239,68,68,0.35)',
            }}
          >
            <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
              <div aria-hidden="true" style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)', margin: '10px auto 6px' }} />
              <div style={{ padding: '4px 20px 12px' }}>
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: '0.04em', color: '#f87171', margin: '10px 0 10px' }}>
                  Excluir minha conta
                </h2>
                <p style={{ fontSize: 13, lineHeight: 1.55, color: 'rgba(255,255,255,0.65)', margin: '0 0 16px' }}>
                  Isso apaga seu perfil, sua figurinha, suas fotos e suas participações. Times em que você é o único membro são apagados; os outros continuam com o time. Não dá para desfazer.
                </p>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={labelStyle}>Digite EXCLUIR para confirmar</span>
                  <input
                    ref={campoExcluirRef}
                    value={confirmExcluir}
                    onChange={(e) => setConfirmExcluir(e.target.value)}
                    // Com o teclado subindo, leva o campo para a vista (espera a animação do teclado).
                    onFocus={(e) => {
                      const campo = e.currentTarget;
                      setTimeout(() => campo.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
                    }}
                    placeholder="EXCLUIR"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    autoComplete="off"
                    spellCheck={false}
                    enterKeyHint="done"
                    disabled={excluindo}
                    className="hud-corners-s"
                    style={inputStyle}
                  />
                </label>
              </div>
            </div>
            <div style={{ flex: '0 0 auto', padding: '8px 20px', paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))' }}>
              <button
                type="button"
                className="btn hud-corners-s"
                style={{
                  width: '100%',
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  background: confirmacaoOk ? 'var(--danger)' : 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.5)',
                  color: confirmacaoOk ? '#fff' : 'rgba(255,255,255,0.55)',
                  cursor: excluindo ? 'wait' : 'pointer',
                }}
                aria-disabled={!confirmacaoOk || excluindo}
                disabled={excluindo}
                onClick={excluirConta}
              >
                {excluindo ? 'Excluindo…' : confirmacaoOk ? 'Excluir de vez' : 'Digite EXCLUIR acima'}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ width: '100%', marginTop: 10 }}
                disabled={excluindo}
                onClick={() => setSheetExcluir(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
