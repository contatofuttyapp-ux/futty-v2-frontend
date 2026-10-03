// Futty v2.0 — Criar time: o WIZARD do admin (3 passos de escolha + a tela de convites que vem depois de criar, SPEC-EQUIPAS v2).
// A página antiga (formulário único com selector de cor) morreu: a cor é fallback
// automático interno (o backend cai para 'verde'; muda-se nas definições do admin).
// Passos: (1) nome + preview do escudo-iniciais ao vivo → POST /api/teams ·
// (2) toggles "como funciona" (mostrar_gols, artilheiro e destaque do dia persistem — 29H, item 44: antes os dois últimos
// eram chaves apagadas) · (3) política de entrada → PATCH modo_visibilidade · depois de criar, a tela de convites (link curto +
// WhatsApp), que não é um passo da criação: o contador é 3/3 e ela diz "Pronto" (29I, achado 79).
//
// 29I (achado 80): cada passo é UMA entrada do histórico (location.state.passo) — o Voltar do sistema (Alt+seta, o gesto do Android, o
// swipe do iPhone) recua um passo por vez, igual ao "← voltar" da tela, em vez de jogar no Início e apagar tudo. Antes do passo 1
// há uma entrada-guarda: o Voltar a partir do passo 1 pergunta "Sair da criação?" antes de sair. Depois de criado, o Voltar sai direto
// (o time já existe: voltar a um passo e criar de novo faria um time repetido).
// 29H: o texto do papel acompanha a opção (43); textos de entrada aprovados pelo dono (45); o aviso do "só organizo" que
// ficava num toast de 2 s ilegível (46) virou texto fixo na tela do passo 4; bairro opcional (42); a frase do WhatsApp (47)
// e o link curto /c/<código> (49).
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch, apiUpload } from '../lib/api';
import { ORIGEM_DO_SITE } from '../lib/linkDoSite';
import Topbar from '../components/Topbar';
import Toast from '../components/Toast';
import { avisoLogoRecusado, motivoDoLogo } from '../utils/logoTime';
import { copiarTexto } from '../utils/clipboard';
import { enderecoDoWhatsapp, linkDoConvite } from '../utils/convite';
import CampoCidadeLazy from '../components/CampoCidadeLazy';
import { EscolhaPapel } from '../components/EscolhaLinhaGol';
import CampoBairro from '../components/CampoBairro';
import { avisoDaCidade } from '../utils/cidades';
import { TEXTO_APOIO_BAIRRO, avisoDoBairro, concelhoDePortugal } from '../utils/freguesias';
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
        // Apagado não é clicável e não pode parecer: cursor not-allowed (o mesmo do "Publicar" da Resenha) — achado 82.
        padding: '13px 20px', cursor: rest.disabled ? 'not-allowed' : 'pointer', width: '100%', clipPath: CLIP_S,
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

// O que falta para seguir: uma linha curta abaixo do botão apagado (achado 82). Texto pela VOZ: diz o que fazer, sem cerimônia.
function Falta({ children }) {
  return <p className="texto-apoio" role="status" data-falta style={{ margin: '8px 0 0', textAlign: 'center' }}>{children}</p>;
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

function Toggle({ on, onClick, disabled, rotulo }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={on} aria-label={rotulo} style={{ width: 38, height: 20, borderRadius: 20, background: on ? 'rgba(212,160,23,0.55)' : 'rgba(255,255,255,0.12)', position: 'relative', flexShrink: 0, cursor: disabled ? 'not-allowed' : 'pointer', border: 'none', opacity: disabled ? 0.45 : 1 }}>
      <i style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 16, height: 16, borderRadius: '50%', background: on ? '#f0c94a' : '#fff', transition: 'left .2s' }} />
    </button>
  );
}

export default function CriarEquipa() {
  const navigate = useNavigate();
  const location = useLocation();
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  // Rodada 29B (D): a escolha da lista ({ cidade, uf, pais, lat, lng, origem: 'lista' }) — null enquanto a pessoa digita.
  const [cidadeEscolha, setCidadeEscolha] = useState(null);
  const [avisoCidade, setAvisoCidade] = useState(null); // depois de criar: { tipo: 'ok' | 'aviso', texto } sobre a cidade
  // 29H (item 12): o bairro opcional. `bairroEscolha` é a freguesia da lista (Portugal), com a coordenada; null enquanto digita.
  const [bairro, setBairro] = useState('');
  const [bairroEscolha, setBairroEscolha] = useState(null);
  const [avisoBairro, setAvisoBairro] = useState(null); // depois de criar: "Encontramos: <bairro>, <cidade>" ou o aviso
  const [mostrarGols, setMostrarGols] = useState(true);
  const [mostrarArtilheiro, setMostrarArtilheiro] = useState(true); // 29H (item 44): "Artilheiro do dia"
  const [mostrarDestaque, setMostrarDestaque] = useState(true); // 29H (item 44): "Destaque do dia"
  const [avisoPapel, setAvisoPapel] = useState(''); // depois de criar: o que não pôde ser gravado (texto fixo, não toast)
  const [joga, setJoga] = useState(true); // Rodada 29B (E): "Eu jogo" (padrão) / "Só organizo o time"
  const [modo, setModo] = useState('privado'); // privado | publico_aprovacao | publico_aberto
  const [team, setTeam] = useState(null); // criada no fim do passo 3
  const [logoArquivo, setLogoArquivo] = useState(null);
  const [logoPrevia, setLogoPrevia] = useState(null);
  const [avisoLogo, setAvisoLogo] = useState(''); // depois de criar: a moderação recusou o logo (o time nasceu igual)
  const [logoEnviado, setLogoEnviado] = useState(false);
  const logoInputRef = useRef(null);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Os passos no histórico (achado 80) ───────────────────────────────────────────────────────────────────────────────────────────
  // `passo` não é um useState: vem da entrada do histórico em que a pessoa está (location.state.passo). Time criado = tela de convites
  // (4), sempre. Passo 2 ou 3 sem nome (a entrada sobreviveu a um recarregar, o formulário não) volta ao 1.
  const passoDoEndereco = Number(location.state?.passo) || 1;
  const noGuarda = !!location.state?.guarda;
  const passo = team ? 4 : passoDoEndereco >= 2 && !nome.trim() ? 1 : Math.min(passoDoEndereco, 3);
  const temConteudo = !!(nome.trim() || cidade.trim() || bairro.trim() || logoArquivo);
  // "Sair da criação?": a pessoa chegou à guarda pelo Voltar do sistema, a partir do passo 1, com algo preenchido e sem time criado.
  const perguntaSair = noGuarda && !team && temConteudo;

  /** Vai para o passo `n` como uma entrada nova do histórico (o Voltar do sistema volta ao passo de antes). */
  function irParaPasso(n, { substituir = false } = {}) {
    navigate(location.pathname, { replace: substituir, state: { passo: n } });
  }

  // Na entrada (uma vez): a entrada atual vira a GUARDA e, logo que ela está de pé, o passo 1 é empurrado por cima — Voltar do passo 1
  // cai na guarda, que pergunta antes de sair. Se a entrada já tem estado (a pessoa recarregou, ou voltou aqui pelo histórico), não
  // planta nada. Em dois tempos (a guarda; depois o passo 1) para não depender de como o roteador agrupa duas trocas seguidas.
  const guardaPlantada = useRef(false);
  const plantando = useRef(false);
  useEffect(() => {
    if (guardaPlantada.current) return;
    guardaPlantada.current = true;
    if (location.state?.passo || location.state?.guarda) return;
    plantando.current = true;
    navigate(location.pathname, { replace: true, state: { guarda: true } });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- corre uma vez, na montagem
  }, []);

  // Cada vez que a entrada do histórico muda e é a guarda: se acabou de ser plantada, empurra o passo 1; se a pessoa chegou nela pelo
  // Voltar, pergunta (o modal abaixo) quando há o que perder — sem nada preenchido (ou com o time já criado) sai direto.
  useEffect(() => {
    if (!noGuarda) return;
    if (plantando.current) {
      plantando.current = false;
      navigate(location.pathname, { state: { passo: 1 } });
    } else if (team || !temConteudo) {
      navigate(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reage à chegada na guarda (a chave da entrada), não a cada letra digitada
  }, [location.key]);

  // Time já criado: um Voltar do sistema não leva a passo nenhum (voltar e criar de novo faria um time repetido) — sai da criação.
  useEffect(() => {
    if (team && !noGuarda && location.state?.passo !== 4) navigate(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reage à troca de entrada do histórico
  }, [location.key]);

  function continuarCriando() {
    navigate(1); // de volta à entrada do passo 1, de onde a pessoa veio (a guarda sai de cena)
  }
  function sairDaCriacao() {
    navigate(-1);
  }

  useEffect(() => {
    if (!logoArquivo) return undefined;
    const url = URL.createObjectURL(logoArquivo);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a prévia é um object URL: nasce e é solto aqui
    setLogoPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [logoArquivo]);

  function aoEscolherLogo(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    const motivo = motivoDoLogo(arquivo);
    if (motivo) {
      setToast({ tipo: 'error', mensagem: motivo });
      return;
    }
    setLogoArquivo(arquivo);
  }

  function tirarLogo() {
    setLogoArquivo(null);
    setLogoPrevia(null);
  }

  // Passo 3 → cria a equipa de uma vez (nome+cidade → POST; flags → PATCH) e segue p/ convites.
  async function criarESeguir() {
    if (busy) return;
    // Cidade é obrigatória em times públicos (14-set): é como jogadores perto
    // encontram o time no Explorar/distância. No privado fica opcional. Manda
    // de volta ao passo 1 (onde fica o campo) com um toast claro.
    if (modo !== 'privado' && !cidade.trim()) {
      setToast({ tipo: 'error', mensagem: 'Times públicos precisam de uma cidade. É assim que jogadores perto encontram o seu.' });
      irParaPasso(1, { substituir: true });
      return;
    }
    setBusy(true);
    try {
      // Sem cor no body: o backend cai para o fallback interno ('verde'); muda-se
      // depois nas definições do admin (decisão: cor despromovida, SPEC-EQUIPAS).
      const bodyCriar = { nome: nome.trim() };
      // Cidade da lista: manda o pacote todo (o motor guarda a coordenada da lista, sem Nominatim). Digitada: só o texto.
      if (cidade.trim()) Object.assign(bodyCriar, cidadeEscolha || { cidade: cidade.trim() });
      // O bairro só existe dentro de uma cidade; freguesia da lista leva a coordenada, texto digitado o motor geocodifica.
      if (cidade.trim() && bairro.trim()) Object.assign(bodyCriar, bairroEscolha && bairroEscolha.bairro === bairro.trim() ? bairroEscolha : { bairro: bairro.trim() });
      if (!joga) bodyCriar.joga = false;
      // 29I (achado 78): os gols vão no próprio POST (antes iam num PATCH logo depois) e o artilheiro nunca vai ligado com os gols
      // desligados — o app apaga um quando o outro é desligado, e o motor recusa a combinação incoerente.
      if (!mostrarGols) bodyCriar.mostrar_gols = false;
      if (!mostrarArtilheiro || !mostrarGols) bodyCriar.mostrar_artilheiro = false;
      if (!mostrarDestaque) bodyCriar.mostrar_destaque = false;
      const { team: t, geo, bairro: bairroResposta, joga: jogaGravado, premios_salvos: premiosSalvos } = await apiFetch('/api/teams', { method: 'POST', body: JSON.stringify(bodyCriar) });
      setAvisoCidade(avisoDaCidade(geo, cidade.trim()));
      setAvisoBairro(avisoDoBairro(bairroResposta));
      // O motor sem a migração 067 cria o time com o criador jogando: a tela não finge que gravou o outro papel. Um toast de
      // 2 s não dava para ler uma frase assim (item 46): vira texto fixo no passo 4, junto dos outros avisos.
      const avisos = [];
      if (!joga && jogaGravado !== false) avisos.push('"Só organizo" não pôde ser salvo agora: você entrou jogando. Dá para mudar nas configurações do time.');
      if (premiosSalvos === false) avisos.push('A escolha de artilheiro e destaque do dia não pôde ser salva agora. Dá para ajustar no painel do time.');
      setAvisoPapel(avisos.join(' '));
      // P2-12: a equipa já existe aqui. Se o PATCH das definições falhar, NÃO
      // dizer "erro a criar" — a equipa nasceu; segue-se para convites e avisa-se
      // que a definição ficou por aplicar (ajusta-se no admin).
      const patch = {};
      if (modo !== 'privado') patch.modo_visibilidade = modo;
      if (Object.keys(patch).length) {
        try {
          await apiFetch(`/api/teams/${t.slug}`, { method: 'PATCH', body: JSON.stringify(patch) });
        } catch {
          setToast({ tipo: 'error', mensagem: 'Time criado, mas a entrada (aberta ou fechada) não foi salva. Ajuste no painel do time.' });
        }
      }
      // Logo (opcional): só depois de o time existir. Se a moderação recusar, o time fica criado do mesmo jeito
      // e o passo 4 avisa — o logo se troca depois no painel do time.
      if (logoArquivo) {
        try {
          await apiUpload(`/api/teams/${t.slug}/logo`, logoArquivo, 'logo');
          setLogoEnviado(true);
        } catch (err) {
          setAvisoLogo(avisoLogoRecusado(err?.message));
        }
      }
      // O passo de convites SUBSTITUI a entrada do passo 3 no histórico (a entrada já nasce com o passo 4, antes de o time existir
      // aqui: o efeito de "time criado" só reage a trocas de entrada).
      irParaPasso(4, { substituir: true });
      setTeam(t);
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
      const { token, codigo } = await apiFetch(`/api/teams/${team.slug}/convite`, { method: 'POST' });
      setInviteLink(linkDoConvite({ origem: ORIGEM_DO_SITE, token, codigo }));
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function copiar() {
    const ok = await copiarTexto(inviteLink);
    setCopied(ok);
    if (!ok) setToast({ tipo: 'error', mensagem: 'Não deu para copiar. Copie o link à mão.' });
  }

  const waHref = inviteLink ? enderecoDoWhatsapp({ nomeTime: nome, link: inviteLink }) : null;
  // Time aberto (com aprovação ou aberto de vez) sem cidade: o motor não deixa criar (é como se acha o time no Explorar) — o botão avisa antes.
  const faltaCidade = modo !== 'privado' && !cidade.trim();

  return (
    <div className="app-shell">
      {/* O chevron do topo faz o mesmo que o Voltar do sistema: recua um passo (e do passo 1 pergunta antes de sair). */}
      <Topbar hud="CRIAR TIME" back="voltar" backFallback="/home" />
      <main className="app-main page-reveal" style={{ maxWidth: 480 }}>
        {/* barra de progresso: 3 passos de escolha (3/3 é o último — tem o botão CRIAR O TIME). A tela de convites, depois de criar,
            não é um passo: a barra fica cheia e o rótulo diz "Pronto" (achado 79: dizia 3/4 sem existir um 4º). */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0 20px' }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ flex: 1, height: 3, background: n <= passo ? 'linear-gradient(90deg,#d4a017,#f0c94a)' : 'rgba(255,255,255,0.10)', boxShadow: n <= passo ? '0 0 8px rgba(212,160,23,0.5)' : 'none' }} />
          ))}
          <span data-progresso style={{ fontFamily: RAJ, fontSize: 11, color: '#9a8fc0', letterSpacing: '0.08em' }}>{passo === 4 ? 'Pronto' : `${passo}/3`}</span>
        </div>

        {passo === 1 && (
          <>
            <h1 style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 20, margin: '0 0 4px' }}>Dê nome ao seu time</h1>
            <p className="texto-apoio" style={{ marginBottom: 14 }}>O escudo nasce das iniciais. Veja-o se formar enquanto você escreve.</p>
            <Lbl>Nome do time (obrigatório)</Lbl>
            <input className="input input--hud" value={nome} maxLength={40} required aria-required="true" onChange={(e) => setNome(e.target.value)} placeholder="ex.: Domingueira FC" style={{ width: '100%', fontFamily: RAJ, fontSize: 16 }} />
            {/* A cidade só é obrigatória para time aberto (14-set): é como quem está perto encontra o time no Explorar. No time fechado
                é opcional — por isso o rótulo diz quando vale, em vez de fingir que sempre vale (achado 82). */}
            <Lbl>Cidade (obrigatória em time aberto)</Lbl>
            <CampoCidadeLazy valor={cidade} aoMudar={(texto, escolha) => { setCidade(texto); setCidadeEscolha(escolha); setBairroEscolha(null); }} placeholder="Ex: Brasília" />
            <p className="texto-apoio">
              É assim que jogadores perto de você encontram o time. Só a cidade, nunca o endereço.
            </p>
            {/* 29H (item 12): o bairro, opcional. Em Portugal sugere as freguesias do concelho; no resto é texto livre. */}
            <Lbl>Bairro (opcional)</Lbl>
            <CampoBairro
              valor={bairro}
              aoMudar={(texto, escolha) => { setBairro(texto); setBairroEscolha(escolha); }}
              concelho={concelhoDePortugal(cidade, cidadeEscolha)}
              desabilitado={!cidade.trim()}
            />
            <p className="texto-apoio">{TEXTO_APOIO_BAIRRO}</p>
            <Lbl>Logo do time (opcional)</Lbl>
            {/* Prévia REDONDA do logo; sem logo, o escudo com as iniciais (nasce enquanto você escreve o nome). */}
            {logoPrevia ? (
              <img src={logoPrevia} alt="Prévia do logo do time" width={110} height={110} style={{ display: 'block', width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', margin: '8px auto 6px', border: '2.5px solid #8b5cf6', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }} />
            ) : (
              <div style={{ width: 110, height: 110, display: 'grid', placeItems: 'center', fontFamily: RAJ, fontWeight: 800, fontSize: 38, color: '#fff', background: 'rgba(255,255,255,0.04)', border: '2.5px solid #8b5cf6', margin: '8px auto 6px', clipPath: 'polygon(20% 0, 80% 0, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0 80%, 0 20%)', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}>
                {iniciais(nome)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              <button type="button" className="chip" onClick={() => logoInputRef.current?.click()} style={{ color: '#f0c94a', borderColor: 'rgba(212,160,23,0.5)', background: 'rgba(212,160,23,0.08)' }}>
                {logoArquivo ? 'Trocar logo' : 'Escolher logo'}
              </button>
              {logoArquivo ? <button type="button" className="chip" onClick={tirarLogo}>Tirar</button> : null}
            </div>
            <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={aoEscolherLogo} style={{ display: 'none' }} />
            <p className="texto-apoio texto-apoio--centro" style={{ maxWidth: 300 }}>
              PNG, JPG ou WEBP, até 2 MB. Passa por uma conferência. Sem logo, o escudo usa as iniciais.
            </p>
            <div style={{ marginTop: 24 }}>
              <Cta cheio disabled={!nome.trim()} onClick={() => irParaPasso(2)}>Continuar</Cta>
              {!nome.trim() ? <Falta>Falta o nome do time.</Falta> : null}
            </div>
          </>
        )}

        {passo === 2 && (
          <>
            <h1 style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 20, margin: '0 0 4px' }}>Como funciona o seu time?</h1>
            <p className="texto-apoio" style={{ marginBottom: 14 }}>Cada escolha mostra o efeito. Você pode mudar tudo depois no painel de admin.</p>
            <div data-papel style={{ ...VIDRO, clipPath: CLIP, padding: 12, marginBottom: 10 }}>
              <div style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Seu papel no time</div>
              <EscolhaPapel joga={joga} aoTrocar={setJoga} />
            </div>
            <div style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10 }}>
              <MiniRadar n={mostrarGols ? 5 : 3} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 14 }}>Mostrar gols</div>
                <div className="texto-apoio" style={{ marginTop: 2 }}>
                  {mostrarGols ? 'radar de 5 eixos, bloco de Gols e troféu de Artilheiro' : 'radar cai para 3: presença · vitórias · destaque'}
                </div>
              </div>
              {/* Achado 78: desligar os gols desliga o artilheiro junto (o troféu faz parte dos gols). Religar os gols NÃO religa o
                  artilheiro: quem decide é a pessoa. Achado 81: o botão ganha nome para leitor de tela. */}
              <Toggle on={mostrarGols} rotulo="Mostrar gols" onClick={() => { if (mostrarGols) setMostrarArtilheiro(false); setMostrarGols(!mostrarGols); }} />
            </div>
            {/* 29H (item 44): eram chaves apagadas (<Toggle on disabled />, "em breve") — o dono tocava e nada acontecia. Agora
                cada uma é uma escolha do time (teams.mostrar_artilheiro / mostrar_destaque): ligada, o editor de resultado
                oferece o troféu; desligada, esconde a seção. A frase embaixo diz o efeito da escolha de agora. */}
            <div data-premio="artilheiro" style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 14 }}>Artilheiro do dia</div>
                <div className="texto-apoio" style={{ marginTop: 2 }}>
                  {!mostrarGols ? 'Precisa dos gols ligados.' : mostrarArtilheiro ? 'troféu no fim de cada jogo' : 'sem troféu de artilheiro nos jogos'}
                </div>
              </div>
              <Toggle on={mostrarGols && mostrarArtilheiro} disabled={!mostrarGols} onClick={() => setMostrarArtilheiro(!mostrarArtilheiro)} rotulo="Artilheiro do dia" />
            </div>
            <div data-premio="destaque" style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 14 }}>Destaque do dia</div>
                <div className="texto-apoio" style={{ marginTop: 2 }}>{mostrarDestaque ? 'o MVP escolhido no fim de cada jogo' : 'sem destaque do dia nos jogos'}</div>
              </div>
              <Toggle on={mostrarDestaque} onClick={() => setMostrarDestaque(!mostrarDestaque)} rotulo="Destaque do dia" />
            </div>
            <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
              <Cta cheio onClick={() => irParaPasso(3)}>Continuar</Cta>
              <Cta sec onClick={() => navigate(-1)}>← voltar</Cta>
            </div>
          </>
        )}

        {passo === 3 && (
          <>
            <h1 style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 20, margin: '0 0 4px' }}>Aceita novos membros?</h1>
            <p className="texto-apoio" style={{ marginBottom: 14 }}>Como se entra no seu time.</p>
            {[
              // 29H (item 45): textos aprovados pelo dono (2-out). "Fechado" segue a mesma linha da casa.
              { k: 'privado', t: 'Fechado', d: 'Só entra quem receber o seu link de convite.' },
              { k: 'publico_aprovacao', t: 'Só com a sua aprovação', d: 'Quem achar o time no Explorar pede para entrar; você aceita ou não.' },
              { k: 'publico_aberto', t: 'Aberto', d: 'Qualquer um que achar o time no Explorar entra na hora.' },
            ].map((o) => (
              <button key={o.k} type="button" onClick={() => setModo(o.k)} style={{ ...VIDRO, clipPath: CLIP, display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px', marginBottom: 8, cursor: 'pointer', borderColor: modo === o.k ? 'rgba(212,160,23,0.65)' : 'rgba(255,255,255,0.10)', background: modo === o.k ? 'rgba(212,160,23,0.08)' : 'rgba(255,255,255,0.03)', color: 'inherit' }}>
                <span style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 14, display: 'block', color: modo === o.k ? '#f0c94a' : '#fff' }}>{o.t}</span>
                <span className="texto-apoio" style={{ marginTop: 2 }}>{o.d}</span>
              </button>
            ))}
            <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
              <Cta cheio onClick={criarESeguir} disabled={busy || faltaCidade}>{busy ? 'Criando…' : 'Criar o time'}</Cta>
              {faltaCidade ? <Falta>Time aberto precisa de cidade. Volte ao passo 1 e escolha a cidade.</Falta> : null}
              <Cta sec onClick={() => navigate(-1)} disabled={busy}>← voltar</Cta>
            </div>
          </>
        )}

        {passo === 4 && team && (
          <>
            <h1 style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 20, margin: '0 0 4px' }}>Chame o seu time</h1>
            <p className="texto-apoio" style={{ marginBottom: 14 }}>O <b style={{ color: '#f0c94a' }}>{team.nome}</b> está criado. Manda no grupo do seu time: o link vale 30 dias. Você pode pular este passo.</p>
            {avisoCidade ? (
              avisoCidade.tipo === 'ok' ? (
                <p className="texto-apoio" data-aviso-cidade="ok" style={{ marginTop: 0, marginBottom: 14 }}>{avisoCidade.texto}</p>
              ) : (
                <div role="status" data-aviso-cidade="aviso" className="hud-corners-s" style={{ margin: '0 0 14px', padding: '10px 12px', fontSize: 13, lineHeight: 1.45, color: '#f0c94a', background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.45)' }}>
                  {avisoCidade.texto}
                </div>
              )
            ) : null}
            {avisoBairro ? (
              avisoBairro.tipo === 'ok' ? (
                <p className="texto-apoio" data-aviso-bairro="ok" style={{ marginTop: 0, marginBottom: 14 }}>{avisoBairro.texto}</p>
              ) : (
                <div role="status" data-aviso-bairro="aviso" className="hud-corners-s" style={{ margin: '0 0 14px', padding: '10px 12px', fontSize: 13, lineHeight: 1.45, color: '#f0c94a', background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.45)' }}>
                  {avisoBairro.texto}
                </div>
              )
            ) : null}
            {avisoPapel ? (
              <div role="status" data-aviso-papel className="hud-corners-s" style={{ margin: '0 0 14px', padding: '10px 12px', fontSize: 13, lineHeight: 1.45, color: '#f0c94a', background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.45)' }}>
                {avisoPapel}
              </div>
            ) : null}
            {avisoLogo ? (
              <div role="status" className="hud-corners-s" style={{ margin: '0 0 14px', padding: '10px 12px', fontSize: 13, lineHeight: 1.45, color: '#f0c94a', background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.45)' }}>
                {avisoLogo}
              </div>
            ) : logoEnviado ? (
              <p className="texto-apoio" style={{ marginTop: 0, marginBottom: 14 }}>Logo do time enviado ✓</p>
            ) : null}
            {inviteLink ? (
              <>
                <Lbl>Link do convite</Lbl>
                <input className="input input--hud" readOnly value={inviteLink} onFocus={(e) => e.target.select()} style={{ width: '100%', color: '#f0c94a' }} />
                <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                  <Cta onClick={copiar}>{copied ? 'Copiado' : 'Copiar link'}</Cta>
                  <a href={waHref} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
                    <Cta sec style={{ color: '#7bd88f', borderColor: 'rgba(123,216,143,0.45)', background: 'rgba(123,216,143,0.06)' }}>Compartilhar no WhatsApp</Cta>
                  </a>
                </div>
              </>
            ) : (
              <Cta onClick={gerarConvite} disabled={busy}>{busy ? 'Gerando…' : 'Gerar link do convite'}</Cta>
            )}
            <div style={{ marginTop: 22 }}>
              {/* Rodada 29C: `criouAgora` abre as boas-vindas do criador na página do time (uma vez por time). */}
              <Cta cheio onClick={() => navigate(`/time/${team.slug}`, { state: { criouAgora: true } })}>Ir para o time</Cta>
            </div>
          </>
        )}
      </main>
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}

      {/* Achado 80: o Voltar do sistema a partir do passo 1 pergunta antes de jogar fora o que foi preenchido. Portal para o body (overlay
          fixo nunca dentro do [data-page], ver LoadingFutty.jsx). */}
      {perguntaSair
        ? createPortal(
            <div className="modal-overlay" role="presentation">
              <div className="modal-card modal-card--hud" role="dialog" aria-modal="true" aria-labelledby="sair-da-criacao" data-sair-da-criacao>
                <div className="modal-card__inner">
                  <p id="sair-da-criacao" style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 16 }}>Sair da criação? Você perde o que preencheu.</p>
                  <button type="button" className="btn hud-corners-s cta-gold" style={{ width: '100%' }} onClick={continuarCriando}>Continuar criando</button>
                  <button type="button" className="btn btn--ghost btn--sm btn--hud hud-corners-s" style={{ width: '100%', marginTop: 10 }} onClick={sairDaCriacao}>Sair</button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
