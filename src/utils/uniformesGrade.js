// Futty v2.0 — a grade de uniformes é a MESMA para todo mundo; o que muda é o estado de cada tile,
// e ele sai do DIREITO da pessoa. Puro (sem React, sem rede), para testar no Node.
//
//   direito  gratis — sem geração (card com a foto): todos com cadeado
//            pacote — o pacote do time: só o uniforme do time abre (pintável); os outros, cadeado
//            minha  — Minha Figurinha (créditos): todos abertos; os ainda não pintados dizem que custam 1 geração
//   estado   vestido  — o card mostra este uniforme agora (✓)
//            pintado  — já foi gerado: um toque veste, grátis (uniformes guardados)
//            geravel  — o direito pinta este; o toque confirma e gasta 1 geração
//            trancado — cadeado: o toque leva aos Planos

/** Para onde o cadeado leva — sempre a Minha Figurinha ("escolha o uniforme"), nos dois casos que têm cadeado. */
export const DESTINO_DO_CADEADO = '/planos?destaque=minha';

/** O selo dos uniformes que ainda custam uma geração pintar. */
export const SELO_PINTAR = 'pintar · 1 geração · ~45 s';

/**
 * Qual dos três direitos vale. Crédito manda: quem tem Minha Figurinha abre todos, mesmo sendo também de um pacote.
 * `fonteDireito` é o que o motor escolheu ('credito' | 'time' | null); `creditos` é o saldo.
 */
export function direitoDaGrade({ fonteDireito = null, creditos = 0 } = {}) {
  if (fonteDireito === 'credito' || (Number(creditos) || 0) > 0) return 'minha';
  if (fonteDireito === 'time') return 'pacote';
  return 'gratis';
}

/**
 * O estado de UM uniforme.
 * `kitVestido` é o kit do card SÓ quando o card é a figurinha (no card com a foto nenhum uniforme está vestido);
 * `slots` são os kits já pintados por esta pessoa; `kitDoTime` é o uniforme do pacote (null fora do pacote).
 */
export function estadoDoUniforme({ direito, kitId, kitVestido = null, kitDoTime = null, slots = [] }) {
  if (kitVestido && kitId === kitVestido) return 'vestido';
  if (slots.includes(kitId)) return 'pintado';
  if (direito === 'minha') return 'geravel';
  if (direito === 'pacote' && kitId === kitDoTime) return 'geravel';
  return 'trancado';
}

/** O que um toque faz: 'nada' (já vestido), 'vestir' (pintado), 'pintar' (pede confirmação) ou 'planos' (cadeado). */
export function acaoDoToque(estado) {
  if (estado === 'vestido') return 'nada';
  if (estado === 'pintado') return 'vestir';
  if (estado === 'geravel') return 'pintar';
  return 'planos';
}

/**
 * "Refazer" (ação pequena embaixo do uniforme atual): só com a figurinha no card, com geração sobrando e se o direito
 * pinta ESTE uniforme — no pacote, só o do time; com Minha Figurinha, qualquer um.
 */
export function podeRefazer({ direito, kitVestido = null, kitDoTime = null, restantes = 0, avatarEhIA = false }) {
  if (!avatarEhIA || !kitVestido || !(restantes > 0)) return false;
  if (direito === 'minha') return true;
  return direito === 'pacote' && kitVestido === kitDoTime;
}

/** A ordem da grade: no pacote o uniforme do time vem primeiro (o único aberto); nos demais casos, a do catálogo. */
export function ordemDaGrade(kits, { direito, kitDoTime = null }) {
  if (direito !== 'pacote' || !kitDoTime) return kits;
  return [...kits].sort((a, b) => (b.id === kitDoTime) - (a.id === kitDoTime));
}
