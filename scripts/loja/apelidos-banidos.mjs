// Apelidos pejorativos (aparência/origem/cor/etnia) que NUNCA podem aparecer em texto da conta
// demo das lojas — nem na tela, nem numa peça impressa (regra do dono, Rodada 30D).
// Fonte única: usado pelo teste que varre o código (scripts/unidade/apelidos-sem-preconceito.test.mjs)
// e pela conferência em tempo real do Sorteio (capturar-telas.mjs), para as duas falarem a mesma língua.
export const APELIDOS_BANIDOS = [
  'gordo', 'gordinho', 'careca', 'cabeção', 'gaúcho', 'tiãozinho', 'índio', 'nego', 'neguinho',
  'pretinho', 'japa', 'alemão', 'baixinho', 'magrelo', 'perna de pau',
];

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
export const normalizar = (s) => semAcento(String(s)).toLowerCase();

/** Devolve o apelido banido encontrado em `texto` (sem diferenciar maiúscula/acento), ou null. */
export function apelidoBanidoEm(texto) {
  const alvo = normalizar(texto);
  return APELIDOS_BANIDOS.find((p) => alvo.includes(normalizar(p))) || null;
}
