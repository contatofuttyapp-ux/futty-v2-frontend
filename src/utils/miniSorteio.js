// Futty v2.0 — o que o mini sorteio do Onboarding (components/MiniSorteio.jsx) sorteia e QUANDO. Puro (sem
// React). Oito FIGURINHAS FICTÍCIAS (modelos gerados por IA, 20–40 anos, nunca pessoa real; bancada
// backend/scripts/_bench/gerar-modelos-ficticios.js --jovens..--jovens7; bustos em public/onboarding/,
// servidos do site) em oito ROLOS de slot machine, 4 por time (dono: 4 jogadores por time) — TIME A (ouro)
// e TIME B (roxo). Os 8 giram; um por vez desacelera e trava, alternando A/B; os times seguram; fade;
// recomeça com outra ordem. Nomes fictícios curtos (dono): nunca nomes de gente real do app. GONÇALO (dono)
// é o nome do busto j12 — o arquivo é goncalo.webp (o id não leva cedilha: é URL). A ordem natural (ciclo
// 0) alterna A/B: TIME A = bruninho, gonçalo, rafa, nando · TIME B = tiagão, pedrão, dudu, caio — 2 do
// Brasil e 2 de Portugal em cada time.

// O arquivo leva ?v=<hash do conteúdo> (vite.config.js define __VERSOES_ONBOARDING__ a cada build). O
// _headers serve /onboarding/* com cache de 1 ano, imutável, e o nome do arquivo não muda quando a arte
// muda — sem a versão, quem já viu o busto antigo continuava vendo. Fora do Vite (os testes no Node) não há
// versão e o caminho fica limpo.
/* global __VERSOES_ONBOARDING__ */
const VERSOES = typeof __VERSOES_ONBOARDING__ !== 'undefined' ? __VERSOES_ONBOARDING__ : {};
const arquivoDe = (id) => `/onboarding/${id}.webp${VERSOES[id] ? `?v=${VERSOES[id]}` : ''}`;

export const FIGURINHAS = [
  { id: 'bruninho', nome: 'BRUNINHO' },
  { id: 'tiagao', nome: 'TIAGÃO' },
  { id: 'goncalo', nome: 'GONÇALO' },
  { id: 'pedrao', nome: 'PEDRÃO' },
  { id: 'rafa', nome: 'RAFA' },
  { id: 'dudu', nome: 'DUDU' },
  { id: 'nando', nome: 'NANDO' },
  { id: 'caio', nome: 'CAIO' },
].map((f) => ({ ...f, arquivo: arquivoDe(f.id) }));

export const TIMES = [
  { id: 'A', nome: 'Time A', cor: '#d4a017', brilho: 'rgba(212,160,23,.55)' },
  { id: 'B', nome: 'Time B', cor: '#8b5cf6', brilho: 'rgba(139,92,246,.55)' },
];

export const VAGAS_POR_TIME = 4;

// O ciclo (~10,7 s). Os 8 rolos girando rápido → a partir de 0,4 s um rolo por vez desacelera (1,5 s) e
// trava, alternando A/B a cada 0,75 s (o 8º trava em 7,15 s) → quando o 8º trava, um pulso único de 0,8 s
// nas réguas e os times seguram 2,5 s → fade 0,4 s → os rolos voltam a girar (0,6 s de respiro) → recomeça
// com outra ordem.
export const TEMPOS = { giroMs: 400, passoMs: 750, desaceleraMs: 1500, pulsoMs: 800, seguraMs: 2500, fadeMs: 400, respiroMs: 600 };

/** Os instantes do ciclo, a partir do seu início (ms): o k-ésimo rolo da ordem desacelera em desaceleram[k] e trava em travam[k]. */
export function agendaDoCiclo(t = TEMPOS) {
  const desaceleram = FIGURINHAS.map((_, k) => t.giroMs + k * t.passoMs);
  const travam = desaceleram.map((d) => d + t.desaceleraMs);
  const cheioEm = travam[travam.length - 1];
  const pulsoFimEm = cheioEm + t.pulsoMs;
  const saindoEm = cheioEm + t.seguraMs;
  const girandoEm = saindoEm + t.fadeMs;
  const fimEm = girandoEm + t.respiroMs;
  return { desaceleram, travam, cheioEm, pulsoFimEm, saindoEm, girandoEm, fimEm };
}

export const CICLO_MS = agendaDoCiclo().fimEm;

// Mulberry32 — o mesmo da casa (backend/scripts/_bench/comum.js): embaralha de forma reproduzível.
function mulberry32(a) {
  return function proximo() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function embaralhar(ids, semente) {
  const rnd = mulberry32(semente);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

/**
 * A ordem em que os rolos travam no ciclo k: uma permutação das 8 figurinhas (Fisher-Yates com semente = k), cada uma já com
 * o time (alternando A, B, A, B…) e a vaga (0..3) do rolo onde ela cai. O ciclo 0 é a ordem natural: é o que se vê sem
 * JS/com movimento reduzido, e o 1º ciclo animado repete-a.
 */
export function ordemDoCiclo(k) {
  const ids = FIGURINHAS.map((f) => f.id);
  if (k > 0) embaralhar(ids, k * 0x9E3779B1);
  return ids.map((id, i) => ({ id, time: TIMES[i % TIMES.length].id, vaga: Math.floor(i / TIMES.length), ordem: i }));
}

/**
 * A tira do rolo `indice` (0..7 = A0..A3, B0..B3): as 8 figurinhas numa ordem própria do rolo, fixa em todos os ciclos
 * (a tira é a mesma peça de papel girando) — para os 8 rolos não mostrarem a mesma sequência ao mesmo tempo.
 */
export function tiraDoRolo(indice) {
  return embaralhar(FIGURINHAS.map((f) => f.id), (indice + 1) * 0x85EBCA6B);
}
