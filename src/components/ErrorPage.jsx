// Futty v2.0 — Página de erro (404 / crash), na linguagem da casa.
//
// FASE 3.61 — ANTES ESTAVA PARTIDA. Usava `import Lottie from 'lottie-react'` para uma
// bola a saltar, mas o pacote tem duplo default (interop CJS→ESM): o default é o
// objecto {LottiePlayer, default, useLottie, useLottieInteractivity}, não o componente.
// O React rebentava com "Element type is invalid... got: object" — e como esta é
// justamente a página que o ErrorBoundary mostra, QUALQUER 404 ou crash dava ECRÃ
// BRANCO. O bug escondia-se a si próprio.
//
// A correcção mata o import problemático em vez de o remendar: o Lottie sai e entra o
// F da casa (o mesmo FuttyLoader de todo o app). Menos uma dependência, menos um
// asset, e a página de erro passa a falar a linguagem do resto.
import FuttyLoader from './FuttyLoader';

export default function ErrorPage({ onRetry, mensagem }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#050810',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <FuttyLoader size={110} label={null} />

      <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: '0.06em', color: '#fff', margin: 0 }}>
        Algo correu mal
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, maxWidth: 280, lineHeight: 1.5, margin: 0 }}>
        {mensagem || 'O servidor está a descansar. Tenta de novo daqui a pouco.'}
      </p>

      <div style={{ display: 'grid', justifyItems: 'center', gap: 12, marginTop: 4, width: '100%', maxWidth: 260 }}>
        {onRetry ? (
          <div className="cta-gold-glow" style={{ display: 'flex', width: '100%' }}>
            <button type="button" className="btn hud-corners cta-gold" style={{ width: '100%' }} onClick={onRetry}>
              Tentar novamente
            </button>
          </div>
        ) : null}
        <button
          type="button"
          className="btn btn--purple-outline hud-corners"
          style={{ width: '100%', height: 42, fontSize: 14 }}
          onClick={() => {
            window.location.href = '/home';
          }}
        >
          Voltar ao início
        </button>
      </div>
    </div>
  );
}
