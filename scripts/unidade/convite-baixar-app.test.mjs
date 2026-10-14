// Futty v2.0 — o convite aberto no navegador do celular manda baixar o app (src/utils/lojaDoApp.js, pages/Convite.jsx).
//
// Três assuntos:
//   1. de qual loja é o aparelho, pelo user agent de navegadores de verdade (Safari e Chrome do iPhone, iPad que se diz Mac, Chrome
//      e Samsung Internet do Android) — e o computador fica de fora (a tela dele não muda);
//   2. os endereços das lojas: o id da App Store e o pacote da Play Store, o mesmo pacote do app;
//   3. a promessa da tela — "toque no link do convite de novo: ele abre direto no app" — só vale se o link longo e o curto do
//      convite continuarem na lista de links que abrem o app, no iOS (AASA) e no Android (manifesto). Se um deles sair, este teste cai.
//
// A tela em si (botões, toque em "Continuar pelo site", computador e app sem mudança) é provada no navegador:
// npm run provar:navegador -- rodada-31m
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LINK_APP_STORE, LINK_PLAY_STORE, lojaDoNavegador, linkDaLoja } from '../../src/utils/lojaDoApp.js';
import { PREFIXOS_DE_LINK, caminhoDoLinkDoSite } from '../../src/lib/linkDoSite.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(`${RAIZ}${rel}`, 'utf8');

const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1',
  ipadAntigo: 'Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1',
  macOuIpad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; SM-A146B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  samsungInternet: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  windowsChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  linuxHeadless: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0.0.0 Safari/537.36',
};

test('iPhone (Safari ou Chrome) e iPad vão à App Store; Android (Chrome ou Samsung) à Play Store', () => {
  assert.equal(lojaDoNavegador({ userAgent: UA.iphoneSafari, maxTouchPoints: 5 }), 'ios');
  assert.equal(lojaDoNavegador({ userAgent: UA.iphoneChrome, maxTouchPoints: 5 }), 'ios');
  assert.equal(lojaDoNavegador({ userAgent: UA.ipadAntigo, maxTouchPoints: 5 }), 'ios');
  assert.equal(lojaDoNavegador({ userAgent: UA.macOuIpad, maxTouchPoints: 5 }), 'ios', 'o iPad com iPadOS 13+ se diz Mac, mas tem toque');
  assert.equal(lojaDoNavegador({ userAgent: UA.androidChrome, maxTouchPoints: 5 }), 'android');
  assert.equal(lojaDoNavegador({ userAgent: UA.samsungInternet, maxTouchPoints: 5 }), 'android');
});

test('computador e aparelho desconhecido: null (a tela do convite fica como sempre)', () => {
  assert.equal(lojaDoNavegador({ userAgent: UA.macOuIpad, maxTouchPoints: 0 }), null, 'o Mac de verdade não tem toque');
  assert.equal(lojaDoNavegador({ userAgent: UA.windowsChrome, maxTouchPoints: 0 }), null);
  assert.equal(lojaDoNavegador({ userAgent: UA.windowsChrome, maxTouchPoints: 10 }), null, 'notebook com tela de toque continua computador');
  assert.equal(lojaDoNavegador({ userAgent: UA.linuxHeadless }), null);
  for (const nada of [null, undefined, {}, { userAgent: '' }, { userAgent: 42 }]) assert.equal(lojaDoNavegador(nada), null, JSON.stringify(nada));
});

test('os endereços das lojas: o id do Futty na App Store e o pacote do app na Play Store', () => {
  assert.equal(LINK_APP_STORE, 'https://apps.apple.com/app/id6811681849');
  assert.equal(LINK_PLAY_STORE, 'https://play.google.com/store/apps/details?id=com.futty.app');
  assert.equal(linkDaLoja('ios'), LINK_APP_STORE);
  assert.equal(linkDaLoja('android'), LINK_PLAY_STORE);
  for (const nada of [null, undefined, '', 'web', 'windows']) assert.equal(linkDaLoja(nada), null, String(nada));
  // O pacote da Play Store é o do app que se instala (o mesmo do Android e do Capacitor).
  const pacote = new URL(LINK_PLAY_STORE).searchParams.get('id');
  assert.match(ler('android/app/build.gradle'), new RegExp(`applicationId "${pacote.replaceAll('.', '\\.')}"`));
  assert.equal(JSON.parse(ler('capacitor.config.json')).appId, pacote);
});

test('"toque no link do convite de novo: ele abre direto no app" — o link longo e o curto abrem o app no iOS e no Android', () => {
  for (const prefixo of ['/convite/', '/c/']) assert.ok(PREFIXOS_DE_LINK.includes(prefixo), `${prefixo} saiu da lista de links que abrem o app`);
  assert.equal(caminhoDoLinkDoSite('https://futtyapp.com.br/c/k7m2p9qx'), '/c/k7m2p9qx');
  assert.equal(caminhoDoLinkDoSite('https://futtyapp.com.br/convite/abc123'), '/convite/abc123');
  const aasa = JSON.parse(ler('public/.well-known/apple-app-site-association'));
  const caminhos = aasa.applinks.details.flatMap((d) => d.components.map((c) => c['/']));
  for (const c of ['/convite/*', '/c/*']) assert.ok(caminhos.includes(c), `o AASA do iOS não tem ${c}`);
  const filtro = ler('android/app/src/main/AndroidManifest.xml').match(/<intent-filter android:autoVerify="true">[\s\S]*?<\/intent-filter>/)?.[0] || '';
  assert.match(filtro, /android:host="futtyapp\.com\.br" android:pathPrefix="\/c\/"/, 'o manifesto do Android não abre /c/ no app');
  assert.match(filtro, /android:host="futtyapp\.com\.br" android:pathPrefix="\/convite"/, 'o manifesto do Android não abre /convite no app');
});
