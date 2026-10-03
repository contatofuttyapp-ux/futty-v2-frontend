// Futty v2.0 — Rodada 29M (achado 143): UM nome por time em todo o sorteio. A cerimônia chama os times pelas cores ("Time Ouro", "Time Roxo"…),
// mas o motor grava "Time A" e "Time B"; a tela mostrava os dois nomes ao mesmo tempo (a lista dizia "TIME OURO", os botões de baixo
// "9:16 · TIME A") e quem acabou de ver "Time Ouro" tinha de adivinhar qual cartão era o dele. Esta é a regra, para a cerimônia, os botões, o
// cartão 9:16 e a página pública:
//   · nome genérico do motor ("Time A", "Time 1") ou já de cor ("Time Ouro") → o nome da COR daquela posição;
//   · nome que a equipe escolheu de verdade (um campeonato com "Os Boleiros") → esse nome, nos dois lugares.
// Passando de 4 times as cores repetem; o nome ganha o número da volta ("Time Ouro 2"), para dois times nunca terem o mesmo nome.
export const NOMES_DAS_CORES = ['Time Ouro', 'Time Roxo', 'Time Prata', 'Time Bronze'];

const GENERICO = /^time\s+(?:[a-z]|\d{1,2})$/i;

export function nomeDoTimeNaTela(nomeDoDado, indice = 0) {
  const nome = String(nomeDoDado ?? '').trim();
  const eDeCor = NOMES_DAS_CORES.some((n) => n.toLowerCase() === nome.toLowerCase());
  if (nome && !GENERICO.test(nome) && !eDeCor) return nome;
  const base = NOMES_DAS_CORES[indice % NOMES_DAS_CORES.length];
  const volta = Math.floor(indice / NOMES_DAS_CORES.length);
  return volta ? `${base} ${volta + 1}` : base;
}
