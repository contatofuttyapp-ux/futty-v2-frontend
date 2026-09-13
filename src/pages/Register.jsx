// Futty v2.0 — Registo (email/password)
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { entrarComGoogle } from '../lib/googleAuth';
import { entrarComApple, podeEntrarComApple } from '../lib/appleAuth';
import GoogleIcon from '../components/GoogleIcon';
import AppleIcon from '../components/AppleIcon';
import FuttyLogo from '../components/FuttyLogo';
// O app.css tem de vir ANTES do auth.css: traz o vocabulário da casa
// (.hud-corners-s, .cta-gold) e o auth.css é a camada por cima.
import '../styles/app.css';
import '../styles/auth.css';

// Máximo permitido: ontem (não permite hoje nem datas futuras).
const MAX_NASCIMENTO = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [aceite, setAceite] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [reenviarMsg, setReenviarMsg] = useState('');
  const [reenviarErro, setReenviarErro] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Contagem regressiva do "Reenviar e-mail": 1 setTimeout por tick, dependency
  // simples em `cooldown` — evita recriar um setInterval solto a limpar na mão.
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    if (!birthdate) {
      setError('Data de nascimento é obrigatória.');
      return;
    }
    if (!aceite) {
      setError('Você precisa concordar com os Termos de Uso e a Política de Privacidade para continuar.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Registos NOVOS aterram no onboarding dia-1 (boas-vindas → foto → identidade);
        // contas antigas nunca passam por lá.
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: { birthdate }, // guardado em user_metadata; o backend persiste em users.birthdate
      },
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Se a confirmação por email estiver ativa, não há sessão imediata.
    // O onboarding fica à espera no servidor (flag onboarding_completo): venhas
    // pelo link do email ou por login, entras sempre por ele.
    if (data.user && !data.session) {
      setSuccess(`Conta criada! Enviamos um e-mail de confirmação para ${email}. Olhe também no Spam.`);
    } else {
      // Sessão imediata → onboarding dia-1.
      navigate('/onboarding', { replace: true });
    }
  }

  async function handleResend() {
    setReenviarErro('');
    setReenviarMsg('');
    setReenviando(true);
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/onboarding` },
    });
    setReenviando(false);

    if (resendError) {
      setReenviarErro('Aguarde um minuto e tente de novo.');
      return;
    }
    setReenviarMsg('Enviamos de novo. Olhe também na aba Promoções e no Spam.');
    setCooldown(60);
  }

  async function handleGoogle() {
    setError('');
    const { error } = await entrarComGoogle({ redirectTo: `${window.location.origin}/home` });
    if (error) setError(error.message);
  }

  // O login da Apple acaba dentro da app (sem Custom Tab nem deep link): a
  // sessão já existe quando volta, por isso a navegação é aqui. Numa conta nova
  // a Apple manda o nome — lib/appleAuth guarda-o, só desta primeira vez.
  async function handleApple() {
    setError('');
    const { error, cancelado } = await entrarComApple();
    if (cancelado) return;
    if (error) {
      setError(error.message);
      return;
    }
    navigate('/home', { replace: true });
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-card__inner">
          {/* Header do cânone: marca + título dourado seco + linha com degrau 45°.
              Nas páginas de auth marca e título coexistem — esta é a porta da rua. */}
          {/* O F metálico da boas-vindas, alinhado à esquerda como o resto da
              tela (título, linha, formulário) — um eixo só. */}
          <div className="auth-brand" style={{ opacity: 1, display: 'flex', justifyContent: 'flex-start' }}>
            <FuttyLogo variant="metallic" size={40} />
          </div>
          <h1 className="auth-title">Crie a sua conta</h1>
          <div className="auth-rule" aria-hidden="true" />
          <p className="auth-subtitle">Junte-se ao Futty em segundos.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && (
              <div className="auth-alert auth-alert--error hud-corners-s">{error}</div>
            )}
            {success && (
              <>
                <div className="auth-alert auth-alert--success hud-corners-s">{success}</div>
                {reenviarMsg && (
                  <div className="auth-alert auth-alert--success hud-corners-s">{reenviarMsg}</div>
                )}
                {reenviarErro && (
                  <div className="auth-alert auth-alert--error hud-corners-s">{reenviarErro}</div>
                )}
                <button
                  type="button"
                  className="auth-btn hud-corners-s"
                  onClick={handleResend}
                  disabled={reenviando || cooldown > 0}
                >
                  {cooldown > 0 ? `Reenviar em ${cooldown}s…` : reenviando ? 'Enviando…' : 'Reenviar e-mail'}
                </button>
                <button
                  type="button"
                  className="auth-btn hud-corners-s"
                  onClick={() => navigate('/login', { state: { email } })}
                >
                  Já confirmei, entrar
                </button>
              </>
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
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="confirm">Confirmar senha</label>
              <input
                id="confirm"
                type="password"
                className="auth-input hud-corners-s"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="birthdate">Data de nascimento *</label>
              <input
                id="birthdate"
                type="date"
                className="auth-input hud-corners-s"
                value={birthdate}
                max={MAX_NASCIMENTO}
                onChange={(e) => setBirthdate(e.target.value)}
                autoComplete="bday"
                required
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.5, cursor: 'pointer', margin: '4px 0 0' }}>
              <input
                type="checkbox"
                checked={aceite}
                onChange={(e) => setAceite(e.target.checked)}
                style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, accentColor: '#d4a017' }}
              />
              <span>
                Li e concordo com os{' '}
                <Link to="/termos" style={{ color: 'var(--neon)' }}>Termos de Uso</Link> e a{' '}
                <Link to="/privacidade" style={{ color: 'var(--neon)' }}>Política de Privacidade</Link>.
              </span>
            </label>

            {/* CTA — receita Compartilhar (Lei dos Gémeos). O glow tem de ficar no
                wrapper: o clip-path a 45° do botão cortaria o drop-shadow. */}
            <div className="cta-gold-glow">
              <button
                type="submit"
                className="auth-cta cta-gold hud-corners"
                disabled={loading || !aceite}
              >
                {loading ? 'Criando conta…' : 'Criar conta'}
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
            Já tem conta? <Link to="/login">Entre aqui</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
