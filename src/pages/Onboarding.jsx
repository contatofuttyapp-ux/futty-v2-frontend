// Futty v2.0 — Onboarding dia-1 (3 passos): boas-vindas → FOTO (quase-obrigatória) → identidade. Só
// para REGISTOS NOVOS (o Register navega para cá; contas antigas nunca passam aqui). Pede SÓ o que o
// dia-1 usa — equipa entra-se/cria-se no Início.
// Foto: selfie (capture="user") OU galeria → CropModal da casa (2:3, ENQUADRAMENTO ÚNICO: o quadrado
// tracejado da miniatura dentro do card) → POST /api/me/avatar → PUT /api/me/avatar/enquadro
// (lib/miniatura.js, best-effort). A foto nunca é espelhada: aparece como foi tirada.
// "Deixar para depois" só aparece aos ~2s; quem salta leva o card persistente no Início.
// Quem chega sem data de nascimento (Google/Apple não a trazem) passa por "Quando você nasceu?" ANTES
// da foto, em rolinhos dia/mês/ano (RolinhosData). Menor de 18: o motor apaga a conta e o login explica.
// Passo 1: o mini sorteio ao vivo (MiniSorteio.jsx), o ícone do app a 110 px flutuando e figurinhas
// fictícias caindo em dois times no mini sorteio; textos da landing.
// Quem chega por um convite (bilhete no aparelho: lib/convitePendente.js) NÃO vê a página "Começar": a
// 1ª página é a boas-vindas DO TIME (BoasVindas, variante convidado: "Você foi convidado para o
// <time>. …", linha/gol, "Vamos lá") → foto → nome → o time (o convite é aceito aqui, no fim; sem
// passar de novo pelo Início nem pela página do convite). A escolha linha/gol vale depois de entrar.
// Convite que morreu (apagado, vencido) vira cadastro comum.
// O Register/Login aquecem o chunk e as 8 imagens desta página (lib/preaquecerOnboarding.js).
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { apiFetch, apiUpload } from '../lib/api';
import { urlAsset, urlImagem } from '../utils/avatar';
import { estiloDaJanela, recorteDaMolduraUnica, urlSemRecorte } from '../lib/enquadroAvatar';
import { gravarMiniatura } from '../lib/miniatura';
import { guardarPosicaoPendente, lerConvitePendente, tomarConvitePendente } from '../lib/convitePendente';
import { mensagemUploadFoto } from '../utils/uploadErro';
import { normalizarFoto } from '../utils/normalizarFoto';
import { dataDeNascimentoValida, IDADE_MINIMA } from '../utils/idade';
import { usePerfil } from '../context/PerfilContext';
import { useAuth } from '../hooks/useAuth';
import FuttyLogo from '../components/FuttyLogo';
import LoadingFutty from '../components/LoadingFutty';
import MiniSorteio from '../components/MiniSorteio';
import RolinhosData from '../components/RolinhosData';
import CropModal from '../components/CropModal';
import Toast from '../components/Toast';
import '../styles/app.css';

// As boas-vindas do time (a mesma tela do time, chunk próprio): a 1ª página de quem chega pelo convite.
const BoasVindas = lazy(() => import('../components/BoasVindas'));

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

// O card 2:3, com cantos a 45° em px (num retângulo, o OCTO em % cortaria cantos tortos).
const OCTO_CARD = 'polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px)';

// Moldura V1 grande — vazia (gancho) ou, com a foto subida, o CARD 2:3 como ele vai ficar: o quadrado
// tracejado da miniatura por cima (o mesmo do enquadramento único) e, ao lado, a miniatura na moldura
// real do app. O arquivo que subiu É o recorte 2:3: a janela da miniatura é o quadrado do topo
// (recorteDaMolduraUnica), sem adivinhar posição nenhuma.
function MolduraFoto({ src, size = 170 }) {
  if (src) {
    const largura = Math.round(size * 0.82);
    const altura = Math.round(largura * 1.5);
    const inteira = urlImagem(urlSemRecorte(src), 512);
    const janela = estiloDaJanela(2, 3, recorteDaMolduraUnica(2, 3));
    return (
      <div data-moldura-unica style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, margin: '0 auto' }}>
        <div className="moldura-unica" style={{ position: 'relative', width: largura, height: altura, flexShrink: 0, overflow: 'hidden', clipPath: OCTO_CARD, border: '1.5px solid rgba(212,160,23,0.5)', boxShadow: '0 0 18px rgba(212,160,23,0.3)', background: '#101012' }}>
          <img src={inteira} alt="" decoding="async" fetchPriority="high" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ display: 'grid', gap: 6, justifyItems: 'center', maxWidth: 112 }}>
          <div className="pavatar" data-miniatura-ao-vivo style={{ width: 52, height: 52, position: 'relative', overflow: 'hidden' }} aria-hidden="true">
            <img src={inteira} alt="" decoding="async" style={{ ...janela, objectFit: 'fill', pointerEvents: 'none' }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.35 }}>É assim que você aparece no app</span>
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', overflow: 'hidden', background: 'linear-gradient(0deg, rgba(255,255,255,0.03), rgba(255,255,255,0.03)), #101012', clipPath: OCTO, border: '1.5px solid rgba(212,160,23,0.5)', boxShadow: '0 0 18px rgba(212,160,23,0.3)' }}>
        {(
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
  // Quem vem do convite começa pelas boas-vindas do time (passo 1) em vez da página "Começar"; foto e nome seguem iguais.
  const [convite] = useState(() => lerConvitePendente()); // { token, time, goleiro } | null
  const [timeDoConvite, setTimeDoConvite] = useState(() => convite?.time || null); // { nome, logo_url, cor_fundo }
  const [conviteMorto, setConviteMorto] = useState(false); // sumiu ou venceu: a pessoa segue como cadastro comum
  const [goleiro, setGoleiro] = useState(() => !!convite?.goleiro);
  const deConvite = !!convite && !conviteMorto;
  const [passo, setPasso] = useState(1); // 1 (boas-vindas do time ou "Começar") · 2 (foto; antes dela a data de nascimento, se faltar) · 3
  const [nascimento, setNascimento] = useState('');
  const [salvandoNascimento, setSalvandoNascimento] = useState(false);
  const [erroNascimento, setErroNascimento] = useState('');
  const [nascimentoOk, setNascimentoOk] = useState(false);
  // Só decide com o perfil carregado: antes dele, a foto (o caso comum) em vez de um relance da pergunta.
  const precisaNascimento = !!perfil && !perfil.user?.birthdate && !nascimentoOk;
  const mostrarNascimento = passo === 2 && precisaNascimento;
  const [cropFile, setCropFile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null); // preenchida após upload
  const [enviando, setEnviando] = useState(false);
  const [uploadErro, setUploadErro] = useState(null); // P1-5 — { texto, podeRepetir }
  const ultimoBlob = useRef(null); // retém o blob p/ "tentar de novo" sem recortar
  const ultimoRecorteMini = useRef(null); // o quadrado tracejado desse blob, gravado depois de a foto subir
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState(null);
  const selfieRef = useRef(null);
  const galeriaRef = useRef(null);

  // O convite do bilhete ainda vale? O bilhete já traz o nome e o logo do time (a 1ª tela abre sem esperar); aqui se confirma e se
  // renova o logo. Morto (não existe, venceu, ou a pessoa já é do time) → o bilhete cai e vira cadastro comum. Sem rede e sem
  // cópia do time, o bilhete FICA (o Início o devolve ao convite depois) e a pessoa segue pelo cadastro comum.
  useEffect(() => {
    if (!convite) return undefined;
    let ativo = true;
    apiFetch(`/api/convite/${encodeURIComponent(convite.token)}`)
      .then((r) => {
        if (!ativo) return;
        if (!r?.valido || !r.team || r.jaMembro) {
          tomarConvitePendente();
          setConviteMorto(true);
          return;
        }
        setTimeDoConvite({ nome: r.team.nome, logo_url: r.team.logo_url || null, cor_fundo: r.team.cor_fundo || null });
      })
      .catch(() => { if (ativo) setTimeDoConvite((t) => { if (!t) setConviteMorto(true); return t; }); });
    return () => { ativo = false; };
  }, [convite]);

  // Aceita o convite do bilhete e devolve para onde ir (o time), ou null se não deu. Depois de entrar: grava linha/gol (se a
  // pessoa escolheu "No gol"), marca as boas-vindas do time como vistas (ela acabou de ver) e acende o convite da figurinha.
  async function aceitarConvite() {
    try {
      const { team } = await apiFetch(`/api/convite/${encodeURIComponent(convite.token)}/aceitar`, { method: 'POST' });
      tomarConvitePendente();
      try {
        if (team?.id) localStorage.setItem(`futty_onboarding_${team.id}`, '1');
        localStorage.setItem('futty_cta_figurinha', '1');
      } catch { /* sem armazenamento: as boas-vindas do time podem repetir uma vez */ }
      if (goleiro) await apiFetch(`/api/equipas/${team.slug}/membros/posicao`, { method: 'PATCH', body: JSON.stringify({ goleiro: true }) }).catch(() => {});
      return `/time/${team.slug}`;
    } catch {
      return null;
    }
  }

  async function escolherFicheiro(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setCropFile(await normalizarFoto(f));
  }

  // O CADASTRO NÃO GERA NADA (SPEC-FIGURINHA-3 §3). A figurinha que nasce aqui é a COMUM: a foto da
  // pessoa na moldura, custo zero, pronta no instante em que a foto sobe. Gerar IA no cadastro seria o
  // item mais caro do app a nascer de graça (US$0,11), para quem talvez nunca pagasse. A Brilhante tem
  // dono: crédito comprado ou pacote do time (não há presente de quem cria time).
  //
  // Não há o que esperar, por isso também não há marcador de "gerando" nem retry de FOTO_DESATUALIZADA —
  // a trava de hash continua no motor, mas só a Brilhante passa por ela.

  // Crop confirmado → sobe já (POST /api/me/avatar) e a foto CAI na moldura.
  // P1-5 — em vez de um toast cru e passageiro, o erro fica INLINE na moldura com
  // uma mensagem accionável e "tentar de novo" (repete o mesmo blob, sem recortar).
  async function subirRecorte(blob, extra) {
    if (blob) { ultimoBlob.current = blob; ultimoRecorteMini.current = extra?.recorte || null; }
    const alvo = blob || ultimoBlob.current;
    if (!alvo) return;
    setCropFile(null);
    setUploadErro(null);
    setEnviando(true);
    try {
      const file = new File([alvo], 'onboarding.jpg', { type: 'image/jpeg' });
      const res = await apiUpload('/api/me/avatar', file, 'avatar');
      setAvatarUrl(res.avatar_url || res.foto_url || null);
      // O quadrado tracejado vira a miniatura de verdade (users.avatar_recorte). Best-effort e sem segurar a
      // tela: a foto já subiu; se o motor ainda não tem a migração 070, a miniatura segue na regra de sempre.
      const recorteMini = ultimoRecorteMini.current;
      if (recorteMini && !res.figurinha_ativa) gravarMiniatura(recorteMini).then((url) => { if (url) setAvatarUrl(url); });
      ultimoBlob.current = null;
    } catch (e) {
      setUploadErro(mensagemUploadFoto(e));
    } finally {
      setEnviando(false);
    }
  }

  // "Quando você nasceu?". Quem decide é o motor (PATCH /api/me): 18 anos ou mais, a data fica e segue
  // para a foto; menos de 18, ele apaga a conta (403 MENOR_DE_18) — aqui só se sai do aparelho, e o login
  // diz "O Futty é para maiores de 18 anos."
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
      setNascimentoOk(true);
    } catch (e) {
      if (e.code === 'NASCIMENTO_JA_DEFINIDO') {
        setNascimentoOk(true); // a data já veio do cadastro por e-mail
      } else if (e.code === 'MENOR_DE_18') {
        try { sessionStorage.setItem('futty_menor18', '1'); } catch { /* sem o aviso */ }
        await signOut();
      } else {
        setErroNascimento(e.message || 'Não deu para salvar a data. Tente de novo.');
      }
    } finally {
      setSalvandoNascimento(false);
    }
  }

  // Fim: nome de jogador (PATCH /api/me). Sem a pergunta "Você é goleiro?" no cadastro: o sorteio só usa
  // game_players.goleiro, marcado na confirmação de presença (Jogo.jsx, "Sou goleiro (GR)") ou pelo
  // admin.
  async function concluir() {
    setSalvando(true);
    try {
      if (nome.trim()) await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify({ nome_jogador: nome.trim().slice(0, 18) }) });
      // P1-1 — sela o onboarding no servidor ANTES de entrar.
      await apiFetch('/api/me/onboarding-completo', { method: 'POST' });
      // Recarrega o PerfilContext AQUI — busca o /api/me fresco e regrava o cache local — antes de navegar.
      // Sem isto, a navegação dura remonta o Layout com o cache local AINDA velho e a gate manda de volta
      // para /onboarding num loop sem fim.
      const fresco = await recarregarPerfil();
      // CINTO E SUSPENSÓRIO. A causa raiz do loop era outra: o cache de SESSÃO do backend (middleware/auth.js,
      // TTL 60s) continuava a devolver onboarding_completo:false ao /api/me de cima — corrigido lá
      // (routes/auth.js chama invalidarSessaoDoPedido depois do updateUserById). Mas esta tela não pode
      // voltar a depender de o /api/me vir certo para conseguir sair: aplica-se onboarding_completo:true por
      // CIMA do que quer que o fresco tenha respondido, otimista, e hidratar() já regrava o cache local com
      // ele. Se o backend um dia voltar a servir stale, é esta linha que impede o loop — não o inverso.
      const base = fresco || perfil;
      if (base) hidratar({ ...base, user: { ...base.user, onboarding_completo: true } });
      // O convite do bilhete é aceito AQUI — a pessoa cai direto no time, que ela já viu nas boas-vindas. Se o
      // convite falhar (venceu entre uma tela e outra), o bilhete fica e o Início a leva à página do convite,
      // que explica.
      window.location.assign((deConvite && (await aceitarConvite())) || '/home');
    } catch (e) {
      // Data de menor de 18 que veio do cadastro por e-mail — o motor apagou a conta.
      if (e.code === 'MENOR_DE_18') {
        try { sessionStorage.setItem('futty_menor18', '1'); } catch { /* sem o aviso */ }
        await signOut();
        return;
      }
      setToast({ tipo: 'error', mensagem: e.message });
      setSalvando(false);
    }
  }

  const passos = [1, 2, 3];
  const prog = (
    <div data-progresso style={{ position: 'absolute', top: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8, zIndex: 3 }}>
      {passos.map((n) => {
        const aceso = n <= (mostrarNascimento ? passos[0] : passo);
        return <i key={n} style={{ width: 26, height: 3, background: aceso ? 'linear-gradient(90deg,#d4a017,#f0c94a)' : 'rgba(255,255,255,0.12)', boxShadow: aceso ? '0 0 8px rgba(212,160,23,0.5)' : 'none' }} />;
      })}
    </div>
  );

  return (
    <div className="app-shell" style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '46px 24px 32px', maxWidth: 480, margin: '0 auto', width: '100%' }}>
        {prog}

        {passo === 1 && deConvite && !timeDoConvite && <LoadingFutty motivo="convite" />}

        {passo === 1 && deConvite && timeDoConvite && (
          // As boas-vindas do time: portal sobre o fundo; "Vamos lá" guarda linha/gol (só vale depois de entrar) e segue para a foto.
          <Suspense fallback={null}>
            <BoasVindas
              variante="convidado"
              comConvite
              gravar={false}
              team={timeDoConvite}
              goleiroInicial={goleiro}
              onClose={({ goleiro: g }) => { setGoleiro(g); guardarPosicaoPendente(g); setPasso(2); }}
            />
          </Suspense>
        )}

        {passo === 1 && !deConvite && (
          <>
            <div className="futty-f-bob"><div className="futty-f-sway">
              <FuttyLogo variant="icone" size={110} />
            </div></div>
            <Titulo>BEM-VINDO AO FUTTY</Titulo>
            {/* Uma voz só — o mesmo subtítulo da landing (a pontuação final vale para os dois). */}
            <div style={{ fontFamily: RAJ, fontSize: 15, fontWeight: 700, letterSpacing: '0.1em', color: '#c9c2d6', textTransform: 'uppercase', textAlign: 'center', marginTop: 6 }}>
              O seu time. <b style={{ color: '#f0c94a' }}>A sua figurinha.</b>
            </div>
            <MiniSorteio />
            {/* O CTA dourado da casa (o "Vamos lá" das boas-vindas) — 50 px, máx. 290, 24 px de respiro acima e
                abaixo. O glow vive no wrapper porque o clip dos cantos cortaria o drop-shadow (ver .cta-gold no
                app.css). */}
            <div className="cta-gold-glow" style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '24px 0' }}>
              <button
                type="button"
                className="btn cta-gold"
                data-cta="comecar"
                onClick={() => setPasso(2)}
                style={{ width: '100%', maxWidth: 290, height: 50, fontFamily: RAJ, fontSize: 16, letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                Começar
              </button>
            </div>
          </>
        )}

        {mostrarNascimento && (
          <>
            <Titulo size={24}>Quando você<br />nasceu?</Titulo>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', margin: '0 0 22px', lineHeight: 1.55, maxWidth: 290 }}>
              Pedimos a data de nascimento para confirmar que você tem {IDADE_MINIMA} anos ou mais.
            </p>
            <div style={{ width: '100%', maxWidth: 290 }}>
              <span style={{ fontFamily: RAJ, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', margin: '0 0 6px' }}>Data de nascimento</span>
              {/* Rolinhos dia · mês · ano, sem ano futuro, teto ano atual − 18. */}
              <RolinhosData id="onb-nascimento" onChange={(v) => { setNascimento(v); setErroNascimento(''); }} />
              {erroNascimento ? (
                <div role="alert" style={{ marginTop: 10, fontSize: 13, color: '#f8b4b4', textAlign: 'center', lineHeight: 1.45 }}>{erroNascimento}</div>
              ) : null}
              <div style={{ marginTop: 26 }}>
                <Cta cheio onClick={confirmarNascimento} disabled={!nascimento || salvandoNascimento}>{salvandoNascimento ? 'Salvando…' : 'Continuar'}</Cta>
              </div>
            </div>
          </>
        )}

        {passo === 2 && !mostrarNascimento && (
          <>
            <MolduraFoto src={avatarUrl ? urlAsset(avatarUrl) : null} />
            <Titulo size={24}>SUA FIGURINHA<br />COMEÇA AQUI</Titulo>
            {/* Texto curto, sem "cara" (no BR é rude — usa-se rosto). */}
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
                {/* "deixar para depois" — surge aos ~2s. Escondido até lá (visibility), para um toque antes da hora não
                    valer; o convite do Início continua até haver foto. */}
                <button
                  type="button"
                  onClick={() => setPasso(3)}
                  style={{ display: 'block', margin: '18px auto 0', background: 'none', border: 'none', color: '#8a8398', fontFamily: RAJ, fontSize: 12, letterSpacing: '0.06em', cursor: 'pointer', opacity: 0, visibility: 'hidden', animation: 'onbAparece 0.4s ease 1.8s forwards' }}
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
            <Titulo size={24}>Como te chamam<br />em campo?</Titulo>
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
                placeholder="Ex.: Bruninho"
                style={{ width: '100%', fontFamily: RAJ, fontSize: 17, fontWeight: 700, textAlign: 'center' }}
              />
              <div style={{ marginTop: 30 }}>
                <Cta cheio onClick={concluir} disabled={salvando}>{salvando ? 'Entrando…' : 'Entrar'}</Cta>
              </div>
              <div style={{ fontSize: 10, color: '#6f6a80', textAlign: 'center', marginTop: 10 }}>
                A posição você escolhe depois, no seu time.
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
        <CropModal file={cropFile} aspect={2 / 3} aspectos={[{ k: '2:3', v: 2 / 3 }]} miniatura onConfirm={subirRecorte} onCancel={() => setCropFile(null)} />
      ) : null}
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
