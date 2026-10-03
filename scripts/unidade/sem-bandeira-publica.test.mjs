// Futty v2.0 — Rodada 29K, achado 113: a bandeira 🇧🇷 solta no topo da página pública do sorteio
// não fazia nada de útil — era o SeletorIdiomaDiscreto, que o resto do app esconde atrás de
// MOSTRAR_IDIOMA (lib/i18n.js, i18n incompleto: trocar só muda o rótulo do próprio seletor). As
// páginas públicas (sorteio e campeonato) iam por fora dessa regra; agora não vão mais.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (p) => fs.readFileSync(`${raiz}${p}`, 'utf8');

test('achado 113: nenhuma página pública usa mais o SeletorIdiomaDiscreto (a bandeira solta)', () => {
  for (const pagina of ['src/pages/SorteioPublico.jsx', 'src/pages/CampeonatoPublico.jsx']) {
    assert.doesNotMatch(ler(pagina), /SeletorIdiomaDiscreto/, pagina);
  }
});

test('achado 113: o componente ficou órfão e foi removido (mesma lei do item 2: sem lixo no app)', () => {
  assert.equal(fs.existsSync(`${raiz}src/components/SeletorIdiomaDiscreto.jsx`), false);
});
