// Futty v2.0 — Rodada 29B (bloco 3, E): o recorte da miniatura do avatar no app (src/lib/enquadroAvatar.js).
//
// O que se tranca aqui:
//   1. a janela quadrada é a MESMA do motor: a tabela de casos abaixo é cópia da de backend/tests/recorte-avatar.test.js —
//      mexeu numa, mexe na outra (o que a pessoa vê ao arrastar é o que o proxy entrega depois);
//   2. ler o `?rc=` que o motor deixa na URL do proxy, e tirá-lo para o editor pedir a imagem inteira (2:3);
//   3. o editor nunca deixa o centro "sobrar" além da borda (normalizarRecorte), e o recorte padrão é o quadrado do topo;
//   4. com recorte, a miniatura da FOTO crua passa a pedir o quadrado ao motor (sem recorte segue pedindo o 2:3);
//   5. o estilo da <img> do editor/preview mostra exatamente a janela (em % da caixa).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ESCALA_MAX_RECORTE, avatarQuadrado, enquadroAvatar, estiloDaJanela, janelaDoRecorte, normalizarRecorte, recorteDaUrl,
  recortePadrao, temRecorte, urlSemRecorte, validarRecorte,
} from '../../src/lib/enquadroAvatar.js';

// ATENÇÃO: a mesma tabela vive em backend/tests/recorte-avatar.test.js.
const CASOS_DA_JANELA = [
  [800, 1200, { x: 0.5, y: 0.5, escala: 1 }, { left: 0, top: 200, lado: 800 }],
  [800, 1200, { x: 0.5, y: 0, escala: 1 }, { left: 0, top: 0, lado: 800 }],
  [800, 1200, { x: 0.5, y: 1, escala: 1 }, { left: 0, top: 400, lado: 800 }],
  [800, 1200, { x: 0.5, y: 0.2, escala: 2 }, { left: 200, top: 40, lado: 400 }],
  [800, 1200, { x: 0, y: 0, escala: 3 }, { left: 0, top: 0, lado: 267 }],
  [800, 1200, { x: 1, y: 1, escala: 3 }, { left: 533, top: 933, lado: 267 }],
  [1200, 800, { x: 0.5, y: 0.5, escala: 1 }, { left: 200, top: 0, lado: 800 }],
  [500, 500, { x: 0.3, y: 0.7, escala: 1.5 }, { left: 0, top: 167, lado: 333 }],
];

const UID = '3f2a9c1e-5b7d-4e21-9a10-0c6d8b2f4a77';
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const proxy = (bucket, caminho, extra = '') => `https://futty-api.example/api/media/${b64url({ b: bucket, p: caminho, e: 1790000000 })}.assinaturaQualquer${extra}`;

test('a janela é a do motor: centro puxado para dentro, lado = menor medida ÷ escala, tudo inteiro', () => {
  for (const [w, h, recorte, esperado] of CASOS_DA_JANELA) {
    assert.deepEqual(janelaDoRecorte(w, h, recorte), esperado, `${w}×${h} ${JSON.stringify(recorte)}`);
  }
});

test('validarRecorte: x,y em 0–1, escala em 1–3 (3 casas); o resto é null', () => {
  assert.deepEqual(validarRecorte({ x: '0.12345', y: 1, escala: 1.5 }), { x: 0.123, y: 1, escala: 1.5 });
  assert.equal(ESCALA_MAX_RECORTE, 3);
  for (const ruim of [null, undefined, 'x', 7, {}, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5, escala: 0.99 }, { x: 0.5, y: 0.5, escala: 3.01 },
    { x: -0.01, y: 0.5, escala: 1 }, { x: 0.5, y: 1.01, escala: 1 }, { x: 'a', y: 0.5, escala: 1 }, { x: NaN, y: 0.5, escala: 1 }]) {
    assert.equal(validarRecorte(ruim), null, JSON.stringify(ruim));
  }
  assert.equal(janelaDoRecorte(0, 100, { x: 0.5, y: 0.5, escala: 1 }), null);
});

test('o `?rc=` do motor: lido da URL do proxy, com ou sem outros parâmetros; lixo é null; tirado, a URL volta ao que era', () => {
  const base = proxy('avatars', `public/${UID}-ai-dark-gold-1.png`);
  assert.deepEqual(recorteDaUrl(`${base}?rc=0.500,0.250,1.400`), { x: 0.5, y: 0.25, escala: 1.4 });
  assert.deepEqual(recorteDaUrl(`${base}?rc=0.500,0.250,1.400&w=128&sq=1`), { x: 0.5, y: 0.25, escala: 1.4 });
  assert.deepEqual(recorteDaUrl(`${base}?w=128&rc=0.5%2C0.25%2C1.4`), { x: 0.5, y: 0.25, escala: 1.4 });
  for (const ruim of [`${base}`, `${base}?rc=`, `${base}?rc=a,b,c`, `${base}?rc=0.5,0.5`, `${base}?rc=0.5,0.5,9`, `${base}?rc=%E0%A4%A`, '', null]) {
    assert.equal(recorteDaUrl(ruim), null, String(ruim));
    assert.equal(temRecorte(ruim), false);
  }
  assert.equal(urlSemRecorte(`${base}?rc=0.500,0.250,1.400`), base);
  assert.equal(urlSemRecorte(`${base}?rc=0.500,0.250,1.400&w=128&sq=1`), `${base}?w=128&sq=1`);
  assert.equal(urlSemRecorte(`${base}?w=128&rc=0.500,0.250,1.400`), `${base}?w=128`);
  assert.equal(urlSemRecorte(base), base);
});

test('recorte padrão = o quadrado do topo; normalizar puxa o centro para dentro da borda e é estável', () => {
  assert.deepEqual(recortePadrao(800, 1200), { x: 0.5, y: 0.333, escala: 1 });
  assert.deepEqual(janelaDoRecorte(800, 1200, recortePadrao(800, 1200)), { left: 0, top: 0, lado: 800 }, 'o padrão É o topo');
  assert.deepEqual(recortePadrao(1200, 800), { x: 0.5, y: 0.5, escala: 1 });
  const fora = normalizarRecorte(800, 1200, { x: 0.5, y: 0, escala: 2 }); // pediu o topo, a janela de 400 não pode passar da borda
  assert.deepEqual(fora, { x: 0.5, y: 0.167, escala: 2 });
  assert.deepEqual(janelaDoRecorte(800, 1200, fora), janelaDoRecorte(800, 1200, { x: 0.5, y: 0, escala: 2 }), 'a mesma janela, com o centro honesto');
  assert.deepEqual(normalizarRecorte(800, 1200, fora), fora, 'normalizar de novo não muda nada');
  assert.equal(normalizarRecorte(800, 1200, { x: 2, y: 0, escala: 1 }), null);
});

test('foto crua COM recorte pede o quadrado ao motor (sem recorte segue pedindo o 2:3); a figurinha sempre foi quadrada', () => {
  const foto = proxy('avatars', `public/${UID}-1790000000000.jpg`);
  const figurinha = proxy('avatars', `public/${UID}-ai-dark-gold-1.png`);
  assert.equal(avatarQuadrado(foto), false);
  assert.equal(avatarQuadrado(`${foto}?rc=0.500,0.300,1.500`), true);
  assert.equal(avatarQuadrado(figurinha), true);
  assert.equal(avatarQuadrado(`${figurinha}?rc=0.500,0.300,1.500`), true);
  // o resto do enquadramento não muda: o object-position de quem não tem janela escolhida segue a regra de sempre
  assert.equal(enquadroAvatar(`${foto}?rc=0.500,0.300,1.500`), '50% 35%');
  assert.equal(enquadroAvatar(figurinha), 'top');
});

test('estiloDaJanela: a imagem inteira, escalada e deslocada em % da caixa quadrada — a janela do motor', () => {
  // 800×1200, janela {left 200, top 40, lado 400}: a imagem fica 2× a caixa na largura, 3× na altura, deslocada −50% / −10%
  assert.deepEqual(estiloDaJanela(800, 1200, { x: 0.5, y: 0.2, escala: 2 }), {
    position: 'absolute', maxWidth: 'none', width: '200%', height: '300%', left: '-50%', top: '-10%',
  });
  // o quadrado do topo: a imagem tem a largura da caixa e 150% de altura, sem deslocamento
  assert.deepEqual(estiloDaJanela(800, 1200, recortePadrao(800, 1200)), {
    position: 'absolute', maxWidth: 'none', width: '100%', height: '150%', left: '0%', top: '0%',
  });
  assert.equal(estiloDaJanela(800, 1200, null), null);
});
