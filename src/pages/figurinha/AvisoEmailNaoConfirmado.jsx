import { losangoDoCanto } from './estilos';
// Futty v2.0 — Figurinha: o aviso de e-mail não confirmado (gerar exige e-mail confirmado), com o reenvio.

export default function AvisoEmailNaoConfirmado({ emailNaoConfirmado, reenviarBusy, reenviarEmailConfirmacao, reenviarFeito }) {
  return (
    <>
          {emailNaoConfirmado ? (
            <div className="hud-corners" style={{ position: 'relative', background: 'linear-gradient(180deg, #14121c, #0b0a12)', border: '1px solid rgba(212,160,23,0.35)', padding: '14px 16px', display: 'grid', gap: 8, justifyItems: 'center', textAlign: 'center' }}>
              <span aria-hidden="true" style={losangoDoCanto} />
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: '0.04em', color: '#fff' }}>Confirme seu e-mail para gerar</span>
              <span className="texto-apoio texto-apoio--centro" style={{ marginTop: 0 }}>Enviamos um link de confirmação quando você criou a conta.</span>
              {reenviarFeito ? (
                <span style={{ fontSize: 12, color: '#7bd88f' }}>E-mail reenviado, confira sua caixa de entrada.</span>
              ) : (
                <button
                  type="button"
                  className="btn btn--purple hud-corners"
                  style={{ marginTop: 4, height: 38, paddingLeft: 18, paddingRight: 18, fontSize: 13 }}
                  disabled={reenviarBusy}
                  onClick={reenviarEmailConfirmacao}
                >
                  {reenviarBusy ? 'Reenviando…' : 'Reenviar e-mail'}
                </button>
              )}
            </div>
          ) : null}
    </>
  );
}
