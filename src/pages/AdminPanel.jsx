// Futty v2.0 — Painel de Admin por equipa (/admin/:slug).
// Só admins. Tabs: Equipa · Membros · Jogos · Resultados · Denúncias.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { COLOR_OPTIONS } from '../utils/teamColors';
import { formatDateTime, STATUS_LABELS } from '../utils/format';
import Topbar from '../components/Topbar';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import PlayerAvatar from '../components/PlayerAvatar';
import UploadComCrop from '../components/UploadComCrop';
import '../styles/app.css';

const CARD = { background: '#111111', border: '1px solid #222222', borderRadius: 12 };
const TABS = [
  { k: 'equipa', label: '⚙️ Equipa' },
  { k: 'membros', label: '👥 Membros' },
  { k: 'jogos', label: '⚽ Jogos' },
  { k: 'resultados', label: '🏆 Resultados' },
  { k: 'denuncias', label: '🚩 Denúncias' },
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

// ─── TAB 1: EQUIPA ───────────────────────────────────────────────────────────
function TabEquipa({ slug, team, showToast }) {
  const [nome, setNome] = useState(team.nome || '');
  const [cor, setCor] = useState(team.cor || 'verde');
  const [localizacao, setLocalizacao] = useState(team.localizacao || '');
  const [descricao, setDescricao] = useState(team.descricao || '');
  const [publica, setPublica] = useState(!!team.publica);
  const [saving, setSaving] = useState(false);

  async function guardar() {
    if (saving) return;
    setSaving(true);
    try {
      await apiFetch(`/api/teams/${slug}`, {
        method: 'PATCH',
        body: JSON.stringify({ nome: nome.trim(), cor, publica, localizacao: localizacao.trim(), descricao: descricao.trim() }),
      });
      showToast('Equipa actualizada!');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ ...CARD, padding: 14, display: 'grid', gap: 14 }}>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Nome da equipa</span>
        <input value={nome} onChange={(e) => setNome(e.target.value.slice(0, 60))} style={inputStyle} />
      </label>

      <div style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Cor</span>
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
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Localização</span>
        <input value={localizacao} onChange={(e) => setLocalizacao(e.target.value.slice(0, 100))} placeholder="Ex: Lisboa · Campo do Ze" style={inputStyle} />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Descrição</span>
        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value.slice(0, 300))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
      </label>

      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer' }}>
        <div>
          <div style={{ fontWeight: 700 }}>Equipa pública</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{publica ? 'Pública — aparece na pesquisa' : 'Privada — só por convite'}</div>
        </div>
        <input type="checkbox" checked={publica} onChange={(e) => setPublica(e.target.checked)} style={{ width: 20, height: 20, accentColor: '#00e5a0' }} />
      </label>

      <button type="button" className="btn btn--primary" style={{ width: '100%' }} disabled={saving} onClick={guardar}>
        {saving ? 'A guardar…' : 'Guardar'}
      </button>
    </div>
  );
}

// ─── TAB 2: MEMBROS ──────────────────────────────────────────────────────────
function TabMembros({ slug, meId, showToast }) {
  const [membros, setMembros] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null); // { tipo, membro }

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

  if (membros === null) return <Loading text="A carregar membros…" />;

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {membros.map((m) => {
        const ehProprio = m.user_id === meId;
        return (
          <div key={m.user_id} style={{ ...CARD, padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
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
              onClick={() => togglePostar(m)}
              aria-pressed={m.pode_postar}
              title="Pode postar"
              style={{ padding: '5px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${m.pode_postar ? 'var(--neon)' : '#333'}`, background: m.pode_postar ? 'rgba(0,229,160,0.12)' : 'transparent', color: m.pode_postar ? 'var(--neon)' : 'var(--text-dim)', whiteSpace: 'nowrap' }}
            >
              {m.pode_postar ? '✓ Pode postar' : 'Pode postar'}
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
                    <button type="button" onClick={() => { setMenuId(null); setConfirmacao({ tipo: 'remover', membro: m }); }} style={{ ...menuItem, color: '#fda4af' }}>Remover da equipa</button>
                  </div>
                ) : null}
              </div>
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
                : `Remover o admin de ${confirmacao.membro.nome_jogador || confirmacao.membro.nome}?`
          }
          perigo={confirmacao.tipo === 'remover'}
          confirmarLabel={confirmacao.tipo === 'remover' ? 'Remover' : 'Confirmar'}
          onConfirm={() => {
            const { tipo, membro } = confirmacao;
            setConfirmacao(null);
            if (tipo === 'remover') remover(membro);
            else mudarRole(membro, tipo === 'promover' ? 'admin' : 'member');
          }}
          onCancel={() => setConfirmacao(null)}
        />
      ) : null}
    </div>
  );
}

const menuItem = { display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'transparent', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' };

// ─── TAB 3: JOGOS ────────────────────────────────────────────────────────────
function TabJogos({ slug, showToast, navigate }) {
  const [games, setGames] = useState(null);
  const [editar, setEditar] = useState(null); // jogo a editar
  const [confirmacao, setConfirmacao] = useState(null); // { tipo, jogo }

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

      {editar ? <EditarJogoModal slug={slug} jogo={editar} onClose={() => setEditar(null)} onSaved={onEditado} showToast={showToast} /> : null}

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
          <label style={{ display: 'grid', gap: 6 }}><span style={lbl}>Jogadores por time</span><input type="number" min={1} value={porTime} onChange={(e) => setPorTime(e.target.value)} style={inputStyle} /></label>
          <button type="button" className="btn btn--primary" style={{ width: '100%' }} disabled={saving} onClick={guardar}>{saving ? 'A guardar…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

const lbl = { fontSize: 12, color: 'var(--text-dim)' };

// ─── TAB 4: RESULTADOS ───────────────────────────────────────────────────────
function TabResultados({ slug, showToast }) {
  const [games, setGames] = useState(null);
  const [registar, setRegistar] = useState(null);

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

  function onGuardado(gameId) {
    setGames((cur) => cur.filter((g) => g.id !== gameId));
    setRegistar(null);
    showToast('Resultado guardado! Aparece na Resenha.');
  }

  if (games === null) return <Loading text="A carregar jogos…" />;
  if (semResultado.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__emoji">🏆</div>
        <p className="muted">Nenhum jogo à espera de resultado.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {semResultado.map((g) => (
        <div key={g.id} style={{ ...CARD, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: '#fff' }}>{g.local || 'Jogo'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{formatDateTime(g.data)} · Sem resultado registado</div>
          </div>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setRegistar(g)}>Registar resultado</button>
        </div>
      ))}

      {registar ? <ResultadoModal slug={slug} jogo={registar} onClose={() => setRegistar(null)} onSaved={onGuardado} showToast={showToast} /> : null}
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

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/games/${jogo.id}`)
      .then((d) => ativo && setDetail(d))
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
      if (temArt && artId) {
        patch.artilheiro_user_id = artId;
        patch.artilheiro_gols = Math.max(1, Number(artGols) || 1);
      }
      if (temDest && destId) {
        patch.destaque_user_id = destId;
        patch.destaque_titulo = destTitulo.trim() || null;
      }
      if (temRodada && rodadaId) {
        patch.rodada_user_id = rodadaId;
        if (rodadaFoto) patch.rodada_foto_url = rodadaFoto;
      }
      await apiFetch(`/api/feed/games/${jogo.id}/resultado`, { method: 'PATCH', body: JSON.stringify(patch) });
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
                      style={{ textAlign: 'left', padding: 10, borderRadius: 10, cursor: 'pointer', border: `1px solid ${campeaoIdx === i ? 'var(--neon)' : '#222'}`, background: campeaoIdx === i ? 'rgba(0,229,160,0.1)' : 'transparent', color: '#fff' }}
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

const secLbl = { fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text-dim)', textTransform: 'uppercase' };

function Seccao({ titulo, ligado, onToggle, children }) {
  return (
    <div style={{ display: 'grid', gap: 8, borderTop: '1px solid #222', paddingTop: 12 }}>
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <span style={secLbl}>{titulo}</span>
        <input type="checkbox" checked={ligado} onChange={(e) => onToggle(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#00e5a0' }} />
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

// ─── TAB 5: DENÚNCIAS ────────────────────────────────────────────────────────
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
      <div className="empty-state" style={{ borderColor: 'rgba(0,229,160,0.4)' }}>
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

// ─── PÁGINA ──────────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const meId = user?.id || null;

  const [team, setTeam] = useState(null);
  const [negado, setNegado] = useState(false);
  const [tab, setTab] = useState('equipa');
  const [toast, setToast] = useState(null);

  function showToast(mensagem, tipo = 'success') {
    setToast({ mensagem, tipo });
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
      <Topbar back={`/equipa/${slug}`} title="Admin" />
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
        {!team ? (
          <Loading text="A carregar…" />
        ) : (
          <>
            <h1 className="app-page-title" style={{ marginBottom: 12 }}>{team.nome}</h1>

            {/* Tabs */}
            <div className="chips-row" style={{ marginBottom: 14 }}>
              {TABS.map((t) => (
                <button key={t.k} type="button" className={`chip ${tab === t.k ? 'chip--active' : ''}`} onClick={() => setTab(t.k)}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'equipa' && <TabEquipa slug={slug} team={team} showToast={showToast} />}
            {tab === 'membros' && <TabMembros slug={slug} meId={meId} showToast={showToast} />}
            {tab === 'jogos' && <TabJogos slug={slug} showToast={showToast} navigate={navigate} />}
            {tab === 'resultados' && <TabResultados slug={slug} showToast={showToast} />}
            {tab === 'denuncias' && <TabDenuncias showToast={showToast} />}
          </>
        )}
      </main>

      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
