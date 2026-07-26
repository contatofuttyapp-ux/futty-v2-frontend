// Futty v2.0 — Explorar peladas (/explorar) no cânone: busca por cidade + lista de
// equipas abertas com escudo/estado. CICLO DO PEDIDO v1 (sem push): pedir → PENDENTE
// visível (✓ + cancelar) → admin decide no hub → o desfecho aparece no Início.
// Raio/geolocalização: UI presente mas DORMENTE — as distâncias chegam quando as
// equipas declararem o ponto aproximado (opt-in do admin, fase Segurança; a posição
// do utilizador nunca sai do dispositivo). Regra na SPEC-EQUIPAS §b.
import { Search, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import Topbar from '../components/Topbar';
import EscudoEquipa from '../components/EscudoEquipa';
import Toast from '../components/Toast';
import '../styles/app.css';

const RAJ = "'Rajdhani', sans-serif";
const CLIP = 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)';
const CLIP_S = 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)';
const VIDRO = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)' };
const RAIOS = [5, 10, 25, 50];

function SkeletonCard() {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', clipPath: CLIP, height: 68, marginBottom: 8 }}>
      <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '40%', pointerEvents: 'none', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)', animation: 'rankShimmer 2.0s ease-in-out infinite' }} />
    </div>
  );
}

export default function Explorar() {
  const [equipas, setEquipas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState('');
  const [raio, setRaio] = useState(10);
  const [geoPedida, setGeoPedida] = useState(false);
  const [busy, setBusy] = useState(null); // slug em processamento
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let ativo = true;
    // /explorar traz o estado do candidato (ja_membro + pedido_pendente).
    apiFetch('/api/teams/explorar')
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

  // Geolocalização OPT-IN: pede permissão no momento do toque; a posição fica no
  // dispositivo (não é enviada) — só servirá para ORDENAR quando houver pontos
  // aproximados das equipas (fase Segurança).
  function pedirGeo() {
    if (!navigator.geolocation) {
      setToast({ tipo: 'info', mensagem: 'O teu dispositivo não expõe localização.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setGeoPedida(true);
        setToast({ tipo: 'success', mensagem: 'Obrigado! As distâncias chegam quando as equipas declararem o campo.' });
      },
      () => setToast({ tipo: 'info', mensagem: 'Sem problema — a busca por cidade chega.' })
    );
  }

  // Entrar (aberta) / pedir (aprovação) — o estado PENDENTE fica visível.
  async function pedirEntrada(equipa) {
    if (busy) return;
    setBusy(equipa.slug);
    try {
      const r = await apiFetch(`/api/teams/${equipa.slug}/pedir-entrada`, { method: 'POST', body: JSON.stringify({}) });
      const entrou = !!r?.entrou;
      setEquipas((cur) => cur.map((t) => (t.slug === equipa.slug ? { ...t, ja_membro: entrou || t.ja_membro, pedido_pendente: !entrou } : t)));
      setToast({ tipo: 'success', mensagem: entrou ? 'Entraste no time!' : 'Pedido enviado! O admin vai decidir — vês o desfecho no Início.' });
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
    } finally {
      setBusy(null);
    }
  }

  // Cancelar o meu pedido pendente.
  async function cancelarPedido(equipa) {
    if (busy) return;
    setBusy(equipa.slug);
    try {
      await apiFetch(`/api/teams/${equipa.slug}/pedir-entrada`, { method: 'DELETE' });
      setEquipas((cur) => cur.map((t) => (t.slug === equipa.slug ? { ...t, pedido_pendente: false } : t)));
      setToast({ tipo: 'info', mensagem: 'Pedido cancelado.' });
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="app-shell">
      <Topbar hud="EXPLORAR PELADAS" back="/home" />
      <main className="app-main page-reveal">
        {/* BUSCA por cidade/nome */}
        <div style={{ ...VIDRO, clipPath: CLIP_S, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
          <Search size={16} color="#8a8a98" />
          <input
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            placeholder="Cidade ou nome da equipa…"
            style={{ flex: 1, border: 'none', background: 'transparent', color: '#fff', outline: 'none', fontFamily: RAJ, fontSize: 15, fontWeight: 600 }}
          />
        </div>

        {/* GEO opt-in */}
        <button type="button" onClick={pedirGeo} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '11px 14px', border: '1.5px solid rgba(139,92,246,0.5)', background: 'rgba(139,92,246,0.06)', cursor: 'pointer', clipPath: CLIP_S, textAlign: 'left', color: 'inherit' }}>
          <MapPin size={16} color="#b69cff" />
          <span style={{ flex: 1 }}>
            <b style={{ fontFamily: RAJ, fontSize: 13, color: '#e4d9ff', letterSpacing: '0.04em', display: 'block' }}>
              {geoPedida ? 'Localização activa' : 'Usar a minha localização'}
            </b>
            <span style={{ fontSize: 10, color: '#9a8fc0' }}>opt-in — se recusares, a busca por cidade chega; a tua posição nunca sai do telefone</span>
          </span>
        </button>

        {/* RAIO (dormente até haver pontos das equipas) */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: RAJ, fontSize: 11, letterSpacing: '0.1em', color: '#9a8fc0', textTransform: 'uppercase', marginBottom: 8 }}>
            <span>Raio de busca <em style={{ color: '#6f6a80', textTransform: 'none', fontStyle: 'normal' }}>· distâncias em breve</em></span>
            <b style={{ color: '#f0c94a' }}>{raio} km</b>
          </div>
          <div className="chips-row">
            {RAIOS.map((r) => (
              <button key={r} type="button" className={`chip ${raio === r ? 'chip--active' : ''}`} onClick={() => setRaio(r)}>
                {r} km
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 12, letterSpacing: '0.14em', color: '#9a8fc0', textTransform: 'uppercase', margin: '20px 2px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
          Equipas abertas · {filtradas.length}
          <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(139,92,246,0.4), transparent)' }} />
        </div>

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filtradas.length === 0 ? (
          <div style={{ ...VIDRO, clipPath: CLIP, textAlign: 'center', padding: '32px 16px', color: 'var(--text-dim)', fontSize: 13 }}>
            {pesquisa ? 'Nenhuma equipa encontrada.' : 'Ainda não há equipas públicas.'}
          </div>
        ) : (
          filtradas.map((equipa) => (
            <div key={equipa.id} style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8 }}>
              <EscudoEquipa team={equipa} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{equipa.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                  {equipa.localizacao ? `${equipa.localizacao} · ` : ''}
                  {equipa.membro_count} membros · {equipa.modo_visibilidade === 'publico_aberto' ? 'aberta' : 'com aprovação'}
                </div>
              </div>
              {equipa.ja_membro ? (
                <span style={{ flexShrink: 0, fontFamily: RAJ, fontSize: 11, fontWeight: 800, color: '#7bd88f', letterSpacing: '0.06em' }}>Já és membro</span>
              ) : equipa.pedido_pendente ? (
                <div style={{ display: 'grid', gap: 4, justifyItems: 'end', flexShrink: 0 }}>
                  <span style={{ fontFamily: RAJ, fontSize: 11, fontWeight: 800, color: '#b69cff', letterSpacing: '0.06em' }}>Pedido enviado ✓</span>
                  {/* P3-16 — alvo mínimo 44px para o polegar (antes 10px sem padding). */}
                  <button type="button" disabled={busy === equipa.slug} onClick={() => cancelarPedido(equipa)} style={{ background: 'none', border: 'none', color: '#8a8398', fontFamily: RAJ, fontSize: 11, letterSpacing: '0.06em', cursor: 'pointer', minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '0 6px', margin: '-6px -6px -6px 0' }}>
                    cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy === equipa.slug}
                  onClick={() => pedirEntrada(equipa)}
                  style={{ flexShrink: 0, fontFamily: RAJ, fontWeight: 800, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '9px 14px', cursor: 'pointer', clipPath: CLIP_S, color: equipa.modo_visibilidade === 'publico_aberto' ? '#7bd88f' : '#f0c94a', border: equipa.modo_visibilidade === 'publico_aberto' ? '1.5px solid rgba(123,216,143,0.5)' : '1.5px solid #d4a017', background: equipa.modo_visibilidade === 'publico_aberto' ? 'rgba(123,216,143,0.06)' : 'rgba(30,24,8,0.9)' }}
                >
                  {equipa.modo_visibilidade === 'publico_aberto' ? 'Entrar' : 'Pedir entrada'}
                </button>
              )}
            </div>
          ))
        )}

        <p style={{ fontSize: 10, color: '#8a8a98', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
          a distância será sempre da EQUIPA (ponto aproximado declarado pelo admin) — nunca de pessoas
        </p>
      </main>
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
