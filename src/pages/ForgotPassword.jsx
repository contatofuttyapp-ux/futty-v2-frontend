// Futty v2.0 — Recuperar password
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import FuttyLogo from '../components/FuttyLogo';
// O app.css tem de vir ANTES do auth.css: traz o vocabulário da casa
// (.hud-corners-s, .cta-gold) e o auth.css é a camada por cima.
import '../styles/app.css';
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
    setSuccess('Se existir uma conta com este e-mail, enviamos um link de recuperação.');
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
          <h1 className="auth-title">Recuperar senha</h1>
          <div className="auth-rule" aria-hidden="true" />
          <p className="auth-subtitle">
            Informe seu e-mail e enviamos um link para redefinir a senha.
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && (
              <div className="auth-alert auth-alert--error hud-corners-s">{error}</div>
            )}
            {success && (
              <div className="auth-alert auth-alert--success hud-corners-s">{success}</div>
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

            {/* CTA — receita Compartilhar (Lei dos Gémeos). O glow tem de ficar no
                wrapper: o clip-path a 45° do botão cortaria o drop-shadow. */}
            <div className="cta-gold-glow">
              <button
                type="submit"
                className="auth-cta cta-gold hud-corners"
                disabled={loading}
              >
                {loading ? 'Enviando…' : 'Enviar link de recuperação'}
              </button>
            </div>
          </form>

          <p className="auth-footer">
            Lembrou? <Link to="/login">Voltar ao login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
