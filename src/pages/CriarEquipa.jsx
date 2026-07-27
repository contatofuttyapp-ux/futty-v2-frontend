// Futty v2.0 — Criar equipa: o WIZARD do admin (4 passos, SPEC-EQUIPAS v2).
// A página antiga (formulário único com selector de cor) morreu: a cor é fallback
// automático interno (o backend cai para 'verde'; muda-se nas definições do admin).
// Passos: (1) nome + preview do escudo-iniciais ao vivo → POST /api/teams ·
// (2) toggles "como funciona" (mostrar_gols persiste; artilheiro/destaque = em breve) ·
// (3) política de entrada → PATCH modo_visibilidade · (4) convites (link + WhatsApp).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import Topbar from '../components/Topbar';
import Toast from '../components/Toast';
import { copiarTexto } from '../utils/clipboard';
import '../styles/app.css';

const RAJ = "'Rajdhani', sans-serif";
const CLIP_S = 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)';
const CLIP = 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)';
const VIDRO = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)' };

const iniciais = (s) => s.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

function Cta({ children, cheio, sec, ...rest }) {
  return (
    <button
      type="button"
      {...rest}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: RAJ, fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase',
        padding: '13px 20px', cursor: 'pointer', width: '100%', clipPath: CLIP_S,
        color: cheio ? '#1a1408' : sec ? '#c9c2d6' : '#f0c94a',
        background: cheio ? 'linear-gradient(180deg,#f0c94a,#d4a017)' : sec ? 'rgba(255,255,255,0.03)' : 'rgba(30,24,8,0.9)',
        border: cheio ? '1px solid #f4dd6a' : sec ? '1.5px solid rgba(255,255,255,0.25)' : '1.5px solid #d4a017',
        opacity: rest.disabled ? 0.5 : 1,
        ...(rest.style || {}),
      }}
    >
      {children}
    </button>
  );
}

function Lbl({ children }) {
  return <span style={{ fontFamily: RAJ, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#9a8fc0', textTransform: 'uppercase', display: 'block', margin: '14px 0 6px' }}>{children}</span>;
}

// Mini-radar do preview (5 ou 3 eixos) — o efeito do toggle mostrar_gols.
function MiniRadar({ n }) {
  const R = 20, cx = 27, cy = 27;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = ((-90 + i * (360 / n)) * Math.PI) / 180;
    return [cx + Math.cos(a) * R, cy + Math.sin(a) * R].join(',');
  }).join(' ');
  return (
    <svg viewBox="0 0 54 54" style={{ width: 54, height: 54, flexShrink: 0 }}>
      <polygon points={pts} fill="rgba(139,92,246,0.25)" stroke="#8b5cf6" strokeWidth="1.5" />
    </svg>
  );
}

function Toggle({ on, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={on} style={{ width: 38, height: 20, borderRadius: 20, background: on ? 'rgba(212,160,23,0.55)' : 'rgba(255,255,255,0.12)', position: 'relative', flexShrink: 0, cursor: disabled ? 'default' : 'pointer', border: 'none', opacity: disabled ? 0.45 : 1 }}>
      <i style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 16, height: 16, borderRadius: '50%', background: on ? '#f0c94a' : '#fff', transition: 'left .2s' }} />
    </button>
  );
}

export default function CriarEquipa() {
  const navigate = useNavigate();
  const [passo, setPasso] = useState(1);
  const [nome, setNome] = useState('');
  const [mostrarGols, setMostrarGols] = useState(true);
  const [modo, setModo] = useState('privado'); // privado | publico_aprovacao | publico_aberto
  const [team, setTeam] = useState(null); // criada no fim do passo 3
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  // Passo 3 → cria a equipa de uma vez (nome → POST; flags → PATCH) e segue p/ convites.
  async function criarESeguir() {
    if (busy) return;
    setBusy(true);
    try {
      // Sem cor no body: o backend cai para o fallback interno ('verde'); muda-se
      // depois nas definições do admin (decisão: cor despromovida, SPEC-EQUIPAS).
      const { team: t } = await apiFetch('/api/teams', { method: 'POST', body: JSON.stringify({ nome: nome.trim() }) });
      // P2-12: a equipa já existe aqui. Se o PATCH das definições falhar, NÃO
      // dizer "erro a criar" — a equipa nasceu; segue-se para convites e avisa-se
      // que a definição ficou por aplicar (ajusta-se no admin).
      const patch = {};
      if (!mostrarGols) patch.mostrar_gols = false;
      if (modo !== 'privado') patch.modo_visibilidade = modo;
      if (Object.keys(patch).length) {
        try {
          await apiFetch(`/api/teams/${t.slug}`, { method: 'PATCH', body: JSON.stringify(patch) });
        } catch {
          setToast({ tipo: 'error', mensagem: 'Time criado — mas a definição (gols/visibilidade) falhou. Ajuste no admin.' });
        }
      }
      setTeam(t);
      setPasso(4);
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function gerarConvite() {
    if (busy || !team) return;
    setBusy(true);
    try {
      const { token } = await apiFetch(`/api/teams/${team.slug}/convite`, { method: 'POST' });
      setInviteLink(`${window.location.origin}/convite/${token}`);
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function copiar() {
    const ok = await copiarTexto(inviteLink);
    setCopied(ok);
    if (!ok) setToast({ tipo: 'error', mensagem: 'Não deu para copiar — copie o link à mão.' });
  }

  const waHref = inviteLink ? `https://wa.me/?text=${encodeURIComponent(`Entre no meu time ${nome.trim()} no Futty: ${inviteLink}`)}` : null;

  return (
    <div className="app-shell">
      <Topbar hud="CRIAR TIME" back="/home" />
      <main className="app-main page-reveal" style={{ maxWidth: 480 }}>
        {/* barra de progresso 1-4 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0 20px' }}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} style={{ flex: 1, height: 3, background: n <= passo ? 'linear-gradient(90deg,#d4a017,#f0c94a)' : 'rgba(255,255,255,0.10)', boxShadow: n <= passo ? '0 0 8px rgba(212,160,23,0.5)' : 'none' }} />
          ))}
          <span style={{ fontFamily: RAJ, fontSize: 11, color: '#9a8fc0', letterSpacing: '0.08em' }}>{passo}/4</span>
        </div>

        {passo === 1 && (
          <>
            <h1 style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 20, margin: '0 0 4px' }}>Dê nome ao seu time</h1>
            <p className="muted" style={{ fontSize: 12, margin: '0 0 14px' }}>O escudo nasce das iniciais — veja-o se formar enquanto você escreve.</p>
            <Lbl>Nome do time</Lbl>
            <input className="input input--hud" value={nome} maxLength={40} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Domingueira FC" style={{ width: '100%', fontFamily: RAJ, fontSize: 15 }} />
            <div style={{ width: 110, height: 110, display: 'grid', placeItems: 'center', fontFamily: RAJ, fontWeight: 800, fontSize: 38, color: '#fff', background: 'rgba(255,255,255,0.04)', border: '2.5px solid #8b5cf6', margin: '22px auto 6px', clipPath: 'polygon(20% 0, 80% 0, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0 80%, 0 20%)', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}>
              {iniciais(nome)}
            </div>
            <p className="muted" style={{ fontSize: 11, textAlign: 'center', maxWidth: 290, margin: '0 auto', lineHeight: 1.5 }}>
              seu escudo — as iniciais são sua marca; carregue o <b style={{ color: '#c9a24a' }}>logo do time</b> no painel de admin (com moderação).
            </p>
            <div style={{ marginTop: 24 }}>
              <Cta cheio disabled={!nome.trim()} onClick={() => setPasso(2)}>Continuar</Cta>
            </div>
          </>
        )}

        {passo === 2 && (
          <>
            <h1 style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 20, margin: '0 0 4px' }}>Como funciona o seu time?</h1>
            <p className="muted" style={{ fontSize: 12, margin: '0 0 14px' }}>Cada escolha mostra o efeito. Você pode mudar tudo depois no painel de admin.</p>
            <div style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10 }}>
              <MiniRadar n={mostrarGols ? 5 : 3} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 14 }}>Mostrar gols</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                  {mostrarGols ? 'radar de 5 eixos + tile Gols e troféu Artilheiro' : 'radar cai para 3 — presença · vitórias · destaque'}
                </div>
              </div>
              <Toggle on={mostrarGols} onClick={() => setMostrarGols(!mostrarGols)} />
            </div>
            <div style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 14 }}>Artilheiro do dia</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>troféu no fim de cada jogo</div>
              </div>
              <Toggle on disabled />
            </div>
            <div style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 14 }}>Destaque do dia</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>o MVP votado pelo time</div>
              </div>
              <Toggle on disabled />
            </div>
            <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
              <Cta cheio onClick={() => setPasso(3)}>Continuar</Cta>
              <Cta sec onClick={() => setPasso(1)}>← voltar</Cta>
            </div>
          </>
        )}

        {passo === 3 && (
          <>
            <h1 style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 20, margin: '0 0 4px' }}>Aceita novos membros?</h1>
            <p className="muted" style={{ fontSize: 12, margin: '0 0 14px' }}>Como se entra no seu time.</p>
            {[
              { k: 'privado', t: 'Fechada', d: 'só por convite do admin' },
              { k: 'publico_aprovacao', t: 'Com aprovação', d: 'pedem no Explorar, você aprova' },
              { k: 'publico_aberto', t: 'Aberta', d: 'qualquer um entra pelo Explorar' },
            ].map((o) => (
              <button key={o.k} type="button" onClick={() => setModo(o.k)} style={{ ...VIDRO, clipPath: CLIP, display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px', marginBottom: 8, cursor: 'pointer', borderColor: modo === o.k ? 'rgba(212,160,23,0.65)' : 'rgba(255,255,255,0.10)', background: modo === o.k ? 'rgba(212,160,23,0.08)' : 'rgba(255,255,255,0.03)', color: 'inherit' }}>
                <span style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 14, display: 'block', color: modo === o.k ? '#f0c94a' : '#fff' }}>{o.t}</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{o.d}</span>
              </button>
            ))}
            <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
              <Cta cheio onClick={criarESeguir} disabled={busy}>{busy ? 'Criando…' : 'Criar o time'}</Cta>
              <Cta sec onClick={() => setPasso(2)} disabled={busy}>← voltar</Cta>
            </div>
          </>
        )}

        {passo === 4 && team && (
          <>
            <h1 style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 20, margin: '0 0 4px' }}>Chame o seu time</h1>
            <p className="muted" style={{ fontSize: 12, margin: '0 0 14px' }}>O <b style={{ color: '#f0c94a' }}>{team.nome}</b> está criado. O link é válido 7 dias — e você pode pular este passo.</p>
            {inviteLink ? (
              <>
                <Lbl>Link de convite</Lbl>
                <input className="input input--hud" readOnly value={inviteLink} onFocus={(e) => e.target.select()} style={{ width: '100%', color: '#f0c94a' }} />
                <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                  <Cta onClick={copiar}>{copied ? 'Copiado!' : 'Copiar link'}</Cta>
                  <a href={waHref} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
                    <Cta sec style={{ color: '#7bd88f', borderColor: 'rgba(123,216,143,0.45)', background: 'rgba(123,216,143,0.06)' }}>Compartilhar no WhatsApp</Cta>
                  </a>
                </div>
              </>
            ) : (
              <Cta onClick={gerarConvite} disabled={busy}>{busy ? 'Gerando…' : 'Gerar link de convite'}</Cta>
            )}
            <div style={{ marginTop: 22 }}>
              <Cta cheio onClick={() => navigate(`/equipa/${team.slug}`)}>Ir para o time</Cta>
            </div>
          </>
        )}
      </main>
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
