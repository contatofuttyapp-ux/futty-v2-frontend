// Futty v2.0 — O card "Seu time" do Início (Rodada 29I, bloco 3, item 1). Só para quem administra algum time, no topo, com a cara dos
// outros cards do Início. É o que era o Dashboard do painel do admin: as pendências, uma por linha (pedido de entrada, jogo sem
// presença aberta, resultado por lançar, denúncia), e quatro atalhos com nome — Novo jogo · Sortear · Convidar · Ajustes.
// SEMPRE aparece para o admin (decisão do dono); sem pendência fica compacto, com "Tudo tranquilo por aqui.".
// As pendências vêm prontas do motor (GET /api/inicio → seu_time); o texto e o destino de cada linha, em utils/seuTime.js.
import { Link } from 'react-router-dom';
import { CalendarClock, ChevronRight, CirclePlus, Flag, Settings, Shuffle, Trophy, UserPlus } from 'lucide-react';
import EscudoEquipa from './EscudoEquipa';
import { destinoDoSortear, linhasDePendencia } from '../utils/seuTime';

const RAJ = "'Rajdhani', sans-serif";
const ICONE = { pedidos: UserPlus, presenca: CalendarClock, resultado: Trophy, denuncias: Flag };

function Atalho({ para, Icone, rotulo }) {
  return (
    <Link to={para} data-atalho={rotulo} className="hud-corners-s" style={{ display: 'grid', justifyItems: 'center', gap: 4, padding: '8px 2px', textDecoration: 'none', color: '#c9c2d6', border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.03)' }}>
      <Icone size={18} color="#b69cff" />
      <span style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 12, letterSpacing: '0.04em' }}>{rotulo}</span>
    </Link>
  );
}

function UmTime({ time, team, games }) {
  const linhas = linhasDePendencia(time);
  const base = `/time/${time.slug}`;
  return (
    <div className="hud-corners" data-seu-time={time.slug} style={{ display: 'grid', gap: 10, padding: '12px 14px', marginBottom: 12, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.28)' }}>
      <Link to={base} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
        <EscudoEquipa team={team || { nome: time.nome }} size={36} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: RAJ, fontWeight: 700, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Seu time</span>
          <span style={{ display: 'block', fontFamily: RAJ, fontWeight: 800, fontSize: 16, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{time.nome}</span>
        </span>
        <ChevronRight size={16} color="var(--text-dim)" />
      </Link>

      {linhas.length === 0 ? (
        <span data-tudo-tranquilo style={{ fontSize: 13, color: 'var(--text-dim)' }}>Tudo tranquilo por aqui.</span>
      ) : (
        <div style={{ display: 'grid' }}>
          {linhas.map(({ chave, para, texto }, i) => {
            const Icone = ICONE[chave];
            return (
              <Link key={chave} to={para} data-pendencia={chave} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)', textDecoration: 'none', color: '#fff', fontSize: 13 }}>
                <Icone size={16} color="#f0c94a" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>{texto}</span>
                <ChevronRight size={14} color="var(--text-dim)" style={{ flexShrink: 0 }} />
              </Link>
            );
          })}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
        <Atalho para={`${base}/jogo/novo`} Icone={CirclePlus} rotulo="Novo jogo" />
        <Atalho para={destinoDoSortear(time.slug, time.team_id, games)} Icone={Shuffle} rotulo="Sortear" />
        <Atalho para={`${base}?aba=elenco&convidar=1`} Icone={UserPlus} rotulo="Convidar" />
        <Atalho para={`${base}?aba=ajustes`} Icone={Settings} rotulo="Ajustes" />
      </div>
    </div>
  );
}

/** `seuTime`: o que o motor mandou (um por time de admin); `teams`: os times da pessoa (o escudo); `games`: os jogos do Início. */
export default function CardSeuTime({ seuTime = [], teams = [], games = [] }) {
  if (!seuTime.length) return null;
  return seuTime.map((time) => (
    <UmTime key={time.team_id} time={time} team={teams.find((t) => t.id === time.team_id)} games={games} />
  ));
}
