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
//   manto   R$49,90  o uniforme do PRÓPRIO time nas Brilhantes dos 25 (fase 2,
//                    depois das lojas). Só faz sentido com o pacote.
//   minha   R$9,90   10 gerações para a própria pessoa, uniforme à escolha
//                    entre os 5 — dá para pintar os 5 uniformes e ainda
//                    refazer 5 vezes.
//
// Enquanto a compra na loja não existe, o botão faz uma coisa VERDADEIRA: cria
// um pedido em `pedidos_ativacao` que o Gabinete lista e o dono ativa à mão.
// Nada de "em breve" na tela — regra da casa.
//
// Preço por REGIÃO (utils/precos.js): real no Brasil, euro fora. A regra de
// 11-ago é poder de compra, não câmbio — por isso os valores em euro NÃO são a
// conversão dos de real.
import { precos } from '../utils/precos';
import { ehNativo } from './plataforma';

// INTERRUPTOR ÚNICO DOS PREÇOS (25-set, dono: "sem pagamento por enquanto").
// Em false, nenhuma tela do site nem do app mostra valor: as duas usam a lista
// PRODUTOS_APP. PRODUTOS_SITE (com preços, manto próprio e "por jogador") fica
// guardado aqui, intocado. Vira true no dia do dinheiro. O app da loja
// (ehNativo) nunca mostra preço, mesmo com true, até a compra na loja existir.
const PAGAMENTOS_ATIVOS = false;

// A tabela em números, por moeda. `formatar` vive em utils/precos.js e devolve
// "R$49,90/mês" — estes produtos são pagos UMA VEZ, por isso formata-se aqui,
// sem o "/mês".
const VALORES = {
  BRL: { simbolo: 'R$', pacote: 49.9, manto: 49.9, minha: 9.9 },
  EUR: { simbolo: '€', pacote: 14.99, manto: 14.99, minha: 2.99 },
};

const tabela = VALORES[precos.moeda] || VALORES.BRL;
const preco = (v) => `${tabela.simbolo}${v.toFixed(2).replace('.', ',')}`;

/** Quantos jogadores o pacote cobre (igual a `teams.brilhante_limite`). */
export const PACOTE_JOGADORES = 25;
/** Gerações por jogador no pacote (igual a `teams.brilhante_por_jogador`, migração 059). */
export const PACOTE_GERACOES_POR_JOGADOR = 5;
/** Quantas gerações a "Minha Brilhante" dá (igual ao que o Gabinete credita). */
export const MINHA_GERACOES = 10;
/** O presente único de quem cria o time (igual a PRESENTE_CRIADOR_CREDITOS do motor). */
export const PRESENTE_CRIADOR_GERACOES = 3;

// `botao` é o da tela Figurinhas; `botaoBloco` é o do bloco "Vire figurinha" da
// Figurinha.
const PRODUTOS_SITE = [
  {
    id: 'pacote',
    nome: 'Figurinhas do time',
    preco: preco(tabela.pacote),
    // Os DOIS números na tela, como a spec pede: o total e o que dá por cabeça.
    porJogador: `${preco(tabela.pacote / PACOTE_JOGADORES)} por jogador`,
    resumo: `${PACOTE_GERACOES_POR_JOGADOR} gerações por jogador, até ${PACOTE_JOGADORES}.`,
    features: [
      `Até ${PACOTE_JOGADORES} jogadores`,
      `${PACOTE_GERACOES_POR_JOGADOR} gerações por jogador (fazer e refazer)`,
      'Todos com o mesmo uniforme, escolhido por você',
      'Quem entrar depois também ganha',
      'Os 6 fundos liberados',
    ],
    botao: 'Ativar para o meu time',
    botaoBloco: `Ativar para o meu time · ${preco(tabela.pacote)} · ${preco(tabela.pacote / PACOTE_JOGADORES)} por jogador`,
    soDono: true,
  },
  {
    id: 'manto',
    nome: 'Manto próprio',
    preco: `+${preco(tabela.manto)}`,
    resumo: 'O uniforme do seu time nas figurinhas, no lugar dos 5 do Futty.',
    features: [
      'Cores e escudo do seu time',
      `Vale para os ${PACOTE_JOGADORES} do pacote`,
      'Passa por conferência antes de valer',
    ],
    botao: 'Quero o manto do meu time',
    soDono: true,
    // Só faz sentido depois do pacote — a tela desativa o botão sem ele.
    exigePacote: true,
  },
  {
    id: 'minha',
    nome: 'Minha Figurinha',
    preco: preco(tabela.minha),
    resumo: `${MINHA_GERACOES} gerações: dá para pintar os 5 uniformes e refazer 5 vezes.`,
    features: [
      `${MINHA_GERACOES} gerações`,
      'Uniforme à escolha entre os 5',
      'Dá para pintar os 5 uniformes e ainda refazer',
      'Os 6 fundos liberados',
    ],
    botao: 'Quero a minha',
    botaoBloco: `Só a minha · ${preco(tabela.minha)} · ${MINHA_GERACOES} gerações`,
    soDono: false,
  },
];

// Sem valor, sem vitrine de itens e sem o manto próprio: a lista do app da loja
// (iOS/Android) e, com PAGAMENTOS_ATIVOS = false, também a do site. Os botões
// criam o pedido de ativação — é pedido, não venda.
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

export const PRODUTOS = PAGAMENTOS_ATIVOS && !ehNativo() ? PRODUTOS_SITE : PRODUTOS_APP;

export const produtoPorId = (id) => PRODUTOS.find((p) => p.id === id);
