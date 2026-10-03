// Futty v2.0 — RSVPCard: o jogador confirma/recusa presença no próximo jogo.
import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { responderComOtimismo } from '../lib/rsvp';
import { formatarDataHora } from '../utils/dataHora';

// "até qui., 8 de out. · 20:00" — o prazo, como o jogo, é lido no relógio do CAMPO (fuso do time, 29I achado 83).
function formatarPrazo(iso, fuso) {
  return formatarDataHora(iso, fuso);
}

// RODADA 12A — a paleta de presença da casa (--presenca-* em index.css), a mesma
// do "Vou"/"Não vou" do card de jogo. O verde #16a34a e o vermelho #dc2626 que
// estavam aqui saíram: num app dourado e roxo o par de semáforo lê-se como
// alerta de sistema. Dizer que não é uma resposta legítima, não um erro — por
// isso os dois são fantasma, e não um botão saturado a gritar. RODADA 13: o
// "Vou" deixou de ser dourado (agora é só do "Ver sorteio"/"Sortear") e passou
// a usar a MESMA receita do "Não vou" — só a cor muda.
const BASE_BOTAO = {
  flex: 1,
  height: 42,
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 14,
};

function botaoSim(sel) {
  return {
    ...BASE_BOTAO,
    border: '1px solid var(--presenca-sim-borda)',
    background: sel ? 'var(--presenca-sim-fundo)' : 'transparent',
    color: sel ? 'var(--presenca-sim-texto)' : 'var(--text-dim)',
  };
}

function botaoNao(sel) {
  return {
    ...BASE_BOTAO,
    border: '1px solid var(--presenca-nao-borda)',
    background: sel ? 'var(--presenca-nao-fundo)' : 'transparent',
    color: sel ? 'var(--presenca-nao-texto)' : 'var(--text-dim)',
  };
}

export default function RSVPCard({ gameId, prazo, fuso, respostaActual, onResposta, cheio = false, minhaPosicaoEspera = null }) {
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  // Posição na fila: seed do servidor, atualizada localmente nas ações.
  const [posEspera, setPosEspera] = useState(() => minhaPosicaoEspera);

  // Jogo cheio e ainda não confirmado → fluxo de lista de espera.
  const modoEspera = cheio && respostaActual !== 'confirmado';

  // Rodada 29I (achado 86): estado OTIMISTA. O botão escolhido acende e o contador de confirmados mexe NA HORA (`onResposta` já
  // aplica o novo estado na tela do Início); o pedido segue por trás. Se falhar, volta ao que estava e diz o que fazer. Antes a
  // tela só mudava depois de a resposta chegar (ou só depois de recarregar), e a pessoa tocava de novo sem ver nada.
  async function responder(status) {
    if (busy) return;
    setBusy(true);
    setErro('');
    // Com o jogo cheio o "Vou" é entrar na fila, não confirmar: aí não há o que acender antes da resposta (otimista: false).
    const r = await responderComOtimismo({ gameId, status, anterior: respostaActual, aplicar: onResposta, otimista: !modoEspera });
    if (r.espera != null) setPosEspera(r.espera);
    if (!r.ok) setErro(r.erro);
    setBusy(false);
  }

  async function sairEspera() {
    if (busy) return;
    setBusy(true);
    setErro('');
    try {
      await apiFetch(`/api/jogos/${gameId}/rsvp/sair-espera`, { method: 'POST' });
      setPosEspera(null);
    } catch (e) {
      setErro(e?.message || 'Não deu para sair da lista agora. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ border: '1px solid var(--border-accent)', background: 'rgba(139,92,246,0.06)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 12 }}>
      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 15, color: '#fff' }}>Confirme presença</div>
      {/* Rodada 29L (achado 137): o --label-color (branco a 40%, ~3,7:1) não chega a 4,5:1; o --text-dim passa folgado. */}
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>até {formatarPrazo(prazo, fuso)}</div>

      {modoEspera ? (
        posEspera != null ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--neon)' }}>Você está em {posEspera}º na lista de espera</div>
            <button type="button" disabled={busy} onClick={sairEspera} style={{ marginTop: 8, border: 'none', background: 'transparent', color: 'var(--text-dim)', fontWeight: 700, fontSize: 12, cursor: busy ? 'default' : 'pointer', padding: 0 }}>
              Sair da lista
            </button>
          </div>
        ) : (
          <button type="button" disabled={busy} onClick={() => responder('confirmado')} style={{ ...botaoSim(false), width: '100%', marginTop: 10, opacity: busy ? 0.6 : 1 }}>
            Entrar na lista de espera
          </button>
        )
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="button" disabled={busy} aria-pressed={respostaActual === 'confirmado'} onClick={() => responder('confirmado')} style={botaoSim(respostaActual === 'confirmado')}>
              Vou
            </button>
            <button type="button" disabled={busy} aria-pressed={respostaActual === 'recusado'} onClick={() => responder('recusado')} style={botaoNao(respostaActual === 'recusado')}>
              Não vou
            </button>
          </div>
          {respostaActual ? (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', marginTop: 6 }}>Mudar resposta</div>
          ) : null}
        </>
      )}
      {erro ? <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>{erro}</div> : null}
    </div>
  );
}
