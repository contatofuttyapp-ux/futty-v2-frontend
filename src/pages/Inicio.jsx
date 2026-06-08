// Futty v2.0 — Início: avatar, chips de equipas, próximos jogos e publicidade.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { useTeams } from '../hooks/useTeam';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { formatDateTime, formatRating } from '../utils/format';
import PlayerCard from '../components/PlayerCard';
import TeamAvatar from '../components/TeamAvatar';
import FuttyLogo from '../components/FuttyLogo';
import ProductTour from '../components/ProductTour';
import Loading from '../components/Loading';
import SorteioOverlay from '../components/SorteioOverlay';
import AdCard from '../components/AdCard';
import '../styles/app.css';

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

// ----- Card de jogo -----
function GameCard({ game, busy, isNext, onPresence, onVerSorteio, index = 0 }) {
  const today = isToday(game.date);
  const isPast = game.status === 'finished';
  const isDrawn = game.status === 'drawn';
  const going = game.user_status === 'going';
  const notGoing = game.user_status === 'not_going';

  return (
    <div
      className={`gcard anim-slide-in ${isPast ? 'gcard--past' : ''} ${isNext ? 'gcard--next' : ''}`}
      style={{ animationDelay: `${index * 0.08}s` }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
        const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
        e.currentTarget.style.transform = `perspective(800px) translateY(-4px) scale(1.01) rotateX(${-dy * 3}deg) rotateY(${dx * 3}deg)`;
        e.currentTarget.style.transition = 'none';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.5), 0 0 20px rgba(212,160,23,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.transition = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
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
            className={`pbtn pbtn--go ${going ? 'active' : ''} ${!going && !busy ? 'pulse-active tab-shine' : ''}`}
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

  const [games, setGames] = useState(null); // null = a carregar
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [jogoSorteio, setJogoSorteio] = useState(null); // jogo a mostrar no overlay

  // Notificações push: banner discreto (uma vez por sessão).
  const { estado: pushEstado, subscrever: pushSubscrever } = usePushNotifications();
  const [pushBannerFechado, setPushBannerFechado] = useState(() => sessionStorage.getItem('futty_push_dismiss') === '1');
  function fecharPushBanner() {
    setPushBannerFechado(true);
    sessionStorage.setItem('futty_push_dismiss', '1');
  }

  // Onboarding (product tour) — só na primeira vez.
  const [tourDone, setTourDone] = useState(() => !!localStorage.getItem('futty_tour_done'));

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
  // Cor do frame escolhida na Figurinha (aplica-se ao card e à aura).
  const corFrame = user?.cor_frame || 'dourado';

  // Proteção de layout para o nome (tamanho/espaçamento conforme o comprimento).
  const nomeLen = nome?.length || 0;
  const nomeComposto = (nome || '').trim().includes(' ') && nomeLen > 12;
  const nomeFontSize = nomeComposto ? 18 : nomeLen <= 10 ? 26 : nomeLen <= 15 ? 20 : 16;
  const nomeSpacing = nomeLen <= 10 ? '0.28em' : nomeLen <= 15 ? '0.16em' : '0.08em';

  const loadingGames = games === null;
  const filtered = (games || []).filter((g) => selectedTeam === 'all' || g.team_id === selectedTeam);
  // Próximo jogo = o primeiro que não está encerrado (lista vem ordenada por data).
  const nextId = filtered.find((g) => g.status !== 'finished')?.id ?? null;

  // Anúncio nativo: a seguir ao 2º jogo; se houver ≤1 jogo, no fim.
  const items = [];
  filtered.forEach((g, i) => {
    items.push({ type: 'game', game: g });
    if (i === 1) items.push({ type: 'ad', key: 'ad-inicio' });
  });
  if (filtered.length <= 1) items.push({ type: 'ad', key: 'ad-inicio' });

  const noTeams = !teamsLoading && teams.length === 0;

  return (
    <div className="app-shell">
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
        {/* Header: logo FUT. (esquerda) + Início (direita). Sem Topbar. */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
          <FuttyLogo size="lg" />
          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Início
          </span>
        </div>

        {/* Banner discreto para ativar notificações push */}
        {pushEstado === 'suportado' && !pushBannerFechado ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginBottom: 12, borderRadius: 12, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <span style={{ flex: 1, fontSize: 13, color: '#fff' }}>🔔 Ativar notificações para não perderes nenhum jogo</span>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => pushSubscrever()}>Ativar</button>
            <button type="button" aria-label="Fechar" onClick={fecharPushBanner} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
          </div>
        ) : null}

        {/* Zona do card premium */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, margin: '8px 0 18px' }}>
          <div className="inicio-vline" aria-hidden="true" />
          <div data-tour="player-card" style={{ width: '70%', maxWidth: 280 }}>
            <PlayerCard jogador={{ ...(user || { nome }), avatar_url: avatarParaMostrar }} stats={stats} equipa={teams[0] || null} mostrarNome={false} corFrame={corFrame} cantos={false} />
          </div>
          {/* Nome por baixo do card — gradiente dourado + linhas decorativas */}
          {nomeComposto ? (
            // Nome composto e longo: quebra em 2 linhas, sem linhas decorativas.
            <div
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: 18,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: nomeSpacing,
                background: 'linear-gradient(90deg, #d4a017 0%, #fff 40%, #f5e070 60%, #d4a017 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: 'none',
                maxWidth: '85%',
                textAlign: 'center',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                lineHeight: 1.1,
              }}
            >
              {nome}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '85%', maxWidth: 280 }}>
              {/* Linha esquerda: espelho da direita — shimmer invertido (só a 2ª animação). */}
              <div style={{ flex: 1, height: 2, borderRadius: 1, background: 'linear-gradient(90deg, rgba(212,160,23,0.6), rgba(245,224,112,0.9), rgba(212,160,23,0.6), rgba(139,101,8,0.4), rgba(212,160,23,0.6))', backgroundSize: '300% 100%', animation: 'lineReveal 2.0s cubic-bezier(0.34,1.56,0.64,1) both, lineShimmer 6.6s linear infinite 0.8s', animationDirection: 'normal, reverse' }} />
              <div
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: nomeFontSize,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: nomeSpacing,
                  background: 'linear-gradient(90deg, #d4a017 0%, #fff 40%, #f5e070 60%, #d4a017 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: 'none',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.1,
                }}
              >
                {nome}
              </div>
              <div style={{ flex: 1, height: 2, borderRadius: 1, background: 'linear-gradient(90deg, rgba(212,160,23,0.6), rgba(245,224,112,0.9), rgba(212,160,23,0.6), rgba(139,101,8,0.4), rgba(212,160,23,0.6))', backgroundSize: '300% 100%', animation: 'lineReveal 2.0s cubic-bezier(0.34,1.56,0.64,1) both, lineShimmer 6.6s linear infinite 0.8s' }} />
            </div>
          )}
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
                className={`chip ${selectedTeam === 'all' ? 'chip--active tab-shine' : ''}`}
                onClick={() => setSelectedTeam('all')}
              >
                Todas
              </button>
              {teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`chip ${selectedTeam === t.id ? 'chip--active tab-shine' : ''}`}
                  onClick={() => setSelectedTeam(t.id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <TeamAvatar team={t} size="sm" />
                  {t.nome}
                </button>
              ))}
              <Link to="/explorar" className="chip chip--explore">
                ＋ Explorar
              </Link>
            </div>

            {/* Jogos */}
            <div data-tour="jogos-section">
              <div className="games-label">Próximos Jogos</div>
            {loadingGames ? (
              <Loading text="A carregar jogos…" />
            ) : (
              <>
                {filtered.length === 0 && <p className="muted">Sem jogos para mostrar.</p>}
                {items.map((item, i) =>
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
                      index={i}
                    />
                  )
                )}
              </>
            )}
            </div>
          </>
        )}
      </main>

      {/* Overlay do sorteio */}
      <SorteioOverlay jogo={jogoSorteio} onClose={() => setJogoSorteio(null)} />

      {/* Onboarding (primeira visita) */}
      {!tourDone && (
        <ProductTour
          onDone={() => {
            localStorage.setItem('futty_tour_done', '1');
            setTourDone(true);
          }}
        />
      )}
    </div>
  );
}
