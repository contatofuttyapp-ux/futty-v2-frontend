// Futty v2.0 — O estado do editor de times (components/TimesEditor.jsx), puro para testar no Node.
//
// Cada jogador ganha uma CHAVE estável quando o editor abre: quem tem conta, `u:<user_id>`; convidado sem app (user_id
// null), `convidado:<onde estava>:<posição>`. Antes o editor usava o user_id em tudo: todo convidado tinha a mesma
// chave (null) — o React repetia um e sumia com o outro na tela, e arrastar um convidado não movia ninguém (ou movia o
// errado). A chave é só do editor: sai antes de gravar.

/** A chave de um jogador no editor. `onde` = 't<índice do time>' ou 'r' (reserva); `k` = a posição lá dentro. */
export function chaveNoEditor(j, onde, k) {
  return j?.user_id ? `u:${j.user_id}` : `convidado:${onde}:${k}`;
}

/** O resultado com a chave em cada jogador (cópia; o original não muda). */
export function comChaves(resultado) {
  return {
    times: (resultado?.times || []).map((t, ti) => ({
      ...t,
      jogadores: (t.jogadores || []).map((j, k) => ({ ...j, _chave: chaveNoEditor(j, `t${ti}`, k) })),
    })),
    reservas: (resultado?.reservas || []).map((j, k) => ({ ...j, _chave: chaveNoEditor(j, 'r', k) })),
  };
}

/**
 * Move o jogador de chave `chave` para `destino` (índice do time ou 'reservas'), no fim da lista de lá. Devolve um
 * estado novo; com chave desconhecida, devolve o mesmo estado.
 */
export function moverJogador({ times, reservas }, chave, destino) {
  let jogador = null;
  const novosTimes = times.map((t) => {
    const i = t.jogadores.findIndex((j) => j._chave === chave);
    if (i < 0) return t;
    jogador = t.jogadores[i];
    return { ...t, jogadores: t.jogadores.filter((_, k) => k !== i) };
  });
  let novasReservas = reservas;
  const ir = reservas.findIndex((j) => j._chave === chave);
  if (ir >= 0) {
    jogador = reservas[ir];
    novasReservas = reservas.filter((_, k) => k !== ir);
  }
  if (!jogador) return { times, reservas };
  if (destino === 'reservas') return { times: novosTimes, reservas: [...novasReservas, jogador] };
  return {
    times: novosTimes.map((t, i) => (i === destino ? { ...t, jogadores: [...t.jogadores, jogador] } : t)),
    reservas: novasReservas,
  };
}

/** O jogador sem a chave do editor (o que vai para o motor). */
export function semChave(j) {
  const copia = { ...j };
  delete copia._chave;
  return copia;
}
