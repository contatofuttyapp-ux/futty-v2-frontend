// Futty v2.0 — a CSP e os cabeçalhos do site (public/_headers), travados por teste.
//
// A cena rodada29a-csp só enxerga a violação que o rig local produz, e o rig local serve a mídia pelo próprio servidor:
// a violação real da 29A (13 imagens de /api/media/… do Cloud Run no img-src) só aparece no ar (dev.futty.pages.dev).
// Por isso a regra fica escrita aqui: o que o site fala de fora, a política TEM de listar. Ela BLOQUEIA (Content-Security-Policy, depois
// de uma semana em Report-Only sem nenhum aviso) e cada bloqueio continua indo para o motor (POST /api/csp), que o escreve no log.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// A cópia de trabalho pode estar em CRLF (autocrlf no Windows); o teste lê sempre em LF.
const TEXTO = readFileSync(new URL('../../public/_headers', import.meta.url), 'utf8').split('\r\n').join('\n');
const MOTOR = 'https://futty-api-685039278359.southamerica-east1.run.app';
const SUPABASE = 'https://ynzmjcvqdljffgbeqglh.supabase.co';

/** O bloco `/*` do _headers: { nome: valor }. */
function blocoGeral() {
  const linhas = TEXTO.split(/\r?\n/);
  const i = linhas.findIndex((l) => l.trim() === '/*');
  assert.ok(i >= 0, 'public/_headers sem o bloco /*');
  const cab = {};
  for (const l of linhas.slice(i + 1)) {
    if (!/^\s+\S/.test(l)) break;
    const k = l.indexOf(':');
    cab[l.slice(0, k).trim()] = l.slice(k + 1).trim();
  }
  return cab;
}
/** As diretivas da CSP: { 'img-src': ['self', 'data:', …] }. */
function diretivas(csp) {
  return Object.fromEntries(csp.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
    const [nome, ...valores] = d.split(/\s+/);
    return [nome, valores.map((v) => v.replace(/^'|'$/g, ''))];
  }));
}

const CSP = blocoGeral()['Content-Security-Policy'];
const D = diretivas(CSP || '');

test('a CSP é de BLOQUEIO (Content-Security-Policy) e não há mais a cópia só-aviso (Report-Only)', () => {
  assert.ok(CSP, 'bloco /* sem Content-Security-Policy');
  assert.equal(blocoGeral()['Content-Security-Policy-Report-Only'], undefined, 'duas políticas ao mesmo tempo: a só-aviso sobrou');
  assert.ok(!/Content-Security-Policy-Report-Only:/.test(TEXTO), 'Report-Only em outro bloco do _headers');
});

test('o relatório continua: report-uri e report-to mandam cada bloqueio para POST /api/csp do motor', () => {
  assert.deepEqual(D['report-uri'], [`${MOTOR}/api/csp`]);
  assert.deepEqual(D['report-to'], ['csp']);
  assert.equal(blocoGeral()['Reporting-Endpoints'], `csp="${MOTOR}/api/csp"`);
});

test('os scripts que outros injetam passam (o beacon da Cloudflare e o pcm.js do navegador do Instagram), e só eles', () => {
  // Quem injeta e por quê está no comentário do _headers. O script-src é EXATAMENTE este: qualquer origem nova é decisão, não acidente.
  assert.deepEqual(D['script-src'], ['self', 'https://static.cloudflareinsights.com', 'https://connect.facebook.net']);
  for (const origem of ['https://cloudflareinsights.com', 'https://www.facebook.com']) assert.ok(D['connect-src'].includes(origem), `connect-src sem ${origem}`);
  assert.ok(D['img-src'].includes('https://www.facebook.com'), 'img-src sem https://www.facebook.com (o pixel 1×1 da Meta)');
});

test('o script-src continua negando o resto: nada de curinga, de "https:" inteiro, de inline/eval nem de uma origem qualquer', () => {
  for (const proibido of ['*', 'https:', 'http:', 'unsafe-inline', 'unsafe-eval', 'https://exemplo.invalid']) {
    assert.ok(!D['script-src'].includes(proibido), `script-src deixa passar ${proibido}`);
  }
  assert.ok(D['script-src'].every((v) => v === 'self' || /^https:\/\/[a-z0-9.-]+$/.test(v)), `script-src com origem larga demais: ${D['script-src'].join(' ')}`);
});

test('img-src lista o motor (as fotos vêm de /api/media/ no Cloud Run), o Supabase e o próprio site', () => {
  for (const origem of [MOTOR, SUPABASE, 'https://futtyapp.com.br', 'self', 'data:', 'blob:']) assert.ok(D['img-src'].includes(origem), `img-src sem ${origem}`);
});

test('connect-src lista o motor, o Supabase, o site e o ingest do Sentry (padrão, us e de)', () => {
  for (const origem of [MOTOR, SUPABASE, 'https://futtyapp.com.br', 'self', 'https://*.ingest.sentry.io', 'https://*.ingest.us.sentry.io', 'https://*.ingest.de.sentry.io']) {
    assert.ok(D['connect-src'].includes(origem), `connect-src sem ${origem}`);
  }
});

test('o resto da política continua como a 29A deixou (default-src, style-src, font-src e frame-ancestors)', () => {
  assert.deepEqual(D['default-src'], ['self']);
  assert.deepEqual(D['font-src'], ['self']);
  assert.deepEqual(D['frame-ancestors'], ['none']);
  assert.ok(D['style-src'].includes('self') && D['style-src'].includes('unsafe-inline'));
});

test('os outros cabeçalhos de segurança do site seguem no bloco /*', () => {
  const g = blocoGeral();
  assert.match(g['Strict-Transport-Security'], /max-age=31536000/);
  assert.equal(g['X-Frame-Options'], 'SAMEORIGIN');
  assert.match(g['Permissions-Policy'], /camera=\(self\)/);
  assert.equal(g['Referrer-Policy'], 'strict-origin-when-cross-origin');
});

test('o CORS "*" da raiz NÃO vem de regra nossa (é o padrão da Cloudflare Pages); só a mídia o diz de forma explícita', () => {
  assert.equal(blocoGeral()['Access-Control-Allow-Origin'], undefined);
  for (const rota of ['/avatares/*', '/sorteio-assets/*', '/sons/*', '/fonts/*', '/dados/*']) {
    const i = TEXTO.indexOf(`\n${rota}\n`);
    assert.ok(i >= 0, `sem a regra de ${rota}`);
    assert.match(TEXTO.slice(i, i + 200), /Access-Control-Allow-Origin: \*/, `${rota} sem CORS (o app nativo busca daqui)`);
  }
});
