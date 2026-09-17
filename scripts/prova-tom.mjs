#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// PROVA DE TOM — a linha do jackpot sobe ou fica, nunca desce (Rodada 16A).
//
// Lei nova do dono (16A): no jackpot NADA desce de tom. Isto mede o arquivo MP3
// já pronto — não o buffer em memória — e desenha a prova:
//
//   MP3 → ffmpeg (PCM f32 mono) → janelas de 50 ms com Hann → FFT 4096 →
//   frequência dominante de cada janela → PNG com a linha no tempo.
//
// Só Node: a FFT é radix-2 escrita aqui e o PNG sai à mão (zlib), como no
// gen-icons.mjs. Nenhuma dependência nova.
// ═══════════════════════════════════════════════════════════════════════════════
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { Buffer } from 'node:buffer';
import ffmpeg from 'ffmpeg-static';

const JANELA_MS = 50;
const NFFT = 4096;
const F_MIN = 250;    // abaixo disso é corpo/ruído, não "tom"
const F_MAX = 9000;
const PISO_DB = -38;  // janela mais fraca que isto não tem tom que conte

// ── decodificar ───────────────────────────────────────────────────────────────

export function lerMp3(arquivo) {
  const r = spawnSync(ffmpeg, [
    '-v', 'error', '-i', arquivo, '-f', 'f32le', '-ac', '1', '-ar', '44100', '-',
  ], { maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`ffmpeg nao decodificou ${arquivo}: ${r.stderr}`);
  const b = r.stdout;
  const n = Math.floor(b.length / 4);
  const amostras = new Float32Array(n);
  for (let i = 0; i < n; i += 1) amostras[i] = b.readFloatLE(i * 4);
  return { amostras, taxa: 44100 };
}

// ── FFT radix-2 (in-place, entrada real com zero-padding) ─────────────────────

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let passo = 2; passo <= n; passo <<= 1) {
    const ang = (-2 * Math.PI) / passo;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += passo) {
      let cr = 1, ci = 0;
      for (let k = 0; k < passo / 2; k += 1) {
        const a = i + k, b = i + k + passo / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

/**
 * Frequência dominante de cada janela de 50 ms (sem sobreposição).
 * O pico do espectro é afinado por interpolação parabólica nos três bins à
 * volta — sem isso a resolução de ~10,8 Hz faria a linha serrilhar.
 */
export function serieDeTom({ amostras, taxa }) {
  const n = Math.round((JANELA_MS / 1000) * taxa);
  const hann = new Float32Array(n);
  for (let i = 0; i < n; i += 1) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  const bMin = Math.max(1, Math.floor((F_MIN * NFFT) / taxa));
  const bMax = Math.min(NFFT / 2 - 2, Math.ceil((F_MAX * NFFT) / taxa));

  let rmsMax = 0;
  for (let off = 0; off + n <= amostras.length; off += n) {
    let soma = 0;
    for (let i = 0; i < n; i += 1) soma += amostras[off + i] ** 2;
    rmsMax = Math.max(rmsMax, Math.sqrt(soma / n));
  }

  const pontos = [];
  for (let off = 0; off + n <= amostras.length; off += n) {
    const re = new Float64Array(NFFT), im = new Float64Array(NFFT);
    let soma = 0;
    for (let i = 0; i < n; i += 1) {
      re[i] = amostras[off + i] * hann[i];
      soma += amostras[off + i] ** 2;
    }
    const rms = Math.sqrt(soma / n);
    fft(re, im);
    let melhor = bMin, pico = -1;
    for (let b = bMin; b <= bMax; b += 1) {
      const m = re[b] * re[b] + im[b] * im[b];
      if (m > pico) { pico = m; melhor = b; }
    }
    const mag = (b) => Math.sqrt(re[b] * re[b] + im[b] * im[b]);
    const y0 = mag(melhor - 1), y1 = mag(melhor), y2 = mag(melhor + 1);
    const denom = y0 - 2 * y1 + y2;
    const ajuste = denom === 0 ? 0 : (y0 - y2) / (2 * denom);
    const hz = ((melhor + Math.max(-0.5, Math.min(0.5, ajuste))) * taxa) / NFFT;
    const db = 20 * Math.log10((rms || 1e-9) / (rmsMax || 1e-9));
    pontos.push({ t: off / taxa, hz, db, forte: db >= PISO_DB });
  }
  return pontos;
}

/** A linha sobe ou fica? Só as janelas fortes contam; 3% de folga para o jitter da FFT. */
export function conferirSubida(pontos, folga = 0.03) {
  const fortes = pontos.filter((p) => p.forte);
  const quedas = [];
  for (let i = 1; i < fortes.length; i += 1) {
    const a = fortes[i - 1], b = fortes[i];
    if (b.hz < a.hz * (1 - folga)) quedas.push({ de: a.t, para: b.t, hzDe: a.hz, hzPara: b.hz });
  }
  return { ok: quedas.length === 0, quedas, fortes: fortes.length, total: pontos.length };
}

// ── PNG à mão ─────────────────────────────────────────────────────────────────

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pedaco(tipo, dados) {
  const tam = Buffer.alloc(4); tam.writeUInt32BE(dados.length, 0);
  const t = Buffer.from(tipo, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, dados])), 0);
  return Buffer.concat([tam, t, dados, crc]);
}
function png(l, a, rgb) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(l, 0); ihdr.writeUInt32BE(a, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8 bits, RGB
  const passo = l * 3;
  const bruto = Buffer.alloc((passo + 1) * a);
  for (let y = 0; y < a; y += 1) {
    bruto[y * (passo + 1)] = 0;
    rgb.copy(bruto, y * (passo + 1) + 1, y * passo, y * passo + passo);
  }
  return Buffer.concat([
    sig,
    pedaco('IHDR', ihdr),
    pedaco('IDAT', deflateSync(bruto, { level: 9 })),
    pedaco('IEND', Buffer.alloc(0)),
  ]);
}

// Fonte 5x7 — só o que os rotulos usam (sem acentos, como todo grafico tecnico).
const FONTE = {
  0: '01110 10001 10011 10101 11001 10001 01110', 1: '00100 01100 00100 00100 00100 00100 01110',
  2: '01110 10001 00001 00010 00100 01000 11111', 3: '11111 00010 00100 00010 00001 10001 01110',
  4: '00010 00110 01010 10010 11111 00010 00010', 5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110', 7: '11111 00001 00010 00100 01000 01000 01000',
  8: '01110 10001 10001 01110 10001 10001 01110', 9: '01110 10001 10001 01111 00001 00010 01100',
  A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110', D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001',
  I: '01110 00100 00100 00100 00100 00100 01110', J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 11001 10101 10011 10001 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110', P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110', V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 11011 10001', X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
  ' ': '00000 00000 00000 00000 00000 00000 00000', ',': '00000 00000 00000 00000 00110 00100 01000',
  '.': '00000 00000 00000 00000 00000 01100 01100', '-': '00000 00000 00000 11111 00000 00000 00000',
  ':': '00000 01100 01100 00000 01100 01100 00000', '(': '00010 00100 01000 01000 01000 00100 00010',
  ')': '01000 00100 00010 00010 00010 00100 01000', '/': '00001 00010 00010 00100 01000 01000 10000',
};

function tela(l, a, fundo) {
  const buf = Buffer.alloc(l * a * 3);
  for (let i = 0; i < l * a; i += 1) {
    buf[i * 3] = fundo[0]; buf[i * 3 + 1] = fundo[1]; buf[i * 3 + 2] = fundo[2];
  }
  const ponto = (x, y, cor) => {
    const px = Math.round(x), py = Math.round(y);
    if (px < 0 || py < 0 || px >= l || py >= a) return;
    const i = (py * l + px) * 3;
    buf[i] = cor[0]; buf[i + 1] = cor[1]; buf[i + 2] = cor[2];
  };
  const linha = (x0, y0, x1, y1, cor, grossura = 1) => {
    const passos = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= passos; i += 1) {
      const x = x0 + ((x1 - x0) * i) / passos;
      const y = y0 + ((y1 - y0) * i) / passos;
      for (let g = 0; g < grossura; g += 1) ponto(x, y + g - (grossura - 1) / 2, cor);
    }
  };
  const texto = (s, x, y, cor, escala = 1) => {
    let cx = x;
    for (const ch of String(s).toUpperCase()) {
      const g = FONTE[ch] || FONTE[' '];
      g.split(' ').forEach((fila, fy) => {
        [...fila].forEach((v, fx) => {
          if (v !== '1') return;
          for (let a2 = 0; a2 < escala; a2 += 1) {
            for (let b2 = 0; b2 < escala; b2 += 1) ponto(cx + fx * escala + b2, y + fy * escala + a2, cor);
          }
        });
      });
      cx += 6 * escala;
    }
  };
  return { buf, ponto, linha, texto };
}

export function desenharGrafico(pontos, arquivo, titulo) {
  const L = 900, A = 480, ME = 70, MD = 24, MT = 54, MB = 52;
  const FUNDO = [11, 16, 24], GRADE = [30, 42, 58], EIXO = [110, 130, 150];
  const OURO = [212, 160, 23], FRACO = [90, 100, 116], BRANCO = [226, 232, 240];
  const { buf, ponto, linha, texto } = tela(L, A, FUNDO);

  const tMax = Math.max(...pontos.map((p) => p.t)) + 0.05;
  const fx = (t) => ME + (t / tMax) * (L - ME - MD);
  const yTopo = MT, yBase = A - MB;
  const fy = (hz) => yBase - ((Math.log2(hz) - Math.log2(F_MIN)) / (Math.log2(F_MAX) - Math.log2(F_MIN))) * (yBase - yTopo);

  for (const hz of [250, 500, 1000, 2000, 4000, 8000]) {
    const y = fy(hz);
    linha(ME, y, L - MD, y, GRADE);
    const r = hz >= 1000 ? `${hz / 1000}K` : String(hz);
    texto(r, ME - 10 - r.length * 6, y - 3, EIXO);
  }
  for (let t = 0; t <= tMax; t += 0.5) {
    const x = fx(t);
    linha(x, yTopo, x, yBase, GRADE);
    texto(t.toFixed(1).replace('.', ','), x - 9, yBase + 12, EIXO);
  }
  linha(ME, yTopo, ME, yBase, EIXO);
  linha(ME, yBase, L - MD, yBase, EIXO);

  texto(titulo, ME, 16, BRANCO, 2);
  texto('HZ', 12, yTopo - 4, EIXO);
  texto('SEGUNDOS', L - MD - 52, A - 18, EIXO);

  // A linha: cheia nas janelas fortes, fina nas fracas (a cauda a morrer).
  let ant = null;
  for (const p of pontos) {
    const x = fx(p.t + JANELA_MS / 2000);
    const y = fy(Math.max(F_MIN, Math.min(F_MAX, p.hz)));
    if (ant) linha(ant.x, ant.y, x, y, p.forte && ant.forte ? OURO : FRACO, p.forte && ant.forte ? 3 : 1);
    if (p.forte) {
      for (let dx = -2; dx <= 2; dx += 1) {
        for (let dy = -2; dy <= 2; dy += 1) if (dx * dx + dy * dy <= 4) ponto(x + dx, y + dy, OURO);
      }
    }
    ant = { x, y, forte: p.forte };
  }

  const r = conferirSubida(pontos);
  texto(r.ok ? 'SOBE OU FICA - NENHUMA QUEDA' : `QUEDAS: ${r.quedas.length}`, ME, A - 18, r.ok ? OURO : [220, 80, 80]);
  writeFileSync(arquivo, png(L, A, buf));
  return r;
}
