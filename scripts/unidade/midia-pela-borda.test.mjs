// Futty v2.0 — a foto pela borda da Cloudflare: o app e o site pedem /api/media/... pelo domínio do site, e a Pages Function
// (functions/api/[[path]].js) guarda na borda. Aqui: a troca do endereço (src/utils/avatar.js#pelaBorda) e a função com a Cache API e o
// fetch de mentira — primeira leitura vai ao motor (MISS) e guarda; a segunda sai da borda (HIT) sem ir ao motor; o CORS é aberto só na
// mídia (o canvas do app lê a foto de outra origem); os dados de uma pessoa continuam sem cache nenhum.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

const MOTOR = 'https://futty-api-685039278359.southamerica-east1.run.app';

test('a foto do motor de produção sai pelo site; dev, prova e o resto ficam como estão', async () => {
  const { pelaBorda, urlImagem } = await import('../../src/utils/avatar.js');
  assert.equal(pelaBorda(`${MOTOR}/api/media/abc.def?rc=1,2,3`), 'https://futtyapp.com.br/api/media/abc.def?rc=1,2,3');
  assert.equal(urlImagem(`${MOTOR}/api/media/abc.def`, 512), 'https://futtyapp.com.br/api/media/abc.def?w=512');
  assert.equal(urlImagem(`${MOTOR}/api/media/abc.def`, 128, { quadrado: true }), 'https://futtyapp.com.br/api/media/abc.def?w=128&sq=1');
  assert.equal(pelaBorda('http://127.0.0.1:3001/api/media/abc.def'), 'http://127.0.0.1:3001/api/media/abc.def', 'o motor local não muda');
  assert.equal(pelaBorda(`${MOTOR}/api/inicio`), `${MOTOR}/api/inicio`, 'só a mídia');
  assert.equal(pelaBorda('https://lh3.googleusercontent.com/a/foto'), 'https://lh3.googleusercontent.com/a/foto');
  assert.equal(pelaBorda(null), '');
});

function bancada() {
  const guardadas = new Map();
  const pedidosAoMotor = [];
  globalThis.caches = {
    default: {
      match: async (req) => { const r = guardadas.get(req.url); return r ? r.clone() : undefined; },
      put: async (req, r) => { guardadas.set(req.url, r); },
    },
  };
  globalThis.fetch = async (req, opcoes) => {
    pedidosAoMotor.push({ url: req.url, opcoes, auth: req.headers.get('authorization'), origem: req.headers.get('origin') });
    if (req.url.includes('/api/media/')) {
      return new Response('BYTES-DA-FOTO', { status: 200, headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable', Vary: 'Origin', 'Access-Control-Allow-Origin': 'https://futtyapp.com.br', 'Server-Timing': 'app;dur=12.0' } });
    }
    return new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json', 'Server-Timing': 'app;dur=40.0' } });
  };
  const esperas = [];
  return { guardadas, pedidosAoMotor, waitUntil: (p) => esperas.push(p), terminar: () => Promise.all(esperas) };
}

test('a Pages Function: 1ª leitura da foto vai ao motor (MISS) e guarda; a 2ª sai da borda (HIT) sem ir ao motor', async () => {
  const b = bancada();
  const { onRequest } = await import('../../functions/api/[[path]].js');
  const pedir = (origem) => new Request('https://futtyapp.com.br/api/media/tok.en?w=512', { headers: { Origin: origem } });
  const r1 = await onRequest({ request: pedir('capacitor://localhost'), env: {}, waitUntil: b.waitUntil });
  await b.terminar();
  assert.equal(r1.status, 200);
  assert.equal(r1.headers.get('X-Futty-Borda'), 'MISS');
  assert.equal(await r1.text(), 'BYTES-DA-FOTO');
  assert.equal(b.pedidosAoMotor.length, 1);
  assert.equal(b.pedidosAoMotor[0].url, `${MOTOR}/api/media/tok.en?w=512`, 'o mesmo caminho e o mesmo tamanho no motor');
  assert.equal(b.pedidosAoMotor[0].origem, null, 'sem Origin: a resposta guardada é a mesma para todo mundo');
  assert.deepEqual(b.pedidosAoMotor[0].opcoes, { cf: { cacheEverything: true, cacheTtl: 31536000 } });
  assert.equal(b.guardadas.size, 1);

  const r2 = await onRequest({ request: pedir('https://localhost'), env: {}, waitUntil: b.waitUntil });
  assert.equal(r2.headers.get('X-Futty-Borda'), 'HIT');
  assert.equal(await r2.text(), 'BYTES-DA-FOTO');
  assert.equal(b.pedidosAoMotor.length, 1, 'a segunda leitura não foi ao motor');
  for (const r of [r1, r2]) {
    assert.equal(r.headers.get('Access-Control-Allow-Origin'), '*', 'o canvas do app (capacitor://, https://localhost) e o do site leem a mesma foto');
    assert.equal(r.headers.get('Vary'), null);
    assert.match(r.headers.get('Cache-Control'), /public, max-age=31536000, immutable/);
  }
  // Outro tamanho é outra entrada.
  await onRequest({ request: new Request('https://futtyapp.com.br/api/media/tok.en?w=128&sq=1'), env: {}, waitUntil: b.waitUntil });
  assert.equal(b.pedidosAoMotor.length, 2);
});

test('a Pages Function: os dados de uma pessoa seguem sem cache e sem CORS aberto', async () => {
  const b = bancada();
  const { onRequest } = await import('../../functions/api/[[path]].js');
  const r = await onRequest({ request: new Request('https://futtyapp.com.br/api/inicio', { headers: { Authorization: 'Bearer x', Origin: 'https://futtyapp.com.br' } }), env: {}, waitUntil: b.waitUntil });
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(r.headers.get('X-Futty-Borda'), null);
  assert.equal(b.pedidosAoMotor[0].auth, 'Bearer x');
  assert.equal(b.pedidosAoMotor[0].origem, null);
  assert.equal(b.guardadas.size, 0, 'nada guardado');
  assert.match(r.headers.get('Server-Timing'), /app;dur=40\.0, edge;dur=\d+/);
});
