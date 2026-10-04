// Futty v2.0 — Rodada 29S, bloco A (achados 151 e 152): os times no JOGO, onde a pessoa já sabe quem confirmou.
//   · EscolhaDosTimes: "Como vão sair os times?" e dois cartões lado a lado — Sortear (dourado, a máquina) e Montar à mão (roxo, a pessoa escolhe).
//   · MontarTimesAMao: a composição à mão com quem confirmou + os convidados sem app da tela; "Salvar times" só quando cada time tem 1 jogador.
// Quem desenha só desenha: o Jogo.jsx guarda o estado, chama o sorteio e o POST /api/games/:id/times-manuais.
import { useState } from 'react';
import { Hand, Shuffle } from 'lucide-react';
import ComporTimes from './ComporTimes';
import { corpoDosTimes, nomesDosTimes, podeSalvarTimes } from '../utils/timesAMao';

const RAJ = "'Rajdhani', sans-serif";

export const PERGUNTA_DOS_TIMES = 'Como vão sair os times?';
export const AJUDA_DO_JOGO = 'Toque num time e depois em quem vai jogar nele.';
const SEM_JOGADORES = 'Sem jogadores. Confirme presenças ou escreva o nome de quem não tem o app, acima.';

const CARTAO = { flexDirection: 'column', height: 'auto', minHeight: 104, padding: '14px 10px', gap: 6, width: '100%', textAlign: 'center' };
const ROTULO = { fontFamily: RAJ, fontWeight: 800, fontSize: 17, letterSpacing: '0.06em', textTransform: 'uppercase' };
const LEGENDA = { fontFamily: 'inherit', fontWeight: 400, fontSize: 12, lineHeight: 1.35, textTransform: 'none', letterSpacing: 0, opacity: 0.85 };

/**
 * @param {object} props
 * @param {boolean} props.pulsaSortear  a regra de sempre (confirmados para dois times): o Sortear pulsa; o Montar à mão NUNCA (duas coisas pulsando não destacam nenhuma)
 * @param {boolean} props.busy          sorteio em curso: os dois ficam apagados
 * @param {() => void} props.onSortear
 * @param {() => void} props.onMontar
 */
export function EscolhaDosTimes({ pulsaSortear, busy, onSortear, onMontar }) {
  return (
    <div data-como-saem-os-times style={{ marginTop: 4 }}>
      <div data-pergunta-dos-times style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 10 }}>{PERGUNTA_DOS_TIMES}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }}>
        <span className={`cta-gold-glow ${pulsaSortear ? 'pulse-glow' : ''}`} style={{ display: 'flex' }}>
          <button type="button" data-escolha="sortear" className={`btn hud-corners cta-gold ${pulsaSortear ? 'pulse-active' : ''}`} style={CARTAO} onClick={onSortear} disabled={busy}>
            <Shuffle size={22} aria-hidden="true" />
            <span style={ROTULO}>{busy ? 'Processando…' : 'Sortear'}</span>
            <span style={LEGENDA}>O app sorteia com quem confirmou.</span>
          </button>
        </span>
        <button type="button" data-escolha="a-mao" className="btn btn--purple hud-corners" style={{ ...CARTAO, borderWidth: 1.5, color: '#e4d9ff' }} onClick={onMontar} disabled={busy}>
          <Hand size={22} aria-hidden="true" style={{ color: '#b69cff' }} />
          <span style={ROTULO}>Montar à mão</span>
          <span style={LEGENDA}>Você escolhe quem joga em cada time.</span>
        </button>
      </div>
    </div>
  );
}

/**
 * @param {object} props
 * @param {Array<{ key: string, user_id: string|null, nome: string, avatar_url: string|null, convidado: boolean }>} props.pool quem confirmou + os convidados sem app
 * @param {boolean} [props.salvando]
 * @param {(corpo: { times: object[] }) => void} props.onSalvar recebe o corpo do POST /api/games/:id/times-manuais
 * @param {() => void} props.onCancelar
 */
export function MontarTimesAMao({ pool, salvando = false, onSalvar, onCancelar }) {
  const [nTimes, setNTimes] = useState(2);
  const [atrib, setAtrib] = useState([]);
  const nomes = nomesDosTimes(nTimes);
  const pode = podeSalvarTimes(nomes, atrib);

  return (
    <div data-montar-a-mao>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span className="muted" style={{ fontSize: 13 }}>Nº de times:</span>
        <div className="chips-row" style={{ margin: 0 }}>
          {[2, 3, 4].map((n) => (
            <button key={n} type="button" className={`chip ${nTimes === n ? 'chip--active' : ''}`} aria-pressed={nTimes === n} onClick={() => setNTimes(n)}>{n}</button>
          ))}
        </div>
      </div>
      <ComporTimes nomes={nomes} pool={pool} atrib={atrib} onChangeAtrib={setAtrib} ajuda={AJUDA_DO_JOGO} opcional={false} semJogadores={SEM_JOGADORES} />
      <div style={{ marginTop: 16, display: 'grid', gap: 9 }}>
        <button type="button" data-salvar-times className="btn hud-corners cta-gold" disabled={!pode || salvando} onClick={() => onSalvar(corpoDosTimes(nomes, atrib, pool))}>
          {salvando ? 'Salvando…' : 'Salvar times'}
        </button>
        {!pode ? <span className="muted" style={{ fontSize: 11, textAlign: 'center' }}>Cada time precisa de pelo menos 1 jogador.</span> : null}
        <button type="button" data-cancelar-montar className="btn btn--ghost btn--sm" disabled={salvando} onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  );
}
