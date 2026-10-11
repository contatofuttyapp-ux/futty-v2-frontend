// Futty v2.0 — Rodada 30K: o campeonato "Todos contra todos + final" nas telas.
//
// A regra do formato (tabela, desempate, final automática, correção) é do motor (backend/tests/campeonato-todos-contra-todos-final.test.js).
// Aqui o que a tela decide sozinha: o nome e a linha que explica cada formato, quando o formato aparece (3 times ou mais), as duas fases
// e o pódio com o 3º lugar dividido.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { explicacaoDoFormato, fasesDoCampeonato, formatosParaOTime, jogosDoFormato, MIN_TIMES_DO_FORMATO, nomeDoFormato, temFaseFinal } from '../../src/utils/formatoCampeonato.js';
import { podioDe } from '../../src/utils/campeonatoPodio.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');

test('o nome na tela é "Todos contra todos + final"; onde não cabe, "Grupo + final"', () => {
  assert.equal(nomeDoFormato('pontos_final'), 'Todos contra todos + final');
  assert.equal(nomeDoFormato('pontos_final', { curto: true }), 'Grupo + final');
  assert.equal(nomeDoFormato('pontos'), 'Pontos corridos');
  assert.equal(nomeDoFormato('mata'), 'Mata-mata');
  assert.equal(nomeDoFormato('mata', { curto: true }), 'Mata-mata');
  assert.equal(nomeDoFormato('formato-que-nao-existe'), 'Pontos corridos', 'o motor também cai nos pontos corridos');
});

test('a linha de cada formato traz a conta de jogos: 4 times = "6 jogos + final", 6 jogos e 3 jogos', () => {
  assert.equal(jogosDoFormato('pontos_final', 4), '6 jogos + final');
  assert.equal(jogosDoFormato('pontos', 4), '6 jogos');
  assert.equal(jogosDoFormato('mata', 4), '3 jogos');
  assert.equal(jogosDoFormato('pontos_final', 3), '3 jogos + final');
  assert.equal(jogosDoFormato('pontos_final', 8), '28 jogos + final');
  assert.equal(jogosDoFormato('pontos', 2), '1 jogo', 'singular');
  assert.equal(jogosDoFormato('mata', 5), '4 jogos', 'com 5 times um passa direto, mas são 4 jogos');
  assert.match(explicacaoDoFormato('pontos_final', 4), /2 primeiros decidem o título na final\. Com 4 times: 6 jogos \+ final\.$/);
  assert.doesNotMatch(explicacaoDoFormato('mata'), /Com \d+ times/, 'sem número de times não inventa a conta');
});

test('com 2 times "Todos contra todos + final" não aparece; com 3 ou mais, aparecem os 3 (nesta ordem)', () => {
  assert.deepEqual(formatosParaOTime(2), ['pontos', 'mata']);
  assert.deepEqual(formatosParaOTime(3), ['pontos', 'pontos_final', 'mata']);
  assert.deepEqual(formatosParaOTime(8), ['pontos', 'pontos_final', 'mata']);
  assert.equal(MIN_TIMES_DO_FORMATO.pontos_final, 3);
  assert.equal(MIN_TIMES_DO_FORMATO.pontos, 2);
});

test('as duas fases: confronto sem `fase` é de grupos; a final é a que diz fase "final"', () => {
  const camp = { formato: 'pontos_final', confrontos: [{ id: 'a', fase: 'grupos' }, { id: 'b' }, { id: 'f', fase: 'final' }] };
  const { grupos, final } = fasesDoCampeonato(camp);
  assert.deepEqual(grupos.map((c) => c.id), ['a', 'b']);
  assert.equal(final.id, 'f');
  assert.equal(fasesDoCampeonato({ formato: 'pontos', confrontos: [{ id: 'x' }] }).final, null);
  assert.equal(temFaseFinal(camp), true);
  assert.equal(temFaseFinal({ formato: 'pontos' }), false);
  assert.equal(temFaseFinal(null), false);
});

function campeonatoTerminado(classificacao) {
  const t = (id, nome) => ({ id, nome, cor: '#fff', jogadores: [] });
  const times = [t('o', 'Ouro'), t('r', 'Roxo'), t('p', 'Prata'), t('b', 'Bronze')];
  return {
    formato: 'pontos_final',
    times,
    campeao: times[1],
    confrontos: [{ id: 'f', fase: 'final', time_a_id: 'o', time_b_id: 'r', jogado: true, placar_a: 1, placar_b: 2, vencedor_id: 'r' }],
    classificacao,
  };
}

test('o pódio: campeão da final, vice = quem perdeu a final, 3º = o 3º da tabela da fase de grupos', () => {
  const podio = podioDe(campeonatoTerminado([
    { id: 'o', nome: 'Ouro', cor: '#d4a017', pos: 1 }, { id: 'r', nome: 'Roxo', cor: '#8b5cf6', pos: 2 },
    { id: 'p', nome: 'Prata', cor: '#aab4c8', pos: 3 }, { id: 'b', nome: 'Bronze', cor: '#c2652e', pos: 4 },
  ]));
  assert.deepEqual(podio.map((p) => [p.pos, p.times.map((x) => x.nome)]), [[1, ['Roxo']], [2, ['Ouro']], [3, ['Prata']]]);
});

test('o pódio: dois times que dividem o 3º lugar sobem juntos', () => {
  const podio = podioDe(campeonatoTerminado([
    { id: 'o', nome: 'Ouro', cor: '#d4a017', pos: 1 }, { id: 'r', nome: 'Roxo', cor: '#8b5cf6', pos: 2 },
    { id: 'p', nome: 'Prata', cor: '#aab4c8', pos: 3 }, { id: 'b', nome: 'Bronze', cor: '#c2652e', pos: 3 },
  ]));
  assert.deepEqual(podio[2].times.map((x) => x.nome), ['Prata', 'Bronze']);
});

test('o pódio: antes da final jogada ninguém está no pódio', () => {
  const camp = campeonatoTerminado([{ id: 'o', nome: 'Ouro', pos: 1 }, { id: 'r', nome: 'Roxo', pos: 2 }, { id: 'p', nome: 'Prata', pos: 3 }]);
  camp.campeao = null;
  camp.confrontos[0].jogado = false;
  assert.deepEqual(podioDe(camp).map((p) => p.times.length), [0, 0, 0]);
});

test('as telas: lista, criar, escolha a partir do sorteio, página do time e página pública usam o nome e o seletor da casa', () => {
  const campeonato = ler('src/pages/Campeonato.jsx');
  const jogo = ler('src/pages/Jogo.jsx');
  const publico = ler('src/pages/CampeonatoPublico.jsx');
  assert.match(campeonato, /<SeletorDeFormato valor=\{formato\} onChange=\{setFormato\} nTimes=\{nomes\.length\} \/>/, 'o criar usa o seletor');
  const doSorteio = ler('src/components/CampeonatoDoSorteio.jsx');
  assert.match(jogo, /<CampeonatoDoSorteio/, 'a escolha a partir do sorteio é a peça compartilhada (Jogo e "Pelo sorteio de um jogo")');
  assert.match(doSorteio, /<SeletorDeFormato valor=\{formato\}/, 'e ela usa o mesmo seletor');
  assert.match(doSorteio, /onClick=\{criar\}/, 'só cria depois do "Criar campeonato"');
  assert.doesNotMatch(campeonato, /Por enquanto só pontos corridos e mata-mata/, 'a frase velha saiu');
  for (const [nome, fonte] of [['Campeonato', campeonato], ['CampeonatoPublico', publico]]) {
    assert.doesNotMatch(fonte, /camp\.formato === 'mata' \? 'Mata-mata' : 'Pontos corridos'/, `${nome}: o chip diz o nome do formato, não "mata ou pontos"`);
  }
  assert.match(publico, /<CampeonatoFinal campeonato=\{camp\} admin=\{false\} \/>/, 'a página pública mostra a final');
  assert.match(publico, /'Fase de grupos'/, 'e a fase de grupos');
});
