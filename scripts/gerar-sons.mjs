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
// ═══════════════════════════════════════════════════════════════════════════════
import { writeFileSync, statSync, mkdirSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpeg from 'ffmpeg-static';
import { lerMp3, serieDeTom, desenharGrafico } from './prova-tom.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const DESTINO = path.join(RAIZ, 'public', 'sons');
const CAPTURAS = path.join(AQUI, 'capturas');

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

function escrever(nome, amostras) {
  normalizar(amostras);
  const temp = path.join(tmpdir(), `futty-${nome}-${process.pid}.wav`);
  writeFileSync(temp, wav16(amostras));
  const alvo = path.join(DESTINO, `${nome}.mp3`);

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
  return { nome, bytes, seg, taxa, cabe };
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
