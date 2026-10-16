// Futty v2.0 — O "Restam N gerações" da Figurinha: N é TUDO o que a pessoa ainda pode gerar — as gerações dos pacotes dos times em que ela
// está mais os créditos dela (Minha Figurinha). Um número só, sem separar o que é do time e o que foi pago: quem compra tem de ver o número
// subir na hora, mesmo quando o direito que vai ser gasto primeiro é o do time. Qual direito gasta continua decidido por baixo (o uniforme do
// time sai do pacote; qualquer outro, do crédito).
//
// O motor manda a soma pronta (`direito.total`). Um motor de antes dela manda só o saldo do direito gasto primeiro e os créditos: a conta de
// reserva soma os dois (só fica de fora o pacote de um SEGUNDO time, que o motor antigo não conta).

/**
 * @param {{ direito?: { fonte?: string|null, restantes?: number, total?: number }, creditos?: number } | null} brilhante
 * @returns {number}
 */
export function totalDeGeracoes(brilhante) {
  const d = brilhante?.direito;
  const total = Number(d?.total);
  if (Number.isFinite(total) && total >= 0) return total;
  const restantes = Math.max(0, Number(d?.restantes) || 0);
  const creditos = Math.max(0, Number(brilhante?.creditos) || 0);
  if (d?.fonte === 'time') return restantes + creditos;
  if (d?.fonte === 'credito') return Math.max(restantes, creditos);
  return creditos;
}

/** "1 geração" · "58 gerações". */
export function geracoesPorExtenso(n) {
  return n === 1 ? '1 geração' : `${n} gerações`;
}
