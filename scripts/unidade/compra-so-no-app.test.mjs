// Futty v2.0 — Rodada 29K, achado 110: no site (futtyapp.com.br), a tela FIGURINHAS (Planos.jsx)
// mostra os produtos sem preço e sem "Comprar" — certo, o preço é da loja (RevenueCat) e só existe
// no app nativo —, mas sem explicar por quê. Falta a linha, e sem "em breve" (lei da casa).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const planos = fs.readFileSync(`${raiz}src/pages/Planos.jsx`, 'utf8');

test('achado 110: a tela FIGURINHAS diz que a compra é só no app, pela App Store ou Google Play', () => {
  assert.match(planos, /A compra só acontece no app, pela App Store ou pelo Google Play\./);
  // A linha só aparece fora do app nativo (!ehNativo()) — dentro do app nativo a loja já vende de verdade.
  assert.match(planos, /\{!ehNativo\(\) \? \(/);
});

test('achado 110: nada de "em breve" (lei da casa) na linha nova', () => {
  const linha = planos.match(/A compra só acontece no app[^<]*\./)?.[0] || '';
  assert.ok(linha, 'a linha tem de existir para o teste fazer sentido');
  assert.doesNotMatch(linha, /em breve/i);
});
