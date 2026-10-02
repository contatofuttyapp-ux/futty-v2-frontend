// Futty v2.0 — Rodada 29H (item 12): o campo "Bairro" — a busca de freguesias (src/utils/freguesias.js) e a lista de verdade
// (public/dados/freguesias.json, scripts/gerar-freguesias.js). Puro: sem navegador, sem rede.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TEXTO_APOIO_BAIRRO, avisoDoBairro, buscarFreguesias, concelhoDePortugal, escolhaDaFreguesia, indexarFreguesias } from '../../src/utils/freguesias.js';

const lista = JSON.parse(readFileSync(new URL('../../public/dados/freguesias.json', import.meta.url), 'utf8'));
const cidades = JSON.parse(readFileSync(new URL('../../public/dados/cidades.json', import.meta.url), 'utf8'));
const indice = indexarFreguesias(lista);

test('a lista: todo concelho de Portugal do cidades.json tem freguesias, com coordenada em Portugal', () => {
  const concelhos = cidades.filter((c) => c[2] === 'PT');
  assert.equal(concelhos.length, 308);
  let total = 0;
  for (const [concelho, distrito] of concelhos) {
    const grupos = indice.get(concelho.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()) || [];
    assert.ok(grupos.some((g) => g.distrito === distrito) || grupos.length, `${concelho} (${distrito}) sem freguesias`);
  }
  for (const [, , itens] of lista) {
    for (const [nome, lat, lng] of itens) {
      total += 1;
      assert.ok(nome && Number.isFinite(lat) && Number.isFinite(lng), nome);
      assert.ok(lat > 32 && lat < 43 && lng > -32 && lng < -6, `${nome}: ${lat},${lng} fora de Portugal`);
    }
  }
  assert.ok(total >= 3000, `${total} freguesias`);
});

test('concelhoDePortugal: da lista (nome + distrito exatos), do texto "Lisboa, Portugal" e nada fora de Portugal', () => {
  assert.deepEqual(concelhoDePortugal('Lisboa, Portugal', { cidade: 'Lisboa', uf: 'Lisboa', pais: 'PT', lat: 38.72, lng: -9.14, origem: 'lista' }), { nome: 'Lisboa', distrito: 'Lisboa' });
  assert.deepEqual(concelhoDePortugal('Vila Nova de Gaia, Portugal', null), { nome: 'Vila Nova de Gaia', distrito: null });
  assert.equal(concelhoDePortugal('Belo Horizonte, MG', { cidade: 'Belo Horizonte', uf: 'MG', pais: 'BR' }), null);
  assert.equal(concelhoDePortugal('Brasília', null), null);
  assert.equal(concelhoDePortugal('', null), null);
});

test('buscarFreguesias: sem digitar mostra as primeiras do concelho; digitando, começa-com antes de contém, sem acento nem maiúscula', () => {
  const lisboa = { nome: 'Lisboa', distrito: 'Lisboa' };
  const todas = buscarFreguesias(indice, lisboa, '');
  assert.equal(todas.length, 8, 'as primeiras 8');
  const alva = buscarFreguesias(indice, lisboa, 'ALVAL');
  assert.deepEqual(alva.map((l) => l[0]), ['Alvalade']);
  assert.deepEqual(escolhaDaFreguesia(alva[0]), { bairro: 'Alvalade', bairro_origem: 'lista', bairro_lat: alva[0][1], bairro_lng: alva[0][2] });
  assert.ok(buscarFreguesias(indice, lisboa, 'santa').some((l) => /Santa/.test(l[0])));
  assert.ok(buscarFreguesias(indice, lisboa, 'estrela').length >= 1, 'palavra no meio também acha');
  assert.deepEqual(buscarFreguesias(indice, lisboa, 'xyzzy'), []);
});

test('buscarFreguesias: concelho com nome repetido (Calheta: Madeira e Açores) separa pelo distrito; sem distrito junta as duas', () => {
  const madeira = buscarFreguesias(indice, { nome: 'Calheta', distrito: 'Madeira' }, '', 50);
  const acores = buscarFreguesias(indice, { nome: 'Calheta', distrito: 'Açores' }, '', 50);
  const juntas = buscarFreguesias(indice, { nome: 'Calheta', distrito: null }, '', 50);
  assert.ok(madeira.length > 0 && acores.length > 0);
  assert.equal(juntas.length, madeira.length + acores.length);
});

test('buscarFreguesias: sem índice, sem concelho ou concelho que não existe devolve vazio (campo de texto livre)', () => {
  assert.deepEqual(buscarFreguesias(null, { nome: 'Lisboa' }, 'a'), []);
  assert.deepEqual(buscarFreguesias(indice, null, 'a'), []);
  assert.deepEqual(buscarFreguesias(indice, { nome: 'Cidade Inventada' }, 'a'), []);
});

test('avisoDoBairro: "Encontramos: <bairro>, <cidade>" · "Não achamos esse bairro…" · migração por aplicar · sem bairro nada', () => {
  assert.deepEqual(avisoDoBairro({ encontrado: true, nomeOficial: 'Savassi, Belo Horizonte, MG' }), { tipo: 'ok', texto: 'Encontramos: Savassi, Belo Horizonte, MG' });
  assert.deepEqual(avisoDoBairro({ encontrado: false }), { tipo: 'aviso', texto: 'Não achamos esse bairro. Seu time fica no ponto da cidade.' });
  assert.equal(avisoDoBairro({ encontrado: true, nomeOficial: 'x', salvo: false }).tipo, 'aviso');
  assert.match(avisoDoBairro({ encontrado: true, nomeOficial: 'x', salvo: false }).texto, /Não deu para guardar o bairro/);
  assert.equal(avisoDoBairro(null), null);
  assert.equal(avisoDoBairro(undefined), null);
  assert.equal(TEXTO_APOIO_BAIRRO, 'Só o bairro e a cidade, nunca o endereço.');
});
