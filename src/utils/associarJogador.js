// Futty v2.0 — "Associar jogador": os textos e as contas puras (sem React, sem rede) da ligação entre o convidado sem app de um jogo e a conta de um
// membro do time. A regra mora no motor (backend/utils/associarJogador.js); aqui só o que a tela diz e o que ela precisa ler do jogo.

export const TEXTO_BOTAO_ASSOCIAR = 'Associar jogador';
export const TITULO_ASSOCIAR = 'Associar jogador';
export const SEM_MEMBROS = 'Ninguém do time para escolher.';
export const TEXTO_DESFAZER = 'Desfazer';
// A lista de membros chega em menos de 1 s; passados 15 s sem resposta, a janela avisa e oferece "Tentar de novo" em vez de esperar calada.
export const LIMITE_DA_LISTA_MS = 15000;
export const MSG_LISTA_DEMOROU = 'O servidor está demorando para mandar a lista do time.';
export const MSG_LISTA_FALHOU = 'Não deu para carregar a lista do time.';

/** O que a pessoa lê antes de confirmar: o que muda na conta do membro. */
export function fraseDaConfirmacao(convidadoNome, apelido) {
  return `O ${convidadoNome} deste jogo passa a ser ${apelido}. Gols, presença e títulos deste jogo entram na conta dele.`;
}

/** O aviso depois de associar. */
export function fraseDoFeito(convidadoNome, apelido) {
  return `Pronto: o ${convidadoNome} deste jogo agora é ${apelido}.`;
}

// ─── "Associar em todos": o mesmo nome em outros jogos do time ───────────────────────────────────────────────────────────────────────────
// Nomes iguais pela mesma régua do motor (nomeNorm: sem espaço sobrando, sem diferença de maiúscula).
export const nomeNorm = (n) => String(n ?? '').trim().toLowerCase();

/** Em quantos OUTROS jogos do time o convidado aparece (o motor conta e manda em `convidados[].outros_jogos`). */
export function outrosJogosDoConvidado(dados, nome) {
  const c = (dados?.convidados || []).find((x) => nomeNorm(x.nome) === nomeNorm(nome));
  return Math.max(0, Number(c?.outros_jogos) || 0);
}

/** A pergunta, depois de escolher o membro. */
export function perguntaEmTodos(n) {
  return `Este nome aparece em mais ${n} ${n === 1 ? 'jogo' : 'jogos'} deste time. Associar em todos?`;
}
export const textoBotaoEmTodos = (n) => `Associar nos ${n + 1} jogos`;
export const TEXTO_SO_NESTE = 'Só neste jogo';

/** O aviso depois de associar em todos: quantos jogos ficaram com a conta e quantos ficaram de fora (e por quê). */
export function fraseDoFeitoEmTodos(convidadoNome, apelido, emTodos) {
  const total = 1 + (Number(emTodos?.associados) || 0);
  const pulados = Array.isArray(emTodos?.pulados) ? emTodos.pulados : [];
  let frase = `Pronto: o ${convidadoNome} agora é ${apelido} em ${total} ${total === 1 ? 'jogo' : 'jogos'}.`;
  if (pulados.length === 1) frase += ` 1 jogo ficou de fora: ${pulados[0].motivo}`;
  else if (pulados.length > 1) frase += ` ${pulados.length} jogos ficaram de fora (${apelido} já estava neles ou já tinha gols lá).`;
  return frase;
}

// O Desfazer vale por um dia (a mesma conta do motor): o admin que errou o toque corrige; não é uma máquina do tempo.
export const JANELA_DESFAZER_MS = 24 * 3600 * 1000;

/**
 * As associações deste jogo que ainda dá para desfazer, lidas do registro que o motor guarda no resultado do sorteio
 * (`times_resultado.registro.associacoes`, que todo membro recebe com o jogo): { user_id, nome, convidado_nome, em }.
 * A mais recente primeiro. Sem registro, lista vazia.
 */
export function associacoesDesfaziveis(timesResultado, agora = Date.now()) {
  const lista = Array.isArray(timesResultado?.registro?.associacoes) ? timesResultado.registro.associacoes : [];
  return lista
    .filter((a) => a && !a.desfeita_em && Number.isFinite(new Date(a.em).getTime()) && agora - new Date(a.em).getTime() <= JANELA_DESFAZER_MS)
    .map((a) => ({ user_id: a.user_id, nome: a.nome || 'Jogador', convidado_nome: a.convidado?.nome || 'convidado', em: a.em }))
    .reverse();
}

/** A frase da linha do aviso: "Betão ocupa a vaga do Beto neste jogo." */
export function fraseDaAssociacao(a) {
  return `${a.nome} ocupa a vaga do ${a.convidado_nome} neste jogo.`;
}

/** O que muda ao desfazer, dito antes de o admin confirmar. */
export function fraseDoDesfazer(a) {
  return `Desfazer? O ${a.convidado_nome} volta a ser convidado, com os gols e a presença de antes.`;
}
