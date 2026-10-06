// Futty v2.0 — Criar time: o WIZARD do admin (3 passos de escolha + a tela de convites que vem depois de criar, SPEC-EQUIPAS v2).
// Não há seletor de cor: a cor é fallback
// automático interno (o backend cai para 'verde'; muda-se nas definições do admin).
// Passos: (1) nome + cidade — a cidade sempre exigida: da lista, ou texto livre quando a lista não sugere nada — + escudo-iniciais ao vivo ·
// (2) "Você também joga?" e "O que contar nos jogos?" (gols, artilheiro e destaque do dia — tudo nasce desligado) ·
// (3) política de entrada → POST /api/teams (+ PATCH modo_visibilidade) · depois de criar, a FESTA: a máquina das boas-vindas
// com o nome do time como letreiro, "Seu time está no ar!" e o link do convite. Não é um passo da criação: o contador é 3/3 e ela
// diz "Pronto". "Ir para o time" não reabre boas-vindas: a pessoa já comemorou aqui.
//
// Cada passo é UMA entrada do histórico (location.state.passo) — o Voltar do sistema (Alt+seta, o gesto do Android, o
// swipe do iPhone) recua um passo por vez, igual ao "← voltar" da tela, em vez de jogar no Início e apagar tudo. Antes do passo 1
// há uma entrada-guarda: o Voltar a partir do passo 1 pergunta "Sair da criação?" antes de sair. Depois de criado, o Voltar sai direto
// (o time já existe: voltar a um passo e criar de novo faria um time repetido).
// O texto do papel acompanha a opção; textos de entrada aprovados pelo dono; o aviso do "só organizo" é texto fixo na tela
// do passo 4 (num toast de 2 s ficaria ilegível); bairro opcional; a frase do WhatsApp e o link curto /c/<código>.
// O link do convite chega PRONTO na festa (gerado sozinho assim que o time existe); o botão "Gerar link do convite" só aparece, como
// reserva, se a geração falhar.
// O bairro é de LISTA (IBGE no Brasil, freguesias em Portugal) e o campo só aparece quando a cidade tem lista; no passo 3, "Aberto" e
// "Só com a sua aprovação" pedem o "Sobre o time" (sem ele o time não é criado), que o Radar de peladas mostra no card do time.
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { Star, Target, Trash2, Trophy } from 'lucide-react';
import { EscolhaPapel } from '../components/EscolhaLinhaGol';
import { ARTILHEIRO, DESTAQUE, GOLS, alternarArtilheiro, alternarGols } from '../components/golsEPremios';
import { MaquinaDoTime } from '../components/BoasVindas';
import CampoBairro from '../components/CampoBairro';
import { useBairrosDaCidade } from '../hooks/useBairrosDaCidade';
import { avisoDaCidade, cidadePreenchida } from '../utils/cidades';
import { avisoDoBairro } from '../utils/freguesias';
import { EXEMPLO_SOBRE_O_TIME, FALTA_SOBRE_NA_CRIACAO, MAX_SOBRE_O_TIME, faltaSobre, precisaDeSobre } from '../utils/sobreOTime';
import { initials } from '../utils/teamColors';
import '../styles/app.css';

const RAJ = "'Rajdhani', sans-serif";
const CLIP_S = 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)';
const CLIP = 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)';
const VIDRO = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)' };
// Título de leitor de tela: existe para quem usa leitor, sem aparecer na tela.
const SO_LEITOR = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' };

function Cta({ children, cheio, sec, ...rest }) {
  return (
    <button
      type="button"
      {...rest}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: RAJ, fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase',
        // Apagado não é clicável e não pode parecer: cursor not-allowed (o mesmo do "Publicar" da Resenha).
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

// `grande`: a régua do passo 1, onde o nome do time é a estrela da tela.
function Lbl({ children, grande = false }) {
  return <span style={{ fontFamily: RAJ, fontSize: grande ? 13 : 11, fontWeight: 700, letterSpacing: grande ? '0.14em' : '0.12em', color: grande ? '#c9b6ff' : '#9a8fc0', textTransform: 'uppercase', display: 'block', margin: grande ? '16px 0 8px' : '14px 0 6px' }}>{children}</span>;
}

// O que falta para seguir: uma linha curta abaixo do botão apagado. Texto pela VOZ: diz o que fazer, sem cerimônia.
function Falta({ children }) {
  return <p className="texto-apoio" role="status" data-falta style={{ margin: '8px 0 0', textAlign: 'center' }}>{children}</p>;
}

function Toggle({ on, onClick, rotulo }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={rotulo} style={{ width: 38, height: 20, borderRadius: 20, background: on ? 'rgba(212,160,23,0.55)' : 'rgba(255,255,255,0.12)', position: 'relative', flexShrink: 0, cursor: 'pointer', border: 'none' }}>
      <i style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 16, height: 16, borderRadius: '50%', background: on ? '#f0c94a' : '#fff', transition: 'left .2s' }} />
    </button>
  );
}

export default function CriarEquipa() {
  const navigate = useNavigate();
  const location = useLocation();
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  // A escolha da lista ({ cidade, uf, pais, lat, lng, origem: 'lista' }) — null enquanto a pessoa digita.
  const [cidadeEscolha, setCidadeEscolha] = useState(null);
  // A cidade é obrigatória. Da lista vale sempre; texto livre só quando a lista não tem sugestão para ele (quem está fora do
  // Brasil e de Portugal nunca trava). `temSugestoes` vem do próprio campo.
  const [temSugestoes, setTemSugestoes] = useState(false);
  const aoSugestoes = useCallback((n) => setTemSugestoes(n > 0), []);
  const [avisoCidade, setAvisoCidade] = useState(null); // depois de criar, só quando deu errado: { tipo: 'aviso', texto }
  const [cidadeDoTime, setCidadeDoTime] = useState(''); // depois de criar: a cidade como o motor a achou (ou como foi escrita)
  // O bairro opcional, de LISTA, no Brasil (IBGE) e em Portugal (freguesias) — o campo só existe quando a cidade tem
  // lista, e só vale o que a pessoa escolhe. `bairroEscolha` é o bairro da lista, com a coordenada; null enquanto digita.
  const [bairro, setBairro] = useState('');
  const [bairroEscolha, setBairroEscolha] = useState(null);
  const bairros = useBairrosDaCidade(cidade, cidadeEscolha);
  // O "Sobre o time" é pedido no passo 3 quando o time é aberto ao público (aberto ou com aprovação); "Fechado" não pede.
  const [sobre, setSobre] = useState('');
  const [avisoBairro, setAvisoBairro] = useState(null); // depois de criar, só quando deu errado
  const [bairroDoTime, setBairroDoTime] = useState('');
  // Tudo nasce desligado: a pessoa liga o que quiser.
  const [mostrarGols, setMostrarGols] = useState(false);
  const [mostrarArtilheiro, setMostrarArtilheiro] = useState(false);
  const [mostrarDestaque, setMostrarDestaque] = useState(false);
  const [avisoPapel, setAvisoPapel] = useState(''); // depois de criar: o que não pôde ser gravado (texto fixo, não toast)
  const [joga, setJoga] = useState(true); // "Eu jogo" (padrão) / "Só organizo o time"
  const [modo, setModo] = useState('privado'); // privado | publico_aprovacao | publico_aberto
  const [team, setTeam] = useState(null); // criada no fim do passo 3
  const [logoArquivo, setLogoArquivo] = useState(null);
  const [logoPrevia, setLogoPrevia] = useState(null);
  const [avisoLogo, setAvisoLogo] = useState(''); // depois de criar: a moderação recusou o logo (o time nasceu igual)
  const [logoEnviado, setLogoEnviado] = useState(false);
  const logoInputRef = useRef(null);
  const [inviteLink, setInviteLink] = useState('');
  const [conviteFalhou, setConviteFalhou] = useState(false); // a geração sozinha falhou — só então o botão de reserva aparece
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  function tocarGols(ligar) {
    const r = alternarGols(mostrarArtilheiro, ligar);
    setMostrarGols(r.mostrarGols);
    setMostrarArtilheiro(r.mostrarArtilheiro);
  }
  function tocarArtilheiro(ligar) {
    const r = alternarArtilheiro(mostrarGols, ligar);
    setMostrarGols(r.mostrarGols);
    setMostrarArtilheiro(r.mostrarArtilheiro);
  }

  // ── Os passos no histórico ─────────────────────────────────────────────────────────────────────────────────
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
    // Cidade é obrigatória em times públicos: é como jogadores perto
    // encontram o time no Explorar/distância. No privado fica opcional. Manda
    // de volta ao passo 1 (onde fica o campo) com um toast claro.
    if (modo !== 'privado' && !cidade.trim()) {
      setToast({ tipo: 'error', mensagem: 'Times públicos precisam de uma cidade. É assim que jogadores perto encontram o seu.' });
      irParaPasso(1, { substituir: true });
      return;
    }
    // Defesa (o botão já fica apagado): o time aberto ao público se apresenta.
    if (faltaSobre({ modo, sobre })) {
      setToast({ tipo: 'error', mensagem: FALTA_SOBRE_NA_CRIACAO });
      return;
    }
    setBusy(true);
    try {
      // Sem cor no body: o backend cai para o fallback interno ('verde'); muda-se
      // depois nas definições do admin (decisão: cor despromovida, SPEC-EQUIPAS).
      const bodyCriar = { nome: nome.trim() };
      // Cidade da lista: manda o pacote todo (o motor guarda a coordenada da lista, sem Nominatim). Digitada: só o texto.
      if (cidade.trim()) Object.assign(bodyCriar, cidadeEscolha || { cidade: cidade.trim() });
      // O bairro só existe dentro de uma cidade e só vale o da LISTA: leva a coordenada da lista; texto que ninguém escolheu não vai.
      if (cidade.trim() && bairros.estado === 'lista' && bairroEscolha && bairroEscolha.bairro === bairro.trim()) Object.assign(bodyCriar, bairroEscolha);
      // O "Sobre o time": obrigatório no time aberto ao público; no fechado vai se a pessoa escreveu.
      if (sobre.trim()) bodyCriar.descricao = sobre.trim().slice(0, MAX_SOBRE_O_TIME);
      if (!joga) bodyCriar.joga = false;
      // Os gols vão no próprio POST e o artilheiro nunca vai ligado com os gols
      // desligados — o app apaga um quando o outro é desligado, e o motor recusa a combinação incoerente.
      if (!mostrarGols) bodyCriar.mostrar_gols = false;
      if (!mostrarArtilheiro || !mostrarGols) bodyCriar.mostrar_artilheiro = false;
      if (!mostrarDestaque) bodyCriar.mostrar_destaque = false;
      const { team: t, geo, bairro: bairroResposta, joga: jogaGravado, premios_salvos: premiosSalvos } = await apiFetch('/api/teams', { method: 'POST', body: JSON.stringify(bodyCriar) });
      // A cidade achada vira informação do time na festa (só "Brasília, DF", sem "Encontramos:"); o aviso fica só quando deu errado.
      const sobreCidade = avisoDaCidade(geo, cidade.trim());
      setCidadeDoTime(sobreCidade?.tipo === 'ok' ? geo.nomeOficial : cidade.trim());
      setAvisoCidade(sobreCidade?.tipo === 'aviso' ? sobreCidade : null);
      const sobreBairro = avisoDoBairro(bairroResposta);
      setBairroDoTime(sobreBairro?.tipo === 'ok' ? (t.bairro || bairro.trim()) : '');
      setAvisoBairro(sobreBairro?.tipo === 'aviso' ? sobreBairro : null);
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
      // O link do convite chega PRONTO. Gerado aqui, uma vez só: o passo 4 nasce com o time e não há outro caminho até ele (o time
      // criado trava o histórico, então voltar não repete a chamada). Sem await: a festa abre na hora e o link entra quando chegar.
      pedirConvite(t.slug).catch((e) => {
        setConviteFalhou(true);
        setToast({ tipo: 'error', mensagem: e.message });
      });
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
    } finally {
      setBusy(false);
    }
  }

  // A chamada do convite é uma só — a da geração sozinha (logo que o time existe) e a do botão de reserva.
  async function pedirConvite(slug) {
    const { token, codigo } = await apiFetch(`/api/teams/${slug}/convite`, { method: 'POST' });
    setInviteLink(linkDoConvite({ origem: ORIGEM_DO_SITE, token, codigo }));
  }

  // O botão de reserva: só aparece se a geração sozinha falhou.
  async function gerarConvite() {
    if (busy || !team) return;
    setBusy(true);
    try {
      await pedirConvite(team.slug);
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
  // O Continuar do passo 1 só vale com nome E cidade. A cidade conta da lista, ou como texto quando a lista não sugere nada.
  const cidadeOk = cidadePreenchida({ texto: cidade, escolha: cidadeEscolha, temSugestoes });
  const podeContinuar = !!nome.trim() && cidadeOk;
  // Defesa (não deve aparecer): time aberto sem cidade — o motor não deixa criar (é como se acha o time no "Radar de peladas").
  const faltaCidade = modo !== 'privado' && !cidade.trim();
  // A festa mostra o logo que o motor aceitou: a prévia local já está carregada (o endereço do motor chegaria pelo proxy, mais tarde).
  const logoDaFesta = logoEnviado ? logoPrevia : null;

  return (
    <div className="app-shell">
      {/* O chevron do topo faz o mesmo que o Voltar do sistema: recua um passo (e do passo 1 pergunta antes de sair). */}
      <Topbar hud="CRIAR TIME" back="voltar" backFallback="/home" />
      <main className="app-main page-reveal" style={{ maxWidth: 480 }}>
        {/* barra de progresso: 3 passos de escolha (3/3 é o último — tem o botão CRIAR O TIME). A tela de convites, depois de criar,
            não é um passo: a barra fica cheia e o rótulo diz "Pronto". */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0 20px' }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ flex: 1, height: 3, background: n <= passo ? 'linear-gradient(90deg,#d4a017,#f0c94a)' : 'rgba(255,255,255,0.10)', boxShadow: n <= passo ? '0 0 8px rgba(212,160,23,0.5)' : 'none' }} />
          ))}
          <span data-progresso style={{ fontFamily: RAJ, fontSize: 11, color: '#9a8fc0', letterSpacing: '0.08em' }}>{passo === 4 ? 'Pronto' : `${passo}/3`}</span>
        </div>

        {passo === 1 && (
          <>
            {/* Sem título nem subtítulo; a tela começa no nome (a estrela), em letra maior. O escudo das iniciais fica — é a parte
                divertida — sem texto que o explique. Rótulos limpos, sem marca de campo exigido: sem nome e cidade o Continuar fica apagado. */}
            <h1 style={SO_LEITOR}>Passo 1 de 3</h1>
            <Lbl grande>Nome do time</Lbl>
            <input className="input input--hud" value={nome} maxLength={40} required aria-required="true" onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Domingueira FC" style={{ width: '100%', fontFamily: RAJ, fontSize: 22, fontWeight: 700, letterSpacing: '0.02em' }} />
            <Lbl grande>Cidade</Lbl>
            <CampoCidadeLazy valor={cidade} aoMudar={(texto, escolha) => { if (texto !== cidade) { setBairro(''); setBairroEscolha(null); } setCidade(texto); setCidadeEscolha(escolha); }} aoSugestoes={aoSugestoes} placeholder="Ex.: Brasília" aria-required="true" style={{ fontSize: 17, fontWeight: 600 }} />
            {/* O bairro, opcional, é de LISTA — os do IBGE no Brasil, as freguesias em Portugal. Cidade sem bairros
                na lista (ou ainda sem cidade): o campo nem aparece, e o time mostra só a cidade. */}
            {bairros.estado === 'lista' ? (
              <>
                <Lbl grande>Bairro (opcional)</Lbl>
                <CampoBairro
                  key={bairros.chave}
                  valor={bairro}
                  aoMudar={(texto, escolha) => { setBairro(texto); setBairroEscolha(escolha); }}
                  itens={bairros.itens}
                />
              </>
            ) : null}
            <Lbl grande>Logo do time (opcional)</Lbl>
            {/* Prévia REDONDA do logo; sem logo, o escudo com as iniciais (nasce enquanto você escreve o nome). */}
            {logoPrevia ? (
              <img src={logoPrevia} alt="Prévia do logo do time" width={128} height={128} style={{ display: 'block', width: 128, height: 128, borderRadius: '50%', objectFit: 'cover', margin: '10px auto 8px', border: '2.5px solid #8b5cf6', boxShadow: '0 0 28px rgba(139,92,246,0.5), 0 0 64px rgba(212,160,23,0.16)' }} />
            ) : (
              <div data-escudo-iniciais style={{ width: 128, height: 128, display: 'grid', placeItems: 'center', fontFamily: RAJ, fontWeight: 800, fontSize: 46, letterSpacing: '0.04em', color: '#fff', background: 'linear-gradient(180deg, rgba(139,92,246,0.14), rgba(255,255,255,0.03))', border: '2.5px solid #8b5cf6', margin: '10px auto 8px', clipPath: 'polygon(20% 0, 80% 0, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0 80%, 0 20%)', boxShadow: '0 0 28px rgba(139,92,246,0.5), 0 0 64px rgba(212,160,23,0.16)', textShadow: '0 0 14px rgba(240,201,74,0.45)' }}>
                {initials(nome) || '?'}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              <button type="button" className="chip" onClick={() => logoInputRef.current?.click()} style={{ color: '#f0c94a', borderColor: 'rgba(212,160,23,0.5)', background: 'rgba(212,160,23,0.08)' }}>
                {logoArquivo ? 'Trocar logo' : 'Escolher logo'}
              </button>
              {logoArquivo ? (
                <button type="button" className="chip" aria-label="Tirar logo" onClick={tirarLogo} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}>
                  <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={aoEscolherLogo} style={{ display: 'none' }} />
            {/* O Continuar está aí desde o começo, apagado, e acende com nome e cidade — a pessoa vê que existe um próximo passo. */}
            <div style={{ marginTop: 24 }}>
              <Cta cheio disabled={!podeContinuar} data-continuar-passo-1 onClick={() => irParaPasso(2)}>Continuar</Cta>
            </div>
          </>
        )}

        {passo === 2 && (
          <>
            <h1 style={SO_LEITOR}>Passo 2 de 3</h1>
            <div data-papel style={{ ...VIDRO, clipPath: CLIP, padding: 12, marginBottom: 10 }}>
              <div style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Você também joga?</div>
              <EscolhaPapel joga={joga} aoTrocar={setJoga} semTexto />
            </div>
            <div data-jogo-itens style={{ ...VIDRO, clipPath: CLIP, padding: 12, marginBottom: 10 }}>
              <div style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 14 }}>O que contar nos jogos?</div>
              {[
                { chave: 'gols', Icone: Target, ...GOLS, ligado: mostrarGols, aoTocar: () => tocarGols(!mostrarGols) },
                { chave: 'artilheiro', Icone: Trophy, ...ARTILHEIRO, ligado: mostrarArtilheiro, aoTocar: () => tocarArtilheiro(!mostrarArtilheiro) },
                { chave: 'destaque', Icone: Star, ...DESTAQUE, ligado: mostrarDestaque, aoTocar: () => setMostrarDestaque(!mostrarDestaque) },
              ].map(({ chave, Icone, titulo, apoio, ligado, aoTocar }) => (
                <div key={chave} data-jogo-item={chave} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <Icone size={22} strokeWidth={1.75} aria-hidden="true" style={{ flexShrink: 0, color: ligado ? '#f0c94a' : 'rgba(255,255,255,0.35)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 14 }}>{titulo}</div>
                    <div className="texto-apoio" style={{ marginTop: 2 }}>{apoio}</div>
                  </div>
                  <Toggle on={ligado} rotulo={titulo} onClick={aoTocar} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
              <Cta cheio onClick={() => irParaPasso(3)}>Continuar</Cta>
              <Cta sec onClick={() => navigate(-1)}>← voltar</Cta>
            </div>
          </>
        )}

        {passo === 3 && (
          <>
            <h1 style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 20, margin: '0 0 14px' }}>Aceita novos membros?</h1>
            {[
              // Textos aprovados pelo dono; o nome do Explorar é "Radar de peladas" (em frase, entre aspas).
              { k: 'privado', t: 'Fechado', d: 'Só entra quem receber o seu link de convite.' },
              { k: 'publico_aprovacao', t: 'Só com a sua aprovação', d: 'Quem achar o time no "Radar de peladas" pede para entrar. Você aceita ou não.' },
              { k: 'publico_aberto', t: 'Aberto', d: 'Qualquer um que achar o time no "Radar de peladas" entra na hora.' },
            ].map((o) => (
              <button key={o.k} type="button" onClick={() => setModo(o.k)} style={{ ...VIDRO, clipPath: CLIP, display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px', marginBottom: 8, cursor: 'pointer', borderColor: modo === o.k ? 'rgba(212,160,23,0.65)' : 'rgba(255,255,255,0.10)', background: modo === o.k ? 'rgba(212,160,23,0.08)' : 'rgba(255,255,255,0.03)', color: 'inherit' }}>
                <span style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 14, display: 'block', color: modo === o.k ? '#f0c94a' : '#fff' }}>{o.t}</span>
                <span className="texto-apoio" style={{ marginTop: 2 }}>{o.d}</span>
              </button>
            ))}
            {/* Quem acha o time no "Radar de peladas" só tem isto para decidir. Aberto ou com aprovação pedem; Fechado não. */}
            {precisaDeSobre(modo) ? (
              <div data-sobre-o-time style={{ marginTop: 14 }}>
                <label htmlFor="sobre-o-time" style={{ fontFamily: RAJ, fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', color: '#c9b6ff', textTransform: 'uppercase', display: 'block', margin: '0 0 8px' }}>Sobre o time</label>
                <textarea
                  id="sobre-o-time"
                  className="input input--hud"
                  value={sobre}
                  rows={3}
                  maxLength={MAX_SOBRE_O_TIME}
                  required
                  aria-required="true"
                  onChange={(e) => setSobre(e.target.value.slice(0, MAX_SOBRE_O_TIME))}
                  placeholder={EXEMPLO_SOBRE_O_TIME}
                  style={{ width: '100%', resize: 'vertical', fontFamily: RAJ, fontSize: 16, fontWeight: 600, lineHeight: 1.35 }}
                />
                <div className="texto-apoio" data-sobre-contagem style={{ textAlign: 'right', marginTop: 4 }}>{sobre.length}/{MAX_SOBRE_O_TIME}</div>
              </div>
            ) : null}
            <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
              <Cta cheio onClick={criarESeguir} disabled={busy || faltaCidade || faltaSobre({ modo, sobre })}>{busy ? 'Criando…' : 'Criar o time'}</Cta>
              {faltaCidade ? <Falta>Time aberto precisa de cidade. Volte ao passo 1 e escolha a cidade.</Falta> : null}
              {!faltaCidade && faltaSobre({ modo, sobre }) ? <Falta>{FALTA_SOBRE_NA_CRIACAO}</Falta> : null}
              <Cta sec onClick={() => navigate(-1)} disabled={busy}>← voltar</Cta>
            </div>
          </>
        )}

        {passo === 4 && team && (
          <>
            {/* A FESTA. A máquina das boas-vindas (deitada sem logo, quadrada com logo) com o nome do time como letreiro, na hora em
                que o time nasce. Embaixo do nome, a cidade (e o bairro) como informação do time. Sem som; prefers-reduced-motion para tudo. */}
            <div className="bv bv--festa" data-festa aria-labelledby="festa-nome">
              <MaquinaDoTime nome={team.nome} logo={logoDaFesta} idNome="festa-nome" />
              {cidadeDoTime ? (
                <p data-cidade-do-time style={{ margin: 0, fontFamily: RAJ, fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', color: '#c9b6ff', textTransform: 'uppercase' }}>
                  {bairroDoTime ? `${bairroDoTime} · ` : ''}{cidadeDoTime}
                </p>
              ) : null}
            </div>
            <h1 style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 24, margin: '14px 0 4px', textAlign: 'center', color: '#f0c94a' }}>Seu time está no ar!</h1>
            <p className="texto-apoio texto-apoio--centro" style={{ marginBottom: 14 }}>Chame a galera pelo link. Ele vale 30 dias.</p>
            {/* Avisos só quando algo deu errado: cidade não achada, bairro não achado, "só organizo" não gravado, logo recusado. */}
            {avisoCidade ? (
              <div role="status" data-aviso-cidade="aviso" className="hud-corners-s" style={{ margin: '0 0 14px', padding: '10px 12px', fontSize: 13, lineHeight: 1.45, color: '#f0c94a', background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.45)' }}>
                {avisoCidade.texto}
              </div>
            ) : null}
            {avisoBairro ? (
              <div role="status" data-aviso-bairro="aviso" className="hud-corners-s" style={{ margin: '0 0 14px', padding: '10px 12px', fontSize: 13, lineHeight: 1.45, color: '#f0c94a', background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.45)' }}>
                {avisoBairro.texto}
              </div>
            ) : null}
            {avisoPapel ? (
              <div role="status" data-aviso-papel className="hud-corners-s" style={{ margin: '0 0 14px', padding: '10px 12px', fontSize: 13, lineHeight: 1.45, color: '#f0c94a', background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.45)' }}>
                {avisoPapel}
              </div>
            ) : null}
            {avisoLogo ? (
              <div role="status" data-aviso-logo className="hud-corners-s" style={{ margin: '0 0 14px', padding: '10px 12px', fontSize: 13, lineHeight: 1.45, color: '#f0c94a', background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.45)' }}>
                {avisoLogo}
              </div>
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
            ) : conviteFalhou ? (
              <Cta onClick={gerarConvite} disabled={busy}>{busy ? 'Gerando…' : 'Gerar link do convite'}</Cta>
            ) : (
              <p className="texto-apoio texto-apoio--centro" role="status" data-gerando-convite>Preparando o link do convite…</p>
            )}
            <div style={{ marginTop: 22 }}>
              {/* Sem state nenhum — a comemoração já aconteceu aqui; a página do time abre direto. */}
              <Cta cheio onClick={() => navigate(`/time/${team.slug}`)}>Ir para o time</Cta>
            </div>
          </>
        )}
      </main>
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}

      {/* O Voltar do sistema a partir do passo 1 pergunta antes de jogar fora o que foi preenchido. Portal para o body (overlay
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
