// Futty v2.0 — Rodada 29I: o que era o Dashboard do painel do admin.
//
//   98/99 (bloco 2): "ÚLTIMO JOGO" mostrava um jogo do futuro e "PRÓXIMO JOGO" aparecia duas vezes. No bloco 3 o Dashboard saiu do
//   painel e virou o card "Seu time" do Início, com as pendências calculadas no MOTOR (backend/utils/pendenciasAdmin.js, testado em
//   backend/tests/seu-time-e-sorteio-curto.test.js) — utils/jogosAdmin.js, que fazia essas contas na tela, saiu junto.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

test('29I, bloco 3: o Dashboard do painel virou o card "Seu time" do Início — as pendências vêm do motor, não de contas na tela', () => {
  const raiz = fileURLToPath(new URL('../../', import.meta.url));
  const painel = fs.readFileSync(`${raiz}src/pages/AdminPanel.jsx`, 'utf8');
  assert.doesNotMatch(painel, /function TabDashboard|cardDashLbl|PRÓXIMO JOGO/, 'o Dashboard saiu do painel');
  const inicio = fs.readFileSync(`${raiz}src/pages/Inicio.jsx`, 'utf8');
  assert.match(inicio, /<CardSeuTime seuTime=\{dadosInicio\?\.seu_time \|\| \[\]\}/);
  // O "último jogo" do card (resultado por lançar) é o do motor: utils/pendenciasAdmin.js — o mais recente com data no passado,
  // cancelado fora (o mesmo do achado 98, provado em backend/tests/seu-time-e-sorteio-curto.test.js).
});
