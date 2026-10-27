// Futty v2.0 — O confete do campeonato terminado no Início sai UMA vez por campeonato por pessoa: o id do campeonato já celebrado fica no aparelho
// (por conta) e voltar ao Início nunca repete a festa. Tudo em try/catch. Sem armazenamento (janela
// privada, bloqueio) a memória da sessão segura a repetição enquanto o app estiver aberto — nunca quebra a tela.
const CHAVE = (userId, campeonatoId) => `futty_campeonato_celebrado:${userId}:${campeonatoId}`;
const celebradosNaSessao = new Set();

/** Este campeonato já soltou confete para esta pessoa neste aparelho? */
export function campeonatoJaCelebrado(userId, campeonatoId) {
  const chave = CHAVE(userId, campeonatoId);
  if (celebradosNaSessao.has(chave)) return true;
  try {
    return localStorage.getItem(chave) === '1';
  } catch {
    return false;
  }
}

/** Guarda que este campeonato acabou de ser celebrado. */
export function guardarCampeonatoCelebrado(userId, campeonatoId) {
  const chave = CHAVE(userId, campeonatoId);
  celebradosNaSessao.add(chave);
  try {
    localStorage.setItem(chave, '1');
  } catch {
    /* sem armazenamento: fica só a memória da sessão */
  }
}

/** Solta confete? Só com o campeonato terminado, a pessoa e o campeonato conhecidos, e se ainda não foi celebrado. */
export function deveCelebrarCampeonato(campeonato, userId) {
  if (campeonato?.estado !== 'terminado' || campeonato?.id == null || !userId) return false;
  return !campeonatoJaCelebrado(userId, campeonato.id);
}
