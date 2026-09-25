// Futty v2.0 — RODADA 28 (bloco A): o card com a FOTO (src/utils/figurinhaCanvas.js).
//
// O que se tranca aqui:
//   1. zoom 1 = EXATAMENTE a conta de antes (o enquadramento salvo continua a ser o de todas as
//      telas: o Início e a prévia dele usam 1);
//   2. com zoom a foto continua a COBRIR a moldura — nunca faixa vazia, nunca a borda à mostra —, e
//      zoom abaixo de 1 não existe (o "−" para em "cobre por completo");
//   3. o zoom aproxima em torno do rosto (terço de cima, no centro);
//   4. foto × figurinha: quem diz é o motor (`figurinha_ativa`); a foto do Google em avatar_url não é
//      figurinha — a conta antiga (foto_url ≠ avatar_url) só vale sem o campo.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enquadrarFotoComum, mostraFigurinha } from '../../src/utils/figurinhaCanvas.js';

// A conta de antes da Rodada 28, copiada de propósito: zoom 1 tem de dar isto, ao pixel.
function contaAntiga({ W, H, nw, nh }) {
  const escala = Math.max(W / nw, H / nh);
  const dw = nw * escala;
  const dh = nh * escala;
  return { dx: (W - dw) / 2, dy: dh > H ? 0 : (H - dh) / 2, dw, dh };
}

const CASOS = [
  { nome: 'recorte 2:3 no card 2:3', W: 400, H: 600, nw: 1066, nh: 1600 },
  { nome: 'foto quadrada (Google) no card 2:3', W: 400, H: 600, nw: 96, nh: 96 },
  { nome: 'recorte 2:3 no cromo quadrado do Início', W: 600, H: 600, nw: 1066, nh: 1600 },
  { nome: 'foto larga no card 2:3', W: 400, H: 600, nw: 1600, nh: 900 },
];

test('zoom 1 é a conta de sempre (o enquadramento salvo manda em todas as telas)', () => {
  for (const c of CASOS) {
    assert.deepEqual(enquadrarFotoComum({ ...c, zoom: 1 }), contaAntiga(c), c.nome);
    assert.deepEqual(enquadrarFotoComum(c), contaAntiga(c), `${c.nome} (sem zoom)`);
  }
});

test('com zoom a foto sempre cobre a moldura; abaixo de 1 não existe', () => {
  for (const c of CASOS) {
    for (const zoom of [0.5, 0.9, 1, 1.1, 1.2, 1.3, 1.4]) {
      const { dx, dy, dw, dh } = enquadrarFotoComum({ ...c, zoom });
      const eps = 1e-9;
      assert.ok(dx <= eps && dy <= eps, `${c.nome} @${zoom}: borda da foto à mostra em cima/esquerda (${dx}, ${dy})`);
      assert.ok(dx + dw >= c.W - eps && dy + dh >= c.H - eps, `${c.nome} @${zoom}: faixa vazia embaixo/direita`);
    }
    assert.deepEqual(enquadrarFotoComum({ ...c, zoom: 0.6 }), contaAntiga(c), `${c.nome}: zoom < 1 tem de parar em 1`);
  }
});

test('o zoom aproxima em torno do rosto (terço de cima, no centro)', () => {
  const c = CASOS[0];
  const ancora = { x: c.W / 2, y: c.H / 3 };
  const base = enquadrarFotoComum({ ...c, zoom: 1 });
  const u = (ancora.x - base.dx) / base.dw;
  const v = (ancora.y - base.dy) / base.dh;
  for (const zoom of [1.1, 1.2, 1.4]) {
    const r = enquadrarFotoComum({ ...c, zoom });
    assert.ok(Math.abs(r.dx + u * r.dw - ancora.x) < 1e-6, `@${zoom}: o rosto andou na horizontal`);
    assert.ok(Math.abs(r.dy + v * r.dh - ancora.y) < 1e-6, `@${zoom}: o rosto andou na vertical`);
    assert.ok(r.dw > base.dw, 'zoom tem de aproximar');
  }
});

test('foto × figurinha: o motor decide; a foto do Google não é figurinha', () => {
  const foto = 'https://motor/api/media/foto';
  const google = 'https://lh3.googleusercontent.com/a/x=s96-c';
  assert.equal(mostraFigurinha({ foto_url: foto, avatar_url: google, figurinha_ativa: false }), false, 'foto do Google virou figurinha');
  assert.equal(mostraFigurinha({ foto_url: foto, avatar_url: 'https://motor/api/media/ai', figurinha_ativa: true }), true);
  assert.equal(mostraFigurinha({ foto_url: foto, avatar_url: foto, figurinha_ativa: true }), true, 'o campo do motor manda, sem comparar URL');
  // Resposta guardada de antes da Rodada 28, sem o campo: vale a conta antiga até o /api/me fresco.
  assert.equal(mostraFigurinha({ foto_url: foto, avatar_url: 'outra' }), true);
  assert.equal(mostraFigurinha({ foto_url: foto, avatar_url: foto }), false);
  assert.equal(mostraFigurinha(null), false);
});
