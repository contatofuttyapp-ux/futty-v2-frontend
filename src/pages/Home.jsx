// Futty v2.0 — Home: lista de equipas do utilizador
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTeams } from '../hooks/useTeam';
import { colorOf, initials } from '../utils/teamColors';
import Topbar from '../components/Topbar';
import Loading from '../components/Loading';
import '../styles/app.css';

// Formulário para entrar numa equipa a partir de um link de convite.
function JoinForm({ value, onChange, onSubmit, style }) {
  return (
    <form className="invite-link" style={style} onSubmit={onSubmit}>
      <input
        className="input"
        placeholder="Cola aqui o link de convite"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="submit" className="btn btn--ghost btn--sm">
        Ir
      </button>
    </form>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { teams, loading, error } = useTeams();
  const [showJoin, setShowJoin] = useState(false);
  const [inviteLink, setInviteLink] = useState('');

  // Extrai o slug de um link de convite e navega para a equipa.
  function handleJoin(e) {
    e.preventDefault();
    const match = inviteLink.trim().match(/equipa\/([a-z0-9-]+)/i);
    const slug = match ? match[1] : inviteLink.trim();
    if (slug) navigate(`/equipa/${slug}`);
  }

  return (
    <div className="app-shell">
      <Topbar />
      <main className="app-main">
        <h1 className="app-page-title">As tuas equipas</h1>
        <p className="app-page-sub">Gere as tuas equipas ou cria uma nova.</p>

        {error && <div className="alert alert--error">{error}</div>}

        {loading ? (
          <Loading text="A carregar equipas…" />
        ) : teams.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__emoji">⚽</div>
            <h2>Ainda não tens equipas</h2>
            <p className="muted">Cria a tua primeira equipa ou entra numa com um convite.</p>
            <div className="empty-state__actions">
              <Link to="/criar-equipa" className="btn btn--primary">
                + Criar equipa
              </Link>
              <button type="button" className="btn btn--purple" onClick={() => setShowJoin((v) => !v)}>
                Entrar numa equipa
              </button>
            </div>
            {showJoin && (
              <JoinForm
                value={inviteLink}
                onChange={setInviteLink}
                onSubmit={handleJoin}
                style={{ maxWidth: 420, margin: '20px auto 0' }}
              />
            )}
          </div>
        ) : (
          <>
            <div className="team-grid">
              {teams.map((team) => {
                const c = colorOf(team.cor);
                return (
                  <Link key={team.id} to={`/equipa/${team.slug}`} className="team-card">
                    <div className="team-avatar" style={{ background: c.hex, color: c.text }}>
                      {initials(team.nome)}
                    </div>
                    <div>
                      <div className="team-card__name">{team.nome}</div>
                      <div className="team-card__role">{team.role}</div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="empty-state__actions" style={{ justifyContent: 'flex-start', marginTop: 28 }}>
              <Link to="/criar-equipa" className="btn btn--primary">
                + Criar equipa
              </Link>
              <button type="button" className="btn btn--purple" onClick={() => setShowJoin((v) => !v)}>
                Entrar numa equipa
              </button>
            </div>
            {showJoin && (
              <JoinForm
                value={inviteLink}
                onChange={setInviteLink}
                onSubmit={handleJoin}
                style={{ maxWidth: 420, marginTop: 16 }}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
