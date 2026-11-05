#!/usr/bin/env node
// Prova dos idiomas do site no app, no emulador Android, com o idioma trocado no próprio aparelho: o que decide o idioma é o navigator do WebView, e os arquivos de
// idioma e as fontes têm de sair de dentro do pacote. Confere também o som e a imagem com local e horário em cada idioma.
//
// Antes: emulador ligado, cópia do site em http://127.0.0.1:8788 (wrangler pages dev) e o APK de debug feito com
//   node scripts/empacotar-sorteio.mjs --do-pacote --api http://localhost:8788 && npx cap sync android && gradlew assembleDebug
// Nunca contra a produção. No fim, devolve o idioma que o aparelho tinha.
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { conectar } from './_webview.mjs';
import { CARTAZ, DIA, HORA, LOCAL, RECURSOS_COM_VERSAO, contaRolo, corpo, impressaoDe } from './_site-novo.mjs';

const SAIDA = process.argv[2];
if (!SAIDA) { console.error('uso: android-idiomas.mjs <pasta das capturas>'); process.exit(1); }
mkdirSync(SAIDA, { recursive: true });

const PACOTE = 'com.futty.app';
const APK = new URL('../../android/app/build/outputs/apk/debug/app-debug.apk', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const DIST = new URL('../../dist/', import.meta.url);
const SITE = new URL('../../sorteio-pacote/', import.meta.url);
const adb = (...a) => execFileSync('adb', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1048576, timeout: 90000 });
const adbBin = (...a) => execFileSync('adb', a, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1048576, timeout: 90000 });
const shell = (...a) => adb('shell', ...a);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const captura = (nome) => writeFileSync(join(SAIDA, `${nome}.png`), adbBin('exec-out', 'screencap', '-p'));

const resultados = [];
function confere(nome, ok, detalhe = '') {
  resultados.push({ nome, ok: !!ok, detalhe: String(detalhe) });
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome}${detalhe ? ` · ${detalhe}` : ''}`);
}
const lerIdioma = (id) => JSON.parse(readFileSync(new URL(`../../../../../SORTEIO/codigo/src/i18n/${id}.json`, import.meta.url), 'utf8'));

const COREANA = /noto-sans-kr/; const LATIN_EXT = /latin-ext/;

/** Liga o emulador e espera o Android responder. O idioma guardado no aparelho vale desde a partida. */
async function ligarEmulador(alvo) {
  const programa = join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'emulator', 'emulator.exe');
  spawn(programa, ['-avd', 'futty35', '-gpu', process.env.EMULADOR_GPU || 'host', '-no-window', '-no-boot-anim', '-no-snapshot', '-no-audio'], { detached: true, stdio: 'ignore' }).unref();
  const fim = Date.now() + 600000;
  await espera(15000);
  for (;;) {
    const pronto = safe(() => shell('getprop', 'sys.boot_completed')).trim() === '1' && safe(() => shell('am', 'get-config')).includes(alvo) && safe(() => shell('pm', 'path', PACOTE)).includes('package:');
    if (pronto) break;
    if (Date.now() > fim) throw new Error(`o emulador não voltou em ${alvo}`);
    await espera(3000);
  }
  safe(() => adb('root'));
  await espera(3000);
  for (;;) { if (safe(() => shell('id')).includes('uid=0')) break; if (Date.now() > fim) throw new Error('adb root'); await espera(1000); }
}

/**
 * Troca o idioma do aparelho inteiro, guardando-o como as configurações guardam, e desliga e liga o emulador. Reiniciar só o Android, com reboot ou
 * zygote, derruba este emulador (segmentation fault, "Failed to find ColorBuffer"), com a GPU do computador e com a de software.
 */
async function idiomaDoAparelho(tag) {
  const [lingua, regiao] = tag.split('-');
  if (safe(() => shell('am', 'get-config')).includes(`${lingua}-r${regiao}`)) return; // cada partida a frio leva minutos
  safe(() => adb('root'));
  await espera(3000);
  shell('setprop', 'persist.sys.locale', tag);
  shell('settings', 'put', 'system', 'system_locales', tag);
  // O Android só grava as configurações no disco uns segundos depois; desligar antes disso perde o idioma novo. Ele manda mais que o persist.sys.locale.
  await espera(10000);
  shell('sync');
  safe(() => shell('reboot', '-p'));
  const ate = Date.now() + 60000;
  while (safe(() => adb('devices')).includes('emulator-') && Date.now() < ate) await espera(1000);
  await espera(4000);
  await ligarEmulador(`${lingua}-r${regiao}`);
  shell('settings', 'put', 'global', 'hide_error_dialogs', '1');
  adb('reverse', 'tcp:8788', 'tcp:8788');
  await espera(20000); // o sistema ainda termina de subir depois de responder
}
function safe(f) { try { return f(); } catch { return ''; } }

async function abrirLimpo() {
  shell('am', 'force-stop', PACOTE);
  shell('pm', 'clear', PACOTE);
  // Logo depois de o Android reiniciar, a lista de apps ainda está sendo refeita e o sistema derruba o que acabou de abrir. Isso é do reinício, não do app: tenta de novo e conta.
  let page = null;
  for (let tentativa = 1; !page; tentativa += 1) {
    try {
      shell('am', 'start', '-n', `${PACOTE}/.MainActivity`);
      page = await conectar(PACOTE, [], 120000);
    } catch (erro) {
      console.log(`[aparelho] abertura ${tentativa} não pegou: ${erro.message.split('\n')[0]}`);
      if (tentativa >= 4) throw erro;
      await espera(10000);
    }
  }
  await page.waitForSelector('#lista', 90000);
  await espera(1200);
  return page;
}

const ESTADO = () => {
  const rec = performance.getEntriesByType('resource').map((e) => e.name);
  const faces = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family.replace(/"/g, '')} ${f.weight} ${/AC00/i.test(f.unicodeRange) ? 'hangul' : /U\+100/.test(f.unicodeRange) ? 'ext' : 'latim'}`);
  return {
    linguas: navigator.languages, lang: document.documentElement.lang, letreiro: document.querySelector('.letreiro')?.textContent, slogan: document.querySelector('[data-slogan]')?.textContent,
    botao: document.querySelector('[data-sortear]')?.textContent.trim(), legenda: document.querySelector('[data-legenda]')?.innerText.replace(/\s+/g, ' ').trim(), origem: location.origin, caminho: location.pathname,
    arquivos: rec.filter((n) => /\/assets\/(pt-pt|en|es|fr|cs|ko)-[\w-]+\.js/.test(n)), fontes: rec.filter((n) => /\/fonts\//.test(n)), faces, nativo: window.Capacitor?.isNativePlatform?.(),
    fora: rec.filter((n) => !n.startsWith(location.origin) && !n.startsWith('data:') && !n.startsWith('blob:')),
  };
};

async function fluxoCompleto(page, r, { nomes, jogoEsperado, seloEsperado, foto, T }) {
  // ── A lista, com nomes nos alfabetos que importam ──
  await page.fill('#lista', nomes.join('\n'));
  await page.evaluate(() => document.querySelector('#lista').blur());
  await page.waitForSelector('[data-sortear]:not([disabled])', 15000);
  const chips = await page.evaluate(() => [...document.querySelectorAll('[data-chip]')].map((c) => c.dataset.chip));
  confere(`${r}: a lista guarda os nomes como vieram`, chips.join() === nomes.join(), chips.join());
  await espera(800);
  captura(`${foto}-1-inicio`);

  // ── O som ──
  const rec = await page.evaluate(corpo(RECURSOS_COM_VERSAO));
  confere(`${r}: rolo.mp3?v=3 sai do pacote com os bytes do mix`, rec.rolo.status === 200 && rec.rolo.impressao === impressaoDe(new URL('sons/rolo.mp3', DIST)), JSON.stringify(rec.rolo));
  confere(`${r}: o Web Audio decodifica o rolo (${typeof rec.duracao === 'number' ? rec.duracao.toFixed(3) : rec.duracao} s)`, typeof rec.duracao === 'number' && Math.abs(rec.duracao - 6.099) < 0.05, String(rec.duracao));
  confere(`${r}: o <audio> de reserva abre o rolo`, typeof rec.reserva === 'number' && rec.reserva > 1, String(rec.reserva));
  await page.evaluate(() => {
    window.__tocados = [];
    const comecar = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function () { window.__tocados.push('rolo.mp3'); window.__contextoDoRolo = this.context; return comecar.apply(this, arguments); };
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { if (!this.muted) window.__tocados.push((this.currentSrc || this.src).split('/').pop()); return play.apply(this, arguments); };
    const buscar = window.fetch;
    window.fetch = function (url) { if (String(url).includes('rolo.mp3')) window.__roloPedido = performance.now(); return buscar.apply(this, arguments); };
    const decodificar = BaseAudioContext.prototype.decodeAudioData;
    BaseAudioContext.prototype.decodeAudioData = function () { const p = decodificar.apply(this, arguments); p.then(() => { window.__roloPronto = performance.now(); }, () => {}); return p; };
  });

  // ── A cerimônia ──
  await page.click('[data-sortear]');
  await page.waitForSelector('[data-pagina="cerimonia"] .somBtn', 30000);
  await page.evaluate(() => { const som = document.querySelector('.somBtn'); if (!som.classList.contains('on')) som.click(); });
  await page.waitForSelector('.saltar.on', 30000);
  await espera(1500);
  captura(`${foto}-2-cerimonia`);
  // Ninguém ouve o emulador, mas o relógio do áudio e o próprio Android dizem se o som está saindo. O giro é curto: espera o próximo começar.
  const relogio = await page.evaluate(corpo(`
    const ate = Date.now() + 90000;
    while (!window.__contextoDoRolo && Date.now() < ate) await new Promise((r) => setTimeout(r, 200));
    const c = window.__contextoDoRolo;
    if (!c) return null;
    const a = c.currentTime;
    await new Promise((r) => setTimeout(r, 400));
    return { estado: c.state, andou: c.currentTime - a };`));
  confere(`${r}: o relógio do áudio anda com o rolo`, relogio?.estado === 'running' && relogio.andou > 0.2, JSON.stringify(relogio));
  const tocando = safe(() => shell('dumpsys', 'audio')).split('\n').filter((l) => /state:started/.test(l));
  console.log(`[android] tocadores ativos: ${tocando.length}${tocando[0] ? ` · ${tocando[0].trim().slice(0, 110)}` : ''}`);
  const giro = await page.evaluate(() => document.querySelector('.quem')?.textContent || '');
  confere(`${r}: a cerimônia no idioma`, giro.startsWith(T['cerimonia.girando'].replace('{time}', '').trim().slice(0, 5)), giro);
  await page.waitForSelector('[data-baixar]', 240000);
  await espera(1500);
  const tocados = await page.evaluate(() => window.__tocados);
  const rolo = contaRolo(tocados);
  const pronto = await page.evaluate(() => (window.__roloPronto && window.__roloPedido ? Math.round(window.__roloPronto - window.__roloPedido) : null));
  console.log(`[som] ${r}: rolo pronto em ${pronto} ms; ordem: ${tocados.slice(0, 4).join(', ')}`);
  // A reserva só é aceita quando o rolo passou do prazo de roloPronto (800 ms): é o caminho previsto para aparelho lento, e o giro seguinte volta ao Web Audio.
  confere(`${r}: o rolo toca pelo Web Audio, com clac e jackpot`, rolo.webAudio > 0 && (rolo.reserva === 0 || pronto > 800) && tocados.includes('clac.mp3') && tocados.includes('jackpot.mp3'), `${JSON.stringify(rolo)} em ${tocados.length} toques; pronto em ${pronto} ms`);
  captura(`${foto}-3-resultado`);

  // ── Local e horário ──
  await page.click('[data-editar-jogo]');
  await page.waitForSelector('#jogo-local', 10000);
  await page.evaluate(corpo(`
    const pôr = (sel, valor) => {
      const n = document.querySelector(sel);
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(n, valor);
      n.dispatchEvent(new Event('input', { bubbles: true }));
      n.dispatchEvent(new Event('change', { bubbles: true }));
    };
    pôr('#jogo-local', ${JSON.stringify(LOCAL)});
    pôr('[data-folha] input[type=date]', ${JSON.stringify(DIA)});
    pôr('[data-folha] input[type=time]', ${JSON.stringify(HORA)});`));
  await espera(600);
  captura(`${foto}-4-editar-pelada`);
  const caixas = await page.evaluate(() => { const a = document.querySelector('[data-folha] input[type=date]').parentElement.getBoundingClientRect(); const b = document.querySelector('[data-folha] input[type=time]').parentElement.getBoundingClientRect(); return { vao: b.left - a.right, dia: a.width, hora: b.width }; });
  confere(`${r}: dia e hora sem se comerem (${caixas.vao.toFixed(1)} px entre as caixas)`, caixas.vao >= 10, JSON.stringify(caixas));
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  await page.waitForSelector('[data-jogo-local]', 8000);
  const tela = await page.evaluate(() => ({ local: document.querySelector('[data-jogo-local]')?.innerText.trim(), horario: document.querySelector('[data-jogo-horario]')?.innerText.trim() }));
  confere(`${r}: local e horário na tela: ${tela.horario}`, tela.local === LOCAL && `${tela.local} · ${tela.horario}` === jogoEsperado, JSON.stringify(tela));
  await page.evaluate(() => window.scrollTo(0, 0));
  await espera(600);
  captura(`${foto}-5-tela-com-local`);

  // ── A imagem, que sai do cartaz-*.js ──
  shell(`run-as ${PACOTE} sh -c 'rm -f cache/*.png'`);
  await espera(1200); // a folha que fechou ainda desce
  await page.click('[data-baixar]');
  await page.waitForSelector('[data-formato="todos916"]', 10000);
  await espera(700);
  await page.click('[data-formato="todos916"]');
  // A imagem é pesada para o emulador (medido: 12 a 17 s): espera o arquivo em vez de um tempo fixo, e diz quanto levou.
  const inicioDaImagem = Date.now();
  let pngs = [];
  while (!pngs.length && Date.now() - inicioDaImagem < 90000) {
    pngs = shell('run-as', PACOTE, 'ls', 'cache').split(/\s+/).filter((n) => /\.png$/i.test(n));
    await espera(1000);
  }
  await espera(1500); // o arquivo pode estar acabando de ser escrito
  console.log(`[imagem] ${r}: ${pngs[0] || 'nada'} em ${Math.round((Date.now() - inicioDaImagem - 1500) / 1000)} s`);
  const png = pngs[0] ? adbBin('exec-out', 'run-as', PACOTE, 'cat', `cache/${pngs[0]}`) : Buffer.alloc(0);
  if (png.length) writeFileSync(join(SAIDA, `${foto}-6-imagem.png`), png);
  const ehPng = png.subarray(0, 4).toString('hex') === '89504e47';
  confere(`${r}: a imagem sai em 1080×1920`, ehPng && png.readUInt32BE(16) === 1080 && png.readUInt32BE(20) === 1920, pngs[0] || 'sem arquivo');
  const cartaz = await page.evaluate(corpo(CARTAZ));
  confere(`${r}: cartaz-*.js veio de dentro do app`, cartaz.urls.length > 0 && cartaz.urls.every((u) => u.startsWith(`${cartaz.origem}/assets/`)), cartaz.urls.join(' '));
  const img = await page.evaluate(() => { const d = document.documentElement.dataset; return { jogo: d.ultimaImagemJogo, selo: d.ultimaImagemSelo, nomes: d.ultimaImagemNomes }; });
  confere(`${r}: a imagem leva o local e o horário: ${img.jogo}`, img.jogo === jogoEsperado, JSON.stringify(img));
  confere(`${r}: a imagem leva o selo no idioma e os nomes`, img.selo === seloEsperado && nomes.every((n) => img.nomes.includes(n)), JSON.stringify(img));
  shell('input', 'keyevent', 'KEYCODE_BACK');
  await espera(800);
}

const original = process.env.IDIOMA_ORIGINAL || shell('getprop', 'persist.sys.locale').trim() || shell('getprop', 'ro.product.locale').trim();
console.log(`[aparelho] idioma original: ${original}`);
try { adb('uninstall', PACOTE); } catch { /* não estava instalado */ }
adb('install', '-t', APK);
adb('reverse', 'tcp:8788', 'tcp:8788');
shell('cmd', 'connectivity', 'airplane-mode', 'disable');
const origem = JSON.parse(readFileSync(new URL('ORIGEM.json', SITE), 'utf8'));
console.log(`[pacote] site ${origem.commit.slice(0, 7)}`);

try {
  // ── Controle: Brasil ──
  await idiomaDoAparelho('pt-BR');
  {
    const page = await abrirLimpo();
    const e = await page.evaluate(ESTADO);
    const T = lerIdioma('pt');
    confere('pt-BR: abre em português do Brasil, sem baixar arquivo de idioma nem fonte a mais', e.lang === 'pt-BR' && e.letreiro === T['marca.ferramenta'] && e.arquivos.length === 0 && !e.fontes.some((u) => COREANA.test(u) || LATIN_EXT.test(u)), JSON.stringify(e));
    captura('br-1-inicio');
    page.fechar();
  }

  // ── Portugal ──
  await idiomaDoAparelho('pt-PT');
  {
    const page = await abrirLimpo();
    const e = await page.evaluate(ESTADO);
    const T = lerIdioma('pt-pt');
    confere(`pt-PT: o navegador do app diz ${e.linguas?.[0]}`, e.linguas?.[0] === 'pt-PT', JSON.stringify(e.linguas));
    confere('pt-PT: abre em português de Portugal', e.lang === 'pt-PT' && e.letreiro === T['marca.ferramenta'] && e.slogan === T.slogan && e.botao === T['inicio.sortear'], JSON.stringify(e));
    confere('pt-PT: a legenda de Portugal', e.legenda.includes(T['legenda.goleiro']) && e.legenda.includes(T['legenda.cabeca']), e.legenda);
    confere('pt-PT: o arquivo do idioma veio de dentro do app', e.arquivos.length === 1 && /pt-pt-/.test(e.arquivos[0]) && e.arquivos[0].startsWith(e.origem), e.arquivos.join());
    confere('pt-PT: nenhuma fonte coreana nem latin-ext', !e.fontes.some((u) => COREANA.test(u) || LATIN_EXT.test(u)), e.fontes.join(' '));
    await fluxoCompleto(page, 'pt-PT', { nomes: ['Zanardini', 'Gustavo', 'Higor', 'Miguel', 'Motta', 'Kinho', 'Bruno', 'Caio', 'Diego', 'João'], jogoEsperado: `${LOCAL} · Dom 09h`, seloEsperado: T['selo.sorteado'].toUpperCase(), foto: 'pt-pt', T });
    page.fechar();
  }

  // ── Coreia ──
  await idiomaDoAparelho('ko-KR');
  {
    const page = await abrirLimpo();
    await page.evaluate(() => document.fonts.ready);
    await espera(800);
    const e = await page.evaluate(ESTADO);
    const T = lerIdioma('ko');
    confere(`ko-KR: o navegador do app diz ${e.linguas?.[0]}`, e.linguas?.[0] === 'ko-KR', JSON.stringify(e.linguas));
    confere('ko-KR: abre em coreano', e.lang === 'ko-KR' && e.letreiro === T['marca.ferramenta'] && e.slogan === T.slogan && e.botao === T['inicio.sortear'], JSON.stringify(e));
    confere('ko-KR: o arquivo do idioma veio de dentro do app', e.arquivos.length === 1 && /\/ko-/.test(e.arquivos[0]) && e.arquivos[0].startsWith(e.origem), e.arquivos.join());
    confere('ko-KR: as fontes coreanas saem de dentro do app', e.fontes.some((u) => COREANA.test(u)) && e.fontes.filter((u) => COREANA.test(u)).every((u) => u.startsWith(e.origem)), e.fontes.join(' '));
    confere('ko-KR: a Noto Sans KR foi carregada de fato na Rajdhani e na Inter', e.faces.some((f) => /Rajdhani.*hangul/.test(f)) && e.faces.some((f) => /Inter.*hangul/.test(f)), e.faces.join(' | '));
    const espacamento = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('.rotulo')); return parseFloat(c.letterSpacing) / parseFloat(c.fontSize); });
    confere(`ko-KR: sem espaçamento largo no rótulo (${espacamento.toFixed(2)} em)`, espacamento <= 0.02, String(espacamento));
    await fluxoCompleto(page, 'ko-KR', { nomes: ['김민수', '박지성', '이강인', '손흥민', 'Zanardini', 'Řehoř', 'Šimon Čech', 'Motta', 'Tůma', 'François'], jogoEsperado: `${LOCAL} · 일요일 오전 9시`, seloEsperado: T['selo.sorteado'].toUpperCase(), foto: 'ko', T });
    const cartaoCoreano = await page.evaluate(() => [...document.querySelectorAll('[data-time] .jog .cj__placa')].map((p) => p.dataset.nome));
    confere('ko-KR: o card traz o nome coreano e o tcheco, com os acentos', cartaoCoreano.includes('김민수') && cartaoCoreano.includes('ŘEHOŘ'), cartaoCoreano.join());
    page.fechar();
  }

  // ── Tcheco e francês pelo rodapé, ainda com o aparelho em coreano: os acentos do arquivo à parte, e a escolha guardada ──
  {
    const page = await abrirLimpo();
    await page.click('[data-idioma-atual]');
    await page.click('[data-idioma-opcao="cs"]');
    await page.waitForFunction((x) => document.querySelector('.letreiro')?.textContent === x, lerIdioma('cs')['marca.ferramenta'], 15000);
    await page.evaluate(() => document.fonts.ready);
    await espera(800);
    const e = await page.evaluate(ESTADO);
    confere('rodapé: tcheco, com o latin-ext de dentro do app', e.lang === 'cs-CZ' && e.fontes.some((u) => LATIN_EXT.test(u)) && e.fontes.filter((u) => LATIN_EXT.test(u)).every((u) => u.startsWith(e.origem)) && e.faces.some((f) => /ext/.test(f)), JSON.stringify({ fontes: e.fontes, faces: e.faces }));
    captura('cs-1-inicio');
    await page.click('[data-idioma-atual]');
    await page.click('[data-idioma-opcao="fr"]');
    await page.waitForFunction((x) => document.querySelector('.letreiro')?.textContent === x, lerIdioma('fr')['marca.ferramenta'], 15000);
    const f = await page.evaluate(() => ({ caminho: location.pathname, guardado: localStorage.getItem('futty_sorteio_idioma') }));
    confere('rodapé: escolher francês troca o idioma e guarda', f.caminho === '/fr' && f.guardado === 'fr', JSON.stringify(f));
    page.fechar();
    await espera(8000); // o WebView grava o localStorage em disco uns segundos depois: matar o app antes disso perde a última escolha (medido: 0,5 s perde, 8 s não)
    shell('am', 'force-stop', PACOTE);
    shell('am', 'start', '-n', `${PACOTE}/.MainActivity`);
    const reaberta = await conectar(PACOTE, [], 120000);
    await reaberta.waitForSelector('.letreiro', 60000);
    confere('fechado e reaberto, a escolha do rodapé vale mais que o idioma do aparelho', (await reaberta.evaluate(() => document.querySelector('.letreiro').textContent)) === lerIdioma('fr')['marca.ferramenta'], await reaberta.evaluate(() => document.querySelector('.letreiro').textContent));
    captura('fr-1-inicio');
    reaberta.fechar();
  }

  // ── Sem internet: o idioma e as fontes não dependem de rede ──
  shell('cmd', 'connectivity', 'airplane-mode', 'enable');
  adb('reverse', '--remove', 'tcp:8788');
  await espera(2500);
  {
    const page = await abrirLimpo();
    await page.evaluate(() => document.fonts.ready);
    const e = await page.evaluate(ESTADO);
    confere('modo avião, primeira abertura: coreano com a fonte certa', e.letreiro === lerIdioma('ko')['marca.ferramenta'] && e.faces.some((f) => /hangul/.test(f)) && (await page.evaluate(() => navigator.onLine === false)), e.faces.join(' | '));
    page.fechar();
  }
  shell('cmd', 'connectivity', 'airplane-mode', 'disable');
} finally {
  await idiomaDoAparelho(original.includes('-') ? original : 'pt-BR').catch((erro) => console.log(`[aparelho] não voltou ao idioma original: ${erro.message}`));
}

writeFileSync(join(SAIDA, 'idiomas-resultado.json'), JSON.stringify({ origem, resultados }, null, 2));
const falhas = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - falhas.length}/${resultados.length} conferidos`);
process.exit(falhas.length ? 1 : 0);
