// Futty v2.0 — Rodada 29B (bloco 2, B): a lista progressiva não encolhe quando a Resenha ganha uma página (src/hooks/useListaProgressiva.js).
// "Ver mais antigos" acrescenta itens DEPOIS dos que já estão na tela; antes, qualquer mudança de tamanho voltava a lista aos 6 primeiros
// (a página encolhia debaixo do dedo e a rolagem se perdia).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { soCresceuNoFim } from '../../src/hooks/useListaProgressiva.js';

const itens = (n) => Array.from({ length: n }, (_, i) => ({ id: i }));

test('acrescentar itens depois dos que já estão na tela NÃO conta como lista nova', () => {
  const antes = itens(20);
  const depois = [...antes, ...itens(20).map((x) => ({ id: x.id + 20 }))];
  assert.equal(soCresceuNoFim(antes, depois), true);
});

test('lista nova de verdade volta à 1ª leva: post criado no topo, resposta fresca, filtro de time, item apagado', () => {
  const antes = itens(20);
  assert.equal(soCresceuNoFim(antes, [{ id: 'novo' }, ...antes]), false, 'post novo no topo');
  assert.equal(soCresceuNoFim(antes, itens(25)), false, 'objetos novos (resposta fresca do motor, mesmo com os mesmos ids)');
  assert.equal(soCresceuNoFim(antes, antes.slice(0, 10)), false, 'encolheu (filtro de time)');
  assert.equal(soCresceuNoFim(antes, antes.filter((x) => x.id !== 5).concat([{ id: 99 }, { id: 100 }])), false, 'apagou um e entrou outro: as posições mudaram');
  assert.equal(soCresceuNoFim(antes, antes), false, 'a mesma lista');
  assert.equal(soCresceuNoFim([], itens(5)), false, 'de vazia para cheia é a 1ª carga: segue as leves de sempre');
});
