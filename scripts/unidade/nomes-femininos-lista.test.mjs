// Futty — Rodada 30C: a lista grande de primeiros nomes femininos (src/utils/nomesFemininos.lista.js),
// gerada por scripts/nomes/gerar-nomes-femininos.mjs (Brasil via Brasil.io/IBGE + Portugal via IRN).
//
// Tamanho: o rascunho da rodada previa "2500 a 3500 nomes", pensando numa lista de Portugal menor. A
// lista VIVA da IRN sozinha já tem ~3.860 nomes (cresceu com o tempo; inclui nomes de origem
// estrangeira admitidos por dupla nacionalidade) — cortá-la para caber num número redondo seria
// arbitrário, porque ela não tem frequência nenhuma para decidir "os mais comuns". O que de fato
// importa — o peso do chunk que o app baixa — continua dentro do previsto mesmo com ~9 mil nomes
// (texto curto e repetitivo comprime bem); é isso que este teste trava, não a contagem de nomes.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import lista from '../../src/utils/nomesFemininos.lista.js';
import { NOMES_FEMININOS } from '../../src/utils/nomesFemininos.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const CAMINHO_LISTA = path.join(RAIZ, 'src/utils/nomesFemininos.lista.js');

test('tamanho: pelo menos 2500 (piso do rascunho) — sem teto, pois as duas fontes são completas e oficiais', () => {
  assert.ok(lista.length >= 2500, `${lista.length} nomes — abaixo do piso de 2500`);
});

test('o CHUNK (o que o app baixa de verdade) cabe no orçamento: até 60 KB gzip (o rascunho previa 25-40 KB para ~3000 nomes; com ~9 mil ainda cabe)', () => {
  const bruto = fs.readFileSync(CAMINHO_LISTA);
  const gz = zlib.gzipSync(bruto, { level: 9 });
  assert.ok(gz.length <= 60 * 1024, `${(gz.length / 1024).toFixed(1)} KB gzip — acima do orçamento`);
});

test('nenhum nome com acento, maiúscula ou espaço (mesma normalização de utils/cidades.js)', () => {
  const ruins = lista.filter((n) => n !== n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim() || /\s/.test(n));
  assert.deepEqual(ruins.slice(0, 10), [], `${ruins.length} nome(s) fora do padrão`);
});

test('sem duplicados', () => {
  assert.equal(new Set(lista).size, lista.length);
});

test('lista ordenada (alfabética, para o diff do gerador ficar legível)', () => {
  const ordenada = [...lista].sort();
  assert.deepEqual(lista, ordenada);
});

test('amostra positiva: maria, ana, joana, matilde, leonor, carolina, benedita', () => {
  const set = new Set(lista);
  for (const nome of ['maria', 'ana', 'joana', 'matilde', 'leonor', 'carolina', 'benedita']) {
    assert.ok(set.has(nome), `"${nome}" devia estar na lista`);
  }
});

test('amostra negativa: nomes masculinos ou fictícios não entram', () => {
  const set = new Set(lista);
  for (const nome of ['joao', 'pedro', 'alex', 'darci', 'chavo']) {
    assert.ok(!set.has(nome), `"${nome}" não devia estar na lista`);
  }
});

test('a lista grande cobre a lista pequena de sempre (nomesFemininos.js) quase toda — nenhuma surpresa grande ao trocar de uma para a outra', () => {
  const grande = new Set(lista);
  const fora = [...NOMES_FEMININOS].filter((n) => !grande.has(n));
  // Tolerância pequena: a lista pequena foi escrita à mão e pode ter 1-2 nomes abaixo do piso de
  // frequência/ratio do Brasil ou fora da lista da IRN — não é erro, só reflete fontes diferentes.
  assert.ok(fora.length <= 5, `${fora.length} nome(s) da lista pequena sumiram da grande: ${fora.join(', ')}`);
});
