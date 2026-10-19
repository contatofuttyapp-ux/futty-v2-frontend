// Futty v2.0 — Rodada 29J, achado 119: "★ -" no Elenco, "--" no Início e no Perfil, "—" na
// vitrine — quatro formas para "ainda sem nota". Uma só: SEM_NOTA ("sem nota"; a régua de 0 a 10 trocou o "sem nota ainda").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SEM_NOTA, formatRating } from '../../src/utils/format.js';
import { lerPagina } from './_fonteDaPagina.mjs';

test('formatRating: ninguém votou (null, undefined, vazio, negativo) devolve SEM_NOTA; o 0 é nota; com voto, vírgula e casa só se precisar', () => {
  assert.equal(SEM_NOTA, 'sem nota');
  for (const v of [null, undefined, '', -1, 'abc']) assert.equal(formatRating(v), SEM_NOTA, String(v));
  assert.equal(formatRating(0), '0', 'quem só recebeu zeros tem nota 0');
  assert.equal(formatRating(8), '8');
  assert.equal(formatRating(7.5), '7,5');
  assert.equal(formatRating(9.1), '9,1', 'era "9.10" no Início (achado dos prints de 5-out)');
});

test('achado 119: nenhum "--" nem "★ -" nem "—" solto para nota, nas quatro telas — todas usam SEM_NOTA', () => {
  const raiz = fileURLToPath(new URL('../../', import.meta.url));
  const ler = (p) => fs.readFileSync(`${raiz}${p}`, 'utf8');

  assert.doesNotMatch(lerPagina('Inicio'), /formatRating\(stats\.nota\) : '--'/);
  assert.doesNotMatch(ler('src/pages/MeuPerfil.jsx'), /formatRating\(stats\.nota\) : '--'/);
  assert.doesNotMatch(lerPagina('AdminPanel'), /★ \{m\.nota_media == null \? '-'/);

  const vitrine = ler('src/pages/JogadorPerfil.jsx');
  assert.doesNotMatch(vitrine, /notaShow\.toFixed\(1\) : '--'/);
  assert.doesNotMatch(vitrine, /jogador\.posicao != null \? <>Top .* : '—'/);
  assert.match(vitrine, /Sem nota</, 'a vitrine diz "Sem nota", em cima e no anel');
  assert.doesNotMatch(vitrine, /Sem nota ainda/);
});
