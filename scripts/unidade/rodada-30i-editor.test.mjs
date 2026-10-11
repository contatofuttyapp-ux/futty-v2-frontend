// Futty v2.0 — Rodada 30I, itens 1, 3, 4 e 5 nas telas: o editor ÚNICO do resultado ("Quem ganhou?" → placar → gols de cada um → artilheiro e
// destaque do dia → foto do campeão). As contas puras (a mesma decisão que o motor toma) e a ligação de cada tela; o comportamento de verdade
// (tocar, digitar, somar gols, salvar em dois pedidos) está em scripts/provas/rodada-30i.prova.mjs.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RESULTADO_VAZIO, desfechoDoEstado, estadoDoJogo, fraseDoResultado, jogadoresDosTimes, jogoTemResultado, nomesDosTimes, placarFoiDigitado, resultadoGravado,
  temResultadoNoEstado,
} from '../../src/utils/resultadoDoJogo.js';
import { flagsDoTime } from '../../src/components/golsEPremios.js';
import { chaveDoJogador } from '../../src/utils/seloDoSorteio.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

const j = (id, nome) => ({ user_id: id, nome });
const convidado = (nome) => ({ user_id: null, convidado: true, nome });
const dois = { times: [{ nome: 'Time A', jogadores: [j('a', 'Magrão'), convidado('Beto')] }, { nome: 'Time B', jogadores: [j('b', 'Zé')] }] };
const quatro = { times: [...dois.times, { nome: 'Time C', jogadores: [j('c', 'Cacá')] }, { nome: 'Time D', jogadores: [j('d', 'Duda')] }] };

test('nomesDosTimes e jogadoresDosTimes: os nomes da cerimônia, e a lista de gols vale para TODOS os times (2, 3 ou 4)', () => {
  assert.deepEqual(nomesDosTimes(dois), ['Time Ouro', 'Time Roxo']);
  assert.deepEqual(nomesDosTimes(quatro), ['Time Ouro', 'Time Roxo', 'Time Prata', 'Time Bronze']);
  assert.deepEqual(nomesDosTimes(null), []);
  assert.deepEqual(jogadoresDosTimes(quatro).map((x) => [x.nome, x.time, x.timeIndex]), [
    ['Magrão', 'Time Ouro', 0], ['Beto', 'Time Ouro', 0], ['Zé', 'Time Roxo', 1], ['Cacá', 'Time Prata', 2], ['Duda', 'Time Bronze', 3],
  ]);
});

test('resultadoGravado / jogoTemResultado: o campeão manda; empate é resultado; "sem resultado" é outra coisa; time_vencedor sozinho só em jogo antigo', () => {
  assert.deepEqual(resultadoGravado({ campeao_time_index: 1, time_vencedor: 'A' }), { tipo: 'campeao', idx: 1 });
  assert.deepEqual(resultadoGravado({ campeao_time_index: 0 }), { tipo: 'campeao', idx: 0 }, 'o índice 0 (Time Ouro) é campeão');
  assert.deepEqual(resultadoGravado({ campeao_time_index: null, time_vencedor: 'empate' }), { tipo: 'empate' });
  assert.deepEqual(resultadoGravado({ campeao_time_index: null, time_vencedor: 'B' }), { tipo: 'campeao', idx: 1 }, 'jogo antigo');
  assert.equal(resultadoGravado({ campeao_time_index: null, time_vencedor: null, resultado_nivel: 3 }), null, 'nível, placar e gols não bastam');
  assert.equal(jogoTemResultado({ campeao_time_index: null, time_vencedor: 'empate' }), true);
  assert.equal(jogoTemResultado({ resultado_nivel: 2, placar_a: 1, placar_b: 0 }), false);
  assert.equal(jogoTemResultado(null), false);
});

test('fraseDoResultado: o placar quando houve; "Empate"; "venceu" com 2 times e "campeão" no rodízio; nada sem resultado', () => {
  const nomes2 = ['Time Ouro', 'Time Roxo'];
  assert.equal(fraseDoResultado({ campeao_time_index: 0, placar_a: 3, placar_b: 1 }, nomes2), 'Time Ouro 3 × 1 Time Roxo');
  assert.equal(fraseDoResultado({ campeao_time_index: null, time_vencedor: 'empate', placar_a: 2, placar_b: 2 }, nomes2), 'Time Ouro 2 × 2 Time Roxo');
  assert.equal(fraseDoResultado({ campeao_time_index: null, time_vencedor: 'empate' }, nomes2), 'Empate');
  assert.equal(fraseDoResultado({ campeao_time_index: 1 }, nomes2), 'Time Roxo venceu');
  assert.equal(fraseDoResultado({ campeao_time_index: 2 }, [...nomes2, 'Time Prata']), 'Time Prata campeão');
  assert.equal(fraseDoResultado({ campeao_time_index: null, time_vencedor: null }, nomes2), null);
});

test('estadoDoJogo: parte do que está gravado — o campeão, o empate, os gols (o placar da soma não é "digitado") e os prêmios', () => {
  const g = { campeao_time_index: 1, time_vencedor: 'B', placar_a: 1, placar_b: 2, campeao_foto_url: 'https://x/c.webp', artilheiro_user_id: 'b', artilheiro_gols: 2, destaque_user_id: 'a', destaque_titulo: 'Paredão', rodada_user_id: null };
  const comGols = estadoDoJogo(g, [{ user_id: 'a', nome: 'Magrão', gols: 1 }, { user_id: 'b', nome: 'Zé', gols: 2 }]);
  assert.equal(comGols.campeaoIdx, 1);
  assert.equal(comGols.empate, false);
  assert.deepEqual([comGols.placarA, comGols.placarB], [null, null], 'com gols, o placar é a soma: nada digitado');
  assert.deepEqual(comGols.golsMap, { 'u:a': 1, 'u:b': 2 });
  assert.deepEqual([comGols.temArt, comGols.artId, comGols.artGols, comGols.temDest, comGols.destId, comGols.destTitulo, comGols.temRodada], [true, 'b', 2, true, 'a', 'Paredão', false]);
  assert.equal(comGols.campeaoFoto, 'https://x/c.webp');
  // Sem gols, o placar gravado foi digitado.
  const semGols = estadoDoJogo({ campeao_time_index: 0, placar_a: 2, placar_b: 1 }, []);
  assert.deepEqual([semGols.placarA, semGols.placarB], ['2', '1']);
  // Empate gravado e jogo antigo (só time_vencedor).
  assert.equal(estadoDoJogo({ campeao_time_index: null, time_vencedor: 'empate' }, []).empate, true);
  assert.equal(estadoDoJogo({ campeao_time_index: null, time_vencedor: 'B' }, []).campeaoIdx, 1);
  // Convidado sem app: o gol é do nome dele, e dois convidados não se misturam.
  const comConvidados = estadoDoJogo({}, [{ user_id: null, nome: 'Beto', gols: 2 }, { user_id: null, nome: 'Caio', gols: 1 }]);
  assert.deepEqual(comConvidados.golsMap, { [chaveDoJogador(convidado('Beto'))]: 2, [chaveDoJogador(convidado('Caio'))]: 1 });
  assert.deepEqual(estadoDoJogo(null, null).golsMap, {});
});

test('desfechoDoEstado com 3 e 4 times: só o campeão — sem placar, sem empate, e os gols não decidem nada', () => {
  const jogadores = jogadoresDosTimes(quatro);
  const d = (extra, nTimes = 4) => desfechoDoEstado({ ...RESULTADO_VAZIO, ...extra }, { nTimes, jogadores });
  assert.deepEqual(d({ campeaoIdx: 3 }), { origem: 'toque', placar: null, campeaoIdx: 3, empate: false });
  assert.deepEqual(d({ campeaoIdx: 2, empate: true, placarA: '1', placarB: '1', golsMap: { 'u:a': 5 } }), { origem: 'toque', placar: null, campeaoIdx: 2, empate: false });
  assert.equal(d({ empate: true }).origem, null, 'rodízio não tem empate');
  assert.equal(d({ campeaoIdx: 3 }, 3).origem, null, 'o time 3 não existe com 3 times');
  assert.equal(desfechoDoEstado({ ...RESULTADO_VAZIO, campeaoIdx: 0 }, { nTimes: 0, jogadores: [] }).origem, null, 'sem times não há resultado');
});

test('temResultadoNoEstado / placarFoiDigitado', () => {
  const jogo = { nTimes: 2, jogadores: jogadoresDosTimes(dois) };
  assert.equal(temResultadoNoEstado(RESULTADO_VAZIO, jogo), false);
  assert.equal(temResultadoNoEstado({ ...RESULTADO_VAZIO, empate: true }, jogo), true);
  assert.equal(temResultadoNoEstado({ ...RESULTADO_VAZIO, golsMap: { 'u:a': 1 } }, jogo), true);
  assert.equal(placarFoiDigitado({ placarA: null, placarB: null }), false);
  assert.equal(placarFoiDigitado({ placarA: '', placarB: '  ' }), false);
  assert.equal(placarFoiDigitado({ placarA: '0', placarB: null }), true, '0 é um placar');
});

test('flagsDoTime: o que o time conta — o troféu do artilheiro faz parte dos gols', () => {
  assert.deepEqual(flagsDoTime({}), { gols: true, artilheiro: true, destaque: true });
  assert.deepEqual(flagsDoTime(null), { gols: true, artilheiro: true, destaque: true });
  assert.deepEqual(flagsDoTime({ mostrar_gols: false }), { gols: false, artilheiro: false, destaque: true });
  assert.deepEqual(flagsDoTime({ mostrar_artilheiro: false }), { gols: true, artilheiro: false, destaque: true });
  assert.deepEqual(flagsDoTime({ mostrar_destaque: false }), { gols: true, artilheiro: true, destaque: false });
});

test('a tela do jogo abre o editor completo (times, gols de todos os times, quem pode ser artilheiro, o que o time conta) e o refaz quando o gravado muda', () => {
  const jogo = semComentarios(ler('src/pages/Jogo.jsx'));
  assert.match(jogo, /const \{ team: timeCompleto \} = useTeam\(slug\);/);
  assert.match(jogo, /const jogadoresResultado = jogadoresDosTimes\(game\?\.times_resultado\);/, 'a lista de gols vale para todos os times');
  assert.match(jogo, /times=\{timesDoEditor\}/);
  assert.match(jogo, /jogadores=\{jogadoresResultado\}/);
  assert.match(jogo, /confirmados=\{confirmadosTodos\}/);
  assert.match(jogo, /flags=\{flagsDoTime\(timeCompleto\)\}/);
  assert.match(jogo, /key=\{`\$\{game\.campeao_time_index\}\|\$\{game\.time_vencedor\}\|\$\{game\.placar_a\}\|\$\{game\.placar_b\}\|\$\{game\.resultado_nivel\}\|\$\{golsResultado\.length\}`\}/);
  assert.doesNotMatch(jogo, /nomeA=|nomeB=|nomeTimeA|nomeTimeB/, 'nada do editor antigo, de dois times fixos');
  // O resultado visível a todos lê o campeão (e o empate), não o nível.
  assert.match(jogo, /const resultadoDoJogo = resultadoGravado\(game\);/);
  assert.match(jogo, /\{fraseDoResultado\(game, nomesTimes\)\}/);
  assert.doesNotMatch(jogo, /game\.time_vencedor === 'empate' \? 'Empate' : `\$\{game\.time_vencedor === 'A'/, 'a frase não depende mais da letra A/B');
});

test('Ajustes → Jogos: "Lançar resultado" só no jogo sem campeão nem empate; "Editar resultado" nos que têm', () => {
  const painel = semComentarios(ler('src/pages/AdminPanel.jsx'));
  assert.match(painel, /const temResultado = jogoTemResultado\(g\);/);
  assert.doesNotMatch(painel, /\(g\.resultado_nivel \|\| 0\) > 0/, 'o nível sozinho não é mais o critério');
});

test('o editor: tocar no time é o campeão; os gols e o placar decidem sozinhos; 3 ou 4 times perguntam só o campeão; o empate só com 2 times', () => {
  const editor = ler('src/components/ResultadoEditor.jsx');
  assert.match(editor, /data-vencedor=\{v\}/, 'os botões A / empate / B (2 times)');
  assert.match(editor, /\[\['A', nomes\[0\], d\.campeaoIdx === 0\], \['empate', 'Empate', d\.empate\], \['B', nomes\[1\], d\.campeaoIdx === 1\]\]/);
  assert.match(editor, /nTimes >= 3 \? 'Quem foi o campeão\?' : 'Quem ganhou\?'/);
  assert.match(editor, /data-campeao-time=\{i\}/, 'o rodízio: um botão por time');
  assert.match(editor, /const decididoPorOutro = d\.origem === 'gols' \|\| d\.origem === 'placar';/);
  assert.match(editor, /if \(decididoPorOutro\) return;/, 'com gols ou placar, o vencedor sai deles: o toque não muda nada');
  assert.match(editor, /\{nTimes === 2 \? \(\s*<>\s*<div className="section-title" data-placar-titulo/, 'o placar só existe com 2 times');
  assert.match(editor, /readOnly=\{d\.origem === 'gols'\}/, 'com gols o placar é mostrado (a soma), não digitado');
  assert.match(editor, /const mostraGols = flags\.gols && jogadores\.length > 0;/);
  assert.match(editor, /const mostraArtilheiro = flags\.artilheiro \|\| estado\.temArt;/);
  assert.match(editor, /const mostraDestaque = flags\.destaque \|\| estado\.temDest;/);
  assert.doesNotMatch(semComentarios(editor), /NIVEIS|Sem resultado|setNivel/, 'o seletor de 4 níveis morreu: o motor deduz o nível');
});
