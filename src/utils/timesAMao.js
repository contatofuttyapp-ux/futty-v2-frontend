// Futty v2.0 — os times montados à mão, puros (sem React, sem rede). O Jogo (Montar à mão) e o Jogo passado
// montam o corpo do POST /api/games/:id/times-manuais pela MESMA função; o motor grava sem seed (sem
// cerimônia) e não avisa ninguém.
import { NOMES_DAS_CORES } from './nomeDoTime';

/** Os nomes da casa para 2, 3 ou 4 times: Time Ouro, Time Roxo, Time Prata, Time Bronze. */
export function nomesDosTimes(quantos) {
  return NOMES_DAS_CORES.slice(0, quantos);
}

/** "Salvar times" só acende quando cada time tem pelo menos 1 jogador (o motor também exige). */
export function podeSalvarTimes(nomes, atrib) {
  return nomes.length > 0 && nomes.every((_, i) => (atrib[i] || []).length >= 1);
}

/**
 * O corpo do POST /api/games/:id/times-manuais.
 *   nomes   o nome de cada time
 *   atrib   por time, as chaves dos jogadores que a pessoa pôs nele
 *   pool    quem pode jogar: { key, user_id, nome, avatar_url, convidado } — membros com conta e convidados sem app (user_id null)
 */
export function corpoDosTimes(nomes, atrib, pool) {
  const porChave = Object.fromEntries(pool.map((p) => [p.key, p]));
  return {
    times: nomes.map((nome, i) => ({
      nome,
      jogadores: (atrib[i] || [])
        .map((chave) => porChave[chave])
        .filter(Boolean)
        .map((p) => ({ user_id: p.user_id, nome: p.nome, avatar_url: p.avatar_url || null, convidado: p.convidado })),
    })),
  };
}
