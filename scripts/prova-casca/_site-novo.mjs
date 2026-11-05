// O que as provas do Android e do iPhone perguntam à página sobre o site empacotado. Cada texto é o corpo de uma função assíncrona: o
// DevTools do Android embrulha (corpo()), o robô do iPhone já roda assim. Os mesmos arquivos nos dois lados, porque o que pode quebrar
// aqui é o servidor do WebView: arquivo com ?v=N no endereço e módulo que chega depois da abertura.
import { readFileSync } from 'node:fs';

// A quebra de linha antes do fecho: um texto pode terminar em comentário.
export const corpo = (texto) => `(async () => { ${texto}
 })()`;

export const LOCAL = 'Quadra do Zé';
export const DIA = '2026-11-08'; // um domingo
export const HORA = '09:00';
export const HORARIO_NA_TELA = 'Dom 09h';

// FNV-1a: no capacitor:// o crypto.subtle pode não existir, e aqui só interessa saber se os bytes são os do dist.
const FNV = `(b) => { let h = 2166136261; for (let i = 0; i < b.length; i += 1) { h ^= b[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }`;
const fnv = new Function(`return ${FNV};`)();
export const impressaoDe = (arquivo) => fnv(readFileSync(arquivo));

/** O rolo e a estrela pedidos pelo endereço que o site usa: os bytes, o decodificador do Web Audio e o <audio>, que é a reserva. */
export const RECURSOS_COM_VERSAO = `
  const fnv = ${FNV};
  const baixar = async (url) => { const r = await fetch(url); const b = new Uint8Array(await r.arrayBuffer()); return { status: r.status, bytes: b.length, impressao: fnv(b), tipo: r.headers.get('content-type') }; };
  const rolo = await baixar('/sons/rolo.mp3?v=3');
  const estrela = await baixar('/icones/estrela.svg?v=2');
  const C = window.AudioContext || window.webkitAudioContext;
  const ctx = new C();
  const duracao = await ctx.decodeAudioData(await (await fetch('/sons/rolo.mp3?v=3')).arrayBuffer()).then((a) => a.duration, (e) => 'erro ' + e);
  ctx.close();
  const reserva = await new Promise((res) => {
    const a = new Audio('/sons/rolo.mp3?v=3');
    a.preload = 'auto';
    a.onloadedmetadata = () => res(a.duration);
    a.onerror = () => res('erro ' + (a.error && a.error.code));
    a.load();
    setTimeout(() => res('sem resposta'), 15000);
  });
  return { rolo, estrela, duracao, reserva };`;

/** O SORTEAR aceso: altura, e se as luzes estão mesmo andando. */
export const SORTEAR = `
  const botao = document.querySelector('[data-sortear]');
  const anda = (sel) => { const n = document.querySelector(sel); return n ? n.getAnimations().filter((a) => a.playState === 'running').map((a) => a.animationName) : []; };
  return { altura: botao.getBoundingClientRect().height, reflexo: anda('.sortear__reflexo'), janela: anda('.sortear__janela'), traco: anda('.sortear__traco') };`;

/** Para a luz no meio do botão, só para a foto sair com ela: a luz passa em menos de 1 s, e a captura do aparelho demora isso. Depois volta. */
export const CONGELAR_REFLEXO = `
  for (const a of document.querySelector('.sortear__reflexo').getAnimations()) { a.pause(); a.currentTime = 0.06 * 6000; }`;
export const SOLTAR_REFLEXO = `
  for (const a of document.querySelector('.sortear__reflexo').getAnimations()) a.play();`;

export const LEGENDA = `
  const nivel = document.querySelector('[data-nivel]');
  const ic = nivel.querySelector('.ic');
  return { texto: nivel.innerText.replace(/\\s+/g, ' ').trim(), mascara: ic.style.getPropertyValue('--m').replace(/\\\\/g, ''), interruptor: !!nivel.querySelector('input[type=checkbox]') }; // o WebKit devolve o endereço com barras de escape`;

export const PREENCHER_JOGO = `
  const pôr = (sel, valor) => {
    const n = document.querySelector(sel);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(n, valor);
    n.dispatchEvent(new Event('input', { bubbles: true }));
    n.dispatchEvent(new Event('change', { bubbles: true }));
  };
  pôr('#jogo-local', ${JSON.stringify(LOCAL)});
  pôr('[data-folha] input[type=date]', ${JSON.stringify(DIA)});
  pôr('[data-folha] input[type=time]', ${JSON.stringify(HORA)});
  return document.querySelector('[data-folha]').getAttribute('aria-label');`;

export const JOGO_NA_TELA = `
  return { local: document.querySelector('[data-jogo-local]')?.innerText.trim() || '', horario: document.querySelector('[data-jogo-horario]')?.innerText.trim() || '' };`;

// A 7ª combinação pronta do editor (COMBINACOES, em src/sorteio/uniforme.js do site): a mesma do exemplo da Pelada do Chavo.
export const COMBO_VERDE_E_BRANCO = '[data-combos] .combo:nth-child(7) button';

/** O que ficou guardado para o time 1: é daqui que a tela, a imagem e o link leem o uniforme. */
export const KIT_DO_TIME = `
  const atual = localStorage.getItem('futty_sorteio_atual');
  const s = JSON.parse(localStorage.getItem('futty_sorteio_guardados')).find((x) => x.id === atual);
  return { cor: s.cores[0], padrao: s.uniformes?.[0]?.padrao, cor2: s.uniformes?.[0]?.cor2 };`;

/** O cartaz chega depois da abertura: tem de ter vindo de dentro do app. */
export const CARTAZ = `
  const e = performance.getEntriesByType('resource').map((x) => x.name).filter((n) => /\\/assets\\/cartaz-[^/]+\\.js/.test(n));
  return { urls: e, origem: location.origin };`;

/** Quantas vezes o rolo entrou pelo Web Audio. A reserva aparece no <audio> com o ?v=N no nome. */
export const contaRolo = (nomes) => ({ webAudio: nomes.filter((n) => n === 'rolo.mp3').length, reserva: nomes.filter((n) => n.startsWith('rolo.mp3?')).length });
