// Futty v2.0 — Lista de jogos da equipa (cânone, transversal lote 1).
// Cards com data-hero 45° dourada + status em badge 45°; vidro; topbar HUD.
import Icon from '../components/Icon';
import { Link, useParams } from 'react-router-dom';
import { useTeamGames } from '../hooks/useTeam';
import { dayMonth, formatDateTime, STATUS_LABELS } from '../utils/format';
import Topbar from '../components/Topbar';
import LoadingFutty from '../components/LoadingFutty';
import '../styles/app.css';

const VIDRO = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' };
const CLIP = 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)';
const CLIP_S = 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)';

// Cores dos estados (família dos badges do cânone).
const ST_COR = {
  agendado: { c: '#8ab4ff', b: 'rgba(138,180,255,0.5)', bg: 'rgba(138,180,255,0.08)' },
  em_curso: { c: '#7bd88f', b: 'rgba(123,216,143,0.5)', bg: 'rgba(123,216,143,0.08)' },
  encerrado: { c: 'rgba(255,255,255,0.72)', b: 'rgba(255,255,255,0.2)', bg: 'rgba(255,255,255,0.04)' },
  cancelado: { c: '#fda4af', b: 'rgba(248,113,113,0.45)', bg: 'rgba(248,113,113,0.06)' },
};

function BadgeStatus({ status }) {
  const s = ST_COR[status] || ST_COR.encerrado;
  return (
    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 9px', clipPath: CLIP_S, flexShrink: 0, color: s.c, border: `1px solid ${s.b}`, background: s.bg }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function Jogos() {
  const { slug } = useParams();
  const { team, games, loading, error } = useTeamGames(slug);
  const isAdmin = team?.role === 'admin';

  return (
    <div className="app-shell">
      <Topbar hud="JOGOS" back={`/equipa/${slug}`} />
      <main className="app-main page-reveal">
        {isAdmin && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <Link to={`/equipa/${slug}/jogo/novo`} className="btn btn--sm hud-corners-s cta-gold" style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>
              + Novo jogo
            </Link>
          </div>
        )}

        {error && <div className="alert alert--error" style={{ marginTop: 4 }}>{error}</div>}

        {loading ? (
          <LoadingFutty />
        ) : games.length === 0 ? (
          <div style={{ ...VIDRO, clipPath: CLIP, textAlign: 'center', padding: '30px 16px', marginTop: 8 }}>
            <Icon name="bola" size={40} />
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 16, marginTop: 10 }}>Ainda não há jogos</div>
            <p className="muted" style={{ fontSize: 13, margin: '6px 0 14px' }}>
              {isAdmin ? 'Marque o primeiro e chame o time.' : 'Espere um admin agendar um jogo.'}
            </p>
            {isAdmin && (
              <Link to={`/equipa/${slug}/jogo/novo`} className="btn hud-corners-s cta-gold" style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>
                + Novo jogo
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {games.map((g) => {
              const { day, month } = dayMonth(g.data);
              const apagado = g.status === 'encerrado' || g.status === 'cancelado';
              return (
                <Link key={g.id} to={`/equipa/${slug}/jogo/${g.id}`} style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 12, padding: 12, textDecoration: 'none', color: 'inherit', opacity: apagado ? 0.75 : 1 }}>
                  <div style={{ display: 'grid', placeItems: 'center', width: 52, height: 56, flexShrink: 0, background: 'rgba(212,160,23,0.10)', border: '1px solid rgba(212,160,23,0.45)', clipPath: CLIP_S }}>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 20, color: '#f0c94a', lineHeight: 1 }}>{day}</div>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, color: '#c9a24a', textTransform: 'uppercase' }}>{month}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 15 }}>{g.local || 'Jogo'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                      {formatDateTime(g.data)} · {g.confirmados} confirmados
                      {g.jogadores_por_time ? ` · ${g.jogadores_por_time}/time` : ''}
                      {g.sorteio_realizado && g.num_times ? ` · ${g.num_times} times` : ''}
                    </div>
                  </div>
                  <BadgeStatus status={g.status} />
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
