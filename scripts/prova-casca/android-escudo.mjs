#!/usr/bin/env node
// Segunda parte da prova do Android: o escudo do time (sobe pelo HTTP nativo, volta como blob: na tela do link e entra na imagem sem
// contaminar o canvas) e o "Copiar texto" com o link público. Mesmas condições de android.mjs: APK de debug e a cópia local do site.
import { execFileSync } from 'node:child_process';
import { conectar } from './_webview.mjs';

const PACOTE = 'com.futty.app';
const adb = (...a) => execFileSync('adb', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 });
const shell = (...a) => adb('shell', ...a);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const topo = () => shell('dumpsys', 'activity', 'activities').split('\n').find((l) => /topResumedActivity/.test(l)) || '';
const folhaDoSistema = () => /intentresolver|ChooserActivity/i.test(topo());

let falhas = 0;
function confere(nome, ok, detalhe = '') {
  if (!ok) falhas += 1;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome}${detalhe ? ` · ${detalhe}` : ''}`);
}

adb('reverse', 'tcp:8788', 'tcp:8788');
shell('am', 'force-stop', PACOTE);
shell('am', 'start', '-n', `${PACOTE}/.MainActivity`);
const p = await conectar(PACOTE, []);
await p.waitForSelector('#lista', 60000);
await p.fill('#lista', ['Ana', 'Bia', 'Cau', 'Duda', 'Edu', 'Fabi', 'Gui', 'Hugo', 'Iara', 'Joao'].join('\n'));
await p.evaluate(() => document.querySelector('#lista').blur());
await p.waitForSelector('[data-sortear]:not([disabled])', 15000);
await p.click('[data-sortear]');
await p.waitForSelector('.saltar.on', 30000);
await p.evaluate(() => document.querySelector('.saltar.on button').click());
await p.waitForSelector('[data-baixar]', 60000);

// Um escudo de verdade, como se a pessoa tivesse escolhido o arquivo no seletor do sistema.
await p.evaluate(async () => {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#c0392b'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#fff'; g.fillRect(64, 64, 128, 128);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const input = document.querySelector('[data-arquivo-escudo]');
  const dt = new DataTransfer();
  dt.items.add(new File([blob], 'escudo.png', { type: 'image/png' }));
  // O seletor do sistema não abre na prova: o toque marca o time, e o arquivo chega direto no campo.
  const clique = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function () { if (this.type !== 'file') clique.call(this); };
  document.querySelector('[data-escudo="0"]').click();
  HTMLInputElement.prototype.click = clique;
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
});
const temEscudo = await p.waitForFunction(() => !!document.querySelector('img[src^="data:image"]'), undefined, 15000).catch(() => false);
confere('o escudo entrou no sorteio', temEscudo);
await espera(400);

// Compartilhar: o escudo sobe pelo PUT nativo antes do link.
await p.click('[data-copiar-link]');
const fim = Date.now() + 30000;
while (!folhaDoSistema() && Date.now() < fim) await espera(300);
await espera(1200);
shell('uiautomator', 'dump', '/sdcard/tela.xml');
const codigo = /futtyapp\.com\.br\/s\/([A-Z0-9]{6})/.exec(shell('cat', '/sdcard/tela.xml'))?.[1];
confere('o link com escudo foi criado', !!codigo, codigo || '');
shell('input', 'keyevent', 'KEYCODE_BACK');
await espera(1500);

// Copiar texto: a mesma tela, agora com link no sorteio.
await p.click('[data-copiar-texto]');
await espera(800);
const aviso = await p.evaluate(() => document.querySelector('[data-toast]')?.textContent || '');
// O WebView não deixa a página ler a área de transferência: a conferência é colar de verdade, com a tecla Colar do Android.
await p.evaluate(() => {
  const campo = document.createElement('textarea');
  campo.id = 'prova-colar';
  campo.style.cssText = 'position:fixed;top:40%;left:5%;width:90%;height:20%;z-index:99999';
  document.body.appendChild(campo);
  campo.focus();
});
await espera(500);
shell('input', 'keyevent', 'KEYCODE_PASTE');
await espera(1000);
const colado = await p.evaluate(() => { const c = document.getElementById('prova-colar'); const v = c.value; c.remove(); return v; });
confere('Copiar texto leva o link público', /futtyapp\.com\.br\/s\//.test(colado) && !/localhost/.test(colado), `aviso "${aviso}" · ${String(colado).split('\n').filter((l) => /\/s\//.test(l)).join(' ') || `colou ${colado.length} letras`}`);

// O link abre no app com o escudo vindo do servidor, e a imagem gerada dali não quebra.
if (codigo) {
  shell('am', 'start', '-a', 'android.intent.action.VIEW', '-c', 'android.intent.category.BROWSABLE', '-d', `https://futtyapp.com.br/s/${codigo}`, PACOTE);
  await p.waitForFunction((c) => location.pathname === `/s/${c}`, codigo, 15000);
  await espera(1500);
  await p.evaluate(() => document.querySelector('.saltar.on button')?.click());
  await p.waitForFunction(() => [...document.images].some((i) => i.src.startsWith('blob:') && i.complete && i.naturalWidth > 0), undefined, 20000).catch(() => {});
  const imgs = await p.evaluate(() => [...document.images].filter((i) => i.src.startsWith('blob:')).map((i) => `${i.naturalWidth}×${i.naturalHeight}`));
  const quebradas = await p.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')));
  confere('o escudo volta do servidor e aparece', imgs.length > 0 && quebradas.length === 0, `${imgs.join(', ')} · quebradas: ${quebradas.length}`);
  const baixar = await p.evaluate(() => !!document.querySelector('[data-baixar]'));
  if (baixar) {
    shell(`run-as ${PACOTE} sh -c 'rm -f cache/*.png'`);
    await p.click('[data-baixar]');
    await p.click('[data-formato="todos11"]');
    const limite = Date.now() + 25000;
    while (!folhaDoSistema() && Date.now() < limite) await espera(300);
    confere('a imagem do link, com escudo, é gerada', folhaDoSistema());
    shell('input', 'keyevent', 'KEYCODE_BACK');
  }
}
process.exit(falhas ? 1 : 0);
