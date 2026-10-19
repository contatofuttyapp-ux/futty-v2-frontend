// Futty v2.0 — As peças do Perfil: o rótulo de seção, a linha de cada time em "Meus times" e a linha da conta.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { useTeam } from '../../hooks/useTeam';
import EscolhaLinhaGol from '../../components/EscolhaLinhaGol';
import EscudoEquipa from '../../components/EscudoEquipa';

// Label de secção (uppercase cinzento).
function SecLabel({ children }) {
  return (
    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', margin: '22px 0 8px' }}>
      {children}
    </div>
  );
}

// Uma linha de "Meus times" — o time e a escolha "Você joga na linha/no gol · trocar".
// Lê o time pela MESMA chave de cache da página do time (`team:<slug>`), então as duas telas nunca
// discordam; depois de gravar, recarrega essa chave. O estado (`goleiro`) vem de team_members.categoria,
// no motor.
function LinhaMeuTime({ time, meuId, semBorda, aoErro }) {
  const { members, loading, reload } = useTeam(time.slug);
  const [ocupado, setOcupado] = useState(false);
  const eu = members.find((m) => m.id === meuId);

  async function trocar(ligado) {
    if (ocupado) return;
    setOcupado(true);
    try {
      await apiFetch(`/api/equipas/${time.slug}/membros/posicao`, { method: 'PATCH', body: JSON.stringify({ goleiro: ligado }) });
      await reload();
    } catch (e) {
      aoErro(e.message || 'Não deu para trocar agora. Tente de novo.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    // A linha quebra — o nome do time ocupa a linha de cima e "Jogo na linha | No gol" desce, quando os dois
    // não cabem lado a lado (em 360 px o nome ficava com 16 px e virava "D…"); e o nome quebra em duas
    // linhas em vez de ser cortado.
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px 12px', padding: '12px 16px', borderBottom: semBorda ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
      {/* Cada time leva à página dele (o admin acha lá a aba Ajustes). */}
      <Link to={`/time/${time.slug}`} data-meu-time={time.slug} style={{ minWidth: 0, flex: '1 1 100px', display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>
        <EscudoEquipa team={time} size={20} />
        <span data-nome-do-time style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{time.nome}</span>
        {time.role === 'admin' ? <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: '#f0c94a', border: '1px solid rgba(212,160,23,0.6)', padding: '1px 5px' }}>ADMIN</span> : null}
      </Link>
      {eu ? (
        <EscolhaLinhaGol goleiro={!!eu.goleiro} ocupado={ocupado} aoTrocar={trocar} />
      ) : (
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{loading ? '…' : ''}</span>
      )}
    </div>
  );
}

// Linha de ação da secção Conta.
function ContaRow({ children, onClick, cor = 'rgba(255,255,255,0.7)', semBorda = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        padding: '14px 16px',
        border: 'none',
        borderBottom: semBorda ? 'none' : '1px solid rgba(255,255,255,0.04)',
        background: 'transparent',
        color: cor,
        fontSize: 14,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

export { ContaRow, LinhaMeuTime, SecLabel };
