// Futty v2.0 — Os convidados sem app de um jogo na tela do admin ("Alguém sem o app vai jogar?"): a lista vem do motor (guardada no
// jogo, com as marcas de goleiro e cabeça de chave), e é ela que entra no sorteio e na conta "N confirmados → X times".
//
// Quem já ocupa a vaga de um convidado (o "Associar jogador" ligou o convidado à conta dele) conta UMA vez: como confirmado. O motor tira
// o convidado associado da lista; aqui a conta dele entra nos confirmados mesmo pelo atalho da presença formal.

// O teto de nome que a tela aceita (o motor guarda até 40).
export const MAX_NOME_CONVIDADO = 24;

export const nomeNorm = (n) => String(n ?? '').trim().toLowerCase();

/** Um convidado novo, do jeito que o motor guarda. */
export const novoConvidado = (nome) => ({ nome: String(nome ?? '').trim().slice(0, MAX_NOME_CONVIDADO), goleiro: false, cabeca_chave: false });

/** A frase quando o nome já está na lista (a mesma do motor), ou null. `exceto` = o índice do convidado que está sendo editado. */
export function nomeJaNaLista(lista, nome, exceto = -1) {
  const alvo = nomeNorm(nome);
  if (!alvo) return null;
  const achado = (lista || []).find((c, i) => i !== exceto && nomeNorm(c?.nome) === alvo);
  return achado ? `"${String(nome).trim()}" já está na lista. Use um sobrenome ou apelido para diferenciar.` : null;
}

/** As associações do sorteio que ainda valem (não desfeitas): quem tem conta e ocupa a vaga de um convidado. */
export function associacoesAtivas(tr) {
  const lista = Array.isArray(tr?.registro?.associacoes) ? tr.registro.associacoes : [];
  return lista.filter((a) => a && a.user_id && !a.desfeita_em);
}

/**
 * Os confirmados que entram no sorteio. Pelo atalho "Fazer sorteio" da presença formal, só quem respondeu "Vou" (`idsDaPresenca`) —
 * MAIS quem o Associar ligou a uma vaga deste jogo: a conta dele foi confirmada depois da lista e sumia da conta e do "Sortear de novo".
 */
export function confirmadosDoSorteio(players, idsDaPresenca, tr) {
  const confirmados = (players || []).filter((p) => p.confirmado);
  if (!idsDaPresenca) return confirmados;
  const associados = new Set(associacoesAtivas(tr).map((a) => a.user_id));
  return confirmados.filter((p) => idsDaPresenca.includes(p.user_id) || associados.has(p.user_id));
}
