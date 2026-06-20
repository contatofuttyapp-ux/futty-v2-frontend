// Futty v2.0 — Registo (email/password)
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import GoogleIcon from '../components/GoogleIcon';
import FuttyLogo from '../components/FuttyLogo';
import '../styles/auth.css';

// Máximo permitido: ontem (não permite hoje nem datas futuras).
const MAX_NASCIMENTO = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

export default function Register() {
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
        emailRedirectTo: `${window.location.origin}/home`,
        data: { birthdate }, // guardado em user_metadata; o backend persiste em users.birthdate
      },
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Se a confirmação por email estiver ativa, não há sessão imediata
    if (data.user && !data.session) {
      setSuccess('Conta criada! Confirma o teu email para ativar a conta.');
    } else {
      setSuccess('Conta criada com sucesso!');
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
          <div className="auth-brand">
<FuttyLogo variant="wordmark" size={28} color="#8b5cf6" />
          </div>
          <h1 className="auth-title">Cria a tua conta</h1>
          <p className="auth-subtitle">Junta-te ao Futty em segundos.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-alert auth-alert--error">{error}</div>}
            {success && (
              <div className="auth-alert auth-alert--success">{success}</div>
            )}

            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="auth-input"
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
                className="auth-input"
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
                className="auth-input"
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
                className="auth-input"
                value={birthdate}
                max={MAX_NASCIMENTO}
                onChange={(e) => setBirthdate(e.target.value)}
                autoComplete="bday"
                required
              />
            </div>

            <button
              type="submit"
              className="auth-btn auth-btn--primary"
              disabled={loading}
            >
              {loading ? 'Criando conta…' : 'Criar conta'}
            </button>
          </form>

          <div className="auth-divider">ou</div>

          <button
            type="button"
            className="auth-btn auth-btn--google"
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
