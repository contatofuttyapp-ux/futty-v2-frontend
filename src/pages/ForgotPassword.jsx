// Futty v2.0 — Recuperar password
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import FuttyLogo from '../components/FuttyLogo';
import '../styles/auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setSuccess('Se existir uma conta com este email, enviámos um link de recuperação.');
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-card__inner">
          <div className="auth-brand">
<FuttyLogo variant="wordmark" size={28} color="#8b5cf6" />
          </div>
          <h1 className="auth-title">Recuperar senha</h1>
          <p className="auth-subtitle">
            Indica o teu email e enviamos-te um link para repor a senha.
          </p>

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

            <button
              type="submit"
              className="auth-btn auth-btn--primary"
              disabled={loading}
            >
              {loading ? 'Enviando…' : 'Enviar link de recuperação'}
            </button>
          </form>

          <p className="auth-footer">
            Lembraste-te? <Link to="/login">Voltar ao login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
