// Futty v2.0 — Explorar (/explorar): descobrir equipas públicas e pedir entrada.
// Sem Topbar, mobile-first, dark theme.
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { colorOf, initials } from '../utils/teamColors';
import Toast from '../components/Toast';
import '../styles/app.css';

const CARD = { background: '#111111', border: '1px solid #222222', borderRadius: 12 };

// Avatar da equipa (iniciais + cor).
function TeamAvatar({ nome, cor, size = 48 }) {
  const c = colorOf(cor);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        background: c.hex,
        color: c.text,
        fontWeight: 800,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {initials(nome) || '?'}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ ...CARD, padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1a1a1a', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'grid', gap: 8 }}>
        <div style={{ height: 14, width: '55%', background: '#1a1a1a', borderRadius: 6 }} />
        <div style={{ height: 11, width: '35%', background: '#161616', borderRadius: 6 }} />
      </div>
    </div>
  );
}

export default function Explorar() {
  const [q, setQ] = useState('');
  const [teams, setTeams] = useState(null); // null = a carregar
  const [erro, setErro] = useState('');
  const [modalTeam, setModalTeam] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [toast, setToast] = useState(null);

  // Pesquisa com debounce de 400ms.
  useEffect(() => {
    let ativo = true;
    const id = setTimeout(() => {
      setTeams(null);
      setErro('');
      const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
      apiFetch(`/api/teams/explorar${query}`)
        .then((d) => ativo && setTeams(d.teams || []))
        .catch((e) => {
          if (!ativo) return;
          setErro(e.message);
          setTeams([]);
        });
    }, 400);
    return () => {
      ativo = false;
      clearTimeout(id);
    };
  }, [q]);

  function abrirPedido(team) {
    setModalTeam(team);
    setMensagem('');
  }

  async function enviarPedido() {
    if (enviando || !modalTeam) return;
    setEnviando(true);
    try {
      await apiFetch(`/api/teams/${modalTeam.slug}/pedir-entrada`, {
        method: 'POST',
        body: JSON.stringify({ mensagem: mensagem.trim() || undefined }),
      });
      // Atualiza o card imediatamente.
      setTeams((cur) => (cur || []).map((t) => (t.slug === modalTeam.slug ? { ...t, pedido_pendente: true } : t)));
      setModalTeam(null);
      setToast({ tipo: 'success', mensagem: 'Pedido enviado!' });
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
    } finally {
      setEnviando(false);
    }
  }

  const loading = teams === null;

  return (
    <div className="app-shell">
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
        {/* 1. CABEÇALHO */}
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '4px 0 4px' }}>🗺️ Explorar equipas</h1>
        <p className="app-page-sub" style={{ marginBottom: 14 }}>Encontra a tua próxima pelada</p>

        {/* 2. BARRA DE PESQUISA */}
        <div style={{ ...CARD, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar por nome ou cidade…"
            style={{ flex: 1, border: 'none', background: 'transparent', color: '#fff', outline: 'none', fontSize: 14 }}
          />
        </div>

        {erro ? <div className="alert alert--error" style={{ marginTop: 12 }}>{erro}</div> : null}

        {/* 3. LISTA */}
        <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : teams.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 8 }}>
              <div className="empty-state__emoji">🗺️</div>
              <p className="muted">Nenhuma equipa pública encontrada.</p>
            </div>
          ) : (
            teams.map((t) => (
              <div key={t.id} style={{ ...CARD, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <TeamAvatar nome={t.nome} cor={t.cor} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{t.nome}</div>
                  {t.localizacao ? (
                    <div style={{ marginTop: 2, fontSize: 12, color: 'var(--text-dim)' }}>📍 {t.localizacao}</div>
                  ) : null}
                  {t.descricao ? (
                    <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-dim)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {t.descricao}
                    </div>
                  ) : null}
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-dim)' }}>
                    {t.membro_count} {t.membro_count === 1 ? 'membro' : 'membros'}
                  </div>
                </div>
                <div style={{ flexShrink: 0, alignSelf: 'center' }}>
                  {t.ja_membro ? (
                    <span style={chip('var(--neon)')}>Já és membro</span>
                  ) : t.pedido_pendente ? (
                    <span style={chip('#b69cff')}>Pedido enviado</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => abrirPedido(t)}
                      style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--purple)', background: 'rgba(124,58,237,0.14)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Pedir entrada
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* 4. MODAL DE PEDIDO */}
      {modalTeam ? (
        <div className="modal-overlay" role="presentation" onClick={() => !enviando && setModalTeam(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-card__inner" style={{ textAlign: 'left' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, textAlign: 'center' }}>
                Pedir entrada em {modalTeam.nome}
              </h2>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value.slice(0, 300))}
                placeholder="Apresenta-te (opcional)…"
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 10, border: '1px solid #222222', background: '#0c0c0c', color: '#fff', fontSize: 13, resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button type="button" className="btn btn--ghost" style={{ flex: 1 }} disabled={enviando} onClick={() => setModalTeam(null)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn--purple" style={{ flex: 1 }} disabled={enviando} onClick={enviarPedido}>
                  {enviando ? 'A enviar…' : 'Enviar pedido'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

// Chip de estado (já membro / pedido enviado).
function chip(cor) {
  return {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    color: cor,
    border: `1px solid ${cor}`,
    background: 'rgba(255,255,255,0.03)',
    whiteSpace: 'nowrap',
  };
}
