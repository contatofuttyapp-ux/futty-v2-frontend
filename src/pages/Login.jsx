// Futty v2.0 — Login (email/password + Google)
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { entrarComGoogle } from '../lib/googleAuth';
import { entrarComApple, podeEntrarComApple } from '../lib/appleAuth';
import GoogleIcon from '../components/GoogleIcon';
import AppleIcon from '../components/AppleIcon';
import FuttyLogo from '../components/FuttyLogo';
// O app.css tem de vir ANTES do auth.css: traz o vocabulário da casa
// (.hud-corners-s, .cta-gold) e o auth.css é a camada por cima.
import '../styles/app.css';
import '../styles/auth.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/home';
  const { session, loading: sessaoCarregando } = useAuth();

  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // RODADA 28 — avisos curtos, uma vez só: a sessão acabou sem a pessoa pedir (AuthContext: 401 do
  // motor, refresh recusado) ou o cadastro parou nos 13 anos (Onboarding: o motor apagou a conta).
  // A marca só é LIDA aqui e apagada no efeito, depois de a tela montar: o Login chega por import
  // dinâmico e o React 19 renderiza-o duas vezes antes de fixar a tela (medido na cena rodada28) —
  // apagada na 1ª renderização, a 2ª, que é a que fica, nascia sem o aviso.
  const [aviso] = useState(() => {
    try {
      if (sessionStorage.getItem('futty_menor13') === '1') return { tipo: 'error', texto: 'O Futty é para maiores de 13 anos. A conta não foi criada.' };
      if (sessionStorage.getItem('futty_sessao_terminou') === '1') return { tipo: 'success', texto: 'Sua sessão terminou. Entre de novo.' };
    } catch { /* modo privado: sem aviso */ }
    return null;
  });
  useEffect(() => {
    try {
      sessionStorage.removeItem('futty_menor13');
      sessionStorage.removeItem('futty_sessao_terminou');
    } catch { /* modo privado */ }
  }, []);

  // Rede de segurança para "já está autenticado": cobre chegar aqui já logado
  // (link direto, voltar pelo histórico) e o login nativo pela Apple/Google, cuja
  // sessão nasce de um evento fora desta tela (a folha da Apple; o appUrlOpen do
  // Google — este já navega sozinho no DeepLinkListener, mas o efeito é reforço).
  // Alvo fixo /home, não `from`: quem submete o formulário ou toca em Apple já
  // navega para `from` por conta própria — como isso acontece dentro do mesmo
  // ciclo de renderização em que a sessão muda, o React troca de rota antes deste
  // efeito rodar de novo, então não há disputa entre os dois destinos na prática.
  useEffect(() => {
    if (!sessaoCarregando && session) navigate('/home', { replace: true });
  }, [sessaoCarregando, session, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate(from, { replace: true });
  }

  async function handleGoogle() {
    setError('');
    const { error } = await entrarComGoogle({ redirectTo: `${window.location.origin}${from}` });
    if (error) setError(error.message);
  }

  // Ao contrário do Google, o login da Apple termina dentro da app (sem Custom
  // Tab nem deep link): quando volta, a sessão já existe e a navegação é aqui.
  async function handleApple() {
    setError('');
    const { error, cancelado } = await entrarComApple();
    if (cancelado) return;
    if (error) {
      setError(error.message);
      return;
    }
    navigate(from, { replace: true });
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-card__inner">
          {/* Header do cânone: marca + título dourado seco + linha com degrau 45°.
              Nas páginas de auth marca e título coexistem — esta é a porta da rua. */}
          <div className="auth-brand" style={{ opacity: 1, display: 'flex', justifyContent: 'flex-start' }}>
            <FuttyLogo variant="metallic" size={40} />
          </div>
          <h1 className="auth-title">Bem-vindo de volta</h1>
          <div className="auth-rule" aria-hidden="true" />
          <p className="auth-subtitle">Entre na sua conta para continuar.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {aviso && !error && (
              <div role="status" className={`auth-alert auth-alert--${aviso.tipo} hud-corners-s`}>{aviso.texto}</div>
            )}
            {error && (
              <div className="auth-alert auth-alert--error hud-corners-s">{error}</div>
            )}

            <div className="auth-field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                className="auth-input hud-corners-s"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                className="auth-input hud-corners-s"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="auth-links">
              <span />
              <Link to="/forgot-password">Esqueceu a senha?</Link>
            </div>

            {/* CTA — receita Compartilhar (Lei dos Gémeos). O glow tem de ficar no
                wrapper: o clip-path a 45° do botão cortaria o drop-shadow. */}
            <div className="cta-gold-glow">
              <button
                type="submit"
                className="auth-cta cta-gold hud-corners"
                disabled={loading}
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
            </div>
          </form>

          <div className="auth-divider">ou</div>

          {/* A Apple vem primeiro no iPhone: a regra 4.8 da App Store pede que o
              Entrar com a Apple não seja menos visível que os outros logins. */}
          {podeEntrarComApple() && (
            <button
              type="button"
              className="auth-btn auth-btn--apple hud-corners-s"
              onClick={handleApple}
              style={{ marginBottom: 10 }}
            >
              <AppleIcon />
              Continuar com a Apple
            </button>
          )}

          <button
            type="button"
            className="auth-btn auth-btn--google hud-corners-s"
            onClick={handleGoogle}
          >
            <GoogleIcon />
            Continuar com Google
          </button>

          <p className="auth-footer">
            Ainda não tem conta? <Link to="/register">Crie uma</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
