// Futty v2.0 — RSVPCard: o jogador confirma/recusa presença no próximo jogo.
import { useState } from 'react';
import { apiFetch } from '../lib/api';

// "até sex, 20 jun · 22:00"
function formatarPrazo(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const data = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${data} · ${hora}`;
}

function botaoStyle(sel, cor) {
  return {
    flex: 1,
    height: 42,
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
    border: `1px solid ${sel ? cor : 'var(--border-subtle)'}`,
    background: sel ? cor : 'var(--surface-1)',
    color: sel ? '#fff' : 'rgba(255,255,255,0.7)',
  };
}

export default function RSVPCard({ gameId, prazo, respostaActual, onResposta, cheio = false, minhaPosicaoEspera = null }) {
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  // Posição na fila: seed do servidor, atualizada localmente nas ações.
  const [posEspera, setPosEspera] = useState(() => minhaPosicaoEspera);

  // Jogo cheio e ainda não confirmado → fluxo de lista de espera.
  const modoEspera = cheio && respostaActual !== 'confirmado';

  async function responder(status) {
    if (busy) return;
    setBusy(true);
    setErro('');
    try {
      const r = await apiFetch(`/api/jogos/${gameId}/rsvp/responder`, { method: 'POST', body: JSON.stringify({ status }) });
      if (r?.espera) setPosEspera(r.posicao);
      else onResposta(status);
    } catch (e) {
      setErro(e?.message || 'Não foi possível responder.');
    } finally {
      setBusy(false);
    }
  }

  async function sairEspera() {
    if (busy) return;
    setBusy(true);
    setErro('');
    try {
      await apiFetch(`/api/jogos/${gameId}/rsvp/sair-espera`, { method: 'POST' });
      setPosEspera(null);
    } catch (e) {
      setErro(e?.message || 'Não foi possível sair da lista.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ border: '1px solid var(--border-accent)', background: 'rgba(139,92,246,0.06)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 12 }}>
      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 15, color: '#fff' }}>📋 Confirma presença</div>
      <div style={{ fontSize: 12, color: 'var(--label-color)', marginTop: 2 }}>até {formatarPrazo(prazo)}</div>

      {modoEspera ? (
        posEspera != null ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--neon)' }}>⏳ Estás em {posEspera}º na lista de espera</div>
            <button type="button" disabled={busy} onClick={sairEspera} style={{ marginTop: 8, border: 'none', background: 'transparent', color: 'var(--label-color)', fontWeight: 700, fontSize: 12, cursor: busy ? 'default' : 'pointer', padding: 0 }}>
              Sair da lista
            </button>
          </div>
        ) : (
          <button type="button" disabled={busy} onClick={() => responder('confirmado')} style={{ ...botaoStyle(false, '#16a34a'), width: '100%', marginTop: 10, opacity: busy ? 0.6 : 1 }}>
            ⏳ Entrar na lista de espera
          </button>
        )
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="button" disabled={busy} onClick={() => responder('confirmado')} style={botaoStyle(respostaActual === 'confirmado', '#16a34a')}>
              ✅ Vou
            </button>
            <button type="button" disabled={busy} onClick={() => responder('recusado')} style={botaoStyle(respostaActual === 'recusado', '#dc2626')}>
              ❌ Não vou
            </button>
          </div>
          {respostaActual ? (
            <div style={{ fontSize: 11, color: 'var(--label-color)', textAlign: 'center', marginTop: 6 }}>Mudar resposta</div>
          ) : null}
        </>
      )}
      {erro ? <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>{erro}</div> : null}
    </div>
  );
}
