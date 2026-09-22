// Futty v2.0 — Região por FUSO HORÁRIO do aparelho (13-set, "Velocidade 3"), só
// caindo para o IDIOMA quando o fuso não está disponível — nunca por IP/geo-
// localização (sem permissão a pedir, sem custo de rede, funciona offline).
//
// Ordem (13-set — motivo: brasileiro em Lisboa com o celular ainda em pt-BR
// pagava em real; o fuso é o sinal mais forte de ONDE a pessoa está agora):
//  1) fuso está na lista FECHADA de fusos do Brasil → real;
//  2) fuso existe e NÃO é do Brasil → euro (mesmo com idioma pt-BR);
//  3) sem fuso (Intl indisponível) → idioma pt-BR → real, senão euro.
// Computado 1x ao carregar o módulo — a moeda não muda durante a sessão (SPA
// sem SSR: navigator e Intl sempre existem no browser).
//
// Os preços em si (Brilhantes do time / manto / Minha Brilhante, por moeda)
// vivem em lib/planos.js — aqui só se decide QUAL moeda usar.
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

export const precos = {
  moeda: detectarRegiao(),
};
