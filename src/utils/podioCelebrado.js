// Futty v2.0 — O confete do pódio do Ranking só sai quando a posição da pessoa no pódio MUDA (ou na primeira vez que ela chega lá): entrar de novo no
// Ranking na mesma posição não repete a festa. A última posição celebrada fica no aparelho, por time. Tudo em try/catch: sem armazenamento (janela
// privada, bloqueio) o confete simplesmente sai como na primeira vez — nunca quebra a tela.
const CHAVE = (slug) => `futty_podio_celebrado:${slug}`;

/** A última posição (1, 2 ou 3) que já foi celebrada neste time neste aparelho, ou null. */
export function lerPosicaoCelebrada(slug) {
  try {
    const bruto = localStorage.getItem(CHAVE(slug));
    const n = Number(bruto);
    return Number.isInteger(n) && n >= 1 && n <= 3 ? n : null;
  } catch {
    return null;
  }
}

/** Guarda a posição que acabou de ser celebrada. */
export function guardarPosicaoCelebrada(slug, posicao) {
  try {
    localStorage.setItem(CHAVE(slug), String(posicao));
  } catch {
    /* sem armazenamento: a próxima entrada celebra de novo */
  }
}

/** A pessoa saiu do pódio: esquece, para que voltar a ele (mesmo à mesma posição) seja uma chegada nova. */
export function esquecerPosicaoCelebrada(slug) {
  try {
    localStorage.removeItem(CHAVE(slug));
  } catch {
    /* sem armazenamento */
  }
}

/** Solta confete? Na 1ª vez (nada guardado) e quando a posição no pódio mudou. */
export function deveCelebrar(guardada, posicaoAtual) {
  if (!(posicaoAtual >= 1 && posicaoAtual <= 3)) return false;
  return guardada !== posicaoAtual;
}
