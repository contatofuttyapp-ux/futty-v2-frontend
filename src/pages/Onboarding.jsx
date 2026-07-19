// Futty v2.0 — Onboarding dia-1 (3 passos): boas-vindas → FOTO (quase-obrigatória)
// → identidade. Só para REGISTOS NOVOS (o Register navega para cá; contas antigas
// nunca passam aqui). Pede SÓ o que o dia-1 usa — equipa entra-se/cria-se no Início.
// Foto: selfie (capture="user") OU galeria → CropModal da casa (1:1) → POST /api/me/avatar.
// "Deixar para depois" só aparece aos ~4s; quem salta leva o card persistente no Início.
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, apiUpload } from '../lib/api';
import { urlAsset } from '../utils/avatar';
import FuttyLogo from '../components/FuttyLogo';
import CropModal from '../components/CropModal';
import Toast from '../components/Toast';
import '../styles/app.css';

const RAJ = "'Rajdhani', sans-serif";
const CLIP_S = 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)';
const OCTO = 'polygon(12% 0, 88% 0, 100% 12%, 100% 88%, 88% 100%, 12% 100%, 0 88%, 0 12%)';
const GRAD_NOME = 'linear-gradient(90deg, #fff2cc 0%, #f0c94a 38%, #d4a017 50%, #f0c94a 62%, #fff2cc 100%)';

function Titulo({ children, size = 26 }) {
  return (
    <h2 style={{ fontFamily: RAJ, fontWeight: 800, fontSize: size, letterSpacing: '0.03em', textAlign: 'center', margin: '18px 0 6px', background: GRAD_NOME, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
      {children}
    </h2>
  );
}

function Cta({ children, cheio, sec, ...rest }) {
  return (
    <button
      type="button"
      {...rest}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        fontFamily: RAJ, fontWeight: 800, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase',
        padding: '15px 20px', cursor: 'pointer', width: '100%', clipPath: CLIP_S,
        color: cheio ? '#1a1408' : sec ? '#c9c2d6' : '#f0c94a',
        background: cheio ? 'linear-gradient(180deg,#f0c94a,#d4a017)' : sec ? 'rgba(255,255,255,0.03)' : 'rgba(30,24,8,0.9)',
        border: cheio ? '1px solid #f4dd6a' : sec ? '1.5px solid rgba(255,255,255,0.25)' : '1.5px solid #d4a017',
        ...(rest.style || {}),
      }}
    >
      {children}
    </button>
  );
}

// Moldura V1 grande — vazia (gancho) ou preenchida (a foto cai aqui ao vivo).
function MolduraFoto({ src, size = 170 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', overflow: 'hidden', background: 'linear-gradient(0deg, rgba(255,255,255,0.03), rgba(255,255,255,0.03)), #101012', clipPath: OCTO, border: '1.5px solid rgba(212,160,23,0.5)', animation: src ? 'none' : undefined, boxShadow: '0 0 18px rgba(212,160,23,0.3)' }}>
        {src ? (
          <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', gap: 8, color: 'rgba(255,255,255,0.35)' }}>
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="rgba(212,160,23,0.65)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
            <span style={{ fontFamily: RAJ, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>o teu lugar</span>
          </div>
        )}
      </div>
      {[['-4px', '-4px', 'borderRight', 'borderBottom'], ['-4px', 'auto', 'borderLeft', 'borderBottom'], ['auto', 'auto', 'borderLeft', 'borderTop'], ['auto', '-4px', 'borderRight', 'borderTop']].map(([top, left, b1, b2], i) => (
        <span key={i} style={{ position: 'absolute', width: 22, height: 22, border: '2px solid #d4a017', pointerEvents: 'none', top, left, right: left === 'auto' ? '-4px' : 'auto', bottom: top === 'auto' ? '-4px' : 'auto', [b1]: 'none', [b2]: 'none' }} />
      ))}
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [passo, setPasso] = useState(1);
  const [cropFile, setCropFile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null); // preenchida após upload
  const [enviando, setEnviando] = useState(false);
  const [nome, setNome] = useState('');
  const [gr, setGr] = useState(null); // 'GL' | 'linha' | null (opcional)
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState(null);
  const selfieRef = useRef(null);
  const galeriaRef = useRef(null);

  function escolherFicheiro(e) {
    const f = e.target.files?.[0];
    if (f) setCropFile(f);
    e.target.value = '';
  }

  // Crop confirmado → sobe já (POST /api/me/avatar) e a foto CAI na moldura.
  async function subirRecorte(blob) {
    setCropFile(null);
    setEnviando(true);
    try {
      const file = new File([blob], 'onboarding.jpg', { type: 'image/jpeg' });
      const res = await apiUpload('/api/me/avatar', file, 'avatar');
      setAvatarUrl(res.avatar_url || res.foto_url || null);
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
    } finally {
      setEnviando(false);
    }
  }

  // Fim: nome de jogador (PATCH /api/me) + preferência GR (aplica-se na 1ª equipa).
  async function concluir() {
    setSalvando(true);
    try {
      if (nome.trim()) await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify({ nome_jogador: nome.trim().slice(0, 18) }) });
      if (gr === 'GL') localStorage.setItem('futty_pref_gr', 'GL');
      navigate('/home', { replace: true });
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
      setSalvando(false);
    }
  }

  const prog = (
    <div style={{ position: 'absolute', top: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8, zIndex: 3 }}>
      {[1, 2, 3].map((n) => (
        <i key={n} style={{ width: 26, height: 3, background: n <= passo ? 'linear-gradient(90deg,#d4a017,#f0c94a)' : 'rgba(255,255,255,0.12)', boxShadow: n <= passo ? '0 0 8px rgba(212,160,23,0.5)' : 'none' }} />
      ))}
    </div>
  );

  return (
    <div className="app-shell" style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '46px 24px 32px', maxWidth: 480, margin: '0 auto', width: '100%' }}>
        {prog}

        {passo === 1 && (
          <>
            <div className="futty-f-bob"><div className="futty-f-sway">
              <FuttyLogo variant="flat" size={110} />
            </div></div>
            <Titulo>BEM-VINDO AO FUTTY</Titulo>
            <div style={{ fontFamily: RAJ, fontSize: 14, letterSpacing: '0.14em', color: '#c9c2d6', textTransform: 'uppercase', textAlign: 'center', marginTop: 6 }}>
              feito para quem <b style={{ color: '#f0c94a' }}>joga de verdade</b>
            </div>
            <div style={{ width: '100%', maxWidth: 290, marginTop: 38 }}>
              <Cta cheio onClick={() => setPasso(2)}>Começar</Cta>
            </div>
          </>
        )}

        {passo === 2 && (
          <>
            <MolduraFoto src={avatarUrl ? urlAsset(avatarUrl) : null} />
            <Titulo size={24}>A TUA FIGURINHA<br />COMEÇA AQUI</Titulo>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', margin: '0 0 22px', lineHeight: 1.55, maxWidth: 290 }}>
              É esta cara que entra no cromo, no ranking e no sorteio. A foto cai aqui, ao vivo, mal fizeres o crop.
            </p>
            {avatarUrl ? (
              <div style={{ width: '100%', maxWidth: 290, display: 'grid', gap: 10 }}>
                <Cta cheio onClick={() => setPasso(3)}>Continuar</Cta>
                <Cta sec onClick={() => galeriaRef.current?.click()}>Trocar a foto</Cta>
              </div>
            ) : (
              <>
                <div style={{ width: '100%', maxWidth: 290, display: 'grid', gap: 10 }}>
                  <Cta onClick={() => selfieRef.current?.click()} disabled={enviando}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
                    {enviando ? 'A enviar…' : 'Tirar foto agora'}
                  </Cta>
                  <Cta sec onClick={() => galeriaRef.current?.click()} disabled={enviando}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                    Escolher da galeria
                  </Cta>
                </div>
                {/* "deixar para depois" — surge aos ~4s (o convite do Início continua até haver foto) */}
                <button
                  type="button"
                  onClick={() => setPasso(3)}
                  style={{ display: 'block', margin: '18px auto 0', background: 'none', border: 'none', color: '#8a8398', fontFamily: RAJ, fontSize: 12, letterSpacing: '0.06em', cursor: 'pointer', opacity: 0, animation: 'onbAparece 0.6s ease 4s forwards' }}
                >
                  deixar para depois
                </button>
              </>
            )}
            <input ref={selfieRef} type="file" accept="image/*" capture="user" hidden onChange={escolherFicheiro} />
            <input ref={galeriaRef} type="file" accept="image/*" hidden onChange={escolherFicheiro} />
          </>
        )}

        {passo === 3 && (
          <>
            <Titulo size={24}>COMO TE CHAMAM<br />EM CAMPO?</Titulo>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', margin: '0 0 22px', lineHeight: 1.55, maxWidth: 290 }}>
              É o nome que aparece no cromo e no ranking — o teu nome de guerra.
            </p>
            <div style={{ width: '100%', maxWidth: 290 }}>
              <label style={{ fontFamily: RAJ, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', margin: '0 0 6px' }}>Nome de jogador</label>
              <input
                className="input input--hud"
                value={nome}
                maxLength={18}
                onChange={(e) => setNome(e.target.value)}
                placeholder="ex.: Chavo"
                style={{ width: '100%', fontFamily: RAJ, fontSize: 17, fontWeight: 700, textAlign: 'center' }}
              />
              <label style={{ fontFamily: RAJ, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', margin: '20px 0 6px' }}>
                És guarda-redes? <em style={{ color: '#6f6a80', textTransform: 'none', letterSpacing: 0, fontStyle: 'normal' }}>(opcional)</em>
              </label>
              <div className="chips-row" style={{ justifyContent: 'center' }}>
                <button type="button" className={`chip ${gr === 'GL' ? 'chip--active' : ''}`} onClick={() => setGr(gr === 'GL' ? null : 'GL')} style={gr !== 'GL' ? { color: '#b69cff', borderColor: 'rgba(139,92,246,0.55)', background: 'rgba(139,92,246,0.08)' } : undefined}>
                  GR — sou guarda-redes
                </button>
                <button type="button" className={`chip ${gr === 'linha' ? 'chip--active' : ''}`} onClick={() => setGr(gr === 'linha' ? null : 'linha')}>
                  Jogo na linha
                </button>
              </div>
              <div style={{ marginTop: 30 }}>
                <Cta cheio onClick={concluir} disabled={salvando}>{salvando ? 'A entrar…' : 'Entrar'}</Cta>
              </div>
              <div style={{ fontSize: 10, color: '#6f6a80', textAlign: 'center', marginTop: 10 }}>
                a posição fina (DEF/MEI/ATA) escolhes na tua equipa — aqui só o que o dia-1 usa
              </div>
            </div>
          </>
        )}
      </main>

      {cropFile ? (
        <CropModal file={cropFile} aspect={1} aspectos={[{ k: '1:1', v: 1 }]} onConfirm={subirRecorte} onCancel={() => setCropFile(null)} />
      ) : null}
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
