// Futty v2.0 — o cadastro por e-mail que ainda espera o código. Para ler o código a pessoa sai do app (vai ao Gmail, ao Mail); no celular
// o sistema às vezes fecha o app nesse meio-tempo, e ela voltaria a um cadastro em branco, sem saber que a conta já existe. Este bilhete
// no aparelho guarda o e-mail e a hora do último envio: o Cadastro e o Entrar reabrem direto na tela do código.
// Nada de senha aqui: depois do código a sessão abre sozinha.
const CHAVE = 'futty_cadastro_pendente';
// Passado um dia a pessoa já desistiu ou já entrou de outro jeito: o bilhete some e o Cadastro volta ao normal.
const VALIDADE_MS = 86400000;

/** { email, em } ou null. `em` = hora do último e-mail mandado (separa "código errado" de "código vencido"). */
export function lerCadastroPendente(agora = Date.now()) {
  try {
    const b = JSON.parse(localStorage.getItem(CHAVE) || 'null');
    if (!b?.email || !Number.isFinite(b.em) || agora - b.em > VALIDADE_MS) return null;
    return { email: String(b.email), em: b.em };
  } catch { return null; }
}

/** Grava (ou renova, a cada reenvio) e devolve o bilhete. */
export function guardarCadastroPendente(email, em = Date.now()) {
  const b = { email: String(email).trim(), em };
  try { localStorage.setItem(CHAVE, JSON.stringify(b)); } catch { /* modo privado: a tela do código vale até fechar o app */ }
  return b;
}

export function limparCadastroPendente() {
  try { localStorage.removeItem(CHAVE); } catch { /* nada */ }
}
