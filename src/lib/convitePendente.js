// Futty v2.0 — Rodada 29B (A): "Criar conta e entrar". Quem abre o convite sem conta passa por cadastro, foto e (às vezes)
// confirmação por e-mail antes de voltar ao app — o caminho do login leva o `from` junto, o do cadastro não. Este bilhete
// no aparelho guarda o convite até a pessoa chegar ao Início, que a devolve a /convite/:token (uma vez só).
// Módulo pequeno, sem import: fica FORA do arranque (só Convite e Início o importam, ambos lazy).
const CHAVE = 'futty_convite_pendente';
const VALIDADE_MS = 2 * 86400000; // o link do e-mail de confirmação vale 24 h; dois dias cobrem a pessoa distraída

/** Guarda o token do convite que a pessoa está a caminho de aceitar. */
export function guardarConvitePendente(token, agora = Date.now()) {
  if (!token) return;
  try { localStorage.setItem(CHAVE, JSON.stringify({ token: String(token), em: agora })); } catch { /* modo privado: sem bilhete */ }
}

/** Lê e APAGA o bilhete. Devolve o token, ou null se não há (ou se já passou da validade). */
export function tomarConvitePendente(agora = Date.now()) {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    localStorage.removeItem(CHAVE);
    const { token, em } = JSON.parse(bruto);
    if (!token || !Number.isFinite(em) || agora - em > VALIDADE_MS) return null;
    return token;
  } catch { return null; }
}
