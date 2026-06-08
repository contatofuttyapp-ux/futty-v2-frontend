// Futty v2.0 — Perfil (/perfil): a página mais pessoal — define como o
// utilizador aparece em todo o lado. Sem Topbar, mobile-first, dark theme.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useTeams } from '../hooks/useTeam';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { formatRating } from '../utils/format';
import UploadComCrop from '../components/UploadComCrop';
import PlayerAvatar from '../components/PlayerAvatar';
import Toast from '../components/Toast';
import '../styles/app.css';

// Avatares genéricos existentes em /public/avatares/genericos (frontend).
// (Exclui verde/azul/vermelho.png, que são fallback de uniforme.)
const GENERICOS = [
  'Tigre.png', 'Leão.png', 'Ninja.png', 'Robot New.png', 'Robot Junk.png',
  'Astronauta.png', 'ET.png', 'Gladiador.png', 'Lesma.png', 'Onça.png',
  'Peixe boi.png', 'Tatu.png', 'Preguiça.png', 'Jacaré.png', 'Petisco.png',
  'bola.png', 'carta_fut.png', 'chuteira.png',
];

const CARD = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 };

function genericoSrc(file) {
  return encodeURI(`/avatares/genericos/${file}`);
}

// Label de secção (uppercase cinzento).
function SecLabel({ children }) {
  return (
    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', margin: '22px 0 8px' }}>
      {children}
    </div>
  );
}

export default function MeuPerfil() {
  const { user, signOut } = useAuth();
  const { teams } = useTeams();
  const navigate = useNavigate();
  const { estado: pushEstado, subscrever: pushSubscrever, dessubscrever: pushDessubscrever } = usePushNotifications();
  const adminTeams = teams.filter((t) => t.role === 'admin');
  const [adminPicker, setAdminPicker] = useState(false);

  // Vai para o painel de admin (ou abre selector se for admin de várias equipas).
  function irParaAdmin() {
    if (adminTeams.length === 1) navigate(`/admin/${adminTeams[0].slug}`);
    else if (adminTeams.length > 1) setAdminPicker(true);
  }

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

  // Abre o cliente de email; se não houver, mostra o email para copiar.
  function relatarProblema() {
    window.location.href = 'mailto:suporte@futty.app?subject=Problema%20no%20Futty';
    setTimeout(() => {
      showToast('Email: suporte@futty.app', 'info');
    }, 500);
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

  return (
    <div className="app-shell">
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
        <h1 className="app-page-title" style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: '#ffffff' }}>O meu perfil</h1>
        <p className="app-page-sub" style={{ marginBottom: 16, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Como apareces em todo o lado.</p>

        {erro ? <div className="alert alert--error" style={{ marginBottom: 12 }}>{erro}</div> : null}

        {/* 1. HEADER SIMPLES (avatar + nome + email) */}
        <div style={{ ...CARD, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            role="button"
            tabIndex={0}
            aria-label="Editar avatar"
            onClick={() => setAvatarAberto((v) => !v)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setAvatarAberto((v) => !v)}
            style={{ cursor: 'pointer', lineHeight: 0, flexShrink: 0 }}
          >
            <PlayerAvatar nome={nomeMostrar} avatarUrl={u.avatar_url} gold size={64} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeMostrar}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email || ''}</div>
          </div>
        </div>

        {/* Stats por baixo do header */}
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13, color: 'var(--text-dim)' }}>
          <span style={{ color: 'var(--neon)', fontWeight: 800 }}>{stats.nota != null ? formatRating(stats.nota) : '--'}</span>
          <span>·</span>
          <span><b style={{ color: '#fff' }}>{stats.jogos ?? 0}</b> jogos</span>
          <span>·</span>
          <span><b style={{ color: '#fff' }}>{stats.gols ?? 0}</b> gols</span>
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
                background: 'linear-gradient(135deg, rgba(139,92,246,0.10), rgba(124,58,237,0.12))',
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

        {/* 3. SECÇÃO DADOS */}
        <SecLabel>Dados</SecLabel>
        <div className="perfil-form" style={{ ...CARD, padding: 14, display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Nome de jogador</span>
            <input
              value={u.nome_jogador || ''}
              onChange={(e) => setField('nome_jogador', e.target.value.slice(0, 30))}
              placeholder="Como te chamam no campo?"
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Nome completo</span>
            <input value={u.nome || ''} onChange={(e) => setField('nome', e.target.value.slice(0, 60))} placeholder="Nome completo" style={inputStyle} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Telefone</span>
            <input type="tel" value={u.telefone || ''} onChange={(e) => setField('telefone', e.target.value.slice(0, 20))} placeholder="+351 912 345 678" style={inputStyle} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Email</span>
            <div style={{ ...inputStyle, color: 'var(--text-dim)' }}>{u.email || user?.email || '—'}</div>
          </label>
          <button type="button" className="btn btn--purple" style={{ width: '100%' }} disabled={savingDados} onClick={guardarDados}>
            {savingDados ? 'A guardar…' : 'Guardar dados'}
          </button>
        </div>

        {/* 5. SECÇÃO CONTA */}
        <SecLabel>Conta</SecLabel>
        <div style={{ ...CARD, overflow: 'hidden' }}>
          {pushEstado !== 'nao_suportado' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>🔔 Notificações push</span>
              <input
                type="checkbox"
                checked={pushEstado === 'subscrito'}
                disabled={pushEstado === 'negado'}
                onChange={(e) => (e.target.checked ? pushSubscrever() : pushDessubscrever())}
                style={{ width: 20, height: 20, accentColor: '#8b5cf6' }}
              />
            </div>
          ) : null}
          <ContaRow onClick={() => navigate('/alterar-password')}>🔑 Alterar password</ContaRow>
          <ContaRow onClick={relatarProblema}>📋 Relatar um problema</ContaRow>
          {adminTeams.length > 0 ? (
            <ContaRow onClick={irParaAdmin} cor="#8b5cf6">🛡️ Painel de administração</ContaRow>
          ) : null}
          <ContaRow onClick={() => setConfirmSignOut(true)} cor="rgba(239,68,68,0.8)" semBorda>Terminar sessão</ContaRow>
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

      {/* Selector de equipa (admin de várias) */}
      {adminPicker ? (
        <div className="modal-overlay" role="presentation" onClick={() => setAdminPicker(false)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__inner" style={{ textAlign: 'left' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, textAlign: 'center' }}>Escolhe a equipa</h2>
              <div style={{ display: 'grid', gap: 8 }}>
                {adminTeams.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="btn btn--ghost"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                    onClick={() => {
                      setAdminPicker(false);
                      navigate(`/admin/${t.slug}`);
                    }}
                  >
                    {t.nome}
                  </button>
                ))}
              </div>
              <button type="button" className="btn btn--ghost btn--sm" style={{ width: '100%', marginTop: 10 }} onClick={() => setAdminPicker(false)}>
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
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: '#ffffff',
  fontSize: 14,
};

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
