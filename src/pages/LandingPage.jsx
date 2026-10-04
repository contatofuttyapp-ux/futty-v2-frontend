// Futty v2.0 — Boas-vindas (rota "/") para visitantes não autenticados.
// Tela ÚNICA sem scroll (decisão 31-jul): o F oficial com a aura da casa, o slogan, a frase do que o app faz e as portas de
// entrada. As secções antigas (figurinha/como-funciona/planos/CTA final) morreram — quem quer saber mais entra. O bloco
// "Avise-me" (29B) saiu na 29P: a página inicial já é a de verdade; a lista de e-mails continua no Gabinete.
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { entrarComGoogle } from '../lib/googleAuth';
import { entrarComApple, podeEntrarComApple } from '../lib/appleAuth';
import FuttyIconeFlutuante from '../components/FuttyIconeFlutuante';
import GoogleIcon from '../components/GoogleIcon';
import AppleIcon from '../components/AppleIcon';
import Toast from '../components/Toast';
import '../styles/app.css';

export default function LandingPage() {
  const [erro, setErro] = useState('');
  // O F ganha a tela (29P): em tela curta (iPhone SE) encolhe para tudo continuar numa tela só.
  const [tamanhoF] = useState(() => (typeof window !== 'undefined' && window.innerHeight < 760 ? 150 : 220));
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
          padding: '20px 24px 12px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
      {/* O miolo fica centrado como sempre; o rodapé legal (29I, achado 76) desce para o pé da tela. */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 18,
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
            fontSize: 42,
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          O seu time.<br />A sua figurinha.
        </h1>

        {/* Rodada 29O: o nome e o que o app faz, para quem chega sem ler nada (é o que o Google pede para verificar a marca). */}
        <p className="texto-apoio" style={{ margin: '-6px 0 0', maxWidth: 310, fontSize: 15 }}>
          Futty: sorteio justo, ranking e figurinha de colecionador para o futebol do seu time.
        </p>

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
            Criar conta
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

        {/* Rodapé legal (Rodada 29I, achado 76): as lojas pedem a Privacidade acessível SEM precisar de conta, e o aviso dos 18 anos
            tem de estar antes do cadastro, não só dentro dele. As duas páginas já existem (/termos, /privacidade). Discreto: letra
            pequena, cor apagada, um link por palavra, sem ocupar o lugar dos botões. */}
        <footer data-rodape-legal style={{ width: '100%', maxWidth: 320, margin: '0 auto', padding: '18px 0 6px', textAlign: 'center', fontSize: 12, lineHeight: 1.7, color: 'rgba(255,255,255,0.45)' }}>
          <div>
            <Link to="/termos" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'underline', textUnderlineOffset: 3 }}>Termos de Uso</Link>
            {' · '}
            <Link to="/privacidade" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'underline', textUnderlineOffset: 3 }}>Privacidade</Link>
          </div>
          <div>Para maiores de 18 anos.</div>
        </footer>
      </div>

      {toastPassagem ? <Toast mensagem={toastPassagem} tipo="success" onClose={() => setToastPassagem('')} /> : null}
    </div>
  );
}
