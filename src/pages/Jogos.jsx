// Futty v2.0 — Lista de jogos da equipa
import { Link, useParams } from 'react-router-dom';
import { useTeamGames } from '../hooks/useTeam';
import { dayMonth, formatDateTime, STATUS_LABELS } from '../utils/format';
import Topbar from '../components/Topbar';
import Loading from '../components/Loading';
import '../styles/app.css';

export default function Jogos() {
  const { slug } = useParams();
  const { team, games, loading, error } = useTeamGames(slug);
  const isAdmin = team?.role === 'admin';

  return (
    <div className="app-shell">
      <Topbar />
      <main className="app-main">
        <Link to={`/equipa/${slug}`} className="back-link">
          ← {team?.nome || 'Time'}
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
          <div style={{ marginTop: 16 }}>
            <Loading text="Carregando jogos…" />
          </div>
        ) : games.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 20 }}>
            <div className="empty-state__emoji">📅</div>
            <h2>Ainda não há jogos</h2>
            <p className="muted">
              {isAdmin ? 'Cria o primeiro jogo do time.' : 'Aguarda que um admin agende um jogo.'}
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
              const { day, month } = dayMonth(g.data);
              return (
                <Link key={g.id} to={`/equipa/${slug}/jogo/${g.id}`} className="game-card">
                  <div className="game-card__date">
                    <div className="game-card__day">{day}</div>
                    <div className="game-card__month">{month}</div>
                  </div>
                  <div className="game-card__main">
                    <div className="game-card__title">{g.local || 'Jogo'}</div>
                    <div className="game-card__sub">
                      {formatDateTime(g.data)} · {g.confirmados} confirmados
                      {g.jogadores_por_time ? ` · ${g.jogadores_por_time}/time` : ''}
                      {g.sorteio_realizado && g.num_times ? ` · ${g.num_times} times` : ''}
                    </div>
                  </div>
                  <span className={`badge badge--${g.status}`}>{STATUS_LABELS[g.status] || g.status}</span>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
