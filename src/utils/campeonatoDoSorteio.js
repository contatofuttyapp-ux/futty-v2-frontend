// Futty v2.0 — O campeonato nasce do sorteio de um jogo: os textos da escolha "Criar campeonato" e a linha de cada jogo oferecido.
// Puro (sem React). O "sortear direto" saiu: os times de um campeonato vêm do sorteio do jogo (só quem confirmou, equilibrado pelas
// notas) ou de quem monta os times à mão.
import { contar } from './plural';

export const TITULO_DA_ESCOLHA = 'De onde vêm os times?';

export const PELO_SORTEIO = {
  titulo: 'Pelo sorteio de um jogo',
  descricao: 'Os times saem do sorteio do jogo: só quem confirmou, equilibrados pelas notas.',
};

export const A_MAO = {
  titulo: 'Montar os times à mão',
  descricao: 'Os times já estão prontos: escreva os nomes e coloque os jogadores em cada um.',
};

export const ESCOLHA_O_JOGO = 'Escolha o jogo do sorteio:';

/** Sem nenhum jogo sorteado que ainda não virou campeonato: o caminho até o botão, em uma linha. */
export const SEM_JOGO_SORTEADO = 'Marque um jogo, deixe o pessoal confirmar e sorteie. No resultado do sorteio aparece Criar campeonato.';

/** "4 times de 5" — o tamanho do sorteio, para o admin reconhecer o jogo na lista. */
export function linhaDoSorteio(jogo) {
  const times = contar(jogo?.n_times || 0, 'time', 'times');
  return jogo?.por_time ? `${times} de ${jogo.por_time}` : times;
}
