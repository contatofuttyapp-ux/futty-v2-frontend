// Futty v2.0 — Rodada 29E: o que o mini sorteio do Onboarding (components/MiniSorteio.jsx) sorteia. Puro (sem React).
// Seis FIGURINHAS FICTÍCIAS (modelos gerados por IA em 30-set e 1-out, 18–25 anos, nunca pessoa real; bancada
// backend/scripts/_bench/gerar-modelos-ficticios.js --jovens/--jovens2; bustos em public/onboarding/, servidos do site) caem
// uma a uma em dois times, TIME A (ouro) e TIME B (roxo), 3 vagas cada, alternando A/B; seguram; esvaziam; recomeçam com
// outra ordem. Nomes fictícios curtos (dono): nunca nomes de gente real do app.

export const FIGURINHAS = [
  { id: 'bruninho', nome: 'BRUNINHO', arquivo: '/onboarding/bruninho.webp' },
  { id: 'tiagao', nome: 'TIAGÃO', arquivo: '/onboarding/tiagao.webp' },
  { id: 'leo', nome: 'LÉO', arquivo: '/onboarding/leo.webp' },
  { id: 'pedrao', nome: 'PEDRÃO', arquivo: '/onboarding/pedrao.webp' },
  { id: 'rafa', nome: 'RAFA', arquivo: '/onboarding/rafa.webp' },
  { id: 'dudu', nome: 'DUDU', arquivo: '/onboarding/dudu.webp' },
];

export const TIMES = [
  { id: 'A', nome: 'Time A', cor: '#d4a017', brilho: 'rgba(212,160,23,.55)' },
  { id: 'B', nome: 'Time B', cor: '#8b5cf6', brilho: 'rgba(139,92,246,.55)' },
];

export const VAGAS_POR_TIME = 3;

// O ciclo (~7 s): vagas vazias → 6 entradas a cada 0,45 s (a última ainda "pipoca" 0,4 s) → seguram 2,5 s com as micro-lâmpadas
// piscando → esvaziam (0,4 s) → um respiro vazio → recomeça com outra ordem.
export const TEMPOS = { vazioMs: 600, passoMs: 450, popMs: 400, seguraMs: 2500, fadeMs: 400, respiroMs: 650 };

/** Os instantes do ciclo, a partir do seu início (ms). */
export function agendaDoCiclo(t = TEMPOS) {
  const entradas = FIGURINHAS.map((_, k) => t.vazioMs + k * t.passoMs);
  const cheioEm = entradas[entradas.length - 1] + t.popMs;
  const saindoEm = cheioEm + t.seguraMs;
  const vazioEm = saindoEm + t.fadeMs;
  const fimEm = vazioEm + t.respiroMs;
  return { entradas, cheioEm, saindoEm, vazioEm, fimEm };
}

export const CICLO_MS = agendaDoCiclo().fimEm;

// Mulberry32 — o mesmo da casa (backend/scripts/_bench/comum.js): embaralha de forma reproduzível, por ciclo.
function mulberry32(a) {
  return function proximo() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A ordem de entrada do ciclo k: uma permutação das 6 figurinhas (Fisher-Yates com semente = k), cada entrada já com o
 * time (alternando A, B, A, B…) e a vaga (0..2) onde cai. O ciclo 0 é a ordem natural: é o que se vê sem JS/com
 * movimento reduzido, e o 1º ciclo animado repete-a.
 */
export function ordemDoCiclo(k) {
  const ids = FIGURINHAS.map((f) => f.id);
  if (k > 0) {
    const rnd = mulberry32(k * 0x9E3779B1);
    for (let i = ids.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rnd() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
  }
  return ids.map((id, i) => ({ id, time: TIMES[i % TIMES.length].id, vaga: Math.floor(i / TIMES.length), ordem: i }));
}
