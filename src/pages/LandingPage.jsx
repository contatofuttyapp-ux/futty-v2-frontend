// Futty v2.0 — Boas-vindas (rota "/") para visitantes não autenticados.
// Tela ÚNICA sem scroll (decisão 31-jul): o F oficial com a aura da casa, o slogan
// e as três portas de entrada. As secções antigas (figurinha/como-funciona/planos/
// CTA final) morreram — quem quer saber mais entra.
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import FuttyLockup from '../components/FuttyLockup';
import GoogleIcon from '../components/GoogleIcon';
import Toast from '../components/Toast';
import '../styles/app.css';

export default function LandingPage() {
  const [erro, setErro] = useState('');
  // Toast de passagem (ex.: "Conta excluída..." depois de MeuPerfil.jsx
  // navegar para "/" com state) — location.state some numa próxima
  // navegação, por isso é lido só uma vez no estado inicial.
  const location = useLocation();
  const [toastPassagem, setToastPassagem] = useState(location.state?.toast || '');

  // Mesmo fluxo OAuth do Login (supabase.auth.signInWithOAuth) — a rota /login
  // continua a existir para quem prefere email/password.
  async function entrarComGoogle() {
    setErro('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) setErro(error.message);
  }

  return (
    <div style={{ height: '100dvh', overflow: 'hidden', position: 'relative' }}>
      {/* Deriva lenta de fundo — só transform, por cima da aurora global */}
      <div className="landing-drift" aria-hidden="true" />

      <div
        style={{
          height: '100%',
          maxWidth: 430,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 26,
          position: 'relative',
        }}
      >
        {/* O F oficial, sozinho, com a aura dourada da casa a respirar atrás */}
        <div style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
          <span className="landing-glow" aria-hidden="true" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <FuttyLockup size={176} wordmark={false} />
          </div>
        </div>

        <h1
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 800,
            color: '#fff',
            fontSize: 36,
            lineHeight: 1.12,
            margin: 0,
          }}
        >
          O seu time.<br />A sua figurinha.
        </h1>

        <div style={{ display: 'grid', gap: 12, width: '100%', maxWidth: 320 }}>
          <div className="cta-gold-glow">
            <button
              type="button"
              className="cta-gold hud-corners-s"
              onClick={entrarComGoogle}
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                fontSize: 15,
                fontFamily: "'Rajdhani', sans-serif",
                cursor: 'pointer',
              }}
            >
              <GoogleIcon />
              Entrar com Google
            </button>
          </div>

          <Link
            to="/register"
            className="btn btn--outline hud-corners-s"
            style={{ height: 46, fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Criar conta grátis
          </Link>

          {erro && <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{erro}</p>}

          <Link
            to="/login"
            style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none', marginTop: 4 }}
          >
            Já tenho conta → <span style={{ color: '#d4a017' }}>Entrar</span>
          </Link>
        </div>
      </div>

      {toastPassagem ? <Toast mensagem={toastPassagem} tipo="success" onClose={() => setToastPassagem('')} /> : null}
    </div>
  );
}
