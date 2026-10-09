// Futty — Rodada 30C: o ANTES/DEPOIS de carregar a lista grande de nomes femininos, sozinho neste
// arquivo (o `node --test` roda cada arquivo *.test.mjs no seu próprio processo) — é o único jeito
// de garantir que "antes de carregar" é mesmo antes: em avatar-generico.test.mjs já rodaram vários
// avatarGenericoUrl(...), que disparam o carregamento como efeito colateral, e o import() pode
// resolver no meio dos testes (é assíncrono, mas rápido — não é rede, é um módulo local).
//
// "Leonor" está na lista grande (Brasil + Portugal) mas NÃO na pequena (NOMES_FEMININOS, ~160 nomes
// escritos à mão) — serve exatamente para provar a troca, sem quebrar nada no caminho.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avatarGenericoUrl, AVATARES_GENERICOS_FEM, AVATARES_GENERICOS_MASC } from '../../src/utils/avatarGenerico.js';
import { carregarNomesFemininos } from '../../src/utils/nomesFemininos.js';

const ehFem = (url) => AVATARES_GENERICOS_FEM.some((a) => a.url === url);
const ehMasc = (url) => AVATARES_GENERICOS_MASC.some((a) => a.url === url);

test('"Leonor": antes de carregar a lista grande cai no masculino (palpite pequeno de sempre); depois, no feminino', async () => {
  assert.ok(ehMasc(avatarGenericoUrl('leonor-1', null, 'Leonor')), 'antes de carregar, "Leonor" não está no palpite pequeno');
  await carregarNomesFemininos();
  assert.ok(ehFem(avatarGenericoUrl('leonor-1', null, 'Leonor')), 'depois de carregar, "Leonor" tem de virar feminino');
});
