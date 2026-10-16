// Futty v2.0 — A régua de idade do cadastro: o Futty é para quem tem 13 anos ou mais. A MESMA do motor
// (backend/utils/idade.js): o app avisa antes, o motor confere de novo e é quem decide. O número mora SÓ aqui (e no motor):
// telas e textos usam IDADE_MINIMA / MSG_MENOR. A maioridade (18) é outra régua, a do rosto público e do anúncio 18+, e quem
// decide é o motor (pela data).
export const IDADE_MINIMA = 13;
export const MSG_MENOR = 'O Futty é para quem tem 13 anos ou mais.';

/** Os códigos com que o motor recusa o cadastro abaixo da idade mínima (o antigo, da régua de 18, ainda chega de motor velho). */
export function ehRecusaPorIdade(codigo) {
  return codigo === 'MENOR_DE_IDADE' || codigo === 'MENOR_DE_18';
}

/** "AAAA-MM-DD" válida, no passado e depois de 1900 → a própria string; qualquer outra coisa → null. */
export function dataDeNascimentoValida(valor) {
  const v = valor == null ? '' : String(valor).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return null;
  if (d > new Date() || d.getUTCFullYear() < 1900) return null;
  return v;
}

/** Anos completos em `hoje` de quem nasceu em `nascimento` ("AAAA-MM-DD"). */
export function idadeEm(nascimento, hoje = new Date()) {
  const [a, m, d] = String(nascimento).slice(0, 10).split('-').map(Number);
  let anos = hoje.getUTCFullYear() - a;
  const mes = hoje.getUTCMonth() + 1;
  if (mes < m || (mes === m && hoje.getUTCDate() < d)) anos -= 1;
  return anos;
}

/** true se quem nasceu nessa data ainda não tem IDADE_MINIMA anos. Data inválida não decide nada (false). */
export function menorQueIdadeMinima(nascimento, hoje = new Date()) {
  const v = dataDeNascimentoValida(nascimento);
  return v != null && idadeEm(v, hoje) < IDADE_MINIMA;
}

/**
 * Último dia de nascimento que ainda entra: hoje − IDADE_MINIMA anos ("AAAA-MM-DD", UTC como o motor).
 * É o `max` dos seletores de data — o ano mais alto que eles oferecem é ano atual − IDADE_MINIMA.
 * Quem faz aniversário em 29/02 e o ano de destino não é bissexto: o limite é 28/02 (nascer em 01/03
 * faz anos só em 01/03).
 */
export function nascimentoMaximo(hoje = new Date()) {
  const ano = hoje.getUTCFullYear() - IDADE_MINIMA;
  const mes = hoje.getUTCMonth();
  let limite = new Date(Date.UTC(ano, mes, hoje.getUTCDate()));
  if (limite.getUTCMonth() !== mes) limite = new Date(Date.UTC(ano, mes + 1, 0));
  return limite.toISOString().slice(0, 10);
}
