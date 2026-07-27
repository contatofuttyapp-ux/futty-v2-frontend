// Futty v2.0 — Painel super-admin (/super?tab=...). Só super-admins (protegido
// por SuperAdminGuard). Gestão global: utilizadores, equipas e métricas.
import { useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useApi } from '../hooks/useApi';
import EstadoErroRede from '../components/EstadoErroRede';
import '../styles/app.css';

const CARD = { background: '#111111', border: '1px solid #222222', borderRadius: 12 };
const PLANOS = ['free', 'pro', 'elite'];
const TABS = [
  { k: 'users', label: 'Usuários' },
  { k: 'teams', label: 'Times' },
  { k: 'denuncias', label: 'Denúncias' },
  { k: 'stats', label: 'Stats' },
];
const PAGE_SIZE = 50;

const btn = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #2a2a2a',
  background: '#0c0c0c',
  color: '#fff',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};
const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #222' };
const td = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid #1a1a1a', verticalAlign: 'middle' };

function fmtData(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function MetricCard({ valor, label }) {
  return (
    <div style={{ ...CARD, padding: 18, textAlign: 'center' }}>
      <div style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>{valor}</div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ─── TAB: UTILIZADORES ───────────────────────────────────────────────────────
function TabUsers({ showMsg }) {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(`/api/super/users?page=${page}&limit=${PAGE_SIZE}`);
  const users = data?.users || [];
  const total = data?.total || 0;

  async function mudarPlano(u, plano) {
    const atual = u.plan || 'free';
    if (plano === atual) return;
    // Confirmação antes de agir (nome do alvo + ação bem visíveis). Nada ao 1º toque.
    if (!window.confirm(`Mudar o plano de ${u.email} de "${atual}" para "${plano}"?`)) {
      reload(); // cancelado → resync o select ao plano real
      return;
    }
    try {
      await apiFetch(`/api/super/users/${u.id}/plano`, { method: 'PATCH', body: JSON.stringify({ plano }) });
      showMsg('Plano atualizado.');
      reload();
    } catch (err) {
      showMsg(err.message, true);
      reload();
    }
  }

  async function definirSuspensao(u, suspenso) {
    const verbo = suspenso ? 'suspender' : 'reativar';
    if (!window.confirm(`Confirma ${verbo} a conta de ${u.email}?`)) return;
    try {
      await apiFetch(`/api/super/users/${u.id}/suspender`, { method: 'PATCH', body: JSON.stringify({ suspenso }) });
      showMsg(suspenso ? 'Conta suspensa.' : 'Conta reativada.');
      reload();
    } catch (err) {
      showMsg(err.message, true);
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (error) return <div style={{ ...CARD, padding: 14, color: 'var(--danger)' }}>{error}</div>;

  return (
    <div>
      <div style={{ ...CARD, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead>
            <tr>
              <th style={th}>Nome</th>
              <th style={th}>Email</th>
              <th style={th}>Plano</th>
              <th style={th}>Estado</th>
              <th style={th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={u.suspenso ? { opacity: 0.6 } : undefined}>
                <td style={td}>{u.nome || '—'}{u.is_super_admin ? ' (super)' : ''}</td>
                <td style={td}>{u.email}</td>
                <td style={td}>
                  <select value={u.plan || 'free'} onChange={(e) => mudarPlano(u, e.target.value)} style={{ ...btn, padding: '5px 8px' }}>
                    {PLANOS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </td>
                <td style={td}>
                  {u.suspenso
                    ? <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 12 }}>Suspensa</span>
                    : <span style={{ color: '#7bd88f', fontSize: 12 }}>Ativa</span>}
                </td>
                <td style={td}>
                  {u.suspenso
                    ? <button type="button" style={btn} onClick={() => definirSuspensao(u, false)}>Reativar</button>
                    : <button type="button" style={{ ...btn, borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => definirSuspensao(u, true)}>Suspender</button>}
                </td>
              </tr>
            ))}
            {!users.length && !loading && (
              <tr><td style={td} colSpan={5}>Sem usuários.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          {total} usuários · página {page}/{totalPaginas}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={btn} disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Anterior</button>
          <button type="button" style={btn} disabled={page >= totalPaginas || loading} onClick={() => setPage((p) => p + 1)}>Próxima →</button>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: EQUIPAS ────────────────────────────────────────────────────────────
function TabTeams({ showMsg }) {
  const { data, loading, error, reload } = useApi('/api/super/teams');
  const teams = data?.teams || [];

  async function apagar(t) {
    const resp = window.prompt(`Você vai APAGAR o time "${t.nome}" e todos os seus dados (jogos, membros, votos…). Isso é irreversível.\n\nEscreva APAGAR para confirmar:`);
    if (resp !== 'APAGAR') {
      if (resp !== null) showMsg('Confirmação incorreta — nada apagado.', true);
      return;
    }
    try {
      await apiFetch(`/api/super/teams/${t.id}`, { method: 'DELETE', body: JSON.stringify({ confirmar: 'APAGAR' }) });
      showMsg('Time apagado.');
      reload();
    } catch (err) {
      showMsg(err.message, true);
    }
  }

  async function definirSuspensao(t, suspensa) {
    const verbo = suspensa ? 'suspender' : 'reativar';
    if (!window.confirm(`Confirma ${verbo} o time "${t.nome}"?`)) return;
    try {
      await apiFetch(`/api/super/teams/${t.id}/suspender`, { method: 'PATCH', body: JSON.stringify({ suspensa }) });
      showMsg(suspensa ? 'Time suspenso (invisível e inativo).' : 'Time reativado.');
      reload();
    } catch (err) {
      showMsg(err.message, true);
    }
  }

  if (error) return <div style={{ ...CARD, padding: 14, color: 'var(--danger)' }}>{error}</div>;

  return (
    <div style={{ ...CARD, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
        <thead>
          <tr>
            <th style={th}>Nome</th>
            <th style={th}>Slug</th>
            <th style={th}>Membros</th>
            <th style={th}>Criado</th>
            <th style={th}>Estado</th>
            <th style={th}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t) => (
            <tr key={t.id} style={t.suspensa ? { opacity: 0.6 } : undefined}>
              <td style={td}>{t.nome}</td>
              <td style={td}><code style={{ color: 'var(--text-dim)' }}>{t.slug}</code></td>
              <td style={td}>{t.nr_membros}</td>
              <td style={td}>{fmtData(t.created_at)}</td>
              <td style={td}>
                {t.suspensa
                  ? <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 12 }}>Suspenso</span>
                  : <span style={{ color: '#7bd88f', fontSize: 12 }}>Ativo</span>}
              </td>
              <td style={td}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {t.suspensa
                    ? <button type="button" style={btn} onClick={() => definirSuspensao(t, false)}>Reativar</button>
                    : <button type="button" style={{ ...btn, borderColor: '#f0a35a', color: '#f0a35a' }} onClick={() => definirSuspensao(t, true)}>Suspender</button>}
                  <button type="button" style={{ ...btn, borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => apagar(t)}>Apagar</button>
                </div>
              </td>
            </tr>
          ))}
          {!teams.length && !loading && (
            <tr><td style={td} colSpan={6}>Sem times.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── TAB: DENÚNCIAS (fila acionável global) ──────────────────────────────────
// LEI: a Super vê o conteúdo denunciado SÓ aqui (alguém pediu revisão); nunca navega
// conteúdo por vontade própria. Cada decisão entra no log append-only do caso.
function TabDenuncias({ showMsg }) {
  const { data, loading, error, reload } = useApi('/api/super/denuncias/fila');
  const fila = data?.fila || [];

  async function decidir(c, acao) {
    const rotulo = { manter: 'MANTER o conteúdo', remover: 'REMOVER o conteúdo', suspender_autor: 'REMOVER e SUSPENDER o autor' }[acao];
    // Confirmação antes de agir (ação + alvo bem visíveis). Nada ao 1º toque.
    if (!window.confirm(`Denúncia «${c.categoria}» (${c.target_type}).\n\nConfirma: ${rotulo}?`)) return;
    try {
      await apiFetch(`/api/super/denuncias/${c.id}/decidir`, { method: 'POST', body: JSON.stringify({ team_id: c.team_id, acao }) });
      showMsg('Decisão registrada no log.');
      reload();
    } catch (err) {
      showMsg(err.message, true);
    }
  }

  if (error) return <EstadoErroRede onRepetir={reload} />;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>
        A IA subiu estes casos (não os resolveu sozinha). O conteúdo aparece porque alguém pediu revisão. Menores no topo.
      </p>
      {fila.map((c) => (
        <div key={c.id} style={{ ...CARD, padding: 14, borderColor: c.prioritaria ? 'var(--danger)' : '#222' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
            {c.prioritaria ? <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 6, padding: '2px 7px' }}>MENOR · PRIORITÁRIO</span> : null}
            <span style={{ fontWeight: 700 }}>{c.categoria}</span>
            <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>· {c.target_type} · {fmtData(c.criado_em)}</span>
          </div>
          {c.preview_texto ? <p style={{ margin: '0 0 8px', fontSize: 13, color: '#ddd', wordBreak: 'break-word' }}>{c.preview_texto}</p> : null}
          {c.preview_media ? <img src={c.preview_media} alt="conteúdo denunciado" style={{ maxWidth: 180, maxHeight: 180, borderRadius: 8, border: '1px solid #333', display: 'block', marginBottom: 8 }} /> : null}
          {c.descricao ? <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-dim)' }}>Nota do denunciante: {c.descricao}</p> : null}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" style={btn} onClick={() => decidir(c, 'manter')}>Manter</button>
            <button type="button" style={{ ...btn, borderColor: '#f0a35a', color: '#f0a35a' }} onClick={() => decidir(c, 'remover')}>Remover</button>
            <button type="button" style={{ ...btn, borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => decidir(c, 'suspender_autor')}>Remover + suspender autor</button>
          </div>
        </div>
      ))}
      {!fila.length && !loading ? <div style={{ ...CARD, padding: 14, color: 'var(--text-dim)', fontSize: 13 }}>Fila vazia — nada para revisar.</div> : null}
    </div>
  );
}

// ─── TAB: STATS ──────────────────────────────────────────────────────────────
function TabStats() {
  const { data: s, error } = useApi('/api/super/stats');

  if (error) return <div style={{ ...CARD, padding: 14, color: 'var(--danger)' }}>{error}</div>;
  if (!s) return <p style={{ color: 'var(--text-dim)' }}>Carregando métricas…</p>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
      <MetricCard valor={s.total_users} label="Usuários" />
      <MetricCard valor={s.total_teams} label="Times" />
      <MetricCard valor={s.users_pro} label="Plano Pro" />
      <MetricCard valor={s.users_elite} label="Plano Elite" />
      <MetricCard valor={s.users_hoje} label="Usuários hoje" />
      <MetricCard valor={s.teams_hoje} label="Times hoje" />
    </div>
  );
}

export default function Super() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'users';
  const [msg, setMsg] = useState(null); // { texto, erro }
  const msgTimer = useRef(null);

  const showMsg = useCallback((texto, erro = false) => {
    setMsg({ texto, erro });
    window.clearTimeout(msgTimer.current);
    msgTimer.current = window.setTimeout(() => setMsg(null), 3500);
  }, []);

  function irTab(k) {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('tab', k);
      return p;
    });
  }

  return (
    <div className="app-shell">
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
        <h1 className="app-page-title">Super-Admin</h1>
        <p className="app-page-sub">Gestão global de usuários e times.</p>

        <div style={{ display: 'flex', gap: 8, margin: '12px 0 16px' }}>
          {TABS.map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={() => irTab(t.k)}
              style={{ ...btn, padding: '8px 14px', background: tab === t.k ? 'var(--neon)' : '#0c0c0c', borderColor: tab === t.k ? 'var(--neon)' : '#2a2a2a' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {msg && (
          <div style={{ ...CARD, padding: '10px 12px', marginBottom: 12, borderColor: msg.erro ? 'var(--danger)' : '#2a2a2a', color: msg.erro ? 'var(--danger)' : '#fff', fontSize: 13 }}>
            {msg.texto}
          </div>
        )}

        {tab === 'users' && <TabUsers showMsg={showMsg} />}
        {tab === 'teams' && <TabTeams showMsg={showMsg} />}
        {tab === 'denuncias' && <TabDenuncias showMsg={showMsg} />}
        {tab === 'stats' && <TabStats />}
      </main>
    </div>
  );
}
