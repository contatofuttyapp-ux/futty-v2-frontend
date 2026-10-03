// Futty v2.0 — Rodada 29J, achado 119: "★ -" no Elenco, "--" no Início e no Perfil, "—" na
// vitrine — quatro formas para "ainda sem nota". Uma só: SEM_NOTA_AINDA ("sem nota ainda").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SEM_NOTA_AINDA, formatRating } from '../../src/utils/format.js';

test('formatRating: sem voto nenhum (null, undefined, 0, negativo) devolve SEM_NOTA_AINDA; com voto, 2 casas', () => {
  assert.equal(SEM_NOTA_AINDA, 'sem nota ainda');
  for (const v of [null, undefined, 0, -1]) assert.equal(formatRating(v), SEM_NOTA_AINDA, String(v));
  assert.equal(formatRating(8), '8.00');
  assert.equal(formatRating(7.5), '7.50');
});

test('achado 119: nenhum "--" nem "★ -" nem "—" solto para nota, nas quatro telas — todas usam SEM_NOTA_AINDA', () => {
  const raiz = fileURLToPath(new URL('../../', import.meta.url));
  const ler = (p) => fs.readFileSync(`${raiz}${p}`, 'utf8');

  assert.doesNotMatch(ler('src/pages/Inicio.jsx'), /formatRating\(stats\.nota\) : '--'/);
  assert.doesNotMatch(ler('src/pages/MeuPerfil.jsx'), /formatRating\(stats\.nota\) : '--'/);
  assert.doesNotMatch(ler('src/pages/AdminPanel.jsx'), /★ \{m\.nota_media == null \? '-'/);

  const vitrine = ler('src/pages/JogadorPerfil.jsx');
  assert.doesNotMatch(vitrine, /notaShow\.toFixed\(1\) : '--'/);
  assert.doesNotMatch(vitrine, /jogador\.posicao != null \? <>Top .* : '—'/);
  assert.match(vitrine, /Sem nota ainda/, 'a vitrine continua com a forma boa, agora reusada em cima');
});
