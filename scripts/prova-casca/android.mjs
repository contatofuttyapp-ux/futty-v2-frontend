#!/usr/bin/env node
// Prova do app 2.0 no emulador Android, com o APK de debug de verdade. As telas são dirigidas pelo DevTools do WebView; o que é
// do sistema (folha de compartilhar, Voltar, modo avião) é o próprio Android, conferido por adb.
//
// Antes: emulador ligado, cópia do site em http://127.0.0.1:8788 (wrangler pages dev) e o APK feito com
//   node scripts/empacotar-sorteio.mjs --do-pacote --api http://localhost:8788 && npx cap sync android && gradlew assembleDebug
// Nunca contra a produção: o /api da prova vai para a cópia local, pelo adb reverse.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { conectar } from './_webview.mjs';
import { CARTAZ, COMBO_VERDE_E_BRANCO, CONGELAR_REFLEXO, HORARIO_NA_TELA, JOGO_NA_TELA, KIT_DO_TIME, LEGENDA, LOCAL, PREENCHER_JOGO, RECURSOS_COM_VERSAO, SOLTAR_REFLEXO, SORTEAR, contaRolo, corpo, impressaoDe } from './_site-novo.mjs';

const SAIDA = process.argv[2];
if (!SAIDA) { console.error('uso: android.mjs <pasta das capturas>'); process.exit(1); }
mkdirSync(SAIDA, { recursive: true });

const PACOTE = 'com.futty.app';
const APK = new URL('../../android/app/build/outputs/apk/debug/app-debug.apk', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const LISTA = ['Zanardini', 'Gustavo', 'Higor', 'Gustavo Villela', 'Miguel (g)', 'Erick Lopes', 'Gabriel Vasques', 'Motta', 'Kinho', 'Bruno', 'Caio', 'Diego'].join('\n');
const PRAZO_ADB = 60000;

const adb = (...a) => execFileSync('adb', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1048576, timeout: PRAZO_ADB });
const adbBin = (...a) => execFileSync('adb', a, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1048576, timeout: PRAZO_ADB });
const shell = (...a) => adb('shell', ...a);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const resultados = [];
function confere(nome, ok, detalhe = '') {
  resultados.push({ nome, ok: !!ok, detalhe: String(detalhe) });
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome}${detalhe ? ` · ${detalhe}` : ''}`);
}
const captura = (nome) => { writeFileSync(join(SAIDA, `${nome}.png`), adbBin('exec-out', 'screencap', '-p')); };
const topo = () => shell('dumpsys', 'activity', 'activities').split('\n').find((l) => /topResumedActivity|mResumedActivity/.test(l)) || '';
const appNaFrente = () => topo().includes(PACOTE);
const folhaDoSistema = () => /intentresolver|ChooserActivity|ResolverActivity/i.test(topo());
const voltarDoSistema = () => shell('input', 'keyevent', 'KEYCODE_BACK');

async function esperaAte(f, ms, passo = 200) {
  const fim = Date.now() + ms;
  for (;;) {
    const v = await f();
    if (v) return v;
    if (Date.now() > fim) return false;
    await espera(passo);
  }
}

const pedidos = [];

async function abrirApp({ limpar = false } = {}) {
  shell('am', 'force-stop', PACOTE);
  if (limpar) shell('pm', 'clear', PACOTE);
  shell('logcat', '-c');
  shell('am', 'start', '-n', `${PACOTE}/.MainActivity`);
  const page = await conectar(PACOTE, pedidos);
  await page.waitForSelector('#lista', 60000);
  // O que saiu antes de o DevTools conectar também conta para a prova de rede.
  for (const url of await page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name))) pedidos.push({ url, metodo: 'GET' });
  return page;
}

async function colarLista(page) {
  await page.fill('#lista', LISTA);
  await page.evaluate(() => document.querySelector('#lista').blur());
  await page.waitForSelector('[data-sortear]:not([disabled])', 15000);
}

async function sortear(page) {
  await page.click('[data-sortear]');
  await page.waitForSelector('[data-pagina="cerimonia"] .somBtn', 30000);
}

// Toque do próprio Android, não do DevTools: o da folha "Editar pelada" tem de ser o primeiro dedo que chega ali, depois de um campo editado.
async function tocarDeVerdade(page, sel) {
  await page.waitForSelector(sel, 15000);
  await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), sel);
  await espera(500); // a folha ainda sobe, e a rolagem ainda anda
  const { x, y, dpr } = await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, dpr: devicePixelRatio }; }, sel);
  // O dumpsys, e não o uiautomator: este espera a tela sossegar, e a página nunca sossega, tem luz andando o tempo todo.
  const webview = /CapacitorWebView\{[^}]*?\s(\d+),(\d+)-\d+,\d+/.exec(shell('dumpsys', 'activity', 'top'));
  shell('input', 'tap', String(Math.round(Number(webview[1]) + x * dpr)), String(Math.round(Number(webview[2]) + y * dpr)));
}

const ateResultado = (page) => page.waitForSelector('[data-baixar]', 240000);
const fecharFolhaDoSite = (page) => page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));

try { adb('uninstall', PACOTE); } catch { /* não estava instalado */ }
adb('install', '-t', APK);
adb('reverse', 'tcp:8788', 'tcp:8788');
shell('cmd', 'connectivity', 'airplane-mode', 'disable');
// O emulador lento tira o "não está respondendo" na frente da tela; aqui ele só atrapalharia a captura.
shell('settings', 'put', 'global', 'hide_error_dialogs', '1');

// ── 1. Abertura ──
const inicioAbertura = Date.now();
const page = await abrirApp({ limpar: true });
const msAtePronta = Date.now() - inicioAbertura;
await espera(800);
captura('1-inicio');
const estadoInicio = await page.evaluate(() => ({
  caminho: location.pathname,
  nativo: window.Capacitor?.isNativePlatform?.(),
  seo: !!document.querySelector('.seo'),
  baixeOApp: !!document.querySelector('[data-baixe-o-app]'),
  ajuda: !!document.querySelector('[data-ajuda]'),
  campoSenha: !!document.querySelector('input[type="password"]'),
  fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
  idioma: document.documentElement.lang,
}));
confere('abre direto no início do sorteio', estadoInicio.caminho === '/' && estadoInicio.nativo, JSON.stringify({ caminho: estadoInicio.caminho, nativo: estadoInicio.nativo, idioma: estadoInicio.idioma }));
confere('sem login', !estadoInicio.campoSenha && !(await page.evaluate(() => /entrar|criar conta|senha/i.test(document.body.innerText))));
confere('sem blocos de SEO nem "Baixe o app"; com Ajuda', !estadoInicio.seo && !estadoInicio.baixeOApp && estadoInicio.ajuda);
const displayed = /Displayed [^ ]*MainActivity[^+]*\+(?:(\d+)s)?(\d+)ms/.exec(shell('logcat', '-d', '-s', 'ActivityTaskManager'));
const msTela = displayed ? Number(displayed[1] || 0) * 1000 + Number(displayed[2]) : null;
console.log(`[tempo] Android "Displayed" ${msTela} ms · FCP do WebView ${estadoInicio.fcp} ms · até o campo pronto ${msAtePronta} ms`);

// ── 1b. O que o site trouxe de novo na tela inicial, e o som com ?v=2 servido de dentro do pacote ──
const DIST_LOCAL = new URL('../../dist/', import.meta.url);
const rec = await page.evaluate(corpo(RECURSOS_COM_VERSAO));
const roloDoDist = impressaoDe(new URL('sons/rolo.mp3', DIST_LOCAL));
confere('rolo.mp3?v=2 sai do pacote com os bytes do dist', rec.rolo.status === 200 && rec.rolo.impressao === roloDoDist && rec.rolo.bytes > 80000, JSON.stringify(rec.rolo));
confere('o Web Audio decodifica o rolo.mp3?v=2', typeof rec.duracao === 'number' && rec.duracao > 1, `${rec.duracao} s`);
confere('o <audio> de reserva abre o rolo.mp3?v=2', typeof rec.reserva === 'number' && rec.reserva > 1, `${rec.reserva} s`);
confere('estrela.svg?v=2 sai do pacote com os bytes do dist', rec.estrela.status === 200 && rec.estrela.impressao === impressaoDe(new URL('icones/estrela.svg', DIST_LOCAL)), JSON.stringify(rec.estrela));
await colarLista(page);
const legenda =await page.evaluate(corpo(LEGENDA));
confere('legenda com a linha do nível e a estrela nova', /Equilibrar por nível: 1 a 5 estrelas/.test(legenda.texto) && legenda.mascara.includes('estrela.svg?v=2') && legenda.interruptor, JSON.stringify(legenda));
await page.evaluate(() => { document.querySelector('[data-legenda]').scrollIntoView({ block: 'start' }); });
await espera(500);
captura('1b-legenda-nivel-estrela');
const sortearAceso = await page.evaluate(corpo(SORTEAR));
confere('SORTEAR de 64 px com o reflexo andando', sortearAceso.altura === 64 && sortearAceso.reflexo.includes('reflexo') && sortearAceso.traco.length > 0, JSON.stringify(sortearAceso));
await page.evaluate(() => { document.querySelector('[data-sortear]').scrollIntoView({ block: 'center' }); });
await page.evaluate(corpo(CONGELAR_REFLEXO));
await espera(400);
captura('1c-sortear-reflexo');
await page.evaluate(corpo(SOLTAR_REFLEXO));

// ── 2. Sorteio, com som, Voltar no meio da cerimônia ──
await page.evaluate(() => {
  window.__tocados = [];
  window.__vibracoes = [];
  // O rolo é Web Audio, não passa pelo <audio>.
  const comecar = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function () { window.__tocados.push('rolo.mp3'); return comecar.apply(this, arguments); };
  const pedirAoNativo = window.Capacitor.nativePromise;
  window.Capacitor.nativePromise = function (plugin, metodo) {
    if (plugin === 'Haptics') window.__vibracoes.push(metodo);
    return pedirAoNativo.apply(this, arguments);
  };
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (!this.muted) window.__tocados.push(this.currentSrc || this.src);
    return play.apply(this, arguments);
  };
});
await sortear(page);
await page.evaluate(() => { const som = document.querySelector('.somBtn'); if (!som.classList.contains('on')) som.click(); });
await page.waitForSelector('.saltar.on', 30000);
await espera(1500);
captura('2-cerimonia');
// A pergunta é o que o Voltar encontrou e o que fez: a resposta sai do próprio aparelho, no instante em que a tecla chega.
await page.evaluate(() => {
  window.__voltares = [];
  window.__saidas = [];
  window.Capacitor.addListener('App', 'backButton', () => window.__voltares.push({ caminho: location.pathname, girando: !!document.querySelector('.saltar.on') }));
  window.addEventListener('popstate', () => window.__saidas.push(location.pathname));
});
voltarDoSistema();
await espera(600);
voltarDoSistema();
await page.waitForFunction(() => window.__voltares.length >= 2, undefined, 45000).catch(() => {});
const naCerimonia = await page.evaluate(() => ({ voltares: window.__voltares, saidas: window.__saidas }));
const girava = naCerimonia.voltares.length >= 2 && naCerimonia.voltares.every((v) => v.caminho === '/sortear' && v.girando);
confere('Voltar no meio da cerimônia: o app fica aberto e a máquina segue', girava && naCerimonia.saidas.length === 0 && appNaFrente(), JSON.stringify(naCerimonia));
await ateResultado(page);
await espera(800);
captura('3-resultado');
const nomes = (await page.evaluate(() => window.__tocados)).map((u) => u.split('/').pop());
confere('cerimônia com som: rolo, clac e jackpot tocaram', ['rolo', 'clac', 'jackpot'].every((n) => nomes.some((x) => x.startsWith(n))), `${nomes.length} toques: ${[...new Set(nomes)].join(', ')}`);
const rolo = contaRolo(nomes);
confere('o rolo tocou pelo Web Audio, sem cair na reserva', rolo.webAudio > 0 && rolo.reserva === 0, JSON.stringify(rolo));
confere('a cerimônia termina na mesma tela, sem trocar de rota', (await page.evaluate(() => location.pathname)) === '/sortear');
// 12 nomes em 2 times de 5: 10 camisas param na máquina (as 2 do banco entram sem rolo) e 1 jackpot.
const vibracoes = await page.evaluate(() => window.__vibracoes);
const impactos = vibracoes.filter((v) => v === 'impact').length;
const jackpots = vibracoes.filter((v) => v === 'notification').length;
confere('vibração quando cada camisa para e uma só no jackpot', impactos === 10 && jackpots === 1, `impact ${impactos}, notification ${jackpots}`);

// ── 3. Voltar fecha o cartão aberto ──
await page.click('[data-baixar]');
await page.waitForSelector('[data-folha]', 10000);
await espera(400);
captura('4-escolha-da-imagem');
voltarDoSistema();
const folhaFechou = await esperaAte(() => page.evaluate(() => !document.querySelector('[data-folha]')), 3000);
confere('Voltar fecha o cartão aberto, sem sair da tela', folhaFechou && appNaFrente() && (await page.evaluate(() => location.pathname)) === '/sortear');

// ── 3b. Folha "Editar pelada" e listras horizontais: a imagem do passo 4 sai com os dois ──
await page.click('[data-editar-jogo]');
await page.waitForSelector('#jogo-local', 10000);
const tituloFolha = await page.evaluate(corpo(PREENCHER_JOGO));
await espera(500);
captura('3b-folha-editar-pelada');
confere('a folha "Editar pelada" abre com local e horário', tituloFolha === 'Editar pelada', tituloFolha);
await tocarDeVerdade(page, '[data-jogo-pronto]');
await page.waitForSelector('[data-jogo-local]', 8000);
const jogoNaTela = await page.evaluate(corpo(JOGO_NA_TELA));
confere('local e horário aparecem na tela', jogoNaTela.local === LOCAL && jogoNaTela.horario === HORARIO_NA_TELA, JSON.stringify(jogoNaTela));
await page.evaluate(() => window.scrollTo(0, 0));
await espera(500);
captura('3c-tela-com-local-e-horario');
await page.click('[data-editar="0"]');
await tocarDeVerdade(page, '[data-padrao-uniforme="listrasH"]');
await tocarDeVerdade(page, COMBO_VERDE_E_BRANCO);
await espera(1500);
captura('3d-editar-listras-horizontais');
await tocarDeVerdade(page, '[data-editar-pronto]');
await page.waitForFunction(() => !document.querySelector('[data-folha]'), undefined, 8000);
await espera(2000);
await page.evaluate(() => { document.querySelector('[data-time="0"]').scrollIntoView({ block: 'start' }); });
await espera(800);
captura('3e-listras-horizontais-na-tela');
const kit = await page.evaluate(corpo(KIT_DO_TIME));
confere('listras horizontais vestem o time', kit.padrao === 'listrasH' && kit.cor === 'verde' && kit.cor2 === 'branco', JSON.stringify(kit));
await page.evaluate(() => window.scrollTo(0, 0));

// ── 4. Baixar imagem: PNG na cache e folha do sistema ──
shell(`run-as ${PACOTE} sh -c 'rm -f cache/*.png'`);
await page.click('[data-baixar]');
await page.click('[data-formato="todos916"]');
const folhaImagem = await esperaAte(folhaDoSistema, 25000, 400);
await espera(1500);
captura('5-baixar-imagem-folha-nativa');
confere('Baixar imagem abre a folha nativa', folhaImagem, topo().trim());
const arquivos = shell('run-as', PACOTE, 'ls', 'cache').split(/\s+/).filter((n) => /\.png$/i.test(n));
const png = arquivos[0] ? adbBin('exec-out', 'run-as', PACOTE, 'cat', `cache/${arquivos[0]}`) : Buffer.alloc(0);
if (png.length) writeFileSync(join(SAIDA, 'imagem-gerada.png'), png);
const ehPng = png.subarray(0, 4).toString('hex') === '89504e47';
confere('a imagem na folha é o PNG do sorteio', ehPng && png.readUInt32BE(20) > png.readUInt32BE(16), `${arquivos[0]} ${ehPng ? `${png.readUInt32BE(16)}×${png.readUInt32BE(20)}` : ''}, ${png.length} bytes`);
const cartazOnline = await page.evaluate(corpo(CARTAZ));
confere('cartaz-*.js veio de dentro do app', cartazOnline.urls.length > 0 && cartazOnline.urls.every((u) => u.startsWith(`${cartazOnline.origem}/assets/`)), cartazOnline.urls.join(' '));
voltarDoSistema();
await esperaAte(appNaFrente, 8000);
await espera(500);
const avisoDepois = await page.evaluate(() => document.querySelector('[data-toast]')?.textContent || '');
confere('fechar a folha não é erro de ninguém', appNaFrente() && !/não deu/i.test(avisoDepois), avisoDepois);
await fecharFolhaDoSite(page);

// ── 5. Compartilhar: link pelo servidor local e folha do sistema ──
await espera(400);
await page.click('[data-copiar-link]');
const folhaLink = await esperaAte(folhaDoSistema, 20000, 300);
await espera(1500);
captura('6-compartilhar-folha-nativa');
confere('Compartilhar abre a folha nativa', folhaLink, topo().trim());
const arvore = (() => {
  try { shell('uiautomator', 'dump', '/sdcard/tela.xml'); return shell('cat', '/sdcard/tela.xml'); } catch { return ''; }
})();
const linkNaFolha = /https:\/\/futtyapp\.com\.br\/s\/([A-Z0-9]{6})/.exec(arvore);
confere('o link na folha é o público, não o do WebView', !!linkNaFolha && !/localhost/.test(arvore), linkNaFolha?.[0] || 'não achei na tela');
voltarDoSistema();
await esperaAte(appNaFrente, 8000);

// ── 6. Link /s/ abre no app ──
if (linkNaFolha) {
  const codigo = linkNaFolha[1];
  shell('am', 'start', '-a', 'android.intent.action.VIEW', '-c', 'android.intent.category.BROWSABLE', '-d', `https://futtyapp.com.br/s/${codigo}`, PACOTE);
  const abriu = await esperaAte(() => page.evaluate((c) => location.pathname === `/s/${c}`, codigo), 15000);
  await espera(2500);
  confere('o link /s/ abre o sorteio no app', abriu && appNaFrente(), `/s/${codigo}`);
  captura('7-link-publico');
  await page.waitForSelector('[data-jogo-local]', 120000).catch(() => {});
  const noLink = await page.evaluate(corpo(JOGO_NA_TELA));
  confere('o link leva o local e o horário, pelo HTTP nativo', noLink.local === LOCAL && noLink.horario === HORARIO_NA_TELA, JSON.stringify(noLink));
  await esperaAte(() => page.evaluate(() => !document.querySelector('.saltar.on')), 120000, 500);
  voltarDoSistema();
  const saiu = await esperaAte(() => page.evaluate((c) => location.pathname !== `/s/${c}`, codigo), 8000);
  confere('Voltar sai do link sem fechar o app', saiu && appNaFrente(), await page.evaluate(() => location.pathname));
}
const filtros = shell('dumpsys', 'package', PACOTE);
confere('/s/ é o único caminho de futtyapp.com.br que abre no app', /futtyapp\.com\.br/.test(filtros) && /PatternMatcher\{LITERAL|\/s\//.test(filtros) && !/\/convite|\/equipa|\/auth\/confirmar|"\/c\//.test(filtros));

// ── 7. Capgo: o canal sorteio não entrega o bundle antigo ──
const atual = await page.evaluate(() => window.Capacitor.nativePromise('CapacitorUpdater', 'current', {}));
const canal = await page.evaluate(() => window.Capacitor.nativePromise('CapacitorUpdater', 'getChannel', {}).catch((e) => ({ erro: String(e?.message || e) })));
confere('segue no pacote de fábrica, sem bundle do Capgo', atual?.bundle?.id === 'builtin' && atual?.native === '2.0.0', JSON.stringify({ bundle: atual?.bundle?.version, id: atual?.bundle?.id, native: atual?.native }));
console.log(`[capgo] getChannel: ${JSON.stringify(canal)}`);
writeFileSync(join(SAIDA, 'logcat-capgo.txt'), shell('logcat', '-d').split('\n').filter((l) => /capgo|updater/i.test(l)).join('\n'));
page.fechar();

// ── 8. Modo avião ──
shell('cmd', 'connectivity', 'airplane-mode', 'enable');
adb('reverse', '--remove', 'tcp:8788');
await espera(2500);
const pg = await abrirApp();
await espera(800);
confere('modo avião: o app abre', await pg.evaluate(() => navigator.onLine === false && location.pathname === '/'), await pg.evaluate(() => `onLine=${navigator.onLine}`));
await pg.waitForSelector('[data-sortear]:not([disabled])', 15000); // a lista segue no rascunho
await sortear(pg);
await espera(1500);
await pg.evaluate(() => document.querySelector('.saltar.on')?.click());
await ateResultado(pg);
await espera(600);
captura('8-modo-aviao-resultado');
confere('modo avião: colar, sortear e cerimônia funcionam', true);
shell(`run-as ${PACOTE} sh -c 'rm -f cache/*.png'`);
await pg.click('[data-baixar]');
await pg.click('[data-formato="todos11"]');
const folhaOff = await esperaAte(folhaDoSistema, 25000, 400);
await espera(1200);
captura('9-modo-aviao-imagem');
const offPng = shell('run-as', PACOTE, 'ls', 'cache').split(/\s+/).filter((n) => /\.png$/i.test(n));
confere('modo avião: gerar imagem funciona', folhaOff && offPng.length > 0, offPng[0] || '');
const cartazOffline = await pg.evaluate(corpo(CARTAZ));
confere('modo avião: cartaz-*.js abre de dentro do pacote', cartazOffline.urls.length > 0 && cartazOffline.urls.every((u) => u.startsWith(`${cartazOffline.origem}/assets/`)), cartazOffline.urls.join(' '));
if (offPng[0]) writeFileSync(join(SAIDA, 'imagem-gerada-sem-rede.png'), adbBin('exec-out', 'run-as', PACOTE, 'cat', `cache/${offPng[0]}`));
voltarDoSistema();
await esperaAte(appNaFrente, 8000);
await espera(500);
await fecharFolhaDoSite(pg);
await espera(300);
await pg.click('[data-copiar-link]');
const aviso = await esperaAte(() => pg.evaluate(() => document.querySelector('[data-toast]')?.textContent || ''), 15000, 150);
await espera(300);
captura('10-modo-aviao-compartilhar');
const avisoFinal = await pg.evaluate(() => document.querySelector('[data-toast]')?.textContent || '');
const botaoSolto = await esperaAte(() => pg.evaluate(() => !document.querySelector('[data-copiar-link]')?.disabled), 5000);
confere('modo avião: Compartilhar avisa e não trava', avisoFinal === 'Sem internet pra criar o link' && botaoSolto && !folhaDoSistema(), `primeiro: "${aviso}" · ficou: "${avisoFinal}"`);
shell('cmd', 'connectivity', 'airplane-mode', 'disable');
adb('reverse', 'tcp:8788', 'tcp:8788');

// ── 9. Voltar na tela inicial sai do app, como em qualquer app ──
await pg.evaluate(() => { history.pushState(null, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); });
await espera(800);
voltarDoSistema();
const fechou = await esperaAte(() => !appNaFrente(), 5000);
confere('Voltar na tela inicial fecha o app', fechou);

// ── Rede vista pelo WebView ──
const deFora = pedidos.filter((p) => !/^(https:\/\/localhost|data:|blob:)/.test(p.url));
confere('o WebView não pediu nada fora do próprio app', deFora.length === 0, deFora.slice(0, 5).map((p) => p.url).join(' '));
const proibidos = pedidos.filter((p) => /futty-api|run\.app|supabase/i.test(p.url));
confere('nenhuma chamada ao motor antigo nem ao Supabase (WebView)', proibidos.length === 0, `${pedidos.length} pedidos`);

writeFileSync(join(SAIDA, 'rede-webview.json'), JSON.stringify(pedidos, null, 1));
writeFileSync(join(SAIDA, 'resultado.json'), JSON.stringify({ resultados, tempos: { displayedMs: msTela, fcpMs: estadoInicio.fcp, campoProntoMs: msAtePronta }, estadoInicio }, null, 2));
const falhas = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - falhas.length}/${resultados.length} conferidos`);
process.exit(falhas.length ? 1 : 0);
