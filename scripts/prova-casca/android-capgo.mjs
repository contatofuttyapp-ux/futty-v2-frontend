#!/usr/bin/env node
// Prova da atualização pelo Capgo no emulador: um APK com o pacote ANTIGO de fábrica, como o da loja, recebe o bundle novo sozinho, pelo
// caminho de verdade do plugin (autoUpdate atBackground). O bundle roda de uma pasta do aparelho, não dos assets do APK, e é outro
// trecho do servidor do WebView: é aqui que arquivo com ?v=N, os arquivos de idioma, as fontes e módulo que chega depois poderiam falhar sem a prova de fábrica ver.
//
// Nada fala com o Capgo: o capacitor.config.json do APK de prova aponta updateUrl, statsUrl e channelUrl para o servidor daqui. Assim a
// versão não fica registrada lá, e versão usada uma vez não volta (CAPGO.md).
//
// Antes: emulador ligado, cópia do site em http://127.0.0.1:8788, e o APK feito com o dist do commit anterior ao pacote novo:
//   node scripts/empacotar-sorteio.mjs --do-pacote --api http://localhost:8788   (no commit antigo) && npx cap sync android
//   capacitor.config.json dos assets com plugins.CapacitorUpdater.{updateUrl,statsUrl,channelUrl} em http://localhost:8789/...
//   gradlew assembleDebug
//   node scripts/prova-casca/android-capgo.mjs <pasta das capturas> <bundle.zip> <versão> <pasta do dist que virou o zip>
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { conectar } from './_webview.mjs';
import { CARTAZ, JOGO_NA_TELA, LOCAL, PREENCHER_JOGO, RECURSOS_COM_VERSAO, contaRolo, corpo, impressaoDe } from './_site-novo.mjs';

const [SAIDA, ZIP, VERSAO, DIST_DO_BUNDLE] = process.argv.slice(2);
if (!DIST_DO_BUNDLE) { console.error('uso: android-capgo.mjs <pasta das capturas> <bundle.zip> <versão> <pasta do dist que virou o zip>'); process.exit(1); }
mkdirSync(SAIDA, { recursive: true });

const PACOTE = 'com.futty.app';
const APK = new URL('../../android/app/build/outputs/apk/debug/app-debug.apk', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const LISTA = ['Zanardini', 'Gustavo', 'Higor', 'Gustavo Villela', 'Miguel (g)', 'Erick Lopes', 'Gabriel Vasques', 'Motta', 'Kinho', 'Bruno', 'Caio', 'Diego'].join('\n');
const adb = (...a) => execFileSync('adb', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1048576, timeout: 60000 });
const adbBin = (...a) => execFileSync('adb', a, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1048576, timeout: 60000 });
const shell = (...a) => adb('shell', ...a);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const captura = (nome) => writeFileSync(join(SAIDA, `${nome}.png`), adbBin('exec-out', 'screencap', '-p'));

const resultados = [];
function confere(nome, ok, detalhe = '') {
  resultados.push({ nome, ok: !!ok, detalhe: String(detalhe) });
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome}${detalhe ? ` · ${detalhe}` : ''}`);
}

// ── O Capgo de mentira: responde como o servidor de verdade responderia com o bundle ligado ao canal ──
const zip = readFileSync(ZIP);
const checksum = createHash('sha256').update(zip).digest('hex');
const pedidos = [];
// O módulo do site novo e do antigo têm nomes diferentes: é por eles que a prova sabe qual está na tela.
const MODULO_NOVO = /index-[\w-]+\.js/.exec(readFileSync(join(DIST_DO_BUNDLE, 'index.html'), 'utf8'))[0];
const servidor = createServer((req, res) => {
  const partes = [];
  req.on('data', (d) => partes.push(d));
  req.on('end', () => {
    pedidos.push({ quando: Date.now(), caminho: req.url });
    const json = (d) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(d)); };
    if (req.url === '/bundle.zip') { res.writeHead(200, { 'content-type': 'application/zip', 'content-length': zip.length }); return res.end(zip); }
    if (req.url === '/updates') {
      const quem = JSON.parse(Buffer.concat(partes).toString() || '{}');
      if (quem.version_name === VERSAO) return json({ message: 'No new version available', error: 'no_new_version_available' });
      return json({ version: VERSAO, url: 'http://localhost:8789/bundle.zip', checksum });
    }
    return json({ status: 'ok' });
  });
});
servidor.listen(8789, '127.0.0.1');

const qualBundle = (page) => page.evaluate(() => window.Capacitor.nativePromise('CapacitorUpdater', 'current', {}));
const moduloDoSite = (page) => page.evaluate(() => [...document.scripts].map((s) => s.src).filter((s) => /\/assets\/index-/.test(s)).join(' '));

async function abrir({ reiniciar = false } = {}) {
  if (reiniciar) shell('am', 'force-stop', PACOTE);
  shell('am', 'start', '-n', `${PACOTE}/.MainActivity`);
  const page = await conectar(PACOTE, []);
  await page.waitForSelector('#lista', 60000);
  return page;
}

try { adb('uninstall', PACOTE); } catch { /* não estava instalado */ }
adb('install', '-t', APK);
adb('reverse', 'tcp:8788', 'tcp:8788');
adb('reverse', 'tcp:8789', 'tcp:8789');
shell('cmd', 'connectivity', 'airplane-mode', 'disable');
shell('settings', 'put', 'global', 'hide_error_dialogs', '1');
shell('logcat', '-c');

// ── 1. O app como sai da loja ──
let page = await abrir();
const fabrica = await qualBundle(page);
const moduloAntigo = await moduloDoSite(page);
confere('abre no pacote de fábrica, o antigo', fabrica?.bundle?.id === 'builtin' && !moduloAntigo.includes(MODULO_NOVO), `${fabrica?.bundle?.version} ${moduloAntigo}`);
captura('c1-fabrica-pacote-antigo');

// ── 2. A pessoa usa e sai: o plugin baixa no fundo e troca numa saída seguinte. Cada ida e volta é contada, é o que o Pedro vai ver no celular ──
const inicio = Date.now();
let idasEVoltas = 0;
let atual = fabrica;
while (atual?.bundle?.version !== VERSAO && idasEVoltas < 6) {
  idasEVoltas += 1;
  page.fechar();
  shell('input', 'keyevent', 'KEYCODE_HOME');
  await espera(25000);
  page = await abrir();
  await espera(4000);
  atual = await qualBundle(page);
  console.log(`[ida e volta ${idasEVoltas}] ${Math.round((Date.now() - inicio) / 1000)} s · bundle ${atual?.bundle?.version} · baixou: ${pedidos.some((p) => p.caminho === '/bundle.zip')}`);
}
confere('o bundle chega sozinho, sem nenhum toque além de sair e voltar', atual?.bundle?.version === VERSAO && atual?.bundle?.id !== 'builtin', `${idasEVoltas} idas e voltas, ${Math.round((Date.now() - inicio) / 1000)} s; ${JSON.stringify(atual?.bundle)}`);
const moduloNovo = await moduloDoSite(page);
confere('a tela é a do site novo', moduloNovo.includes(MODULO_NOVO), moduloNovo);
await espera(800);
captura('c2-depois-da-atualizacao');

// ── 3. O ?v=N e o resto, servidos da pasta do bundle ──
const rec = await page.evaluate(corpo(RECURSOS_COM_VERSAO));
confere('no bundle: rolo.mp3?v=3 com os bytes certos', rec.rolo.status === 200 && rec.rolo.impressao === impressaoDe(join(DIST_DO_BUNDLE, 'sons', 'rolo.mp3')) && rec.rolo.bytes > 80000, JSON.stringify(rec.rolo));
confere('no bundle: o Web Audio decodifica o rolo', typeof rec.duracao === 'number' && rec.duracao > 1, `${rec.duracao} s`);
confere('no bundle: o <audio> de reserva abre o rolo', typeof rec.reserva === 'number' && rec.reserva > 1, `${rec.reserva} s`);
confere('no bundle: estrela.svg?v=2 com os bytes certos', rec.estrela.status === 200 && rec.estrela.impressao === impressaoDe(join(DIST_DO_BUNDLE, 'icones', 'estrela.svg')), JSON.stringify(rec.estrela));

// ── 3b. Os idiomas e as fontes também saem da pasta do bundle, que é outro trecho do servidor do WebView ──
await page.click('[data-idioma-atual]');
await page.click('[data-idioma-opcao="ko"]');
await page.waitForFunction(() => document.documentElement.lang === 'ko-KR' && document.querySelector('[data-sortear]')?.textContent.includes('추첨'), undefined, 15000).catch(() => {});
await page.evaluate(() => document.fonts.ready);
await espera(1200);
const coreano = await page.evaluate(() => {
  const rec = performance.getEntriesByType('resource').map((e) => e.name);
  return { lang: document.documentElement.lang, botao: document.querySelector('[data-sortear]')?.textContent.trim(), origem: location.origin, arquivo: rec.filter((n) => /\/assets\/ko-/.test(n)), fontes: rec.filter((n) => /noto-sans-kr/.test(n)), carregadas: [...document.fonts].filter((f) => f.status === 'loaded' && /AC00/i.test(f.unicodeRange)).length };
});
confere('no bundle: o coreano e a fonte dele abrem da pasta do bundle', coreano.lang === 'ko-KR' && coreano.botao === '추첨하기' && coreano.arquivo.length === 1 && coreano.fontes.length > 0 && coreano.carregadas > 0, JSON.stringify(coreano));
captura('c2b-coreano-no-bundle');
await page.click('[data-idioma-atual]');
await page.click('[data-idioma-opcao="pt"]');
await page.waitForFunction(() => document.documentElement.lang === 'pt-BR', undefined, 10000);
// O rodapé fica no fim da página: o próximo toque não pode cair enquanto ela ainda rola.
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await espera(1000);

// ── 4. Sorteio com som e imagem com local e horário ──
await page.evaluate(() => {
  window.__tocados = [];
  const comecar = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function () { window.__tocados.push('rolo.mp3'); return comecar.apply(this, arguments); };
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { if (!this.muted) window.__tocados.push((this.currentSrc || this.src).split('/').pop()); return play.apply(this, arguments); };
});
await page.fill('#lista', LISTA);
await page.evaluate(() => document.querySelector('#lista').blur());
await page.waitForSelector('[data-sortear]:not([disabled])', 15000);
await page.click('[data-sortear]');
await page.waitForSelector('[data-pagina="cerimonia"] .somBtn', 30000);
await page.evaluate(() => { const som = document.querySelector('.somBtn'); if (!som.classList.contains('on')) som.click(); });
await page.waitForSelector('.saltar.on', 30000);
await espera(1500);
captura('c3-cerimonia-no-bundle');
await page.waitForSelector('[data-baixar]', 240000);
const tocados = await page.evaluate(() => window.__tocados);
const rolo = contaRolo(tocados);
confere('no bundle: o rolo toca pelo Web Audio, com clac e jackpot', rolo.webAudio > 0 && rolo.reserva === 0 && tocados.includes('clac.mp3') && tocados.includes('jackpot.mp3'), `${JSON.stringify(rolo)} · ${[...new Set(tocados)].join(', ')}`);
await page.click('[data-editar-jogo]');
await page.waitForSelector('#jogo-local', 10000);
await page.evaluate(corpo(PREENCHER_JOGO));
await espera(600);
await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
await page.waitForSelector('[data-jogo-local]', 8000);
const jogo = await page.evaluate(corpo(JOGO_NA_TELA));
confere('no bundle: a folha "Editar pelada" grava local e horário', jogo.local === LOCAL, JSON.stringify(jogo));
// A imagem é pesada para o emulador: espera o arquivo aparecer em vez de um tempo fixo, e diz quanto levou.
async function esperarImagem(rotulo, limite = 90000) {
  const inicio = Date.now();
  for (;;) {
    const lista = shell('run-as', PACOTE, 'ls', 'cache').split(/\s+/).filter((n) => /\.png$/i.test(n));
    const passou = Math.round((Date.now() - inicio) / 1000);
    if (lista.length) {
      await espera(1500); // o arquivo pode estar acabando de ser escrito
      console.log(`[imagem] ${rotulo}: ${lista[0]} em ${passou} s`);
      return lista;
    }
    if (Date.now() - inicio > limite) {
      console.log(`[imagem] ${rotulo}: nada em ${passou} s`);
      captura(`sem-imagem-${rotulo.split(/[ ,]/)[0]}`);
      return [];
    }
    await espera(1000);
  }
}

shell(`run-as ${PACOTE} sh -c 'rm -f cache/*.png'`);
await espera(1200); // a folha que fechou ainda desce, e o fim da cerimônia ainda rola a tela
await page.click('[data-baixar]');
await page.waitForSelector('[data-formato="todos916"]', 10000);
await espera(700);
await page.click('[data-formato="todos916"]');
const pngs = await esperarImagem('story');
if (pngs[0]) writeFileSync(join(SAIDA, 'c4-imagem-do-bundle.png'), adbBin('exec-out', 'run-as', PACOTE, 'cat', `cache/${pngs[0]}`));
const cartaz = await page.evaluate(corpo(CARTAZ));
confere('no bundle: cartaz-*.js abre e a imagem sai', pngs.length > 0 && cartaz.urls.length > 0 && cartaz.urls.every((u) => u.startsWith(`${cartaz.origem}/assets/`)), `${pngs[0]} · ${cartaz.urls.join(' ')}`);
shell('input', 'keyevent', 'KEYCODE_BACK');
page.fechar();

// ── 5. O bundle fica: sem o notifyAppReady o plugin desfaz a versão na abertura seguinte ──
await espera(15000);
page = await abrir({ reiniciar: true });
await espera(15000);
const depois = await qualBundle(page);
confere('fechado e reaberto, segue no bundle, sem desfazer', depois?.bundle?.version === VERSAO && depois?.bundle?.status === 'success', JSON.stringify(depois?.bundle));
page.fechar();

// ── 6. Sem internet o bundle continua abrindo, e a imagem sai ──
shell('cmd', 'connectivity', 'airplane-mode', 'enable');
adb('reverse', '--remove-all');
await espera(2500);
page = await abrir({ reiniciar: true });
await espera(1000);
const semRede = await qualBundle(page);
confere('modo avião: abre no bundle', semRede?.bundle?.version === VERSAO && (await page.evaluate(() => navigator.onLine === false)), JSON.stringify(semRede?.bundle?.version));
await page.waitForSelector('[data-sortear]:not([disabled])', 15000);
await page.click('[data-sortear]');
await page.waitForSelector('.saltar.on', 30000);
await espera(1200);
await page.evaluate(() => document.querySelector('.saltar.on')?.click());
await page.waitForSelector('[data-baixar]', 120000);
await espera(2500); // o fim da cerimônia ainda rola a tela, e o toque cairia em outro lugar
shell(`run-as ${PACOTE} sh -c 'rm -f cache/*.png'`);
await page.click('[data-baixar]');
await page.waitForSelector('[data-formato="todos11"]', 10000);
await espera(700);
await page.click('[data-formato="todos11"]');
const pngsOff = await esperarImagem('quadrada, modo avião');
if (pngsOff[0]) writeFileSync(join(SAIDA, 'c6-imagem-modo-aviao.png'), adbBin('exec-out', 'run-as', PACOTE, 'cat', `cache/${pngsOff[0]}`));
confere('modo avião: a imagem sai do bundle', pngsOff.length > 0, pngsOff[0] || '');
captura('c5-modo-aviao-no-bundle');
shell('cmd', 'connectivity', 'airplane-mode', 'disable');
page.fechar();

writeFileSync(join(SAIDA, 'capgo-logcat.txt'), shell('logcat', '-d').split('\n').filter((l) => /capgo|updater/i.test(l)).join('\n'));
writeFileSync(join(SAIDA, 'capgo-resultado.json'), JSON.stringify({ resultados, idasEVoltas, segundos: Math.round((Date.now() - inicio) / 1000), pedidos }, null, 2));
const falhas = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - falhas.length}/${resultados.length} conferidos`);
process.exit(falhas.length ? 1 : 0);
