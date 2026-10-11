// Futty v2.0 — O aviso "Quem ganhou o jogo?" do topo do Início, só para o admin do time. Do jogo sorteado, 5 minutos depois do início, até alguém marcar o
// campeão ou o empate. Grande, com a cor e o escudo de cada time (as mesmas cores da cerimônia); UM toque abre a pergunta.
// Na pergunta, tocar num time (ou em Empate) só SELECIONA — não salva —, e "Finalizar" grava o campeão ou o empate e fecha: é o caminho de quem só
// marca o campeão, sem gols nem prêmios. "Lançar gols e prêmios" leva ao editor do jogo já com a escolha feita. Fechar sem responder é o X do canto (ou
// tocar fora): o card continua no topo até alguém responder.
// O motor entrega o card pronto (GET /api/inicio → seu_time[].quem_ganhou); a fila de avisos (utils/avisosDoInicio.js) decide quando ele sobe.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, Shield, X } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatarDataHora } from '../utils/dataHora';
import { corpoDaResposta, escolhaParaOEditor, perguntaDoJogo } from '../utils/quemGanhou';
import { plural } from '../utils/plural';

const RAJ = "'Rajdhani', sans-serif";

/** O escudo de um time: o desenho da casa na cor da posição dele (Ouro, Roxo, Prata, Bronze). */
function EscudoDaCor({ cor, tamanho = 28 }) {
  return <Shield size={tamanho} color={cor} fill={cor} fillOpacity={0.22} strokeWidth={1.8} aria-hidden="true" style={{ flexShrink: 0 }} />;
}

/** A janela da pergunta: um botão por time (e "Empate" só com 2 times). Tocar escolhe; "Finalizar" salva. */
function QuemGanhouModal({ card, onClose, onResolvido }) {
  const [escolha, setEscolha] = useState(null); // o índice do time, 'empate' ou null (ainda sem escolha)
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const { titulo, temEmpate } = perguntaDoJogo(card.times.length);
  const semEscolha = escolha === null;

  async function finalizar() {
    if (busy || semEscolha) return;
    setBusy(true);
    setErro('');
    try {
      await apiFetch(`/api/games/${card.game_id}/resultado`, { method: 'PATCH', body: JSON.stringify(corpoDaResposta(escolha)) });
      onResolvido(card);
    } catch (e) {
      setErro(e.message || 'Não deu para salvar agora. Tente de novo.');
      setBusy(false);
    }
  }

  return createPortal(
    <div className="modal-overlay" role="presentation" onClick={() => !busy && onClose()}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="quem-ganhou-titulo" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-card__inner" style={{ textAlign: 'left', display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 id="quem-ganhou-titulo" data-quem-ganhou-titulo style={{ fontFamily: RAJ, fontSize: 24, fontWeight: 800, margin: 0, color: '#fff' }}>{titulo}</h2>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                {card.time_nome}{card.local ? ` · ${card.local}` : ''} · {formatarDataHora(card.data, card.fuso, { cidade: card.cidade })}
              </p>
            </div>
            <button
              type="button"
              aria-label="Fechar"
              data-quem-ganhou-fechar
              disabled={busy}
              onClick={onClose}
              style={{ flexShrink: 0, width: 44, height: 44, margin: '-10px -10px 0 0', display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: busy ? 'default' : 'pointer' }}
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {card.times.map((t, i) => {
              const marcado = escolha === i;
              return (
                <button
                  key={i}
                  type="button"
                  data-quem-ganhou-time={i}
                  aria-pressed={marcado}
                  disabled={busy}
                  onClick={() => setEscolha(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '10px 14px', cursor: busy ? 'default' : 'pointer', textAlign: 'left', color: '#fff',
                    background: `${t.cor}${marcado ? '4d' : '1f'}`, border: `1.5px solid ${t.cor}`, borderRadius: 10,
                    boxShadow: marcado ? `0 0 0 2px ${t.cor}, 0 0 18px ${t.cor}66` : 'none', opacity: busy ? 0.6 : (!semEscolha && !marcado ? 0.6 : 1),
                  }}
                >
                  <EscudoDaCor cor={t.cor} tamanho={30} />
                  <span style={{ flex: 1, minWidth: 0, fontFamily: RAJ, fontWeight: 800, fontSize: 20, overflowWrap: 'anywhere' }}>{t.nome}</span>
                  {marcado ? <Check size={22} color={t.cor} strokeWidth={3} aria-hidden="true" data-quem-ganhou-marca /> : null}
                </button>
              );
            })}
            {temEmpate ? (
              <button
                type="button"
                data-quem-ganhou-empate
                aria-pressed={escolha === 'empate'}
                disabled={busy}
                onClick={() => setEscolha('empate')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, padding: '10px 14px', cursor: busy ? 'default' : 'pointer', fontFamily: RAJ, fontWeight: 800, fontSize: 18, color: '#fff',
                  background: escolha === 'empate' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.28)', borderRadius: 10,
                  boxShadow: escolha === 'empate' ? '0 0 0 2px rgba(255,255,255,0.85)' : 'none', opacity: busy ? 0.6 : (!semEscolha && escolha !== 'empate' ? 0.6 : 1),
                }}
              >
                Empate
                {escolha === 'empate' ? <Check size={20} color="#fff" strokeWidth={3} aria-hidden="true" data-quem-ganhou-marca /> : null}
              </button>
            ) : null}
          </div>

          {erro ? <div className="alert alert--error" role="alert" data-quem-ganhou-erro>{erro}</div> : null}

          {/* O botão principal: apagado até a pessoa escolher. O glow dourado só existe com o botão ativo. */}
          <span className={semEscolha ? undefined : 'cta-gold-glow'} style={{ display: 'flex' }}>
            <button
              type="button"
              className="btn hud-corners cta-gold"
              data-quem-ganhou-finalizar
              disabled={semEscolha || busy}
              onClick={finalizar}
              style={{ flex: 1, opacity: semEscolha ? 0.4 : busy ? 0.7 : 1 }}
            >
              {busy ? 'Salvando…' : 'Finalizar'}
            </button>
          </span>

          <div style={{ textAlign: 'center' }}>
            <Link
              to={`/time/${card.slug}/jogo/${card.game_id}`}
              state={{ quemGanhou: escolhaParaOEditor(escolha) }}
              data-quem-ganhou-detalhes
              style={{ color: '#c9b6ff', fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              Lançar gols e prêmios
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * @param {object} props
 * @param {object} props.card   o card do jogo (utils/quemGanhou.js#cardsQuemGanhou)
 * @param {number} [props.mais] quantos outros jogos também esperam resposta (o "+N" discreto)
 * @param {(card: object) => void} props.onResolvido chamado depois que o resultado foi salvo (a tela some com o card e recarrega)
 */
export default function AvisoQuemGanhou({ card, mais = 0, onResolvido }) {
  const [aberto, setAberto] = useState(false);
  const { titulo } = perguntaDoJogo(card.times.length);
  const doisTimes = card.times.length === 2;
  return (
    <>
      <button
        type="button"
        className="hud-corners"
        data-aviso="quem-ganhou"
        data-aviso-jogo={card.game_id}
        onClick={() => setAberto(true)}
        style={{ display: 'grid', gap: 12, width: '100%', textAlign: 'left', padding: '16px 16px 14px', marginBottom: 12, cursor: 'pointer', color: 'inherit', font: 'inherit', background: 'rgba(212,160,23,0.08)', border: '1.5px solid rgba(212,160,23,0.6)' }}
      >
        <span style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span data-quem-ganhou-pergunta style={{ display: 'block', fontFamily: RAJ, fontWeight: 800, fontSize: 24, lineHeight: 1.1, color: '#f0c94a' }}>{titulo}</span>
            <span data-nome-do-time style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--text-dim)', overflowWrap: 'anywhere' }}>
              {card.time_nome}{card.local ? ` · ${card.local}` : ''} · {formatarDataHora(card.data, card.fuso, { cidade: card.cidade })}
            </span>
          </span>
          {mais > 0 ? (
            <span
              data-aviso-mais
              aria-label={`Mais ${mais} ${plural(mais, 'jogo espera', 'jogos esperam')} sua resposta`}
              style={{ flexShrink: 0, fontFamily: RAJ, fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', color: 'var(--text-dim)', border: '1px solid rgba(255,255,255,0.18)', padding: '1px 7px', borderRadius: 2 }}
            >
              +{mais}
            </span>
          ) : null}
        </span>

        {/* Os times com a cor e o escudo de cada um: com 2, frente a frente; com 3 ou 4, em duas colunas. */}
        <span data-quem-ganhou-times style={{ display: 'grid', gridTemplateColumns: doisTimes ? 'minmax(0, 1fr) auto minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))', alignItems: 'center', gap: 8 }}>
          {card.times.flatMap((t, i) => {
            const bloco = (
              <span key={`t${i}`} data-quem-ganhou-time-cor={i} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 52, padding: '8px 10px', background: `${t.cor}1f`, border: `1.5px solid ${t.cor}`, borderRadius: 10 }}>
                <EscudoDaCor cor={t.cor} />
                <span style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 17, color: '#fff', overflowWrap: 'anywhere', minWidth: 0 }}>{t.nome}</span>
              </span>
            );
            return doisTimes && i === 0 ? [bloco, <span key="x" aria-hidden="true" style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 18, color: 'var(--text-dim)' }}>×</span>] : [bloco];
          })}
        </span>

        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: RAJ, fontWeight: 700, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#f0c94a' }}>
          Toque para responder <ChevronRight size={14} aria-hidden="true" />
        </span>
      </button>
      {aberto ? <QuemGanhouModal card={card} onClose={() => setAberto(false)} onResolvido={(c) => { setAberto(false); onResolvido(c); }} /> : null}
    </>
  );
}
