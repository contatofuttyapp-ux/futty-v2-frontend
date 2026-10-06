// Futty v2.0 — as linhas do card "Seu time" do Início (components/CardSeuTime.jsx), puras para testar no
// Node. As pendências vêm prontas do motor (GET /api/inicio → seu_time); aqui vira texto e destino de cada
// linha, na ordem da tela.
import { dataComDiaPorExtenso, formatarData } from './dataHora';
import { plural } from './plural';

/** [{ chave, texto, para }] — pedido de entrada, jogo sem presença aberta, resultado por lançar, denúncia. Vazio = "Tudo tranquilo". */
export function linhasDePendencia({ slug, fuso, pendencias: p = {} } = {}) {
  const base = `/time/${slug}`;
  const linhas = [];
  if (p.pedidos > 0) linhas.push({ chave: 'pedidos', para: `${base}?aba=elenco`, texto: `${p.pedidos} ${plural(p.pedidos, 'pedido', 'pedidos')} de entrada` });
  // "Sexta, 9 de out.: presença ainda não aberta" ("Jogo de sex., 9 de out. sem presença aberta" lia mal).
  // O toque leva ao jogo certo e já abre o "Abrir presença" dele (?abrir-presenca=<game_id>, que a página
  // do time lê e apaga do endereço); levar só à aba Jogos não dizia onde agir. Sem game_id (resposta antiga do
  // motor): a aba.
  if (p.presenca) linhas.push({ chave: 'presenca', para: `${base}?aba=jogos${p.presenca.game_id ? `&abrir-presenca=${encodeURIComponent(p.presenca.game_id)}` : ''}`, texto: `${dataComDiaPorExtenso(p.presenca.data, fuso)}: presença ainda não aberta` });
  if (p.resultado) linhas.push({ chave: 'resultado', para: `${base}?aba=jogos`, texto: `Resultado de ${formatarData(p.resultado.data, fuso)} por lançar` });
  if (p.denuncias > 0) linhas.push({ chave: 'denuncias', para: `${base}?aba=ajustes#denuncias`, texto: `${p.denuncias} ${plural(p.denuncias, 'denúncia', 'denúncias')} para ver` });
  return linhas;
}

/** O time tem pelo menos uma pendência (pedido de entrada, presença por abrir, resultado por lançar, denúncia)? */
export function temPendencia(time) {
  return linhasDePendencia(time).length > 0;
}

/**
 * Em "Seus times" os times com pendência vêm primeiro (decisão da Freaky); depois, a ordem que o motor mandou.
 * A ordem dentro de cada grupo não muda. Devolve uma lista nova.
 */
export function timesComPendenciaPrimeiro(seuTime = []) {
  return [...seuTime.filter(temPendencia), ...seuTime.filter((t) => !temPendencia(t))];
}

/**
 * Quantos times "Seus times" mostra fechado: os 2 de sempre — ou todos os que têm pendência, se forem mais. Um time com pendência nunca fica
 * escondido atrás do "Ver todos". `ordenados` é o que `timesComPendenciaPrimeiro` devolveu.
 */
export function quantosTimesMostrar(ordenados = [], minimo = 2) {
  return Math.max(minimo, ordenados.filter(temPendencia).length);
}

/** Para onde vai o atalho "Sortear": o próximo jogo do time (é lá que se sorteia); sem jogo marcado, o Novo jogo. */
export function destinoDoSortear(slug, teamId, games = []) {
  const proximo = (games || [])
    .filter((g) => g.team_id === teamId && g.status !== 'finished' && g.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  return proximo ? `/time/${slug}/jogo/${proximo.id}` : `/time/${slug}/jogo/novo`;
}

/**
 * O que a linha de um time mostra FECHADA no card "Seus times" (2 times ou mais). Sem pendência: nada (a
 * linha é só escudo e nome). Uma pendência: o texto dela. Mais de uma: a contagem, e o detalhe aparece ao
 * tocar na linha.
 */
export function resumoDoTime(time) {
  const linhas = linhasDePendencia(time);
  if (!linhas.length) return '';
  return linhas.length === 1 ? linhas[0].texto : `${linhas.length} pendências`;
}
