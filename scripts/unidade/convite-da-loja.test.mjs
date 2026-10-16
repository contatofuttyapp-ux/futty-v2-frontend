// Futty v2.0 — o convite que viaja na instalação pela Play Store (Android).
//
//   1. a página do convite manda à Play Store com "convite=<código>" no referrer (só Android; iPhone e computador como sempre; o /download
//      continua sem referrer);
//   2. a leitura do referrer no app (src/lib/conviteDaLoja.js): só no Android, uma vez por instalação, para um leitor só; referrer sem
//      convite, vazio ou estranho não faz nada; app da loja antigo (sem o plugin) marca e segue; Play fora do ar tenta de novo depois;
//   3. a fiação nativa: o plugin Java tem o nome que o JS chama, o MainActivity o registra, a biblioteca da Play está no build e o R8 não a
//      apaga — e o package.json não ganhou plugin nativo (o Capgo continua vendo o bundle como compatível com o app da loja).
//
// A tela (cadastro e Início entrando no time, prioridade sobre a rede, segunda abertura) é provada no navegador:
// npm run provar:navegador -- rodada-31u2
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LINK_APP_STORE, LINK_PLAY_STORE, conviteDoReferrer, linkDaLojaComConvite } from '../../src/utils/lojaDoApp.js';
import { CHAVE_REFERRER_LIDO, criarLeitorDaLoja } from '../../src/lib/conviteDaLoja.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(`${RAIZ}${rel}`, 'utf8');

test('o botão da loja no Android leva o código do convite no referrer da Play Store; iPhone e computador, o endereço de sempre', () => {
  assert.equal(linkDaLojaComConvite('android', 'k7m2qp'), `${LINK_PLAY_STORE}&referrer=convite%3Dk7m2qp`);
  const url = new URL(linkDaLojaComConvite('android', 'k7m2qp'));
  assert.equal(url.searchParams.get('id'), 'com.futty.app');
  assert.equal(url.searchParams.get('referrer'), 'convite=k7m2qp', 'o referrer chega à Play decodificado uma vez: "convite=<código>"');
  const uuid = '3f2b8c1e-9a4d-4e7b-8c2f-1a2b3c4d5e6f';
  assert.equal(new URL(linkDaLojaComConvite('android', uuid)).searchParams.get('referrer'), `convite=${uuid}`);
  assert.equal(linkDaLojaComConvite('ios', 'k7m2qp'), LINK_APP_STORE, 'a App Store não tem referrer');
  assert.equal(linkDaLojaComConvite(null, 'k7m2qp'), null, 'computador: sem botão de loja');
  assert.equal(linkDaLojaComConvite('android', ''), LINK_PLAY_STORE);
});

test('a página do convite usa o link com o convite; o /download continua sem referrer', () => {
  const convite = ler('src/pages/Convite.jsx');
  assert.match(convite, /href=\{linkDaLojaComConvite\(lojaDoCelular, token\)\}/);
  assert.doesNotMatch(convite, /href=\{linkDaLoja\(/);
  const download = ler('src/pages/Download.jsx');
  assert.doesNotMatch(download, /referrer|linkDaLojaComConvite/);
});

test('o convite do referrer: "convite=<código>" (também ainda codificado); vazio, sem convite ou estranho = null', () => {
  assert.equal(conviteDoReferrer('convite=k7m2qp'), 'k7m2qp');
  assert.equal(conviteDoReferrer('convite=K7M2QP'), 'k7m2qp');
  assert.equal(conviteDoReferrer('convite%3Dk7m2qp'), 'k7m2qp', 'referrer que chega ainda codificado');
  assert.equal(conviteDoReferrer('utm_source=whatsapp&convite=k7m2qp'), 'k7m2qp');
  assert.equal(conviteDoReferrer('convite=3f2b8c1e-9a4d-4e7b-8c2f-1a2b3c4d5e6f'), '3f2b8c1e-9a4d-4e7b-8c2f-1a2b3c4d5e6f');
  for (const nada of [null, undefined, '', '   ', 42, {}, 'utm_source=google-play&utm_medium=organic', 'convite=', 'convite=abc',
    'convite=../../api/x', 'convite=k7m2qp<script>', 'convite=k7m2qpk7m2qp', 'convite%3D', '%E0%A4%A', 'xconvite=k7m2qp']) {
    assert.equal(conviteDoReferrer(nada), null, JSON.stringify(nada));
  }
});

function armazenamento(inicial = {}) {
  const dados = { ...inicial };
  return { dados, getItem: (k) => (k in dados ? dados[k] : null), setItem: (k, v) => { dados[k] = String(v); } };
}
function plugin(resposta) {
  const p = { chamadas: 0, lerReferrer: async () => { p.chamadas += 1; if (resposta instanceof Error) throw resposta; return resposta; } };
  return p;
}
const erro = (code) => Object.assign(new Error(code), { code });

test('Android com "convite=<código>": entrega o código a UM leitor só e marca que já leu', async () => {
  const p = plugin({ referrer: 'convite=k7m2qp', suportado: true });
  const a = armazenamento();
  const tomar = criarLeitorDaLoja({ plataforma: 'android', lerReferrer: p.lerReferrer, armazenamento: a });
  const [um, dois] = await Promise.all([tomar(), tomar()]);
  assert.deepEqual([um, dois].filter(Boolean), ['k7m2qp'], 'dois leitores ao mesmo tempo (cadastro e Início, StrictMode): só um leva');
  assert.equal(await tomar(), null);
  assert.equal(p.chamadas, 1, 'a Play é consultada uma vez por abertura');
  assert.equal(a.dados[CHAVE_REFERRER_LIDO], '1');
});

test('segunda abertura (marca no aparelho): nem consulta a Play', async () => {
  const p = plugin({ referrer: 'convite=k7m2qp' });
  const tomar = criarLeitorDaLoja({ plataforma: 'android', lerReferrer: p.lerReferrer, armazenamento: armazenamento({ [CHAVE_REFERRER_LIDO]: '1' }) });
  assert.equal(await tomar(), null);
  assert.equal(p.chamadas, 0);
});

test('iPhone e site: nada roda', async () => {
  for (const plataforma of ['ios', 'web', undefined]) {
    const p = plugin({ referrer: 'convite=k7m2qp' });
    const a = armazenamento();
    const tomar = criarLeitorDaLoja({ plataforma, lerReferrer: p.lerReferrer, armazenamento: a });
    assert.equal(await tomar(), null, String(plataforma));
    assert.equal(p.chamadas, 0, String(plataforma));
    assert.equal(a.dados[CHAVE_REFERRER_LIDO], undefined, String(plataforma));
  }
});

test('referrer sem convite, vazio ou de quem instalou pela busca: null em silêncio, e marca (não pergunta de novo)', async () => {
  for (const resposta of [{ referrer: 'utm_source=google-play&utm_medium=organic' }, { referrer: '' }, { referrer: null, suportado: false }, {}, null]) {
    const a = armazenamento();
    const tomar = criarLeitorDaLoja({ plataforma: 'android', lerReferrer: plugin(resposta).lerReferrer, armazenamento: a });
    assert.equal(await tomar(), null, JSON.stringify(resposta));
    assert.equal(a.dados[CHAVE_REFERRER_LIDO], '1', JSON.stringify(resposta));
  }
});

test('app da loja antigo (sem o plugin, UNIMPLEMENTED): null e marca; Play fora do ar ou lenta: null e tenta na próxima abertura', async () => {
  const antigo = armazenamento();
  assert.equal(await criarLeitorDaLoja({ plataforma: 'android', lerReferrer: plugin(erro('UNIMPLEMENTED')).lerReferrer, armazenamento: antigo })(), null);
  assert.equal(antigo.dados[CHAVE_REFERRER_LIDO], '1');

  const fora = armazenamento();
  assert.equal(await criarLeitorDaLoja({ plataforma: 'android', lerReferrer: plugin(erro('INDISPONIVEL')).lerReferrer, armazenamento: fora })(), null);
  assert.equal(fora.dados[CHAVE_REFERRER_LIDO], undefined);

  const lenta = armazenamento();
  const nunca = () => new Promise(() => {});
  const t0 = Date.now();
  assert.equal(await criarLeitorDaLoja({ plataforma: 'android', lerReferrer: nunca, armazenamento: lenta, prazoMs: 50 })(), null);
  assert.ok(Date.now() - t0 < 1000, 'o prazo segura a tela no máximo prazoMs');
  assert.equal(lenta.dados[CHAVE_REFERRER_LIDO], undefined);

  // Chamada que lança na hora (a ponte do Capacitor lança sem promessa quando o plugin não existe): mesmo caminho.
  const sincrono = armazenamento();
  assert.equal(await criarLeitorDaLoja({ plataforma: 'android', lerReferrer: () => { throw erro('UNIMPLEMENTED'); }, armazenamento: sincrono })(), null);
  assert.equal(sincrono.dados[CHAVE_REFERRER_LIDO], '1');

  // Sem armazenamento (modo privado do WebView): ainda entrega.
  assert.equal(await criarLeitorDaLoja({ plataforma: 'android', lerReferrer: plugin({ referrer: 'convite=k7m2qp' }).lerReferrer, armazenamento: null })(), 'k7m2qp');
});

test('fiação nativa: plugin "ConviteDaLoja" registrado no MainActivity, biblioteca da Play no build, R8 sem apagar; nada no package.json nem no iPhone', () => {
  const java = ler('android/app/src/main/java/com/futty/app/ConviteDaLojaPlugin.java');
  assert.match(java, /@CapacitorPlugin\(name = "ConviteDaLoja"\)/);
  assert.match(java, /public void lerReferrer\(final PluginCall call\)/);
  assert.match(ler('src/lib/conviteDaLoja.js'), /registerPlugin\('ConviteDaLoja'\)/);
  assert.match(ler('src/lib/conviteDaLoja.js'), /plugin\.lerReferrer\(\)/);
  const main = ler('android/app/src/main/java/com/futty/app/MainActivity.java');
  assert.ok(main.indexOf('registerPlugin(ConviteDaLojaPlugin.class)') > 0 && main.indexOf('registerPlugin(ConviteDaLojaPlugin.class)') < main.indexOf('super.onCreate'),
    'registrado ANTES de a ponte subir');
  assert.match(ler('android/app/build.gradle'), /implementation "com\.android\.installreferrer:installreferrer:2\.2"/);
  assert.match(ler('android/app/proguard-rules.pro'), /-keep class com\.android\.installreferrer\.\*\* \{ \*; \}/);
  assert.match(ler('android/app/src/main/AndroidManifest.xml'), /<queries>\s*<package android:name="com\.android\.vending" \/>\s*<\/queries>/, 'a Play Store visível no Android 11+');
  const pacote = JSON.parse(ler('package.json'));
  const deps = Object.keys({ ...pacote.dependencies, ...pacote.devDependencies });
  assert.deepEqual(deps.filter((d) => /referrer/i.test(d)), [], 'plugin nosso, fora do package.json: o Capgo não marca o bundle como incompatível');
  assert.ok(!fs.existsSync(`${RAIZ}ios/App/App/ConviteDaLojaPlugin.swift`), 'nada no iPhone');
});
