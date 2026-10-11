// Futty v2.0 — A linha que fecha a conta do sorteio, abaixo de "Jogadores por time": "20 confirmados → 4 times de 5".
// Puro (sem React). É a regra de verdade do sorteio (backend/routes/games.js + utils/sorteio.js), escrita em frase:
//   · os times são `confirmados ÷ jogadores por time`, arredondado para baixo (os convidados sem app contam como confirmados);
//   · o que sobra vai para o BANCO de reservas (a cerimônia mostra "Reserva · ordem do banco"), não para um time maior;
//   · o sorteio faz de 2 a 4 times, de 3 a 28 jogadores no total.
import { contar } from './plural';

export const MAX_TIMES_DO_SORTEIO = 4;
export const MAX_JOGADORES_DO_SORTEIO = 28;

/**
 * @param {number} total       confirmados + convidados sem app
 * @param {number} porTime     jogadores por time
 * @returns {{ texto: string, ok: boolean }}  `ok` = o sorteio sai assim; senão a frase diz o que ajustar
 */
export function resumoDoSorteio(total, porTime) {
  const quantos = contar(total, 'confirmado', 'confirmados');
  const times = Math.floor(total / porTime);
  if (total > MAX_JOGADORES_DO_SORTEIO) {
    return { ok: false, texto: `${quantos}: o sorteio faz no máximo ${MAX_JOGADORES_DO_SORTEIO} jogadores.` };
  }
  if (times < 2) {
    const faltam = porTime * 2 - total;
    return { ok: false, texto: `${quantos}: faltam ${contar(faltam, 'jogador', 'jogadores')} para formar 2 times de ${porTime}.` };
  }
  if (times > MAX_TIMES_DO_SORTEIO) {
    return { ok: false, texto: `${quantos} com ${porTime} por time dariam ${times} times, e o máximo é ${MAX_TIMES_DO_SORTEIO}: aumente os jogadores por time.` };
  }
  const sobra = total - times * porTime;
  const reserva = sobra ? `, ${sobra} ${sobra === 1 ? 'fica' : 'ficam'} de reserva` : '';
  return { ok: true, texto: `${quantos} → ${times} times de ${porTime}${reserva}` };
}
