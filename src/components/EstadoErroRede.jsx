// Futty v2.0 — Estado REUTILIZÁVEL de erro de rede: "sem ligação · tentar de novo".
// Para páginas de dados (useApi): em vez de um loader eterno ou um erro cru quando a
// rede falha, mostra um estado digno da casa com botão de repetir. Uso:
//   const { data, error, reload } = useApi('/api/…');
//   if (error) return <EstadoErroRede onRepetir={reload} />;
import '../styles/app.css';

export default function EstadoErroRede({ onRepetir, mensagem, compacto = false }) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        textAlign: 'center',
        padding: compacto ? '24px 18px' : '48px 24px',
        color: 'rgba(255,255,255,0.6)',
      }}
    >
      {/* Ícone "sem ligação" (wifi cortado) — traço da casa, dourado suave. */}
      <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#d4a017" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }} aria-hidden="true">
        <path d="M1 1l22 22" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, maxWidth: 280 }}>
        {mensagem || 'Sem conexão. Verifique a internet e tente de novo.'}
      </p>
      {onRepetir ? (
        <button
          type="button"
          className="btn btn--purple-outline hud-corners"
          style={{ height: 40, padding: '0 20px', fontSize: 13 }}
          onClick={onRepetir}
        >
          Tentar de novo
        </button>
      ) : null}
    </div>
  );
}
