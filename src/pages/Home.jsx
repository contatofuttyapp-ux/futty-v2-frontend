// Futty v2.0 — Home (placeholder)
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, signOut } = useAuth();

  return (
    <div
      style={{
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: '-0.03em',
        }}
      >
        Futty<span style={{ color: 'var(--neon)' }}>.</span>
      </div>
      <h1 style={{ fontSize: 40 }}>Bem-vindo 👋</h1>
      <p style={{ color: 'var(--text-dim)' }}>
        Sessão iniciada como <strong style={{ color: 'var(--neon)' }}>{user?.email}</strong>
      </p>
      <button
        type="button"
        onClick={() => signOut()}
        style={{
          marginTop: 8,
          padding: '12px 24px',
          borderRadius: 10,
          border: '1px solid var(--purple)',
          background: 'rgba(124, 58, 237, 0.15)',
          color: 'var(--text)',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Terminar sessão
      </button>
    </div>
  );
}
