// Futty v2.0 — Rodada 29M: os últimos acertos do sorteio (achados 143, 144 e 145). Aqui a regra do nome e os textos; a cerimônia de verdade
// (a janela vazia, a lista e os botões com o mesmo nome, o arquivo do cartão) é provada no navegador em scripts/provas/sorteio.prova.mjs.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NOMES_DAS_CORES, nomeDoTimeNaTela } from '../../src/utils/nomeDoTime.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

test('143 · o nome do time na tela é o da COR da posição; "Time A" do motor, "Time 1" e o nome de cor viram Ouro, Roxo, Prata, Bronze', () => {
  assert.deepEqual(NOMES_DAS_CORES, ['Time Ouro', 'Time Roxo', 'Time Prata', 'Time Bronze']);
  for (const [dado, indice, esperado] of [
    ['Time A', 0, 'Time Ouro'], ['Time B', 1, 'Time Roxo'], ['Time C', 2, 'Time Prata'], ['Time D', 3, 'Time Bronze'],
    ['Time 1', 0, 'Time Ouro'], ['time b', 1, 'Time Roxo'], ['Time Ouro', 0, 'Time Ouro'], ['  TIME ROXO ', 1, 'Time Roxo'],
    [undefined, 0, 'Time Ouro'], [null, 1, 'Time Roxo'], ['', 2, 'Time Prata'],
  ]) assert.equal(nomeDoTimeNaTela(dado, indice), esperado, `${JSON.stringify(dado)} na posição ${indice}`);
});

test('143 · o nome que a equipe escolheu de verdade (campeonato) é mantido, nos dois lugares', () => {
  assert.equal(nomeDoTimeNaTela('Os Boleiros', 0), 'Os Boleiros');
  assert.equal(nomeDoTimeNaTela('  Missa FC ', 1), 'Missa FC');
  assert.equal(nomeDoTimeNaTela('Time Verde', 2), 'Time Verde', 'o que o admin digitou não é genérico nem de cor');
});

test('143 · passando de 4 times as cores repetem, mas dois times nunca têm o mesmo nome ("Time Ouro 2")', () => {
  const nomes = Array.from({ length: 8 }, (_, i) => nomeDoTimeNaTela(`Time ${String.fromCharCode(65 + i)}`, i));
  assert.deepEqual(nomes, ['Time Ouro', 'Time Roxo', 'Time Prata', 'Time Bronze', 'Time Ouro 2', 'Time Roxo 2', 'Time Prata 2', 'Time Bronze 2']);
  assert.equal(new Set(nomes).size, 8);
});

test('143 · a cerimônia, os botões, o cartão 9:16, o cartaz, a lista do resultado, a página pública e o placar usam a MESMA função', () => {
  const cerimonia = semComentarios(ler('src/components/CerimoniaSorteio.jsx'));
  assert.match(cerimonia, /<div class="ghead">\$\{esc\(nomeDoTimeNaTela\(t\.nome, gi\)\)\}<\/div>/, 'o título de cada time na lista');
  assert.match(cerimonia, /`Girando · \$\{nomeDoTimeNaTela\(times\[ti\]\.nome, ti\)\}`/, 'o "Girando · …" dos rolos');
  assert.match(cerimonia, /`9:16 · \$\{nomeDoTimeNaTela\(t\.nome, ti\)\}`/, 'o botão do cartão');
  assert.match(cerimonia, /const nomeDoTime = nomeDoTimeNaTela\(resultado\?\.times\?\.\[ti\]\?\.nome, ti\)/, 'a linha de status "Cartão do … salvo"');
  assert.doesNotMatch(cerimonia, /9:16 · \$\{t\.nome\}/, 'o botão não volta a usar o nome cru do motor');
  assert.match(cerimonia, /nome: NOMES_DAS_CORES\[0\][\s\S]*nome: NOMES_DAS_CORES\[3\]/, 'os nomes das marcas vêm da mesma lista (sem segunda cópia para desencontrar)');
  const cartao = semComentarios(ler('src/utils/sorteioCartao.js'));
  assert.match(cartao, /const nomeDoTime = nomeDoTimeNaTela\(time\.nome, timeIndex\)/);
  assert.match(cartao, /desenharTituloGradiente\(cx, nomeDoTime\.toUpperCase\(\)/, 'o título do cartão 9:16');
  assert.match(cartao, /futty-sorteio-\$\{nomeDoTime\.toLowerCase\(\)/, 'o nome do arquivo');
  assert.match(cartao, /nome: nomeDoTimeNaTela\(t\.nome, i\), jogs:/, 'as seções do cartaz com todos os times');
  assert.match(ler('src/components/DrawnTeams.jsx'), /<span>\{nomeDoTimeNaTela\(time\.nome, i\)\}<\/span>/);
  const publico = ler('src/pages/SorteioPublico.jsx');
  assert.match(publico, /nomeDoTimeNaTela\(resultado\.times\?\.\[0\]\?\.nome, 0\)[\s\S]*nomeDoTimeNaTela\(resultado\.times\?\.\[1\]\?\.nome, 1\)/, 'o placar da página pública');
  assert.match(ler('src/pages/Jogo.jsx'), /const nomeTimeA = nomeDoTimeNaTela\(timesSorteio\[0\]\?\.nome, 0\);\s*const nomeTimeB = nomeDoTimeNaTela\(timesSorteio\[1\]\?\.nome, 1\);/);
});

test('144 · a janela dos rolos sai de cena no fim (CSS + os três pontos da cerimônia que a escondem e a devolvem)', () => {
  assert.match(ler('src/styles/sorteio-maquina.css'), /\.smaq \.janela\.encerrada\{display:none\}/);
  const cerimonia = ler('src/components/CerimoniaSorteio.jsx');
  assert.equal([...cerimonia.matchAll(/classList\.add\('encerrada'\)/g)].length, 2, 'no finalLockIn e no preencherTudo (pular)');
  assert.equal([...cerimonia.matchAll(/classList\.remove\('encerrada'\)/g)].length, 2, 'volta no girarTime e quando a alavanca repete (corpo)');
});

test('145 · "semente" não aparece para quem joga; a frase diz a ideia, pela VOZ', () => {
  const show = ler('src/pages/SorteioShow.jsx');
  assert.match(show, /Quem abrir o link vê o mesmo sorteio, do mesmo jeito, sem precisar do app\./);
  assert.doesNotMatch(semComentarios(show), /semente|MESMA cerimônia/i, 'sem jargão e sem número técnico na tela');
  assert.doesNotMatch(semComentarios(show), /resultado\.seed/, 'a semente nem é mais lida para a tela');
});
