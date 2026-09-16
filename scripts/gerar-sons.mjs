#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// GERADOR DOS SONS DO SORTEIO — Rodada 14A (16-set-2026)
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
// ═══════════════════════════════════════════════════════════════════════════════
import { writeFileSync, statSync, mkdirSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpeg from 'ffmpeg-static';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const DESTINO = path.join(RAIZ, 'public', 'sons');

const TAXA = 44100;      // Hz
// Lei do app leve: 96 kbps. Os degraus abaixo existem só para o jackpot: a 96
// kbps cabem 3,41 s em 40 KB, e o jackpot precisa de 3,6 s para respirar — o
// teto de tamanho é duro, a taxa cede primeiro. Mesmo no degrau mais baixo
// estes arquivos são MONO: 64 kbps num canal é mais bits por canal do que os
// 96 kbps ESTÉREO (48 por canal) de todo som que o app já usava.
const DEGRAUS = ['96k', '80k', '64k'];
const TETO_BYTES = 40 * 1024;
const SEMENTE = 14021606; // Rodada 14A · 16-set — fixa, é o que torna isto reproduzível

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

// ── os três efeitos ───────────────────────────────────────────────────────────

/**
 * TIQUE (~60 ms) — o rolo da slot machine passando um símbolo.
 * Mecânico com um toque digital: clique de impulso filtrado em 2-4 kHz mais um
 * blip de onda quadrada curtíssimo, como teclas trocando. As 3 variantes mudam
 * de tom para o trem de tiques não soar de máquina de escrever elétrica.
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

  // 2) o blip digital: quadrada ~1,2 kHz, 15 ms, decaimento rápido
  const fBlip = [1120, 1200, 1285][variante] * (0.99 + rnd() * 0.02);
  const nBlip = Math.round(0.015 * TAXA);
  for (let i = 0; i < nBlip; i += 1) {
    const t = i / TAXA;
    const quadrada = Math.sin(2 * Math.PI * fBlip * t) >= 0 ? 1 : -1;
    buf[i] += quadrada * 0.30 * Math.exp(-t / 0.004);
  }
  return buf;
}

/**
 * CLAC (~120 ms) — o rolo TRAVANDO, quando o jogador aparece.
 * Peso primeiro (seno varrendo 90 → 60 Hz: a massa parando), metal por cima
 * (clique curto em 5,2 kHz: a trava encaixando).
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

/** Uma moeda caindo: ruído filtrado num tom aleatório de 3-6 kHz + tilintar. */
function moeda(rnd) {
  const DUR = 0.055;
  const f = 3000 + rnd() * 3000;
  const fil = passaBanda(ruido(DUR, rnd), f, 2.2);
  const b = criar(DUR);
  for (let i = 0; i < b.length; i += 1) {
    const t = i / TAXA;
    b[i] = fil[i] * Math.exp(-t / 0.010) * 1.4
         + Math.sin(2 * Math.PI * f * t) * 0.22 * Math.exp(-t / 0.016);
  }
  return b;
}

/**
 * JACKPOT (~3,6 s) — a slot machine que ACABOU de dar prêmio.
 * Quatro movimentos: arpejo subindo (Dó maior), ding-ding-ding, chuva de moedas
 * e um acorde de sino sustentado fechando.
 */
function gerarJackpot(rnd) {
  const DUR = 3.6;
  const buf = criar(DUR);

  // A) arpejo ascendente C5-E5-G5-C6-E6-G6, 90 ms entre notas, subindo em volume
  const NOTAS = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
  NOTAS.forEach((f, i) => {
    somar(buf, sino(1.25, f), i * 0.090, 0.42 + i * 0.062);
  });

  // B) "ding-ding-ding" — 3 batidas de sino, mais brilhantes e mais secas
  for (let i = 0; i < 3; i += 1) {
    somar(buf, sino(0.85, 1046.50, { brilho: 1.35, curva: 5.2 }), 0.72 + i * 0.19, 0.62);
  }

  // C) chuva de moedas — 36 impactos numa densidade triangular (cresce e cai).
  // Os instantes saem da CDF inversa da triangular: mais moedas onde a densidade
  // é maior, sem sortear o mesmo instante duas vezes.
  const MOEDAS = 36, T0 = 1.15, T1 = 2.75;
  for (let i = 0; i < MOEDAS; i += 1) {
    const u = (i + 0.5) / MOEDAS;
    const x = u < 0.5 ? Math.sqrt(u / 2) : 1 - Math.sqrt((1 - u) / 2);
    const pico = 1 - Math.abs(x - 0.5) * 0.8; // as do miolo batem mais forte
    somar(buf, moeda(rnd), T0 + (T1 - T0) * x, 0.95 * pico);
  }

  // D) o fecho: acorde de Dó maior em sinos, ~1,2 s de cauda
  [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
    somar(buf, sino(1.2, f, { brilho: 0.9, curva: 3.4 }), 2.40 + i * 0.012, 0.40);
  });

  return buf;
}

// ── saída: normalizar → WAV → MP3 ─────────────────────────────────────────────

/** Normaliza o pico para -1 dBFS. Nada clipa e nada sai baixo demais. */
function normalizar(buf, dBFS = -1) {
  let pico = 0;
  for (let i = 0; i < buf.length; i += 1) pico = Math.max(pico, Math.abs(buf[i]));
  if (pico === 0) return buf;
  const ganho = (10 ** (dBFS / 20)) / pico;
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
console.log('[sons] todos dentro do teto de 40 KB. Receita em SONS.md.');
