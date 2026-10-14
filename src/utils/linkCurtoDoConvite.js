// Futty v2.0 — o link curto do convite com o nome do time: futtyapp.com.br/c/<nome-do-time>-<código>.
//
// O nome é enfeite (quem recebe no grupo vê de que time é antes de tocar); quem manda é o código no fim — o último pedaço depois do
// último hífen. O alfabeto do código não tem hífen (backend/utils/conviteCodigo.js, que lê do mesmo jeito). /c/<código> sozinho
// continua valendo: é o link de antes, já enviado em muitos grupos.
//
// Puro e sem imports: a prévia do link (functions/_shared/previaDoLink.js) faz a mesma leitura do código, e o teste de unidade confere
// que as duas concordam.

const TAMANHO_MAX_DO_NOME = 30;

/**
 * "Domingueira FC" → "domingueira-fc": minúsculas, sem acento, só letras e números separados por hífen. Até 30 caracteres, cortando
 * numa palavra inteira (uma palavra só, maior que isso, corta seco). Nome sem letra nem número (só emoji) → ''.
 */
export function slugDoNome(nome) {
  const base = String(nome ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (base.length <= TAMANHO_MAX_DO_NOME) return base;
  const ate = base.slice(0, TAMANHO_MAX_DO_NOME + 1);
  const ultimoHifen = ate.lastIndexOf('-');
  return (ultimoHifen > 0 ? ate.slice(0, ultimoHifen) : base.slice(0, TAMANHO_MAX_DO_NOME)).replace(/-+$/, '');
}

/** O caminho do link curto: /c/<nome>-<código>; /c/<código> quando o nome não rende nada. */
export function caminhoCurtoDoConvite({ nomeTime, codigo }) {
  const nome = slugDoNome(nomeTime);
  return `/c/${nome ? `${nome}-` : ''}${codigo}`;
}

/**
 * O código de um link curto (/c/<nome>-<código> ou /c/<código>): o último pedaço depois do último hífen, se tem a cara de código
 * (6 a 8 letras ou números), em minúsculas. Senão devolve o pedaço como veio — quem decide se existe é o motor.
 */
export function codigoDoLinkCurto(pedaco) {
  const p = String(pedaco ?? '').trim();
  const ultimo = p.slice(p.lastIndexOf('-') + 1);
  return /^[a-z0-9]{6,8}$/i.test(ultimo) ? ultimo.toLowerCase() : p;
}
