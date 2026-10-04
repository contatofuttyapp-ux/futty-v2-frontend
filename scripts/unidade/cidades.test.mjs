// Futty v2.0 — Rodada 29B (D): a lista de cidades do campo "Cidade" (src/utils/cidades.js) e o arquivo
// public/dados/cidades.json que scripts/gerar-cidades.js grava.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import {
  avisoAchou, avisoDaCidade, avisoNaoAchou, buscarCidades, escolhaDaLinha, indexarCidades, normalizarCidade, rotuloDaCidade, timeCasaPorCidade,
} from '../../src/utils/cidades.js';

const ARQUIVO = new URL('../../public/dados/cidades.json', import.meta.url);
const LISTA = JSON.parse(readFileSync(ARQUIVO, 'utf8'));
const INDICE = indexarCidades(LISTA);
const nomes = (linhas) => linhas.map((l) => rotuloDaCidade(l));

// ─── normalização: a MESMA do motor (backend/utils/cidade.js — tests/cidade.test.js tem os mesmos casos) ──────────
test('normalizar: sem acento, sem maiúscula, sem espaço duplo nem nas pontas (igual ao motor)', () => {
  assert.equal(normalizarCidade('São Paulo'), 'sao paulo');
  assert.equal(normalizarCidade('  SAO   paulo '), 'sao paulo');
  assert.equal(normalizarCidade('Brasília'), 'brasilia');
  assert.equal(normalizarCidade('Açu'), 'acu');
  assert.equal(normalizarCidade('Ribeirão\tPreto'), 'ribeirao preto');
  assert.equal(normalizarCidade('Olho d\'Água'), 'olho d\'agua');
  assert.equal(normalizarCidade(null), '');
  assert.equal(normalizarCidade(undefined), '');
  assert.equal(normalizarCidade('   '), '');
});

// ─── o arquivo ────────────────────────────────────────────────────────────────
test('arquivo: 5.571 municípios do Brasil + 308 concelhos de Portugal, cada linha [nome, uf|distrito, país, lat, lng]', () => {
  assert.equal(LISTA.filter((l) => l[2] === 'BR').length, 5571);
  assert.equal(LISTA.filter((l) => l[2] === 'PT').length, 308);
  assert.equal(LISTA.length, 5879);
  for (const l of LISTA) {
    assert.equal(l.length, 5, JSON.stringify(l));
    assert.ok(typeof l[0] === 'string' && l[0] && typeof l[1] === 'string' && l[1], JSON.stringify(l));
    assert.ok(l[2] === 'BR' || l[2] === 'PT', JSON.stringify(l));
    assert.ok(Number.isFinite(l[3]) && Number.isFinite(l[4]), JSON.stringify(l));
  }
});

test('arquivo: as coordenadas caem no país certo e têm no máximo 2 casas (~1 km)', () => {
  for (const [nome, uf, pais, lat, lng] of LISTA) {
    if (pais === 'BR') assert.ok(lat > -34 && lat < 6 && lng > -74 && lng < -28, `${nome}/${uf} ${lat},${lng}`);
    else assert.ok(lat > 32 && lat < 43 && lng > -32 && lng < -6, `${nome} ${lat},${lng}`);
    assert.equal(Math.round(lat * 100) / 100, lat);
    assert.equal(Math.round(lng * 100) / 100, lng);
  }
});

test('arquivo: Brasil com as 27 UFs; Portugal com os 18 distritos e as duas regiões autónomas', () => {
  const ufs = new Set(LISTA.filter((l) => l[2] === 'BR').map((l) => l[1]));
  assert.equal(ufs.size, 27);
  assert.ok(['SP', 'MG', 'DF', 'PE', 'MT'].every((u) => ufs.has(u)));
  const distritos = new Set(LISTA.filter((l) => l[2] === 'PT').map((l) => l[1]));
  assert.equal(distritos.size, 20);
  assert.ok(['Lisboa', 'Porto', 'Faro', 'Açores', 'Madeira'].every((d) => distritos.has(d)));
});

test('arquivo: nenhuma cidade repetida (mesmo nome, mesma UF/distrito) e Lafões (histórico) fora', () => {
  const chaves = LISTA.map((l) => `${l[0]}|${l[1]}|${l[2]}`);
  assert.equal(new Set(chaves).size, chaves.length);
  assert.ok(!LISTA.some((l) => l[0] === 'Lafões'));
  assert.ok(LISTA.some((l) => l[0] === 'Boa Esperança do Norte' && l[1] === 'MT'), 'o município mais novo do IBGE');
  assert.equal(LISTA.filter((l) => l[0] === 'Lagoa' && l[2] === 'PT').length, 2, 'as duas Lagoas de Portugal (Faro e Açores)');
});

test('arquivo: ≤ 80 KB comprimido (a meta do dono) e nunca no bundle', () => {
  const bruto = readFileSync(ARQUIVO);
  assert.ok(gzipSync(bruto, { level: 9 }).length <= 80 * 1024, `gzip ${gzipSync(bruto, { level: 9 }).length} B`);
});

// ─── a busca ──────────────────────────────────────────────────────────────────
test('busca: só a partir de 2 letras', () => {
  assert.deepEqual(buscarCidades(INDICE, ''), []);
  assert.deepEqual(buscarCidades(INDICE, 's'), []);
  assert.deepEqual(buscarCidades(INDICE, ' s '), []);
  assert.ok(buscarCidades(INDICE, 'sa').length > 0);
});

test('busca: sem acento e sem maiúscula ("sao paulo" acha "São Paulo, SP")', () => {
  for (const q of ['sao paulo', 'SAO PAULO', 'São Paulo', '  são   paulo ']) {
    assert.ok(nomes(buscarCidades(INDICE, q)).includes('São Paulo, SP'), q);
  }
  assert.ok(nomes(buscarCidades(INDICE, 'brasilia')).includes('Brasília, DF'));
  assert.ok(nomes(buscarCidades(INDICE, 'lisboa')).includes('Lisboa, Portugal'));
  assert.ok(nomes(buscarCidades(INDICE, 'vila nova de gaia')).includes('Vila Nova de Gaia, Portugal'));
});

test('busca: o rótulo do Brasil é "Cidade, UF" e o de Portugal "Concelho, Portugal"', () => {
  const r = nomes(buscarCidades(INDICE, 'lagoa', 20));
  assert.ok(r.includes('Lagoa, PB'));
  assert.ok(r.filter((x) => x === 'Lagoa, Portugal').length === 2, 'as duas Lagoas de Portugal aparecem (distritos diferentes)');
});

test('busca: quem COMEÇA com o texto vem antes de quem só o contém; nome mais curto primeiro', () => {
  const r = buscarCidades(INDICE, 'lisbo', 20);
  assert.equal(r[0][0], 'Lisboa');
  const cont = buscarCidades(INDICE, 'paulo', 50).map((l) => normalizarCidade(l[0]));
  const primeiroQueSoContem = cont.findIndex((n) => !n.startsWith('paulo'));
  const ultimoQueComeca = cont.map((n) => n.startsWith('paulo')).lastIndexOf(true);
  assert.ok(primeiroQueSoContem === -1 || ultimoQueComeca < primeiroQueSoContem, 'os que começam vêm primeiro');
});

test('busca: respeita o máximo (8 por omissão) e não devolve nada para o que não existe', () => {
  assert.equal(buscarCidades(INDICE, 'sa').length, 8);
  assert.equal(buscarCidades(INDICE, 'sa', 3).length, 3);
  assert.deepEqual(buscarCidades(INDICE, 'xyzzyville'), []);
  assert.deepEqual(buscarCidades(null, 'sao'), []);
});

// ─── a escolha e os avisos ────────────────────────────────────────────────────
test('escolha: manda { cidade, uf, pais, lat, lng, origem: "lista" } (uf = distrito em Portugal)', () => {
  const bh = LISTA.find((l) => l[0] === 'Belo Horizonte');
  assert.deepEqual(escolhaDaLinha(bh), { cidade: 'Belo Horizonte', uf: 'MG', pais: 'BR', lat: bh[3], lng: bh[4], origem: 'lista' });
  const lx = LISTA.find((l) => l[0] === 'Lisboa');
  assert.deepEqual(escolhaDaLinha(lx), { cidade: 'Lisboa', uf: 'Lisboa', pais: 'PT', lat: lx[3], lng: lx[4], origem: 'lista' });
});

test('textos da tela: "Encontramos: <nome oficial>" e "Não achamos essa cidade. Seu time só aparece no "Radar de peladas" para quem escrever exatamente \'<texto>\'."', () => {
  assert.equal(avisoAchou('Belo Horizonte, MG'), 'Encontramos: Belo Horizonte, MG');
  assert.equal(avisoNaoAchou('  Vila Xyzzy '), 'Não achamos essa cidade. Seu time só aparece no "Radar de peladas" para quem escrever exatamente \'Vila Xyzzy\'.');
  assert.deepEqual(avisoDaCidade({ encontrada: true, nomeOficial: 'Kyoto, Kyoto Prefecture' }, 'Kyoto'), { tipo: 'ok', texto: 'Encontramos: Kyoto, Kyoto Prefecture' });
  assert.deepEqual(avisoDaCidade({ encontrada: false }, 'Vila Xyzzy'), { tipo: 'aviso', texto: 'Não achamos essa cidade. Seu time só aparece no "Radar de peladas" para quem escrever exatamente \'Vila Xyzzy\'.' });
  assert.equal(avisoDaCidade(null, 'x'), null);
  assert.equal(avisoDaCidade(undefined, 'x'), null);
});

// ─── o casamento por texto no Explorar (igual ao do motor) ────────────────────
test('Explorar: time sem coordenada casa pela cidade normalizada IGUAL à busca; com coordenada não', () => {
  const semPonto = { cidade_normalizada: 'brasilia', geo_lat: null, geo_lng: null };
  for (const busca of ['Brasília', 'brasilia', ' BRASILIA ']) assert.equal(timeCasaPorCidade(semPonto, busca), true, busca);
  assert.equal(timeCasaPorCidade(semPonto, 'brasil'), false, 'exatamente: pedaço não casa');
  assert.equal(timeCasaPorCidade(semPonto, ''), false);
  assert.equal(timeCasaPorCidade({ ...semPonto, geo_lat: -15.78, geo_lng: -47.93 }, 'brasilia'), false);
  assert.equal(timeCasaPorCidade({ cidade_normalizada: null, geo_lat: null, geo_lng: null }, 'brasilia'), false);
  assert.equal(timeCasaPorCidade(null, 'brasilia'), false);
});
