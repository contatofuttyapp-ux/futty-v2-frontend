// Futty v2.0 — Rodada 29I (achados 95, 106 e 104 na tela): o que o Ranking, o Explorar e as Estatísticas do admin escrevem.
//
//   95. O ranking parecia quebrado porque escondia o número que o ordena: a tela mostrava posição, nome e NOTA (1º 10.0, 2º 8.7, 3º 9.3…),
//       e a ordem é por `score` 0–100 (vitórias + gols + destaques + presença + nota), que não aparecia em lugar nenhum. Agora a linha
//       mostra os PONTOS (rotulados), com a nota ao lado, e uma linha no topo diz o que conta.
//  106. "TIMES ABERTOS · 4" incluía times "com aprovação" (botão PEDIR ENTRADA): o título passa a ser "TIMES PERTO DE VOCÊ · N".
//  104. A seção "PRESENÇA" das Estatísticas listava vitórias: agora lista presenças, ordenada por elas.
//
// São telas seladas e sem navegador no Node: o que se trava é o TEXTO e a FONTE do número, lendo o arquivo (o mesmo jeito dos outros
// testes de tela da casa).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { formatScore } from '../../src/utils/format.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(`${RAIZ}${rel}`, 'utf8');

test('Ranking: a linha mostra os PONTOS (o score que ordena), rotulados, com a nota ao lado', () => {
  const tela = ler('src/pages/Ranking.jsx');
  assert.match(tela, /formatScore\(p\.score\)/, 'o número que ordena aparece na linha');
  assert.match(tela, /data-pontos/);
  assert.match(tela, /\{' '\}pontos</, 'rotulado "pontos" (com um espaço de verdade: o texto lê "77,9 pontos", não "77,9pontos")');
  assert.match(tela, /<span className="muted">nota <\/span>/, 'a nota continua, ao lado');
  assert.match(tela, /formatarNota\(p\.nota\)/, 'a nota passa pelo helper PT-BR (9,1), nunca toFixed (9.1)');
});

test('Ranking: uma linha curta no topo diz o que conta (texto pela régua da VOZ: curto, sem travessão, sem gíria)', () => {
  const tela = ler('src/pages/Ranking.jsx');
  const m = tela.match(/data-ranking-criterio[^>]*>\s*([^<]+?)\s*<\/p>/);
  assert.ok(m, 'a linha do critério existe');
  const frase = m[1];
  assert.match(frase, /pontos/);
  for (const palavra of ['vitórias', 'gols', 'destaques', 'presença', 'nota']) assert.match(frase, new RegExp(palavra), `diz que ${palavra} conta`);
  assert.doesNotMatch(frase, /[—–]/, 'nada de travessão no meio da frase (VOZ §2)');
  assert.doesNotMatch(frase, /!/);
  assert.ok(frase.length <= 90, `uma linha curta (${frase.length} letras)`);
});

// Rodada 29Z: a linha "77,9 pontos · nota 9,1" era cortada pelo botão "Alterar" (reticências). Agora são dois grupos que não se partem
// por dentro e quebram de linha — a nota desce para a segunda linha quando não cabem juntos —, sem white-space:nowrap e sem ellipsis
// no contêiner. A medição de verdade (360 e 390 px, o botão ao lado) é a prova do navegador "rodada-29z".
test('Ranking: pontos e nota nunca levam reticências — dois grupos que quebram de linha (29Z)', () => {
  const tela = ler('src/pages/Ranking.jsx');
  assert.match(tela, /className="rank-votes" style=\{\{ marginTop: 4, fontSize: 12 \}\}/, 'o contêiner não força nowrap nem ellipsis no estilo');
  assert.match(tela, /className="rank-votes__grupo" data-grupo-pontos/);
  assert.match(tela, /className="rank-votes__grupo" data-grupo-nota/);
  const css = ler('src/styles/app.css');
  const regra = css.match(/\.rank-votes \{([^}]*)\}/);
  assert.ok(regra, 'a regra .rank-votes existe');
  assert.match(regra[1], /flex-wrap:\s*wrap/, 'os grupos quebram de linha');
  assert.doesNotMatch(regra[1], /text-overflow/, 'sem reticências');
  assert.match(css, /\.rank-votes__grupo \{[^}]*white-space:\s*nowrap/, 'cada grupo não se parte por dentro');
});

test('os pontos saem com uma casa decimal e vírgula (formatScore, 29Z)', () => {
  assert.equal(formatScore(87.36), '87,4');
  assert.equal(formatScore(77.9), '77,9');
  assert.equal(formatScore(100), '100,0');
  assert.equal(formatScore(0), '0,0');
  assert.equal(formatScore(null), '0,0');
});

test('Explorar: o título da lista leva o "· N" e não promete "perto de você" sem localização (29T, achado 161)', () => {
  const tela = ler('src/pages/Explorar.jsx');
  assert.match(tela, /\{tituloDoRadar\(\{ origem: origemPos, cidade: cidadeDaPos \}\)\} · \{filtradas\.length\}/);
  assert.doesNotMatch(tela, /Times perto de você/, 'o título fixo "Times perto de você" saiu');
  assert.doesNotMatch(tela, /Times abertos/i);
});

test('Estatísticas do admin: "Presença" lista presenças (jogos em que a pessoa esteve), não vitórias', () => {
  const painel = ler('src/pages/AdminPanel.jsx');
  assert.match(painel, /topPresenca = \[\.\.\.membros\]\.sort\(\(a, b\) => \(b\.presencas \|\| 0\) - \(a\.presencas \|\| 0\)\)/);
  assert.match(painel, /plural\(m\.presencas \|\| 0, 'presença', 'presenças'\)/);
  assert.doesNotMatch(painel, /topVitorias/, 'a lista de vitórias que estava sob o título "Presença" saiu');
});
