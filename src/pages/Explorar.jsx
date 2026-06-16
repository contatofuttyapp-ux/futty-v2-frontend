// Futty v2.0 — Explorar (/explorar): lista de equipas públicas + pesquisa local.
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import TeamAvatar from '../components/TeamAvatar';
import Toast from '../components/Toast';
import '../styles/app.css';

function diasAtras(data) {
  const dias = Math.floor((Date.now() - new Date(data)) / 86400000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  if (dias < 30) return `há ${Math.floor(dias / 7)} sem.`;
  return `há ${Math.floor(dias / 30)} meses`;
}

// Card skeleton com shimmer enquanto carrega.
function SkeletonCard() {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', borderRadius: 12, height: 68, marginBottom: 8 }}>
      <span
        aria-hidden
        style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '40%', pointerEvents: 'none', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)', animation: 'rankShimmer 2.0s ease-in-out infinite' }}
      />
    </div>
  );
}

export default function Explorar() {
  const [equipas, setEquipas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState('');
  const [busy, setBusy] = useState(null); // slug em processamento
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let ativo = true;
    apiFetch('/api/teams/publicas')
      .then((d) => {
        if (!ativo) return;
        setEquipas(d.teams || []);
        setLoading(false);
      })
      .catch((e) => {
        if (!ativo) return;
        setToast({ tipo: 'error', mensagem: e.message });
        setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const filtradas = equipas.filter(
    (e) =>
      e.nome.toLowerCase().includes(pesquisa.toLowerCase()) ||
      (e.localizacao || '').toLowerCase().includes(pesquisa.toLowerCase())
  );

  // Entra (equipa aberta) ou cria pedido (com aprovação) — reutiliza /pedir-entrada.
  async function pedirEntrada(equipa) {
    if (busy) return;
    setBusy(equipa.slug);
    try {
      const r = await apiFetch(`/api/teams/${equipa.slug}/pedir-entrada`, { method: 'POST', body: JSON.stringify({}) });
      const entrou = !!r?.entrou;
      setEquipas((cur) => cur.map((t) => (t.slug === equipa.slug ? { ...t, _estado: entrou ? 'membro' : 'pendente' } : t)));
      setToast({ tipo: 'success', mensagem: entrou ? 'Entraste no time!' : 'Pedido enviado!' });
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="app-shell">
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
        {/* CABEÇALHO */}
        <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: '#fff', margin: '4px 0 4px' }}>Explorar times</h1>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginBottom: 14 }}>Encontra a tua próxima pelada</p>

        {/* PESQUISA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 14 }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <input
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            placeholder="Pesquisar por nome ou cidade…"
            style={{ flex: 1, border: 'none', background: 'transparent', color: '#fff', outline: 'none', fontSize: 14 }}
          />
        </div>

        {/* LISTA */}
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filtradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
            {pesquisa ? 'Nenhum time encontrado.' : 'Ainda não há times públicos.'}
          </div>
        ) : (
          filtradas.map((equipa) => (
            <div
              key={equipa.id}
              style={{
                background: '#0d0d12',
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: '2px solid rgba(212,160,23,0.25)',
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 8,
              }}
            >
              <TeamAvatar team={equipa} size="sm" />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: "'Rajdhani', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {equipa.nome}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>
                  {equipa.localizacao ? `📍 ${equipa.localizacao} · ` : ''}
                  {equipa.numero_membros} membros
                  {equipa.ultimo_jogo ? ` · ${diasAtras(equipa.ultimo_jogo)}` : ''}
                </div>
              </div>

              {equipa._estado === 'membro' ? (
                <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'var(--neon)' }}>Já és membro</span>
              ) : equipa._estado === 'pendente' ? (
                <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#b69cff' }}>Pedido enviado</span>
              ) : (
                <button
                  type="button"
                  disabled={busy === equipa.slug}
                  onClick={() => pedirEntrada(equipa)}
                  style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 6, color: '#8b5cf6', fontSize: 11, fontWeight: 600, padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {equipa.modo_visibilidade === 'publico_aberto' ? 'Entrar' : 'Pedir entrada'}
                </button>
              )}
            </div>
          ))
        )}
      </main>

      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
