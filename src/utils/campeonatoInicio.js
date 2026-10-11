// Futty v2.0 — O card do campeonato NOVO (N times) no Início de todo o time: o que ele diz em cada momento.
// Puro (sem React). Os dados vêm de `campeonato_novo` em /api/inicio (backend/utils/campeonatoStore.js → resumoParaInicio):
//   · em andamento ........ "Fase de grupos · 3 de 6 jogos" (ou a fase de agora) + os 2 primeiros da tabela (depois do 1º jogo);
//   · final definida ...... "Final: Time Roxo × Time Ouro";
//   · terminado ........... "Campeão: Time Ouro", por 7 dias; para quem é do time campeão, "Você é campeão!".
import { contar } from './plural';

export const VOCE_E_CAMPEAO = 'Você é campeão!';

const pts = (n) => `${n} ${n === 1 ? 'pt' : 'pts'}`;

/**
 * O título do post do campeão na Resenha, em duas partes: "<Time> é campeão" e o nome do campeonato. Sem preposição de propósito:
 * "campeão do Copa…" erra o gênero quando o nome do campeonato é feminino ("Copa", "Taça", "Liga").
 */
export const tituloDoPostDoCampeao = (nomeDoTime, nomeDoCampeonato) => ({ time: `${nomeDoTime} é campeão`, campeonato: nomeDoCampeonato });

/**
 * @param {object} c  o `campeonato_novo` do /api/inicio
 * @returns {{ tipo: 'voce-campeao'|'campeao'|'final'|'andamento', destaque: string|null, linha: string, primeiros: Array<{ pos: number, nome: string, cor: string, pontos: string }>, proximo: { a: { nome: string, cor: string }, b: { nome: string, cor: string } } | null }}
 *   `proximo`: o próximo jogo (o primeiro ainda sem placar). Com a final definida a linha "Final: A × B" já é o próximo jogo, e com o
 *   campeão não há mais jogo: nesses dois casos vem null, para o card não repetir a mesma informação.
 */
export function textosDoCardDoCampeonato(c) {
  if (c.estado === 'terminado' && c.campeao) {
    return { tipo: c.voce_e_campeao ? 'voce-campeao' : 'campeao', destaque: c.voce_e_campeao ? VOCE_E_CAMPEAO : null, linha: `Campeão: ${c.campeao.nome}`, primeiros: [], proximo: null };
  }
  if (c.final) {
    return { tipo: 'final', destaque: null, linha: `Final: ${c.final.a.nome} × ${c.final.b.nome}`, primeiros: [], proximo: null };
  }
  const jogos = `${c.jogos_lancados} de ${contar(c.jogos_total, 'jogo', 'jogos')}`;
  return {
    tipo: 'andamento',
    destaque: null,
    linha: `${c.fase} · ${jogos}`,
    primeiros: (c.primeiros || []).map((p) => ({ pos: p.pos, nome: p.nome, cor: p.cor, pontos: pts(p.PTS) })),
    proximo: c.proximo || null,
  };
}
