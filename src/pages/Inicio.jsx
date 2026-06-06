// Futty v2.0 — Início: avatar, chips de equipas, próximos jogos e publicidade.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { useTeams } from '../hooks/useTeam';
import { formatDateTime, formatRating } from '../utils/format';
import PlayerCard from '../components/PlayerCard';
import Loading from '../components/Loading';
import SorteioOverlay from '../components/SorteioOverlay';
import '../styles/app.css';

const ADS_ENABLED = true;
const ADS_VIDEO_URL = '/ads/promo.mp4';
const ADS_EVERY = 3;

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

// ----- Card de publicidade (vídeo com fallback para placeholder) -----
function AdCard() {
  const [failed, setFailed] = useState(false);
  return (
    <div className="ad-card">
      <span className="ad-card__badge">Publicidade</span>
      {failed ? (
        <div className="ad-card__text">Espaço publicitário</div>
      ) : (
        <video
          className="ad-card__video"
          src={ADS_VIDEO_URL}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

// ----- Card de jogo -----
function GameCard({ game, busy, isNext, onPresence, onVerSorteio }) {
  const today = isToday(game.date);
  const isPast = game.status === 'finished';
  const isDrawn = game.status === 'drawn';
  const going = game.user_status === 'going';
  const notGoing = game.user_status === 'not_going';

  return (
    <div className={`gcard ${isPast ? 'gcard--past' : ''} ${isNext ? 'gcard--next' : ''}`}>
      {isNext ? <div className="gcard__next-badge">PRÓXIMO</div> : null}
      <div className="gcard__top">
        <span className="gcard__title">{game.name}</span>
        {game.team_name && <span className="gcard__team">{game.team_name}</span>}
      </div>

      <div className="gcard__meta">
        <span className={`gcard__date ${today ? 'gcard__date--today' : ''}`}>
          {game.date ? formatDateTime(game.date) : 'Data por definir'}
        </span>
        {` · ${game.confirmed_count} confirmados`}
      </div>

      {isPast ? (
        <div className="gcard__drawn">
          <span className="badge badge--encerrado">Encerrado</span>
          {going && <span className="muted" style={{ fontSize: 13 }}>Estiveste presente</span>}
        </div>
      ) : isDrawn ? (
        <div className="gcard__drawn">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge badge--sorteado">Sorteado</span>
            <span className="muted" style={{ fontSize: 13 }}>
              {going ? 'Vais jogar' : notGoing ? 'Não vais' : 'Sem resposta'}
            </span>
          </span>
          <button type="button" className="btn btn--purple btn--sm" onClick={() => onVerSorteio(game)}>
            Ver sorteio
          </button>
        </div>
      ) : (
        <div className="gcard__presence">
          <button
            type="button"
            className={`pbtn pbtn--go ${going ? 'active' : ''}`}
            disabled={busy}
            onClick={() => onPresence(game.id, true)}
          >
            Vou
          </button>
          <button
            type="button"
            className={`pbtn pbtn--no ${notGoing ? 'active' : ''}`}
            disabled={busy}
            onClick={() => onPresence(game.id, false)}
          >
            Não vou
          </button>
        </div>
      )}
    </div>
  );
}

// ----- Estado vazio (sem equipas) -----
function EmptyState() {
  return (
    <div className="home-empty">
      <h2 style={{ fontSize: 20 }}>Bem-vindo ao Futty.</h2>
      <p className="muted" style={{ marginTop: 6 }}>Começa por aqui.</p>
      <div className="home-empty__actions">
        <Link to="/criar-equipa" className="btn btn--primary">
          ＋ Criar a minha equipa
        </Link>
        <Link to="/explorar" className="btn btn--purple">
          🗺️ Explorar peladas
        </Link>
        <Link to="/figurinha" className="btn btn--purple-outline">
          ⭐ Criar a minha figurinha
        </Link>
      </div>
    </div>
  );
}

export default function Inicio() {
  const { data: me } = useApi('/api/me');
  const { teams, loading: teamsLoading } = useTeams();
  const navigate = useNavigate();

  const [games, setGames] = useState(null); // null = a carregar
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [jogoSorteio, setJogoSorteio] = useState(null); // jogo a mostrar no overlay

  // "Ver sorteio": busca o jogo completo (my-invites não traz times_resultado) e abre o overlay.
  async function verSorteio(game) {
    try {
      const res = await apiFetch(`/api/games/${game.id}`);
      setJogoSorteio(res?.game || null);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    let active = true;
    apiFetch('/api/games/my-invites')
      .then((d) => active && setGames(d.games || []))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, []);

  // Presença com optimistic update + chamada à API.
  async function onPresence(gameId, going) {
    setError('');
    setBusyId(gameId);
    setGames((prev) =>
      (prev || []).map((g) => {
        if (g.id !== gameId) return g;
        let count = g.confirmed_count;
        if (going && g.user_status !== 'going') count += 1;
        if (!going && g.user_status === 'going') count -= 1;
        return { ...g, user_status: going ? 'going' : 'not_going', confirmed_count: Math.max(0, count) };
      })
    );
    try {
      await apiFetch(`/api/games/${gameId}/confirmar`, {
        method: 'POST',
        body: JSON.stringify({ confirmado: going }),
      });
    } catch (err) {
      setError(err.message);
      const fresh = await apiFetch('/api/games/my-invites').catch(() => null);
      if (fresh) setGames(fresh.games || []);
    } finally {
      setBusyId(null);
    }
  }

  const user = me?.user;
  const stats = me?.stats;
  const nome = user?.nome || user?.email?.split('@')[0] || 'Jogador';
  // Fallback premium: se o utilizador ainda não tem avatar, mostra o Jefin (demo).
  const avatarParaMostrar = user?.avatar_url || '/avatares/verde/Jefin.png';

  const loadingGames = games === null;
  const filtered = (games || []).filter((g) => selectedTeam === 'all' || g.team_id === selectedTeam);
  // Próximo jogo = o primeiro que não está encerrado (lista vem ordenada por data).
  const nextId = filtered.find((g) => g.status !== 'finished')?.id ?? null;

  // Intercalar publicidade a cada 3 jogos (só se ativada). Se desativada,
  // não há cards de publicidade e o layout fecha de forma natural.
  const items = [];
  filtered.forEach((g, i) => {
    items.push({ type: 'game', game: g });
    if (ADS_ENABLED && (i + 1) % ADS_EVERY === 0) items.push({ type: 'ad', key: `ad-${g.id}` });
  });

  const noTeams = !teamsLoading && teams.length === 0;

  return (
    <div className="app-shell">
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
        {/* Logo (esta página não tem Topbar) */}
        <div style={{ marginBottom: 14 }}>
          <span className="app-brand">FUT<span className="app-brand__dot">.</span></span>
        </div>
        <h1
          className="app-page-title font-premium"
          style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}
        >
          Início
        </h1>
        <p
          className="app-page-sub"
          style={{ marginBottom: 12, fontSize: 12, color: '#333', letterSpacing: '0.08em', textTransform: 'uppercase' }}
        >
          O teu resumo do Futty
        </p>

        {/* Zona do card premium */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, margin: '8px 0 18px' }}>
          <div style={{ width: '75%', maxWidth: 300 }}>
            <PlayerCard jogador={{ ...(user || { nome }), avatar_url: avatarParaMostrar }} stats={stats} equipa={teams[0] || null} mostrarNome={false} />
          </div>
          {/* Nome por baixo do card */}
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 26,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#fff',
              textShadow: '0 0 12px rgba(0,229,160,0.8)',
              letterSpacing: '0.06em',
            }}
          >
            {nome}
          </div>
          {teams[0] ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--text-dim)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neon)' }} />
              {teams[0].nome}
            </div>
          ) : null}
          <div className="inicio-stats">
            <span className="nota">{stats ? formatRating(stats.nota) : '--'}</span>
            <span>·</span>
            <span>
              <b>{stats?.jogos ?? 0}</b> jogos
            </span>
            <span>·</span>
            <span>
              <b>{stats?.gols ?? 0}</b> gols
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/figurinha')}
            style={{ background: 'transparent', border: '1px solid var(--purple)', color: '#b69cff', borderRadius: 20, padding: '6px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >
            ✨ Personalizar figurinha
          </button>
        </div>

        {error && <div className="alert alert--error" style={{ marginTop: 12 }}>{error}</div>}

        {noTeams ? (
          <EmptyState />
        ) : (
          <>
            {/* Chips de equipas */}
            <div className="chips-row">
              <button
                type="button"
                className={`chip ${selectedTeam === 'all' ? 'chip--active' : ''}`}
                onClick={() => setSelectedTeam('all')}
              >
                Todas
              </button>
              {teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`chip ${selectedTeam === t.id ? 'chip--active' : ''}`}
                  onClick={() => setSelectedTeam(t.id)}
                >
                  {t.nome}
                </button>
              ))}
              <Link to="/explorar" className="chip chip--explore">
                ＋ Explorar
              </Link>
            </div>

            {/* Jogos */}
            <div className="games-label">Próximos Jogos</div>
            {loadingGames ? (
              <Loading text="A carregar jogos…" />
            ) : filtered.length === 0 ? (
              <p className="muted">Sem jogos para mostrar.</p>
            ) : (
              items.map((item) =>
                item.type === 'ad' ? (
                  <AdCard key={item.key} />
                ) : (
                  <GameCard
                    key={item.game.id}
                    game={item.game}
                    busy={busyId === item.game.id}
                    isNext={item.game.id === nextId}
                    onPresence={onPresence}
                    onVerSorteio={verSorteio}
                  />
                )
              )
            )}
          </>
        )}
      </main>

      {/* Overlay do sorteio */}
      <SorteioOverlay jogo={jogoSorteio} onClose={() => setJogoSorteio(null)} />
    </div>
  );
}
