// Futty v2.0 — Banner de consentimento de cookies/armazenamento local.
// Fixo no fundo; só aparece enquanto localStorage 'futty_cookies' não for 'aceite'.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/app.css';

const KEY = 'futty_cookies';

export default function CookieBanner() {
  const [visivel, setVisivel] = useState(() => {
    try {
      return localStorage.getItem(KEY) !== 'aceite';
    } catch {
      return false; // sem acesso a localStorage → não incomoda
    }
  });

  if (!visivel) return null;

  function aceitar() {
    try {
      localStorage.setItem(KEY, 'aceite');
    } catch {
      // ignora — se não der para guardar, fecha na mesma nesta sessão
    }
    setVisivel(false);
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: 'var(--surface-1)',
        borderTop: '1px solid var(--border)',
        padding: 'var(--space-sm) var(--space-md)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        flexWrap: 'wrap',
      }}
    >
      <p style={{ margin: 0, flex: 1, minWidth: 220, fontSize: 'var(--label-size)', color: 'var(--text-dim)', lineHeight: 1.45 }}>
        Usamos cookies e armazenamento local para manter a tua sessão e preferências.{' '}
        <Link to="/privacidade" style={{ color: 'var(--neon)' }}>Saber mais</Link>
      </p>
      <button type="button" className="btn btn--sm btn--primary" onClick={aceitar}>
        Aceitar
      </button>
    </div>
  );
}
