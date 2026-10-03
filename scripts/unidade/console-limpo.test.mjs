// Futty v2.0 — Rodada 29K, item 3: FuttyLoader.jsx escrevia no console de TODO utilizador uma
// anotação de oficina ("[FUTTY_BUILD] loader-ouro-v3 (branco morto: halo/pincel só ouro…)").
// O "[Futty] build: …" do main.jsx FICA — esse serve para diagnóstico e não expõe nada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (p) => fs.readFileSync(`${raiz}${p}`, 'utf8');

test('item 3 (29K): FuttyLoader.jsx não escreve mais no console (nota de oficina removida)', () => {
  assert.doesNotMatch(ler('src/components/FuttyLoader.jsx'), /console\.log|FUTTY_BUILD|loader-ouro-v3/);
});

test('o "[Futty] build: …" do main.jsx fica — é diagnóstico, não expõe nada', () => {
  assert.match(ler('src/main.jsx'), /console\.log\(`\[Futty\] build: \$\{FUTTY_BUILD\}`\)/);
});
