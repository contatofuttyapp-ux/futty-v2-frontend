// Futty v2.0 — Rodada 29I, bloco 3: as linhas do card "Seu time" do Início (components/CardSeuTime.jsx), puras para testar no Node.
// As pendências vêm prontas do motor (GET /api/inicio → seu_time); aqui vira texto e destino de cada linha, na ordem da tela.
import { formatarData } from './dataHora';
import { plural } from './plural';

/** [{ chave, texto, para }] — pedido de entrada, jogo sem presença aberta, resultado por lançar, denúncia. Vazio = "Tudo tranquilo". */
export function linhasDePendencia({ slug, fuso, pendencias: p = {} } = {}) {
  const base = `/time/${slug}`;
  const linhas = [];
  if (p.pedidos > 0) linhas.push({ chave: 'pedidos', para: `${base}?aba=elenco`, texto: `${p.pedidos} ${plural(p.pedidos, 'pedido', 'pedidos')} de entrada` });
  if (p.presenca) linhas.push({ chave: 'presenca', para: `${base}?aba=jogos`, texto: `Jogo de ${formatarData(p.presenca.data, fuso)} sem presença aberta` });
  if (p.resultado) linhas.push({ chave: 'resultado', para: `${base}?aba=jogos`, texto: `Resultado de ${formatarData(p.resultado.data, fuso)} por lançar` });
  if (p.denuncias > 0) linhas.push({ chave: 'denuncias', para: `${base}?aba=ajustes#denuncias`, texto: `${p.denuncias} ${plural(p.denuncias, 'denúncia', 'denúncias')} para ver` });
  return linhas;
}

/** Para onde vai o atalho "Sortear": o próximo jogo do time (é lá que se sorteia); sem jogo marcado, o Novo jogo. */
export function destinoDoSortear(slug, teamId, games = []) {
  const proximo = (games || [])
    .filter((g) => g.team_id === teamId && g.status !== 'finished' && g.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  return proximo ? `/time/${slug}/jogo/${proximo.id}` : `/time/${slug}/jogo/novo`;
}
