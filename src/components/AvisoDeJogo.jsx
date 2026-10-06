// Futty v2.0 — O aviso do topo do Início para o jogo que espera resposta. A pessoa abre o app para
// responder "vou ou não vou": o próximo jogo com presença aberta e sem resposta sobe para o topo, com os
// botões ali mesmo.
// Os botões chamam a MESMA função dos cards dos Próximos jogos (`onPresence(idDoJogo, vou)`); este
// componente só desenha.
// Dia e hora no relógio do campo (utils/dataHora.js), com o rabicho da cidade do time quando a pessoa está
// noutro relógio.
import EscudoEquipa from './EscudoEquipa';
import { formatarDataHora } from '../utils/dataHora';
import { plural } from '../utils/plural';

const RAJ = "'Rajdhani', sans-serif";

/**
 * @param {object} props
 * @param {object} props.game    o jogo do Início ({ id, date, fuso, team_name, … })
 * @param {object} [props.team]  o time (escudo e cidade); sem ele o escudo nasce do nome do jogo
 * @param {number} [props.mais]  quantos outros jogos também esperam resposta (o "+N" discreto)
 * @param {boolean} [props.busy] resposta em curso: os botões ficam apagados
 * @param {(idDoJogo: string, vou: boolean) => void} props.onPresence
 */
export default function AvisoDeJogo({ game, team = null, mais = 0, busy = false, onPresence }) {
  const quando = game.date ? formatarDataHora(game.date, game.fuso, { cidade: team?.cidade }) : 'Data a definir';
  const nomeDoTime = game.team_name || team?.nome || '';
  return (
    <div
      className="hud-corners"
      data-aviso="jogo"
      data-aviso-jogo={game.id}
      style={{ display: 'grid', gap: 10, padding: '12px 14px', marginBottom: 12, background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.45)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <EscudoEquipa team={team || { nome: nomeDoTime }} size={36} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span data-aviso-quando style={{ display: 'block', fontFamily: RAJ, fontWeight: 800, fontSize: 15, lineHeight: 1.2, color: '#f0c94a' }}>{quando}</span>
          {nomeDoTime ? (
            <span data-nome-do-time style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', overflowWrap: 'anywhere' }}>{nomeDoTime}</span>
          ) : null}
        </span>
        {mais > 0 ? (
          <span
            data-aviso-mais
            title={`Mais ${mais} ${plural(mais, 'jogo espera', 'jogos esperam')} sua resposta`}
            aria-label={`Mais ${mais} ${plural(mais, 'jogo espera', 'jogos esperam')} sua resposta`}
            style={{ flexShrink: 0, alignSelf: 'flex-start', fontFamily: RAJ, fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', color: 'var(--text-dim)', border: '1px solid rgba(255,255,255,0.18)', padding: '1px 7px', borderRadius: 2 }}
          >
            +{mais}
          </span>
        ) : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ flexShrink: 0, fontFamily: RAJ, fontWeight: 700, fontSize: 15, color: '#fff', marginRight: 2 }}>Você vai?</span>
        <button type="button" data-aviso-vou className="pbtn pbtn--go hud-corners-s" style={{ minHeight: 44 }} disabled={busy} onClick={() => onPresence(game.id, true)}>
          Vou
        </button>
        <button type="button" data-aviso-nao-vou className="pbtn pbtn--no hud-corners-s" style={{ minHeight: 44 }} disabled={busy} onClick={() => onPresence(game.id, false)}>
          Não vou
        </button>
      </div>
    </div>
  );
}
