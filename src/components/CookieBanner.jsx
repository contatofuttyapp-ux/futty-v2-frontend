// Futty v2.0 — Banner de consentimento de cookies/armazenamento local.
// Fixo no fundo, mas ACIMA da BottomNav (a navegação nunca é tapada); uma linha;
// fecha ao Aceitar OU na primeira interação real (scroll/toque/tecla). Só aparece
// enquanto localStorage 'futty_cookies' não for 'aceite'.
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { shouldShowNav } from './Layout';
import '../styles/app.css';

const KEY = 'futty_cookies';

export default function CookieBanner() {
  const { pathname } = useLocation();
  const navVisivel = shouldShowNav(pathname);
  const [visivel, setVisivel] = useState(() => {
    try {
      return localStorage.getItem(KEY) !== 'aceite';
    } catch {
      return false; // sem acesso a localStorage → não incomoda
    }
  });

  function aceitar() {
    try {
      localStorage.setItem(KEY, 'aceite');
    } catch {
      // ignora — se não der para guardar, fecha na mesma nesta sessão
    }
    setVisivel(false);
  }

  // Fecha na PRIMEIRA interação real (scroll, toque, clique ou tecla) — o utilizador
  // que já começou a usar o app não fica com a navegação disputada. { once:true }.
  useEffect(() => {
    if (!visivel) return undefined;
    const fechar = () => aceitar();
    const opts = { once: true, passive: true, capture: true };
    window.addEventListener('pointerdown', fechar, opts);
    window.addEventListener('keydown', fechar, opts);
    window.addEventListener('wheel', fechar, opts);
    window.addEventListener('touchmove', fechar, opts);
    return () => {
      window.removeEventListener('pointerdown', fechar, opts);
      window.removeEventListener('keydown', fechar, opts);
      window.removeEventListener('wheel', fechar, opts);
      window.removeEventListener('touchmove', fechar, opts);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visivel]);

  if (!visivel) return null;

  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        // ACIMA da BottomNav quando ela existe — a navegação nunca é tapada.
        bottom: navVisivel ? 'calc(58px + env(safe-area-inset-bottom))' : 0,
        zIndex: 40, // abaixo da nav (z-index:50) — nunca a cobre
        background: 'var(--surface-1)',
        borderTop: '1px solid var(--border)',
        padding: '8px var(--space-md)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        flexWrap: 'nowrap',
      }}
    >
      <p
        style={{
          margin: 0,
          flex: 1,
          minWidth: 0,
          fontSize: 'var(--label-size)',
          color: 'var(--text-dim)',
          lineHeight: 1.35,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        Cookies para manter a sua sessão.{' '}
        <Link to="/privacidade" style={{ color: 'var(--neon)' }}>Saiba mais</Link>
      </p>
      <button type="button" className="btn btn--sm btn--primary" style={{ flexShrink: 0 }} onClick={aceitar}>
        Aceitar
      </button>
    </div>
  );
}
