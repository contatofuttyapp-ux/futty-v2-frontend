// Futty v2.0 — Rodada 29B (F): o que a tela "Avise-me" decide sozinha (src/utils/aviseMe.js): se o e-mail parece pronto e de
// onde a pessoa veio (utm). O motor valida de novo (backend/tests/avise-me.test.js); aqui só se poupa a ida ao óbvio.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEXTOS_AVISE_ME, emailParecePronto, origemDaUrl } from '../../src/utils/aviseMe.js';

test('e-mail: parece pronto só com algo@dominio.tld, sem espaço', () => {
  for (const ok of ['a@b.co', ' maria.silva+futty@gmail.com ', 'joão@exemplo.com.br']) assert.equal(emailParecePronto(ok), true, ok);
  for (const ruim of ['', '   ', 'maria', 'maria@', '@gmail.com', 'maria@gmail', 'maria@gmail.', 'ma ria@gmail.com', 'a@b@c.com', null, undefined]) {
    assert.equal(emailParecePronto(ruim), false, String(ruim));
  }
});

test('origem: utm_source[:utm_campaign], senão ref, senão o padrão da tela', () => {
  assert.equal(origemDaUrl('?utm_source=instagram&utm_campaign=bio'), 'instagram:bio');
  assert.equal(origemDaUrl('?utm_source=tiktok'), 'tiktok');
  assert.equal(origemDaUrl('?utm_campaign=bio'), 'site', 'campanha sem fonte não diz de onde veio');
  assert.equal(origemDaUrl('?ref=amigo'), 'amigo');
  assert.equal(origemDaUrl('?utm_source=instagram&ref=amigo'), 'instagram', 'utm manda');
  assert.equal(origemDaUrl('', 'avise-me'), 'avise-me');
  assert.equal(origemDaUrl('?x=1', 'site'), 'site');
  assert.equal(origemDaUrl(undefined), 'site');
  assert.equal(origemDaUrl('?utm_source=%20%20'), 'site', 'só espaços não é origem');
});

test('os textos da tela: o pedido do dono, palavra por palavra', () => {
  assert.equal(TEXTOS_AVISE_ME.titulo, 'Quero ser avisado quando o Futty chegar nas lojas');
  assert.equal(TEXTOS_AVISE_ME.sair, 'Você pode sair da lista quando quiser.');
  assert.match(TEXTOS_AVISE_ME.consentimento, /autoriza o Futty a usar seu e-mail só para avisar do lançamento/);
  assert.match(TEXTOS_AVISE_ME.feito, /^Anotado!/);
});
