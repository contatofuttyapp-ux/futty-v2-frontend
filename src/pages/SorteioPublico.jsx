// Futty v2.0 — Vista pública do sorteio (/p/:slug/:gameId), sem login.
// Optimizada para partilha (WhatsApp) e telão. O fundo aurora vem do Layout
// global (este ecrã é transparente por cima dele).
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { urlAsset, iniciaisNome } from '../utils/avatar';
import FuttyLogo from '../components/FuttyLogo';
import CampoSorteio from '../components/CampoSorteio';
import Loading from '../components/Loading';

const COR_A = '#3b82f6'; // azul
const COR_B = '#ef4444'; // vermelho
const wrap = { minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '24px 16px', maxWidth: 900, margin: '0 auto' };

function Jogador({ j }) {
  const [falhou, setFalhou] = useState(false);
  const src = j.avatar_url ? urlAsset(j.avatar_url) : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', background: '#15151a', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        {src && !falhou ? (
          <img src={src} alt="" onError={() => setFalhou(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
        ) : (
          <span style={{ color: '#fff', fontWeight: 800 }}>{iniciaisNome(j.nome)}</span>
        )}
      </div>
      <span style={{ flex: 1, minWidth: 0, color: '#fff', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.nome}</span>
      {j.posicao ? (
        <span style={{ fontSize: 10, fontWeight: 800, color: '#d4a017', border: '1px solid rgba(212,160,23,0.4)', borderRadius: 999, padding: '2px 7px', flexShrink: 0 }}>{j.posicao}</span>
      ) : null}
    </div>
  );
}

function TimeColuna({ nome, jogadores, cor, vencedor }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.03)', border: `1px solid ${cor}55`, borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: '0.06em', color: cor, textTransform: 'uppercase' }}>{nome}</span>
        {vencedor ? <span style={{ fontSize: 18 }}>🏆</span> : null}
      </div>
      {jogadores.map((j, i) => (
        <Jogador key={j.user_id || i} j={j} />
      ))}
    </div>
  );
}

export default function SorteioPublico() {
  const { gameId } = useParams();
  const { data, loading } = useApi(`/api/p/${gameId}`);
  const [campo, setCampo] = useState(false);

  if (loading) {
    return (
      <div style={{ ...wrap, alignItems: 'center', justifyContent: 'center' }}>
        <Loading text="A carregar…" />
      </div>
    );
  }

  const tr = data?.times_resultado;
  if (!tr || !tr.times?.length) {
    return (
      <div style={{ ...wrap, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <FuttyLogo size="lg" />
        <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: 16 }}>Sorteio ainda não realizado.</p>
      </div>
    );
  }

  const times = tr.times;
  const nomeA = times[0]?.nome || 'Time A';
  const nomeB = times[1]?.nome || 'Time B';
  const venc = data?.resultado?.time_vencedor;

  return (
    <div style={wrap}>
      {/* Topo: marca + equipa */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 18 }}>
        <FuttyLogo size="lg" />
        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {data.equipa?.nome}
        </span>
      </div>

      {/* Centro: times */}
      <div style={{ flex: 1 }}>
        {campo ? (
          <div style={{ maxWidth: 440, margin: '0 auto' }}>
            <CampoSorteio timeA={times[0]?.jogadores || []} timeB={times[1]?.jogadores || []} nomeA={nomeA} nomeB={nomeB} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, maxWidth: 720, margin: '0 auto' }}>
            <TimeColuna nome={nomeA} jogadores={times[0]?.jogadores || []} cor={COR_A} vencedor={venc === 'A'} />
            <TimeColuna nome={nomeB} jogadores={times[1]?.jogadores || []} cor={COR_B} vencedor={venc === 'B'} />
          </div>
        )}
      </div>

      {/* Rodapé: toggle + branding */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 18 }}>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setCampo((v) => !v)}>
          ⬜ {campo ? 'Vista de lista' : 'Vista de campo'}
        </button>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>gerado com Futty</span>
      </div>
    </div>
  );
}
