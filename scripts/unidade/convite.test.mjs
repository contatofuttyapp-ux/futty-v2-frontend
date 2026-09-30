// Futty v2.0 — Rodada 29B (A): o que a página do convite escreve (src/utils/convite.js) e o bilhete do convite pendente
// (src/lib/convitePendente.js). Puro: sem navegador, sem rede.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataCurta, fatosDoConvite, fraseDoConvite } from '../../src/utils/convite.js';
import { guardarConvitePendente, tomarConvitePendente } from '../../src/lib/convitePendente.js';

const SP = 'America/Sao_Paulo';
const AGORA = new Date('2026-10-01T15:00:00Z'); // quinta-feira, 12h em São Paulo
const opc = { agora: AGORA, fuso: SP };

test('dataCurta: hoje, amanhã e "dia da semana, dia mês" — sempre no fuso de quem olha', () => {
  assert.equal(dataCurta('2026-10-01T23:00:00Z', opc), 'hoje');
  assert.equal(dataCurta('2026-10-02T23:00:00Z', opc), 'amanhã');
  assert.equal(dataCurta('2026-10-03T22:00:00Z', opc), 'sáb, 3 out');
  assert.equal(dataCurta('2026-12-25T15:00:00Z', opc), 'sex, 25 dez');
  // 23h30 de quinta em São Paulo já é sexta em UTC: o dia é o de quem olha, não o do servidor.
  assert.equal(dataCurta('2026-10-02T02:30:00Z', opc), 'hoje');
  assert.equal(dataCurta('2026-10-02T02:30:00Z', { agora: AGORA, fuso: 'UTC' }), 'amanhã');
});

test('dataCurta: sem data ou com data quebrada devolve null (nunca "Invalid Date" na tela)', () => {
  assert.equal(dataCurta(null, opc), null);
  assert.equal(dataCurta('', opc), null);
  assert.equal(dataCurta('ontem à noite', opc), null);
});

test('fatosDoConvite: jogadores, próximo jogo e cidade — só o que existe', () => {
  const cheio = { membros: 21, proximoJogo: '2026-10-03T22:00:00Z', cidade: 'Belo Horizonte' };
  assert.deepEqual(fatosDoConvite(cheio, opc), [
    { chave: 'membros', texto: '21 jogadores' },
    { chave: 'jogo', texto: 'Próximo jogo sáb, 3 out' },
    { chave: 'cidade', texto: 'Belo Horizonte' },
  ]);
  assert.deepEqual(fatosDoConvite({ ...cheio, proximoJogo: '2026-10-01T23:00:00Z' }, opc)[1], { chave: 'jogo', texto: 'Próximo jogo hoje' });
});

test('fatosDoConvite: singular, e sem jogo marcado nem cidade sobra um fato só, sem buraco', () => {
  assert.deepEqual(fatosDoConvite({ membros: 1, proximoJogo: null, cidade: null }, opc), [{ chave: 'membros', texto: '1 jogador' }]);
  assert.deepEqual(fatosDoConvite({ membros: 7, cidade: '   ' }, opc), [{ chave: 'membros', texto: '7 jogadores' }]);
});

test('fatosDoConvite: motor antigo (sem os campos novos) ou contagem zero não inventa fato', () => {
  assert.deepEqual(fatosDoConvite({}, opc), []);
  assert.deepEqual(fatosDoConvite(null, opc), []);
  assert.deepEqual(fatosDoConvite({ membros: 0 }, opc), []);
});

test('fraseDoConvite: "Tonhão te convidou para o Várzea FC"; sem saber quem convidou, "Você foi convidado…"', () => {
  assert.equal(fraseDoConvite({ convidadoPor: 'Tonhão', nomeTime: 'Várzea FC' }), 'Tonhão te convidou para o Várzea FC');
  assert.equal(fraseDoConvite({ convidadoPor: null, nomeTime: 'Várzea FC' }), 'Você foi convidado para o Várzea FC');
  assert.equal(fraseDoConvite({ convidadoPor: '  ', nomeTime: 'Várzea FC' }), 'Você foi convidado para o Várzea FC');
});

// ─── o bilhete do convite pendente ────────────────────────────────────────────────────────────────
function comArmazenamento(fn) {
  const guardado = new Map();
  globalThis.localStorage = {
    getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
    setItem: (k, v) => { guardado.set(k, String(v)); },
    removeItem: (k) => { guardado.delete(k); },
  };
  try { fn(guardado); } finally { delete globalThis.localStorage; }
}

test('convite pendente: guarda, devolve UMA vez e apaga', () => {
  comArmazenamento((guardado) => {
    guardarConvitePendente('abc-123');
    assert.equal(guardado.size, 1);
    assert.equal(tomarConvitePendente(), 'abc-123');
    assert.equal(guardado.size, 0, 'depois de tomado, o bilhete some');
    assert.equal(tomarConvitePendente(), null, 'segunda vez não há nada');
  });
});

test('convite pendente: passou de dois dias não vale (e também é apagado)', () => {
  comArmazenamento((guardado) => {
    const t0 = 1_000_000;
    guardarConvitePendente('velho', t0);
    assert.equal(tomarConvitePendente(t0 + 2 * 86400000 + 1), null);
    assert.equal(guardado.size, 0);
    guardarConvitePendente('fresco', t0);
    assert.equal(tomarConvitePendente(t0 + 86400000), 'fresco');
  });
});

test('convite pendente: sem armazenamento (modo privado) ou lixo no lugar nunca quebra', () => {
  assert.doesNotThrow(() => guardarConvitePendente('x'));
  assert.equal(tomarConvitePendente(), null);
  comArmazenamento((guardado) => {
    guardado.set('futty_convite_pendente', '{não é json');
    assert.equal(tomarConvitePendente(), null);
    guardarConvitePendente('');
    assert.equal(guardado.size, 0, 'token vazio não guarda nada');
  });
});
