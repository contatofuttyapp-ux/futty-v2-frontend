// Futty v2.0 — Página de erro com bola a saltar (Lottie) (404 / crash).
import Lottie from 'lottie-react';
import bola from '../assets/bola.json';

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
        gap: 18,
        padding: 24,
        textAlign: 'center',
      }}
    >
      {/* Bola a saltar (Lottie) */}
      <Lottie animationData={bola} loop aria-hidden style={{ width: 120, height: 180 }} />

      <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: '#fff' }}>Algo correu mal</h1>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, maxWidth: 260, lineHeight: 1.5 }}>
        {mensagem || 'O servidor está a descansar. Tenta de novo daqui a pouco.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 6 }}>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            style={{
              background: 'rgba(212,160,23,0.1)',
              border: '1px solid rgba(212,160,23,0.4)',
              color: '#d4a017',
              borderRadius: 8,
              padding: '10px 24px',
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Tentar novamente
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            window.location.href = '/home';
          }}
          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer' }}
        >
          Voltar ao início
        </button>
      </div>
    </div>
  );
}
