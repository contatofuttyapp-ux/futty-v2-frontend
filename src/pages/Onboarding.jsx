// Futty v2.0 — Onboarding dia-1 (3 passos): boas-vindas → FOTO (quase-obrigatória)
// → identidade. Só para REGISTOS NOVOS (o Register navega para cá; contas antigas
// nunca passam aqui). Pede SÓ o que o dia-1 usa — equipa entra-se/cria-se no Início.
// Foto: selfie (capture="user") OU galeria → CropModal da casa (1:1) → POST /api/me/avatar.
// "Deixar para depois" só aparece aos ~4s; quem salta leva o card persistente no Início.
// RODADA 28 (LGPD art. 14): quem chega sem data de nascimento (Google/Apple não a trazem) passa
// por "Quando você nasceu?" ANTES da foto. Menor de 13: o motor apaga a conta e o login explica.
import { useRef, useState } from 'react';
import { apiFetch, apiUpload } from '../lib/api';
import { urlAsset, urlImagem } from '../utils/avatar';
import { mensagemUploadFoto } from '../utils/uploadErro';
import { normalizarFoto } from '../utils/normalizarFoto';
import { dataDeNascimentoValida } from '../utils/idade';
import { usePerfil } from '../context/PerfilContext';
import { useAuth } from '../hooks/useAuth';
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
          <img src={urlImagem(src, 512)} alt="" width={size} height={size} decoding="async" fetchpriority="high" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', gap: 8, color: 'rgba(255,255,255,0.35)' }}>
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="rgba(212,160,23,0.65)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
            <span style={{ fontFamily: RAJ, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>sua foto</span>
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
  const { perfil, hidratar, recarregar: recarregarPerfil } = usePerfil();
  const { signOut } = useAuth();
  const [passo, setPasso] = useState(1); // 1 · 'nascimento' · 2 · 3
  const [nascimento, setNascimento] = useState('');
  const [salvandoNascimento, setSalvandoNascimento] = useState(false);
  const [erroNascimento, setErroNascimento] = useState('');
  const precisaNascimento = !perfil?.user?.birthdate;
  const [cropFile, setCropFile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null); // preenchida após upload
  const [enviando, setEnviando] = useState(false);
  const [uploadErro, setUploadErro] = useState(null); // P1-5 — { texto, podeRepetir }
  const ultimoBlob = useRef(null); // retém o blob p/ "tentar de novo" sem recortar
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState(null);
  const selfieRef = useRef(null);
  const galeriaRef = useRef(null);

  async function escolherFicheiro(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setCropFile(await normalizarFoto(f));
  }

  // O CADASTRO NÃO GERA NADA (SPEC-FIGURINHA-3 §3, 22-set). A figurinha que
  // nasce aqui é a COMUM: a foto da pessoa na moldura, custo zero, pronta no
  // instante em que a foto sobe. A geração automática de IA de 12-set saiu —
  // era o item mais caro do app a nascer de graça em cada cadastro (US$0,11),
  // para quem talvez nunca pagasse. A Brilhante passa a ter dono: crédito
  // comprado, presente de quem cria time, ou pacote do time.
  //
  // O que ficou no lugar: nada. Não há o que esperar, por isso também não há
  // marcador de "gerando" nem retry de FOTO_DESATUALIZADA — a trava de hash
  // continua no motor, mas só a Brilhante passa por ela.

  // Crop confirmado → sobe já (POST /api/me/avatar) e a foto CAI na moldura.
  // P1-5 — em vez de um toast cru e passageiro, o erro fica INLINE na moldura com
  // uma mensagem accionável e "tentar de novo" (repete o mesmo blob, sem recortar).
  async function subirRecorte(blob) {
    if (blob) ultimoBlob.current = blob;
    const alvo = blob || ultimoBlob.current;
    if (!alvo) return;
    setCropFile(null);
    setUploadErro(null);
    setEnviando(true);
    try {
      const file = new File([alvo], 'onboarding.jpg', { type: 'image/jpeg' });
      const res = await apiUpload('/api/me/avatar', file, 'avatar');
      setAvatarUrl(res.avatar_url || res.foto_url || null);
      ultimoBlob.current = null;
    } catch (e) {
      setUploadErro(mensagemUploadFoto(e));
    } finally {
      setEnviando(false);
    }
  }

  // RODADA 28 — "Quando você nasceu?". Quem decide é o motor (PATCH /api/me): 13 anos ou mais, a data
  // fica e segue para a foto; menos de 13, ele apaga a conta (403 MENOR_DE_13) — aqui só se sai do
  // aparelho, e o login diz "O Futty é para maiores de 13 anos".
  async function confirmarNascimento() {
    const v = dataDeNascimentoValida(nascimento);
    if (!v) {
      setErroNascimento('Data de nascimento inválida.');
      return;
    }
    setSalvandoNascimento(true);
    setErroNascimento('');
    try {
      await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify({ birthdate: v }) });
      if (perfil) hidratar({ ...perfil, user: { ...perfil.user, birthdate: v } });
      setPasso(2);
    } catch (e) {
      if (e.code === 'NASCIMENTO_JA_DEFINIDO') {
        setPasso(2); // a data já veio do cadastro por e-mail
      } else if (e.code === 'MENOR_DE_13') {
        try { sessionStorage.setItem('futty_menor13', '1'); } catch { /* sem o aviso */ }
        await signOut();
      } else {
        setErroNascimento(e.message || 'Não deu para salvar a data. Tente de novo.');
      }
    } finally {
      setSalvandoNascimento(false);
    }
  }

  // Fim: nome de jogador (PATCH /api/me). A pergunta "Você é goleiro?" saiu do
  // cadastro (Rodada 8A, decisão do dono): o sorteio só usa game_players.goleiro,
  // marcado na confirmação de presença (Jogo.jsx, "Sou goleiro (GR)") ou pelo admin.
  async function concluir() {
    setSalvando(true);
    try {
      if (nome.trim()) await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify({ nome_jogador: nome.trim().slice(0, 18) }) });
      // P1-1 — sela o onboarding no servidor ANTES de entrar.
      await apiFetch('/api/me/onboarding-completo', { method: 'POST' });
      // 14-set ("Velocidade 3"): recarrega o PerfilContext AQUI — busca o
      // /api/me fresco e regrava o cache local — antes de navegar. Sem isto, a
      // navegação dura remontava o Layout com o cache local AINDA velho e a
      // gate mandava de volta para /onboarding num loop sem fim.
      const fresco = await recarregarPerfil();
      // VELOCIDADE 5 (14-set) — CINTO E SUSPENSÓRIO. A causa raiz do loop era
      // outra: o cache de SESSÃO do backend (middleware/auth.js, TTL 60s)
      // continuava a devolver onboarding_completo:false ao /api/me de cima —
      // corrigido lá (routes/auth.js chama invalidarSessaoDoPedido depois do
      // updateUserById). Mas esta tela não pode voltar a depender de o /api/me
      // vir certo para conseguir sair: aplica-se onboarding_completo:true por
      // CIMA do que quer que o fresco tenha respondido, otimista, e hidratar()
      // já regrava o cache local com ele. Se o backend um dia voltar a servir
      // stale, é esta linha que impede o loop — não o inverso.
      const base = fresco || perfil;
      if (base) hidratar({ ...base, user: { ...base.user, onboarding_completo: true } });
      window.location.assign('/home');
    } catch (e) {
      // Rodada 28: data de menor de 13 que veio do cadastro por e-mail — o motor apagou a conta.
      if (e.code === 'MENOR_DE_13') {
        try { sessionStorage.setItem('futty_menor13', '1'); } catch { /* sem o aviso */ }
        await signOut();
        return;
      }
      setToast({ tipo: 'error', mensagem: e.message });
      setSalvando(false);
    }
  }

  const prog = (
    <div style={{ position: 'absolute', top: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8, zIndex: 3 }}>
      {[1, 2, 3].map((n) => {
        const aceso = n <= (passo === 'nascimento' ? 1 : passo);
        return <i key={n} style={{ width: 26, height: 3, background: aceso ? 'linear-gradient(90deg,#d4a017,#f0c94a)' : 'rgba(255,255,255,0.12)', boxShadow: aceso ? '0 0 8px rgba(212,160,23,0.5)' : 'none' }} />;
      })}
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
              <Cta cheio onClick={() => setPasso(precisaNascimento ? 'nascimento' : 2)}>Começar</Cta>
            </div>
          </>
        )}

        {passo === 'nascimento' && (
          <>
            <Titulo size={24}>QUANDO VOCÊ<br />NASCEU?</Titulo>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', margin: '0 0 22px', lineHeight: 1.55, maxWidth: 290 }}>
              Pedimos a data de nascimento para seguir as regras de idade da LGPD.
            </p>
            <div style={{ width: '100%', maxWidth: 290 }}>
              <label htmlFor="onb-nascimento" style={{ fontFamily: RAJ, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', margin: '0 0 6px' }}>Data de nascimento</label>
              <input
                id="onb-nascimento"
                type="date"
                className="input input--hud"
                value={nascimento}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => { setNascimento(e.target.value); setErroNascimento(''); }}
                autoComplete="bday"
                style={{ width: '100%', fontFamily: RAJ, fontSize: 17, fontWeight: 700, textAlign: 'center' }}
              />
              {erroNascimento ? (
                <div role="alert" style={{ marginTop: 10, fontSize: 13, color: '#f8b4b4', textAlign: 'center', lineHeight: 1.45 }}>{erroNascimento}</div>
              ) : null}
              <div style={{ marginTop: 26 }}>
                <Cta cheio onClick={confirmarNascimento} disabled={!nascimento || salvandoNascimento}>{salvandoNascimento ? 'Salvando…' : 'Continuar'}</Cta>
              </div>
            </div>
          </>
        )}

        {passo === 2 && (
          <>
            <MolduraFoto src={avatarUrl ? urlAsset(avatarUrl) : null} />
            <Titulo size={24}>SUA FIGURINHA<br />COMEÇA AQUI</Titulo>
            {/* 31-jul (dono): metade do texto, sem "cara" (no BR é rude — usa-se rosto). */}
            <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', margin: '0 0 22px', lineHeight: 1.55, maxWidth: 290 }}>
              Sua foto vira seu card, no time inteiro.
            </p>
            {/* P1-5 — erro de upload INLINE (accionável), não um toast que foge. */}
            {uploadErro ? (
              <div className="hud-corners-s" style={{ width: '100%', maxWidth: 290, margin: '0 0 16px', padding: '12px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.5)', display: 'grid', gap: 10, textAlign: 'center' }}>
                <span style={{ fontSize: 13, color: '#f8b4b4', lineHeight: 1.45 }}>{uploadErro.texto}</span>
                {uploadErro.podeRepetir ? (
                  <button type="button" onClick={() => subirRecorte()} disabled={enviando} style={{ justifySelf: 'center', border: '1.5px solid #d4a017', background: 'rgba(30,24,8,0.9)', color: '#f0c94a', fontFamily: RAJ, fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '9px 16px', clipPath: CLIP_S, cursor: enviando ? 'default' : 'pointer' }}>
                    {enviando ? 'Enviando…' : 'Tentar de novo'}
                  </button>
                ) : null}
              </div>
            ) : null}
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
                    {enviando ? 'Enviando…' : 'Tirar foto agora'}
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
              É o nome que aparece no card e no ranking: seu nome de guerra.
            </p>
            <div style={{ width: '100%', maxWidth: 290 }}>
              <label style={{ fontFamily: RAJ, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', margin: '0 0 6px' }}>Nome de jogador</label>
              <input
                className="input input--hud"
                value={nome}
                maxLength={18}
                onChange={(e) => setNome(e.target.value)}
                placeholder="ex.: Bruninho"
                style={{ width: '100%', fontFamily: RAJ, fontSize: 17, fontWeight: 700, textAlign: 'center' }}
              />
              <div style={{ marginTop: 30 }}>
                <Cta cheio onClick={concluir} disabled={salvando}>{salvando ? 'Entrando…' : 'Entrar'}</Cta>
              </div>
              <div style={{ fontSize: 10, color: '#6f6a80', textAlign: 'center', marginTop: 10 }}>
                a posição você escolhe no seu time, aqui só o que o dia-1 usa
              </div>
            </div>
          </>
        )}
      </main>

      {cropFile ? (
        // 2:3, a proporção do card (SPEC-FIGURINHA-3 §3): a figurinha comum é
        // esta foto na moldura, e o que a pessoa enquadra aqui é exatamente o
        // que ela vai ver no álbum. Uma proporção só — escolher entre 1:1 e
        // 16:9 aqui seria escolher um card torto.
        <CropModal file={cropFile} aspect={2 / 3} aspectos={[{ k: '2:3', v: 2 / 3 }]} onConfirm={subirRecorte} onCancel={() => setCropFile(null)} />
      ) : null}
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
