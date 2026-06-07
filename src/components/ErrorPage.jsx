// Futty v2.0 — Página de erro com boneco a fazer embaixadinha (404 / crash).
const CSS = `
@keyframes pernaChutar { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-45deg); } }
@keyframes bolaSubir { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
`;

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
      <style>{CSS}</style>

      {/* Boneco stick figure a fazer embaixadinha */}
      <svg viewBox="0 0 120 170" width="120" height="170" aria-hidden style={{ overflow: 'visible' }}>
        {/* Cabeça */}
        <circle cx="60" cy="24" r="12" fill="none" stroke="#fff" strokeWidth="3" />
        {/* Corpo */}
        <line x1="60" y1="36" x2="60" y2="96" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        {/* Braços */}
        <line x1="60" y1="52" x2="40" y2="70" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <line x1="60" y1="52" x2="80" y2="58" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        {/* Perna esquerda (estática) */}
        <line x1="60" y1="96" x2="46" y2="142" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        {/* Perna direita (anca = origem; sobe/desce) */}
        <g style={{ transformOrigin: '60px 96px', transformBox: 'view-box', animation: 'pernaChutar 0.8s ease-in-out infinite' }}>
          <line x1="60" y1="96" x2="76" y2="138" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </g>
        {/* Bola dourada (sobe quando a perna sobe) */}
        <circle cx="84" cy="132" r="7" fill="#d4a017" style={{ transformOrigin: '84px 132px', transformBox: 'view-box', animation: 'bolaSubir 0.8s ease-in-out infinite' }} />
      </svg>

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
