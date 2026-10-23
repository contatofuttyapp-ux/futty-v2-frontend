// Futty v2.0 — Quem abre o jogo, o ranking ou o elenco de um time do qual não faz parte. O motor recusa com 403 e o código FORA_DO_TIME;
// a tela diz a verdade ("Você não faz parte deste time") em vez do aviso de internet, que mandava a pessoa conferir o Wi-Fi à toa.

export const FRASE_FORA_DO_TIME = 'Você não faz parte deste time.';
export const APOIO_FORA_DO_TIME = 'Para ver jogos, ranking e Resenha, peça o convite a quem organiza.';

// O motor antigo (antes do código) mandava só o 403 com "Não é membro deste time." ou "Você não é membro deste time.": também valem.
const FRASES_ANTIGAS = /membro deste time|parte deste time/i;

/** O erro de uma leitura ({ status, code, mensagem }) é o de quem não é do time? */
export function ehForaDoTime({ status, code, mensagem } = {}) {
  if (code === 'FORA_DO_TIME') return true;
  return status === 403 && FRASES_ANTIGAS.test(String(mensagem || ''));
}
