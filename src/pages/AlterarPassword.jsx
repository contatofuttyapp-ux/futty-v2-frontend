// Futty v2.0 — Alterar password (/alterar-password).
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Topbar from '../components/Topbar';
import Toast from '../components/Toast';
import '../styles/app.css';

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 44px 12px 14px',
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.03)',
  color: '#fff',
  fontSize: 16, // abaixo de 16 o iPhone dá zoom ao focar (Rodada 8A, ver index.css)
  fontFamily: "'Rajdhani', sans-serif",
  clipPath: 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)',
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
          {mostrar ? <EyeOff size={18} /> : <Eye size={18} />}
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
      setToast({ tipo: 'error', mensagem: 'A senha precisa ter pelo menos 6 caracteres.' });
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
      <Topbar hud="ALTERAR SENHA" back="/perfil" />
      <main className="app-main page-reveal">
        <p className="muted" style={{ fontSize: 13, margin: '4px 0 16px' }}>Escolha uma nova senha (mínimo 6 caracteres).</p>

        <div style={{ display: 'grid', gap: 14, maxWidth: 420 }}>
          <CampoPassword label="Nova senha" value={nova} onChange={setNova} />
          <CampoPassword label="Confirmar senha" value={confirmar} onChange={setConfirmar} />
          <button type="button" className="btn hud-corners-s cta-gold" style={{ width: '100%', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }} disabled={busy} onClick={guardar}>
            {busy ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </div>
      </main>

      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
