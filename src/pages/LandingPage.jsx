// Futty v2.0 — Boas-vindas (rota "/") para visitantes não autenticados.
// Tela ÚNICA sem scroll (decisão 31-jul): o F oficial com a aura da casa, o slogan
// e as três portas de entrada. As secções antigas (figurinha/como-funciona/planos/
// CTA final) morreram — quem quer saber mais entra.
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { entrarComGoogle } from '../lib/googleAuth';
import { entrarComApple, podeEntrarComApple } from '../lib/appleAuth';
import FuttyIconeFlutuante from '../components/FuttyIconeFlutuante';
import GoogleIcon from '../components/GoogleIcon';
import AppleIcon from '../components/AppleIcon';
import Toast from '../components/Toast';
import AviseMe, { AviseMeForm } from './AviseMe';
import '../styles/app.css';

/**
 * A página inicial do site. `soAviseMe` (a rota /avise-me, destino dos links das redes) mostra só a página do Avise-me —
 * o mesmo chunk lazy, sem um `import()` a mais no arranque do app.
 */
export default function LandingPage({ soAviseMe = false }) {
  return soAviseMe ? <AviseMe /> : <PaginaInicial />;
}

function PaginaInicial() {
  const [erro, setErro] = useState('');
  // Rodada 29B (F): o bloco "Avise-me" entrou na tela. No celular normal tudo continua numa tela só; em tela curta
  // (iPhone SE) o F encolhe e, se ainda assim não couber, a página rola em vez de cortar o formulário.
  const [tamanhoF] = useState(() => (typeof window !== 'undefined' && window.innerHeight < 760 ? 112 : 176));
  // Toast de passagem (ex.: "Conta excluída..." depois de MeuPerfil.jsx
  // navegar para "/" com state) — location.state some numa próxima
  // navegação, por isso é lido só uma vez no estado inicial.
  const location = useLocation();
  const [toastPassagem, setToastPassagem] = useState(location.state?.toast || '');

  // Mesmo fluxo OAuth do Login (lib/googleAuth) — a rota /login continua a
  // existir para quem prefere email/password.
  async function handleGoogle() {
    setErro('');
    const { error } = await entrarComGoogle({ redirectTo: `${window.location.origin}/` });
    if (error) setErro(error.message);
  }

  // Aqui não há navigate: esta tela é desenhada pelo IndexRedirect, que manda
  // para /home assim que a sessão aparece. O da Apple nasce dentro da app, por
  // isso isso acontece ainda antes desta função acabar.
  async function handleApple() {
    setErro('');
    const { error, cancelado } = await entrarComApple();
    if (!cancelado && error) setErro(error.message);
  }

  return (
    <div style={{ height: '100dvh', overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
      {/* Deriva lenta de fundo — só transform, por cima da aurora global */}
      <div className="landing-drift" aria-hidden="true" />

      <div
        style={{
          minHeight: '100%',
          maxWidth: 430,
          margin: '0 auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 22,
          position: 'relative',
        }}
      >
        {/* O F oficial, sozinho, com a aura dourada da casa a respirar atrás */}
        <div style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
          <span className="landing-glow" aria-hidden="true" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <FuttyIconeFlutuante size={tamanhoF} />
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
          {/* A Apple vem primeiro no iPhone: a regra 4.8 da App Store pede que o
              Entrar com a Apple não seja menos visível que os outros logins.
              Sem o .auth-btn--apple porque esta tela não carrega o auth.css —
              usa o contorno da casa, do mesmo tamanho do CTA dourado. */}
          {podeEntrarComApple() && (
            <button
              type="button"
              className="btn btn--outline hud-corners-s"
              onClick={handleApple}
              style={{
                width: '100%',
                height: 46,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                fontSize: 15,
                fontFamily: "'Rajdhani', sans-serif",
                cursor: 'pointer',
              }}
            >
              <AppleIcon />
              Continuar com a Apple
            </button>
          )}

          <div className="cta-gold-glow">
            <button
              type="button"
              className="cta-gold hud-corners-s"
              onClick={handleGoogle}
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

        {/* Rodada 29B (F): quem chega das redes e ainda não pode baixar o app deixa o e-mail. */}
        <div style={{ width: '100%', maxWidth: 320, borderTop: '1px solid rgba(255,255,255,0.10)', paddingTop: 18 }}>
          <AviseMeForm origemPadrao="site" />
        </div>
      </div>

      {toastPassagem ? <Toast mensagem={toastPassagem} tipo="success" onClose={() => setToastPassagem('')} /> : null}
    </div>
  );
}
