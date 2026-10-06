// Futty v2.0 — UM lugar só para escrever número com casa decimal na tela.
//
// Brasileiro escreve 77,9 e 9,1 — nunca 77.9 nem 9.10. Cada tela formatando por conta própria (toFixed,
// toFixed + replace, uma delas com duas casas) deixava a vírgula só onde alguém lembrou. Toda casa decimal
// que é TEXTO passa por aqui: Intl.NumberFormat com locale pt-BR explícito, nunca o do aparelho (a mesma
// lei da hora em dataHora.js: o número lê-se igual para todo mundo).
//
// Fica de fora só o que não é texto: valor de CSS (calc, translate, gradiente), ponto de SVG, atraso de
// animação, mapa de canvas. Esses continuam com toFixed — a máquina lê ponto, a pessoa lê vírgula. O teste
// scripts/unidade/numero-ptbr.test.mjs trava as duas metades.

const formatadores = new Map();
function formatador(minimo, maximo) {
  const chave = `${minimo}|${maximo}`;
  let f = formatadores.get(chave);
  if (!f) {
    f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: minimo, maximumFractionDigits: maximo });
    formatadores.set(chave, f);
  }
  return f;
}

const numeroOuNulo = (valor) => {
  if (valor == null || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
};

/**
 * `casas` casas decimais FIXAS, em PT-BR: formatarDecimal(77.9) → "77,9"; (9.1) → "9,1"; (10) → "10,0"; (1234.5, 2) → "1.234,50".
 * O que não é número (null, undefined, "", NaN, texto) devolve `ou` — por omissão, texto vazio.
 */
export function formatarDecimal(valor, casas = 1, ou = '') {
  const n = numeroOuNulo(valor);
  return n == null ? ou : formatador(casas, casas).format(n);
}

/**
 * ATÉ `casas` casas decimais, sem zero à direita: formatarAte(4) → "4"; (4.5) → "4,5"; (3.45, 2) → "3,45". Para o que pode fechar
 * redondo — as estrelas do voto (4 ou 4,5), a média de confirmados por jogo, o rating do jogador no sorteio.
 */
export function formatarAte(valor, casas = 1, ou = '') {
  const n = numeroOuNulo(valor);
  return n == null ? ou : formatador(0, casas).format(n);
}

/** A nota do jogador como a tela a mostra: UMA casa, sempre ("9,1", "10,0"). A nota exibida vai de 6 a 10. */
export const formatarNota = (valor, ou = '') => formatarDecimal(valor, 1, ou);

/** Os pontos do ranking (o `score` 0–100 do motor): uma casa, sempre ("77,9"). */
export const formatarPontos = (valor, ou = '') => formatarDecimal(valor, 1, ou);

/** Dinheiro do Gabinete, em dólar: "US$12,34". (Preço de loja usa Intl com a moeda — planos.js; aqui é custo do sistema.) */
export const formatarUSD = (valor) => `US$${formatarDecimal(valor ?? 0, 2)}`;

/** Dinheiro do Gabinete, em euro: "€12,34". */
export const formatarEUR = (valor) => `€${formatarDecimal(valor ?? 0, 2)}`;

/** Tempo em segundos, a partir de milissegundos, com uma casa: formatarSegundos(1234) → "1,2s". Para o Diagnóstico. */
export const formatarSegundos = (ms) => `${formatarDecimal(Number(ms) / 1000, 1)}s`;
