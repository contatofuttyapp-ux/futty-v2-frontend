#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// GERADOR DOS SONS DO SORTEIO — Rodada 16A (17-set-2026; nasceu na 14A, 16-set)
//
// Direito autoral 100% nosso: cada efeito nasce AQUI, em código. Nenhum arquivo
// baixado, nenhuma biblioteca de áudio, nenhuma IA de música. A semente é fixa,
// então rodar de novo devolve exatamente os mesmos arquivos.
//
//   node scripts/gerar-sons.mjs
//
// Caminho: síntese em Float32 (mono, 44,1 kHz) → WAV 16 bits → ffmpeg-static
// (já nas devDependencies) → MP3 96 kbps. A receita de cada som está em SONS.md,
// na raiz do frontend — é o registro de autoria.
//
// O que a 16A mudou (avaliação do dono no aparelho, build 24):
//   • TIQUE — o lado digital quase não aparecia. Agora são duas camadas em pé de
//     igualdade: o clique mecânico (como estava) e um tom de TECLA de videogame
//     a -6 dB dele, 1,6 / 1,9 / 2,2 kHz conforme a variante.
//   • JACKPOT — o "tan tan tan tan" descia de tom no fim e soava a derrota.
//     Lei nova: no jackpot NADA desce; toda frase sobe ou fica. Foi rearranjado
//     e a prova sai em gráfico (scripts/prova-tom.mjs) — se a linha descer, esta
//     geração FALHA.
//   • CLAC — inalterado, e de propósito: a semente continua a mesma e cada tique
//     consome exatamente as mesmas 46 tiragens de antes, então o clac sai
//     bit a bit igual ao da 14A.
//
// RODADA 29H-B (2-out-2026): os três efeitos estão perfeitos e NÃO mudam — a lei
// de 16-set fica (sem música, sem v2). Entra só um 4º efeito. A 1ª tentativa (a
// ALAVANCA: puxada + catraca + engate, 720 ms, v1/v2) foi REPROVADA pelo dono
// pelo "sopro agudo" (o whoosh do braço descendo). Decisão final (2-out, noite):
// a MECÂNICA DA MÁQUINA — uma camada discreta que toca ENQUANTO os rolos giram e
// some quando o último trava, em loop, a −10 dB do tique, mais um ENGATE curto
// (≤ 0,3 s) no instante em que o giro começa. Timbre medido numa referência do
// dono (não se usa o arquivo, é licenciado; sintetiza-se): cliques metálicos
// curtos e secos a ~11 por segundo (intervalo ~90 ms, ±10 ms para não soar
// robótico), energia principal entre 1 e 8 kHz (agulha/engrenagem), um "tum"
// leve por baixo entre 150 e 400 Hz a cada clique; SEM whoosh, SEM sopro, SEM
// ruído contínuo de ar. Três variantes para o dono ouvir, em
// scripts/capturas/rodada-29h/ (v1 só cliques; v2 cliques + tum; v3 a v2 a
// ~13/s), cada uma um trecho de 3 s em loop; a v2 é a que o app toca
// (public/sons/mecanica.mp3). Os cinco de sempre nascem ANTES, na mesma semente,
// e este script CONFERE por MD5 que continuam bit a bit iguais (ASSINATURAS).
// Cada mecânica é MEDIDA no MP3 pronto (cadência, bandas, silêncio entre
// cliques) e a geração FALHA se sair da régua do dono.
// ═══════════════════════════════════════════════════════════════════════════════
import { writeFileSync, statSync, mkdirSync, unlinkSync, readFileSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpeg from 'ffmpeg-static';
import { lerMp3, serieDeTom, desenharGrafico, fft } from './prova-tom.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const DESTINO = path.join(RAIZ, 'public', 'sons');
const CAPTURAS = path.join(AQUI, 'capturas');
const CAPTURAS_29H = path.join(CAPTURAS, 'rodada-29h'); // as 3 variantes da mecânica, para o dono ouvir

// Os cinco de sempre, selados (16A). A mecânica e o engate nascem depois deles; se algum destes mudar, a geração FALHA.
const ASSINATURAS = {
  'tique-1': 'b17ecfcd958ecd2dff4b54fd77d1847d',
  'tique-2': '655a349ac7633f5150e50face398368e',
  'tique-3': '0d5bca1fcd34cff2f4d6ac9ff24b425d',
  clac: 'b06c5105d9d17b9355c436f3aff5ce41',
  jackpot: '7c4e3e14b78151f521df24e375bf74bf',
};
const ENGATE_MAX_SEG = 0.3;  // lei do dono (29H-B, 2ª decisão): o engate em até 0,3 s — como o aparelho o mede
const MECANICA_SEG = 3.0;    // o trecho em loop

const TAXA = 44100;      // Hz
// Lei do app leve: 96 kbps. Os degraus abaixo existem só para o jackpot: a 96
// kbps cabem 3,41 s em 40 KB, e o jackpot precisa de 3,6 s para respirar — o
// teto de tamanho é duro, a taxa cede primeiro. Mesmo no degrau mais baixo
// estes arquivos são MONO: 64 kbps num canal é mais bits por canal do que os
// 96 kbps ESTÉREO (48 por canal) de todo som que o app já usava.
const DEGRAUS = ['96k', '80k', '64k'];
const TETO_BYTES = 40 * 1024;
const SEMENTE = 14021606; // fixa desde a 14A — é o que torna isto reproduzível

// ── ferramentas de síntese ────────────────────────────────────────────────────

/** Mulberry32 — o mesmo gerador que a cerimônia usa para o baralho. */
function mulberry32(a) {
  return function proximo() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const criar = (seg) => new Float32Array(Math.round(seg * TAXA));

function somar(destino, fonte, inicioSeg, ganho = 1) {
  const off = Math.round(inicioSeg * TAXA);
  for (let i = 0; i < fonte.length; i += 1) {
    const j = off + i;
    if (j >= 0 && j < destino.length) destino[j] += fonte[i] * ganho;
  }
}

const pico = (buf) => {
  let p = 0;
  for (let i = 0; i < buf.length; i += 1) p = Math.max(p, Math.abs(buf[i]));
  return p;
};

/** Passa-banda biquad (receita RBJ) — é o que dá "corpo" ao ruído branco. */
function passaBanda(entrada, f0, q) {
  const w0 = (2 * Math.PI * f0) / TAXA;
  const alpha = Math.sin(w0) / (2 * q);
  const a0 = 1 + alpha;
  const b0 = alpha / a0, b2 = -alpha / a0;
  const a1 = (-2 * Math.cos(w0)) / a0, a2 = (1 - alpha) / a0;
  const saida = new Float32Array(entrada.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < entrada.length; i += 1) {
    const x0 = entrada[i];
    const y0 = b0 * x0 + b2 * x2 - a1 * y1 - a2 * y2;
    saida[i] = y0;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
  }
  return saida;
}

function ruido(seg, rnd) {
  const b = criar(seg);
  for (let i = 0; i < b.length; i += 1) b[i] = rnd() * 2 - 1;
  return b;
}

/**
 * Um sino: fundamental + harmônicos + um parcial INARMÔNICO (4,2×).
 * O inarmônico é o que separa "sino" de "flauta" — metal vibra fora da série
 * harmônica. Cada parcial decai mais rápido que o de baixo, como no metal real.
 */
function sino(seg, f, { brilho = 1, curva = 4.5 } = {}) {
  const parciais = [
    [1.0, 1.00, 1.00],
    [2.0, 0.45 * brilho, 1.35],
    [3.0, 0.22 * brilho, 1.80],
    [4.2, 0.14 * brilho, 2.40],
    [5.4, 0.08 * brilho, 3.00],
  ];
  const b = criar(seg);
  for (let i = 0; i < b.length; i += 1) {
    const t = i / TAXA;
    let v = 0;
    for (const [m, g, d] of parciais) {
      v += g * Math.sin(2 * Math.PI * f * m * t) * Math.exp((-curva * d * t) / seg);
    }
    b[i] = v;
  }
  return b;
}

/**
 * Voz de videogame — a que grita "passou de fase".
 * Quadrada de 25% de ciclo (o timbre nasal de chip) somada a uma triangular,
 * mas a quadrada entra por harmônicos ímpares LIMITADOS (3º e 5º), não pela
 * onda crua: assim a fundamental continua sendo a nota mais forte do espectro.
 * Isso não é enfeite — é o que faz a prova de tom medir a NOTA e não o 3º
 * harmônico, e é o que mantém a frase legível no altofalante do celular.
 */
function vozChip(seg, f, { ataque = 0.002, queda = null } = {}) {
  const b = criar(seg);
  const tau = queda ?? seg / 3;
  for (let i = 0; i < b.length; i += 1) {
    const t = i / TAXA;
    const w = 2 * Math.PI * f * t;
    // quadrada 25% aproximada: ímpares com peso decrescente, fundamental dona
    const quadrada = Math.sin(w) + 0.30 * Math.sin(3 * w) + 0.15 * Math.sin(5 * w);
    // triangular pela série (ímpares em 1/n², sinal alternado)
    const tri = Math.sin(w) - Math.sin(3 * w) / 9 + Math.sin(5 * w) / 25;
    const env = Math.min(1, t / ataque) * Math.exp(-t / tau) * (1 - t / seg);
    b[i] = (0.72 * quadrada + 0.45 * tri) * env;
  }
  return b;
}

// ── os três efeitos ───────────────────────────────────────────────────────────

/**
 * TIQUE (~60 ms) — o rolo da slot machine passando um símbolo.
 * DUAS camadas em pé de igualdade, que é o pedido do dono na 16A:
 *   1) máquina — o clique de impulso filtrado na faixa mecânica (2,6-3,45 kHz);
 *   2) videogame — um tom de TECLA (quadrada + triangular) de 1,6 / 1,9 / 2,2 kHz,
 *      30 ms, ataque instantâneo, a -6 dB do pico do clique.
 * As 3 variantes mudam as duas camadas juntas, para o trem de tiques não soar
 * de máquina de escrever elétrica.
 */
function gerarTique(variante, rnd) {
  const DUR = 0.060;
  const buf = criar(DUR);

  // 1) o clique: 1 ms de impulso → passa-banda na faixa mecânica → decai em ~7 ms
  const centro = [2600, 3000, 3450][variante] * (0.97 + rnd() * 0.06);
  const impulso = criar(DUR);
  const nImp = Math.round(0.001 * TAXA);
  for (let i = 0; i < nImp; i += 1) impulso[i] = (rnd() * 2 - 1) * (1 - i / nImp);
  const clique = passaBanda(impulso, centro, 1.1);
  for (let i = 0; i < buf.length; i += 1) {
    buf[i] += clique[i] * Math.exp((-i / TAXA) / 0.007) * 1.6;
  }
  const picoClique = pico(buf);

  // 2) o tom de tecla: 30 ms, ataque instantâneo (uma amostra), cauda de 7 ms.
  // Mistura meio a meio quadrada e triangular — é o "bip" de console por cima
  // do clique de metal. Amplitude = metade do pico do clique, ou seja -6 dB.
  const fTecla = [1600, 1900, 2200][variante] * (0.995 + rnd() * 0.01);
  const nTecla = Math.round(0.030 * TAXA);
  for (let i = 0; i < nTecla; i += 1) {
    const t = i / TAXA;
    const w = 2 * Math.PI * fTecla * t;
    const quadrada = Math.sin(w) >= 0 ? 1 : -1;
    const tri = (2 / Math.PI) * Math.asin(Math.sin(w));
    // cauda de 7 ms: o tom é quatro vezes mais longo que o clique, então a -6 dB
    // de PICO ele ainda sobe muito em energia — a cauda curta é o que mantém o
    // clique de metal por cima, em vez de um bip solto.
    const env = Math.exp(-t / 0.007) * (1 - i / nTecla);
    buf[i] += (0.5 * quadrada + 0.5 * tri) * picoClique * 0.5 * env;
  }
  return buf;
}

/**
 * CLAC (~120 ms) — o rolo TRAVANDO, quando o jogador aparece.
 * Peso primeiro (seno varrendo 90 → 60 Hz: a massa parando), metal por cima
 * (clique curto em 5,2 kHz: a trava encaixando). Intocado desde a 14A.
 */
function gerarClac(rnd) {
  const DUR = 0.120;
  const buf = criar(DUR);

  // 1) o "thunk": fase acumulada, senão a varredura estala na emenda
  let fase = 0;
  for (let i = 0; i < buf.length; i += 1) {
    const t = i / TAXA;
    const f = 90 + (60 - 90) * (t / DUR);
    fase += (2 * Math.PI * f) / TAXA;
    buf[i] += Math.sin(fase) * Math.exp(-t / 0.038);
  }

  // 2) o clique metálico da trava
  const cli = passaBanda(ruido(0.012, rnd), 5200, 0.9);
  for (let i = 0; i < cli.length; i += 1) {
    buf[i] += cli[i] * Math.exp((-i / TAXA) / 0.0035) * 0.85;
  }
  return buf;
}

/**
 * Uma moeda caindo — agora com o tom MANDADO de fora (nunca sorteado para
 * baixo): ruído em passa-banda estreito no tom pedido mais o tilintar tonal.
 */
function moeda(f, rnd) {
  const DUR = 0.055;
  const fil = passaBanda(ruido(DUR, rnd), f, 5);
  const b = criar(DUR);
  for (let i = 0; i < b.length; i += 1) {
    const t = i / TAXA;
    b[i] = fil[i] * Math.exp(-t / 0.009) * 1.5
         + Math.sin(2 * Math.PI * f * t) * 0.40 * Math.exp(-t / 0.014);
  }
  return b;
}

/**
 * JACKPOT (3,6 s) — a slot machine que ACABOU de dar prêmio, e que NUNCA desce.
 *
 * Quatro movimentos, cada um mais agudo que o anterior — a linha do gráfico é
 * uma escada que só sobe:
 *   A) 0,00-0,50  arpejo de sinos C5→G6 (o da 14A, com as caudas graves mais
 *                 curtas: cauda comprida no grave faz o tom "voltar para trás");
 *   B) 0,00-1,35  a voz de videogame por cima, nas mesmas notas, terminando em
 *                 C7 SEGURADA — é ela que sustenta o tom entre o arpejo e a chuva;
 *   C) 1,20-2,70  chuva de moedas ASCENDENTE: o tom de cada impacto sai do
 *                 instante (2,5 → 6 kHz), nunca de sorteio, e a densidade cresce
 *                 até o fim da cascata;
 *   D) 2,55-3,60  fecho: varredura de uma oitava para CIMA (G7→G8) e acorde de
 *                 Dó maior brilhante, com a quinta três oitavas acima (G8) a
 *                 segurar o brilho — o acorde sustenta sem puxar o tom para baixo.
 */
function gerarJackpot(rnd) {
  const DUR = 3.6;
  const buf = criar(DUR);

  // A) arpejo ascendente C5-E5-G5-C6-E6-G6, 90 ms entre notas, subindo em volume.
  // Caudas CURTAS e cada vez mais curtas (0,46 → 0,31 s): na 14A o sino de uma
  // nota velha continuava a soar depois de a frase já ter subido, e o tom
  // "voltava para trás" — era metade do que o dono ouviu como derrota.
  const NOTAS = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
  NOTAS.forEach((f, i) => {
    somar(buf, sino(0.46 - i * 0.03, f, { curva: 3.8 }), i * 0.090, 0.40 + i * 0.058);
  });

  // B) a voz de videogame: as mesmas seis notas, staccato, e o C7 segurado.
  NOTAS.forEach((f, i) => {
    somar(buf, vozChip(0.085, f, { queda: 0.055 }), i * 0.090, 0.30 + i * 0.045);
  });
  somar(buf, vozChip(0.86, 2093.00, { queda: 0.42 }), 0.54, 0.62);

  // C) chuva de moedas — 40 impactos de 1,20 s a 2,70 s.
  // O tom sobe com o instante (2,5 → 6 kHz, em oitavas iguais no tempo) e a
  // densidade cresce: os instantes vêm da CDF inversa de uma densidade linear
  // crescente (x = √u), então cada moeda cai mais perto da seguinte.
  const MOEDAS = 46, T0 = 1.20, T1 = 2.70, F0 = 2500, F1 = 6000;
  for (let i = 0; i < MOEDAS; i += 1) {
    const u = (i + 0.5) / MOEDAS;
    const x = Math.sqrt(u);
    const f = F0 * (F1 / F0) ** x;
    somar(buf, moeda(f, rnd), T0 + (T1 - T0) * x, 0.62 + 0.40 * x);
  }

  // D) o fecho. Primeiro a varredura: uma oitava para cima em 150 ms (G7→G8),
  // com a fase acumulada (uma varredura ingênua estala na emenda).
  const nVar = Math.round(0.150 * TAXA);
  const varredura = criar(0.150);
  let fase = 0;
  for (let i = 0; i < nVar; i += 1) {
    const x = i / nVar;
    const f = 3135.96 * 2 ** x;
    fase += (2 * Math.PI * f) / TAXA;
    // de propósito discreta: ela passa POR BAIXO da chuva, que nesse instante
    // já está nos 5,5 kHz. Mais alta do que isto e o tom dominante cairia dos
    // 5,5 kHz da chuva para os 3,1 kHz do início da varredura.
    varredura[i] = (Math.sin(fase) + 0.25 * Math.sin(3 * fase)) * Math.min(1, x * 6) * 0.20;
  }
  somar(buf, varredura, 2.55, 1);

  // Acorde de Dó maior brilhante, ~1,0 s de sustain. As vozes graves entram
  // repartidas (nenhuma sozinha manda no espectro) e a quinta em G8 segura o
  // brilho lá em cima, na altura onde a chuva de moedas terminou.
  [1046.50, 1318.51, 1567.98, 2093.00].forEach((f, i) => {
    somar(buf, sino(1.02, f, { brilho: 1.15, curva: 3.0 }), 2.70 + i * 0.012, 0.30);
  });
  somar(buf, sino(0.96, 6271.93, { brilho: 0.55, curva: 2.6 }), 2.70, 0.50);
  somar(buf, vozChip(0.90, 2093.00, { queda: 0.50 }), 2.70, 0.30);

  return buf;
}

// ── o 4º efeito (29H-B, 2ª decisão): a MECÂNICA da máquina e o ENGATE ────────

/**
 * Um clique metálico curto e SECO (~4 ms de som): 0,8 ms de impulso de ruído passado por TRÊS passa-bandas em paralelo — agulha e
 * engrenagem, não um tom: 1,7 / 3,4 / 6,2 kHz (cada centro ±6% por clique, cada um com o seu Q), somados e apagados por um decaimento
 * de 2,2 ms. Toda a energia fica entre 1 e 8 kHz, e acaba antes de o ouvido o ler como "nota". Nada de ruído por baixo: entre um clique
 * e o seguinte o silêncio é digital — é isso que o separa de um "sopro" (a razão de a alavanca ter sido reprovada).
 */
function cliqueMetal(rnd, { centros = [1700, 3400, 6200], pesos = [1.0, 0.8, 0.55], qs = [2.0, 2.4, 2.8], decai = 0.0022 } = {}) {
  const DUR = 0.012;
  const impulso = criar(DUR);
  const nImp = Math.round(0.0008 * TAXA);
  for (let i = 0; i < nImp; i += 1) impulso[i] = (rnd() * 2 - 1) * (1 - i / nImp);
  const b = criar(DUR);
  centros.forEach((f, k) => {
    const fil = passaBanda(impulso, f * (0.94 + rnd() * 0.12), qs[k]);
    for (let i = 0; i < b.length; i += 1) b[i] += fil[i] * pesos[k];
  });
  for (let i = 0; i < b.length; i += 1) b[i] *= Math.exp((-i / TAXA) / decai);
  return b;
}

/**
 * O "tum" leve por baixo de cada clique: um seno entre 170 e 360 Hz (sorteado por clique, dentro dos 150-400 Hz da régua do dono),
 * ataque de 0,8 ms e decaimento de 7 ms — a peça pequena que o dente da engrenagem faz tremer. Sai com pico 1 e é escalado por quem
 * chama CONTRA O PICO DO CLIQUE (−15 dB dele): um seno de 7 ms carrega muito mais energia que 1 ms de metal — com o ganho medido no
 * buffer cru (1ª tentativa) o tum ficava 17× mais forte que o clique, e a −11 dB ainda tinha 52% da energia (2ª). Leve de propósito:
 * o que manda no espectro continua a ser o metal agudo (medido: 1-8 kHz com a maior fatia), e entre um clique e o seguinte volta o
 * silêncio.
 */
function tum(rnd, { decai = 0.007 } = {}) {
  const DUR = 0.06;
  const f = 170 + rnd() * 190;
  const b = criar(DUR);
  for (let i = 0; i < b.length; i += 1) {
    const t = i / TAXA;
    b[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-t / decai) * Math.min(1, t / 0.0008);
  }
  return b;
}

/**
 * MECÂNICA (3,0 s em loop) — a camada discreta que toca ENQUANTO os rolos giram e some quando o último trava.
 * Uma grade de cliques metálicos a `porSegundo` por segundo (11 → intervalo ~90 ms; 13 → ~77 ms), cada intervalo com ±10 ms de sorteio
 * para não soar robótico, e os intervalos reescalados para a grade fechar EXATAMENTE no trecho: o primeiro clique entra a 1/3 de um
 * intervalo do início e o último acaba a 1/3 do fim, então a emenda do loop é mais um intervalo (2/3 + o que o decodificador acrescenta
 * — ~56 ms de atraso de codificação e quadro de cabeçalho — fica entre 60 e 120 ms conforme o aparelho, uma vez a cada 3 s, por baixo de
 * um trem de tiques 10 dB mais alto). `comTum` soma o tum a cada clique com um gerador PRÓPRIO: a v2 tem exatamente a grade da v1.
 * Sem whoosh, sem sopro, sem ruído contínuo: fora dos cliques o buffer é zero.
 */
function gerarMecanica({ porSegundo, comTum, semente, jitterMs = 10 }) {
  const rnd = mulberry32(semente);
  const rndTum = mulberry32(semente + 1000);
  const DUR = MECANICA_SEG;
  const buf = criar(DUR);
  const base = 1 / porSegundo;
  const tIni = base / 3;
  const span = DUR - 2 * tIni;
  const n = Math.round(span / base);
  const intervalos = Array.from({ length: n }, () => base + (rnd() * 2 - 1) * (jitterMs / 1000));
  const soma = intervalos.reduce((s, d) => s + d, 0);
  for (let k = 0; k < n; k += 1) intervalos[k] *= span / soma;
  let t = tIni;
  for (let k = 0; k <= n; k += 1) {
    const forca = 0.85 + rnd() * 0.15; // nenhum clique igual ao anterior
    const clique = cliqueMetal(rnd);
    somar(buf, clique, t, forca);
    if (comTum) somar(buf, tum(rndTum), t, 0.18 * pico(clique) * forca); // −15 dB do pico do clique
    if (k < n) t += intervalos[k];
  }
  return buf;
}

/**
 * ENGATE (160 ms de som; ≤ 0,3 s no decodificador) — o instante em que o giro começa: o mecanismo PEGA.
 *   1) a trava, em 0 ms: o clique mais pesado (centros mais graves, 1,3 / 2,7 / 5,2 kHz, decaimento de 3 ms) e o "tum" da peça
 *      assentando — seno 210 → 150 Hz com a fase acumulada (uma varredura ingênua estala na emenda), 22 ms de decaimento;
 *   2) dois dentes da catraca pegando, a 45 e 85 ms, mais leves (0,6 e 0,45), cada um com o seu tum pequeno — o mecanismo entrando na
 *      cadência da mecânica, que começa a correr no mesmo instante.
 * Tudo seco: nenhuma varredura de ruído, nenhum sopro. Nasce DEPOIS dos cinco de sempre, na semente deles — eles não mudam.
 */
function gerarEngate(rnd) {
  const DUR = 0.16;
  const buf = criar(DUR);
  const trava = cliqueMetal(rnd, { centros: [1300, 2700, 5200], pesos: [1.0, 0.85, 0.5], qs: [1.6, 2.0, 2.4], decai: 0.003 });
  const p = pico(trava); // todos os ganhos abaixo são relativos ao pico do clique da trava
  somar(buf, trava, 0, 1.0);
  const assento = criar(0.06);
  let fase = 0;
  for (let i = 0; i < assento.length; i += 1) {
    const t = i / TAXA;
    fase += (2 * Math.PI * (210 + (150 - 210) * (t / 0.06))) / TAXA;
    assento[i] = Math.sin(fase) * Math.exp(-t / 0.022) * Math.min(1, t / 0.0008);
  }
  somar(buf, assento, 0, 0.45 * p); // −7 dB da trava: o peso assentando, sem virar bumbo
  somar(buf, cliqueMetal(rnd), 0.045, 0.6);
  somar(buf, tum(rnd), 0.045, 0.16 * p);
  somar(buf, cliqueMetal(rnd), 0.085, 0.45);
  somar(buf, tum(rnd), 0.085, 0.12 * p);
  return buf;
}

/**
 * A duração que um DECODIFICADOR vê (WebKit/Safari, <audio>.duration): TODOS os quadros do arquivo × 1152 amostras — o atraso de
 * codificação do LAME entra, e o quadro de cabeçalho Xing/Info também (o Safari não o desconta; medido: 0,78 s de som → 0,836 s,
 * 0,74 s → 0,81 s). É maior que o som sintetizado — é ESTA que tem de caber na lei do dono.
 */
function medirMp3(arquivo) {
  const b = readFileSync(arquivo);
  let i = 0;
  if (b.length > 10 && b.toString('latin1', 0, 3) === 'ID3') i = 10 + (((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f));
  const BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const TAXAS = [44100, 48000, 32000];
  let quadros = 0;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) { i += 1; continue; }
    const br = BITRATES[b[i + 2] >> 4], ta = TAXAS[(b[i + 2] >> 2) & 3], pad = (b[i + 2] >> 1) & 1;
    if (!br || !ta) { i += 1; continue; }
    const len = Math.floor((144 * br * 1000) / ta) + pad;
    quadros += 1;
    i += len;
  }
  return (quadros * 1152) / TAXA;
}

/**
 * A régua do dono, medida no MP3 PRONTO (decodificado pelo ffmpeg, como o aparelho faz):
 *   • cadência — os cliques são achados pela envoltória (|x| em média móvel de 1 ms) cruzando 20% do seu máximo, com 35 ms de
 *     refratário; cliques por segundo = (n − 1) / (último − primeiro); intervalo médio e desvio;
 *   • bandas — FFT de 2^18 pontos sobre o arquivo inteiro: fração da energia em 1-8 kHz (tem de ser a principal), em 150-400 Hz
 *     (o tum) e acima de 8 kHz;
 *   • silêncio — RMS de cada janela de 5 ms; o percentil 30 (o terço final de cada intervalo, ou seja, o que há ENTRE os cliques
 *     depois de o tum se apagar) em dBFS: ruído contínuo de ar apareceria aqui. Teto: −60 dBFS.
 */
function analisarMecanica(arquivo) {
  const { amostras } = lerMp3(arquivo);
  const n = amostras.length;
  const jan = Math.round(0.001 * TAXA);
  const env = new Float32Array(n);
  let acc = 0, envMax = 0;
  for (let i = 0; i < n; i += 1) {
    acc += Math.abs(amostras[i]);
    if (i >= jan) acc -= Math.abs(amostras[i - jan]);
    env[i] = acc / jan;
    if (env[i] > envMax) envMax = env[i];
  }
  const limiar = envMax * 0.2;
  const refr = Math.round(0.035 * TAXA);
  const inicios = [];
  let ultimo = -refr;
  for (let i = 1; i < n; i += 1) {
    if (env[i] >= limiar && env[i - 1] < limiar && i - ultimo > refr) { inicios.push(i / TAXA); ultimo = i; }
  }
  const intervalos = inicios.slice(1).map((t, k) => t - inicios[k]);
  const media = intervalos.reduce((s, d) => s + d, 0) / Math.max(1, intervalos.length);
  const desvio = Math.sqrt(intervalos.reduce((s, d) => s + (d - media) ** 2, 0) / Math.max(1, intervalos.length));
  const porSegundo = inicios.length > 1 ? (inicios.length - 1) / (inicios[inicios.length - 1] - inicios[0]) : 0;

  const N = 1 << 18;
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < Math.min(n, N); i += 1) re[i] = amostras[i];
  fft(re, im);
  const binHz = TAXA / N;
  const energia = (f1, f2) => {
    let e = 0;
    for (let k = Math.ceil(f1 / binHz); k < Math.min(N / 2, Math.floor(f2 / binHz)); k += 1) e += re[k] * re[k] + im[k] * im[k];
    return e;
  };
  const total = energia(20, TAXA / 2);
  const fracao1a8 = energia(1000, 8000) / total;
  const fracao150a400 = energia(150, 400) / total;
  const fracaoAcima8 = energia(8000, TAXA / 2) / total;

  const jan5 = Math.round(0.005 * TAXA);
  const rms = [];
  for (let i = 0; i + jan5 <= n; i += jan5) {
    let s = 0;
    for (let j = i; j < i + jan5; j += 1) s += amostras[j] * amostras[j];
    rms.push(Math.sqrt(s / jan5));
  }
  rms.sort((a, b) => a - b);
  const fundoDb = 20 * Math.log10(Math.max(1e-9, rms[Math.floor(rms.length * 0.3)]));
  return { cliques: inicios.length, porSegundo, intervaloMs: media * 1000, desvioMs: desvio * 1000, fracao1a8, fracao150a400, fracaoAcima8, fundoDb, primeiroMs: (inicios[0] || 0) * 1000, ultimoMs: (inicios[inicios.length - 1] || 0) * 1000 };
}

// ── saída: normalizar → WAV → MP3 ─────────────────────────────────────────────

/** Normaliza o pico para -1 dBFS. Nada clipa e nada sai baixo demais. */
function normalizar(buf, dBFS = -1) {
  const p = pico(buf);
  if (p === 0) return buf;
  const ganho = (10 ** (dBFS / 20)) / p;
  for (let i = 0; i < buf.length; i += 1) buf[i] *= ganho;
  return buf;
}

function wav16(amostras) {
  const n = amostras.length;
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22); b.writeUInt32LE(TAXA, 24);
  b.writeUInt32LE(TAXA * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i += 1) {
    const v = Math.max(-1, Math.min(1, amostras[i]));
    b.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return b;
}

function escrever(nome, amostras, destino = DESTINO) {
  normalizar(amostras);
  const temp = path.join(tmpdir(), `futty-${nome}-${process.pid}.wav`);
  writeFileSync(temp, wav16(amostras));
  const alvo = path.join(destino, `${nome}.mp3`);

  let bytes = 0, taxa = '';
  for (const degrau of DEGRAUS) {
    const r = spawnSync(ffmpeg, [
      '-y', '-loglevel', 'error',
      '-i', temp,
      '-codec:a', 'libmp3lame', '-b:a', degrau, '-ac', '1', '-ar', String(TAXA),
      '-map_metadata', '-1',
      alvo,
    ], { encoding: 'utf8' });
    if (r.status !== 0) {
      console.error(`[sons] ffmpeg falhou em ${nome}: ${r.stderr || r.error}`);
      process.exit(1);
    }
    bytes = statSync(alvo).size; taxa = degrau;
    if (bytes <= TETO_BYTES) break;
  }
  unlinkSync(temp);

  const seg = amostras.length / TAXA;
  const cabe = bytes <= TETO_BYTES;
  console.log(
    `  ${cabe ? 'ok ' : 'ACIMA'} ${`${nome}.mp3`.padEnd(14)} `
    + `${(seg * 1000).toFixed(0).padStart(5)} ms · ${(bytes / 1024).toFixed(1).padStart(6)} KB · ${taxa} mono`,
  );
  return { nome, bytes, seg, taxa, cabe, arquivo: alvo };
}

// ── principal ─────────────────────────────────────────────────────────────────

mkdirSync(DESTINO, { recursive: true });
mkdirSync(CAPTURAS, { recursive: true });
console.log(`[sons] sintetizando em ${path.relative(RAIZ, DESTINO)} · ${DEGRAUS[0]} mono · semente ${SEMENTE}\n`);

const rnd = mulberry32(SEMENTE);
const feitos = [
  escrever('tique-1', gerarTique(0, rnd)),
  escrever('tique-2', gerarTique(1, rnd)),
  escrever('tique-3', gerarTique(2, rnd)),
  escrever('clac', gerarClac(rnd)),
  escrever('jackpot', gerarJackpot(rnd)),
];

// 29H-B (2ª decisão): as três variantes da mecânica, cada uma com semente própria (a v2 é a v1 com o tum: a MESMA grade de cliques);
// a v2 é a que o app toca. O engate vem DEPOIS dos cinco, na semente deles — eles não mudam (conferido por MD5 abaixo).
mkdirSync(CAPTURAS_29H, { recursive: true });
const VARIANTES = [
  { nome: 'mecanica-v1', porSegundo: 11, comTum: false, semente: SEMENTE + 1, faixa: [10, 12] },
  { nome: 'mecanica-v2', porSegundo: 11, comTum: true, semente: SEMENTE + 1, faixa: [10, 12] },
  { nome: 'mecanica-v3', porSegundo: 13, comTum: true, semente: SEMENTE + 3, faixa: [12, 14] },
];
const falhas = [];
for (const v of VARIANTES) {
  const f = escrever(v.nome, gerarMecanica(v), CAPTURAS_29H);
  const seg = medirMp3(f.arquivo);
  const m = analisarMecanica(f.arquivo);
  console.log(
    `[sons] ${v.nome}: ${m.cliques} cliques · ${m.porSegundo.toFixed(1)}/s · intervalo ${m.intervaloMs.toFixed(0)} ±${m.desvioMs.toFixed(0)} ms (1º a ${m.primeiroMs.toFixed(0)} ms, último a ${m.ultimoMs.toFixed(0)} ms)`
    + ` · energia 1-8 kHz ${(m.fracao1a8 * 100).toFixed(0)}% · 150-400 Hz ${(m.fracao150a400 * 100).toFixed(1)}% · >8 kHz ${(m.fracaoAcima8 * 100).toFixed(0)}%`
    + ` · entre cliques ${m.fundoDb.toFixed(0)} dBFS · ${(seg * 1000).toFixed(0)} ms no decodificador`,
  );
  if (m.porSegundo < v.faixa[0] || m.porSegundo > v.faixa[1]) falhas.push(`${v.nome}: ${m.porSegundo.toFixed(1)} cliques/s fora de ${v.faixa.join('-')}`);
  if (m.desvioMs < 3 || m.desvioMs > 14) falhas.push(`${v.nome}: variação de ${m.desvioMs.toFixed(0)} ms (a régua pede ~±10 ms, nem robótico nem solto)`);
  if (m.fracao1a8 < 0.5 || m.fracao1a8 <= m.fracao150a400) falhas.push(`${v.nome}: a energia principal não está em 1-8 kHz (${(m.fracao1a8 * 100).toFixed(0)}%)`);
  if (v.comTum ? m.fracao150a400 < 0.03 : m.fracao150a400 > 0.02) falhas.push(`${v.nome}: tum ${v.comTum ? 'ausente' : 'presente'} (${(m.fracao150a400 * 100).toFixed(1)}% em 150-400 Hz)`);
  if (m.fundoDb > -60) falhas.push(`${v.nome}: há som contínuo entre os cliques (${m.fundoDb.toFixed(0)} dBFS)`);
  if (f.taxa !== '96k') falhas.push(`${v.nome}: saiu a ${f.taxa}, a lei pede 96 kbps`);
  if (Math.abs(f.seg - MECANICA_SEG) > 1e-6) falhas.push(`${v.nome}: ${f.seg} s de som, esperado ${MECANICA_SEG}`);
  if (v.nome === 'mecanica-v2') {
    copyFileSync(f.arquivo, path.join(DESTINO, 'mecanica.mp3'));
    feitos.push({ ...f, nome: 'mecanica', arquivo: path.join(DESTINO, 'mecanica.mp3') });
  }
}
const engate = escrever('engate', gerarEngate(rnd));
feitos.push(engate);
engate.segMp3 = medirMp3(engate.arquivo);
console.log(`[sons] engate: ${(engate.seg * 1000).toFixed(0)} ms de som · ${(engate.segMp3 * 1000).toFixed(0)} ms no decodificador`);
if (Math.max(engate.seg, engate.segMp3) > ENGATE_MAX_SEG + 1e-6) falhas.push(`engate dura ${(engate.segMp3 * 1000).toFixed(0)} ms no decodificador — tem de caber em ${ENGATE_MAX_SEG * 1000} ms (dono, 29H-B)`);
if (falhas.length) {
  for (const f of falhas) console.error(`[sons] FALHA: ${f}`);
  process.exit(1);
}
for (const [nome, md5] of Object.entries(ASSINATURAS)) {
  const atual = createHash('md5').update(readFileSync(path.join(DESTINO, `${nome}.mp3`))).digest('hex');
  if (atual !== md5) {
    console.error(`[sons] FALHA: ${nome}.mp3 mudou (md5 ${atual}, esperado ${md5}) — os cinco de sempre são selados (16A / 29H-B).`);
    process.exit(1);
  }
}
console.log(`[sons] os cinco de sempre conferidos por MD5 (bit a bit iguais); mecânica v1, v2 e v3 em ${path.relative(RAIZ, CAPTURAS_29H)} (a v2 é a do app)`);

const total = feitos.reduce((s, f) => s + f.bytes, 0);
console.log(`\n[sons] ${feitos.length} arquivos · ${(total / 1024).toFixed(1)} KB no total`);
const acima = feitos.filter((f) => !f.cabe);
if (acima.length) {
  console.error(`[sons] FALHA: ${acima.map((f) => f.nome).join(', ')} acima do teto de ${TETO_BYTES / 1024} KB.`);
  process.exit(1);
}

// Prova do dono (16A): a frequência dominante do jackpot sobe ou fica, nunca
// desce. Medida no MP3 já pronto — não no buffer — e desenhada em PNG.
const grafico = path.join(CAPTURAS, '16a-jackpot-tom.png');
const serie = serieDeTom(lerMp3(path.join(DESTINO, 'jackpot.mp3')));
const prova = desenharGrafico(serie, grafico, 'JACKPOT - TOM DOMINANTE (FFT 50 MS)');
console.log(`[sons] prova de tom: ${path.relative(RAIZ, grafico)} · ${prova.fortes}/${prova.total} janelas com tom`);
if (!prova.ok) {
  console.error(`[sons] FALHA: o jackpot DESCE de tom em ${prova.quedas.length} ponto(s):`);
  for (const q of prova.quedas) {
    console.error(`        ${q.de.toFixed(2)}s ${Math.round(q.hzDe)} Hz → ${q.para.toFixed(2)}s ${Math.round(q.hzPara)} Hz`);
  }
  process.exit(1);
}
console.log('[sons] a linha do jackpot sobe ou fica — nenhuma queda. Receita em SONS.md.');
