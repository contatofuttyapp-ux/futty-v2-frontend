// Futty v2.0 — Os três formatos de campeonato: nome na tela, a linha que explica cada um e o mínimo de times.
// Puro (sem React), para o criar do campeonato, a escolha a partir do sorteio, a lista e a página do campeonato falarem igual.
import { contar } from './plural';

export const MIN_TIMES_DO_FORMATO = { pontos: 2, pontos_final: 3, mata: 2 };

const NOMES = {
  pontos: { nome: 'Pontos corridos', curto: 'Pontos corridos' },
  pontos_final: { nome: 'Todos contra todos + final', curto: 'Grupo + final' },
  mata: { nome: 'Mata-mata', curto: 'Mata-mata' },
};

/** O nome do formato na tela. `curto` é para onde o comprido não cabe (os selos da lista): "Grupo + final". */
export function nomeDoFormato(formato, { curto = false } = {}) {
  const f = NOMES[formato] || NOMES.pontos;
  return curto ? f.curto : f.nome;
}

/** Quantos jogos o formato tem com N times: "6 jogos + final", "6 jogos", "3 jogos". */
export function jogosDoFormato(formato, nTimes) {
  const n = Math.max(0, Math.floor(nTimes) || 0);
  const todosContraTodos = (n * (n - 1)) / 2;
  const jogos = (q) => contar(q, 'jogo', 'jogos');
  if (formato === 'mata') return jogos(Math.max(0, n - 1));
  if (formato === 'pontos_final') return `${jogos(todosContraTodos)} + final`;
  return jogos(todosContraTodos);
}

const EXPLICACAO = {
  pontos: 'Todos jogam entre si uma vez. Vence quem somar mais pontos.',
  pontos_final: 'Todos jogam entre si e os 2 primeiros decidem o título na final.',
  mata: 'Eliminatória direta. Quem perde sai; o vencedor avança até a final.',
};

/** A linha que explica o formato. Com `nTimes`, termina com a conta de jogos ("Com 4 times: 6 jogos + final."). */
export function explicacaoDoFormato(formato, nTimes = null) {
  const base = EXPLICACAO[formato] || EXPLICACAO.pontos;
  return nTimes ? `${base} Com ${nTimes} times: ${jogosDoFormato(formato, nTimes)}.` : base;
}

/** Os formatos que valem para N times, na ordem em que aparecem na escolha. Com 2 times "Todos contra todos + final" não existe. */
export function formatosParaOTime(nTimes) {
  return ['pontos', 'pontos_final', 'mata'].filter((f) => !nTimes || nTimes >= MIN_TIMES_DO_FORMATO[f]);
}

/** Um campeonato de tabela com final (vaga ou jogo)? As telas separam "Fase de grupos" e "Final" só neste formato. */
export const temFaseFinal = (campeonato) => campeonato?.formato === 'pontos_final';

/** Os jogos de cada fase de um campeonato "Todos contra todos + final". Confronto antigo, sem `fase`, é de grupos. */
export function fasesDoCampeonato(campeonato) {
  const confrontos = campeonato?.confrontos || [];
  return {
    grupos: confrontos.filter((c) => (c.fase || 'grupos') === 'grupos'),
    final: confrontos.find((c) => c.fase === 'final') || null,
  };
}
