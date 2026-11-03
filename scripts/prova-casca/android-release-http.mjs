#!/usr/bin/env node
// O HTTP nativo vive no APK de release? O modo avião não responde a isso: "Sem internet" sairia igual com o plugin perdido pelo R8. Aqui o
// APK é de release, mas com a API apontando para example.com (empacotar-sorteio.mjs --api https://example.com, nunca para a loja): quem
// responde não é a produção. Com o HTTP vivo, o pedido sai, o servidor diz que /api/links não existe e o site mostra o erro de link, e não
// o de internet. A captura de pacotes mostra o example.com.
import { execFileSync } from 'node:child_process';

const [APK] = process.argv.slice(2);
const PACOTE = 'com.futty.app';
const adb = (...a) => execFileSync('adb', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1048576, timeout: 90000 });
const shell = (...a) => adb('shell', ...a);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function arvore() {
  for (let i = 0; i < 4; i += 1) {
    try { shell('uiautomator', 'dump', '/sdcard/tela.xml'); return shell('cat', '/sdcard/tela.xml'); } catch { /* tela animada */ }
  }
  return '';
}
async function acharNo(padrao, ms = 40000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    for (const m of arvore().matchAll(/<node [^>]*>/g)) {
      const texto = /text="([^"]*)"/.exec(m[0])?.[1] || '';
      if (padrao.test(texto)) {
        const b = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(m[0]);
        if (b && Number(b[3]) > Number(b[1])) return { x: (Number(b[1]) + Number(b[3])) >> 1, y: (Number(b[2]) + Number(b[4])) >> 1, texto };
      }
    }
    await espera(600);
  }
  return null;
}
async function tocar(padrao, ms) {
  const no = await acharNo(padrao, ms);
  if (!no) throw new Error(`não achei na tela: ${padrao}`);
  shell('input', 'tap', String(no.x), String(no.y));
}

try { adb('uninstall', PACOTE); } catch { /* não estava instalado */ }
adb('install', APK);
shell('cmd', 'connectivity', 'airplane-mode', 'disable');
await espera(9000);
shell('am', 'start', '-n', `${PACOTE}/.MainActivity`);
const rotulo = await acharNo(/COLE AQUI/i);
await espera(4000);
shell('input', 'tap', String(rotulo.x), String(rotulo.y + 120));
await espera(1500);
for (const nome of ['Ana', 'Bia', 'Caio', 'Duda', 'Edu', 'Fabi', 'Gui', 'Hugo', 'Iara', 'Joao']) {
  shell('input', 'text', nome);
  shell('input', 'keyevent', 'KEYCODE_ENTER');
}
await espera(1500);
if (/mInputShown=true/.test(shell('dumpsys', 'input_method'))) shell('input', 'keyevent', 'KEYCODE_BACK');
await espera(1500);
for (let i = 0; i < 6; i += 1) {
  const no = await acharNo(/^SORTEAR$/i, 2500);
  if (no && no.y > 200 && no.y < 1450) break;
  shell('input', 'swipe', '360', '1300', '360', '500', '250');
  await espera(800);
}
await tocar(/^SORTEAR$/i);
await acharNo(/BAIXAR IMAGEM/i, 120000);
await espera(2500);
await tocar(/^Compartilhar$/i, 15000);
const aviso = await acharNo(/criar o link/i, 30000);
const respondeu = !!aviso && /Não deu/i.test(aviso.texto);
console.log(`${respondeu ? 'OK  ' : 'FALHA'} o HTTP nativo vive no release: o servidor respondeu e o site avisou · "${aviso?.texto || 'sem aviso'}"`);
process.exit(respondeu ? 0 : 1);
