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
  assert.match(tela, />pontos</, 'rotulado "pontos"');
  assert.match(tela, /<span className="muted">nota <\/span>/, 'a nota continua, ao lado');
  assert.match(tela, /p\.nota\.toFixed\(1\)/);
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

test('Ranking: a altura da linha não muda — continua uma linha de números só (o esqueleto mede 79 px)', () => {
  const tela = ler('src/pages/Ranking.jsx');
  assert.match(tela, /className="rank-votes" style=\{\{ marginTop: 4, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' \}\}/);
});

test('os pontos saem com uma casa decimal (formatScore)', () => {
  assert.equal(formatScore(87.36), '87.4');
  assert.equal(formatScore(100), '100.0');
  assert.equal(formatScore(0), '0.0');
  assert.equal(formatScore(null), '0.0');
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
