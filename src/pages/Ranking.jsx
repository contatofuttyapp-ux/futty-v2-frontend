// Futty v2.0 — Ranking da equipa por média de notas recebidas
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { initials } from '../lib/teamColors';
import Topbar from '../components/Topbar';
import '../styles/app.css';

const MEDALHAS = ['🥇', '🥈', '🥉'];

export default function Ranking() {
  const { slug } = useParams();
  const [team, setTeam] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiFetch(`/api/teams/${slug}/ranking`)
      .then((data) => {
        if (!active) return;
        setTeam(data.team);
        setRanking(data.ranking || []);
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

  return (
    <div className="app-shell">
      <Topbar />
      <main className="app-main">
        <Link to={`/equipa/${slug}`} className="back-link">
          ← {team?.nome || 'Equipa'}
        </Link>

        <h1 className="app-page-title">Ranking</h1>
        <p className="app-page-sub">Jogadores por média de avaliações recebidas.</p>

        {error && <div className="alert alert--error">{error}</div>}

        {loading ? (
          <p className="muted">A carregar ranking…</p>
        ) : ranking.length === 0 ? (
          <p className="muted">Ainda não há jogadores.</p>
        ) : (
          <div className="rank-list">
            {ranking.map((p, i) => {
              const temVotos = p.rating !== null;
              return (
                <div className={`rank-row ${temVotos && i < 3 ? 'rank-row--top' : ''}`} key={p.user_id}>
                  <div className="rank-pos">{temVotos && i < 3 ? MEDALHAS[i] : i + 1}</div>
                  <div className="member-avatar">{initials(p.nome) || '?'}</div>
                  <div className="rank-info">
                    <div className="rank-name">{p.nome}</div>
                    <div className="rank-votes">
                      {p.votos} {p.votos === 1 ? 'voto' : 'votos'}
                    </div>
                  </div>
                  {temVotos ? (
                    <div className="rank-score">★ {p.rating}</div>
                  ) : (
                    <div className="rank-score--none">sem votos</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
