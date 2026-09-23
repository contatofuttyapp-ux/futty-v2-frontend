// Futty v2.0 — FONTE ÚNICA dos produtos da Figurinha Brilhante
// (SPEC-FIGURINHA-3 §2, decisão do dono 22-set).
//
// Substituiu os planos Free/Pro/Elite e o `LIMITES_IA` por plano: nenhum dos
// dois chegou a cobrar nada, e a figurinha de IA passou a nascer paga em vez
// de nascer de graça em cada cadastro. O que se vende agora são três coisas
// concretas, uma vez cada (sem mensalidade):
//
//   pacote  R$49,90  uma Brilhante para cada jogador do time, até 25, todos no
//                    mesmo uniforme escolhido pelo dono. Quem entrar depois
//                    também ganha. Custo nosso: ~R$15.
//   manto   R$49,90  o uniforme do PRÓPRIO time nas Brilhantes dos 25 (fase 2,
//                    depois das lojas). Só faz sentido com o pacote.
//   minha   R$9,90   2 gerações para a própria pessoa, uniforme à escolha
//                    entre os 5 — dá para refazer ou trocar uma vez.
//
// Enquanto a compra na loja não existe, o botão faz uma coisa VERDADEIRA: cria
// um pedido em `pedidos_ativacao` que o Gabinete lista e o dono ativa à mão.
// Nada de "em breve" na tela — regra da casa.
//
// Preço por REGIÃO (utils/precos.js): real no Brasil, euro fora. A regra de
// 11-ago é poder de compra, não câmbio — por isso os valores em euro NÃO são a
// conversão dos de real.
import { precos } from '../utils/precos';

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
/** Quantas gerações a "Minha Brilhante" dá (igual ao que o Gabinete credita). */
export const MINHA_GERACOES = 2;

export const PRODUTOS = [
  {
    id: 'pacote',
    nome: 'Figurinhas do time',
    preco: preco(tabela.pacote),
    // Os DOIS números na tela, como a spec pede: o total e o que dá por cabeça.
    porJogador: `${preco(tabela.pacote / PACOTE_JOGADORES)} por jogador`,
    resumo: `Uma figurinha para cada jogador, até ${PACOTE_JOGADORES}.`,
    features: [
      `Até ${PACOTE_JOGADORES} jogadores`,
      'Todos com o mesmo uniforme, escolhido por você',
      'Quem entrar depois também ganha',
      'Os 6 fundos liberados',
    ],
    botao: 'Ativar para o meu time',
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
    resumo: `${MINHA_GERACOES} gerações para você, no uniforme que escolher.`,
    features: [
      `${MINHA_GERACOES} gerações`,
      'Uniforme à escolha entre os 5',
      'Dá para refazer ou trocar uma vez',
      'Os 6 fundos liberados',
    ],
    botao: 'Quero a minha',
    soDono: false,
  },
];
