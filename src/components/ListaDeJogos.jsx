// Futty v2.0 — A lista de jogos do time (cards com a data em destaque dourada + estado em badge 45°). Era o corpo da página /time/:slug/jogos;
// Rodada 29I, bloco 3: é também a aba JOGOS da página do time para quem não é admin (o admin vê JogosDoAdmin, com o que se faz em cada
// jogo). Data e hora no relógio do time, com o rabicho "· horário de <cidade>" para quem está noutro relógio.
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { dayMonth, formatDateTime, STATUS_LABELS } from '../utils/format';
import { plural } from '../utils/plural';

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

export default function ListaDeJogos({ slug, team, games, vazio = 'Espere um admin agendar um jogo.' }) {
  if (!games.length) {
    return (
      <div style={{ ...VIDRO, clipPath: CLIP, textAlign: 'center', padding: '30px 16px' }}>
        <Icon name="bola" size={40} />
        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 16, marginTop: 10 }}>Ainda não há jogos</div>
        <p className="muted" style={{ fontSize: 13, margin: '6px 0 0' }}>{vazio}</p>
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {games.map((g) => {
        const { day, month } = dayMonth(g.data, team?.fuso); // 29I: a data é a do time (fuso do time)
        const apagado = g.status === 'encerrado' || g.status === 'cancelado';
        return (
          <Link key={g.id} to={`/time/${slug}/jogo/${g.id}`} style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 12, padding: 12, textDecoration: 'none', color: 'inherit', opacity: apagado ? 0.75 : 1 }}>
            <div style={{ display: 'grid', placeItems: 'center', width: 52, height: 56, flexShrink: 0, background: 'rgba(212,160,23,0.10)', border: '1px solid rgba(212,160,23,0.45)', clipPath: CLIP_S }}>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 20, color: '#f0c94a', lineHeight: 1 }}>{day}</div>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, color: '#c9a24a', textTransform: 'uppercase' }}>{month}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 15 }}>{g.local || 'Jogo'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                {formatDateTime(g.data, team?.fuso, { cidade: team?.cidade })} · {g.confirmados} {plural(g.confirmados, 'confirmado', 'confirmados')}
                {g.jogadores_por_time ? ` · ${g.jogadores_por_time}/time` : ''}
                {g.sorteio_realizado && g.num_times ? ` · ${g.num_times} times` : ''}
              </div>
            </div>
            <BadgeStatus status={g.status} />
          </Link>
        );
      })}
    </div>
  );
}
