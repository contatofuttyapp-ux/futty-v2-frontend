// Futty v2.0 — Preços por região (13-set, "Velocidade 3"). Decide a moeda
// primeiro pelo FUSO HORÁRIO do aparelho, só caindo para o IDIOMA quando o
// fuso não está disponível — nunca por IP/geolocalização (sem permissão a
// pedir, sem custo de rede, funciona offline).
//
// Ordem (13-set — motivo: brasileiro em Lisboa com o celular ainda em pt-BR
// pagava em real; o fuso é o sinal mais forte de ONDE a pessoa está agora):
//  1) fuso está na lista FECHADA de fusos do Brasil → real;
//  2) fuso existe e NÃO é do Brasil → euro (mesmo com idioma pt-BR);
//  3) sem fuso (Intl indisponível) → idioma pt-BR → real, senão euro.
// R$9,90/R$24,90 (real) ou €2,99/€7,99 (euro) — regra 11-ago: preço por poder
// de compra, não por câmbio. Computado 1x ao carregar o módulo — a moeda não
// muda durante a sessão (SPA sem SSR: navigator e Intl sempre existem no
// browser).
//
// O backend não cobra nada disto ainda (Stripe saiu — SPEC-INFRA; só entra IAP
// da loja quando essa vaga ligar). Isto é só o preço MOSTRADO na tela.
const FUSOS_BRASIL = [
  'America/Sao_Paulo', 'America/Bahia', 'America/Fortaleza', 'America/Recife',
  'America/Belem', 'America/Manaus', 'America/Cuiaba', 'America/Campo_Grande',
  'America/Porto_Velho', 'America/Rio_Branco', 'America/Boa_Vista', 'America/Maceio',
  'America/Araguaina', 'America/Santarem', 'America/Noronha', 'America/Eirunepe',
];

function detectarRegiao() {
  let fuso = '';
  try {
    fuso = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    /* Intl indisponível — cai no idioma */
  }
  if (fuso && FUSOS_BRASIL.includes(fuso)) return 'BRL';
  if (fuso) return 'EUR';

  let idioma = '';
  try {
    idioma = navigator.language || '';
  } catch {
    /* ambiente sem navigator (teste/SSR) — cai no euro por omissão */
  }
  return idioma.startsWith('pt-BR') ? 'BRL' : 'EUR';
}

const TABELA = {
  BRL: { simbolo: 'R$', pro: 9.9, elite: 24.9 },
  EUR: { simbolo: '€', pro: 2.99, elite: 7.99 },
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
