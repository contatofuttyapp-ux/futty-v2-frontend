// Futty v2.0 — Perfil (/perfil): a página mais pessoal — define como o
// utilizador aparece em todo o lado. Sem Topbar, mobile-first, dark theme.
import { useEffect, useState } from 'react';
import { apiFetch, assetUrl } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useTeams } from '../hooks/useTeam';
import { iniciaisNome } from '../utils/avatar';
import { formatRating } from '../utils/format';
import UploadComCrop from '../components/UploadComCrop';
import Toast from '../components/Toast';
import '../styles/app.css';

// Cores de uniforme (hex explícito do briefing; azul/cinzento não estão no theme).
const COR_HEX = {
  preto: '#1a1a1a',
  verde: '#00e5a0',
  azul: '#3b82f6',
  vermelho: '#ef4444',
  amarelo: '#f59e0b',
  cinzento: '#888888',
};
const UNIFORMES = [
  { k: 'preto', label: 'PADRÃO' },
  { k: 'verde' },
  { k: 'azul' },
  { k: 'vermelho' },
  { k: 'amarelo' },
  { k: 'cinzento' },
];

// Avatares genéricos existentes em /public/avatares/genericos (frontend).
// (Exclui verde/azul/vermelho.png, que são fallback de uniforme.)
const GENERICOS = [
  'Tigre.png', 'Leão.png', 'Ninja.png', 'Robot New.png', 'Robot Junk.png',
  'Astronauta.png', 'ET.png', 'Gladiador.png', 'Lesma.png', 'Onça.png',
  'Peixe boi.png', 'Tatu.png', 'Preguiça.png', 'Jacaré.png', 'Petisco.png',
  'bola.png', 'carta_fut.png', 'chuteira.png',
];

const CARD = { background: '#111111', border: '1px solid #222222', borderRadius: 12 };

// Resolve o avatar_url para um src utilizável: http(s) intacto; /avatares/ é do
// frontend (encode espaços/acentos); o resto (ex.: /public/...) vai ao backend.
function resolveAvatar(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/avatares/')) return encodeURI(url);
  return assetUrl(url);
}

function genericoSrc(file) {
  return encodeURI(`/avatares/genericos/${file}`);
}

// Label de secção (uppercase cinzento).
function SecLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--text-dim)', textTransform: 'uppercase', margin: '22px 0 10px' }}>
      {children}
    </div>
  );
}

// Avatar do cartão de stats (glow na cor do uniforme).
function StatsAvatar({ url, nome, cor, size = 80, onClick }) {
  const [falhou, setFalhou] = useState(false);
  const src = resolveAvatar(url);
  const glow = COR_HEX[cor] || '#00e5a0';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Editar avatar"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        padding: 0,
        cursor: 'pointer',
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg-elev)',
        color: '#fff',
        fontWeight: 800,
        fontSize: Math.round(size * 0.34),
        border: `2px solid ${glow}`,
        boxShadow: `0 0 18px ${glow}66`,
      }}
    >
      {src && !falhou ? (
        <img src={src} alt="" onError={() => setFalhou(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        iniciaisNome(nome)
      )}
    </button>
  );
}

export default function MeuPerfil() {
  const { user, signOut } = useAuth();
  const { teams } = useTeams();
  const isAdmin = teams.some((t) => t.role === 'admin');

  const [perfil, setPerfil] = useState(null); // { user, stats }
  const [erro, setErro] = useState('');
  const [toast, setToast] = useState(null);
  const [avatarAberto, setAvatarAberto] = useState(false);
  const [savingDados, setSavingDados] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    let ativo = true;
    apiFetch('/api/me')
      .then((d) => ativo && setPerfil(d))
      .catch((e) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, []);

  function showToast(mensagem, tipo = 'success') {
    setToast({ mensagem, tipo });
  }

  // Atualiza um campo localmente (sem gravar — só para os inputs de texto).
  function setField(k, v) {
    setPerfil((p) => (p ? { ...p, user: { ...p.user, [k]: v } } : p));
  }

  // PATCH com update optimista; reverte em caso de erro.
  async function patchMe(patch) {
    const prev = perfil;
    setPerfil((p) => (p ? { ...p, user: { ...p.user, ...patch } } : p));
    try {
      const res = await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify(patch) });
      setPerfil((p) => (p ? { ...p, user: { ...p.user, ...res.user } } : p));
      return true;
    } catch (e) {
      setPerfil(prev);
      showToast(e.message, 'error');
      return false;
    }
  }

  async function guardarDados() {
    if (savingDados) return;
    setSavingDados(true);
    const u = perfil.user;
    const ok = await patchMe({ nome: u.nome || null, nome_jogador: u.nome_jogador || null, telefone: u.telefone || null });
    setSavingDados(false);
    if (ok) showToast('Dados guardados!');
  }

  async function escolherGenerico(file) {
    const ok = await patchMe({ avatar_url: `/avatares/genericos/${file}` });
    if (ok) showToast('Avatar atualizado!');
  }

  async function aoEnviarFoto(url) {
    const ok = await patchMe({ avatar_url: url });
    if (ok) showToast('Avatar atualizado!');
  }

  async function escolherCor(cor) {
    await patchMe({ cor_preferida: cor });
  }

  if (!perfil) {
    return (
      <div className="app-shell">
        <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
          <h1 className="app-page-title">O meu perfil</h1>
          {erro ? <div className="alert alert--error">{erro}</div> : <p className="muted">A carregar…</p>}
        </main>
      </div>
    );
  }

  const u = perfil.user;
  const stats = perfil.stats || {};
  const nomeMostrar = u.nome_jogador || u.nome || (u.email || '').split('@')[0] || 'Jogador';
  const creditos = u.avatar_ia_creditos ?? 3;
  const corSel = u.cor_preferida || null;

  return (
    <div className="app-shell">
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
        <h1 className="app-page-title">O meu perfil</h1>
        <p className="app-page-sub" style={{ marginBottom: 16 }}>Como apareces em todo o lado.</p>

        {erro ? <div className="alert alert--error" style={{ marginBottom: 12 }}>{erro}</div> : null}

        {/* 1. CARTÃO DE STATS */}
        <div style={{ ...CARD, padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
          <StatsAvatar url={u.avatar_url} nome={nomeMostrar} cor={corSel} onClick={() => setAvatarAberto((v) => !v)} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{nomeMostrar}</div>
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-dim)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ color: 'var(--neon)', fontWeight: 800 }}>{stats.nota != null ? formatRating(stats.nota) : '--'}</span>
              <span>·</span>
              <span><b style={{ color: '#fff' }}>{stats.jogos ?? 0}</b> jogos</span>
              <span>·</span>
              <span><b style={{ color: '#fff' }}>{stats.gols ?? 0}</b> gols</span>
            </div>
          </div>
        </div>

        {/* 2. SECÇÃO AVATAR */}
        <SecLabel>Avatar</SecLabel>
        {!avatarAberto ? (
          <button
            type="button"
            onClick={() => setAvatarAberto(true)}
            style={{ ...CARD, width: '100%', padding: 12, color: 'var(--text-dim)', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}
          >
            Toca no avatar (ou aqui) para personalizar →
          </button>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {/* A) Criar avatar com IA (em breve) */}
            <button
              type="button"
              onClick={() => showToast('Em breve!', 'info')}
              style={{
                position: 'relative',
                ...CARD,
                padding: 16,
                textAlign: 'left',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, rgba(0,229,160,0.10), rgba(124,58,237,0.12))',
                borderColor: 'rgba(124,58,237,0.4)',
              }}
            >
              <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: '#b69cff', background: 'rgba(124,58,237,0.2)', border: '1px solid var(--purple)', borderRadius: 999, padding: '3px 8px' }}>
                EM BREVE
              </span>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>✨ Criar avatar com IA</div>
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-dim)' }}>
                {creditos} {creditos === 1 ? 'criação gratuita' : 'criações gratuitas'} · depois é pago
              </div>
            </button>

            {/* B) Enviar foto (crop 2:3) */}
            <div style={{ ...CARD, padding: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Enviar foto</div>
              <UploadComCrop onUpload={aoEnviarFoto} accept="image/*" aspect={2 / 3} label="📷 Escolher foto" />
            </div>

            {/* C) Galeria de genéricos */}
            <div style={{ ...CARD, padding: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>Ou escolhe um avatar:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {GENERICOS.map((file) => {
                  const path = `/avatares/genericos/${file}`;
                  const sel = u.avatar_url === path;
                  return (
                    <button
                      key={file}
                      type="button"
                      onClick={() => escolherGenerico(file)}
                      title={file.replace(/\.png$/, '')}
                      style={{ padding: 0, border: `2px solid ${sel ? 'var(--neon)' : 'transparent'}`, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', background: 'var(--bg-elev)', lineHeight: 0 }}
                    >
                      <img src={genericoSrc(file)} alt="" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 3. SECÇÃO UNIFORME */}
        <SecLabel>Uniforme</SecLabel>
        <div style={{ ...CARD, padding: 14, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {UNIFORMES.map(({ k, label }) => {
            const sel = corSel === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => escolherCor(k)}
                aria-label={`Uniforme ${k}`}
                aria-pressed={sel}
                title={label ? `${k} (padrão)` : k}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  background: COR_HEX[k],
                  border: sel ? '2px solid #fff' : '2px solid #333',
                  boxShadow: sel ? `0 0 12px ${COR_HEX[k]}aa` : 'none',
                }}
              />
            );
          })}
        </div>

        {/* 4. SECÇÃO DADOS */}
        <SecLabel>Dados</SecLabel>
        <div style={{ ...CARD, padding: 14, display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Nome de jogador</span>
            <input
              value={u.nome_jogador || ''}
              onChange={(e) => setField('nome_jogador', e.target.value.slice(0, 30))}
              placeholder="Como te chamam no campo?"
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Nome completo</span>
            <input value={u.nome || ''} onChange={(e) => setField('nome', e.target.value.slice(0, 60))} placeholder="Nome completo" style={inputStyle} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Telefone</span>
            <input type="tel" value={u.telefone || ''} onChange={(e) => setField('telefone', e.target.value.slice(0, 20))} placeholder="+351 912 345 678" style={inputStyle} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Email</span>
            <div style={{ ...inputStyle, color: 'var(--text-dim)' }}>{u.email || user?.email || '—'}</div>
          </label>
          <button type="button" className="btn btn--primary" style={{ width: '100%' }} disabled={savingDados} onClick={guardarDados}>
            {savingDados ? 'A guardar…' : 'Guardar dados'}
          </button>
        </div>

        {/* 5. SECÇÃO CONTA */}
        <SecLabel>Conta</SecLabel>
        <div style={{ ...CARD, overflow: 'hidden' }}>
          <ContaRow onClick={() => showToast('Em breve', 'info')}>🔑 Alterar password</ContaRow>
          <ContaRow onClick={() => { window.location.href = 'mailto:suporte@futty.app'; }}>📋 Relatar um problema</ContaRow>
          {isAdmin ? (
            <ContaRow onClick={() => showToast('Em breve', 'info')} cor="#b69cff">🛡️ Painel de administração</ContaRow>
          ) : null}
          <ContaRow onClick={() => setConfirmSignOut(true)} cor="#fda4af" semBorda>Terminar sessão</ContaRow>
        </div>
      </main>

      {/* Modal confirmar sign out */}
      {confirmSignOut ? (
        <div className="modal-overlay" role="presentation" onClick={() => setConfirmSignOut(false)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__inner">
              <p style={{ fontSize: 15, marginBottom: 16 }}>Tens a certeza que queres terminar sessão?</p>
              <button type="button" className="btn btn--primary" style={{ width: '100%', background: 'var(--danger)', color: '#fff' }} onClick={() => signOut()}>
                Terminar sessão
              </button>
              <button type="button" className="btn btn--ghost btn--sm" style={{ width: '100%', marginTop: 10 }} onClick={() => setConfirmSignOut(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

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

// Linha de ação da secção Conta.
function ContaRow({ children, onClick, cor = '#fff', semBorda = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '14px 16px',
        border: 'none',
        borderBottom: semBorda ? 'none' : '1px solid #222222',
        background: 'transparent',
        color: cor,
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
