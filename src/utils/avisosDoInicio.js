// Futty v2.0 — a fila dos avisos do topo do Início. UM aviso por vez, o mais importante primeiro;
// respondeu ou fechou, entra o próximo.
// Mais de um do mesmo tipo → o mais próximo e um "+N" discreto.
//
// A fila não trava: primeiro o que ACONTECEU ou TEM PRAZO, depois os lembretes SEM PRAZO, por último
// ativar notificações.
// Os lembretes sem prazo (LEMBRETES_SEM_PRAZO) ganham "Agora não", que os esconde por 7 dias naquele
// aparelho (utils/lembretes.js): a fila anda. A ordem (ORDEM_DOS_AVISOS):
//   1. jogo sem resposta (o próximo jogo com presença aberta e sem Vou / Não vou) — a pessoa abre o app
//      para responder "vou ou não vou";
//   2. pedido de entrada pendente;
//   3. a resposta do pedido de entrada (aceito / recusado);
//   4. votação (você tem colegas para avaliar / nova temporada de notas);
//   5. o desfecho da denúncia;
//   6. a figurinha nascendo (ou que não saiu);
//   — daqui para baixo, lembretes sem prazo —
//   7. "Você tem uma figurinha para gerar" · 8. o recado do pedido de figurinha · 9. o uniforme por
//      escolher · 10. "Complete seu card" · 11. a data de nascimento;
//   12. ativar notificações, por último.
// Puro (sem React, sem rede): o Início só desenha o que esta fila devolve, e o teste roda no Node.

/** A ordem em que um tipo de aviso passa à frente de outro. */
export const ORDEM_DOS_AVISOS = [
  'jogo',
  'pedido',
  'desfecho',
  'votacao',
  'denuncia',
  'figurinha-nascendo',
  'figurinha-pronta',
  'recado-figurinha',
  'uniforme',
  'card',
  'nascimento',
  'notificacoes',
];

/** Os lembretes sem prazo: cada um tem o seu "Agora não" (7 dias, naquele aparelho). Ficam depois do que aconteceu e antes de ativar notificações. */
export const LEMBRETES_SEM_PRAZO = ['figurinha-pronta', 'recado-figurinha', 'uniforme', 'card', 'nascimento'];

/** De que chave de `proximoAviso` vem cada tipo, e se ele conta os que esperam atrás ("+N"). */
const FONTES = {
  jogo: { chave: 'jogos', mais: true },
  pedido: { chave: 'pedidos', mais: true },
  // Fechar a votação a esconde para a sessão inteira (todas as equipes de uma vez): não há "o próximo" por trás, então não há "+N".
  votacao: { chave: 'votacoes', mais: false },
  'figurinha-pronta': { chave: 'figurinhaPronta', mais: false },
  desfecho: { chave: 'desfechos', mais: true },
  'figurinha-nascendo': { chave: 'figurinhaNascendo', mais: false },
  uniforme: { chave: 'uniforme', mais: false },
  'recado-figurinha': { chave: 'recadoFigurinha', mais: false },
  nascimento: { chave: 'nascimento', mais: false },
  denuncia: { chave: 'denuncia', mais: false },
  card: { chave: 'card', mais: false },
  notificacoes: { chave: 'notificacoes', mais: false },
};

/** O jogo ainda aceita resposta de presença? Marcado (nem sorteado, nem encerrado, nem cancelado). */
function presencaAberta(jogo) {
  return jogo.status === 'scheduled' && !jogo.cancelado;
}

/** Instante do jogo em ms; jogo sem data vai para o fim da fila. */
function quando(jogo) {
  const ms = jogo.date ? Date.parse(jogo.date) : NaN;
  return Number.isNaN(ms) ? Infinity : ms;
}

/**
 * Os jogos que pedem uma resposta da pessoa, do mais próximo para o mais distante.
 * Pede resposta: presença aberta, `user_status` vazio e a pessoa JOGA nesse time (nunca onde ela só organiza, `eu_jogo === false`).
 * Quem já avisou que não vai ao próximo jogo do time (`ausente_proximo`) já respondeu àquele jogo: ele não entra.
 * `games` precisa trazer `user_status` já com a resposta de agora (o Início troca pelo RSVP e pelo otimista antes de chamar).
 */
export function jogosQuePedemResposta(games = []) {
  const ordenados = [...games].sort((a, b) => quando(a) - quando(b));
  const jaViuProximoDoTime = new Set();
  const pedem = [];
  for (const jogo of ordenados) {
    if (jogo.status === 'finished') continue;
    const eOProximoDoTime = !jaViuProximoDoTime.has(jogo.team_id);
    jaViuProximoDoTime.add(jogo.team_id);
    if (!presencaAberta(jogo) || jogo.eu_jogo === false || jogo.user_status) continue;
    if (eOProximoDoTime && jogo.ausente_proximo) continue;
    pedem.push(jogo);
  }
  return pedem;
}

/** O que há para mostrar de um tipo: uma lista (os itens, do mais próximo ao mais distante), um item só, `true` (aviso sem item) ou nada. */
function itensDe(valor) {
  if (Array.isArray(valor)) return valor;
  return valor ? [valor] : [];
}

/**
 * O aviso que vai ao topo agora, ou null quando a fila está vazia. Cada chave é o que há para mostrar daquele tipo (lista, item, ou `true`):
 *   jogos · pedidos · votacoes · figurinhaPronta · desfechos · figurinhaNascendo · uniforme · recadoFigurinha · nascimento · denuncia · card · notificacoes
 * @returns {{ tipo: string, item: any, mais: number }|null} `item` = o aviso de agora (null quando o aviso não tem item); `mais` = quantos do mesmo tipo esperam na fila ("+N").
 */
export function proximoAviso(candidatos = {}) {
  for (const tipo of ORDEM_DOS_AVISOS) {
    const { chave, mais } = FONTES[tipo];
    const itens = itensDe(candidatos[chave]);
    if (!itens.length) continue;
    return { tipo, item: itens[0] === true ? null : itens[0], mais: mais ? itens.length - 1 : 0 };
  }
  return null;
}
