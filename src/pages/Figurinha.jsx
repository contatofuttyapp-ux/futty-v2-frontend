// Futty v2.0 — Figurinha (/figurinha): "card studio". Card 2:3 com tilt 3D e
// entrada animada; opções em tabs (Fundo/Frame/Uniforme) + toggles compactos.
// Selos de honra no cromo + olhinho. Trocar foto é preview local (sem backend).
// Tudo no cliente (canvas).
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import CropModal from '../components/CropModal';
import { useAuth } from '../hooks/useAuth';
import { useAd } from '../hooks/useAd';
import { usePerfil } from '../context/PerfilContext';
// Liga o alinhamento dos caches ao perfil (foto/genérico novo chega ao Início, Ranking, Feed).
import '../lib/alinharCard';
// Pagamentos P2: liga a loja (SDK do RevenueCat) à conta — esta aba é pré-carregada em ócio.
import '../lib/ligarLoja';
import { espelharBrilhantesNoInicio } from '../lib/cacheCard';
import { nomeJogador } from '../utils/avatar';
import { gerarFigurinhaCanvas, gerarCamadasFigurinha, mostraFigurinha } from '../utils/figurinhaCanvas';
import { avatarGenericoUrl } from '../utils/avatarGenerico';
import { estadoBrilhantes, pedidoDoProduto, EVENTO_BRILHANTES } from '../lib/brilhantes';
import { totalDeGeracoes } from '../utils/totalDeGeracoes';
import { produtoDoPedido } from '../lib/planos';
import { lojaLigada as calcularLojaLigada, produtosDaLoja } from '../lib/loja';
import { KITS_FIGURINHA } from '../utils/kitsFigurinha';
import { DESTINO_DO_CADEADO, acaoDoToque, direitoDaGrade, estadoDoUniforme, ordemDaGrade, podeRefazer } from '../utils/uniformesGrade';
import { INTERVALO_CONSULTA_MS, TETO_ACOMPANHAMENTO_MS, situacaoDaPintura, lerPinturaGuardada } from '../utils/progressoPintura';
import AdCard from '../components/AdCard';
import Topbar from '../components/Topbar';
import BotaoLoja from '../components/BotaoLoja';
import LoadingFutty from '../components/LoadingFutty';
import AvatarGenericoSheet from '../components/AvatarGenericoSheet';
import Toast from '../components/Toast';
import '../styles/app.css';
import { useAcoesDaPintura } from './figurinha/acoesDaPintura';
import { useAcoesDaFoto } from './figurinha/acoesDaFoto';
import { carregarHistorico, useAcoesDoHistorico } from './figurinha/acoesDoHistorico';
import { useAcoesDoCromo } from './figurinha/acoesDoCromo';
import { useAcoesDoStudio } from './figurinha/acoesDoStudio';
import { FOTO_ZOOM_MAX, ZOOM_MAX, ZOOM_MIN } from './figurinha/constantes';
import { FRESCOR_DO_INICIO_MS, brilhanteDoInicio, idadeDoInicio } from './figurinha/doInicio';
import ConfirmarPintura from './figurinha/ConfirmarPintura';
import ModalDaFoto from './figurinha/ModalDaFoto';
import SelosDaFigurinha from './figurinha/SelosDaFigurinha';
import BotoesDoCromo from './figurinha/BotoesDoCromo';
import SeletoresDoCard from './figurinha/SeletoresDoCard';
import AvisoEmailNaoConfirmado from './figurinha/AvisoEmailNaoConfirmado';
import CartaoDaLoja from './figurinha/CartaoDaLoja';
import BotoesDaFoto from './figurinha/BotoesDaFoto';
import ControleDeZoom from './figurinha/ControleDeZoom';
import AvisoDaPintura from './figurinha/AvisoDaPintura';
import ZonaDoCard from './figurinha/ZonaDoCard';
import EstreiaDaFigurinha from './figurinha/EstreiaDaFigurinha';
import OverlayGerando from './figurinha/OverlayGerando';
import GradeDeUniformes from './figurinha/GradeDeUniformes';
import { useTilesDosFundos } from './figurinha/useTilesDosFundos';
import { useSelosDaFigurinha } from './figurinha/useSelosDaFigurinha';
import { losangoDoCanto } from './figurinha/estilos';

export default function Figurinha() {
  const navigate = useNavigate();
  // O PerfilContext já carrega o /api/me 1x por sessão: esta página só usa o `perfil` de lá para
  // inicializar o espelho local `me` (que existe porque a página precisa de merges finos — slots,
  // kit_ativo, avatar_url — que o card usa de imediato, sem esperar round-trip) e as escolhas guardadas
  // (fundo/avatar genérico/fase da estreia).
  const { perfil, erro: erroPerfil, deCache: perfilDeCache, recarregar: recarregarPerfilGlobal, hidratar: hidratarPerfilGlobal } = usePerfil();
  const { session } = useAuth();
  const userId = session?.user?.id || null;

  const [me, setMe] = useState(null);
  const [fundo, setFundo] = useState('estadio');
  const [avatarGenericoEscolha, setAvatarGenericoEscolha] = useState(null);
  const [sheetAvatarAberto, setSheetAvatarAberto] = useState(false);
  const corFrame = 'dourado';
  const [fotoLocal, setFotoLocal] = useState(null);
  const [uploadFoto, setUploadFoto] = useState(false);
  // A pintura roda em SEGUNDO PLANO no motor: o POST devolve um jobId e o app consulta
  // GET /api/figurinha/job/:id. `pintura` = { jobId, kit, estreia, estimativaSegundos, etapa,
  // decorridoMs, baseEm } (o decorridoMs do motor + o relógio local desde `baseEm`). Nasce do que ficou
  // guardado no aparelho: quem saiu da tela (ou fechou o app) e volta reencontra a pintura — pronta, ou
  // ainda correndo. `agora` é o relógio da barra.
  const [pintura, setPintura] = useState(() => lerPinturaGuardada(userId));
  const [agora, setAgora] = useState(() => Date.now());
  const [gerandoIA, setGerandoIA] = useState(() => !!lerPinturaGuardada(userId));
  // Kit escolhido na grelha que ainda não foi pintado: abre o diálogo "Gerar figurinha com este uniforme?" em vez
  // do window.confirm() (não tem como levar o "N gerações" nem o "~45s" no texto de um confirm nativo).
  const [kitParaPintar, setKitParaPintar] = useState(null);
  const [limiteIA, setLimiteIA] = useState(false);
  const [erroIA, setErroIA] = useState(false); // falha da geração (≠ 403) → estado de erro no overlay
  const [erroIAmsg, setErroIAmsg] = useState(''); // mensagem específica (ex.: foto inválida); vazio = texto genérico
  const [semGeracoes, setSemGeracoes] = useState(false); // o erro foi SEM_DIREITO (as gerações acabaram)
  const [fotoRecusada, setFotoRecusada] = useState(false); // o erro foi FOTO_RECUSADA (cabeça cortada nas duas): o recado manda trocar de foto, não tentar de novo
  // Toast curto e genérico: { mensagem, tipo }. Dois usos — aviso
  // quando /avatar/ai reutiliza o slot (mesma foto de antes, sem isto o botão
  // "carregava e nada acontecia"), e erro do PATCH de fundo (ver escolherFundo).
  const [toast, setToast] = useState(null);
  // Destaque pulsante no botão Gerar: true assim que uma foto NOVA
  // sobe nesta sessão, até a próxima geração terminar (reutilizada ou não) —
  // guia quem trocou a foto e não percebeu que falta tocar em Gerar.
  const [fotoTrocadaSemGerar, setFotoTrocadaSemGerar] = useState(false);
  const [emailNaoConfirmado, setEmailNaoConfirmado] = useState(false); // gate anti-abuso: geração exige e-mail confirmado
  const [reenviarBusy, setReenviarBusy] = useState(false);
  const [reenviarFeito, setReenviarFeito] = useState(false);
  const [modalFoto, setModalFoto] = useState(false); // modal "A tua foto" (foto actual + estado IA + carregar nova)
  const [trocandoModo, setTrocandoModo] = useState(false); // PUT /api/me/avatar/modo em voo
  const [activeTab, setActiveTab] = useState('fundo');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const [uploadErro, setUploadErro] = useState(null); // P1-5 — { texto, podeRepetir }
  const ultimoFicheiro = useRef(null); // retém a foto p/ "tentar de novo"
  const ultimoRecorte = useRef(null); // idem, para o "Ajustar enquadramento" (PUT do recorte)
  const ultimoRecorteMini = useRef(null); // o quadrado tracejado da miniatura do último recorte (gravado depois de subir)
  // Zoom do avatar no card. Escala interna 0.88–1.43 (passo 0.11); exibida ÷1.1
  // → 80/90/100/110/120/130%. Base 1.1 = 100% exibido. Reinicia sempre a 110%.
  // Clamp defensivo no arranque: normaliza qualquer valor fora de [ZOOM_MIN, ZOOM_MAX]
  // (ex.: um 0.88 herdado) para dentro dos limites novos.
  const [avatarZoom, setAvatarZoom] = useState(() => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, 1.1)));
  // Zoom do card com a foto. Só da vista e do que se baixa/compartilha daqui — o enquadramento salvo
  // (Trocar foto → Ajustar enquadramento) continua a ser o de todas as telas; volta a 1 com foto nova.
  const [fotoZoom, setFotoZoom] = useState(1);
  // Flow de estreia (1ª visita sem foto/avatar): null = a decidir, 'foto' |
  // 'gerando' | 'pronto' = ecrãs A/B/C, 'fim' = studio normal.
  const [estreiaFase, setEstreiaFase] = useState(() => (localStorage.getItem('futty_figurinha_estreia') ? 'fim' : null));
  const [previewUrl, setPreviewUrl] = useState(null); // composto (estreia)
  const [fundoUrl, setFundoUrl] = useState(null); // camada de fundo (studio, sem jogador)
  const [jogadorUrl, setJogadorUrl] = useState(null); // camada do jogador (studio)
  const [placaUrl, setPlacaUrl] = useState(null); // camada placa+nome (studio, topo)
  const fileRef = useRef(null);
  // Enquadrar dentro de "Trocar foto". cropFile alimenta o
  // CropModal nos dois fluxos ("Escolher outra foto" e "Ajustar
  // enquadramento"); cropModo decide o que "Confirmar" faz. origParaEnviar só
  // é usado no modo 'nova' (a normalizada vai junto do recorte como a "original").
  const [cropFile, setCropFile] = useState(null);
  const [cropModo, setCropModo] = useState('nova'); // 'nova' | 'ajustar'
  const [ajustandoEnquadramento, setAjustandoEnquadramento] = useState(false);
  const origParaEnviar = useRef(null);
  // "Minhas figurinhas" (histórico, até 6) — carregado quando o modal "Sua
  // foto" abre; usandoHistoricoId é o id em voo (PUT /historico/:id).
  const [historico, setHistorico] = useState([]);
  const [usandoHistoricoId, setUsandoHistoricoId] = useState(null);

  const jogador = me?.user || {};
  const stats = me?.stats || {};
  // GRUPO B 6a — `equipa` existia só para alimentar o PlayerCard, que saiu daqui.
  // Regra única: a foto CRUA nunca entra no card. Só entra o avatar quando é
  // um avatar IA confirmado (foto_url e avatar_url existem e são diferentes —
  // logo após o upload o backend grava a foto crua em ambos, então é igual).
  const fotoOriginal = me?.user?.foto_url || null;
  // `avatarEhIA` = o card mostra AGORA uma figurinha (IA). Quem diz é o motor
  // (`figurinha_ativa`, pelo nome do arquivo — mostraFigurinha), e não foto_url ≠ avatar_url: a foto
  // do Google em avatar_url virava "figurinha" — seletor de fundos e zoom abaixo da moldura numa foto.
  const avatarEhIA = mostraFigurinha(me?.user);
  // Existe uma figurinha (mesmo que o card esteja em modo 'foto' agora) — o sinal certo para "há algo
  // para o interruptor escolher", ao contrário de avatarEhIA, que só diz o que está ativo NESTE instante.
  // Não serve `!!kit_ativo`: kit_ativo é só "qual uniforme", não "já gerou" — toda conta nova apareceria
  // com o interruptor sem nunca ter gerado nada. tem_figurinha vem calculado do servidor
  // (services/inicio.js), que sabe de verdade se existe alguma figurinha.
  const temFigurinhaAlguma = !!me?.user?.tem_figurinha;
  // MODO DO CARD (§3/§4): com Brilhante, o card de sempre (avatar recortado
  // sobre o fundo escolhido). Sem Brilhante mas COM foto, a figurinha COMUM —
  // a foto como ela é, na mesma moldura. Sem foto nenhuma, o genérico da casa
  // continua a ser o convite (nunca um buraco).
  const modoCard = avatarEhIA ? 'brilhante' : 'comum';
  const temFoto = !!fotoOriginal;
  // O "Tamanho −/+" serve aos dois cards: na figurinha é o tamanho do jogador recortado; na
  // FOTO é o zoom da foto, com piso em "cobre a moldura por completo" (o − para em 1).
  const zoomDaFoto = !avatarEhIA && temFoto;
  const zoomNoMinimo = zoomDaFoto ? fotoZoom <= 1 : avatarZoom <= ZOOM_MIN;
  const zoomNoMaximo = zoomDaFoto ? fotoZoom >= FOTO_ZOOM_MAX : avatarZoom >= ZOOM_MAX;
  function mudarZoom(sentido) {
    if (zoomDaFoto) setFotoZoom((z) => Math.min(FOTO_ZOOM_MAX, Math.max(1, +(z + sentido * 0.1).toFixed(2))));
    else setAvatarZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(z + sentido * 0.11).toFixed(2))));
  }
  const jogadorCard = avatarEhIA || temFoto
    ? jogador
    : { ...jogador, avatar_url: avatarGenericoUrl(jogador.id, avatarGenericoEscolha, nomeJogador(jogador)) };
  // A2 — kit vestido + kits já gerados (slots). Vindos do GET /api/me.
  const kitAtivo = me?.user?.kit_ativo || 'dark-gold';
  const slotsKits = me?.slots || [];
  // O botão "Gerar Avatar IA" vira o CTA dourado (receita do "Ver
  // sorteio", Inicio.jsx) exactamente na janela em que ele é a única ação que
  // falta: foto nova já subiu, ainda não gerou. Fora dessa janela (idle, ou já
  // gerando) continua roxo — dourado é reservado para "toque aqui agora".
  const brilharGerar = fotoTrocadaSemGerar && !gerandoIA;
  // DIREITO DE GERAR (SPEC-FIGURINHA-3 §5) — quem pode gerar uma Brilhante e com que uniforme. Carregado
  // uma vez ao abrir a tela; recarregado depois de gerar (o crédito baixa) e depois de pedir ativação.
  // Nasce com o que o /api/inicio já trouxe (cache de sessão), em vez de null: pedir de novo seria mais
  // um pedido (606 ms de Lisboa) para saber coisas que estão em casa.
  const [brilhante, setBrilhante] = useState(() => brilhanteDoInicio(userId));
  // O estado que chega do servidor (depois de gerar, de pedir ativação) também vai para o Início
  // guardado — a Figurinha nasce a partir dele (brilhanteDoInicio), e sem isto o contador "N gerações
  // restantes" abriria com o número de ANTES de gerar. Uma resposta que falhou (o estadoBrilhantes
  // devolve "ninguém tem nada" e marca indisponivel) não vira verdade guardada.
  const aplicarBrilhante = (e) => {
    if (!e) return;
    setBrilhante(e);
    if (!e.indisponivel) espelharBrilhantesNoInicio(userId, e);
  };
  const temDireitoDeGerar = !!brilhante?.direito?.fonte;
  const fonteDireito = brilhante?.direito?.fonte || null;
  const kitDoTime = fonteDireito === 'time' ? brilhante.direito.kit_id : null;
  // Gerações que sobram no direito ESCOLHIDO (créditos, ou o que
  // falta no pacote do time): é o "N" do contador e do diálogo de confirmação.
  const restantesDireito = brilhante?.direito?.restantes ?? 0;
  // O que a pessoa VÊ: tudo o que ela ainda pode gerar (pacotes dos times + créditos), não só o direito gasto primeiro
  // (utils/totalDeGeracoes.js). É o número do contador, do "Refazer" e da confirmação.
  const totalGeracoes = totalDeGeracoes(brilhante);
  const meuTimeBrilhante = (brilhante?.times || []).find((t) => t.sou_dono) || null;
  // PAGAMENTOS P2 — com a loja ligada (o motor diz `loja_pronta`, é o app nativo e o SDK do RevenueCat
  // tem a chave: lib/loja.js#lojaLigada) os convites desta tela dizem "Comprar · preço", com o preço
  // que a LOJA formata; sem ela, o texto do pedido de ativação. Os dois levam ao MESMO lugar,
  // /planos?destaque=… — é lá que se compra ou se pede. Nunca as duas coisas juntas numa tela.
  const lojaLigada = calcularLojaLigada(brilhante);
  const [precosDaLoja, setPrecosDaLoja] = useState(null); // { minha: { priceString }, pacote: … }
  useEffect(() => {
    if (!lojaLigada) return undefined;
    let vivo = true;
    produtosDaLoja().then((r) => { if (vivo && r?.produtos) setPrecosDaLoja(r.produtos); });
    return () => { vivo = false; };
  }, [lojaLigada]);
  /** O texto do convite de um produto — o mesmo verbo do botão dos Planos. */
  function textoDoConvite(produto, { presente = false } = {}) {
    if (!lojaLigada) return produtoDoPedido(produto)?.botaoBloco || 'Pedir ativação';
    const preco = precosDaLoja?.[produto]?.priceString;
    // Time que já tem o pacote: o convite vira "Comprar para o time" (mais gerações, de presente para todos).
    const verbo = produto === 'pacote' ? (presente ? 'Comprar para o time' : 'Comprar para o meu time') : 'Comprar';
    return preco ? `${verbo} · ${preco}` : verbo;
  }
  // O recado do pedido SOBREVIVE a fechar o app: vem do estado gravado, não só do clique desta sessão.
  // Pendente diz que está na fila; recusado diz o motivo que o dono escreveu no Gabinete; ativado não
  // aparece aqui de todo — quem foi ativado já vê o botão dourado, e um recado sobre um pedido
  // resolvido só ia competir com ele.
  // A GRADE DE UNIFORMES (a mesma .fig-seletor-grade dos fundos) é sempre a mesma, nos dois cards e para
  // os três casos; o que muda é o estado de cada tile, que sai do DIREITO (utils/uniformesGrade.js):
  //   grátis — todos com cadeado; o toque leva à Minha Figurinha (Planos, sem preço no app da loja: ehNativo)
  //   pacote — o uniforme do time aberto (pintável) e os outros com cadeado → Minha Figurinha
  //   minha  — todos abertos; os ainda não pintados só com a estrelinha de IA (o custo de 1 geração é dito ao tocar, na confirmação)
  // Estados de tile: vestido (✓) · pintado (um toque veste, grátis) · geravel (confirma e gasta 1) ·
  // trancado.
  // Nada de "em breve"; o pacote do time, para o dono, está no cartão "Loja de figurinhas" mais abaixo.
  const direitoDaGradeAgora = direitoDaGrade({ fonteDireito, creditos: brilhante?.creditos });
  function estadoDoKit(kit) {
    return estadoDoUniforme({ direito: direitoDaGradeAgora, kitId: kit.id, kitVestido: avatarEhIA ? kitAtivo : null, kitDoTime, slots: slotsKits });
  }
  const kitsDaGrade = ordemDaGrade(KITS_FIGURINHA.filter((k) => k.estado !== 'breve'), { direito: direitoDaGradeAgora, kitDoTime });
  function tocarUniforme(kit) {
    if (gerandoIA) return;
    const acao = acaoDoToque(estadoDoKit(kit));
    if (acao === 'vestir' || acao === 'pintar') escolherKit(kit);
    else if (acao === 'planos') navigate(DESTINO_DO_CADEADO);
  }
  // "Refazer": ação pequena embaixo do uniforme atual (só com a figurinha no card e geração sobrando).
  const kitDoCard = avatarEhIA ? KITS_FIGURINHA.find((k) => k.id === kitAtivo) || null : null;
  const refazerAtual = !!kitDoCard && podeRefazer({ direito: direitoDaGradeAgora, kitVestido: kitAtivo, kitDoTime, restantes: restantesDireito, avatarEhIA });
  function gradeDeUniformes() {
    return (
      <GradeDeUniformes estadoDoKit={estadoDoKit} gerandoIA={gerandoIA} kitsDaGrade={kitsDaGrade} textoDoConvite={textoDoConvite} tocarUniforme={tocarUniforme} />
    );
  }

  const pedidoPacote = pedidoDoProduto(brilhante?.pedidos, 'pacote', meuTimeBrilhante?.id);
  const pedidoMinha = pedidoDoProduto(brilhante?.pedidos, 'minha');
  const candidatos = [pedidoPacote, pedidoMinha].filter(Boolean);
  const pedidoVivo = candidatos.find((p) => p.estado === 'pendente') || candidatos[0] || null;
  // Com a loja ligada a tela vende, não fala de pedidos (P2: nunca as duas coisas juntas).
  // O cartão "Loja de figurinhas" convida com o exemplo quem ainda não tem figurinha nem geração sobrando; os demais veem a linha curta.
  const lojaConvida = !avatarEhIA && !temDireitoDeGerar;
  const pacoteDoTimeAtivo = !!meuTimeBrilhante?.brilhante_ativo;
  const recadoPedido = lojaLigada ? null
    : (pedidoVivo?.estado === 'pendente' ? 'Pedido enviado. A gente ativa e avisa.' : null)
      || (pedidoVivo?.estado === 'recusado' ? (pedidoVivo.motivo || 'Este pedido não seguiu. Tente de novo.') : null);

  useEffect(() => {
    let vivo = true;
    // Com o estado semeado pelo Início recente, não se pede nada: a tela abre
    // com a resposta certa e sem rede. Fora dessa janela revalida-se — em
    // SEGUNDO PLANO, para não entrar na conta de "dados" de quem já tem tela.
    const idade = idadeDoInicio(userId);
    if (brilhanteDoInicio(userId) && idade != null && idade < FRESCOR_DO_INICIO_MS) return () => { vivo = false; };
    estadoBrilhantes({ segundoPlano: true }).then((e) => {
      if (!vivo || !e) return;
      setBrilhante(e);
      if (!e.indisponivel) espelharBrilhantesNoInicio(userId, e); // ver aplicarBrilhante
    });
    return () => { vivo = false; };
  }, [userId]);

  // Quem compra tem de ver o número subir sem fechar o app. A compra é confirmada nos Planos, mas o crédito pode chegar depois (o webhook
  // da loja, o "Restaurar compras"): lib/brilhantes.js avisa quando o motor já mostra a compra, e a volta da tela ao primeiro plano (a folha
  // da loja fechou, o app voltou do fundo) relê o estado em segundo plano — no máximo uma vez a cada 15 s.
  useEffect(() => {
    let vivo = true;
    let ultimaLeitura = Date.now();
    const aoAviso = (ev) => { if (vivo && ev?.detail?.direito) setBrilhante(ev.detail); };
    const aoVoltar = () => {
      if (document.visibilityState !== 'visible' || Date.now() - ultimaLeitura < 15000) return;
      ultimaLeitura = Date.now();
      estadoBrilhantes({ segundoPlano: true }).then((e) => {
        if (!vivo || !e || e.indisponivel) return;
        setBrilhante(e);
        espelharBrilhantesNoInicio(userId, e);
      });
    };
    window.addEventListener(EVENTO_BRILHANTES, aoAviso);
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      vivo = false;
      window.removeEventListener(EVENTO_BRILHANTES, aoAviso);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [userId]);

  // SELOS DE HONRA: busca os selos do utilizador; mostra no cromo os 2 de maior prioridade que NÃO
  // estejam ocultos (olhinho, persistido). Vêm já ordenados por prioridade (campeonato > ranking) do
  // backend. Os selos do cache entram JÁ no primeiro render: vindos num microtask, a chegada tardia
  // recomeçava o desenho do cromo. Os selos nunca seguram a tela: sem cache, o cromo desenha sem eles e
  // redesenha uma vez quando o /api/me/selos chegar.
  // Anúncio pedido no topo da tela, em paralelo com o resto (mesmo motivo da Resenha e do Ranking — ver
  // useAd).
  const { ad: adFigurinha, pronto: adPronto } = useAd('figurinha');
  const { selos, selosOcultos, toggleSelo, selosVisiveis, selosKey } = useSelosDaFigurinha({ userId });
  // `fotoOverride` = o preview LOCAL da foto que o servidor acabou de confirmar (200):
  // o card comum a pinta na hora, sem esperar a imagem nova voltar pelo proxy. Só na
  // comum (a base é a foto); o card com figurinha continua vindo do avatar_url. Não
  // entra nas deps do efeito de pintura de propósito: quem o dispara é a troca do
  // foto_url que chega no mesmo lote (setMe + setFotoLocal), e limpar o preview depois
  // não precisa repintar nada.
  const opts = { jogador: jogadorCard, stats, fundo, corFrame, avatarZoom, fotoZoom: modoCard === 'comum' ? fotoZoom : 1, modo: modoCard, fotoOverride: modoCard === 'comum' ? fotoLocal : null, selos: selosVisiveis.map((s) => ({ tier: s.tier, label: s.label })) };

  // Pré-selecciona as escolhas guardadas a partir do `perfil` já carregado
  // pelo PerfilContext — 1x só, quando ele chega (guard por ref: o `perfil`
  // pode mudar depois, ex. recarregarPerfilGlobal(), sem reiniciar o flow).
  const inicializadoRef = useRef(false);
  useEffect(() => {
    if (inicializadoRef.current) return undefined;
    if (!perfil && !erroPerfil) return undefined;
    // Adiado ao microtask (mesmo padrão do PerfilContext): setState síncrono no corpo do efeito dispara
    // cascading renders.
    //
    // O `inicializadoRef` é marcado DENTRO do microtask, não antes dele. Marcá-lo aqui fora deixava a
    // página vazia em `npm run dev`: o StrictMode monta, desmonta e remonta cada efeito, e o cleanup da
    // primeira montagem punha `ativo = false` antes de o microtask correr — o setMe nunca acontecia, e na
    // remontagem o guard já estava fechado. Resultado: `me` ficava null para sempre e a Figurinha abria a
    // pedir "Adicionar foto" numa conta que tem foto e figurinha. Em produção não aparecia (uma montagem
    // só), mas o dev e o LIGAR-FUTTY.bat são onde a casa testa — uma tela que mente na bancada não serve
    // de bancada.
    let ativo = true;
    Promise.resolve().then(() => {
      if (!ativo) return;
      inicializadoRef.current = true;
      if (perfil) {
        setMe(perfil);
        if (perfil?.user?.fundo_figurinha) setFundo(perfil.user.fundo_figurinha);
        if (perfil?.user?.avatar_generico) setAvatarGenericoEscolha(perfil.user.avatar_generico);
        // Decisão da estreia (só quando ainda não foi vista): sem avatar → flow.
        if (!localStorage.getItem('futty_figurinha_estreia')) {
          setEstreiaFase(perfil?.user?.avatar_url ? 'fim' : 'foto');
        }
      } else if (erroPerfil) {
        setErro(erroPerfil);
      }
    });
    return () => {
      ativo = false;
    };
  }, [perfil, erroPerfil]);

  // O ESPELHO TEM DE OUVIR O DADO FRESCO UMA VEZ.
  //
  // O efeito acima semeia `me` com o PRIMEIRO `perfil` que chega — e o PerfilContext entrega primeiro o
  // CACHE LOCAL deste aparelho (stale-while-revalidate) e só depois a resposta do /api/me. O guard por
  // ref existe por bom motivo (o flow da estreia não pode reiniciar a meio), mas apanharia também a
  // actualização: o cromo desta página ficaria preso na figurinha gravada no cache, enquanto o Início —
  // que lê o contexto directo — já mostraria a nova. Quem nunca tinha aberto o app naquele aparelho
  // veria o certo; quem já tinha, veria o antigo — parece coisa de PC contra celular.
  //
  // Sincroniza-se só o que vem do servidor e não se edita aqui. Fundo, zoom e avatar genérico ficam como
  // o utilizador os deixou. E se houver acção local em voo (upload, geração, foto por gerar), ela é mais
  // nova do que este fresco — desiste-se sem aplicar, para não desfazer o que ele acabou de fazer.
  const frescoAplicadoRef = useRef(false);
  useEffect(() => {
    if (frescoAplicadoRef.current || perfilDeCache || !perfil) return undefined;
    frescoAplicadoRef.current = true;
    if (gerandoIA || uploadFoto || fotoLocal) return undefined;
    // Adiado ao microtask, como o efeito de semeadura acima: setState síncrono
    // no corpo do efeito dispara cascading renders.
    let ativo = true;
    Promise.resolve().then(() => {
      if (!ativo) return;
      setMe((m) => (m ? {
        ...m,
        user: {
          ...m.user,
          foto_url: perfil.user?.foto_url ?? m.user?.foto_url,
          avatar_url: perfil.user?.avatar_url ?? m.user?.avatar_url,
          kit_ativo: perfil.user?.kit_ativo ?? m.user?.kit_ativo,
          // o que o card mostra anda junto com o avatar_url.
          figurinha_ativa: perfil.user?.figurinha_ativa ?? m.user?.figurinha_ativa,
          tem_figurinha: perfil.user?.tem_figurinha ?? m.user?.tem_figurinha,
        },
        slots: perfil.slots ?? m.slots,
      } : perfil));
    });
    return () => { ativo = false; };
  }, [perfil, perfilDeCache, gerandoIA, uploadFoto, fotoLocal]);

  // Liberta o objectURL da foto local (ao trocar/desmontar).
  useEffect(() => {
    if (!fotoLocal) return undefined;
    return () => URL.revokeObjectURL(fotoLocal);
  }, [fotoLocal]);

  // Uma geração do cromo só é jogada fora se já houver cromo NA TELA. Descartar a cada mudança a
  // meio — os selos a chegarem do cache ou da rede — jogava fora o desenho quase pronto e o card
  // ficava no F até a geração seguinte acabar: "a Figurinha só pinta quando /api/me/selos chega".
  // Assim a primeira a terminar pinta, e a mais nova substitui quando terminar.
  const geracaoCromoRef = useRef(0);
  const cromoNaTelaRef = useRef({ fim: false, estreia: false });
  const montadaRef = useRef(true);
  useEffect(() => {
    montadaRef.current = true;
    return () => { montadaRef.current = false; };
  }, []);

  useEffect(() => {
    if (!me) return; // sem perfil ainda: nada de pintar um cromo vazio
    const minha = ++geracaoCromoRef.current;
    const modo = estreiaFase === 'fim' ? 'fim' : 'estreia';
    const podePintar = () => montadaRef.current && (geracaoCromoRef.current === minha || !cromoNaTelaRef.current[modo]);
    const trocar = (setter) => (blob) => setter((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return blob ? URL.createObjectURL(blob) : null;
    });
    const gerar = async () => {
      try {
        if (modo === 'fim') {
          // Studio: duas camadas (partículas entre fundo e jogador).
          const { fundoBlob, jogadorBlob, placaBlob } = await gerarCamadasFigurinha(opts);
          if (!podePintar()) return;
          trocar(setFundoUrl)(fundoBlob);
          trocar(setJogadorUrl)(jogadorBlob);
          trocar(setPlacaUrl)(placaBlob);
        } else {
          // Estreia: imagem composta única.
          const blob = await gerarFigurinhaCanvas(opts);
          if (!podePintar()) return;
          trocar(setPreviewUrl)(blob);
        }
        cromoNaTelaRef.current[modo] = true;
      } catch (e) {
        console.error('[preview]', e);
      }
    };
    gerar();
    // selosKey: regenera o cromo quando os selos visíveis mudam (chegam da API ou
    // o utilizador oculta/mostra no olhinho). me?.user?.id: a 1ª geração espera o perfil.
  // `jogador?.foto_url` entra nas deps por causa do modo COMUM: ali a base do card é a FOTO, e trocá-la
  // tem de repintar o cromo — no modo brilhante quem muda é o avatar_url, que já estava aqui.
  }, [me?.user?.id, fundo, avatarZoom, fotoZoom, avatarEhIA, jogador?.avatar_url, jogador?.foto_url, avatarGenericoEscolha, estreiaFase, selosKey]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => () => { if (fundoUrl) URL.revokeObjectURL(fundoUrl); }, [fundoUrl]);
  useEffect(() => () => { if (jogadorUrl) URL.revokeObjectURL(jogadorUrl); }, [jogadorUrl]);
  useEffect(() => () => { if (placaUrl) URL.revokeObjectURL(placaUrl); }, [placaUrl]);

  const { epicoTile, goldenTile, royalTile } = useTilesDosFundos();

  // Marca a estreia como concluída e passa ao studio normal.
  function concluirEstreia() {
    localStorage.setItem('futty_figurinha_estreia', '1');
    setEstreiaFase('fim');
  }

  const { gerarAvatarIAEstreia, gerarAvatarIA, aplicarPinturaPronta, aplicarPinturaFalhou } = useAcoesDaPintura({ aplicarBrilhante, gerandoIA, kitAtivo, recarregarPerfilGlobal, setAgora, setEmailNaoConfirmado, setErro, setErroIA, setErroIAmsg, setEstreiaFase, setFotoLocal, setFotoRecusada, setFotoTrocadaSemGerar, setGerandoIA, setLimiteIA, setMe, setPintura, setSemGeracoes, setToast, userId });

  const { onPickFile, abrirAjustarEnquadramento, aoConfirmarCrop, aoCancelarCrop, repetirUpload } = useAcoesDaFoto({ aplicarNoPerfilGlobal, cropModo, estreiaFase, fotoOriginal, gerarAvatarIAEstreia, jogador, me, origParaEnviar, setAjustandoEnquadramento, setCropFile, setCropModo, setErro, setEstreiaFase, setFotoLocal, setFotoRecusada, setFotoTrocadaSemGerar, setFotoZoom, setMe, setModalFoto, setToast, setUploadErro, setUploadFoto, temDireitoDeGerar, ultimoFicheiro, ultimoRecorte, ultimoRecorteMini });

  const { usarDoHistorico } = useAcoesDoHistorico({ recarregarPerfilGlobal, setErro, setFotoLocal, setMe, setToast, setUsandoHistoricoId, usandoHistoricoId });
  useEffect(() => {
    if (!modalFoto) return undefined;
    let vivo = true;
    carregarHistorico().then((items) => { if (vivo) setHistorico(items); });
    return () => { vivo = false; };
  }, [modalFoto]);

  // Aviso de erro partilhado: erro de upload com mensagem accionável +
  // "tentar de novo" inline; senão, o erro genérico da página. No studio o erro do
  // upload sai SOB O CARD (`avisoUploadErro`), onde a pessoa está olhando, e o fim da
  // página fica só com o genérico (`avisoErroGenerico`): um erro que mora
  // abaixo das abas ninguém vê, e a tela ainda dizia que a foto já tinha mudado.
  const avisoUploadErro = uploadErro ? (
    <div className="alert alert--error" role="alert" style={{ margin: 0, display: 'grid', gap: 8, justifyItems: 'start' }}>
      <span>{uploadErro.texto}</span>
      {uploadErro.podeRepetir ? (
        <button type="button" onClick={repetirUpload} disabled={uploadFoto} className="btn btn--sm hud-corners-s cta-gold" style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em' }}>
          {uploadFoto ? 'Enviando…' : 'Tentar de novo'}
        </button>
      ) : null}
    </div>
  ) : null;
  const avisoErroGenerico = !uploadErro && erro ? (
    <div className="alert alert--error" style={{ margin: 0 }}>{erro}</div>
  ) : null;
  const avisoErro = avisoUploadErro || avisoErroGenerico;

  const { partilharCromo, baixar, partilhar } = useAcoesDoCromo({ busy, concluirEstreia, jogador, opts, setBusy, setErro });

  // Segue a pintura: pergunta ao motor a cada 3 s enquanto a aba está visível e, ao voltar para ela, na hora.
  // Sair da tela só pára as perguntas — a pintura continua no motor (e o push avisa se a pessoa saiu do app).
  const jobAtual = pintura?.jobId || null;
  const estreiaDoJob = !!pintura?.estreia;
  const pintando = !!pintura;
  useEffect(() => {
    if (!jobAtual) return undefined;
    let vivo = true;
    let timer = null;
    let emVoo = false;
    const inicio = Date.now();
    const visivel = () => typeof document === 'undefined' || document.visibilityState === 'visible';
    const agendar = () => {
      clearTimeout(timer);
      if (vivo && visivel()) timer = setTimeout(consultar, INTERVALO_CONSULTA_MS);
    };
    async function consultar() {
      if (!vivo || emVoo || !visivel()) return;
      emVoo = true;
      try {
        const d = await apiFetch(`/api/figurinha/job/${jobAtual}`, { segundoPlano: true });
        if (!vivo) return;
        if (d.estado === 'pronta') { aplicarPinturaPronta(d, estreiaDoJob); return; }
        if (d.estado === 'falhou') { aplicarPinturaFalhou(d, estreiaDoJob); return; }
        setPintura((p) => (p && p.jobId === jobAtual
          ? { ...p, etapa: d.etapa, estimativaSegundos: d.estimativaSegundos, decorridoMs: d.decorridoSegundos * 1000, baseEm: Date.now() }
          : p));
      } catch (err) {
        if (!vivo) return;
        // 404: o motor não conhece essa pintura (id velho guardado, outra conta) — não há o que esperar.
        if (err?.status === 404) { aplicarPinturaFalhou({ erro: 'Não achamos essa pintura. Toque em gerar para tentar de novo.', mostrar: true }, estreiaDoJob); return; }
        // Rede caiu ou o motor respondeu 5xx: a pintura segue lá — tenta de novo no próximo ciclo.
      } finally {
        emVoo = false;
      }
      if (Date.now() - inicio > TETO_ACOMPANHAMENTO_MS) {
        aplicarPinturaFalhou({ erro: 'A pintura demorou demais. Toque em gerar para tentar de novo. Nada foi cobrado.', mostrar: true }, estreiaDoJob);
        return;
      }
      agendar();
    }
    const aoVoltar = () => { if (visivel()) consultar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    consultar();
    return () => {
      vivo = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
    // aplicarPinturaPronta/Falhou só usam setters e funções estáveis do contexto; o job e a estreia são o que muda a pintura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobAtual, estreiaDoJob]);

  // O relógio da barra: 4 vezes por segundo enquanto há pintura (o decorrido do motor + o tempo local desde a consulta).
  useEffect(() => {
    if (!pintando) return undefined;
    const t = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(t);
  }, [pintando]);
  const situacaoPintura = pintura
    ? situacaoDaPintura({
      etapa: pintura.etapa,
      decorridoMs: pintura.decorridoMs + Math.max(0, agora - pintura.baseEm),
      estimativaSegundos: pintura.estimativaSegundos,
    })
    : null;

  const { reenviarEmailConfirmacao, escolherKit, confirmarPintura, trocarModo, escolherFundo, escolherAvatarGenerico, escolherOutraFoto } = useAcoesDoStudio({ aplicarNoPerfilGlobal, avatarEhIA, fileRef, fundo, gerandoIA, gerarAvatarIA, kitAtivo, kitParaPintar, me, navigate, reenviarBusy, setAvatarGenericoEscolha, setErro, setErroIA, setErroIAmsg, setFotoRecusada, setFundo, setKitParaPintar, setMe, setReenviarBusy, setReenviarFeito, setToast, setTrocandoModo, slotsKits, temDireitoDeGerar, trocandoModo });

  // Escrever no perfil SEM o reler a seguir.
  //
  // Cada toque num fundo grava a preferência e não chama `recarregarPerfilGlobal()` atrás: seria um GET
  // /api/me inteiro para saber uma coisa que o próprio toque acabou de decidir. Numa tela feita para
  // experimentar fundos e uniformes, isso é meia ida a São Paulo por toque.
  //
  // `hidratar` põe o mesmo estado no contexto (e no cache local) sem rede. A releitura só se justifica
  // quando a escrita muda coisas que não sabemos — é o caso da geração de figurinha, que mexe em
  // créditos e estado; essas continuam a chamar `recarregarPerfilGlobal()`.
  function aplicarNoPerfilGlobal(campos) {
    if (!perfil) return;
    hidratarPerfilGlobal({ ...perfil, user: { ...perfil.user, ...campos } });
  }

  // Overlay do card: "a gerar" OU, se a geração falhou (≠403), estado de ERRO com retry. No erro o logo
  // fica ESTÁTICO — sinal de que parou.
  //
  // Usa o FuttyLoader DIRECTO, não o <LoadingFutty />. O LoadingFutty é o padrão de ECRÃ e traz
  // minHeight: calc(100dvh - 120px) (~724px); dentro deste card de ~450px transbordava e empurrava o F
  // para baixo. Aqui o centro é o do CARD, e quem o dá é o placeItems:center do próprio overlay.
  const overlayGerando = (
    // Sem backdrop-filter. Este overlay fica por cima do card
    // ENQUANTO o F de carregamento se pinta — ou seja, o compositor teria de
    // refazer o desfoque a cada quadro da animação, e o que está por baixo é a
    // figurinha parada. 0,75 + blur ≈ 0,92 chapado no mesmo tom.
    <OverlayGerando erroIA={erroIA} erroIAmsg={erroIAmsg} escolherOutraFoto={escolherOutraFoto} fotoRecusada={fotoRecusada} gerarAvatarIA={gerarAvatarIA} lojaLigada={lojaLigada} navigate={navigate} pintura={pintura} semGeracoes={semGeracoes} setErroIA={setErroIA} setSemGeracoes={setSemGeracoes} situacaoPintura={situacaoPintura} />
  );

  // Enquanto a fase de estreia não está decidida (perfil a carregar), espera.
  if (estreiaFase === null) {
    return (
      <div className="app-shell">
        <Topbar hud="FIGURINHA" direita={<BotaoLoja />} />
        <main className="app-main">
          <LoadingFutty />
        </main>
      </div>
    );
  }

  // ── ECRÃ DE ESTREIA (1ª visita): substitui o studio até partilhar/saltar ──
  if (estreiaFase === 'foto' || estreiaFase === 'gerando' || estreiaFase === 'pronto') {
    return (
      <EstreiaDaFigurinha avisoErro={avisoErro} concluirEstreia={concluirEstreia} escolherOutraFoto={escolherOutraFoto} estreiaFase={estreiaFase} fileRef={fileRef} fotoRecusada={fotoRecusada} limiteIA={limiteIA} onPickFile={onPickFile} overlayGerando={overlayGerando} partilharCromo={partilharCromo} pintura={pintura} previewUrl={previewUrl} />
    );
  }

  return (
    <div className="app-shell">
      <Topbar hud="FIGURINHA" direita={<BotaoLoja />} />
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 10, paddingBottom: 24 }}>
        {/* 1. ZONA DO CARD (2:3, levitação Star Fox + entrada animada) */}
        <ZonaDoCard avatarEhIA={avatarEhIA} erroIA={erroIA} fotoLocal={fotoLocal} fundo={fundo} fundoUrl={fundoUrl} gerandoIA={gerandoIA} jogadorUrl={jogadorUrl} overlayGerando={overlayGerando} placaUrl={placaUrl} setSheetAvatarAberto={setSheetAvatarAberto} temFoto={temFoto} uploadFoto={uploadFoto} />

        {/* Foto subida mas ainda sem avatar IA gerado (a foto não entra no card).
            gerandoIA vem PRIMEIRO: fotoLocal só é limpo no sucesso/falha de gerarAvatarIA (não no início),
            então sem esta ordem uma geração já em curso mostrava "Foto carregada, gere seu avatar" por cima
            do botão já dizendo "Gerando…" — duas mensagens discordando.
            Depois vêm o envio e o erro do upload, ANTES de "Foto trocada": essa linha só existe depois do
            200 (fotoLocal nasce lá), e com o upload falhando a pessoa vê o erro aqui, sob o card. */}
        <AvisoDaPintura avisoUploadErro={avisoUploadErro} fotoLocal={fotoLocal} gerandoIA={gerandoIA} temDireitoDeGerar={temDireitoDeGerar} uploadFoto={uploadFoto} />

        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />

        {/* 2. CONTROLOS — tabs + painel + detalhes */}
        <div style={{ maxWidth: 460, margin: '0 auto', display: 'grid', gap: 14 }}>
          {/* Zoom: linha discreta ABAIXO do card, à direita. Mesma família visual das tabs. Vale também no card
              com a FOTO (ver zoomDaFoto). */}
          <ControleDeZoom avatarEhIA={avatarEhIA} fotoLocal={fotoLocal} mudarZoom={mudarZoom} temFoto={temFoto} zoomDaFoto={zoomDaFoto} zoomNoMaximo={zoomNoMaximo} zoomNoMinimo={zoomNoMinimo} />
          {/* Trocar foto + Gerar Avatar IA (na mesma linha). Em telas estreitas demais para os dois lado a lado
              (320 px), o "Gerar" desce inteiro para a linha de baixo, em vez de estourar a tela ou partir o
              rótulo em duas linhas. */}
          <BotoesDaFoto avatarEhIA={avatarEhIA} brilharGerar={brilharGerar} gerandoIA={gerandoIA} gerarAvatarIA={gerarAvatarIA} jogador={jogador} setModalFoto={setModalFoto} temDireitoDeGerar={temDireitoDeGerar} temFoto={temFoto} totalGeracoes={totalGeracoes} uploadFoto={uploadFoto} />

          {/* LOJA DE FIGURINHAS — o cartão que torna a compra óbvia: SEMPRE presente, em qualquer estado (com ou sem
              figurinha, com ou sem gerações, dono de time ou não). Mostra a Minha Figurinha e, para o dono, o Pacote do
              time. Com a loja ligada os botões compram ("Comprar · preço"); sem ela pedem a ativação. Os dois levam aos
              Planos e nunca aparecem juntos. Quem ainda não tem figurinha nem geração vê o exemplo FIXO (o modelo
              fictício da conta demo, nunca gerado na hora: gerar um exemplo custaria US$0,11 por pessoa que abrisse a
              tela), com `loading="lazy"` + WebP no dobro do tamanho de exibição (lei do app leve). */}
          <CartaoDaLoja brilhante={brilhante} lojaConvida={lojaConvida} lojaLigada={lojaLigada} meuTimeBrilhante={meuTimeBrilhante} navigate={navigate} pacoteDoTimeAtivo={pacoteDoTimeAtivo} pedidoVivo={pedidoVivo} recadoPedido={recadoPedido} textoDoConvite={textoDoConvite} />

          {/* (l) 403 sem código conhecido — defensivo: hoje o motor só devolve EMAIL_NAO_CONFIRMADO ou
              SEM_DIREITO (cada um com seu próprio card), tratados ANTES deste no catch. Isto é o que sobra se um
              dia aparecer um terceiro — mensagem digna, nunca "limite do mês" (não há limite mensal). */}
          {limiteIA ? (
            <div className="hud-corners" style={{ position: 'relative', background: 'linear-gradient(180deg, #14121c, #0b0a12)', border: '1px solid rgba(212,160,23,0.35)', padding: '14px 16px', display: 'grid', gap: 8, justifyItems: 'center', textAlign: 'center' }}>
              <span aria-hidden="true" style={losangoDoCanto} />
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: '0.04em', color: '#fff' }}>Não deu para gerar agora</span>
              <Link to="/planos" className="btn btn--purple hud-corners" style={{ marginTop: 4, height: 38, paddingLeft: 18, paddingRight: 18, fontSize: 13, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
                Ver Figurinhas
              </Link>
            </div>
          ) : null}

          {/* (m) E-MAIL NÃO CONFIRMADO — gate anti-abuso, mesma família HUD. */}
          <AvisoEmailNaoConfirmado emailNaoConfirmado={emailNaoConfirmado} reenviarBusy={reenviarBusy} reenviarEmailConfirmacao={reenviarEmailConfirmacao} reenviarFeito={reenviarFeito} />

          {/* Tab strip — SÓ com a figurinha (SPEC-FIGURINHA-3 §3). Os fundos são composição no card, custo zero,
              mas são um prêmio de quem pagou — e a foto já tem o fundo dela. Só as abas ficam exclusivas daqui;
              o card com a FOTO tem a grade de uniformes (logo abaixo, no outro ramo), e as ações, o anúncio e os
              selos valem para os dois (se este bloco os embrulhasse, o card com a foto não teria como ser baixado
              nem compartilhado). */}
          <SeletoresDoCard activeTab={activeTab} avatarEhIA={avatarEhIA} epicoTile={epicoTile} escolherFundo={escolherFundo} fundo={fundo} gerandoIA={gerandoIA} goldenTile={goldenTile} gradeDeUniformes={gradeDeUniformes} kitDoCard={kitDoCard} refazerAtual={refazerAtual} royalTile={royalTile} setActiveTab={setActiveTab} setKitParaPintar={setKitParaPintar} temFoto={temFoto} totalGeracoes={totalGeracoes} />

          {avisoErroGenerico}

          {/* 3. AÇÕES — logo abaixo do painel de tiles. Mais altas (46px) que os botões do topo (40px) →
              hierarquia: topo = configurar, fundo = agir.
              No nativo não existe "baixar" (o <a download> é ignorado pelo WKWebView): tanto "Baixar" como
              "Compartilhar" caem em salvarOuCompartilhar e abrem a folha do sistema, que já tem "Salvar imagem".
              Na WEB são coisas diferentes: "Baixar" grava o ficheiro, "Compartilhar" abre o navigator.share. */}
          {/* "Baixar" fica ao lado de "Compartilhar", também no celular (o dono quer os dois): compartilhar abre
              a folha do sistema (WhatsApp, Instagram), baixar guarda a figurinha para a pessoa (no navegador, o
              arquivo; no app da loja, a folha do sistema, que tem "Salvar imagem" — gravar direto no rolo da
              câmera pede um plugin nativo, que não está instalado). */}
          <BotoesDoCromo baixar={baixar} busy={busy} partilhar={partilhar} />

          {/* O anúncio entra DEPOIS da linha de ações, nunca antes
              da figurinha: esta tela é a figurinha, e uma faixa por cima dela
              venderia o lugar errado. Aqui já se rolou uma dobra, a figurinha
              foi vista e a ação principal foi tomada. */}
          <div style={{ marginTop: 18 }}>
            <AdCard pagina="figurinha" variant="banner320x100" ad={adFigurinha} prontoExterno={adPronto} />
          </div>

          {/* SELOS DE HONRA — SECÇÃO PRÓPRIA full-width, ABAIXO da linha
              Baixar/Compartilhar; alcançável só por scroll (nunca empurra a 1ª dobra).
              Olhinho: mostra/oculta cada selo do cromo (máx 2; a honra fica na vitrine). */}
          <SelosDaFigurinha selos={selos} selosOcultos={selosOcultos} selosVisiveis={selosVisiveis} toggleSelo={toggleSelo} />
        </div>
      </main>

      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}

      <AvatarGenericoSheet
        aberto={sheetAvatarAberto}
        onClose={() => setSheetAvatarAberto(false)}
        escolhaActual={avatarGenericoEscolha}
        onEscolher={escolherAvatarGenerico}
      />

      {/* Modal "A tua foto" — foto actual + estado do avatar IA + carregar nova. Portal para o body: fixed
          dentro do [data-page] animado não confia no viewport no WebKit do iPhone — ver nota em
          LoadingFutty.jsx. */}
      <ModalDaFoto abrirAjustarEnquadramento={abrirAjustarEnquadramento} ajustandoEnquadramento={ajustandoEnquadramento} avatarEhIA={avatarEhIA} fileRef={fileRef} fotoLocal={fotoLocal} fotoOriginal={fotoOriginal} gerandoIA={gerandoIA} historico={historico} me={me} modalFoto={modalFoto} setModalFoto={setModalFoto} temFigurinhaAlguma={temFigurinhaAlguma} temFoto={temFoto} trocandoModo={trocandoModo} trocarModo={trocarModo} uploadFoto={uploadFoto} usandoHistoricoId={usandoHistoricoId} usarDoHistorico={usarDoHistorico} />

      {/* O mesmo CropModal do Onboarding, para "Escolher outra
          foto" (cropModo='nova') e "Ajustar enquadramento" (cropModo='ajustar');
          só o que aoConfirmarCrop faz com o resultado muda entre os dois. */}
      {cropFile ? (
        <CropModal file={cropFile} aspect={2 / 3} aspectos={[{ k: '2:3', v: 2 / 3 }]} miniatura onConfirm={aoConfirmarCrop} onCancel={aoCancelarCrop} />
      ) : null}

      {/* "Gerar figurinha com este uniforme?" antes de qualquer geração nova
          (SPEC-FIGURINHA-3 §2). Mesmo padrão do DenunciaModal (modal-overlay/
          modal-card, portal no body); fecha ao tocar fora, igual aos outros. */}
      <ConfirmarPintura confirmarPintura={confirmarPintura} gerandoIA={gerandoIA} kitParaPintar={kitParaPintar} setKitParaPintar={setKitParaPintar} totalGeracoes={totalGeracoes} />
    </div>
  );
}
