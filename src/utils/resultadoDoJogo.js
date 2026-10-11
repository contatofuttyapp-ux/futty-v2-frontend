// Futty v2.0 — as contas do resultado de um jogo, puras (sem React, sem rede), para o editor ÚNICO (components/ResultadoEditor.jsx): o da tela do
// jogo, o de Ajustes → Jogos (ResultadoModal, que abre o mesmo editor para corrigir) e o passo "Como terminou?" do Jogo passado, onde ele
// devolve os dados em vez de salvar. E para a Resenha e o Início.
//
// A regra é a do motor (backend/utils/resultadoDoJogo.js): o CAMPEÃO é a verdade e placar e vencedor nunca são escolhas separadas. Com 2 times
// quem manda é, nesta ordem, (1) os gols por jogador — o placar é a soma por time —, (2) o placar digitado, (3) o vencedor tocado; e o placar
// define o vencedor ou o empate. Com 3 ou 4 times (rodízio) não há placar nem empate: só o campeão. Aqui o editor mostra a MESMA decisão que o
// motor vai tomar, e o corpo dos pedidos é montado num lugar só, seja qual for a tela que o manda.
import { chaveDoJogador } from './seloDoSorteio';
import { nomeDoTimeNaTela } from './nomeDoTime';

/** Soma dos gols de cada time (0 = A, 1 = B) a partir do mapa { chave: gols } (chaveDoJogador) e dos jogadores `{ user_id, nome, timeIndex }`. */
export function somaDeGolsPorTime(golsMap, jogadores) {
  const soma = [0, 0];
  for (const j of jogadores || []) {
    if (j?.timeIndex === 0 || j?.timeIndex === 1) soma[j.timeIndex] += Math.max(0, Number(golsMap?.[chaveDoJogador(j)]) || 0);
  }
  return soma;
}

/** Algum gol foi marcado na lista de gols? */
export function temGols(golsMap) {
  return Object.values(golsMap || {}).some((n) => Number(n) > 0);
}

// O resultado só abre depois que o jogo começou de verdade: 5 minutos depois do horário marcado (a mesma conta do motor — backend/utils/resultadoDoJogo.js —
// e do card "Quem ganhou?" do Início). Jogo histórico ("Jogo passado") não tem trava.
export const ESPERA_DO_RESULTADO_MS = 5 * 60 * 1000;

/** O instante (ms) em que o resultado deste jogo abre, ou null para jogo sem data. */
export function resultadoAbreEm(game) {
  const ms = game?.data ? new Date(game.data).getTime() : NaN;
  return Number.isNaN(ms) ? null : ms + ESPERA_DO_RESULTADO_MS;
}

/** O resultado já pode ser lançado? Jogo histórico sempre; os outros, 5 minutos depois do início. */
export function resultadoJaAbriu(game, agora = Date.now()) {
  if (game?.historico) return true;
  const abre = resultadoAbreEm(game);
  return abre !== null && abre <= agora;
}

/** Os nomes dos times como a tela os chama ("Time Ouro", "Time Roxo"…), na ordem do jogo. */
export function nomesDosTimes(timesResultado) {
  return (Array.isArray(timesResultado?.times) ? timesResultado.times : []).map((t, i) => nomeDoTimeNaTela(t?.nome, i));
}

/** Os jogadores de TODOS os times do jogo (a lista de gols vale para 2, 3 ou 4 times), cada um com o nome do time e o índice: { ...jogador, time, timeIndex }. */
export function jogadoresDosTimes(timesResultado) {
  const nomes = nomesDosTimes(timesResultado);
  return (Array.isArray(timesResultado?.times) ? timesResultado.times : []).flatMap((t, i) => (t?.jogadores || []).map((j) => ({ ...j, time: nomes[i], timeIndex: i })));
}

/** O que o jogo diz hoje: { tipo: 'campeao', idx } | { tipo: 'empate' } | null. O campeão manda; time_vencedor sozinho só vale em jogo antigo (campeão nulo + A/B). */
export function resultadoGravado(g) {
  if (!g) return null;
  if (Number.isInteger(g.campeao_time_index) && g.campeao_time_index >= 0) return { tipo: 'campeao', idx: g.campeao_time_index };
  if (g.time_vencedor === 'empate') return { tipo: 'empate' };
  if (g.time_vencedor === 'A') return { tipo: 'campeao', idx: 0 };
  if (g.time_vencedor === 'B') return { tipo: 'campeao', idx: 1 };
  return null;
}

/** O jogo já tem campeão ou empate marcado? (É o critério de "resultado lançado": nível, placar e gols não bastam.) */
export function jogoTemResultado(g) {
  return resultadoGravado(g) !== null;
}

/**
 * A frase do resultado de um jogo ("Time Ouro 3 × 1 Time Roxo", "Empate", "Time Prata campeão"), ou null sem resultado.
 * @param {object} game o jogo (campeao_time_index, time_vencedor, placar_a, placar_b)
 * @param {string[]} nomes o nome de cada time, na ordem do jogo
 */
export function fraseDoResultado(game, nomes) {
  const r = resultadoGravado(game);
  if (!r) return null;
  const nome = (i) => nomes?.[i] || `Time ${i + 1}`;
  if (Number.isInteger(game.placar_a) && Number.isInteger(game.placar_b)) return `${nome(0)} ${game.placar_a} × ${game.placar_b} ${nome(1)}`;
  if (r.tipo === 'empate') return 'Empate';
  return (nomes?.length || 0) >= 3 ? `${nome(r.idx)} campeão` : `${nome(r.idx)} venceu`;
}

/** Tudo o que o editor guarda enquanto a pessoa preenche: quem ganhou, o placar digitado, os gols de cada um e os prêmios (artilheiro, destaque, rodada de cerveja, foto). */
export const RESULTADO_VAZIO = {
  campeaoIdx: null, empate: false,
  placarA: null, placarB: null, // o que a pessoa DIGITOU (texto); null = não digitou
  golsMap: {},
  campeaoFoto: null,
  temArt: false, artId: '', artGols: 1,
  temDest: false, destId: '', destTitulo: '',
  temRodada: false, rodadaId: '', rodadaFoto: null,
};

/** O estado inicial do editor a partir de um jogo já salvo (e da lista de gols dele): corrigir parte do que está gravado. */
export function estadoDoJogo(game, gols) {
  const g = game || {};
  const r = resultadoGravado(g);
  const golsMap = {};
  // Chave do motor (id de quem tem conta, nome de quem é convidado sem app): dois convidados não compartilham contador.
  (gols || []).forEach((x) => { golsMap[chaveDoJogador(x)] = x.gols || 0; });
  // Com gols lançados o placar é a soma deles — não é um número digitado. Sem gols, o placar gravado foi digitado.
  const digitado = !temGols(golsMap) && Number.isInteger(g.placar_a) && Number.isInteger(g.placar_b);
  return {
    ...RESULTADO_VAZIO,
    campeaoIdx: r?.tipo === 'campeao' ? r.idx : null,
    empate: r?.tipo === 'empate',
    placarA: digitado ? String(g.placar_a) : null,
    placarB: digitado ? String(g.placar_b) : null,
    golsMap,
    campeaoFoto: g.campeao_foto_url || null,
    temArt: !!g.artilheiro_user_id, artId: g.artilheiro_user_id || '', artGols: g.artilheiro_gols || 1,
    temDest: !!g.destaque_user_id, destId: g.destaque_user_id || '', destTitulo: g.destaque_titulo || '',
    temRodada: !!g.rodada_user_id, rodadaId: g.rodada_user_id || '', rodadaFoto: g.rodada_foto_url || null,
  };
}

const vazio = (v) => v === null || v === undefined || String(v).trim() === '';
const inteiro = (v) => Math.max(0, Math.floor(Number(v)) || 0);

/** A pessoa digitou algum dos dois campos do placar? */
export function placarFoiDigitado(estado) {
  return !vazio(estado?.placarA) || !vazio(estado?.placarB);
}

/**
 * O desfecho que o editor mostra e manda — o mesmo que o motor decide. `origem` diz quem decidiu: 'gols' (o placar é a soma e é mostrado, não digitado),
 * 'placar' (o digitado), 'toque' (o vencedor tocado) ou null (sem resultado).
 * @param {object} estado o estado do editor (RESULTADO_VAZIO)
 * @param {{ nTimes: number, jogadores?: object[] }} jogo quantos times o jogo tem e quem joga neles (para somar os gols)
 * @returns {{ origem: 'gols'|'placar'|'toque'|null, campeaoIdx: number|null, empate: boolean, placar: { a: number, b: number }|null }}
 */
export function desfechoDoEstado(estado, { nTimes, jogadores } = {}) {
  const idx = Number.isInteger(estado?.campeaoIdx) && estado.campeaoIdx >= 0 && estado.campeaoIdx < nTimes ? estado.campeaoIdx : null;
  if (nTimes === 2) {
    const [golsA, golsB] = somaDeGolsPorTime(estado?.golsMap, jogadores);
    let placar = null;
    let origem = null;
    if (golsA + golsB > 0) { placar = { a: golsA, b: golsB }; origem = 'gols'; }
    else if (placarFoiDigitado(estado)) { placar = { a: inteiro(estado.placarA), b: inteiro(estado.placarB) }; origem = 'placar'; }
    if (placar) return { origem, placar, campeaoIdx: placar.a > placar.b ? 0 : placar.a < placar.b ? 1 : null, empate: placar.a === placar.b };
    if (idx !== null || estado?.empate) return { origem: 'toque', placar: null, campeaoIdx: idx, empate: idx === null };
    return { origem: null, placar: null, campeaoIdx: null, empate: false };
  }
  if (nTimes >= 3 && idx !== null) return { origem: 'toque', placar: null, campeaoIdx: idx, empate: false };
  return { origem: null, placar: null, campeaoIdx: null, empate: false };
}

/** Tem algo para mandar ao motor sobre o resultado — quem ganhou, placar ou algum gol? */
export function temResultadoNoEstado(estado, jogo) {
  return desfechoDoEstado(estado, jogo).origem !== null || temGols(estado?.golsMap);
}

/**
 * O corpo do PATCH /api/games/:id/resultado: quem ganhou (o campeão, ou `empate`), o placar SÓ quando foi digitado (com gols, o motor o soma) e os
 * gols de cada um. Convidado sem app não tem user_id: o gol dele vai por `convidado_nome` (a mesma chave do motor identifica o jogador dos dois
 * lados, sem misturar dois convidados). Corpo vazio de resultado = "sem resultado" (limpa).
 * @param {object} estado
 * @param {{ nTimes: number, jogadores?: Array<{ user_id: string|null, nome: string }> }} jogo quem entra na lista de gols
 */
export function corpoDoResultadoDoJogo(estado, jogo) {
  const d = desfechoDoEstado(estado, jogo);
  const body = { campeao_time_index: d.campeaoIdx, empate: d.empate };
  if (d.origem === 'placar') { body.placar_a = d.placar.a; body.placar_b = d.placar.b; }
  body.gols = (jogo?.jogadores || [])
    .map((j) => ({ user_id: j.user_id || null, convidado_nome: j.user_id ? null : String(j.nome || '').trim() || null, gols: inteiro(estado?.golsMap?.[chaveDoJogador(j)]) }))
    .filter((g) => g.gols > 0);
  return body;
}

/**
 * O corpo do PATCH /api/feed/games/:id/resultado: só o que a Resenha mostra além de quem ganhou — artilheiro, destaque, rodada de cerveja e a foto do
 * campeão. Sem `soPreenchidos` (editar um jogo salvo), o que a pessoa desligou vai como `null` — é assim que um prêmio se apaga. Com `soPreenchidos`
 * (jogo novo, nada para apagar), só vai o que existe.
 */
export function corpoDosPremios(v, { soPreenchidos = false } = {}) {
  const patch = {};
  if (v.campeaoFoto) patch.campeao_foto_url = v.campeaoFoto;
  patch.artilheiro_user_id = v.temArt && v.artId ? v.artId : null;
  patch.artilheiro_gols = v.temArt && v.artId ? Math.max(1, Number(v.artGols) || 1) : null;
  patch.destaque_user_id = v.temDest && v.destId ? v.destId : null;
  patch.destaque_titulo = v.temDest && v.destId ? (v.destTitulo || '').trim() || null : null;
  patch.rodada_user_id = v.temRodada && v.rodadaId ? v.rodadaId : null;
  if (v.temRodada && v.rodadaId && v.rodadaFoto) patch.rodada_foto_url = v.rodadaFoto;
  if (!soPreenchidos) return patch;
  return Object.fromEntries(Object.entries(patch).filter(([, valor]) => valor !== null));
}

/** Há foto do campeão, artilheiro, destaque ou rodada para mandar ao PATCH do feed? (Sem isso o pedido nem sai.) */
export function temPremio(corpo) {
  return !!corpo.campeao_foto_url || !!corpo.artilheiro_user_id || !!corpo.destaque_user_id || !!corpo.rodada_user_id;
}

/** O nome do time dentro de uma frase de placar: "Ouro", não "Time Ouro". */
export function nomeCurtoDoTime(nomeDoDado, indice = 0) {
  return nomeDoTimeNaTela(nomeDoDado, indice).replace(/^Time\s+/i, '');
}

/**
 * O empate de um jogo da Resenha, ou null quando o jogo não terminou empatado. Empate = sem campeão + time_vencedor 'empate'
 * (o motor grava assim; "sem resultado" nem chega na Resenha). A frase não inventa número: sem placar é "Ouro × Roxo".
 * @returns {{ frase: string, times: Array<{ nome: string, jogadores: object[] }> }|null}
 */
export function empateDaResenha(j) {
  if (!j || j.time_vencedor !== 'empate' || (j.campeao_time_index !== null && j.campeao_time_index !== undefined)) return null;
  const times = j.times_resultado?.times;
  if (!Array.isArray(times) || times.length < 2) return null;
  const [a, b] = times;
  const nomeA = nomeCurtoDoTime(a?.nome, 0);
  const nomeB = nomeCurtoDoTime(b?.nome, 1);
  const temPlacar = Number.isInteger(j.placar_a) && Number.isInteger(j.placar_b);
  return {
    frase: temPlacar ? `${nomeA} ${j.placar_a} × ${j.placar_b} ${nomeB}` : `${nomeA} × ${nomeB}`,
    times: [{ nome: nomeA, jogadores: a?.jogadores || [] }, { nome: nomeB, jogadores: b?.jogadores || [] }],
  };
}
