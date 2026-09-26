// Futty v2.0 — FONTE ÚNICA dos produtos da Figurinha Brilhante
// (SPEC-FIGURINHA-3 §2, decisão do dono 22-set; números das Rodadas 21 e 22, 24-set).
//
// Substituiu os planos Free/Pro/Elite e o `LIMITES_IA` por plano: nenhum dos
// dois chegou a cobrar nada, e a figurinha de IA passou a nascer paga em vez
// de nascer de graça em cada cadastro. O que se vende agora são três coisas
// concretas, uma vez cada (sem mensalidade):
//
//   pacote  R$49,90  5 gerações por jogador do time (fazer e refazer), até 25
//                    jogadores, todos no mesmo uniforme escolhido pelo dono —
//                    sem seletor de uniforme para o jogador. Quem entrar
//                    depois também ganha. Pior caso (125 gerações = US$14):
//                    −R$32,60 no Brasil, UE empata; caso real: lucro ~28%.
//   manto   R$49,90  o uniforme do PRÓPRIO time nas figurinhas dos 25 (desenhado
//                    à mão depois da compra). Só faz sentido com o pacote.
//   minha   R$9,90   10 gerações para a própria pessoa, uniforme à escolha
//                    entre os 5 — dá para pintar os 5 uniformes e ainda
//                    refazer 5 vezes.
//
// PAGAMENTOS P2 (26-set) — duas listas, e NUNCA misturadas numa tela:
//   · LOJA LIGADA (lib/loja.js#lojaLigada: o motor diz `loja_pronta`, é o app nativo e o SDK do
//     RevenueCat tem a chave): PRODUTOS_LOJA, com o preço que a LOJA formata (`priceString` — é
//     ela que sabe a moeda da conta da pessoa). O botão diz "Comprar · R$9,90".
//   · SEM LOJA (a web, ou o motor com PAGAMENTOS_ATIVOS desligado): PRODUTOS_APP, sem valor
//     nenhum. O botão cria o pedido de ativação que o Gabinete resolve à mão — é pedido, não venda.
// O interruptor local `PAGAMENTOS_ATIVOS` saiu daqui: a loja liga no motor, sem build novo.

/**
 * Os preços de REFERÊNCIA (regra de 11-ago: poder de compra, não câmbio — o euro não é a conversão
 * do real). É a tabela para configurar os produtos nas lojas; a tela NUNCA mostra estes números.
 */
export const PRECOS_DE_REFERENCIA = {
  BRL: { pacote: 49.9, manto: 49.9, minha: 9.9 },
  EUR: { pacote: 14.99, manto: 14.99, minha: 2.99 },
};

/** Quantos jogadores o pacote cobre (igual a `teams.brilhante_limite`). */
export const PACOTE_JOGADORES = 25;
/** Gerações por jogador no pacote (igual a `teams.brilhante_por_jogador`, migração 059). */
export const PACOTE_GERACOES_POR_JOGADOR = 5;
/** Quantas gerações a "Minha Brilhante" dá (igual a MINHA_GERACOES do motor, utils/compras.js). */
export const MINHA_GERACOES = 10;
/** O presente único de quem cria o time (igual a PRESENTE_CRIADOR_CREDITOS do motor). */
export const PRESENTE_CRIADOR_GERACOES = 3;

// Loja ligada: nome, resumo e features. O preço entra na hora, vindo da loja (produtosDaTela).
const PRODUTOS_LOJA = [
  {
    id: 'pacote',
    nome: 'Figurinhas do time',
    resumo: `${PACOTE_GERACOES_POR_JOGADOR} gerações por jogador, até ${PACOTE_JOGADORES}.`,
    features: [
      `Até ${PACOTE_JOGADORES} jogadores`,
      `${PACOTE_GERACOES_POR_JOGADOR} gerações por jogador (fazer e refazer)`,
      'Todos com o mesmo uniforme, escolhido por você',
      'Quem entrar depois também ganha',
      'Os 6 fundos liberados',
    ],
    soDono: true,
  },
  {
    id: 'manto',
    nome: 'Manto próprio',
    resumo: 'O uniforme do seu time nas figurinhas, no lugar dos 5 do Futty.',
    features: [
      'Cores e escudo do seu time',
      `Vale para os ${PACOTE_JOGADORES} do pacote`,
      'Passa por conferência antes de valer',
    ],
    soDono: true,
    // Só faz sentido depois do pacote — a tela desativa o botão sem ele.
    exigePacote: true,
  },
  {
    id: 'minha',
    nome: 'Minha Figurinha',
    resumo: `${MINHA_GERACOES} gerações: dá para pintar os 5 uniformes e refazer 5 vezes.`,
    features: [
      `${MINHA_GERACOES} gerações`,
      'Uniforme à escolha entre os 5',
      'Dá para pintar os 5 uniformes e ainda refazer',
      'Os 6 fundos liberados',
    ],
    soDono: false,
  },
];

// Sem loja: sem valor, sem vitrine de itens e sem o manto próprio. Os botões criam o pedido de
// ativação — é pedido, não venda. `botaoBloco` é o do bloco "Vire figurinha" da Figurinha.
const PRODUTOS_APP = [
  {
    id: 'pacote',
    nome: 'Figurinhas do time',
    resumo: 'O dono do time ativa para todo mundo.',
    botao: 'Pedir ativação',
    botaoBloco: 'Pedir ativação para o meu time',
    soDono: true,
  },
  {
    id: 'minha',
    nome: 'Minha figurinha',
    resumo: `${MINHA_GERACOES} gerações no uniforme que você escolher.`,
    botao: 'Pedir a minha',
    botaoBloco: `Pedir a minha · ${MINHA_GERACOES} gerações`,
    soDono: false,
  },
];

/** Um valor na moeda que a LOJA informou (ex.: o "por jogador" do pacote). Sem moeda, nada. */
function naMoeda(valor, moeda) {
  if (!Number.isFinite(valor) || !moeda) return null;
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda }).format(valor);
  } catch {
    return null;
  }
}

/**
 * Os cartões da tela. Com a loja ligada: os da loja que ELA devolveu (um produto sem preço na
 * loja não aparece — nada de vender o que não está à venda), cada um com o preço dela e o botão
 * "Comprar · preço". Sem loja: a lista do pedido de ativação.
 * `produtosLoja` = o `produtos` de lib/loja.js#produtosDaLoja: { minha: { priceString, preco, moeda } }.
 */
export function produtosDaTela(lojaLigada, produtosLoja) {
  if (!lojaLigada) return PRODUTOS_APP;
  return PRODUTOS_LOJA.filter((p) => produtosLoja?.[p.id]?.priceString).map((p) => {
    const naLoja = produtosLoja[p.id];
    const porJogador = p.id === 'pacote' ? naMoeda(naLoja.preco / PACOTE_JOGADORES, naLoja.moeda) : null;
    return {
      ...p,
      preco: p.id === 'manto' ? `+${naLoja.priceString}` : naLoja.priceString,
      // Os DOIS números no pacote, como a spec pede: o total assusta, o por jogador explica.
      porJogador: porJogador ? `${porJogador} por jogador` : null,
      botao: `Comprar · ${naLoja.priceString}`,
    };
  });
}

/** O produto do pedido de ativação (sem loja) — o texto dos convites da Figurinha. */
export const produtoDoPedido = (id) => PRODUTOS_APP.find((p) => p.id === id);
