// Futty v2.0 — Rodada 29B (bloco 3, C): links que abrem no app (src/lib/linkDoSite.js).
//
// Dois assuntos:
//   1. o parser: só https + futtyapp.com.br + /convite/, /c/ (o link curto do convite, 29H) ou /equipa/ vira caminho do roteador; o resto
//      é null (e o app não navega) — /jogo/ saiu na 29H: o app não tem essa rota (o jogo mora em /time/<slug>/jogo/<id>);
//   2. a COERÊNCIA entre os quatro lugares que falam do mesmo domínio e caminhos — o arquivo do iOS (AASA), o do Android (assetlinks.json
//      + o intent-filter do manifesto), o entitlement do iOS e o parser. Se um deles divergir, o link abre no navegador em vez do app
//      (ou o app abre numa tela que o site nunca abriria) e ninguém vê erro nenhum: é o tipo de defeito que só o teste aponta.
//
// O teste real (tocar num link no WhatsApp e o app abrir) é no build 34 (iPhone) / 16 (Android).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HOST_DO_SITE, PREFIXOS_DE_LINK, caminhoDoLinkDoSite } from '../../src/lib/linkDoSite.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(`${RAIZ}${rel}`, 'utf8');

test('links do site que o app abre: convite (longo e curto) e time (e o que mora nele, o jogo inclusive) — com a query, sem o #', () => {
  assert.equal(caminhoDoLinkDoSite('https://futtyapp.com.br/convite/abc123'), '/convite/abc123');
  assert.equal(caminhoDoLinkDoSite('https://futtyapp.com.br/convite/abc123?origem=zap'), '/convite/abc123?origem=zap');
  assert.equal(caminhoDoLinkDoSite('https://futtyapp.com.br/time/varzea-fc'), '/time/varzea-fc');
  assert.equal(caminhoDoLinkDoSite('https://futtyapp.com.br/time/varzea-fc/jogo/9f1c/sorteio'), '/time/varzea-fc/jogo/9f1c/sorteio');
  // 29I (achado 103): o endereço antigo continua abrindo o app — a rota /equipa/* redireciona para /time/*.
  assert.equal(caminhoDoLinkDoSite('https://futtyapp.com.br/equipa/varzea-fc'), '/equipa/varzea-fc');
  assert.equal(caminhoDoLinkDoSite('https://futtyapp.com.br/c/k7m2p9qx'), '/c/k7m2p9qx', 'o link curto do convite (29H)');
  assert.equal(caminhoDoLinkDoSite('https://futtyapp.com.br/c/k7m2p9qx?origem=zap'), '/c/k7m2p9qx?origem=zap');
  assert.equal(caminhoDoLinkDoSite('https://futtyapp.com.br/convite/abc123#topo'), '/convite/abc123');
  assert.equal(caminhoDoLinkDoSite('https://FUTTYAPP.com.br/convite/abc123'), '/convite/abc123', 'o domínio não diferencia maiúsculas');
});

test('o que NÃO é do app vira null: outro domínio, esquema, caminho ou truque de URL', () => {
  const nao = [
    'http://futtyapp.com.br/convite/abc',                  // sem TLS
    'https://www.futtyapp.com.br/convite/abc',             // o domínio associado é só o da raiz
    'https://futtyapp.com.br.evil.com/convite/abc',        // o nosso é prefixo do domínio de outro
    'https://evil.com/convite/abc',
    'https://futtyapp.com.br@evil.com/convite/abc',        // "usuário@host": o host real é evil.com
    'https://evil.com/?https://futtyapp.com.br/convite/abc',
    'https://futtyapp.com.br/',                            // a raiz abre o app como sempre, sem navegar
    'https://futtyapp.com.br/home',
    'https://futtyapp.com.br/login',
    'https://futtyapp.com.br/convite',                     // sem token
    'https://futtyapp.com.br/convitex/abc',
    'https://futtyapp.com.br/jogo/9f1c',                   // saiu na 29H: não existe /jogo/<id> no app
    'https://futtyapp.com.br/criar-equipa',                // "/c" sem a barra não é o link curto
    'https://futtyapp.com.br/c',
    'https://futtyapp.com.br/c/../home',
    'https://futtyapp.com.br/convite/../home',             // o `..` se resolve para /home
    'https://futtyapp.com.br//evil.com/convite/abc',       // protocolo-relativo disfarçado
    'com.futty.app://auth/callback?code=abc',              // o retorno do Google: outro ramo do ouvinte
    'capacitor://localhost/convite/abc',                   // a origem do próprio WebView
    'https://localhost/convite/abc',
    'javascript:alert(1)',
    '/convite/abc',
    '',
    null,
    undefined,
    42,
  ];
  for (const url of nao) assert.equal(caminhoDoLinkDoSite(url), null, String(url));
});

test('coerência: o AASA do iOS lista o AppID do app e exatamente os prefixos do parser', () => {
  const aasa = JSON.parse(ler('public/.well-known/apple-app-site-association'));
  const detalhes = aasa.applinks.details;
  assert.equal(detalhes.length, 1);
  assert.deepEqual(detalhes[0].appIDs, ['M4ZMC5ZX8T.com.futty.app']);
  assert.deepEqual(detalhes[0].components.map((c) => c['/']), PREFIXOS_DE_LINK.map((p) => `${p}*`));
  // O AppID = Team ID + bundle id do projeto do Xcode.
  const pbx = ler('ios/App/App.xcodeproj/project.pbxproj');
  assert.match(pbx, /PRODUCT_BUNDLE_IDENTIFIER = com\.futty\.app;/);
  assert.match(pbx, /DEVELOPMENT_TEAM = M4ZMC5ZX8T;/);
});

test('coerência: o entitlement do iOS associa o domínio do parser', () => {
  const ent = ler('ios/App/App/App.entitlements');
  assert.match(ent, /<key>com\.apple\.developer\.associated-domains<\/key>\s*<array>\s*<string>applinks:futtyapp\.com\.br<\/string>\s*<\/array>/);
  assert.equal(HOST_DO_SITE, 'futtyapp.com.br');
  assert.match(ler('ios/App/App.xcodeproj/project.pbxproj'), /CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;/);
});

test('coerência: o Android — assetlinks.json do pacote certo e intent-filter autoVerify com os mesmos prefixos', () => {
  const links = JSON.parse(ler('public/.well-known/assetlinks.json'));
  assert.equal(links.length, 1);
  assert.deepEqual(links[0].relation, ['delegate_permission/common.handle_all_urls']);
  assert.equal(links[0].target.namespace, 'android_app');
  assert.equal(links[0].target.package_name, 'com.futty.app');
  assert.match(ler('android/app/build.gradle'), /applicationId "com\.futty\.app"/);
  assert.equal(links[0].target.sha256_cert_fingerprints.length, 2, 'as duas impressões: a do app assinado pelo Play e a outra listada na mesma página');
  assert.ok(!links[0].target.sha256_cert_fingerprints.includes('SHA256_DO_PLAY_APP_SIGNING'), 'assetlinks.json ainda tem o texto de exemplo');

  const manifesto = ler('android/app/src/main/AndroidManifest.xml');
  const filtro = manifesto.match(/<intent-filter android:autoVerify="true">[\s\S]*?<\/intent-filter>/);
  assert.ok(filtro, 'falta o intent-filter com android:autoVerify="true"');
  assert.match(filtro[0], /android:name="android\.intent\.action\.VIEW"/);
  assert.match(filtro[0], /android:name="android\.intent\.category\.BROWSABLE"/);
  const dados = [...filtro[0].matchAll(/<data android:scheme="([^"]+)" android:host="([^"]+)" android:pathPrefix="([^"]+)" \/>/g)];
  assert.deepEqual(dados.map((d) => d[1]), PREFIXOS_DE_LINK.map(() => 'https'));
  assert.deepEqual(dados.map((d) => d[2]), PREFIXOS_DE_LINK.map(() => HOST_DO_SITE));
  // O Android escreve "/convite" e "/equipa" sem a barra; o do link curto TEM de levar a barra ("/c" casaria "/criar-equipa").
  assert.deepEqual(dados.map((d) => (d[3].endsWith('/') ? d[3] : `${d[3]}/`)), PREFIXOS_DE_LINK, 'os pathPrefix são os prefixos do parser');
});

test('o site serve o AASA como JSON e o pacote nativo não o leva', () => {
  const headers = ler('public/_headers');
  assert.match(headers, /\/\.well-known\/apple-app-site-association\s*\r?\n\s+Content-Type: application\/json/);
  assert.match(ler('scripts/preparar-nativo.js'), /const REMOVER = \[[^\]]*'\.well-known'/);
});
