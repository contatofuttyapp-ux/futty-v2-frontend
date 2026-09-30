// Futty v2.0 — Rodada 29A (H): o logo do time na criação (src/utils/logoTime.js).
// O motor é quem modera; o app só barra o que o motor barraria de qualquer jeito (tipo e 2 MB) e escreve o aviso.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOGO_MAX_BYTES, avisoLogoRecusado, motivoDoLogo } from '../../src/utils/logoTime.js';

test('png, jpg e webp até 2 MB servem; sem arquivo não há o que barrar', () => {
  for (const type of ['image/png', 'image/jpeg', 'image/webp']) assert.equal(motivoDoLogo({ type, size: 1000 }), null, type);
  assert.equal(motivoDoLogo({ type: 'image/png', size: LOGO_MAX_BYTES }), null, 'exatamente 2 MB ainda vale');
  assert.equal(motivoDoLogo(null), null);
});

test('outro tipo de imagem e arquivo acima de 2 MB são barrados com o motivo em português', () => {
  assert.equal(motivoDoLogo({ type: 'image/gif', size: 10 }), 'Use uma imagem PNG, JPG ou WEBP.');
  assert.equal(motivoDoLogo({ type: 'application/pdf', size: 10 }), 'Use uma imagem PNG, JPG ou WEBP.');
  assert.equal(motivoDoLogo({ type: 'image/png', size: LOGO_MAX_BYTES + 1 }), 'O logo pode ter no máximo 2 MB.');
});

test('aviso da moderação: "Logo não aceito: <motivo>. Você pode tentar outro no painel do time."', () => {
  assert.equal(
    avisoLogoRecusado('Imagem não permitida.'),
    'Logo não aceito: Imagem não permitida. Você pode tentar outro no painel do time.',
  );
  assert.equal(avisoLogoRecusado('Arquivo inválido'), 'Logo não aceito: Arquivo inválido. Você pode tentar outro no painel do time.');
  assert.equal(avisoLogoRecusado(''), 'Logo não aceito: não deu para enviar agora. Você pode tentar outro no painel do time.');
  assert.equal(avisoLogoRecusado(undefined), 'Logo não aceito: não deu para enviar agora. Você pode tentar outro no painel do time.');
});
