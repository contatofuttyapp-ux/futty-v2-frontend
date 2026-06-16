// Futty v2.0 — Alterar password (/alterar-password).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Topbar from '../components/Topbar';
import Toast from '../components/Toast';
import '../styles/app.css';

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 44px 10px 12px',
  borderRadius: 10,
  border: '1px solid #222222',
  background: '#0c0c0c',
  color: '#fff',
  fontSize: 14,
};

// Campo de password com toggle mostrar/esconder.
function CampoPassword({ label, value, onChange }) {
  const [mostrar, setMostrar] = useState(false);
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{label}</span>
      <div style={{ position: 'relative' }}>
        <input
          type={mostrar ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          style={inputStyle}
        />
        <button
          type="button"
          aria-label={mostrar ? 'Esconder senha' : 'Mostrar senha'}
          onClick={() => setMostrar((v) => !v)}
          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}
        >
          {mostrar ? '🙈' : '👁️'}
        </button>
      </div>
    </label>
  );
}

export default function AlterarPassword() {
  const navigate = useNavigate();
  const [nova, setNova] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  async function guardar() {
    if (busy) return;
    if (nova.length < 6) {
      setToast({ tipo: 'error', mensagem: 'A senha tem de ter pelo menos 6 caracteres.' });
      return;
    }
    if (nova !== confirmar) {
      setToast({ tipo: 'error', mensagem: 'As senhas não coincidem.' });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: nova });
      if (error) throw error;
      setToast({ tipo: 'success', mensagem: 'Senha alterada com sucesso!' });
      setTimeout(() => navigate('/perfil'), 1500);
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e?.message || 'Erro ao alterar a senha.' });
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <Topbar back="/perfil" title="ALTERAR SENHA" />
      <main className="app-main">
        <h1 className="app-page-title">Alterar senha</h1>
        <p className="app-page-sub">Escolhe uma nova senha (mínimo 6 caracteres).</p>

        <div style={{ display: 'grid', gap: 14, maxWidth: 420 }}>
          <CampoPassword label="Nova senha" value={nova} onChange={setNova} />
          <CampoPassword label="Confirmar senha" value={confirmar} onChange={setConfirmar} />
          <button type="button" className="btn btn--primary" style={{ width: '100%' }} disabled={busy} onClick={guardar}>
            {busy ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </div>
      </main>

      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
