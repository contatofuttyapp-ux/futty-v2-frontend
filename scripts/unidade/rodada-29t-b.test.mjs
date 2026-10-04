// Futty v2.0 — Rodada 29T, bloco B: o Radar apresenta o time (bairro + "Sobre o time"), os bairros viram lista (IBGE, Censo 2022) e os ajustes que a Freaky
// pediu depois de ler o bloco A (fila única de avisos, "Seus times" com pendência primeiro, placar com forma). As contas e os textos aqui; o que só um
// navegador confirma (o pop-up, o campo que só aceita da lista, a fila na tela) fica em scripts/provas/rodada-29t-b.prova.mjs (npm run provar:navegador).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { ORDEM_DOS_AVISOS, proximoAviso } from '../../src/utils/avisosDoInicio.js';
import { quantosTimesMostrar, timesComPendenciaPrimeiro } from '../../src/utils/seuTime.js';
import { SEM_SOBRE_NO_POPUP, localDoTime, rotuloDoModo } from '../../src/utils/radar.js';
import { EXEMPLO_SOBRE_O_TIME, FALTA_SOBRE_NA_CRIACAO, FALTA_SOBRE_NOS_AJUSTES, MAX_SOBRE_O_TIME, faltaSobre, precisaDeSobre } from '../../src/utils/sobreOTime.js';
import { alvoDeBairros, bairrosDoMunicipio, buscarBairros, indexarBairrosDoEstado, linhaDaLista } from '../../src/utils/bairros.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

// ── 0 · a fila única dos avisos ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const TUDO = () => ({
  jogos: [{ id: 'j1' }, { id: 'j2' }],
  pedidos: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }],
  votacoes: [{ slug: 'v1' }],
  figurinhaPronta: true,
  desfechos: [{ id: 'd1' }, { id: 'd2' }],
  figurinhaNascendo: { estado: 'gerando' },
  uniforme: { id: 'u1' },
  recadoFigurinha: { texto: 'Pedido enviado.' },
  nascimento: true,
  denuncia: true,
  card: { variante: 'sem-foto' },
  notificacoes: true,
});
const CHAVE_DO_TIPO = {
  jogo: 'jogos', pedido: 'pedidos', votacao: 'votacoes', 'figurinha-pronta': 'figurinhaPronta', desfecho: 'desfechos', 'figurinha-nascendo': 'figurinhaNascendo',
  uniforme: 'uniforme', 'recado-figurinha': 'recadoFigurinha', nascimento: 'nascimento', denuncia: 'denuncia', card: 'card', notificacoes: 'notificacoes',
};

test('ajuste 0 · a ordem da fila: jogo sem resposta → pedido pendente → votação → figurinha pronta → os demais → ativar notificações por último', () => {
  const candidatos = TUDO();
  const saiu = [];
  for (let i = 0; i < 30; i += 1) {
    const aviso = proximoAviso(candidatos);
    if (!aviso) break;
    saiu.push(aviso.tipo);
    delete candidatos[CHAVE_DO_TIPO[aviso.tipo]]; // resolveu / fechou o aviso: entra o próximo da fila
  }
  assert.deepEqual(saiu, ['jogo', 'pedido', 'votacao', 'figurinha-pronta', 'desfecho', 'figurinha-nascendo', 'uniforme', 'recado-figurinha', 'nascimento', 'denuncia', 'card', 'notificacoes']);
  assert.deepEqual(saiu, ORDEM_DOS_AVISOS, 'a ordem exportada é a mesma que a fila segue');
  // as quatro primeiras posições são as que a Freaky decidiu; as notificações são a última
  assert.deepEqual(saiu.slice(0, 4), ['jogo', 'pedido', 'votacao', 'figurinha-pronta']);
  assert.equal(saiu.at(-1), 'notificacoes');
  assert.equal(proximoAviso(candidatos), null, 'fila vazia: nenhum aviso');
});

test('ajuste 0 · cada tipo de aviso passa à frente de todos os que vêm depois dele (e só dele)', () => {
  for (let i = 0; i < ORDEM_DOS_AVISOS.length; i += 1) {
    const candidatos = {};
    for (const tipo of ORDEM_DOS_AVISOS.slice(i)) candidatos[CHAVE_DO_TIPO[tipo]] = TUDO()[CHAVE_DO_TIPO[tipo]];
    assert.equal(proximoAviso(candidatos).tipo, ORDEM_DOS_AVISOS[i], `com ${ORDEM_DOS_AVISOS.slice(i).join(' + ')}, o da frente é ${ORDEM_DOS_AVISOS[i]}`);
  }
});

test('ajuste 0 · UM aviso por vez: o resultado é um só; jogo, pedido e desfecho contam os que esperam ("+N"), os outros não', () => {
  const t = TUDO();
  const jogo = proximoAviso(t);
  assert.deepEqual([jogo.tipo, jogo.item.id, jogo.mais], ['jogo', 'j1', 1]);
  assert.deepEqual([proximoAviso({ pedidos: t.pedidos }).mais, proximoAviso({ desfechos: t.desfechos }).mais], [2, 1]);
  const votacao = proximoAviso({ votacoes: [{ slug: 'a' }, { slug: 'b' }] });
  assert.deepEqual([votacao.tipo, votacao.item.slug, votacao.mais], ['votacao', 'a', 0], 'fechar a votação a esconde para a sessão: não há um "próximo" para anunciar');
  // aviso sem item (um booleano): o item é null, como o das notificações sempre foi
  assert.deepEqual(proximoAviso({ notificacoes: true }), { tipo: 'notificacoes', item: null, mais: 0 });
  assert.deepEqual(proximoAviso({ figurinhaPronta: true }), { tipo: 'figurinha-pronta', item: null, mais: 0 });
  assert.equal(proximoAviso({ nascimento: false, denuncia: false, card: null, uniforme: null, jogos: [], pedidos: [] }), null);
});

test('ajuste 0 · o Início desenha TODOS os avisos pela fila: nenhum bloco empilhado com a condição própria, e cada um leva data-aviso', () => {
  const inicio = semComentarios(ler('src/pages/Inicio.jsx'));
  for (const [tipo, chave] of Object.entries(CHAVE_DO_TIPO)) {
    assert.match(inicio, new RegExp(`aviso\\?\\.tipo === '${tipo}'`), `${tipo}: sai da fila`);
    assert.match(inicio, new RegExp(`${chave}:`), `${tipo}: entra na fila (${chave})`);
  }
  // os blocos de antes, cada um com o seu "vale agora" na frente, não existem mais
  for (const velho of ['{precisaDob ? (', '{votacaoTop ? (', '{timeSemUniforme ? (', '{!podeGerarBrilhante && recadoBrilhante ? (', '{desfechosResolvidos.map(', '{figurinhaGerando ? (', '{!figurinhaGerando && !figurinhaFalhou && podeGerarBrilhante ? (', '{denunciaDesfechos > 0 && !desfechoFechado ? (']) {
    assert.ok(!inicio.includes(velho), `${velho} saiu`);
  }
  // a conta de cada "vale agora" continua a de antes, só que dentro da fila
  assert.match(inicio, /votacoes: votacaoTop \? \[votacaoTop\] : \[\],/);
  assert.match(inicio, /figurinhaPronta: !figurinhaGerando && !figurinhaFalhou && podeGerarBrilhante,/);
  assert.match(inicio, /desfechos: desfechosResolvidos,/);
  assert.match(inicio, /figurinhaNascendo: figurinhaGerando \? \{ estado: 'gerando' \} : figurinhaFalhou \? \{ estado: 'falhou' \} : null,/);
  assert.match(inicio, /recadoFigurinha: !podeGerarBrilhante \? recadoBrilhante : null,/);
  assert.match(inicio, /card: figurinhaGerando \|\| figurinhaFalhou \? null : cardSemFoto \? \{ variante: 'sem-foto' \} : ctaFigurinha \? \{ variante: 'pos-onboarding' \} : null,/);
  for (const tipo of ['nascimento', 'denuncia', 'desfecho', 'votacao', 'figurinha-nascendo', 'figurinha-pronta', 'uniforme', 'recado-figurinha', 'card']) {
    assert.match(inicio, new RegExp(`data-aviso="${tipo}"`), `${tipo}: data-aviso (a prova conta um só na tela)`);
  }
  // o aviso é montado depois de todos os estados de que depende (votação, denúncia, figurinha), nunca antes
  assert.ok(inicio.indexOf('const aviso = proximoAviso(') > inicio.indexOf('function fecharDesfecho()'));
  assert.ok(inicio.indexOf('const aviso = proximoAviso(') > inicio.indexOf('const timeSemUniforme ='));
});

test('ajuste 0 · o desfecho do pedido de entrada: um por vez, com "+N" e o mesmo "Você entrou no time!"', () => {
  const inicio = semComentarios(ler('src/pages/Inicio.jsx'));
  assert.match(inicio, /\(aviso\?\.tipo === 'desfecho' \? \[aviso\.item\] : \[\]\)\.map\(\(p\) => \(/);
  assert.match(inicio, /Você entrou no time \$\{p\.team\?\.nome\}!/);
  assert.match(inicio, /aria-label=\{`Mais \$\{aviso\.mais\} /);
});

// ── 0 · "Seus times": os com pendência primeiro, nenhum escondido ────────────────────────────────────────────────────────────────────────
const time = (slug, pendencias = {}) => ({ team_id: slug, slug, nome: slug.toUpperCase(), pendencias });
const COM = { pedidos: 2 };

test('ajuste 0 · "Seus times": os times com pendência vêm primeiro, depois a ordem de hoje (a do motor), sem tirar ninguém', () => {
  const doMotor = [time('a'), time('b'), time('c', COM), time('d', { denuncias: 1 }), time('e')];
  assert.deepEqual(timesComPendenciaPrimeiro(doMotor).map((t) => t.slug), ['c', 'd', 'a', 'b', 'e']);
  assert.deepEqual(doMotor.map((t) => t.slug), ['a', 'b', 'c', 'd', 'e'], 'a lista de entrada não é alterada');
  assert.deepEqual(timesComPendenciaPrimeiro([time('x'), time('y')]).map((t) => t.slug), ['x', 'y'], 'sem pendência nenhuma, a ordem de hoje');
  assert.deepEqual(timesComPendenciaPrimeiro([]), []);
  assert.deepEqual(timesComPendenciaPrimeiro(undefined), []);
});

test('ajuste 0 · "Seus times": um time com pendência nunca fica atrás do "Ver todos" (a lista fechada é de 2, ou de todos os que têm pendência)', () => {
  const ate = (lista) => timesComPendenciaPrimeiro(lista);
  // 4 times, 1 com pendência (o último): sobe, aparece entre os 2 de cima; "Ver todos (4)" esconde só os sem pendência
  const um = ate([time('a'), time('b'), time('c'), time('d', COM)]);
  assert.equal(quantosTimesMostrar(um), 2);
  assert.ok(um.slice(0, 2).some((t) => t.slug === 'd'));
  // 4 times, 3 com pendência: a lista fechada mostra os 3 (e o "Ver todos" só esconde o que não pede nada)
  const tres = ate([time('a'), time('b', COM), time('c', COM), time('d', COM)]);
  assert.equal(quantosTimesMostrar(tres), 3);
  assert.deepEqual(tres.slice(0, 3).map((t) => t.slug), ['b', 'c', 'd']);
  // 4 times, todos com pendência: todos aparecem e não sobra nada para o "Ver todos"
  const todos = ate([time('a', COM), time('b', COM), time('c', COM), time('d', COM)]);
  assert.equal(quantosTimesMostrar(todos), 4);
  assert.equal(todos.length - quantosTimesMostrar(todos), 0);
  // sem pendência nenhuma: os 2 de sempre (a regra do bloco A não muda)
  assert.equal(quantosTimesMostrar(ate([time('a'), time('b'), time('c'), time('d')])), 2);
  // o piso é configurável e dois times nunca viram menos de dois
  assert.equal(quantosTimesMostrar([], 2), 2);
});

test('ajuste 0 · o card usa as duas contas, e o "Ver todos" só existe se sobrar time', () => {
  const card = ler('src/components/CardSeuTime.jsx');
  assert.match(card, /const seuTime = timesComPendenciaPrimeiro\(doMotor\);/);
  assert.match(card, /const visiveis = quantosTimesMostrar\(seuTime, TIMES_VISIVEIS\);/);
  assert.match(card, /const sobram = seuTime\.length - visiveis;/);
  assert.match(card, /\{sobram > 0 \? \(/);
});

// ── 0 · o placar do Jogo passado tem forma ───────────────────────────────────────────────────────────────────────────────────────────────
test('ajuste 0 · as duas caixas do placar têm borda e um "0" apagado de exemplo', () => {
  const editor = ler('src/components/ResultadoEditor.jsx');
  const caixa = editor.match(/const inputPlacar = (\{[^}]*\});/)[1];
  assert.match(caixa, /border: '1\.5px solid rgba\(255,255,255,0\.32\)'/, 'a borda se vê (era #222 sobre #0c0c0c)');
  assert.doesNotMatch(caixa, /border: '1px solid #222'/);
  assert.equal((editor.match(/placeholder="0" className="placar-input"/g) || []).length, 2, 'as duas caixas');
  assert.match(ler('src/styles/app.css'), /\.placar-input::placeholder \{\s*color: rgba\(255, 255, 255, 0\.28\);\s*opacity: 1;\s*\}/, 'o 0 é apagado, não preto');
});

// ── 1 · o Radar apresenta o time ─────────────────────────────────────────────────────────────────────────────────────────────────────────
test('157 · "Bairro · Cidade" (só a cidade se não houver bairro), e a localização escrita à mão quando o time não tem cidade', () => {
  assert.equal(localDoTime({ bairro: 'Guará', cidade: 'Brasília, DF' }), 'Guará · Brasília, DF');
  assert.equal(localDoTime({ bairro: null, cidade: 'Brasília, DF' }), 'Brasília, DF');
  assert.equal(localDoTime({ bairro: '  ', cidade: 'Lisboa, Portugal' }), 'Lisboa, Portugal');
  assert.equal(localDoTime({ bairro: 'Alvalade', cidade: 'Lisboa, Portugal', localizacao: 'Campo do Zé' }), 'Alvalade · Lisboa, Portugal', 'a cidade manda; a localização é o que sobra');
  assert.equal(localDoTime({ cidade: null, localizacao: 'Campo do Zé' }), 'Campo do Zé');
  assert.equal(localDoTime({}), '');
  assert.equal(localDoTime(), '');
});

test('157 · aberto / com aprovação, e o texto de quem ainda não contou nada', () => {
  assert.equal(rotuloDoModo('publico_aberto'), 'aberto');
  assert.equal(rotuloDoModo('publico_aprovacao'), 'com aprovação');
  assert.equal(SEM_SOBRE_NO_POPUP, 'Este time ainda não contou como ele é.');
});

test('157 · o card do Radar mostra bairro · cidade e o "Sobre o time" em até 2 linhas, cortado com "…"; tocar fora do botão abre o pop-up', () => {
  const tela = semComentarios(ler('src/pages/Explorar.jsx'));
  assert.match(tela, /import \{ SEM_SOBRE_NO_POPUP, depoisDePedirEntrada, localDoTime, rotuloDoModo, tituloDoRadar \} from '\.\.\/utils\/radar';/);
  const card = tela.slice(tela.indexOf('function CardDoTime('), tela.indexOf('function PopupDoTime('));
  assert.match(card, /const local = localDoTime\(equipa\);/);
  assert.match(card, /data-local-do-time/);
  assert.match(card, /\{equipa\.descricao \? \(\s*<span data-sobre-do-time style=\{\{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'/, 'até 2 linhas; o resto fica cortado com reticências');
  assert.match(card, /onClick=\{\(\) => aoTocar\(equipa\)\}/, 'tocar no card abre');
  assert.match(card, /<div onClick=\{\(e\) => e\.stopPropagation\(\)\} style=\{\{ flexShrink: 0 \}\}>\s*<AcaoDoTime /, 'tocar no botão NÃO abre o pop-up');
  assert.match(card, /<button type="button" data-abrir-time aria-label=/, 'e há um botão de verdade para quem navega pelo teclado');
  // quem já é membro vai ao time, como sempre; os outros abrem o pop-up
  assert.match(tela, /aoTocar=\{\(e\) => \(e\.ja_membro \? navigate\(`\/time\/\$\{e\.slug\}`\) : setAberto\(e\.slug\)\)\}/);
});

test('157 · o pop-up: escudo, nome, bairro e cidade, membros, aberto ou com aprovação, o "Sobre o time" inteiro e o MESMO botão Entrar / Pedir entrada', () => {
  const tela = semComentarios(ler('src/pages/Explorar.jsx'));
  const popup = tela.slice(tela.indexOf('function PopupDoTime('), tela.indexOf('export default function Explorar'));
  assert.match(popup, /createPortal\(/);
  assert.match(popup, /role="dialog" aria-modal="true" aria-labelledby="popup-do-time-nome"/);
  assert.match(popup, /<EscudoEquipa team=\{equipa\} size=\{72\} \/>/);
  assert.match(popup, /\{equipa\.nome\}<\/h2>/);
  assert.match(popup, /\{local \? <div data-local-do-time/);
  assert.match(popup, /\{MEMBROS\(equipa\)\}/, 'membros · aberto ou com aprovação');
  assert.match(popup, />Sobre o time<\/div>/);
  assert.match(popup, /\{equipa\.descricao \|\| SEM_SOBRE_NO_POPUP\}/, 'o texto inteiro (sem corte), ou o aviso de quem não escreveu');
  assert.doesNotMatch(popup, /WebkitLineClamp/, 'no pop-up o texto não é cortado');
  assert.match(popup, /whiteSpace: 'pre-wrap'/);
  assert.match(popup, /<AcaoDoTime equipa=\{equipa\} busy=\{busy\} aoPedir=\{aoPedir\} aoCancelar=\{aoCancelar\} larga \/>/);
  assert.match(popup, /aria-label="Fechar"/);
  assert.match(popup, /e\.key === 'Escape'/);
  // o botão do card e o do pop-up são o mesmo componente, e o time do pop-up é sempre o da lista de agora (entrou → o pop-up comemora)
  assert.match(tela, /<AcaoDoTime equipa=\{equipa\} busy=\{busy\} aoPedir=\{aoPedir\} aoCancelar=\{aoCancelar\} \/>/);
  assert.match(tela, /const equipaAberta = aberto \? equipas\.find\(\(e\) => e\.slug === aberto\) \|\| null : null;/);
  assert.match(tela, /\{equipaAberta \? <PopupDoTime equipa=\{equipaAberta\}/);
  assert.match(tela, /\{aberta \? 'Entrar' : 'Pedir entrada'\}/);
});

// ── 2 · o "Sobre o time" ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test('157 · o "Sobre o time": até 300 letras, o exemplo do dono, e só o time aberto ao público é obrigado a escrevê-lo', () => {
  assert.equal(MAX_SOBRE_O_TIME, 300);
  assert.equal(EXEMPLO_SOBRE_O_TIME, 'Ex.: Turma de 40+, joga domingo de manhã perto do Cruzeiro.');
  assert.equal(precisaDeSobre('publico_aberto'), true);
  assert.equal(precisaDeSobre('publico_aprovacao'), true);
  assert.equal(precisaDeSobre('privado'), false, '"Fechado" não pede');
  assert.equal(faltaSobre({ modo: 'publico_aberto', sobre: '' }), true);
  assert.equal(faltaSobre({ modo: 'publico_aprovacao', sobre: '   ' }), true, 'só espaços conta como vazio');
  assert.equal(faltaSobre({ modo: 'publico_aberto', sobre: 'Turma de 40+' }), false);
  assert.equal(faltaSobre({ modo: 'privado', sobre: '' }), false);
  assert.equal(faltaSobre({ modo: 'publico_aberto' }), true);
  assert.equal(FALTA_SOBRE_NA_CRIACAO, 'Conte como é o time para criar.');
  assert.equal(FALTA_SOBRE_NOS_AJUSTES, 'Time aberto precisa do "Sobre o time". Conte como ele é.');
  // a voz da casa: nada de travessão no meio da frase
  for (const frase of [FALTA_SOBRE_NA_CRIACAO, FALTA_SOBRE_NOS_AJUSTES, SEM_SOBRE_NO_POPUP]) assert.doesNotMatch(frase, /[—–]/);
});

test('157 · Criar time, passo 3: "Aberto" e "Só com a sua aprovação" mostram o "Sobre o time" (obrigatório); "Fechado" não pede', () => {
  const criar = ler('src/pages/CriarEquipa.jsx');
  const passo3 = criar.slice(criar.indexOf('{passo === 3 && ('), criar.indexOf('{passo === 4 && team && ('));
  assert.match(passo3, /\{precisaDeSobre\(modo\) \? \(\s*<div data-sobre-o-time/, 'só nas duas políticas públicas');
  assert.match(passo3, /Sobre o time<\/label>/);
  assert.match(passo3, /placeholder=\{EXEMPLO_SOBRE_O_TIME\}/);
  assert.match(passo3, /maxLength=\{MAX_SOBRE_O_TIME\}/);
  assert.match(passo3, /<Cta cheio onClick=\{criarESeguir\} disabled=\{busy \|\| faltaCidade \|\| faltaSobre\(\{ modo, sobre \}\)\}>/, '"Criar o time" só acende com o texto');
  assert.match(passo3, /<Falta>\{FALTA_SOBRE_NA_CRIACAO\}<\/Falta>/, 'e a linha embaixo do botão diz o que falta');
  assert.match(criar, /if \(sobre\.trim\(\)\) bodyCriar\.descricao = sobre\.trim\(\)\.slice\(0, MAX_SOBRE_O_TIME\);/, 'vai no POST como `descricao`, que o motor já guarda');
  assert.match(criar, /if \(faltaSobre\(\{ modo, sobre \}\)\) \{\s*setToast\(\{ tipo: 'error', mensagem: FALTA_SOBRE_NA_CRIACAO \}\);\s*return;\s*\}/, 'defesa: nem por engano cria sem o texto');
});

test('157 · Ajustes: "Descrição" vira "Sobre o time" (com o exemplo); abrir o time sem o texto pede o texto antes de salvar', () => {
  const ajustes = ler('src/pages/AdminPanel.jsx');
  assert.doesNotMatch(ajustes, /<span style=\{lbl\}>Descrição<\/span>/, 'o rótulo antigo saiu');
  assert.match(ajustes, /<span style=\{lbl\}>Sobre o time<\/span>/);
  assert.match(ajustes, /placeholder=\{EXEMPLO_SOBRE_O_TIME\}/);
  assert.match(ajustes, /onChange=\{\(e\) => setDescricao\(e\.target\.value\.slice\(0, MAX_SOBRE_O_TIME\)\)\} rows=\{3\} maxLength=\{MAX_SOBRE_O_TIME\}/, 'até 300 letras, como hoje');
  // mudar para aprovação ou aberto sem o texto: a pergunta abre, o motor não é chamado
  const modo = ajustes.slice(ajustes.indexOf('async function guardarModo('), ajustes.indexOf('// Meu papel (Rodada 29B, E)'));
  assert.match(modo, /if \(faltaSobre\(\{ modo: novoModo, sobre \}\)\) \{\s*setSobreRascunho\(''\);\s*setPedindoSobre\(novoModo\);\s*return;\s*\}/);
  assert.ok(modo.indexOf('setPedindoSobre(novoModo)') < modo.indexOf('apiFetch('), 'a pergunta vem antes de qualquer chamada ao motor');
  assert.match(modo, /if \(precisaDeSobre\(novoModo\)\) corpo\.descricao = sobre\.trim\(\)\.slice\(0, MAX_SOBRE_O_TIME\);/, 'o texto vai junto, no mesmo pedido: time público nunca fica sem apresentação');
  assert.match(ajustes, /confirmarDesabilitado=\{!sobreRascunho\.trim\(\)\}/, 'a pergunta só deixa salvar com o texto');
  assert.match(ajustes, /data-sobre-o-time-pergunta/);
  // e o "Salvar" geral também não deixa um time público sem o texto
  assert.match(ajustes, /if \(faltaSobre\(\{ modo, sobre: descricao \}\)\) \{\s*showToast\(FALTA_SOBRE_NOS_AJUSTES, 'error'\);\s*return;\s*\}/);
});

// ── 3 · os bairros do Brasil (IBGE, Censo 2022) ──────────────────────────────────────────────────────────────────────────────────────────
const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
const arquivoDe = (uf) => JSON.parse(ler(`public/dados/bairros/${uf}.json`));
const norm = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const cidades = JSON.parse(ler('public/dados/cidades.json'));

test('157 · a lista: um arquivo por estado (27), no formato [[codigoIbge, municipio, [[bairro, lat, lng], …]], …], com 17.596 bairros em 896 municípios', () => {
  const disco = fs.readdirSync(path.join(RAIZ, 'public/dados/bairros')).sort();
  assert.deepEqual(disco, UFS.map((u) => `${u}.json`), 'exatamente os 27 estados, nada a mais');
  let bairros = 0;
  let municipios = 0;
  for (const uf of UFS) {
    const arquivo = arquivoDe(uf);
    assert.ok(Array.isArray(arquivo), `${uf}: um vetor`);
    municipios += arquivo.length;
    const nomes = arquivo.map((m) => m[1]);
    assert.deepEqual(nomes, [...nomes].sort((a, b) => a.localeCompare(b, 'pt')), `${uf}: municípios em ordem alfabética`);
    for (const [codigo, municipio, lista] of arquivo) {
      assert.match(codigo, /^\d{7}$/, `${municipio}: código IBGE de 7 dígitos`);
      assert.ok(lista.length > 0, `${municipio}: município sem bairro nem entra`);
      const vistos = new Set();
      for (const [bairro, lat, lng] of lista) {
        bairros += 1;
        assert.ok(bairro && bairro.length <= 80, `${municipio}: nome do bairro até 80 letras (o limite do motor)`);
        assert.ok(!vistos.has(norm(bairro)), `${municipio}/${bairro}: nome repetido no município`);
        vistos.add(norm(bairro));
        assert.ok(Number.isFinite(lat) && Number.isFinite(lng), `${municipio}/${bairro}: coordenada`);
        assert.ok(lat > -34 && lat < 6 && lng > -74 && lng < -28, `${municipio}/${bairro}: ${lat},${lng} fora do Brasil`);
        assert.equal(Math.round(lat * 100) / 100, lat, `${municipio}/${bairro}: 2 casas, como a cidade`);
        assert.equal(Math.round(lng * 100) / 100, lng, `${municipio}/${bairro}: 2 casas, como a cidade`);
      }
    }
  }
  assert.equal(municipios, 896, '895 do IBGE + o Distrito Federal');
  assert.equal(bairros, 17596, '17.576 do IBGE − 13 nomes repetidos no mesmo município + 33 Regiões Administrativas do DF');
  assert.deepEqual(arquivoDe('TO'), [], 'Tocantins não tem bairros na lista: arquivo vazio (e o campo some)');
});

test('157 · todo município da lista de bairros existe na lista de cidades (nome + UF): é assim que o campo liga um à outra', () => {
  const cidadesBr = new Set(cidades.filter((c) => c[2] === 'BR').map((c) => `${norm(c[0])}|${c[1]}`));
  for (const uf of UFS) {
    for (const [, municipio] of arquivoDe(uf)) assert.ok(cidadesBr.has(`${norm(municipio)}|${uf}`), `${municipio}/${uf} não está em cidades.json`);
  }
});

test('157 · Brasília (DF): o IBGE traz as 33 Regiões Administrativas (Guará, Núcleo Bandeirante, Candangolândia…) — não o "Asa Norte", que é parte do Plano Piloto', () => {
  const df = arquivoDe('DF');
  assert.equal(df.length, 1);
  const [codigo, municipio, lista] = df[0];
  assert.deepEqual([codigo, municipio, lista.length], ['5300108', 'Brasília', 33]);
  const nomes = lista.map((b) => b[0]);
  for (const ra of ['Guará', 'Núcleo Bandeirante', 'Candangolândia', 'Plano Piloto', 'Ceilândia', 'Taguatinga', 'Lago Sul', 'Águas Claras', 'Cruzeiro']) assert.ok(nomes.includes(ra), ra);
  assert.ok(!nomes.includes('Asa Norte'), 'o Censo não tem "Asa Norte": é parte do Plano Piloto');
  // as coordenadas caem no Distrito Federal
  for (const [nome, lat, lng] of lista) assert.ok(lat > -16.1 && lat < -15.45 && lng > -48.3 && lng < -47.3, `${nome}: ${lat},${lng} fora do DF`);
});

test('157 · o que o IBGE não tem fica sem campo: São Paulo, Goiânia, São Luís, Palmas e Rio Branco (e a maioria dos municípios pequenos)', () => {
  const temBairros = (uf, municipio) => arquivoDe(uf).some((m) => norm(m[1]) === norm(municipio));
  assert.equal(temBairros('SP', 'São Paulo'), false);
  assert.equal(temBairros('GO', 'Goiânia'), false);
  assert.equal(temBairros('MA', 'São Luís'), false);
  assert.equal(temBairros('TO', 'Palmas'), false);
  assert.equal(temBairros('AC', 'Rio Branco'), false);
  for (const [cidade, uf] of [['Belo Horizonte', 'MG'], ['Rio de Janeiro', 'RJ'], ['Salvador', 'BA'], ['Fortaleza', 'CE'], ['Curitiba', 'PR'], ['Porto Alegre', 'RS']]) assert.equal(temBairros(uf, cidade), true, cidade);
});

test('157 · o tamanho: cada estado cabe em 60 KB comprimido, a pasta toda fica fora do pacote nativo e o site a serve com cache', () => {
  let bruto = 0;
  let gzip = 0;
  let maior = 0;
  for (const uf of UFS) {
    const texto = ler(`public/dados/bairros/${uf}.json`);
    const g = zlib.gzipSync(texto, { level: 9 }).length;
    assert.ok(g <= 60 * 1024, `${uf}: ${g} B comprimidos`);
    bruto += Buffer.byteLength(texto);
    gzip += g;
    maior = Math.max(maior, g);
  }
  assert.ok(bruto < 600 * 1024, `${(bruto / 1024).toFixed(1)} KB sem comprimir no total`);
  assert.ok(gzip < 200 * 1024, `${(gzip / 1024).toFixed(1)} KB comprimidos no total`);
  assert.ok(maior < 30 * 1024, 'o maior estado (SP/RS) fica abaixo de 30 KB comprimidos');
  // fora do pacote nativo: a pasta dados/ inteira é removida do nativo (scripts/preparar-nativo.js) e buscada de VITE_ASSETS_URL
  assert.match(ler('scripts/preparar-nativo.js'), /const REMOVER = \[[^\]]*'dados'/);
  assert.match(ler('public/_headers'), /\/dados\/\*/);
  // e nunca entra no bundle: só a página lazy a busca, por fetch
  assert.match(ler('src/lib/bairrosDados.js'), /fetch\(urlDoEstado\(uf\)\)/);
  assert.match(ler('src/lib/bairrosDados.js'), /VITE_ASSETS_URL/);
  assert.doesNotMatch(semComentarios(ler('src/lib/bairrosDados.js')), /import .*\.json/);
});

test('157 · o script: baixa o zip do IBGE, tira nome + município (código) + ponto central em 2 casas, e recusa o que passa do teto', () => {
  const script = ler('scripts/gerar-bairros.mjs');
  assert.match(script, /https:\/\/ftp\.ibge\.gov\.br\/Censos\/Censo_Demografico_2022\/Agregados_por_Setores_Censitarios\/malha_com_atributos/);
  assert.match(script, /bairros\/shp\/BR\/BR_bairros_CD2022\.zip/);
  assert.match(script, /public.*'dados', 'bairros'|path\.join\(RAIZ, 'public', 'dados', 'bairros'\)/);
  assert.match(script, /Math\.round\(n \* 100\) \/ 100/, '2 casas, como a cidade');
  assert.match(script, /TETO_GZIP_POR_UF = 60 \* 1024/);
  assert.match(script, /CD_MUN/);
  assert.match(script, /DF_subdistritos_CD2022\.zip/, 'a exceção do DF vem do próprio IBGE (subdistritos do Censo 2022)');
  assert.match(script, /process\.exit\(1\)/, 'dado fora do esperado não grava arquivo');
});

test('157 · a fonte está citada em docs/licencas.md (IBGE, Censo 2022)', () => {
  const doc = ler('docs/licencas.md');
  assert.match(doc, /IBGE/);
  assert.match(doc, /Censo Demográfico 2022/);
  assert.match(doc, /BR_bairros_CD2022/);
  assert.match(doc, /public\/dados\/bairros/);
});

// ── 3 · o campo Bairro: de lista, e só aparece com lista ─────────────────────────────────────────────────────────────────────────────────
test('157 · de onde vêm os bairros: a cidade escolhida na lista, ou o texto guardado no time ("Brasília, DF", "Lisboa, Portugal"); o resto não tem campo', () => {
  assert.deepEqual(alvoDeBairros('Belo Horizonte, MG', { cidade: 'Belo Horizonte', uf: 'MG', pais: 'BR', lat: -19.92, lng: -43.94, origem: 'lista' }), { pais: 'BR', nome: 'Belo Horizonte', uf: 'MG' });
  assert.deepEqual(alvoDeBairros('Brasília, DF', null), { pais: 'BR', nome: 'Brasília', uf: 'DF' });
  assert.deepEqual(alvoDeBairros('Lisboa, Portugal', { cidade: 'Lisboa', uf: 'Lisboa', pais: 'PT', origem: 'lista' }), { pais: 'PT', nome: 'Lisboa', distrito: 'Lisboa' });
  assert.deepEqual(alvoDeBairros('Vila Nova de Gaia, Portugal', null), { pais: 'PT', nome: 'Vila Nova de Gaia', distrito: null });
  assert.equal(alvoDeBairros('Madrid', null), null, 'cidade digitada à mão, fora do Brasil e de Portugal: sem lista, sem campo');
  assert.equal(alvoDeBairros('Brasília', null), null, 'só o nome, sem estado: ainda não escolheu da lista');
  assert.equal(alvoDeBairros('Cidade Inventada, XX', null), null, 'UF que não existe');
  assert.equal(alvoDeBairros('', null), null);
  assert.equal(alvoDeBairros(undefined, undefined), null);
});

test('157 · a busca de bairro: começa com → palavra começa → contém, sem acento nem maiúscula; município sem lista devolve vazio', () => {
  const mg = indexarBairrosDoEstado(arquivoDe('MG'));
  const bh = bairrosDoMunicipio(mg, 'Belo Horizonte');
  assert.equal(bh.length, 476);
  assert.deepEqual(buscarBairros(bh, 'SAVAS').map((l) => l[0]), ['Savassi']);
  assert.deepEqual(buscarBairros(bh, 'aarao').map((l) => l[0]), ['Aarão Reis', 'Novo Aarão Reis'], 'sem acento; começa com vem antes de contém');
  assert.ok(buscarBairros(bh, 'santa').length > 1);
  assert.equal(buscarBairros(bh, '').length, 30, 'sem digitar nada, os primeiros 30 (a lista rola no campo)');
  assert.deepEqual(buscarBairros(bh, 'xyzzy'), []);
  assert.deepEqual(bairrosDoMunicipio(mg, 'Cidade Que Não Existe'), []);
  assert.deepEqual(bairrosDoMunicipio(null, 'Belo Horizonte'), []);
  const df = bairrosDoMunicipio(indexarBairrosDoEstado(arquivoDe('DF')), 'Brasília');
  assert.deepEqual(buscarBairros(df, 'guar').map((l) => l[0]), ['Guará']);
  const guara = buscarBairros(df, 'guar')[0];
  assert.deepEqual(guara.slice(1), df.find((x) => x.linha[0] === 'Guará').linha.slice(1), 'a linha traz a coordenada para o motor');
});

test('157 · só vale o bairro que a lista escreve por inteiro (sem acento nem maiúscula): é o que decide se o texto digitado "pega"', () => {
  const df = bairrosDoMunicipio(indexarBairrosDoEstado(arquivoDe('DF')), 'Brasília');
  assert.equal(linhaDaLista(df, 'guará')[0], 'Guará');
  assert.equal(linhaDaLista(df, '  GUARA ')[0], 'Guará');
  assert.equal(linhaDaLista(df, 'Guará II'), null, 'quase não vale');
  assert.equal(linhaDaLista(df, 'Pinheiros'), null);
  assert.equal(linhaDaLista(df, ''), null);
  assert.equal(linhaDaLista(null, 'Guará'), null);
});

test('157 · o CampoBairro só aceita da lista (Brasil e Portugal): texto sem escolha volta ao que valia; vazio vale; escolher manda a coordenada', () => {
  const campo = semComentarios(ler('src/components/CampoBairro.jsx'));
  assert.match(campo, /function encerrar\(\) \{/);
  assert.match(campo, /const exata = linhaDaLista\(lista, texto\);/);
  assert.match(campo, /mudar\(valendo\.current\.texto, valendo\.current\.escolha\);/, 'texto que a lista não tem volta ao que valia');
  assert.match(campo, /if \(!texto\) \{[\s\S]*?valendo\.current = \{ texto: '', escolha: null \};/, 'apagar o campo (sem bairro) vale');
  assert.match(campo, /aoMudar\(linha\[0\], valendo\.current\.escolha\);/, 'escolher manda o nome e a escolha com a coordenada');
  assert.match(campo, /escolhaDoBairro\(linha\)/);
  assert.match(campo, /document\.addEventListener\('pointerdown', fora, true\)/, 'o toque fora confere o texto antes de qualquer botão da tela agir');
  assert.match(campo, /role="combobox"/);
  assert.match(campo, /placeholder = 'Onde vocês jogam'/);
  assert.doesNotMatch(campo, /desabilitado|concelho|Escolha a cidade primeiro/, 'nada de campo apagado nem de texto livre');
  // as duas telas só mandam o bairro da lista
  const criar = ler('src/pages/CriarEquipa.jsx');
  assert.match(criar, /if \(cidade\.trim\(\) && bairros\.estado === 'lista' && bairroEscolha && bairroEscolha\.bairro === bairro\.trim\(\)\) Object\.assign\(bodyCriar, bairroEscolha\);/);
  assert.doesNotMatch(criar, /\{ bairro: bairro\.trim\(\) \}/, 'texto digitado não vai ao motor');
  const ajustes = ler('src/pages/AdminPanel.jsx');
  assert.match(ajustes, /const bairroDaLista = textoDoBairro && bairroEscolha && bairroEscolha\.bairro === textoDoBairro \? bairroEscolha : null;/);
  assert.match(ajustes, /if \(mandaBairro\) Object\.assign\(corpo, bairroDaLista \|\| \{ bairro: '' \}\);/);
  assert.doesNotMatch(ajustes, /\{ bairro: bairro\.trim\(\) \}/);
});

test('157 · cidade sem bairros na lista → o campo Bairro não aparece (Criar time e Ajustes); trocar a cidade limpa o bairro', () => {
  const criar = ler('src/pages/CriarEquipa.jsx');
  assert.match(criar, /const bairros = useBairrosDaCidade\(cidade, cidadeEscolha\);/);
  assert.match(criar, /\{bairros\.estado === 'lista' \? \(\s*<>\s*<Lbl grande>Bairro \(opcional\)<\/Lbl>\s*<CampoBairro\s*key=\{bairros\.chave\}/);
  assert.match(criar, /if \(texto !== cidade\) \{ setBairro\(''\); setBairroEscolha\(null\); \}/, 'o bairro é da cidade: outra cidade, campo limpo');
  const ajustes = ler('src/pages/AdminPanel.jsx');
  assert.match(ajustes, /const bairros = useBairrosDaCidade\(cidade, cidadeEscolha\);/);
  assert.match(ajustes, /\{bairros\.estado === 'lista' \? \(\s*<div style=\{\{ display: 'grid', gap: 6 \}\}>\s*<span style=\{lbl\}>Bairro/);
  assert.match(ajustes, /if \(texto !== cidade\) \{ setBairro\(''\); setBairroEscolha\(null\); \}/);
  // o bairro antigo escrito à mão fica salvo: só é enviado (ou apagado) quando a pessoa mexe
  assert.match(ajustes, /const mandaBairro = textoDoBairro === '' \? bairroGuardado\.trim\(\) !== '' : !!bairroDaLista && textoDoBairro !== bairroGuardado\.trim\(\);/);
  const hook = ler('src/hooks/useBairrosDaCidade.js');
  for (const estado of ['sem-cidade', 'carregando', 'sem-lista', 'lista']) assert.match(hook, new RegExp(`'${estado}'`));
  assert.match(hook, /itens\.length \? 'lista' : 'sem-lista'/, 'cidade sem bairros na lista = sem-lista');
});
