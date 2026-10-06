// Futty v2.0 — o bilhete do convite. Quem abre um convite sem conta (ou com conta que ainda não
// terminou o onboarding) passa por cadastro, foto, nome e, às vezes, confirmação por e-mail ou login pelo
// Google/Apple antes de voltar ao time. O caminho do login leva o `from` junto, o do cadastro e o do OAuth
// não: este bilhete no aparelho guarda o convite até a pessoa chegar lá. Dois leitores:
//   · o Onboarding, que começa pelas boas-vindas DO TIME (quem convidou, nome, logo — o bilhete leva uma
//     cópia deles para a tela abrir sem esperar a rede) e guarda ali a escolha linha/gol, que só vale
//     depois de entrar;
//   · o Início, que devolve a pessoa a /convite/:token (uma vez só) — mas só se a conta já terminou o
//     onboarding (senão o Início "roubaria" o bilhete antes do Onboarding e a pessoa nunca veria as
//     boas-vindas do time).
// O `token` pode ser o longo (uuid) ou o código curto de /c/<código>: o motor aceita os dois.
// Módulo pequeno, sem import: fica FORA do arranque (só Convite, Onboarding e Início o importam,
// todos lazy).
const CHAVE = 'futty_convite_pendente';
const VALIDADE_MS = 2 * 86400000; // o link do e-mail de confirmação vale 24 h; dois dias cobrem a pessoa distraída

function ler(agora) {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const b = JSON.parse(bruto);
    if (!b?.token || !Number.isFinite(b.em) || agora - b.em > VALIDADE_MS) return null;
    return b;
  } catch { return null; }
}

function gravar(b) {
  try { localStorage.setItem(CHAVE, JSON.stringify(b)); } catch { /* modo privado: sem bilhete */ }
}

/** Só o que as boas-vindas do time precisam do time (nada de dado pessoal). */
function resumoDoTime(time) {
  if (!time || !time.nome) return null;
  return { nome: String(time.nome), logo_url: time.logo_url || null, cor_fundo: time.cor_fundo || null };
}

/** Guarda o token do convite que a pessoa está a caminho de aceitar (e uma cópia do time, para a 1ª tela abrir na hora). */
export function guardarConvitePendente(token, agora = Date.now(), time = null) {
  if (!token) return;
  const atual = ler(agora);
  // Mesmo convite de novo (a pessoa voltou à página): mantém o que já foi escolhido; outro convite começa limpo.
  const mesmo = atual && atual.token === String(token) ? atual : null;
  gravar({ token: String(token), em: agora, time: resumoDoTime(time) || mesmo?.time || null, ...(mesmo && 'goleiro' in mesmo ? { goleiro: mesmo.goleiro } : {}) });
}

/** Só espreita: há bilhete válido? */
export function temConvitePendente(agora = Date.now()) {
  return !!ler(agora);
}

/** Espreita o bilhete inteiro: { token, time, goleiro } ou null. Não apaga. */
export function lerConvitePendente(agora = Date.now()) {
  const b = ler(agora);
  return b ? { token: b.token, time: b.time || null, goleiro: b.goleiro === true } : null;
}

/** A escolha "No gol" (true) / "Jogo na linha" (false) feita nas boas-vindas, antes de a pessoa ser do time. */
export function guardarPosicaoPendente(goleiro, agora = Date.now()) {
  const b = ler(agora);
  if (b) gravar({ ...b, goleiro: !!goleiro });
}

/** Lê e APAGA o bilhete. Devolve o token, ou null se não há (ou se já passou da validade). */
export function tomarConvitePendente(agora = Date.now()) {
  const b = ler(agora);
  try { localStorage.removeItem(CHAVE); } catch { /* nada */ }
  return b ? b.token : null;
}
