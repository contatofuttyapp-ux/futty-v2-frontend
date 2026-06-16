// Futty v2.0 — Vista de campo (estilo FIFA) do resultado do sorteio.
// Campo vertical: Time A (azul) no topo, Time B (vermelho) em baixo.
import { useState } from 'react';
import { urlAsset, iniciaisNome } from '../utils/avatar';

const COR_A = '#3b82f6'; // azul
const COR_B = '#ef4444'; // vermelho
const LINHAS = ['GL', 'DEF', 'MEI', 'ATA'];

// Formação por número de jogadores (do briefing). Outros nº → distribuição genérica.
const FORMACOES = {
  4: { GL: 1, DEF: 1, MEI: 0, ATA: 2 },
  5: { GL: 1, DEF: 2, MEI: 0, ATA: 2 },
  6: { GL: 1, DEF: 2, MEI: 2, ATA: 1 },
  7: { GL: 1, DEF: 2, MEI: 2, ATA: 2 },
  8: { GL: 1, DEF: 2, MEI: 3, ATA: 2 },
};

function formacao(n) {
  if (FORMACOES[n]) return FORMACOES[n];
  if (n <= 0) return { GL: 0, DEF: 0, MEI: 0, ATA: 0 };
  const gl = 1;
  let resto = n - gl;
  const def = Math.ceil(resto / 3);
  resto -= def;
  const mei = Math.ceil(resto / 2);
  resto -= mei;
  return { GL: Math.min(gl, n), DEF: def, MEI: mei, ATA: Math.max(0, resto) };
}

// Distribui os jogadores pelas linhas: primeiro quem declarou a posição,
// depois os restantes (sem posição) preenchem os spots livres.
function distribuir(jogadores, form) {
  const usados = new Set();
  const resultado = { GL: [], DEF: [], MEI: [], ATA: [] };

  // 1ª passagem — quem declarou a posição.
  LINHAS.forEach((l) => {
    for (const j of jogadores) {
      if (resultado[l].length >= form[l]) break;
      if (j.posicao === l && !usados.has(j)) {
        resultado[l].push(j);
        usados.add(j);
      }
    }
  });

  // 2ª passagem — restantes preenchem os spots que sobram.
  const pool = jogadores.filter((j) => !usados.has(j));
  LINHAS.forEach((l) => {
    while (resultado[l].length < form[l] && pool.length) {
      const j = pool.shift();
      resultado[l].push(j);
      usados.add(j);
    }
  });

  // Sobra (caso raro): não perder ninguém — vai para o meio-campo.
  pool.forEach((j) => resultado.MEI.push(j));
  return resultado;
}

function ChipJogador({ jogador, cor }) {
  const [falhou, setFalhou] = useState(false);
  const src = jogador.avatar_url ? urlAsset(jogador.avatar_url) : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: 56 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${cor}`, background: '#15151a', display: 'grid', placeItems: 'center', boxShadow: `0 0 8px ${cor}66` }}>
        {src && !falhou ? (
          <img src={src} alt="" onError={() => setFalhou(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
        ) : (
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{iniciaisNome(jogador.nome)}</span>
        )}
      </div>
      <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, fontWeight: 700, color: '#fff', maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.85)' }}>
        {jogador.nome}
      </span>
    </div>
  );
}

function Linha({ jogadores, cor }) {
  if (!jogadores.length) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
      {jogadores.map((j, i) => (
        <ChipJogador key={j.user_id || i} jogador={j} cor={cor} />
      ))}
    </div>
  );
}

const marca = { position: 'absolute', border: '2px solid rgba(255,255,255,0.22)', pointerEvents: 'none' };

export default function CampoSorteio({ timeA = [], timeB = [], nomeA = 'Time A', nomeB = 'Time B' }) {
  const distA = distribuir(timeA, formacao(timeA.length));
  const distB = distribuir(timeB, formacao(timeB.length));
  // Time A: GL no topo → ATA junto ao meio. Time B: espelhado.
  const ordemA = ['GL', 'DEF', 'MEI', 'ATA'];
  const ordemB = ['ATA', 'MEI', 'DEF', 'GL'];

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '2 / 3', borderRadius: 8, overflow: 'hidden', background: '#1a4a1a', border: '2px solid rgba(255,255,255,0.25)' }}>
      {/* Marcações do campo */}
      <div style={{ ...marca, top: '50%', left: 0, right: 0, height: 0, borderWidth: '2px 0 0 0' }} />
      <div style={{ ...marca, top: '50%', left: '50%', width: '30%', aspectRatio: '1', transform: 'translate(-50%, -50%)', borderRadius: '50%' }} />
      <div style={{ ...marca, top: -2, left: '25%', width: '50%', height: '12%', borderTopWidth: 0 }} />
      <div style={{ ...marca, bottom: -2, left: '25%', width: '50%', height: '12%', borderBottomWidth: 0 }} />

      {/* Rótulos dos times */}
      <span style={{ position: 'absolute', top: 6, left: 8, zIndex: 3, fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: COR_A, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
        {String(nomeA).toUpperCase()}
      </span>
      <span style={{ position: 'absolute', top: 'calc(50% + 6px)', left: 8, zIndex: 3, fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: COR_B, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
        {String(nomeB).toUpperCase()}
      </span>

      {/* Metade de cima — Time A */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', padding: '22px 6px 6px', zIndex: 2 }}>
        {ordemA.map((l) => (distA[l].length ? <Linha key={l} jogadores={distA[l]} cor={COR_A} /> : null))}
      </div>

      {/* Metade de baixo — Time B */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', padding: '22px 6px 6px', zIndex: 2 }}>
        {ordemB.map((l) => (distB[l].length ? <Linha key={l} jogadores={distB[l]} cor={COR_B} /> : null))}
      </div>
    </div>
  );
}
