// Futty v2.0 — Rodada 29A (D): o enquadramento do avatar pequeno (src/lib/enquadroAvatar.js).
// Figurinha de IA (`-ai-` no nome do arquivo) → topo; foto crua do card grátis → 50% 35%; o que não dá para
// ler (genérico, silhueta, token ilegível) → topo, como sempre foi. A URL chega pelo proxy
// (`/api/media/<base64url(JSON {b,p})>.<assinatura>`), por isso o teste monta tokens iguais aos do motor.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENQUADRO_FIGURINHA, ENQUADRO_FOTO, avatarQuadrado, enquadroAvatar, tipoDoAvatar } from '../../src/lib/enquadroAvatar.js';

const UID = '3f2a9c1e-5b7d-4e21-9a10-0c6d8b2f4a77';
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const proxy = (bucket, caminho, extra = '') => `https://futty-api.example/api/media/${b64url({ b: bucket, p: caminho, e: 1790000000 })}.assinaturaQualquer${extra}`;

test('figurinha de IA (caminho com -ai-) → topo', () => {
  const url = proxy('avatars', `public/${UID}-ai-dark-gold-1790000000000.png`, '?v=1&w=128&sq=1');
  assert.equal(tipoDoAvatar(url), 'figurinha');
  assert.equal(enquadroAvatar(url), 'top');
  assert.equal(avatarQuadrado(url), true);
});

test('figurinha antiga (-ai-<kit> sem carimbo) também é figurinha', () => {
  assert.equal(enquadroAvatar(proxy('avatars', `public/${UID}-ai-dark-purple`)), ENQUADRO_FIGURINHA);
});

test('foto crua do card grátis (sem -ai-) → 50% 35%, e sem o quadrado do topo do motor', () => {
  const url = proxy('avatars', `public/${UID}-1790000000000.jpg`, '?w=128');
  assert.equal(tipoDoAvatar(url), 'foto');
  assert.equal(enquadroAvatar(url), ENQUADRO_FOTO);
  assert.equal(ENQUADRO_FOTO, '50% 35%');
  assert.equal(avatarQuadrado(url), false);
});

test('URL pública do Supabase Storage segue a mesma regra', () => {
  const base = 'https://ref.supabase.co/storage/v1/object/public/avatars/public';
  assert.equal(enquadroAvatar(`${base}/${UID}-ai-dark-gold-1.png?v=2`), 'top');
  assert.equal(enquadroAvatar(`${base}/${UID}-1.jpg?v=2`), '50% 35%');
});

test('foto do Google, preview local (blob:) e data: são foto crua', () => {
  assert.equal(enquadroAvatar('https://lh3.googleusercontent.com/a/abc=s96-c'), ENQUADRO_FOTO);
  assert.equal(enquadroAvatar('blob:http://localhost:5173/1234-abcd'), ENQUADRO_FOTO);
  assert.equal(enquadroAvatar('data:image/png;base64,AAAA'), ENQUADRO_FOTO);
});

test('genérico, silhueta do bucket kits, token ilegível e vazio seguem no topo (nada muda para eles)', () => {
  assert.equal(enquadroAvatar('/avatares/genericos/azul.webp'), 'top');
  assert.equal(enquadroAvatar('https://futtyapp.com.br/avatares/genericos/verde.webp'), 'top');
  assert.equal(enquadroAvatar(proxy('kits', 'silhuetas/azul.png')), 'top');
  assert.equal(enquadroAvatar('https://futty-api.example/api/media/lixo.sig'), 'top');
  assert.equal(enquadroAvatar('https://x/api/media/'), 'top');
  assert.equal(enquadroAvatar(''), 'top');
  assert.equal(enquadroAvatar(null), 'top');
  assert.equal(enquadroAvatar(undefined), 'top');
});

test('o recorte guardado pela pessoa, quando existe, manda sobre a regra', () => {
  const figurinha = proxy('avatars', `public/${UID}-ai-dark-gold-1.png`);
  const foto = proxy('avatars', `public/${UID}-1.jpg`);
  assert.equal(enquadroAvatar(figurinha, { recorte: '50% 20%' }), '50% 20%');
  assert.equal(enquadroAvatar(foto, { recorte: '40% 10%' }), '40% 10%');
  assert.equal(enquadroAvatar(foto, { recorte: null }), ENQUADRO_FOTO);
});

test('o nome UUID nunca contém -ai- por acaso (hex não tem "i")', () => {
  assert.equal(enquadroAvatar(proxy('avatars', `public/${UID}-99.png`)), ENQUADRO_FOTO);
});
