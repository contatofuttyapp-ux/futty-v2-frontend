// Futty v2.0 — Rodada 30B: o selo do sorteio (src/utils/seloDoSorteio.js) e onde ele aparece.
//
// Os três casos (decisão do dono, 8-out):
//   1. sorteado (ninguém mexeu)      → "Sorteado" (ouro)
//   2. sorteado e depois ajustado    → "Sorteado e ajustado por <nome>" (roxo); a roleta mostra o ORIGINAL e a lista
//                                      de trocas diz quem foi para onde
//   3. montado à mão desde o início  → "Montado à mão por <nome>" (prata), sem roleta
// Jogo antigo: com seed e sem registro de ajuste → "Sorteado"; sem seed → "Montado à mão" sem nome.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { visaoDoSorteio, trocasDoAjuste, nomesJuntos, chaveDoJogador, montadoAMao, CORES_DO_SELO } from '../../src/utils/seloDoSorteio.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

const j = (id, nome) => ({ user_id: id, nome });
const convidado = (nome) => ({ user_id: null, convidado: true, nome });
const ORIGINAL = {
  times: [{ nome: 'Time A', jogadores: [j('a', 'Magrão'), j('g', 'Gonçalo')] }, { nome: 'Time B', jogadores: [j('c', 'Canhotinha'), j('z', 'Zé')] }],
  reservas: [j('r', 'Rafa')],
};
const reg = (extra = {}) => ({ origem: 'sorteio', por: { nome: 'Chavo' }, ajustes: [], ...extra });

test('caso 1 · sorteado e ninguém mexeu: "Sorteado", a roleta gira o próprio resultado', () => {
  const tr = { seed: 5, ...ORIGINAL, registro: reg() };
  const v = visaoDoSorteio(tr);
  assert.equal(v.tipo, 'sorteado');
  assert.deepEqual(v.selo, { tipo: 'sorteado', texto: 'Sorteado', detalhe: null });
  assert.equal(v.daRoleta, tr);
  assert.equal(v.ajuste, null);
});

test('caso 2 · ajustado: a roleta gira o ORIGINAL, o selo diz quem ajustou e cada troca vira uma linha', () => {
  const final = {
    times: [{ nome: 'Time A', jogadores: [j('a', 'Magrão'), j('r', 'Rafa')] }, { nome: 'Time B', jogadores: [j('c', 'Canhotinha'), j('z', 'Zé'), j('g', 'Gonçalo')] }],
    reservas: [],
  };
  const tr = { seed: 5, ...final, registro: reg({ original: ORIGINAL, ajustes: [{ por: { nome: 'Chavo' } }] }) };
  const v = visaoDoSorteio(tr);
  assert.equal(v.tipo, 'ajustado');
  assert.equal(v.selo.texto, 'Sorteado e ajustado por Chavo');
  assert.deepEqual(v.daRoleta.times, ORIGINAL.times, 'a máquina mostra o que a roleta deu');
  assert.equal(v.daRoleta.seed, 5);
  assert.deepEqual(v.final.times, final.times);
  assert.equal(v.ajuste.titulo, 'Ajuste de Chavo');
  assert.deepEqual(v.ajuste.trocas.map((t) => `${t.nome} ${t.resto}`), [
    'Rafa saiu da reserva para o Ouro',
    'Gonçalo saiu do Ouro para o Roxo',
  ]);
  assert.ok(v.ajuste.movidos.has('u:g') && v.ajuste.movidos.has('u:r') && !v.ajuste.movidos.has('u:a'));
});

test('caso 2 · vários ajustes acumulam: o título junta quem ajustou, sem repetir', () => {
  const tr = {
    seed: 5,
    times: [{ nome: 'Time A', jogadores: [j('a', 'Magrão')] }, { nome: 'Time B', jogadores: [j('c', 'Canhotinha'), j('z', 'Zé'), j('g', 'Gonçalo')] }],
    reservas: [j('r', 'Rafa')],
    registro: reg({ original: ORIGINAL, ajustes: [{ por: { nome: 'Chavo' } }, { por: { nome: 'Zé' } }, { por: { nome: 'Chavo' } }] }),
  };
  const v = visaoDoSorteio(tr);
  assert.equal(v.selo.texto, 'Sorteado e ajustado por Chavo e Zé');
  assert.equal(v.ajuste.titulo, 'Ajuste de Chavo e Zé');
});

test('caso 2 · mexeu e voltou ao que a roleta deu: continua "Sorteado" (nenhuma troca para contar)', () => {
  const tr = { seed: 5, ...ORIGINAL, registro: reg({ original: ORIGINAL, ajustes: [{ por: { nome: 'Chavo' } }, { por: { nome: 'Chavo' } }] }) };
  assert.equal(visaoDoSorteio(tr).tipo, 'sorteado');
});

test('caso 3 · montado à mão: selo prata com o nome, sem roleta', () => {
  const tr = { manual: true, ...ORIGINAL, registro: { origem: 'manual', por: { nome: 'Chavo' }, ajustes: [] } };
  const v = visaoDoSorteio(tr);
  assert.equal(v.tipo, 'manual');
  assert.deepEqual(v.selo, { tipo: 'manual', texto: 'Montado à mão por Chavo', detalhe: null });
  assert.equal(v.daRoleta, null);
  assert.equal(montadoAMao(tr), true);
});

test('caso 3 · montado à mão e mexido por outra pessoa: os dois nomes', () => {
  const tr = { ...ORIGINAL, registro: { origem: 'manual', por: { nome: 'Chavo' }, ajustes: [{ por: { nome: 'Zé' } }] } };
  assert.equal(visaoDoSorteio(tr).selo.texto, 'Montado à mão por Chavo e Zé');
});

test('jogo antigo: com seed e sem registro → "Sorteado"; sem seed → "Montado à mão" sem nome', () => {
  assert.equal(visaoDoSorteio({ seed: 3, ...ORIGINAL }).selo.texto, 'Sorteado');
  assert.equal(visaoDoSorteio({ manual: true, ...ORIGINAL }).selo.texto, 'Montado à mão');
  assert.equal(montadoAMao({ seed: 3, ...ORIGINAL }), false);
  assert.equal(visaoDoSorteio(null), null);
  assert.equal(visaoDoSorteio({ times: [] }), null);
});

test('trocas: quem entrou depois, quem saiu de vez, e a reserva — sempre com o nome de cor do time', () => {
  const final = {
    times: [{ nome: 'Time A', jogadores: [j('a', 'Magrão'), j('n', 'Novato')] }, { nome: 'Time B', jogadores: [j('c', 'Canhotinha')] }],
    reservas: [j('g', 'Gonçalo'), j('t', 'Atrasado')],
  };
  assert.deepEqual(trocasDoAjuste(ORIGINAL, final).map((t) => `${t.nome} ${t.resto}`), [
    'Novato entrou no Ouro',
    'Gonçalo saiu do Ouro para a reserva',
    'Atrasado entrou na reserva',
    'Zé saiu do Roxo',
    'Rafa saiu da reserva',
  ]);
});

test('convidado sem app é reconhecido pelo nome (não colide com outro convidado)', () => {
  assert.equal(chaveDoJogador(convidado(' Beto ')), 'c:beto');
  assert.equal(chaveDoJogador(j('x', 'Beto')), 'u:x');
  const antes = { times: [{ nome: 'Time A', jogadores: [convidado('Beto')] }, { nome: 'Time B', jogadores: [convidado('Caio')] }], reservas: [] };
  const depois = { times: [{ nome: 'Time A', jogadores: [convidado('Caio')] }, { nome: 'Time B', jogadores: [convidado('Beto')] }], reservas: [] };
  assert.deepEqual(trocasDoAjuste(antes, depois).map((t) => `${t.nome} ${t.resto}`), ['Caio saiu do Roxo para o Ouro', 'Beto saiu do Ouro para o Roxo']);
});

test('nomesJuntos: "A", "A e B", "A, B e C"', () => {
  assert.equal(nomesJuntos(['Chavo']), 'Chavo');
  assert.equal(nomesJuntos(['Chavo', 'Zé']), 'Chavo e Zé');
  assert.equal(nomesJuntos(['Chavo', 'Zé', 'Beto']), 'Chavo, Zé e Beto');
  assert.equal(nomesJuntos([]), '');
});

test('as cores dos três selos: ouro, roxo e prata (as mesmas do carrossel do sorteio)', () => {
  assert.equal(CORES_DO_SELO.sorteado.ate, '#f0c94a');
  assert.equal(CORES_DO_SELO.ajustado.de, '#6d3fe0');
  assert.equal(CORES_DO_SELO.manual.ate, '#d7dce6');
});

test('o selo aparece na tela do jogo e no link público (os dois desenham os times pelo DrawnTeams)', () => {
  const drawn = ler('src/components/DrawnTeams.jsx');
  assert.match(drawn, /const visao = visaoDoSorteio\(resultado\);/);
  assert.match(drawn, /<SeloDoSorteio selo=\{visao\.selo\} \/>/);
  assert.match(drawn, /\{visao\.ajuste \? <ListaDeTrocas trocas=\{visao\.ajuste\.trocas\} \/> : null\}/);
  assert.match(ler('src/pages/Jogo.jsx'), /<DrawnTeams resultado=\{game\.times_resultado\}/);
  assert.match(ler('src/pages/SorteioPublico.jsx'), /<DrawnTeams resultado=\{resultado\}/);
});

test('o selo nunca corta o nome de quem ajustou ou montou: quebra a linha (a regra do nome inteiro)', () => {
  const selo = ler('src/components/SeloDoSorteio.jsx');
  assert.match(selo, /overflowWrap: 'anywhere'/);
  assert.doesNotMatch(selo, /ellipsis|nowrap/);
});

// ── caso 2 na cerimônia: a máquina gira o original, o fim conta o ajuste ─────────────────────────────────────────────────────────
test('caso 2 · a página do sorteio e o link público mandam a máquina girar o ORIGINAL e passam o ajuste e os times finais', () => {
  for (const arquivo of ['src/pages/SorteioShow.jsx', 'src/pages/SorteioPublico.jsx']) {
    const tela = ler(arquivo);
    assert.match(tela, /const visao = visaoDoSorteio\(resultado\);/, arquivo);
    assert.match(tela, /resultado=\{visao\?\.daRoleta \|\| resultado\}/, arquivo);
    assert.match(tela, /ajuste=\{visao\?\.ajuste\}/, arquivo);
    assert.match(tela, /final=\{visao\?\.ajuste \? visao\.final : null\}/, arquivo);
  }
});

test('caso 2 · a cerimônia: o fim (FimDoSorteio) só entra quando ela termina, e compartilha-se o que vai jogar (os times finais)', () => {
  const cer = ler('src/components/CerimoniaSorteio.jsx');
  assert.match(cer, /\{compartilharOn \? <FimDoSorteio selo=\{selo\} ajuste=\{ajuste\} final=\{final\} \/> : null\}/);
  assert.match(cer, /const paraCompartilhar = final \? \{ \.\.\.resultado, times: final\.times, reservas: final\.reservas \} : resultado;/);
  assert.match(cer, /gerarCartazEscalacao\(paraCompartilhar,/);
  assert.match(cer, /gerarCartao916\(paraCompartilhar, ti, equipa/);
  const fim = ler('src/components/FimDoSorteio.jsx');
  assert.match(fim, /data-passo-do-ajuste/);
  assert.match(fim, /<TimesEmCartoes \{\.\.\.cartoes\} destacar=\{ajuste\.movidos\} \/>/);
});

test('caso 2 · a entrada em sequência é só CSS e o estado natural é visível (lei dos builds 10-12)', () => {
  const css = ler('src/styles/app.css');
  assert.match(css, /\.entra-em-sequencia \{ animation: entraEmSequencia 0\.45s cubic-bezier\(0\.2, 0\.9, 0\.3, 1\) both; animation-delay: var\(--d, 0s\); \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\r?\n {2}\.entra-em-sequencia \{ animation: none; \}/);
});

// ── caso 3: montado à mão — apresentação, sem roleta, "Ver times" ────────────────────────────────────────────────────────────────
test('caso 3 · a página do sorteio mostra a apresentação (não a máquina) quando os times foram montados à mão', () => {
  const show = ler('src/pages/SorteioShow.jsx');
  assert.match(show, /const aMao = visao\?\.tipo === 'manual';/);
  assert.match(show, /\{aMao \? \(\s*<ApresentacaoTimes/);
  assert.match(show, /\{aMao \? 'Copiar link dos times' : 'Copiar link do sorteio'\}/);
  assert.match(show, /Quem abrir o link vê os mesmos times, sem precisar do app\./);
});

test('caso 3 · o link público: "Ver times" abre a apresentação e o cabeçalho não diz "sorteio"', () => {
  const pub = ler('src/pages/SorteioPublico.jsx');
  assert.match(pub, /\{verCerimonia && aMao \? \(\s*<ApresentacaoTimes/);
  assert.match(pub, /\{aMao \? 'Ver times' : 'Ver sorteio'\}/);
  assert.match(pub, /\{aMao \? 'os times' : 'sorteio dos times'\}/);
});

test('caso 3 · a tela do jogo: "Ver times" no lugar do "Ver sorteio" e "Times montados" no cabeçalho', () => {
  const jogo = ler('src/pages/Jogo.jsx');
  assert.match(jogo, /const timesAMao = !!game\?\.times_resultado && montadoAMao\(game\.times_resultado\);/);
  assert.match(jogo, /\{game\.sorteio_realizado && timesAMao && \(/);
  assert.match(jogo, /<Users size=\{16\} \/> Ver times/);
  assert.match(jogo, /\{timesAMao \? 'Times montados' : 'Times sorteados'\}/);
});

test('caso 3 · o card do Início (motor manda montado_a_mao): "Montado" e "Ver times"', () => {
  const inicio = ler('src/pages/Inicio.jsx');
  assert.match(inicio, /\{game\.montado_a_mao \? 'Montado' : 'Sorteado'\}/);
  assert.match(inicio, /game\.montado_a_mao \? <><Users size=\{16\} \/> Ver times<\/> : <><Trophy size=\{16\} \/> Ver sorteio<\/>/);
});

test('caso 3 · a apresentação não tem roleta e termina no selo prata; a entrada é a mesma sequência CSS', () => {
  const ap = ler('src/components/ApresentacaoTimes.jsx');
  assert.doesNotMatch(ap, /CerimoniaSorteio|mulberry32|seed/, 'sem máquina, sem semente');
  assert.match(ap, /<TimesEmCartoes key=\{`times-\$\{vez\}`\} \{\.\.\.cartoes\} \/>/);
  assert.match(ap, /<SeloDoSorteio selo=\{selo\} largo \/>/);
  assert.match(ap, /ESCALAÇÃO/);
});

// ── o selo vai no cartão que se compartilha ──────────────────────────────────────────────────────────────────────────────────────
test('cartão · o 9:16 e o cartaz desenham o selo (medido com a fonte carregada) e o 9:16 dos times à mão diz "times", não "sorteio"', () => {
  const cartao = ler('src/utils/sorteioCartao.js');
  assert.match(cartao, /function prepararSelo\(cx, selo, W,/);
  assert.match(cartao, /export async function gerarCartao916\(resultado, timeIndex, nomeEquipa, opts = \{\}\)/);
  assert.match(cartao, /const aMao = opts\.selo\?\.tipo === 'manual';/);
  assert.match(cartao, /\[nomeEquipa, aMao \? 'times' : 'sorteio'\]/);
  assert.match(cartao, /const selo = prepararSelo\(cx, opts\.selo, W, \{ corpo: 28 \}\);/, 'o cartaz');
  assert.match(cartao, /try \{ await document\.fonts\.ready; \} catch \{ \/\* SSR\/priv \*\/ \}\s*const selo = prepararSelo/, 'o cartaz mede o selo com a Rajdhani já carregada');
  assert.match(cartao, /selo\.desenhar\(baseline \+ DESCE_META_ESCALACAO \+ 28\);/);
  // O nome nunca é cortado: encolhe e, se preciso, quebra em duas linhas (nada de reticências).
  assert.doesNotMatch(cartao.slice(cartao.indexOf('function prepararSelo'), cartao.indexOf('// Marca FUTTY na base')), /…|\.\.\.'|ellipsis/);
});

test('cartão · quem compartilha passa o selo (a cerimônia e a apresentação)', () => {
  const cer = ler('src/components/CerimoniaSorteio.jsx');
  assert.match(cer, /gerarCartazEscalacao\(paraCompartilhar, \{ equipa, data, selo \}\)/);
  assert.match(cer, /gerarCartao916\(paraCompartilhar, ti, equipa, \{ selo \}\)/);
  const ap = ler('src/components/ApresentacaoTimes.jsx');
  assert.match(ap, /gerarCartazEscalacao\(resultado, \{ equipa, data, selo \}\)/);
  assert.match(ap, /gerarCartao916\(resultado, ti, equipa, \{ selo \}\)/);
});
