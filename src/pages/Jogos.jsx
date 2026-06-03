// Futty v2.0 — Lista de jogos da equipa
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { diaMes, formatDataHora, STATUS_LABEL } from '../lib/format';
import Topbar from '../components/Topbar';
import '../styles/app.css';

export default function Jogos() {
  const { slug } = useParams();
  const [team, setTeam] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiFetch(`/api/teams/${slug}/games`)
      .then((data) => {
        if (!active) return;
        setTeam(data.team);
        setGames(data.games || []);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const isAdmin = team?.role === 'admin';

  return (
    <div className="app-shell">
      <Topbar />
      <main className="app-main">
        <Link to={`/equipa/${slug}`} className="back-link">
          ← {team?.nome || 'Equipa'}
        </Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h1 className="app-page-title" style={{ marginBottom: 0 }}>
            Jogos
          </h1>
          {isAdmin && (
            <Link to={`/equipa/${slug}/jogo/novo`} className="btn btn--primary btn--sm">
              + Criar jogo
            </Link>
          )}
        </div>

        {error && <div className="alert alert--error" style={{ marginTop: 16 }}>{error}</div>}

        {loading ? (
          <p className="muted" style={{ marginTop: 16 }}>A carregar jogos…</p>
        ) : games.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 20 }}>
            <div className="empty-state__emoji">📅</div>
            <h2>Ainda não há jogos</h2>
            <p className="muted">
              {isAdmin ? 'Cria o primeiro jogo da equipa.' : 'Aguarda que um admin agende um jogo.'}
            </p>
            {isAdmin && (
              <div className="empty-state__actions">
                <Link to={`/equipa/${slug}/jogo/novo`} className="btn btn--primary">
                  + Criar jogo
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="game-list">
            {games.map((g) => {
              const { dia, mes } = diaMes(g.data);
              return (
                <Link key={g.id} to={`/equipa/${slug}/jogo/${g.id}`} className="game-card">
                  <div className="game-card__date">
                    <div className="game-card__day">{dia}</div>
                    <div className="game-card__month">{mes}</div>
                  </div>
                  <div className="game-card__main">
                    <div className="game-card__title">{g.local || 'Jogo'}</div>
                    <div className="game-card__sub">
                      {formatDataHora(g.data)} · {g.confirmados} confirmados · {g.num_times} times
                    </div>
                  </div>
                  <span className={`badge badge--${g.status}`}>
                    {STATUS_LABEL[g.status] || g.status}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
