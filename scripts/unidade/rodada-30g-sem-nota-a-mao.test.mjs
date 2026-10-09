// Futty v2.0 — Rodada 30G, item 1: times montados à mão não têm nota nenhuma (o motor não grava rating para
// quem foi ESCOLHIDO, só para quem foi sorteado). A estrela do cabeçalho ("Time Ouro ★", até aqui sempre vazia
// por falta de rating_medio) e a pastilha de cada jogador somem — nos cartões da tela do jogo, na apresentação
// (que já nunca as mostrou) e no link público, os três via DrawnTeams/TimesEmCartoes. Sorteado e ajustado
// continuam exatamente como estavam: lá a nota decidiu o sorteio.
// Comportamento visual provado no navegador: scripts/provas/selo-do-sorteio.prova.mjs (bloco "lista").
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const drawn = ler('src/components/DrawnTeams.jsx');

test('30G-1 · DrawnTeams calcula "à mão" a partir do mesmo visaoDoSorteio que já decide o selo', () => {
  assert.match(drawn, /const visao = visaoDoSorteio\(resultado\);/);
  assert.match(drawn, /const aMao = visao\?\.tipo === 'manual';/);
});

test('30G-1 · à mão: nem a estrela do cabeçalho, nem a pastilha do jogador, nem a nota da reserva', () => {
  assert.match(drawn, /\{!aMao && <span className="sorteio-team__avg">★ \{formatarAte\(time\.rating_medio, 2\)\}<\/span>\}/);
  assert.match(drawn, /\{!aMao && <span className="rating-pill">\{formatarAte\(j\.rating, 1\)\}<\/span>\}/);
  assert.match(drawn, /\{!aMao && <span data-reserva-nota style=\{\{ color: 'var\(--neon\)', fontWeight: 800 \}\}>\{formatarAte\(r\.rating, 1\)\}<\/span>\}/);
});

test('30G-1 · a prova de navegador cobre os três lugares (sorteado/ajustado continuam com nota, à mão não)', () => {
  const prova = ler('scripts/provas/selo-do-sorteio.prova.mjs');
  assert.match(prova, /lista · à mão: SEM a estrela do cabeçalho em nenhum time/);
  assert.match(prova, /lista · à mão: SEM pastilha de nota em nenhum jogador \(sorteado e ajustado continuam com elas\)/);
  assert.match(prova, /lista · à mão: a reserva também sem nota \(sorteado continua com ela\)/);
  // O fixture "à mão" da bancada é realista: sem rating nenhum (a mesma forma que POST /times-manuais grava).
  const bancada = ler('scripts/provas/selo-do-sorteio.jsx');
  assert.match(bancada, /const jogSemNota = \(id, nome\) => \(\{ user_id: id, nome, avatar_url: null \}\);/);
  assert.doesNotMatch(bancada.slice(bancada.indexOf('const aMao ='), bancada.indexOf('// Rodada 30G, item 2')), /rating/);
});
