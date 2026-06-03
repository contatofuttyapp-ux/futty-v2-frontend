// Futty v2.0 — Home: lista de equipas do utilizador
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { colorOf, initials } from '../lib/teamColors';
import Topbar from '../components/Topbar';
import '../styles/app.css';

export default function Home() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [inviteLink, setInviteLink] = useState('');

  useEffect(() => {
    let active = true;
    apiFetch('/api/teams')
      .then((data) => {
        if (active) setTeams(data.teams || []);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // "Entrar numa equipa": extrai o slug de um link de convite e navega
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
          <p className="muted">A carregar equipas…</p>
        ) : teams.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__emoji">⚽</div>
            <h2>Ainda não tens equipas</h2>
            <p className="muted">Cria a tua primeira equipa ou entra numa com um convite.</p>
            <div className="empty-state__actions">
              <Link to="/criar-equipa" className="btn btn--primary">
                + Criar equipa
              </Link>
              <button
                type="button"
                className="btn btn--purple"
                onClick={() => setShowJoin((v) => !v)}
              >
                Entrar numa equipa
              </button>
            </div>

            {showJoin && (
              <form className="invite-link" style={{ maxWidth: 420, margin: '20px auto 0' }} onSubmit={handleJoin}>
                <input
                  className="input"
                  placeholder="Cola aqui o link de convite"
                  value={inviteLink}
                  onChange={(e) => setInviteLink(e.target.value)}
                />
                <button type="submit" className="btn btn--ghost btn--sm">
                  Ir
                </button>
              </form>
            )}
          </div>
        ) : (
          <>
            <div className="team-grid">
              {teams.map((team) => {
                const c = colorOf(team.cor);
                return (
                  <Link key={team.id} to={`/equipa/${team.slug}`} className="team-card">
                    <div
                      className="team-avatar"
                      style={{ background: c.hex, color: c.text }}
                    >
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
              <button
                type="button"
                className="btn btn--purple"
                onClick={() => setShowJoin((v) => !v)}
              >
                Entrar numa equipa
              </button>
            </div>

            {showJoin && (
              <form className="invite-link" style={{ maxWidth: 420, marginTop: 16 }} onSubmit={handleJoin}>
                <input
                  className="input"
                  placeholder="Cola aqui o link de convite"
                  value={inviteLink}
                  onChange={(e) => setInviteLink(e.target.value)}
                />
                <button type="submit" className="btn btn--ghost btn--sm">
                  Ir
                </button>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
