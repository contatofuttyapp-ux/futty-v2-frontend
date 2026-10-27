// Futty v2.0 — a resposta de presença que o motor recusa diz o porquê (Rodada 30E, item 3; frases da 32H).
//
// Um erro COM `status` (resposta de verdade do motor) mostra a mensagem dele ("A lista deste jogo já fechou." não manda tentar de novo);
// sem `status` (o fetch nem voltou) fica a frase genérica, que manda tentar de novo — ali é verdade.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { responderComOtimismo, MSG_FALHA_RSVP } from '../../src/lib/rsvp.js';

function erroDoMotor(mensagem, status = 400) {
  const e = new Error(mensagem);
  e.status = status;
  return e;
}

test('409 com mensagem do motor: a tela mostra a mensagem dele ("A lista deste jogo já fechou."), não a frase genérica', async () => {
  const r = await responderComOtimismo({
    gameId: 'jogo-1', status: 'confirmado', anterior: null, aplicar: () => {},
    enviar: async () => { throw erroDoMotor('A lista deste jogo já fechou.', 409); },
  });
  assert.deepEqual(r, { ok: false, erro: 'A lista deste jogo já fechou.' });
});

test('qualquer erro do motor com status mostra a mensagem dele', async () => {
  const r = await responderComOtimismo({
    gameId: 'jogo-1', status: 'confirmado', anterior: null, aplicar: () => {},
    enviar: async () => { throw erroDoMotor('Você não foi chamado para este jogo.', 403); },
  });
  assert.equal(r.erro, 'Você não foi chamado para este jogo.');
});

test('erro de REDE (sem status: o fetch nem voltou) continua com a frase genérica', async () => {
  const semStatus = new Error('Failed to fetch'); // apiFetch só põe `.status` numa resposta de verdade do motor
  const r = await responderComOtimismo({
    gameId: 'jogo-1', status: 'confirmado', anterior: null, aplicar: () => {}, enviar: async () => { throw semStatus; },
  });
  assert.deepEqual(r, { ok: false, erro: MSG_FALHA_RSVP });
});

test('erro com status mas sem mensagem (corpo vazio) ainda cai na frase genérica, nunca em branco', async () => {
  const r = await responderComOtimismo({
    gameId: 'jogo-1', status: 'confirmado', anterior: null, aplicar: () => {},
    enviar: async () => { const e = new Error(''); e.status = 500; throw e; },
  });
  assert.equal(r.erro, MSG_FALHA_RSVP);
});
