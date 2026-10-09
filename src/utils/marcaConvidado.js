// Futty v2.0 — a marca do convidado sem app, numa fonte só: o "· " antes do nome (aprovado na máquina da
// cerimônia, c96c532, 26-jul) e a linha de explicação no fim de toda lista que tiver pelo menos um — sem
// ela ninguém sabe o que o ponto quer dizer. Uma linha só por lista; nada aparece sem convidado nenhum, e
// nenhuma outra explicação (nada de "sem conta", "visitante" etc.).
// Puro (sem React, sem canvas): a cerimônia, os cartões, a apresentação e a lista de times da tela do jogo e
// do link público (DrawnTeams) leem daqui.
export const PONTO_CONVIDADO = '· ';
export const TEXTO_SEM_O_APP = '· sem o app';

/** O nome como a lista mostra: com o ponto na frente se for convidado sem app, cru senão. */
export function nomeComPonto(j, semNome = '?') {
  return (j?.convidado ? PONTO_CONVIDADO : '') + (j?.nome || semNome);
}

/** Pelo menos um convidado sem app nesta lista de jogadores (um time, a reserva)? */
export function temConvidado(jogadores) {
  return Array.isArray(jogadores) && jogadores.some((j) => j?.convidado);
}
