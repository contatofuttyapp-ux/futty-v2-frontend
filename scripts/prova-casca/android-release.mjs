#!/usr/bin/env node
// Prova do APK de release assinado, o mesmo código do .aab. Serve para pegar o que só aparece com o R8 ligado (plugin sumido, tela em
// branco). Sem DevTools aqui: toca na tela por adb, achando os botões na árvore de acessibilidade.
//
// A parte de sortear roda em modo avião de propósito: online, o release fala com futtyapp.com.br de verdade, e prova não encosta em produção.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [APK, SAIDA] = process.argv.slice(2);
mkdirSync(SAIDA, { recursive: true });
const PACOTE = 'com.futty.app';
const adb = (...a) => execFileSync('adb', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1048576, timeout: 90000 });
const shell = (...a) => adb('shell', ...a);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const captura = (nome) => writeFileSync(join(SAIDA, `${nome}.png`), execFileSync('adb', ['exec-out', 'screencap', '-p'], { maxBuffer: 64 * 1048576, timeout: 60000 }));
const topo = () => shell('dumpsys', 'activity', 'activities').split('\n').find((l) => /topResumedActivity/.test(l)) || '';
const appNaFrente = () => topo().includes(PACOTE);
const folhaDoSistema = () => /intentresolver|ChooserActivity/i.test(topo());

let falhas = 0;
function confere(nome, ok, detalhe = '') {
  if (!ok) falhas += 1;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome}${detalhe ? ` · ${detalhe}` : ''}`);
}

function arvore() {
  for (let i = 0; i < 4; i += 1) {
    try {
      shell('uiautomator', 'dump', '/sdcard/tela.xml');
      return shell('cat', '/sdcard/tela.xml');
    } catch { /* a tela animada às vezes não fica ociosa a tempo */ }
  }
  return '';
}

async function acharNo(padrao, ms = 40000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    for (const m of arvore().matchAll(/<node [^>]*>/g)) {
      const texto = /text="([^"]*)"/.exec(m[0])?.[1] || '';
      const desc = /content-desc="([^"]*)"/.exec(m[0])?.[1] || '';
      if (padrao.test(texto) || padrao.test(desc)) {
        const b = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(m[0]);
        if (b && Number(b[3]) > Number(b[1])) return { x: (Number(b[1]) + Number(b[3])) >> 1, y: (Number(b[2]) + Number(b[4])) >> 1, texto };
      }
    }
    await espera(800);
  }
  return null;
}

async function tocar(padrao, ms) {
  const no = await acharNo(padrao, ms);
  if (!no) throw new Error(`não achei na tela: ${padrao}`);
  shell('input', 'tap', String(no.x), String(no.y));
  return no;
}

try { adb('uninstall', PACOTE); } catch { /* não estava instalado */ }
adb('install', APK);

// Online: só abrir. Nenhum toque, nenhum evento do site, só o que o próprio app faz sozinho.
shell('cmd', 'connectivity', 'airplane-mode', 'disable');
await espera(3000);
shell('logcat', '-c');
shell('am', 'start', '-n', `${PACOTE}/.MainActivity`);
const titulo = await acharNo(/SORTEIO DE TIMES/i);
confere('o release abre no início do sorteio (R8 ligado)', !!titulo && appNaFrente());
await espera(9000);
captura('r1-inicio');
const log = shell('logcat', '-d');
const displayed = /Displayed [^ ]*MainActivity[^+]*\+(?:(\d+)s)?(\d+)ms/.exec(log);
console.log(`[tempo] release, Android "Displayed": ${displayed ? Number(displayed[1] || 0) * 1000 + Number(displayed[2]) : '?'} ms`);
const logCapgo = log.split('\n').filter((l) => /CapgoUpdater/.test(l));
confere('Capgo: canal sorteio sem nada para baixar', logCapgo.some((l) => /No new version available/.test(l)) && !logCapgo.some((l) => /Downloading|New bundle|"id":"(?!builtin)/.test(l)), logCapgo.filter((l) => /No new version|Check for update via/.test(l)).map((l) => l.replace(/^.*CapgoUpdater: \S+ /, '').slice(0, 70)).join(' · '));
const erros = log.split('\n').filter((l) => /FATAL EXCEPTION|ClassNotFound|PluginLoadException|Unable to load plugin/i.test(l));
confere('sem plugin perdido pelo R8 nem exceção fatal', erros.length === 0, erros.slice(0, 2).join(' ').slice(0, 200));

// Modo avião: o caminho inteiro por toque.
shell('cmd', 'connectivity', 'airplane-mode', 'enable');
await espera(3000);
shell('am', 'force-stop', PACOTE);
shell('am', 'start', '-n', `${PACOTE}/.MainActivity`);
await acharNo(/SORTEIO DE TIMES/i);
// O campo da lista não tem texto na árvore: o toque vai logo abaixo do rótulo dele.
const rotulo = await acharNo(/COLE AQUI/i);
shell('input', 'tap', String(rotulo.x), String(rotulo.y + 120));
await espera(1500);
for (const nome of ['Ana', 'Bia', 'Caio', 'Duda', 'Edu', 'Fabi', 'Gui', 'Hugo', 'Iara', 'Joao']) {
  shell('input', 'text', nome);
  shell('input', 'keyevent', 'KEYCODE_ENTER');
}
await espera(1500);
// Com o teclado aberto o Voltar só fecha o teclado; sem ele, sairia do app.
if (/mInputShown=true/.test(shell('dumpsys', 'input_method'))) shell('input', 'keyevent', 'KEYCODE_BACK');
await espera(1500);
captura('r1b-lista-digitada');
// Com os cartões dos jogadores, o Sortear fica abaixo da dobra.
for (let i = 0; i < 6; i += 1) {
  const no = await acharNo(/^SORTEAR$/i, 2500);
  if (no && no.y > 200 && no.y < 1450) break;
  shell('input', 'swipe', '360', '1300', '360', '500', '250');
  await espera(800);
}
await tocar(/^SORTEAR$/i);
const pular = await acharNo(/pular/i, 30000);
confere('modo avião: a lista digitada sorteia e a cerimônia roda', !!pular);
captura('r2-cerimonia');
shell('input', 'keyevent', 'KEYCODE_BACK');
await espera(1500);
confere('Voltar na cerimônia não fecha o app', appNaFrente());
const baixar = await acharNo(/BAIXAR IMAGEM/i, 120000);
confere('modo avião: a cerimônia chega ao resultado', !!baixar);
captura('r3-resultado');
await tocar(/BAIXAR IMAGEM/i);
await tocar(/quadrada/i, 15000);
const fim = Date.now() + 25000;
while (!folhaDoSistema() && Date.now() < fim) await espera(400);
await espera(1500);
captura('r4-baixar-imagem');
confere('modo avião: Baixar imagem abre a folha nativa no release', folhaDoSistema(), topo().trim());
shell('input', 'keyevent', 'KEYCODE_BACK');
await espera(2500);
const compartilhar = await acharNo(/Compartilhar/i, 15000);
shell('input', 'tap', String(compartilhar.x), String(compartilhar.y));
const aviso = await acharNo(/Sem internet pra criar o link/i, 15000);
captura('r5-sem-internet');
confere('modo avião: Compartilhar avisa no release', !!aviso && !folhaDoSistema(), aviso?.texto || '');
shell('cmd', 'connectivity', 'airplane-mode', 'disable');
process.exit(falhas ? 1 : 0);
