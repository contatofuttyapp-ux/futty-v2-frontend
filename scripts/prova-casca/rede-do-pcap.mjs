#!/usr/bin/env node
// Lê o que saiu de verdade do aparelho: a captura de pacotes do emulador (-tcpdump) ou do Mac do CI. Lista os nomes pedidos ao DNS e o
// nome do servidor em cada conexão TLS (SNI), que é o que sobra para olhar sem abrir o tráfego.
//   node scripts/prova-casca/rede-do-pcap.mjs <arquivo.pcap> [saida.json]
// Sai com erro se aparecer o motor antigo ou o Supabase.
import { readFileSync, writeFileSync } from 'node:fs';

const [arquivo, saida] = process.argv.slice(2);
const b = readFileSync(arquivo);
const PROIBIDO = /futty-api|\.run\.app|supabase/i;

const magia = b.readUInt32LE(0);
const le = magia === 0xa1b2c3d4 || magia === 0xa1b23c4d;
if (!le && b.readUInt32BE(0) !== 0xa1b2c3d4) throw new Error('não é pcap clássico');
const u32 = (o) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
const tipoDeEnlace = u32(20);
// 1 = Ethernet; 0 e 108 = loopback do BSD/macOS; 113 = "any" do Linux. Só muda onde o IP começa.
const inicioDoIp = (o) => {
  if (tipoDeEnlace === 1) {
    const eth = b.readUInt16BE(o + 12);
    return eth === 0x0800 || eth === 0x86dd ? o + 14 : -1;
  }
  if (tipoDeEnlace === 0 || tipoDeEnlace === 108) return o + 4;
  if (tipoDeEnlace === 113) return o + 16;
  if (tipoDeEnlace === 101) return o;
  return -1;
};

function nomeDns(o, fim) {
  const partes = [];
  let i = o;
  while (i < fim) {
    const n = b[i];
    if (n === 0 || n >= 0xc0) break;
    partes.push(b.toString('latin1', i + 1, i + 1 + n));
    i += n + 1;
  }
  return partes.join('.').toLowerCase();
}

function sni(o, fim) {
  // ClientHello: registro 0x16, handshake 0x01, depois versão, random, sessão, cifras, compressão e as extensões.
  if (b[o] !== 0x16 || b[o + 5] !== 0x01) return null;
  let i = o + 9 + 2 + 32;
  i += 1 + b[i];
  i += 2 + b.readUInt16BE(i);
  i += 1 + b[i];
  const fimExt = Math.min(i + 2 + b.readUInt16BE(i), fim);
  i += 2;
  while (i + 4 <= fimExt) {
    const tipo = b.readUInt16BE(i);
    const tam = b.readUInt16BE(i + 2);
    if (tipo === 0 && i + 9 <= fimExt) return b.toString('latin1', i + 9, i + 9 + b.readUInt16BE(i + 7)).toLowerCase();
    i += 4 + tam;
  }
  return null;
}

const dns = new Map();
const tls = new Map();
let pacotes = 0;
const conta = (m, k) => m.set(k, (m.get(k) || 0) + 1);

for (let o = 24; o + 16 <= b.length;) {
  const tam = u32(o + 8);
  const pacote = o + 16;
  const fim = pacote + tam;
  o = fim;
  if (fim > b.length) break;
  pacotes += 1;
  try {
    const ip = inicioDoIp(pacote);
    if (ip < 0) continue;
    const v = b[ip] >> 4;
    const proto = v === 4 ? b[ip + 9] : b[ip + 6];
    const camada4 = v === 4 ? ip + (b[ip] & 0x0f) * 4 : ip + 40;
    if (proto === 17 && b.readUInt16BE(camada4 + 2) === 53) {
      const nome = nomeDns(camada4 + 8 + 12, fim);
      if (nome) conta(dns, nome);
    } else if (proto === 6) {
      const dados = camada4 + (b[camada4 + 12] >> 4) * 4;
      if (dados + 45 < fim) {
        const nome = sni(dados, fim);
        if (nome) conta(tls, nome);
      }
    }
  } catch { /* pacote cortado */ }
}

const lista = (m) => [...m.entries()].sort((a, c) => c[1] - a[1]).map(([nome, vezes]) => ({ nome, vezes }));
const relatorio = { pacotes, dns: lista(dns), tls: lista(tls) };
if (saida) writeFileSync(saida, JSON.stringify(relatorio, null, 1));
console.log(`${pacotes} pacotes · ${dns.size} nomes no DNS · ${tls.size} nomes em TLS`);
for (const { nome, vezes } of relatorio.dns) console.log(`  dns ${nome} (${vezes})`);
for (const { nome, vezes } of relatorio.tls) console.log(`  tls ${nome} (${vezes})`);
const ruins = [...dns.keys(), ...tls.keys()].filter((n) => PROIBIDO.test(n));
if (ruins.length) { console.error(`PROIBIDO na rede: ${ruins.join(', ')}`); process.exit(1); }
console.log('nenhum nome do motor antigo nem do Supabase');
