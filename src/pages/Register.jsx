// Futty v2.0 — Registo (email/password)
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import GoogleIcon from '../components/GoogleIcon';
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

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
      setSuccess('Conta criada! Confirma o teu email — depois preparamos o teu perfil (leva 30s).');
    } else {
      // Sessão imediata → onboarding dia-1.
      navigate('/onboarding', { replace: true });
    }
  }

  async function handleGoogle() {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/home` },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-card__inner">
          {/* Header do cânone: marca + título dourado seco + linha com degrau 45°.
              Nas páginas de auth marca e título coexistem — esta é a porta da rua. */}
          <div className="auth-brand">
            <FuttyLogo variant="wordmark" size={20} color="#d4a017" />
          </div>
          <h1 className="auth-title">Cria a tua conta</h1>
          <div className="auth-rule" aria-hidden="true" />
          <p className="auth-subtitle">Junta-te ao Futty em segundos.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && (
              <div className="auth-alert auth-alert--error hud-corners-s">{error}</div>
            )}
            {success && (
              <div className="auth-alert auth-alert--success hud-corners-s">{success}</div>
            )}

            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="auth-input hud-corners-s"
                placeholder="tu@email.com"
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

            {/* CTA — receita Compartilhar (Lei dos Gémeos). O glow tem de ficar no
                wrapper: o clip-path a 45° do botão cortaria o drop-shadow. */}
            <div className="cta-gold-glow">
              <button
                type="submit"
                className="auth-cta cta-gold hud-corners"
                disabled={loading}
              >
                {loading ? 'Criando conta…' : 'Criar conta'}
              </button>
            </div>
          </form>

          <div className="auth-divider">ou</div>

          <button
            type="button"
            className="auth-btn auth-btn--google hud-corners-s"
            onClick={handleGoogle}
          >
            <GoogleIcon />
            Continuar com Google
          </button>

          <p className="auth-footer">
            Já tens conta? <Link to="/login">Entra aqui</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
