// Futty v2.0 — o ESTADO do jogo na tela, puro (sem React, sem rede). A regra é do motor (backend/utils/estadoDoJogo.js): antes do início "agendado";
// do início até o resultado lançado (campeão ou empate) ou 2 horas depois, "em_curso" (a tela diz "Em andamento"); depois disso "terminado";
// "cancelado" sempre. A tela não refaz a conta: lê o que o motor mandou, em qualquer das três respostas que mostram o estado —
//   · Ajustes → Jogos, lista de jogos e Página do Jogo: `status` (agendado · em_curso · terminado · cancelado);
//   · Início: `estado`, com o mesmo vocabulário (o `status` do Início — scheduled/drawn/finished — é outra coisa e segue decidindo presença,
//     "próximo jogo" e "Sortear").

const ESTADOS = ['agendado', 'em_curso', 'terminado', 'cancelado'];

/**
 * O estado do jogo, como o motor o entregou. Motor mais velho que a tela (Início sem `estado`): o que o `status` de sempre dizia —
 * começou ou acabou = terminado, o resto = agendado.
 * @param {{ estado?: string, status?: string, cancelado?: boolean }} g
 * @returns {'agendado'|'em_curso'|'terminado'|'cancelado'}
 */
export function estadoDoJogo(g) {
  if (ESTADOS.includes(g?.estado)) return g.estado;
  if (ESTADOS.includes(g?.status)) return g.status;
  if (g?.cancelado) return 'cancelado';
  return g?.status === 'finished' ? 'terminado' : 'agendado';
}

/** O jogo está rolando agora? Fica na lista de cima (Próximos), com o selo "Em andamento", até terminar. */
export function jogoEmAndamento(g) {
  return estadoDoJogo(g) === 'em_curso';
}

/** O jogo acabou (o resultado foi lançado ou passaram as 2 horas)? Cancelado não conta: não é "Terminado". */
export function jogoTerminado(g) {
  return estadoDoJogo(g) === 'terminado';
}

/**
 * As duas listas do Início, da lista de jogos que o motor mandou (ordenada por data ascendente):
 *   · `proximos` ("Próximos Jogos"): o que ainda vai acontecer e o que está em andamento, que só sai dali quando terminar;
 *   · `ultimos` ("Últimos Jogos"): os 3 terminados mais recentes, o mais recente primeiro. Cancelado não aparece em nenhuma.
 * E o `proximo` jogo: o primeiro que AINDA NÃO COMEÇOU (o `status` de sempre diz: finished = já começou). Presença, aviso de ausência, RSVP e
 * "Sortear" ficam nele; o jogo em andamento não conta.
 */
export function listasDoInicio(jogos) {
  const lista = jogos || [];
  const proximos = lista.filter((g) => ['agendado', 'em_curso'].includes(estadoDoJogo(g)));
  return {
    proximos,
    ultimos: lista.filter(jogoTerminado).slice(-3).reverse(),
    proximo: proximos.find((g) => g.status !== 'finished') || null,
  };
}
