// Futty v2.0 — O card "Quem ganhou o jogo?" do Início, puro (sem React, sem rede), para testar no Node. O motor entrega o card pronto (GET /api/inicio →
// seu_time[].quem_ganhou, só para o admin, do jogo sorteado 5 minutos depois do início até alguém marcar o campeão ou o empate); aqui vira a lista
// de avisos da fila do Início e o corpo do pedido que responde à pergunta.
import { CORES_DAS_POSICOES, nomeDoTimeNaTela } from './nomeDoTime';

/**
 * Os cards "Quem ganhou?" pendentes, do jogo mais antigo ao mais novo (o que esperou mais resposta vem primeiro).
 * @param {Array<object>} seuTime o `seu_time` do /api/inicio (um por time em que a pessoa é admin)
 * @param {Set<string>|string[]} [respondidos] ids de jogo que o admin acabou de responder (a tela some com o card sem esperar a próxima leitura)
 * @param {Array<{ id: string, cidade?: string|null }>} [teams] os times da pessoa: a cidade vai no card para a hora do jogo ganhar o rabicho de quem está noutro relógio
 * @returns {Array<{ game_id: string, slug: string, time_nome: string, fuso: string|null, cidade: string|null, data: string, local: string|null, times: Array<{ nome: string, cor: string }> }>}
 */
export function cardsQuemGanhou(seuTime, respondidos = [], teams = []) {
  const feitos = new Set(respondidos);
  return (seuTime || [])
    .filter((t) => t?.quem_ganhou?.game_id && !feitos.has(t.quem_ganhou.game_id) && (t.quem_ganhou.times || []).length >= 2)
    .map((t) => ({
      game_id: t.quem_ganhou.game_id,
      slug: t.slug,
      time_nome: t.nome,
      fuso: t.fuso || null,
      cidade: (teams || []).find((x) => x.id === t.team_id)?.cidade || null,
      data: t.quem_ganhou.data,
      local: t.quem_ganhou.local || null,
      // O nome e a cor de cada time, os mesmos da cerimônia ("Time Ouro", "Time Roxo"…): por posição, não pelo "Time A" do motor.
      times: t.quem_ganhou.times.map((tm, i) => ({ nome: nomeDoTimeNaTela(tm?.nome, i), cor: CORES_DAS_POSICOES[i % CORES_DAS_POSICOES.length] })),
    }))
    .sort((a, b) => Date.parse(a.data) - Date.parse(b.data));
}

/** A pergunta: com 2 times "Quem ganhou o jogo?" (e cabe empate); com 3 ou 4 (rodízio) "Quem foi o campeão?" — sem empate. */
export function perguntaDoJogo(nTimes) {
  return { titulo: nTimes >= 3 ? 'Quem foi o campeão?' : 'Quem ganhou o jogo?', temEmpate: nTimes === 2 };
}

/**
 * A escolha da pergunta no formato do editor do jogo (`campeaoIdx`/`empate`), para ela não se perder quando a pessoa segue para "Lançar gols e
 * prêmios". Sem escolha, nada vai.
 * @param {number|'empate'|null} resposta o índice do time tocado, 'empate' ou null
 * @returns {{ campeaoIdx: number|null, empate: boolean }|null}
 */
export function escolhaParaOEditor(resposta) {
  if (resposta === 'empate') return { campeaoIdx: null, empate: true };
  return Number.isInteger(resposta) && resposta >= 0 ? { campeaoIdx: resposta, empate: false } : null;
}

/**
 * O corpo do PATCH /api/games/:id/resultado para a resposta tocada: o índice do time campeão, ou 'empate' (só com 2 times). É o mesmo corpo do editor
 * completo quando só o vencedor foi tocado — o motor deduz o resto.
 */
export function corpoDaResposta(resposta) {
  return resposta === 'empate' ? { campeao_time_index: null, empate: true } : { campeao_time_index: resposta, empate: false };
}
