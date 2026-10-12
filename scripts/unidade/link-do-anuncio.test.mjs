// Futty v2.0 — varredura de segurança antes da estreia: o toque num anúncio só abre http(s) (src/utils/linkDoAnuncio.js).
// A campanha é gravada no Gabinete com um "Link" de texto livre; `javascript:` e companhia nunca chegam ao window.open.
// Puro: sem navegador, sem rede.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { linkDoAnuncio } from '../../src/utils/linkDoAnuncio.js';

const SITE = 'https://futtyapp.com.br';

test('linkDoAnuncio: endereço http(s) abre, com o href normalizado', () => {
  assert.equal(linkDoAnuncio('https://loja.exemplo.com/oferta?x=1', SITE), 'https://loja.exemplo.com/oferta?x=1');
  assert.equal(linkDoAnuncio('http://loja.exemplo.com', SITE), 'http://loja.exemplo.com/');
  assert.equal(linkDoAnuncio('  https://loja.exemplo.com/oferta  ', SITE), 'https://loja.exemplo.com/oferta', 'espaço em volta (texto colado) não derruba o link');
});

test('linkDoAnuncio: caminho do próprio app resolve contra o site', () => {
  assert.equal(linkDoAnuncio('/planos', SITE), 'https://futtyapp.com.br/planos');
  assert.equal(linkDoAnuncio('/planos', 'https://dev.futty.pages.dev'), 'https://dev.futty.pages.dev/planos');
});

test('linkDoAnuncio: javascript:, data:, vbscript:, file: e blob: nunca abrem (maiúsculas, espaço e quebra de linha na frente não enganam)', () => {
  const perigosos = [
    'javascript:alert(1)', 'JaVaScRiPt:alert(1)', '  javascript:alert(1)', '\tjavascript:alert(1)', 'java\nscript:alert(1)', 'javascript://%0aalert(1)',
    'data:text/html,<script>alert(1)</script>', 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==', 'vbscript:msgbox(1)', 'file:///etc/passwd',
    'blob:https://futtyapp.com.br/abc', 'ftp://exemplo.com/x', 'intent://scan/#Intent;scheme=zxing;end', 'capacitor://localhost/x',
  ];
  for (const p of perigosos) assert.equal(linkDoAnuncio(p, SITE), null, `abriria: ${JSON.stringify(p)}`);
});

test('linkDoAnuncio: sem link, vazio ou de outro tipo devolve null (e nunca lança)', () => {
  for (const v of [undefined, null, '', '   ', 42, {}, [], true, () => {}]) assert.equal(linkDoAnuncio(v, SITE), null);
});

test('os dois lugares que abrem o link do anúncio passam por linkDoAnuncio — nenhum window.open(ad.link) cru', () => {
  const raiz = fileURLToPath(new URL('../../', import.meta.url));
  for (const arquivo of ['src/components/AdCard.jsx', 'src/components/CerimoniaSorteio.jsx']) {
    const fonte = fs.readFileSync(`${raiz}${arquivo}`, 'utf8');
    assert.match(fonte, /linkDoAnuncio\(ad\.link\)/, `${arquivo}: o toque no anúncio tem de usar linkDoAnuncio`);
    assert.doesNotMatch(fonte, /window\.open\(ad\.link/, `${arquivo}: window.open(ad.link…) cru`);
  }
});
