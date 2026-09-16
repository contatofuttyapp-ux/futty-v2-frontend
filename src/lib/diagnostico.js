// Futty v2.0 — Caixa-preta do app (VELOCIDADE 4).
//
// Existe porque "está lento" não é um dado: sem números, arranjar velocidade é
// adivinhar. Isto regista, EM MEMÓRIA e só nesta sessão, o que cada chamada e
// cada navegação custaram — e separa as duas perguntas que se confundem sempre:
//
//   motor  — quanto o servidor levou a responder (header Server-Timing, posto
//            pelo backend em TODO pedido: `app;dur=…`). Se for grande, o
//            problema é uma consulta ao banco, não a distância.
//   rede   — total menos motor. É o que a distância cobra: Lisboa→São Paulo
//            são ~250 ms de ida e volta, e nenhum código nosso muda isso.
//
// Nada disto sai do aparelho sozinho: só quando a pessoa toca em "Enviar
// relatório" na tela de Diagnóstico. Nunca guarda corpo de pedido nem token —
// só rota, estado e tempos.
import { Capacitor } from '@capacitor/core';

const MAX = 50;

const chamadas = [];
const navegacoes = [];
const falhas = [];

// Navegação em curso: o relógio parte na mudança de rota (o "toque") e é lida
// pelas chamadas que partem a seguir e pela primeira pintura.
let navegacaoAberta = null;
// Depois disto, uma chamada já não pertence à navegação que a antecedeu (é
// polling, uma ação do utilizador, uma revalidação em fundo).
const JANELA_DA_NAVEGACAO_MS = 10000;

let infoApp = null; // { version, build } — preenchido uma vez, só no nativo.

function guardar(lista, registo) {
  lista.push(registo);
  if (lista.length > MAX) lista.shift();
}

/**
 * Lê o Server-Timing e devolve os tempos em ms. O backend manda `app;dur=12.3`
 * e, quando a chamada passa pela função da Cloudflare, vem também
 * `edge;dur=250.1` (o salto do edge até São Paulo).
 *
 * Cross-origin (app nativo) isto só é legível porque o backend põe
 * Server-Timing em exposedHeaders — sem isso o header chega e o JS não o vê.
 */
export function lerServerTiming(header) {
  if (!header) return { motorMs: null, edgeMs: null };
  const ler = (nome) => {
    const m = new RegExp(`(?:^|,)\\s*${nome};dur=([\\d.]+)`, 'i').exec(header);
    return m ? Number(m[1]) : null;
  };
  return { motorMs: ler('app'), edgeMs: ler('edge') };
}

/**
 * Uma chamada à API que terminou (com sucesso ou não). `segundoPlano`: veio do
 * pré-aquecimento, não da tela.
 */
export function registarChamada({ rota, metodo = 'GET', status, ms, motorMs = null, edgeMs = null, segundoPlano = false }) {
  guardar(chamadas, {
    rota,
    metodo,
    status,
    ms: Math.round(ms),
    motorMs: motorMs == null ? null : Math.round(motorMs),
    edgeMs: edgeMs == null ? null : Math.round(edgeMs),
    // O que sobra depois de tirar o motor é a conta da distância.
    redeMs: motorMs == null ? null : Math.max(0, Math.round(ms - motorMs)),
    segundoPlano,
    em: new Date().toISOString(),
  });

  if (metodo === 'GET' && !segundoPlano) marcarDadosDaTela();
}

/**
 * Chegaram dados PARA A TELA: contam para o "dados prontos" da navegação aberta
 * (a última a chegar é a que manda). Velocidade 7B: só leituras pedidas pela
 * própria tela — o pré-aquecimento e as escritas (impressão de anúncio, voto)
 * entravam aqui, e o Ranking aparecia com "dados em 436 ms" que nem eram dele.
 */
export function marcarDadosDaTela() {
  if (navegacaoAberta && performance.now() - navegacaoAberta.t0 < JANELA_DA_NAVEGACAO_MS) {
    navegacaoAberta.msDados = Math.round(performance.now() - navegacaoAberta.t0);
    // Rodada 8A: dados que chegam DEPOIS da pintura também entram no registo já
    // guardado. Antes ficava "dados —" e o doCache nunca podia ser verdade (o
    // registo copiava o msDados no instante da pintura, quando ainda era null):
    // "pintaram do cache: 0" em todos os relatórios.
    const registo = navegacaoAberta.registo;
    if (registo) {
      registo.msDados = navegacaoAberta.msDados;
      registo.doCache = registo.msPintura < registo.msDados;
    }
  }
}

// FLUIDEZ 2 (16-set) — a PRIMEIRA ida ao Início desta abertura.
//
// A Velocidade 8 protegia o `arranque.inicioMs` com uma janela de 10 s, para um
// regresso ao Início lá mais à frente não ser contado como arranque. Só que a
// janela apanhava o caso certo pelo motivo errado: quem abre o app em `/login`
// (ou em `/`, com redireccionamento) leva mais de 10 s a chegar ao Início — o
// tempo de escrever a senha conta — e o relatório vinha com "Início —", que é
// justamente o número que se queria.
//
// O que distingue o arranque de um regresso não é o relógio, é a ORDEM: o
// arranque é a primeira vez que se NAVEGA para o Início. Se essa primeira vez
// não chegou a pintar (a pessoa saiu antes), não se marca nada — melhor sem
// número do que com um número de outra coisa.
let jaHouveInicio = false;

/** Mudança de rota — o relógio do "toque" parte aqui. */
export function marcarNavegacao(rota) {
  const primeiraIdaAoInicio = rota === '/home' && !jaHouveInicio;
  if (rota === '/home') jaHouveInicio = true;
  if (arranque.entrouPor == null) arranque.entrouPor = rota;
  navegacaoAberta = { rota, t0: performance.now(), msDados: null, msPintura: null, esperou: new Set(loadersAtivos.keys()), marcas: {}, registo: null, quadroAnterior: null, primeiraIdaAoInicio };
  // Largura: nem todo transbordo dispara resize — mede também 1 s e 3 s depois
  // de cada troca de tela, quando os dados e as imagens já assentaram.
  if (typeof window !== 'undefined') {
    window.setTimeout(medirLargura, 1000);
    window.setTimeout(medirLargura, 3000);
  }
}

// ─── Marcas finas da navegação (Rodada 8A, 15-set) ───────────────────────────
// O build 18 mandou "Ranking: pintura 1866 ms, dados 809, esperou []" — nenhum
// loader na frente e mesmo assim mais de um segundo e meio sem tela. Sem saber
// ONDE esse tempo caiu, qualquer conserto é palpite. Cada navegação guarda agora
// os instantes (ms desde a troca de rota):
//   lista     — a tela commitou o conteúdo (quem chama: useLayoutEffect)
//   listaNova — a resposta fresca substituiu o que veio do cache (idem)
//   loaderSaiu — o último F de carregamento saiu
//   dados     — (o msDados de sempre)
//   imagem    — a 1ª imagem da tela terminou de carregar
//   efeito    — o agendamento da pintura correu (efeito passivo do React)
//   quadro1   — o 1º quadro (requestAnimationFrame) depois da troca
//   quadroMaior / quadroMaiorEm — o quadro mais longo antes da pintura: se for
//               grande, a thread principal ou o desenho travaram
// e o MAIOR intervalo entre instantes seguidos até a pintura vai para `esperou`
// (ex.: "dados→pintura 1057ms"), ao lado dos loaders.

/** Instante de uma navegação (só o 1º de cada nome conta). */
export function marcarInstante(nome) {
  const nav = navegacaoAberta;
  if (!nav || typeof performance === 'undefined') return;
  const ms = Math.round(performance.now() - nav.t0);
  if (ms > JANELA_DA_NAVEGACAO_MS || nav.marcas[nome] != null) return;
  nav.marcas[nome] = ms;
}

// ─── Medidor de travadas (VELOCIDADE 8, 16-set) ──────────────────────────────
// O Pedro, build 19: "quando atualizo ou reinstalo, a primeira vez trava muito
// até fluir; depois flui bem; mesmo assim às vezes engasga ao trocar de página".
// "Trava" não é medida: isto transforma-o em número. UM laço de
// requestAnimationFrame para o app inteiro (o de antes nascia e morria a cada
// navegação) conta os quadros que demoraram mais do que deviam e — o que
// interessa mesmo — diz em que FASE do app cada travada caiu. Sem a fase,
// "travou 900 ms" não aponta para nenhum conserto.
//
// O mesmo laço alimenta as marcas finas da navegação (quadro1/quadroMaior da
// Rodada 8A): é a mesma leitura, não vale a pena fazê-la duas vezes.
const QUADRO_LEVE_MS = 50;   // > 50 ms: a rolagem já se sente aos solavancos
const QUADRO_GRAVE_MS = 100; // > 100 ms: a pessoa vê a tela parar
const FASE_ARRANQUE_MS = 10000;
const FASE_NAVEGACAO_MS = 2000;
// Depois do último toque/rolagem, o dedo ainda está na tela: a travada é de rolagem.
const FASE_ROLAGEM_MS = 150;
// Quantas travadas graves ficam guardadas com detalhe (a pior de todas fica sempre).
const MAX_TRAVADAS = 12;

const travadas = { leves: 0, graves: 0, pior: null, porFase: {}, piores: [] };
let ultimoGesto = -Infinity;
let preaquecendo = false;
let lacoLigado = false;

// RODADA 12A (16-set) — o app em segundo plano não é uma travada.
//
// O build 21 veio com "pior 96003 ms" no relatório. Não houve travada nenhuma: o
// Pedro trocou de app e o requestAnimationFrame PAROU, como o WebKit manda. O
// intervalo entre o último quadro antes de sair e o primeiro à volta é o tempo
// com o telefone noutra coisa — e entrava na conta como o pior engasgo de todos,
// afogando os números verdadeiros.
//
// Agora esse tempo é medido à parte, e nenhum intervalo que atravesse uma ida ao
// segundo plano conta como travada.
// Acima disto nenhum quadro é trabalho nosso: é o sistema a ter parado o app.
// O pior engasgo verdadeiro medido em campo foi 6,4 s (build 20, o cromo a
// compor); 15 s dá folga de sobra sem deixar passar uma suspensão.
const QUADRO_IMPOSSIVEL_MS = 15000;
const segundoPlano = { vezes: 0, msTotal: 0, maiorMs: 0, semEvento: 0 };
let escondidoEm = null;
let voltouEm = -Infinity;
let visibilidadeLigada = false;

function ouvirVisibilidade() {
  if (visibilidadeLigada || typeof document === 'undefined') return;
  visibilidadeLigada = true;
  document.addEventListener('visibilitychange', () => {
    const agora = performance.now();
    if (document.hidden) {
      escondidoEm = agora;
      return;
    }
    voltouEm = agora;
    if (escondidoEm == null) return;
    const ms = Math.round(agora - escondidoEm);
    escondidoEm = null;
    segundoPlano.vezes += 1;
    segundoPlano.msTotal += ms;
    if (ms > segundoPlano.maiorMs) segundoPlano.maiorMs = ms;
  });
}

// ─── Tarefa em curso (RODADA 12A) ────────────────────────────────────────────
// A fase diz QUANDO a travada caiu; isto diz o que estava a correr. No build 21
// ficou uma travada de 5,7 s aos 9,9 s do arranque marcada só como "arranque" —
// e "arranque" não aponta para conserto nenhum. Quem faz trabalho que pode
// segurar a thread abre uma tarefa e fecha-a no fim; o que estiver aberto no
// instante do quadro perdido fica anotado com ele.
const tarefas = new Map(); // nome -> quantas vezes aberta (aninhamento)

/**
 * Abre uma tarefa. Devolve a função que a fecha — chamar duas vezes não faz mal.
 * Ex.: `const fim = tarefaEmCurso('cromo:compor'); … fim();`
 */
export function tarefaEmCurso(nome) {
  tarefas.set(nome, (tarefas.get(nome) || 0) + 1);
  let fechada = false;
  return () => {
    if (fechada) return;
    fechada = true;
    const resto = (tarefas.get(nome) || 0) - 1;
    if (resto > 0) tarefas.set(nome, resto);
    else tarefas.delete(nome);
  };
}

function tarefasAgora() {
  const lista = [...tarefas.keys()];
  // Os loaders já sabem o que segura a tela, e 'codigo' é exactamente o chunk da
  // rota a ser buscado e COMPILADO — uma das tarefas que interessa ver aqui.
  for (const motivo of loadersAtivos.keys()) lista.push(`loader:${motivo}`);
  const nav = navegacaoAberta;
  if (nav && nav.msPintura == null) lista.push(`rota:${nav.rota}`);
  return lista.length ? lista : null;
}

/** O pré-aquecimento avisa quando começa e quando acaba (lib/preaquecerDados.js). */
export function marcarPreaquecimento(aCorrer) {
  preaquecendo = !!aCorrer;
}

// A fase mais ESPECÍFICA ganha. A ordem não é a da lista do pedido, é a que dá
// resposta útil: o dedo na tela é o caso mais concreto; o pré-aquecimento vem
// antes do arranque porque corre DENTRO dos primeiros 10 s e seria engolido por
// ele; e o arranque vem antes da navegação porque a 1ª navegação acontece no
// instante 0 e levaria a culpa do arranque inteiro.
function faseAgora(em) {
  if (em - ultimoGesto < FASE_ROLAGEM_MS) return 'rolagem';
  if (preaquecendo) return 'pré-aquecimento';
  if (em < FASE_ARRANQUE_MS) return 'arranque';
  const nav = navegacaoAberta;
  if (nav && em - nav.t0 < FASE_NAVEGACAO_MS) return `navegação ${nav.rota}`;
  return 'outro';
}

function registarTravada(gap, fim) {
  const inicio = fim - gap;
  // O intervalo atravessou uma ida ao segundo plano (ou ainda estamos lá): o
  // relógio parou por decisão do sistema, não por trabalho nosso. Já foi contado
  // em `segundoPlano` pelo ouvinte de visibilidade — aqui só não vira travada.
  //
  // O teto é a rede para quando o `visibilitychange` NÃO chega: o WKWebView
  // suspenso com o ecrã bloqueado é um caso conhecido no Capacitor, e sem isto o
  // "pior 96003 ms" do build 21 voltava por outra porta. Nenhum trabalho nosso
  // segura a thread principal por mais de QUADRO_IMPOSSIVEL_MS — o pior medido
  // em campo foi 6,4 s.
  if (voltouEm > inicio || gap > QUADRO_IMPOSSIVEL_MS || (typeof document !== 'undefined' && document.hidden)) {
    if (gap > QUADRO_IMPOSSIVEL_MS) segundoPlano.semEvento += 1;
    return;
  }
  const ms = Math.round(gap);
  const fase = faseAgora(inicio);
  travadas.leves += 1;
  travadas.porFase[fase] = (travadas.porFase[fase] || 0) + 1;
  if (ms < QUADRO_GRAVE_MS) return;
  travadas.graves += 1;
  const registo = { ms, fase, em: Math.round(inicio), tarefas: tarefasAgora() };
  if (!travadas.pior || ms > travadas.pior.ms) travadas.pior = registo;
  guardarPior(registo);
}

// Lista das piores, ordenada — não as últimas: uma travada de 1,2 s no arranque
// não pode ser empurrada para fora por doze de 110 ms na rolagem.
function guardarPior(registo) {
  travadas.piores.push(registo);
  travadas.piores.sort((a, b) => b.ms - a.ms);
  if (travadas.piores.length > MAX_TRAVADAS) travadas.piores.length = MAX_TRAVADAS;
}

function ligarMedidorDeQuadros() {
  if (lacoLigado || typeof requestAnimationFrame === 'undefined') return;
  lacoLigado = true;
  let anterior = null;
  const laco = (agora) => {
    if (anterior != null) {
      const gap = agora - anterior;
      if (gap > QUADRO_LEVE_MS) registarTravada(gap, agora);
      // Marcas finas da navegação em curso (Rodada 8A), enquanto ela não pinta.
      const nav = navegacaoAberta;
      if (nav && nav.msPintura == null && agora - nav.t0 < JANELA_DA_NAVEGACAO_MS) {
        if (nav.quadroAnterior == null) nav.marcas.quadro1 = Math.max(0, Math.round(agora - nav.t0));
        else if (Math.round(gap) > (nav.marcas.quadroMaior || 0)) {
          nav.marcas.quadroMaior = Math.round(gap);
          nav.marcas.quadroMaiorEm = Math.max(0, Math.round(anterior - nav.t0));
        }
        nav.quadroAnterior = agora;
      }
    }
    anterior = agora;
    requestAnimationFrame(laco);
  };
  requestAnimationFrame(laco);
}

// ─── Marcas do arranque (VELOCIDADE 8) ───────────────────────────────────────
// `compilacaoMs` é o performance.now() lido na PRIMEIRA linha do corpo do
// main.jsx. Por ser ESM, nessa altura todos os módulos importados já foram
// buscados, lidos e executados — ou seja, o número é HTML + download + parse +
// COMPILAÇÃO de tudo o que está no modulepreload. É o custo que o Pedro sente
// na primeira abertura depois de instalar/atualizar, quando o WebKit ainda não
// tem cache de bytecode nenhum.
// `entrouPor` (Fluidez 2): a rota em que o app abriu. Sem ela o `inicioMs` é
// ambíguo — 1200 ms a abrir direto no Início e 18000 ms a passar pelo login são
// números de coisas diferentes, e o relatório tem de dizer qual é qual.
const arranque = { compilacaoMs: null, reactMs: null, inicioMs: null, entrouPor: null };

/** Chamado na 1ª linha do main.jsx. Também liga o medidor de travadas. */
export function marcarArranque(ms) {
  if (arranque.compilacaoMs == null) arranque.compilacaoMs = Math.round(ms);
  ligarMedidorDeQuadros();
  ouvirGestos();
  ouvirVisibilidade();
}

/** A árvore do React commitou pela 1ª vez (efeito de layout do MedidorNavegacao). */
export function marcarReactMontado() {
  if (arranque.reactMs == null && typeof performance !== 'undefined') {
    arranque.reactMs = Math.round(performance.now());
  }
}

// Gestos: servem à fase "rolagem" e ao ritmo do pré-aquecimento (lib/ritmo.js).
let gestosLigados = false;
const ouvintesDeGesto = new Set();

function ouvirGestos() {
  if (gestosLigados || typeof window === 'undefined') return;
  gestosLigados = true;
  const marcar = () => {
    ultimoGesto = performance.now();
    for (const fn of ouvintesDeGesto) fn(ultimoGesto);
  };
  for (const evento of ['touchstart', 'scroll', 'keydown', 'pointerdown', 'wheel']) {
    window.addEventListener(evento, marcar, { passive: true, capture: true });
  }
}

/** Avisa a cada toque/rolagem/tecla. Devolve a função que cancela. */
export function aoGesto(fn) {
  ouvirGestos();
  ouvintesDeGesto.add(fn);
  return () => ouvintesDeGesto.delete(fn);
}

/** Instante do último toque/rolagem/tecla (performance.now()); -Infinity se nenhum. */
export function ultimoGestoEm() {
  return ultimoGesto;
}

// ─── "A 1ª tela já pintou" ───────────────────────────────────────────────────
// Quem sabe disto é o marcarPintura() logo abaixo, e é o sinal de partida de
// tudo o que tem de esperar pela tela: o pré-aquecimento (dados, imagens e
// chunks das abas), o cromo do Início e o Sentry.
let jaPintou = false;
const ouvintesDePintura = [];

/** Corre `fn` depois da 1ª pintura (já pintou: no próximo microtask). */
export function aposPrimeiraPintura(fn) {
  if (jaPintou) {
    Promise.resolve().then(fn);
    return;
  }
  ouvintesDePintura.push(fn);
}

function anunciarPrimeiraPintura() {
  if (jaPintou) return;
  jaPintou = true;
  const fila = ouvintesDePintura.splice(0);
  for (const fn of fila) {
    try { fn(); } catch { /* um ouvinte a falhar não trava os outros */ }
  }
}

// O maior intervalo entre instantes seguidos, da troca de rota até à pintura.
function maiorIntervalo(nav) {
  const pontos = [['toque', 0]];
  for (const nome of ['lista', 'listaNova', 'loaderSaiu', 'imagem']) {
    const v = nav.marcas[nome];
    if (v != null && v <= nav.msPintura) pontos.push([nome, v]);
  }
  if (nav.msDados != null && nav.msDados <= nav.msPintura) pontos.push(['dados', nav.msDados]);
  pontos.sort((a, b) => a[1] - b[1]);
  pontos.push(['pintura', nav.msPintura]);
  let maior = null;
  for (let i = 1; i < pontos.length; i += 1) {
    const ms = pontos[i][1] - pontos[i - 1][1];
    if (!maior || ms > maior.ms) maior = { de: pontos[i - 1][0], ate: pontos[i][0], ms };
  }
  return maior && maior.ms > 0 ? `${maior.de}→${maior.ate} ${maior.ms}ms` : null;
}

// Loaders de ecrã montados agora, por motivo. Sem isto, a medição de "primeira
// pintura" contava o instante em que o LOADER apareceu — que é rapidíssimo e não
// é o que a pessoa quer ver. Enquanto houver loader no ecrã, a tela real ainda
// não está lá, e o relógio continua a correr.
//
// O motivo (Velocidade 7B) diz QUEM segurou a pintura: 'codigo' (o chunk da tela
// a carregar), 'sessao' (AuthGuard à espera da sessão/perfil) ou 'tela' (a
// própria tela sem dados). Fica gravado em cada navegação.
const loadersAtivos = new Map(); // motivo -> quantos

export function loaderEntrou(motivo = 'tela') {
  loadersAtivos.set(motivo, (loadersAtivos.get(motivo) || 0) + 1);
  if (navegacaoAberta && navegacaoAberta.msPintura == null) navegacaoAberta.esperou.add(motivo);
}

export function loaderSaiu(motivo = 'tela') {
  const resto = (loadersAtivos.get(motivo) || 0) - 1;
  if (resto > 0) loadersAtivos.set(motivo, resto);
  else loadersAtivos.delete(motivo);
  if (loadersAtivos.size === 0) {
    // O ÚLTIMO a sair antes da pintura é o que conta (Rodada 8A).
    if (navegacaoAberta && navegacaoAberta.msPintura == null) {
      navegacaoAberta.marcas.loaderSaiu = Math.round(performance.now() - navegacaoAberta.t0);
    }
    agendarPintura();
  }
}

/**
 * Agenda a marcação da pintura para depois do próximo desenho. Duplo
 * requestAnimationFrame: o primeiro ainda cai no frame por desenhar, o segundo
 * já corre com o desenho feito.
 */
export function agendarPintura() {
  marcarInstante('efeito');
  if (typeof requestAnimationFrame === 'undefined') {
    marcarPintura();
    return;
  }
  requestAnimationFrame(() => requestAnimationFrame(() => marcarPintura()));
}

/** A rota nova desenhou-se de verdade (sem loader por cima). */
export function marcarPintura() {
  if (!navegacaoAberta || navegacaoAberta.msPintura != null) return;
  if (loadersAtivos.size > 0) return; // ainda há loader — quem sair por último volta cá
  const nav = navegacaoAberta;
  nav.msPintura = Math.round(performance.now() - nav.t0);
  const intervalo = maiorIntervalo(nav);
  const registo = {
    rota: nav.rota,
    msPintura: nav.msPintura,
    // Pode ficar null: telas que pintam sem pedir nada.
    msDados: nav.msDados,
    // Que loaders a pintura esperou (vazio = nenhum) e, desde a Rodada 8A, o
    // maior intervalo entre instantes seguidos até a pintura.
    esperou: [...nav.esperou, ...(intervalo ? [intervalo] : [])],
    // Rodada 8A: os instantes finos (ver marcarInstante). É o MESMO objeto das
    // marcas da navegação: uma imagem que chega depois da pintura ainda entra.
    marcas: nav.marcas,
    // Pintou ANTES de os dados chegarem = veio do cache local. É exactamente o
    // que a "Velocidade 3/4" foi buscar, e aqui vê-se se está a acontecer.
    doCache: nav.msDados != null && nav.msPintura < nav.msDados,
    em: new Date().toISOString(),
  };
  nav.registo = registo;
  guardar(navegacoes, registo);
  medirLargura();
  // VELOCIDADE 8 — a 1ª tela a pintar é o sinal de partida do resto (ver
  // aposPrimeiraPintura). E se essa tela for o Início, o instante fica no
  // arranque: é o "c ms" do resumo.
  //
  // Fluidez 2: quem manda é a ORDEM, não o relógio (ver primeiraIdaAoInicio).
  if (arranque.inicioMs == null && nav.primeiraIdaAoInicio) {
    arranque.inicioMs = Math.round(performance.now());
  }
  anunciarPrimeiraPintura();
}

/**
 * Algo que devia ter aparecido e não apareceu (VELOCIDADE 5).
 *
 * Chamadas que falham já se veem pelo estado na lista de cima; isto é para o
 * que morre em silêncio — o cromo do Início que fica no placeholder para
 * sempre, por exemplo. Sem um registo destes, a única prova de que aconteceu é
 * a pessoa dizer "ficou desfocado", e isso não diz PORQUÊ.
 *
 * `area` diz onde ('cromo'), `causa` diz o quê ('timeout-indexeddb',
 * 'blob-nulo', 'erro'), `detalhe` é a mensagem do erro quando há uma. Nunca
 * leva dados do utilizador.
 */
// ─── Velocidade 6B (15-set) ──────────────────────────────────────────────────

let preaquecimento = null;
let preaquecimentoEspera = null;

/** Regista o resultado do pré-aquecimento em segundo plano (uma vez por sessão). */
export function registarPreaquecimento({ itens, imagens, ms }) {
  preaquecimento = { itens, imagens, ms, em: new Date().toISOString() };
}

/**
 * O pré-aquecimento foi AGENDADO e está à espera de o aparelho parar (FLUIDEZ 2).
 *
 * Sem isto, um relatório enviado enquanto a pessoa mexe na tela vinha com
 * `preaquecimento: null` — que se lê como "não existe" quando a verdade é
 * "ainda não correu, e é por bom motivo". São diagnósticos opostos: o primeiro
 * manda procurar um defeito, o segundo diz que o ritmo está a funcionar.
 *
 * @param {number} esperaMs quanto tempo sem gesto é preciso para arrancar.
 */
export function marcarPreaquecimentoAgendado(esperaMs) {
  preaquecimentoEspera = esperaMs;
}

/** O que dizer sobre o pré-aquecimento no relatório. */
function lerPreaquecimento() {
  if (preaquecimento) return preaquecimento;
  if (preaquecimentoEspera == null) return null;
  const desdeOGesto = ultimoGesto === -Infinity ? null : Math.round(performance.now() - ultimoGesto);
  return {
    estado: 'adiado (toques)',
    esperaMs: preaquecimentoEspera,
    desdeOUltimoGestoMs: desdeOGesto,
    // Quando vai correr, se a pessoa não voltar a tocar. Em ms desde a abertura,
    // como as outras marcas do arranque.
    previstoEmMs: ultimoGesto === -Infinity ? null : Math.round(ultimoGesto + preaquecimentoEspera),
  };
}

// Imagens do proxy: quantas, quanto tempo, e quantas vieram do cache do browser.
// `transferSize === 0` numa entrada de performance significa exatamente isso —
// o pedido existiu, mas não gastou rede. É o número que diz se a Velocidade 6B
// está a funcionar no aparelho de verdade.
const imagens = [];
let observadorImagens = null;

// Abaixo disto uma imagem não foi a São Paulo e voltou: veio do aparelho.
const IMAGEM_DO_CACHE_MS = 40;

function registarImagem(entrada) {
  // Velocidade 7B: o Safari (e qualquer navegador numa imagem de outra origem sem
  // Timing-Allow-Origin — o caso do app nativo) devolve TODOS os tamanhos a 0, e
  // "transferSize === 0" marcava 100% do cache. Sem tamanho nenhum visível, quem
  // decide é a duração.
  const temTamanhos = entrada.transferSize > 0 || entrada.encodedBodySize > 0 || entrada.decodedBodySize > 0;
  guardar(imagens, {
    ms: Math.round(entrada.duration),
    doCache: temTamanhos ? entrada.transferSize === 0 : entrada.duration < IMAGEM_DO_CACHE_MS,
    bytes: entrada.transferSize || 0,
  });
}

// ─── Largura da tela (Velocidade 7B) ─────────────────────────────────────────
// Para apanhar em campo o (b): se algo passar da largura da tela, o WebKit do
// iPhone alarga a viewport e encolhe a página inteira. Guarda a largura do
// aparelho, a maior viewport e a maior largura rolável vistas, e em que tela.
let largura = null;

// RODADA 12A — o telefone virado não é um transbordo.
//
// O build 21 trouxe "maior vista 932px" num aparelho de 430: era o iPhone
// deitado. Em paisagem os lados TROCAM, e a largura do aparelho passa a ser o
// lado maior da tela — comparar sempre com o lado menor transformava cada
// rotação num alarme, e um alarme que toca sozinho deixa de se ler.
//
// A orientação passa a ficar no relatório: sem ela, "932px em /feed" não se
// distingue de um card que rebentou a tela, que é o defeito que isto caça.
const orientacao = { mudancas: 0, atual: null, jaEsteveDeitado: false };

function deitado() {
  return typeof window !== 'undefined' && window.innerWidth > window.innerHeight;
}

/** A largura da tela NA ORIENTAÇÃO ATUAL — é contra isto que se mede o transbordo. */
function larguraDoAparelho() {
  const tela = typeof window !== 'undefined' ? window.screen : null;
  if (!tela?.width || !tela?.height) return Math.round(window.innerWidth);
  const lados = [tela.width, tela.height];
  return Math.round(deitado() ? Math.max(...lados) : Math.min(...lados));
}

function medirLargura() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const agora = deitado() ? 'paisagem' : 'retrato';
  if (orientacao.atual == null) orientacao.atual = agora;
  else if (orientacao.atual !== agora) {
    orientacao.mudancas += 1;
    orientacao.atual = agora;
  }
  if (agora === 'paisagem') orientacao.jaEsteveDeitado = true;

  const aparelho = larguraDoAparelho();
  const viewport = Math.round(window.innerWidth);
  // Mede também POR DENTRO da guarda (overflow-x: clip em #root/[data-page]): a
  // página já não encolhe, mas o que passar da largura continua a aparecer aqui.
  const pagina = document.querySelector('[data-page] > *');
  const rolavel = Math.round(Math.max((document.scrollingElement || document.documentElement)?.scrollWidth || 0, pagina?.scrollWidth || 0));
  // Quanto passou da tela NESTA orientação. Deitado, 932 em 932 é zero.
  const passou = Math.max(viewport, rolavel) - aparelho;

  if (!largura) {
    largura = { aparelho, maiorViewport: viewport, maiorRolavel: rolavel, maiorTransbordo: Math.max(0, passou), rota: window.location.pathname, em: null, orientacao: agora };
    return;
  }
  // O `aparelho` guarda-se JUNTO com o transbordo, não a cada medição: se fosse
  // sobrescrito sempre, virar o telefone depois de um transbordo dava uma linha
  // com dois momentos diferentes — "aparelho 932px (retrato) · passou 40px".
  if (passou > largura.maiorTransbordo) {
    largura.aparelho = aparelho;
    largura.maiorTransbordo = passou;
    largura.maiorViewport = viewport;
    largura.maiorRolavel = rolavel;
    largura.rota = window.location.pathname;
    largura.orientacao = agora;
    largura.em = new Date().toISOString();
  }
}

/** Liga a vigia da largura. Chamado uma vez, no arranque do app. */
export function vigiarLargura() {
  if (typeof window === 'undefined') return;
  medirLargura();
  window.addEventListener('resize', medirLargura, { passive: true });
  window.visualViewport?.addEventListener('resize', medirLargura, { passive: true });
  // A rotação chega antes do resize em alguns aparelhos; medir nas duas garante
  // que a orientação nova já está no sítio quando a largura for lida.
  window.addEventListener('orientationchange', medirLargura, { passive: true });
}

/** Liga o observador de imagens. Chamado uma vez, no arranque do app. */
export function observarImagens() {
  if (observadorImagens || typeof PerformanceObserver === 'undefined') return;
  try {
    // As que já aconteceram antes de chegarmos aqui.
    if (typeof performance !== 'undefined' && performance.getEntriesByType) {
      for (const e of performance.getEntriesByType('resource')) {
        if (e.name.includes('/api/media/')) registarImagem(e);
      }
    }
    observadorImagens = new PerformanceObserver((lista) => {
      for (const e of lista.getEntries()) {
        if (e.name.includes('/api/media/')) registarImagem(e);
      }
    });
    observadorImagens.observe({ type: 'resource', buffered: true });
  } catch {
    /* navegador sem suporte — o resto do diagnóstico continua */
  }
}

export function registarFalha(area, causa, detalhe = null) {
  guardar(falhas, {
    area,
    causa,
    detalhe: detalhe == null ? null : String(detalhe).slice(0, 200),
    em: new Date().toISOString(),
  });
}

// ─── Fases do cromo (FLUIDEZ 2, 16-set) ──────────────────────────────────────
// O build 20 mandou `/figurinha dados=8836 ms` e uma travada de 6402 ms na fase
// "outro" — a composição do cromo do Início. "O canvas é lento" não aponta para
// conserto nenhum: é preciso saber QUAL fase. Cada composição regista aqui o
// tempo de cada passo (decodificar o avatar, encher o fundo, os glints, a
// moldura, o texto, o toBlob) e a tela de Diagnóstico mostra a soma e a mais
// cara. Guarda-se a PIOR composição de cada cenário, não a última: a que dói é
// a primeira, com os caches todos frios.
const cromoFases = new Map(); // cenário -> { somaMs, piorFase, piorMs, fases[] }

export function registarFasesCromo(cenario, fases) {
  if (!fases?.length) return;
  // As fases marcadas `detalhe` são um recorte de dentro de outra fase (a maior
  // fatia de um laço): entram no relatório para se ver, mas não na soma — senão
  // contavam o mesmo tempo duas vezes.
  const cronologicas = fases.filter((f) => !f.detalhe);
  const somaMs = Math.round(cronologicas.reduce((a, f) => a + f.ms, 0));
  const anterior = cromoFases.get(cenario);
  if (anterior && anterior.somaMs >= somaMs) return;
  const pior = cronologicas.reduce((a, f) => (f.ms > a.ms ? f : a), cronologicas[0]);
  cromoFases.set(cenario, {
    somaMs,
    piorFase: pior.fase,
    piorMs: Math.round(pior.ms),
    fases: fases.map((f) => ({ fase: f.fase, ms: Math.round(f.ms), ...(f.detalhe ? { detalhe: true } : {}) })),
  });
}

/** As fases medidas, por cenário. Lida pela tela de Diagnóstico e pela bancada. */
export function lerFasesCromo() {
  return Object.fromEntries([...cromoFases].map(([k, v]) => [k, { ...v, fases: [...v.fases] }]));
}

/** Guarda a versão/build do app (só existe no nativo). Chamado uma vez. */
export function definirInfoApp(info) {
  infoApp = info || null;
}

function aparelho() {
  const c = typeof navigator !== 'undefined' ? navigator.connection : null;
  return {
    plataforma: Capacitor.getPlatform(),
    nativo: Capacitor.isNativePlatform(),
    appVersao: infoApp?.version || null,
    appBuild: infoApp?.build || null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    idioma: typeof navigator !== 'undefined' ? navigator.language : null,
    // Só o Chrome/Android costuma ter isto; no iOS vem vazio e tudo bem.
    ligacao: c ? { tipo: c.effectiveType || null, descidaMbps: c.downlink ?? null, rttMs: c.rtt ?? null, poupanca: !!c.saveData } : null,
    ecra: typeof window !== 'undefined' ? { largura: window.innerWidth, altura: window.innerHeight, dpr: window.devicePixelRatio } : null,
  };
}

function estatistica(valores) {
  const v = valores.filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (!v.length) return null;
  const soma = v.reduce((a, b) => a + b, 0);
  return { n: v.length, media: Math.round(soma / v.length), pior: Math.max(...v) };
}

/** Tudo o que a tela de Diagnóstico mostra e o relatório envia. */
export function lerDiagnostico() {
  return {
    versaoRelatorio: 1,
    em: new Date().toISOString(),
    aparelho: aparelho(),
    resumo: {
      total: estatistica(chamadas.map((c) => c.ms)),
      motor: estatistica(chamadas.map((c) => c.motorMs)),
      rede: estatistica(chamadas.map((c) => c.redeMs)),
      pintura: estatistica(navegacoes.map((n) => n.msPintura)),
      // Quantas telas pintaram sem esperar pela rede.
      pinturasDoCache: navegacoes.filter((n) => n.doCache).length,
      navegacoes: navegacoes.length,
      falhas: falhas.length,
      // Velocidade 6B: "imagens: n, média ms, % do cache".
      imagens: imagens.length
        ? {
          n: imagens.length,
          mediaMs: Math.round(imagens.reduce((a, i) => a + i.ms, 0) / imagens.length),
          pctDoCache: Math.round((imagens.filter((i) => i.doCache).length / imagens.length) * 100),
          bytes: imagens.reduce((a, i) => a + i.bytes, 0),
        }
        : null,
      // Velocidade 7B + Rodada 12A: { aparelho, maiorViewport, maiorRolavel,
      // maiorTransbordo, rota, orientacao, em }. O que conta é o maiorTransbordo
      // (quanto passou da tela NA ORIENTAÇÃO da altura): acima de zero, alguma
      // coisa rebentou a largura em campo.
      largura,
      // Rodada 12A: quantas vezes o aparelho virou. Sem isto, uma largura de
      // paisagem no relatório não se distingue de um card que rebentou a tela.
      orientacao: { ...orientacao },
      // Velocidade 8 + Rodada 12A: quantos quadros passaram do tempo, em que
      // fase do app e com que TAREFA a correr (ver tarefaEmCurso).
      travadas: {
        leves: travadas.leves,
        graves: travadas.graves,
        pior: travadas.pior,
        porFase: { ...travadas.porFase },
        piores: [...travadas.piores],
      },
      // Rodada 12A: tempo com o app noutra coisa. NÃO entra nas travadas — o
      // requestAnimationFrame para em segundo plano e o intervalo de volta
      // aparecia como o pior engasgo de todos (96 s no build 21).
      segundoPlano: { ...segundoPlano },
      // Velocidade 8: compilação = HTML + download + execução de tudo o que está
      // no modulepreload; React = 1º commit da árvore; Início = 1ª pintura do /home.
      arranque: { ...arranque },
      // Fluidez 2: quanto cada fase do canvas custou, por cenário.
      cromo: lerFasesCromo(),
    },
    preaquecimento: lerPreaquecimento(),
    chamadas: [...chamadas],
    navegacoes: [...navegacoes],
    falhas: [...falhas],
  };
}

/** Zera a caixa-preta (botão "Limpar" na tela de Diagnóstico). */
export function limparDiagnostico() {
  chamadas.length = 0;
  navegacoes.length = 0;
  falhas.length = 0;
  imagens.length = 0;
  preaquecimento = null;
  preaquecimentoEspera = null;
  navegacaoAberta = null;
  largura = null;
  cromoFases.clear();
  // As travadas zeram; as marcas do ARRANQUE não — aconteceram uma vez nesta
  // abertura e não voltam a acontecer, zerá-las era perder o número de vez.
  travadas.leves = 0;
  travadas.graves = 0;
  travadas.pior = null;
  travadas.porFase = {};
  travadas.piores.length = 0;
  segundoPlano.vezes = 0;
  segundoPlano.msTotal = 0;
  segundoPlano.maiorMs = 0;
  segundoPlano.semEvento = 0;
  orientacao.mudancas = 0;
  medirLargura();
}
