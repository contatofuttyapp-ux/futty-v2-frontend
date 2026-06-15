// Futty v2.0 — Painel de Admin por equipa (/admin/:slug?tab=...).
// Só admins. Sidebar (desktop) / drawer (mobile). Tab persistida na URL.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiFetch, apiUpload } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { COLOR_OPTIONS } from '../utils/teamColors';
import { formatDateTime, STATUS_LABELS } from '../utils/format';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import PlayerAvatar from '../components/PlayerAvatar';
import TeamAvatar from '../components/TeamAvatar';
import UploadComCrop from '../components/UploadComCrop';
import NumberStepper from '../components/NumberStepper';
import { celebrarCerveja } from '../hooks/useConfetti';
import '../styles/app.css';

// Opções de cor de fundo do avatar da equipa (sem logo) e de visibilidade.
const CORES_FUNDO = ['#1a1a2e', '#0d1f0d', '#1f0d0d', '#1f1a0d', '#0d0d1f', '#111111'];
const VIS_OPCOES = [
  { k: 'privado', icon: '🔒', label: 'Privada' },
  { k: 'publico_aprovacao', icon: '🔓', label: 'Com aprovação' },
  { k: 'publico_aberto', icon: '🌐', label: 'Aberta' },
];
const VIS_DESC = {
  privado: 'Só por convite — não aparece no Explorar.',
  publico_aprovacao: 'Aparece no Explorar; a entrada precisa de aprovação.',
  publico_aberto: 'Aparece no Explorar; qualquer pessoa entra logo.',
};

const CARD = { background: '#111111', border: '1px solid #222222', borderRadius: 12 };
const MENU = [
  { k: 'dashboard', icon: '🏠', label: 'Dashboard' },
  { k: 'equipa', icon: '⚙️', label: 'Equipa' },
  { k: 'membros', icon: '👥', label: 'Membros' },
  { k: 'convites', icon: '🔗', label: 'Convites' },
  { k: 'jogos', icon: '⚽', label: 'Jogos' },
  { k: 'resultados', icon: '🏆', label: 'Resultados' },
  { k: 'estatisticas', icon: '📊', label: 'Estatísticas' },
  { k: 'denuncias', icon: '🚩', label: 'Denúncias' },
];
const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #222222',
  background: '#0c0c0c',
  color: '#fff',
  fontSize: 14,
};
const lbl = { fontSize: 12, color: 'var(--text-dim)' };
const secLbl = { fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text-dim)', textTransform: 'uppercase' };
const menuItem = { display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'transparent', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' };

const ADMIN_CSS = `
.admin-layout { display: flex; align-items: stretch; }
.admin-sidebar { width: 210px; flex-shrink: 0; background: #0a0a0a; border-right: 1px solid #1a1a1a; padding: 12px 0; }
.admin-content { flex: 1; min-width: 0; padding: 16px; }
.admin-burger { display: none; }
@media (max-width: 760px) {
  .admin-sidebar { display: none; }
  .admin-burger { display: inline-flex; }
}
`;

function haQuantoTempo(iso) {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return '';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 60) return `há ${Math.max(1, min)} min`;
  const h = Math.floor(diff / 3600000);
  if (h < 48) return `há ${h} h`;
  return `há ${Math.floor(diff / 86400000)} dias`;
}
function diasAte(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

// Pequeno modal de confirmação reutilizável.
function ConfirmModal({ texto, confirmarLabel = 'Confirmar', perigo = false, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" role="presentation" onClick={onCancel}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__inner">
          <p style={{ fontSize: 15, marginBottom: 16 }}>{texto}</p>
          <button
            type="button"
            className="btn btn--primary"
            style={{ width: '100%', ...(perigo ? { background: 'var(--danger)', color: '#fff' } : {}) }}
            onClick={onConfirm}
          >
            {confirmarLabel}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" style={{ width: '100%', marginTop: 10 }} onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: DASHBOARD ──────────────────────────────────────────────────────────
function MetricCard({ valor, label, alerta = false }) {
  return (
    <div style={{ ...CARD, padding: 14, textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 900, color: alerta ? 'var(--danger)' : '#fff' }}>{valor}</div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function TabDashboard({ slug, navigate, onGoTab, showToast }) {
  const [stats, setStats] = useState(null);
  const [pedidos, setPedidos] = useState(0);
  const [denuncias, setDenuncias] = useState(0);
  const [confirmRevotar, setConfirmRevotar] = useState(false);
  const [revotarBusy, setRevotarBusy] = useState(false);

  async function pedirRevotacao() {
    setRevotarBusy(true);
    try {
      await apiFetch(`/api/teams/${slug}/pedir-revotacao`, { method: 'POST' });
      showToast('Pedido enviado a todos os membros!');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setRevotarBusy(false);
      setConfirmRevotar(false);
    }
  }

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/teams/${slug}/stats`)
      .then((d) => ativo && setStats(d.stats || {}))
      .catch((e) => ativo && (setStats({}), showToast(e.message, 'error')));
    apiFetch(`/api/teams/${slug}/pedidos`).then((d) => ativo && setPedidos((d.pedidos || []).length)).catch(() => {});
    apiFetch('/api/feed/denuncias').then((d) => ativo && setDenuncias((d.denuncias || []).length)).catch(() => {});
    return () => {
      ativo = false;
    };
  }, [slug, showToast]);

  if (!stats) return <Loading text="A carregar…" />;
  const pj = stats.proximo_jogo;
  const art = stats.artilheiro;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <MetricCard valor={stats.total_jogos ?? 0} label="jogos" />
        <MetricCard valor={stats.total_membros ?? 0} label="membros" />
        <MetricCard valor={(stats.media_confirmacoes ?? 0).toFixed(1)} label="por jogo" />
        <MetricCard valor={denuncias} label="denúncias" alerta={denuncias > 0} />
      </div>

      {pj ? (
        <div style={{ ...CARD, padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--neon)', fontWeight: 800, letterSpacing: '0.08em' }}>PRÓXIMO JOGO</div>
            <div style={{ fontWeight: 700, color: '#fff', marginTop: 2 }}>{pj.location || 'Jogo'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{formatDateTime(pj.date)} · {pj.confirmados} confirmados</div>
          </div>
          <button type="button" className="btn btn--purple btn--sm" onClick={() => navigate(`/equipa/${slug}/jogo/${pj.id}`)}>Ver jogo</button>
        </div>
      ) : null}

      {pedidos > 0 ? (
        <div style={{ ...CARD, padding: 14, display: 'flex', alignItems: 'center', gap: 10, borderColor: 'rgba(124,58,237,0.4)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#fff' }}>{pedidos} {pedidos === 1 ? 'pedido pendente' : 'pedidos pendentes'}</div>
          </div>
          <button type="button" className="btn btn--purple btn--sm" onClick={() => onGoTab('membros')}>Ver pedidos</button>
        </div>
      ) : null}

      {art ? (
        <div style={{ ...CARD, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <PlayerAvatar nome={art.nome || 'Jogador'} avatarUrl={art.avatar_url} />
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>⚽ Artilheiro da equipa</div>
            <div style={{ fontWeight: 800, color: '#fff' }}>{art.nome} <span style={{ color: 'var(--neon)' }}>· {art.gols} gols</span></div>
          </div>
        </div>
      ) : null}

      {/* Pedir revotação a todos */}
      <button
        type="button"
        disabled={revotarBusy}
        onClick={() => setConfirmRevotar(true)}
        style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #d4a017', background: 'rgba(212,160,23,0.08)', color: '#f5e070', fontWeight: 700, cursor: 'pointer' }}
      >
        ✨ Pedir revotação a todos
      </button>

      {confirmRevotar ? (
        <ConfirmModal
          texto="Pedir a todos os membros para atualizarem as suas notas?"
          confirmarLabel="Pedir revotação"
          onConfirm={pedirRevotacao}
          onCancel={() => setConfirmRevotar(false)}
        />
      ) : null}
    </div>
  );
}

// ─── TAB: EQUIPA ─────────────────────────────────────────────────────────────
function TabEquipa({ slug, team, showToast }) {
  const [nome, setNome] = useState(team.nome || '');
  const [cor, setCor] = useState(team.cor || 'verde');
  const [localizacao, setLocalizacao] = useState(team.localizacao || '');
  const [descricao, setDescricao] = useState(team.descricao || '');
  const [logoUrl, setLogoUrl] = useState(team.logo_url || null);
  const [previewLogo, setPreviewLogo] = useState(null);
  const [corFundo, setCorFundo] = useState(team.cor_fundo || '#1a1a2e');
  const [modo, setModo] = useState(team.modo_visibilidade || 'privado');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [zerarStep, setZerarStep] = useState(0); // 0=nada, 1=1ª confirmação, 2=2ª

  // Carrega o logo escolhido (preview imediato) e envia para o backend.
  async function aoEscolherLogo(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPreviewLogo(URL.createObjectURL(file));
    setUploadingLogo(true);
    try {
      const { logo_url } = await apiUpload(`/api/teams/${slug}/logo`, file, 'logo');
      setLogoUrl(logo_url);
      showToast('Logo actualizado!');
    } catch (err) {
      setPreviewLogo(null);
      showToast(err.message, 'error');
    } finally {
      setUploadingLogo(false);
    }
  }

  // Cor de fundo do avatar (guarda logo ao clicar).
  async function guardarCorFundo(novaCor) {
    setCorFundo(novaCor);
    try {
      await apiFetch(`/api/teams/${slug}`, { method: 'PATCH', body: JSON.stringify({ cor_fundo: novaCor }) });
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // Modo de visibilidade (guarda logo ao selecionar; reverte em erro).
  async function guardarModo(novoModo) {
    const anterior = modo;
    setModo(novoModo);
    try {
      await apiFetch(`/api/teams/${slug}`, { method: 'PATCH', body: JSON.stringify({ modo_visibilidade: novoModo }) });
      showToast('Visibilidade actualizada!');
    } catch (err) {
      setModo(anterior);
      showToast(err.message, 'error');
    }
  }

  async function zerarTodosVotos() {
    try {
      const r = await apiFetch(`/api/teams/${slug}/votos`, { method: 'DELETE' });
      showToast(`Todos os votos zerados${r?.count != null ? ` (${r.count})` : ''}.`);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setZerarStep(0);
    }
  }

  async function guardar() {
    if (saving) return;
    setSaving(true);
    try {
      await apiFetch(`/api/teams/${slug}`, {
        method: 'PATCH',
        body: JSON.stringify({ nome: nome.trim(), cor, localizacao: localizacao.trim(), descricao: descricao.trim() }),
      });
      showToast('Equipa actualizada!');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
    <div style={{ ...CARD, padding: 14, display: 'grid', gap: 14 }}>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={lbl}>Nome da equipa</span>
        <input value={nome} onChange={(e) => setNome(e.target.value.slice(0, 60))} style={inputStyle} />
      </label>

      <div style={{ display: 'grid', gap: 6 }}>
        <span style={lbl}>Cor</span>
        <div className="color-picker">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.key}
              type="button"
              className="color-swatch"
              style={{ background: c.hex, outline: cor === c.key ? '2px solid #fff' : 'none' }}
              aria-pressed={cor === c.key}
              aria-label={c.label}
              title={c.label}
              onClick={() => setCor(c.key)}
            />
          ))}
        </div>
      </div>

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={lbl}>Localização</span>
        <input value={localizacao} onChange={(e) => setLocalizacao(e.target.value.slice(0, 100))} placeholder="Ex: Lisboa · Campo do Ze" style={inputStyle} />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={lbl}>Descrição</span>
        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value.slice(0, 300))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
      </label>

      {/* LOGO */}
      <div style={{ display: 'grid', gap: 8 }}>
        <span style={lbl}>Logo</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <TeamAvatar team={{ nome, logo_url: previewLogo || logoUrl, cor_fundo: corFundo }} size="lg" />
          <div style={{ display: 'grid', gap: 6 }}>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={uploadingLogo}
              onClick={() => logoInputRef.current?.click()}
            >
              {uploadingLogo ? 'A carregar…' : 'Carregar logo'}
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>PNG, JPG ou WEBP · máx 2MB</span>
          </div>
          <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={aoEscolherLogo} style={{ display: 'none' }} />
        </div>
      </div>

      {/* COR DE FUNDO (avatar sem logo) */}
      <div style={{ display: 'grid', gap: 6 }}>
        <span style={lbl}>Cor de fundo do avatar</span>
        <div style={{ display: 'flex', gap: 10 }}>
          {CORES_FUNDO.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={`Fundo ${hex}`}
              aria-pressed={corFundo === hex}
              onClick={() => guardarCorFundo(hex)}
              style={{ width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', background: hex, border: corFundo === hex ? '2px solid #fff' : '2px solid #333' }}
            />
          ))}
        </div>
      </div>

      {/* VISIBILIDADE */}
      <div style={{ display: 'grid', gap: 6 }}>
        <span style={lbl}>Visibilidade</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {VIS_OPCOES.map((o) => {
            const ativa = modo === o.k;
            return (
              <button
                key={o.k}
                type="button"
                aria-pressed={ativa}
                onClick={() => guardarModo(o.k)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '8px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: `1px solid ${ativa ? 'var(--neon)' : '#1a1a1a'}`,
                  background: ativa ? 'rgba(139,92,246,0.08)' : '#080808',
                  color: '#fff',
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>{o.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{o.label}</span>
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{VIS_DESC[modo]}</span>
      </div>

      <button type="button" className="btn btn--primary" style={{ width: '100%' }} disabled={saving} onClick={guardar}>
        {saving ? 'A guardar…' : 'Guardar'}
      </button>
    </div>

    {/* Zona de perigo */}
    <div style={{ ...CARD, padding: 14, borderColor: 'rgba(239,68,68,0.4)' }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--danger)', textTransform: 'uppercase', marginBottom: 8 }}>Zona de perigo</div>
      <button
        type="button"
        onClick={() => setZerarStep(1)}
        style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--danger)', background: 'transparent', color: '#fda4af', fontWeight: 700, cursor: 'pointer' }}
      >
        Zerar todos os votos da equipa
      </button>
    </div>

    {zerarStep === 1 ? (
      <ConfirmModal
        texto="Vais apagar TODOS os votos da equipa. Continuar?"
        perigo
        confirmarLabel="Continuar"
        onConfirm={() => setZerarStep(2)}
        onCancel={() => setZerarStep(0)}
      />
    ) : null}
    {zerarStep === 2 ? (
      <ConfirmModal
        texto="Tens mesmo a certeza? Esta ação é irreversível."
        perigo
        confirmarLabel="Zerar tudo"
        onConfirm={zerarTodosVotos}
        onCancel={() => setZerarStep(0)}
      />
    ) : null}
    </div>
  );
}

// ─── TAB: MEMBROS ────────────────────────────────────────────────────────────
function TabMembros({ slug, meId, showToast }) {
  const [membros, setMembros] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null);

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/teams/${slug}/membros`)
      .then((d) => ativo && setMembros(d.membros || []))
      .catch((e) => ativo && (setMembros([]), showToast(e.message, 'error')));
    return () => {
      ativo = false;
    };
  }, [slug, showToast]);

  async function togglePostar(m) {
    const novo = !m.pode_postar;
    setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, pode_postar: novo } : x)));
    try {
      await apiFetch(`/api/teams/${slug}/membros/${m.user_id}`, { method: 'PATCH', body: JSON.stringify({ pode_postar: novo }) });
    } catch (e) {
      setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, pode_postar: !novo } : x)));
      showToast(e.message, 'error');
    }
  }

  async function mudarRole(m, role) {
    try {
      await apiFetch(`/api/teams/${slug}/membros/${m.user_id}`, { method: 'PATCH', body: JSON.stringify({ role }) });
      setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, role } : x)));
      showToast(role === 'admin' ? 'Promovido a admin.' : 'Removido de admin.');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  async function remover(m) {
    try {
      await apiFetch(`/api/teams/${slug}/membros/${m.user_id}`, { method: 'DELETE' });
      setMembros((cur) => cur.filter((x) => x.user_id !== m.user_id));
      showToast('Membro removido.');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  // Alterna categoria linha <-> GR (optimista).
  async function toggleGR(m) {
    const nova = m.categoria === 'GR' ? 'linha' : 'GR';
    setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, categoria: nova } : x)));
    try {
      await apiFetch(`/api/teams/${slug}/membros/${m.user_id}`, { method: 'PATCH', body: JSON.stringify({ categoria: nova }) });
    } catch (e) {
      setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, categoria: m.categoria } : x)));
      showToast(e.message, 'error');
    }
  }

  async function zerarVotos(m) {
    try {
      const r = await apiFetch(`/api/teams/${slug}/votos/${m.user_id}`, { method: 'DELETE' });
      showToast(`Votos de ${m.nome_jogador || m.nome} zerados${r?.count != null ? ` (${r.count})` : ''}.`);
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  // Alterna a visibilidade no ranking (optimista).
  async function toggleRanking(m) {
    const visivel = m.visivel_ranking !== false;
    const novo = !visivel;
    setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, visivel_ranking: novo } : x)));
    try {
      await apiFetch(`/api/teams/${slug}/membros/${m.user_id}`, { method: 'PATCH', body: JSON.stringify({ visivel_ranking: novo }) });
    } catch (e) {
      setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, visivel_ranking: visivel } : x)));
      showToast(e.message, 'error');
    }
  }

  // Edita a nota interna localmente; grava ao sair do input.
  function setNotaLocal(m, value) {
    setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, nota_interna: value } : x)));
  }
  async function saveNota(m) {
    try {
      await apiFetch(`/api/teams/${slug}/membros/${m.user_id}`, { method: 'PATCH', body: JSON.stringify({ nota_interna: m.nota_interna || null }) });
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  if (membros === null) return <Loading text="A carregar membros…" />;

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {membros.map((m) => {
        const ehProprio = m.user_id === meId;
        return (
          <div key={m.user_id} style={{ ...CARD, padding: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <PlayerAvatar nome={m.nome_jogador || m.nome || 'Jogador'} avatarUrl={m.avatar_url} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, color: '#fff' }}>{m.nome_jogador || m.nome || 'Jogador'}</span>
                {m.role === 'admin' && (
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#b69cff', border: '1px solid var(--purple)', borderRadius: 999, padding: '2px 6px' }}>ADMIN</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
            </div>

            <button
              type="button"
              onClick={() => toggleGR(m)}
              aria-pressed={m.categoria === 'GR'}
              title="Goleiro"
              style={{ padding: '5px 8px', borderRadius: 999, fontSize: 11, fontWeight: 800, cursor: 'pointer', border: `1px solid ${m.categoria === 'GR' ? 'var(--purple)' : '#333'}`, background: m.categoria === 'GR' ? 'rgba(124,58,237,0.18)' : 'transparent', color: m.categoria === 'GR' ? '#b69cff' : 'var(--text-dim)', whiteSpace: 'nowrap' }}
            >
              GR
            </button>
            <button
              type="button"
              onClick={() => togglePostar(m)}
              aria-pressed={m.pode_postar}
              title="Pode postar"
              style={{ padding: '5px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${m.pode_postar ? 'var(--neon)' : '#333'}`, background: m.pode_postar ? 'rgba(139,92,246,0.12)' : 'transparent', color: m.pode_postar ? 'var(--neon)' : 'var(--text-dim)', whiteSpace: 'nowrap' }}
            >
              {m.pode_postar ? '✓ Postar' : 'Postar'}
            </button>
            <button
              type="button"
              onClick={() => toggleRanking(m)}
              aria-pressed={m.visivel_ranking !== false}
              title="Visível no ranking"
              style={{ padding: '5px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${m.visivel_ranking !== false ? 'var(--neon)' : '#333'}`, background: m.visivel_ranking !== false ? 'rgba(139,92,246,0.12)' : 'transparent', color: m.visivel_ranking !== false ? 'var(--neon)' : 'var(--text-dim)', whiteSpace: 'nowrap' }}
            >
              {m.visivel_ranking !== false ? '✓ Ranking' : 'Ranking'}
            </button>

            {!ehProprio ? (
              <div style={{ position: 'relative' }} data-menu>
                <button type="button" aria-label="Opções" onClick={() => setMenuId((c) => (c === m.user_id ? null : m.user_id))} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 18, fontWeight: 900, cursor: 'pointer', padding: '0 4px' }}>⋯</button>
                {menuId === m.user_id ? (
                  <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, minWidth: 180, background: '#0c0c0c', border: '1px solid #222222', borderRadius: 10, overflow: 'hidden', zIndex: 10 }}>
                    {m.role === 'member' ? (
                      <button type="button" onClick={() => { setMenuId(null); setConfirmacao({ tipo: 'promover', membro: m }); }} style={menuItem}>Promover a admin</button>
                    ) : (
                      <button type="button" onClick={() => { setMenuId(null); setConfirmacao({ tipo: 'despromover', membro: m }); }} style={menuItem}>Remover de admin</button>
                    )}
                    <button type="button" onClick={() => { setMenuId(null); setConfirmacao({ tipo: 'zerar-votos', membro: m }); }} style={{ ...menuItem, color: '#fda4af' }}>Zerar votos</button>
                    <button type="button" onClick={() => { setMenuId(null); setConfirmacao({ tipo: 'remover', membro: m }); }} style={{ ...menuItem, color: '#fda4af' }}>Remover da equipa</button>
                  </div>
                ) : null}
              </div>
            ) : null}
            </div>

            {!ehProprio && m.visivel_ranking === false ? (
              <input
                type="text"
                value={m.nota_interna || ''}
                onChange={(e) => setNotaLocal(m, e.target.value.slice(0, 200))}
                onBlur={() => saveNota(m)}
                placeholder="Razão (só tu vês)…"
                style={{ marginTop: 10, width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #1a1a1a', background: '#0c0c0c', color: '#fff', fontSize: 13 }}
              />
            ) : null}
          </div>
        );
      })}

      {confirmacao ? (
        <ConfirmModal
          texto={
            confirmacao.tipo === 'remover'
              ? `Remover ${confirmacao.membro.nome_jogador || confirmacao.membro.nome} da equipa?`
              : confirmacao.tipo === 'promover'
                ? `Promover ${confirmacao.membro.nome_jogador || confirmacao.membro.nome} a admin?`
                : confirmacao.tipo === 'zerar-votos'
                  ? `Zerar os votos recebidos por ${confirmacao.membro.nome_jogador || confirmacao.membro.nome}?`
                  : `Remover o admin de ${confirmacao.membro.nome_jogador || confirmacao.membro.nome}?`
          }
          perigo={confirmacao.tipo === 'remover' || confirmacao.tipo === 'zerar-votos'}
          confirmarLabel={confirmacao.tipo === 'remover' ? 'Remover' : confirmacao.tipo === 'zerar-votos' ? 'Zerar' : 'Confirmar'}
          onConfirm={() => {
            const { tipo, membro } = confirmacao;
            setConfirmacao(null);
            if (tipo === 'remover') remover(membro);
            else if (tipo === 'zerar-votos') zerarVotos(membro);
            else mudarRole(membro, tipo === 'promover' ? 'admin' : 'member');
          }}
          onCancel={() => setConfirmacao(null)}
        />
      ) : null}
    </div>
  );
}

// ─── TAB: CONVITES ───────────────────────────────────────────────────────────
function TabConvites({ slug, showToast }) {
  const [convites, setConvites] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [novoLink, setNovoLink] = useState('');
  const [revogar, setRevogar] = useState(null);

  function recarregar() {
    return apiFetch(`/api/teams/${slug}/convites`)
      .then((d) => setConvites(d.convites || []))
      .catch((e) => {
        setConvites([]);
        showToast(e.message, 'error');
      });
  }

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/teams/${slug}/convites`)
      .then((d) => ativo && setConvites(d.convites || []))
      .catch((e) => ativo && (setConvites([]), showToast(e.message, 'error')));
    return () => {
      ativo = false;
    };
  }, [slug, showToast]);

  function linkDe(token) {
    return `${window.location.origin}/convite/${token}`;
  }

  async function gerar() {
    if (gerando) return;
    setGerando(true);
    try {
      const { token } = await apiFetch(`/api/teams/${slug}/convite`, { method: 'POST' });
      setNovoLink(linkDe(token));
      await recarregar();
      showToast('Convite gerado!');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setGerando(false);
    }
  }

  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      showToast('Link copiado!');
    } catch {
      showToast('Não foi possível copiar.', 'error');
    }
  }

  async function confirmarRevogar(c) {
    try {
      await apiFetch(`/api/teams/${slug}/convites/${c.id}`, { method: 'DELETE' });
      setConvites((cur) => cur.filter((x) => x.id !== c.id));
      showToast('Convite revogado.');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  if (convites === null) return <Loading text="A carregar convites…" />;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <button type="button" className="btn btn--primary" style={{ width: '100%' }} disabled={gerando} onClick={gerar}>
        {gerando ? 'A gerar…' : '＋ Gerar novo convite'}
      </button>

      {novoLink ? (
        <div style={{ ...CARD, padding: 12, borderColor: 'rgba(139,92,246,0.4)' }}>
          <div style={{ fontSize: 11, color: 'var(--neon)', fontWeight: 800, marginBottom: 6 }}>NOVO LINK</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input readOnly value={novoLink} onFocus={(e) => e.target.select()} style={{ ...inputStyle, flex: 1 }} />
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => copiar(novoLink)}>Copiar</button>
          </div>
        </div>
      ) : null}

      {convites.length === 0 ? (
        <div className="empty-state"><div className="empty-state__emoji">🔗</div><p className="muted">Sem convites activos.</p></div>
      ) : (
        convites.map((c) => (
          <div key={c.id} style={{ ...CARD, padding: 12, display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              Criado por <b style={{ color: '#fff' }}>{c.criado_por_nome || 'alguém'}</b> · {haQuantoTempo(c.created_at)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Expira em {diasAte(c.expires_at)} dias</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {linkDe(c.token).slice(0, 20)}…
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => copiar(linkDe(c.token))}>Copiar link</button>
              <button type="button" className="btn btn--ghost btn--sm" style={{ borderColor: 'var(--danger)', color: '#fda4af' }} onClick={() => setRevogar(c)}>Revogar</button>
            </div>
          </div>
        ))
      )}

      {revogar ? (
        <ConfirmModal
          texto="Revogar este convite? O link deixa de funcionar."
          perigo
          confirmarLabel="Revogar"
          onConfirm={() => { const c = revogar; setRevogar(null); confirmarRevogar(c); }}
          onCancel={() => setRevogar(null)}
        />
      ) : null}
    </div>
  );
}

// ─── TAB: JOGOS ──────────────────────────────────────────────────────────────
// "até sex, 20 jun · 22:00" para o prazo do RSVP.
function fmtPrazoAdmin(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const data = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${data} · ${hora}`;
}

// Lista compacta de jogadores (avatar + nome) com título opcional.
function ListaUsers({ users, titulo }) {
  if (!users || users.length === 0) return null;
  return (
    <div style={{ marginTop: 8 }}>
      {titulo ? (
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--label-color)', textTransform: 'uppercase', marginBottom: 4 }}>{titulo}</div>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {users.map((u) => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#fff' }}>
            <PlayerAvatar nome={u.nome_jogador || u.nome} avatarUrl={u.avatar_url} sm />
            <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nome_jogador || u.nome || 'Jogador'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Gestão do RSVP de um jogo (admin): abrir / acompanhar / fechar / sortear.
function RSVPAdmin({ gameId, slug, navigate, showToast }) {
  const [info, setInfo] = useState(null);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  const [abrirModal, setAbrirModal] = useState(false);
  const [prazoInput, setPrazoInput] = useState('');
  const [confirmarFechar, setConfirmarFechar] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const d = await apiFetch(`/api/jogos/${gameId}/rsvp`);
      setInfo(d);
      setErro('');
    } catch (e) {
      setErro(e.message);
    }
  }, [gameId]);

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/jogos/${gameId}/rsvp`)
      .then((d) => {
        if (!ativo) return;
        setInfo(d);
        setErro('');
      })
      .catch((e) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, [gameId]);

  // Polling de 30s enquanto o RSVP está aberto (atualização em tempo real).
  useEffect(() => {
    if (!info?.rsvp_aberto || info?.rsvp_fechado) return undefined;
    const t = setInterval(carregar, 30000);
    return () => clearInterval(t);
  }, [info?.rsvp_aberto, info?.rsvp_fechado, carregar]);

  async function abrir() {
    if (!prazoInput) {
      showToast('Indica o prazo de confirmação.', 'error');
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/jogos/${gameId}/rsvp/abrir`, { method: 'POST', body: JSON.stringify({ prazo: new Date(prazoInput).toISOString() }) });
      setAbrirModal(false);
      setPrazoInput('');
      await carregar();
      showToast('RSVP aberto!');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function fechar() {
    setConfirmarFechar(false);
    setBusy(true);
    try {
      await apiFetch(`/api/jogos/${gameId}/rsvp/fechar`, { method: 'POST' });
      await carregar();
      showToast('RSVP fechado.');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  function fazerSorteio() {
    const ids = (info?.confirmados || []).map((u) => u.id);
    navigate(`/equipa/${slug}/jogo/${gameId}`, { state: { rsvpConfirmados: ids } });
  }

  const linha = { marginTop: 12, borderTop: '1px solid #222222', paddingTop: 10 };

  if (!info) {
    return <div style={{ ...linha, fontSize: 12, color: 'var(--text-dim)' }}>{erro || 'A carregar RSVP…'}</div>;
  }

  // C) RSVP FECHADO
  if (info.rsvp_fechado) {
    return (
      <div style={linha}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>RSVP fechado — {info.confirmados.length} confirmados</div>
        <ListaUsers users={info.confirmados} />
        <button type="button" className="btn btn--primary btn--sm" style={{ marginTop: 10 }} onClick={fazerSorteio}>
          Fazer sorteio com confirmados
        </button>
      </div>
    );
  }

  // B) RSVP ABERTO
  if (info.rsvp_aberto) {
    return (
      <div style={linha}>
        <div style={{ fontSize: 12, color: 'var(--neon)', fontWeight: 700 }}>Aberto até {fmtPrazoAdmin(info.rsvp_prazo)}</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
          ✅ {info.confirmados.length} confirmados · ❌ {info.recusados.length} recusados · ⏳ {info.pendentes.length} pendentes
        </div>
        <ListaUsers users={info.confirmados} titulo="Confirmados" />
        <ListaUsers users={info.recusados} titulo="Recusados" />
        <ListaUsers users={info.pendentes} titulo="Pendentes" />
        <button type="button" className="btn btn--ghost btn--sm" style={{ marginTop: 10, borderColor: 'var(--danger)', color: '#fda4af' }} disabled={busy} onClick={() => setConfirmarFechar(true)}>
          Fechar RSVP
        </button>
        {confirmarFechar ? (
          <ConfirmModal texto="Fechar o RSVP? Os pendentes ficam fora." perigo confirmarLabel="Fechar RSVP" onConfirm={fechar} onCancel={() => setConfirmarFechar(false)} />
        ) : null}
      </div>
    );
  }

  // A) SEM RSVP ABERTO
  return (
    <div style={linha}>
      {abrirModal ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Prazo de confirmação</label>
          <input
            type="datetime-local"
            value={prazoInput}
            onChange={(e) => setPrazoInput(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #222222', background: '#0c0c0c', color: '#fff', fontSize: 13 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={abrir}>Confirmar</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAbrirModal(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn--purple btn--sm" onClick={() => setAbrirModal(true)}>📋 Abrir RSVP</button>
      )}
    </div>
  );
}

function TabJogos({ slug, showToast, navigate }) {
  const [games, setGames] = useState(null);
  const [editar, setEditar] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null);

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/teams/${slug}/games`)
      .then((d) => ativo && setGames(d.games || []))
      .catch((e) => ativo && (setGames([]), showToast(e.message, 'error')));
    return () => {
      ativo = false;
    };
  }, [slug, showToast]);

  const [now] = useState(() => Date.now());
  const { futuros, passados } = useMemo(() => {
    const f = [];
    const p = [];
    for (const g of games || []) {
      const fut = g.data && new Date(g.data).getTime() > now && g.status !== 'cancelado' && g.status !== 'terminado';
      (fut ? f : p).push(g);
    }
    return { futuros: f, passados: p };
  }, [games, now]);

  async function cancelar(g) {
    try {
      await apiFetch(`/api/games/${g.id}/cancelar`, { method: 'PATCH' });
      setGames((cur) => cur.map((x) => (x.id === g.id ? { ...x, status: 'cancelado' } : x)));
      showToast('Jogo cancelado.');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  async function apagar(g) {
    try {
      await apiFetch(`/api/games/${g.id}`, { method: 'DELETE' });
      setGames((cur) => cur.filter((x) => x.id !== g.id));
      showToast('Jogo apagado.');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  function onEditado(updated) {
    setGames((cur) => cur.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
    setEditar(null);
    showToast('Jogo actualizado!');
  }

  if (games === null) return <Loading text="A carregar jogos…" />;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <div className="games-label">Futuros</div>
        {futuros.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>Sem jogos futuros.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {futuros.map((g) => (
              <div key={g.id} style={{ ...CARD, padding: 12 }}>
                <div style={{ fontWeight: 700, color: '#fff' }}>{g.local || 'Jogo'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                  {formatDateTime(g.data)} · {g.confirmados} confirmados
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditar(g)}>Editar</button>
                  <button type="button" className="btn btn--ghost btn--sm" style={{ borderColor: 'var(--danger)', color: '#fda4af' }} onClick={() => setConfirmacao({ tipo: 'cancelar', jogo: g })}>Cancelar jogo</button>
                  {g.confirmados === 0 ? (
                    <button type="button" className="btn btn--ghost btn--sm" style={{ color: '#fda4af' }} onClick={() => setConfirmacao({ tipo: 'apagar', jogo: g })}>Apagar</button>
                  ) : null}
                </div>
                <RSVPAdmin gameId={g.id} slug={slug} navigate={navigate} showToast={showToast} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="games-label">Passados</div>
        {passados.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>Sem jogos passados.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {passados.map((g) => (
              <div key={g.id} style={{ ...CARD, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#fff' }}>{g.local || 'Jogo'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{formatDateTime(g.data)}</div>
                </div>
                <span className={`badge badge--${g.status}`}>{STATUS_LABELS[g.status] || g.status}</span>
                <button type="button" className="btn btn--purple btn--sm" onClick={() => navigate(`/equipa/${slug}/jogo/${g.id}`)}>Ver resultado</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {editar ? <EditarJogoModal jogo={editar} onClose={() => setEditar(null)} onSaved={onEditado} showToast={showToast} /> : null}

      {confirmacao ? (
        <ConfirmModal
          texto={confirmacao.tipo === 'cancelar' ? 'Cancelar este jogo?' : 'Apagar este jogo? Esta ação é irreversível.'}
          perigo
          confirmarLabel={confirmacao.tipo === 'cancelar' ? 'Cancelar jogo' : 'Apagar'}
          onConfirm={() => {
            const { tipo, jogo } = confirmacao;
            setConfirmacao(null);
            if (tipo === 'cancelar') cancelar(jogo);
            else apagar(jogo);
          }}
          onCancel={() => setConfirmacao(null)}
        />
      ) : null}
    </div>
  );
}

function EditarJogoModal({ jogo, onClose, onSaved, showToast }) {
  const pad = (n) => String(n).padStart(2, '0');
  const d0 = new Date(jogo.data);
  const [date, setDate] = useState(`${d0.getFullYear()}-${pad(d0.getMonth() + 1)}-${pad(d0.getDate())}`);
  const [time, setTime] = useState(`${pad(d0.getHours())}:${pad(d0.getMinutes())}`);
  const [local, setLocal] = useState(jogo.local || '');
  const [porTime, setPorTime] = useState(jogo.jogadores_por_time || 5);
  const [saving, setSaving] = useState(false);

  async function guardar() {
    if (saving) return;
    setSaving(true);
    try {
      const { game } = await apiFetch(`/api/games/${jogo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ date, time, location: local.trim(), players_per_team: Number(porTime) }),
      });
      onSaved(game);
    } catch (e) {
      showToast(e.message, 'error');
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={() => !saving && onClose()}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-card__inner" style={{ textAlign: 'left', display: 'grid', gap: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, textAlign: 'center', margin: 0 }}>Editar jogo</h2>
          <label style={{ display: 'grid', gap: 6 }}><span style={lbl}>Data</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} /></label>
          <label style={{ display: 'grid', gap: 6 }}><span style={lbl}>Hora</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} /></label>
          <label style={{ display: 'grid', gap: 6 }}><span style={lbl}>Local</span><input value={local} onChange={(e) => setLocal(e.target.value)} style={inputStyle} /></label>
          <label style={{ display: 'grid', gap: 6 }}><span style={lbl}>Jogadores por time</span><NumberStepper value={porTime} onChange={setPorTime} min={2} max={11} /></label>
          <button type="button" className="btn btn--primary" style={{ width: '100%' }} disabled={saving} onClick={guardar}>{saving ? 'A guardar…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: RESULTADOS ─────────────────────────────────────────────────────────
function TabResultados({ slug, showToast }) {
  const [games, setGames] = useState(null);
  const [registar, setRegistar] = useState(null);
  const [modo, setModo] = useState('sem'); // 'sem' | 'com'

  function carregar() {
    return apiFetch(`/api/teams/${slug}/games`)
      .then((d) => setGames(d.games || []))
      .catch((e) => {
        setGames([]);
        showToast(e.message, 'error');
      });
  }

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/teams/${slug}/games`)
      .then((d) => ativo && setGames(d.games || []))
      .catch((e) => ativo && (setGames([]), showToast(e.message, 'error')));
    return () => {
      ativo = false;
    };
  }, [slug, showToast]);

  const semResultado = useMemo(
    () => (games || []).filter((g) => g.sorteio_realizado && (g.campeao_time_index === null || g.campeao_time_index === undefined)),
    [games]
  );
  const comResultado = useMemo(
    () => (games || []).filter((g) => g.campeao_time_index !== null && g.campeao_time_index !== undefined),
    [games]
  );

  async function onGuardado() {
    setRegistar(null);
    await carregar();
    showToast('Resultado guardado! Aparece na Resenha.');
  }

  if (games === null) return <Loading text="A carregar jogos…" />;
  const lista = modo === 'sem' ? semResultado : comResultado;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* Toggle */}
      <div className="chips-row">
        <button type="button" className={`chip ${modo === 'sem' ? 'chip--active tab-shine' : ''}`} onClick={() => setModo('sem')}>Sem resultado</button>
        <button type="button" className={`chip ${modo === 'com' ? 'chip--active tab-shine' : ''}`} onClick={() => setModo('com')}>Com resultado</button>
      </div>

      {lista.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__emoji">🏆</div>
          <p className="muted">{modo === 'sem' ? 'Nenhum jogo à espera de resultado.' : 'Nenhum jogo com resultado.'}</p>
        </div>
      ) : (
        lista.map((g) => (
          <div key={g.id} style={{ ...CARD, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: '#fff' }}>{g.local || 'Jogo'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                {formatDateTime(g.data)}
                {modo === 'com' ? ` · Time ${(g.campeao_time_index ?? 0) + 1} venceu` : ' · Sem resultado registado'}
              </div>
            </div>
            <button type="button" className={`btn btn--sm ${modo === 'sem' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setRegistar(g)}>
              {modo === 'sem' ? 'Registar resultado' : 'Editar resultado'}
            </button>
          </div>
        ))
      )}

      {registar ? <ResultadoModal jogo={registar} onClose={() => setRegistar(null)} onSaved={onGuardado} showToast={showToast} /> : null}
    </div>
  );
}

function ResultadoModal({ jogo, onClose, onSaved, showToast }) {
  const [detail, setDetail] = useState(null);
  const [campeaoIdx, setCampeaoIdx] = useState(null);
  const [campeaoFoto, setCampeaoFoto] = useState(null);
  const [temArt, setTemArt] = useState(false);
  const [artId, setArtId] = useState('');
  const [artGols, setArtGols] = useState(1);
  const [temDest, setTemDest] = useState(false);
  const [destId, setDestId] = useState('');
  const [destTitulo, setDestTitulo] = useState('');
  const [temRodada, setTemRodada] = useState(false);
  const [rodadaId, setRodadaId] = useState('');
  const [rodadaFoto, setRodadaFoto] = useState(null);
  const [saving, setSaving] = useState(false);

  // Carrega o detalhe do jogo e pré-preenche (edição de resultado existente).
  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/games/${jogo.id}`)
      .then((d) => {
        if (!ativo) return;
        setDetail(d);
        const g = d.game || {};
        if (g.campeao_time_index !== null && g.campeao_time_index !== undefined) setCampeaoIdx(g.campeao_time_index);
        if (g.campeao_foto_url) setCampeaoFoto(g.campeao_foto_url);
        if (g.artilheiro_user_id) {
          setTemArt(true);
          setArtId(g.artilheiro_user_id);
          setArtGols(g.artilheiro_gols || 1);
        }
        if (g.destaque_user_id) {
          setTemDest(true);
          setDestId(g.destaque_user_id);
          setDestTitulo(g.destaque_titulo || '');
        }
        if (g.rodada_user_id) {
          setTemRodada(true);
          setRodadaId(g.rodada_user_id);
          if (g.rodada_foto_url) setRodadaFoto(g.rodada_foto_url);
        }
      })
      .catch((e) => ativo && showToast(e.message, 'error'));
    return () => {
      ativo = false;
    };
  }, [jogo.id, showToast]);

  const times = detail?.game?.times_resultado?.times || [];
  const confirmados = (detail?.players || []).filter((p) => p.confirmado);

  async function guardar() {
    if (saving || campeaoIdx === null) return;
    setSaving(true);
    try {
      const patch = { campeao_time_index: campeaoIdx };
      if (campeaoFoto) patch.campeao_foto_url = campeaoFoto;
      // Artilheiro/destaque/rodada: envia ou limpa conforme o toggle.
      patch.artilheiro_user_id = temArt && artId ? artId : null;
      patch.artilheiro_gols = temArt && artId ? Math.max(1, Number(artGols) || 1) : null;
      patch.destaque_user_id = temDest && destId ? destId : null;
      patch.destaque_titulo = temDest && destId ? destTitulo.trim() || null : null;
      patch.rodada_user_id = temRodada && rodadaId ? rodadaId : null;
      if (temRodada && rodadaId && rodadaFoto) patch.rodada_foto_url = rodadaFoto;
      const res = await apiFetch(`/api/feed/games/${jogo.id}/resultado`, { method: 'PATCH', body: JSON.stringify(patch) });
      if (res?.game?.rodada_user_id) celebrarCerveja();
      onSaved(jogo.id);
    } catch (e) {
      showToast(e.message, 'error');
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={() => !saving && onClose()}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-card__inner" style={{ textAlign: 'left', display: 'grid', gap: 16, maxHeight: '82vh', overflowY: 'auto' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, textAlign: 'center', margin: 0 }}>Resultado — {formatDateTime(jogo.data)}</h2>

          {!detail ? (
            <Loading text="A carregar jogo…" />
          ) : (
            <>
              {/* 1. CAMPEÃO */}
              <div style={{ display: 'grid', gap: 8 }}>
                <span style={secLbl}>🏆 Campeão</span>
                {times.length === 0 ? (
                  <p className="muted" style={{ fontSize: 12 }}>Este jogo não tem times sorteados.</p>
                ) : (
                  times.map((t, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCampeaoIdx(i)}
                      style={{ textAlign: 'left', padding: 10, borderRadius: 10, cursor: 'pointer', border: `1px solid ${campeaoIdx === i ? 'var(--neon)' : '#222'}`, background: campeaoIdx === i ? 'rgba(139,92,246,0.1)' : 'transparent', color: '#fff' }}
                    >
                      <div style={{ fontWeight: 700 }}>{t.nome || `Time ${i + 1}`}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{(t.jogadores || []).map((p) => p.nome).join(' · ')}</div>
                    </button>
                  ))
                )}
                <UploadComCrop onUpload={(url) => setCampeaoFoto(url)} accept="image/*" aspect={4 / 3} label={campeaoFoto ? '✓ Foto do campeão' : '📷 Foto do campeão'} />
              </div>

              {/* 2. ARTILHEIRO */}
              <Seccao titulo="⚽ Artilheiro" ligado={temArt} onToggle={setTemArt}>
                <SelectJogador value={artId} onChange={setArtId} confirmados={confirmados} />
                <label style={{ display: 'grid', gap: 6 }}><span style={lbl}>Nº de gols</span><input type="number" min={1} value={artGols} onChange={(e) => setArtGols(e.target.value)} style={inputStyle} /></label>
              </Seccao>

              {/* 3. DESTAQUE */}
              <Seccao titulo="⭐ Destaque" ligado={temDest} onToggle={setTemDest}>
                <SelectJogador value={destId} onChange={setDestId} confirmados={confirmados} />
                <label style={{ display: 'grid', gap: 6 }}><span style={lbl}>Título</span><input value={destTitulo} onChange={(e) => setDestTitulo(e.target.value.slice(0, 60))} placeholder="Ex: Melhor em campo" style={inputStyle} /></label>
              </Seccao>

              {/* 4. RODADA DE CERVEJA */}
              <Seccao titulo="🍺 Rodada de cerveja" ligado={temRodada} onToggle={setTemRodada}>
                <SelectJogador value={rodadaId} onChange={setRodadaId} confirmados={confirmados} />
                <UploadComCrop onUpload={(url) => setRodadaFoto(url)} accept="image/*" aspect={1} label={rodadaFoto ? '✓ Foto da rodada' : '📷 Foto da rodada'} />
              </Seccao>

              <button type="button" className="btn btn--primary" style={{ width: '100%' }} disabled={saving || campeaoIdx === null} onClick={guardar}>
                {saving ? 'A guardar…' : 'Guardar resultado'}
              </button>
              {campeaoIdx === null ? <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>Escolhe o time campeão para guardar.</div> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Seccao({ titulo, ligado, onToggle, children }) {
  return (
    <div style={{ display: 'grid', gap: 8, borderTop: '1px solid #222', paddingTop: 12 }}>
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <span style={secLbl}>{titulo}</span>
        <input type="checkbox" checked={ligado} onChange={(e) => onToggle(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#8b5cf6' }} />
      </label>
      {ligado ? children : null}
    </div>
  );
}

function SelectJogador({ value, onChange, confirmados }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
      <option value="">— Escolher jogador —</option>
      {confirmados.map((p) => (
        <option key={p.user_id} value={p.user_id}>{p.nome}</option>
      ))}
    </select>
  );
}

// ─── TAB: ESTATÍSTICAS ───────────────────────────────────────────────────────
function BarraProgresso({ valor, max }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0;
  return (
    <div style={{ height: 6, background: '#222', borderRadius: 999, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--neon)' }} />
    </div>
  );
}

function TabEstatisticas({ slug, membrosBasicos, showToast }) {
  const [membros, setMembros] = useState(null);
  const [games, setGames] = useState([]);

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/teams/${slug}/membros`)
      .then((d) => ativo && setMembros(d.membros || []))
      .catch((e) => ativo && (setMembros([]), showToast(e.message, 'error')));
    apiFetch(`/api/teams/${slug}/games`).then((d) => ativo && setGames(d.games || [])).catch(() => {});
    return () => {
      ativo = false;
    };
  }, [slug, showToast]);

  if (membros === null) return <Loading text="A carregar estatísticas…" />;

  const topGols = [...membros].sort((a, b) => (b.gols || 0) - (a.gols || 0)).slice(0, 5);
  const maxGols = topGols[0]?.gols || 0;
  const topVitorias = [...membros].sort((a, b) => (b.vitorias || 0) - (a.vitorias || 0)).slice(0, 5);
  const totalGols = membros.reduce((s, m) => s + (m.gols || 0), 0);
  const jogoMaisConf = [...games].sort((a, b) => (b.confirmados || 0) - (a.confirmados || 0))[0] || null;
  const maisAntigo = [...(membrosBasicos || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0] || null;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* Top Jogadores (por gols) */}
      <div>
        <div className="games-label">Top jogadores</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {topGols.map((m) => (
            <div key={m.user_id} style={{ ...CARD, padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
              <PlayerAvatar nome={m.nome_jogador || m.nome || 'Jogador'} avatarUrl={m.avatar_url} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#fff' }}>{m.nome_jogador || m.nome || 'Jogador'}</div>
                <BarraProgresso valor={m.gols || 0} max={maxGols} />
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                  <b style={{ color: 'var(--neon)' }}>{m.gols || 0}</b> gols · {m.vitorias || 0} vitórias · {m.artilharia || 0} artilharia
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Presença (por vitórias) */}
      <div>
        <div className="games-label">Presença</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {topVitorias.map((m) => (
            <div key={m.user_id} style={{ ...CARD, padding: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
              <PlayerAvatar nome={m.nome_jogador || m.nome || 'Jogador'} avatarUrl={m.avatar_url} />
              <div style={{ flex: 1, fontWeight: 700, color: '#fff' }}>{m.nome_jogador || m.nome || 'Jogador'}</div>
              <div style={{ fontSize: 13, color: 'var(--neon)', fontWeight: 800 }}>{m.vitorias || 0} vitórias</div>
            </div>
          ))}
        </div>
      </div>

      {/* Visão geral */}
      <div>
        <div className="games-label">Visão geral</div>
        <div style={{ ...CARD, padding: 14, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={lbl}>Total de gols</span><b style={{ color: '#fff' }}>{totalGols}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={lbl}>Jogo com mais confirmações</span>
            <b style={{ color: '#fff', textAlign: 'right' }}>{jogoMaisConf ? `${jogoMaisConf.local || 'Jogo'} (${jogoMaisConf.confirmados || 0})` : '—'}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={lbl}>Membro mais antigo</span>
            <b style={{ color: '#fff', textAlign: 'right' }}>{maisAntigo ? maisAntigo.nome || maisAntigo.email : '—'}</b>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: DENÚNCIAS ──────────────────────────────────────────────────────────
function TabDenuncias({ showToast }) {
  const [denuncias, setDenuncias] = useState(null);
  const [confirmar, setConfirmar] = useState(null);

  useEffect(() => {
    let ativo = true;
    apiFetch('/api/feed/denuncias')
      .then((d) => ativo && setDenuncias(d.denuncias || []))
      .catch((e) => ativo && (setDenuncias([]), showToast(e.message, 'error')));
    return () => {
      ativo = false;
    };
  }, [showToast]);

  async function resolver(d, apagar) {
    try {
      await apiFetch(`/api/feed/denuncias/${d.id}/resolver`, { method: 'PATCH', body: JSON.stringify({ apagar_conteudo: apagar }) });
      setDenuncias((cur) => cur.filter((x) => x.id !== d.id));
      showToast(apagar ? 'Conteúdo apagado.' : 'Denúncia resolvida.');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  if (denuncias === null) return <Loading text="A carregar denúncias…" />;
  if (denuncias.length === 0) {
    return (
      <div className="empty-state" style={{ borderColor: 'rgba(139,92,246,0.4)' }}>
        <div className="empty-state__emoji">✅</div>
        <p className="muted">Sem denúncias pendentes.</p>
      </div>
    );
  }

  const MOTIVO_LABEL = { linguagem_inapropriada: 'Linguagem inapropriada', spam: 'Spam', conteudo_ofensivo: 'Conteúdo ofensivo', outro: 'Outro' };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {denuncias.map((d) => (
        <div key={d.id} style={{ ...CARD, padding: 12, display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {d.target_type === 'post' ? 'Post' : 'Comentário'} · <span style={{ color: '#fda4af', fontWeight: 700 }}>{MOTIVO_LABEL[d.motivo] || d.motivo}</span>
          </div>
          {d.conteudo ? (
            <div style={{ fontSize: 13, color: '#fff', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', background: '#0c0c0c', borderRadius: 8, padding: 8 }}>{d.conteudo}</div>
          ) : <div style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>(conteúdo indisponível)</div>}
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Denunciado por {d.reporter_nome || 'alguém'} · {haQuantoTempo(d.created_at)}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => resolver(d, false)}>Ignorar</button>
            <button type="button" className="btn btn--ghost btn--sm" style={{ borderColor: 'var(--danger)', color: '#fda4af' }} onClick={() => setConfirmar(d)}>Apagar conteúdo</button>
          </div>
        </div>
      ))}

      {confirmar ? (
        <ConfirmModal
          texto="Apagar o conteúdo denunciado?"
          perigo
          confirmarLabel="Apagar"
          onConfirm={() => { const d = confirmar; setConfirmar(null); resolver(d, true); }}
          onCancel={() => setConfirmar(null)}
        />
      ) : null}
    </div>
  );
}

// ─── Itens do menu (sidebar + drawer) ────────────────────────────────────────
function MenuItems({ tab, onPick }) {
  return (
    <div style={{ display: 'grid' }}>
      {MENU.map((m) => {
        const on = tab === m.k;
        return (
          <button
            key={m.k}
            type="button"
            onClick={() => onPick(m.k)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              textAlign: 'left',
              padding: '11px 14px',
              border: 'none',
              borderLeft: `3px solid ${on ? '#8b5cf6' : 'transparent'}`,
              background: on ? 'rgba(139,92,246,0.08)' : 'transparent',
              color: on ? '#fff' : '#555',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 16 }}>{m.icon}</span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── PÁGINA ──────────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const meId = user?.id || null;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'dashboard';

  const [team, setTeam] = useState(null);
  const [membrosBasicos, setMembrosBasicos] = useState([]); // de GET /api/teams/:slug (com created_at)
  const [negado, setNegado] = useState(false);
  const [toast, setToast] = useState(null);
  const [drawer, setDrawer] = useState(false);

  function showToast(mensagem, tipo = 'success') {
    setToast({ mensagem, tipo });
  }
  function irTab(k) {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('tab', k);
      return p;
    }, { replace: true });
    setDrawer(false);
  }

  // Carrega a equipa e verifica acesso de admin.
  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/teams/${slug}`)
      .then((d) => {
        if (!ativo) return;
        if (d.team?.role !== 'admin') {
          setNegado(true);
          navigate(`/equipa/${slug}`, { replace: true });
          return;
        }
        setTeam(d.team);
        setMembrosBasicos(d.members || []);
      })
      .catch(() => {
        if (!ativo) return;
        setNegado(true);
        navigate(`/equipa/${slug}`, { replace: true });
      });
    return () => {
      ativo = false;
    };
  }, [slug, navigate]);

  if (negado) return null;

  return (
    <div className="app-shell">
      <style>{ADMIN_CSS}</style>

      {/* Header do painel */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' }}>
        <Link to={`/equipa/${slug}`} className="topbar-back" style={{ flexShrink: 0 }}>← Voltar</Link>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {team?.nome || 'Admin'}
        </div>
        <button
          type="button"
          className="admin-burger"
          aria-label="Menu"
          onClick={() => setDrawer(true)}
          style={{ alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, border: '1px solid #222', background: 'transparent', color: '#fff', fontSize: 18, cursor: 'pointer' }}
        >
          ☰
        </button>
        <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, color: '#b69cff', border: '1px solid var(--purple)', borderRadius: 999, padding: '3px 8px' }}>ADMIN</span>
      </header>
      <div className="app-topbar__line" />

      {!team ? (
        <main className="app-main"><Loading text="A carregar…" /></main>
      ) : (
        <div className="admin-layout">
          <aside className="admin-sidebar">
            <MenuItems tab={tab} onPick={irTab} />
          </aside>

          <main className="admin-content">
            <div style={{ maxWidth: 760, margin: '0 auto' }}>
              {tab === 'dashboard' && <TabDashboard slug={slug} navigate={navigate} onGoTab={irTab} showToast={showToast} />}
              {tab === 'equipa' && <TabEquipa slug={slug} team={team} showToast={showToast} />}
              {tab === 'membros' && <TabMembros slug={slug} meId={meId} showToast={showToast} />}
              {tab === 'convites' && <TabConvites slug={slug} showToast={showToast} />}
              {tab === 'jogos' && <TabJogos slug={slug} showToast={showToast} navigate={navigate} />}
              {tab === 'resultados' && <TabResultados slug={slug} showToast={showToast} />}
              {tab === 'estatisticas' && <TabEstatisticas slug={slug} membrosBasicos={membrosBasicos} showToast={showToast} />}
              {tab === 'denuncias' && <TabDenuncias showToast={showToast} />}
            </div>
          </main>
        </div>
      )}

      {/* Drawer mobile */}
      {drawer ? (
        <div role="presentation" onClick={() => setDrawer(false)} style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: '#0a0a0a', borderTopLeftRadius: 18, borderTopRightRadius: 18, borderTop: '1px solid #1a1a1a', padding: '10px 0 16px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, borderRadius: 999, background: '#333', margin: '6px auto 10px' }} />
            <MenuItems tab={tab} onPick={irTab} />
          </div>
        </div>
      ) : null}

      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
