// Futty v2.0 — Perfil: a confirmação de sair da conta, num portal.
import { createPortal } from 'react-dom';

export default function ConfirmarSaida({ confirmSignOut, setConfirmSignOut, signOut }) {
  return (
    <>
      {/* Modal confirmar sign out.
          PORTAL pela mesma razão do sheet: sem ele o overlay nasce dentro do
          PageTransition, que cria contexto de empilhamento (transform+opacity), e o
          z-index: 80 fica preso lá — na raiz vale o `auto` (0) do PageTransition
          contra o z-50 da bottom nav. Resultado: a nav pintava POR CIMA do scrim.
          Aqui o defeito era mais discreto que no sheet (o card é centrado, longe da
          nav), mas estava lá: o véu escurecia a página toda menos a nav, que ficava
          acesa por cima de um modal — e continuava clicável por trás dele. */}
      {confirmSignOut ? createPortal(
        <div className="modal-overlay" role="presentation" onClick={() => setConfirmSignOut(false)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__inner">
              <p style={{ fontSize: 15, marginBottom: 16 }}>Tem certeza que quer sair da conta?</p>
              <button type="button" className="btn btn--primary" style={{ width: '100%', background: 'var(--danger)', color: '#fff' }} onClick={() => signOut()}>
                Sair da conta
              </button>
              <button type="button" className="btn btn--ghost btn--sm" style={{ width: '100%', marginTop: 10 }} onClick={() => setConfirmSignOut(false)}>
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
