// Futty v2.0 — Preços por região (12-set, "Velocidade 2"). Decide a moeda pelo
// IDIOMA ou pelo FUSO HORÁRIO do aparelho — nunca por IP/geolocalização (sem
// permissão a pedir, sem custo de rede, funciona offline). pt-BR (idioma) OU
// America/* (fuso) → real; qualquer outra combinação → euro. Computado 1x ao
// carregar o módulo — a moeda não muda durante a sessão (SPA sem SSR: navigator
// e Intl sempre existem no browser).
//
// O backend não cobra nada disto ainda (Stripe saiu — SPEC-INFRA; só entra IAP
// da loja quando essa vaga ligar). Isto é só o preço MOSTRADO na tela.
function detectarRegiao() {
  let idioma = '';
  try {
    idioma = navigator.language || '';
  } catch {
    /* ambiente sem navigator (teste/SSR) — cai no fuso */
  }
  if (idioma.startsWith('pt-BR')) return 'BRL';

  let fuso = '';
  try {
    fuso = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    /* Intl indisponível — fica em EUR por omissão */
  }
  return fuso.startsWith('America/') ? 'BRL' : 'EUR';
}

const TABELA = {
  BRL: { simbolo: 'R$', pro: 9.9, elite: 24.9 },
  EUR: { simbolo: '€', pro: 1.99, elite: 4.99 },
};

function criarFormatador(simbolo) {
  return (valor) => `${simbolo}${valor.toFixed(2).replace('.', ',')}/mês`;
}

const moeda = detectarRegiao();
const t = TABELA[moeda];
const formatar = criarFormatador(t.simbolo);

export const precos = {
  moeda,
  pro: formatar(t.pro),
  elite: formatar(t.elite),
  formatar,
};
