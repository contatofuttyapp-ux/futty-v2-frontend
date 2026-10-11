// Futty v2.0 — Rodada 29S, bloco B (achados 153 e 154): as contas do "Jogo passado", puras (sem React), para testar no Node. O jogo passado é um
// passo a passo — Quando foi · Quem jogou · Times · Como terminou — TODO NO PASSADO, e o jogo SÓ É GRAVADO NO FIM, numa sequência de pedidos que
// pode ser retomada de onde parou sem criar outro jogo.
import { formatarHora, instanteNoCampo, dataComDiaPorExtenso } from './dataHora';
import { HORA_PADRAO } from './novoJogo';
import { RESULTADO_VAZIO, corpoDoResultadoDoJogo, corpoDosPremios, temPremio, temResultadoNoEstado } from './resultadoDoJogo';

export const PASSOS = ['Quando foi', 'Quem jogou', 'Times', 'Como terminou'];
export { HORA_PADRAO, RESULTADO_VAZIO };

/** Os textos do passo a passo. Tudo no passado: o jogo já rolou. (Os do convidado vêm de utils/convidadoSemApp.js, a mesma fonte do Jogo.) */
export const TEXTOS = {
  quando: 'Quando foi o jogo?',
  quemJogou: 'Quem jogou?',
  quemJogouApoio: 'Marque quem jogou. Quem jogou no gol leva o selo GOL.',
  times: 'Como ficaram os times?',
  tituloDosTimes: 'Quem jogou em cada time',
  ajudaDosTimes: 'Toque num time e depois em quem jogou nele.',
  semJogadoresNosTimes: 'Ninguém jogou ainda. Volte ao passo anterior e marque quem jogou.',
  terminou: 'Como terminou?',
  semResultado: 'O jogo fica salvo com quem jogou, sem resultado. Dá para lançar depois, em Ajustes → Jogos.',
  naoAconteceu: 'Esse jogo ainda não aconteceu. Confira a data e a hora.',
  faltaQuando: 'Falta a data do jogo. Volte ao primeiro passo.',
  faltaQuemJogou: 'Ninguém foi marcado. Volte ao passo Quem jogou.',
  faltaTimes: 'Tem time sem jogador. Volte ao passo Times.',
  continuar: 'Continuar',
  pular: 'Pular',
  salvar: 'Salvar jogo',
  salvando: 'Salvando…',
  tentarDeNovo: 'Tentar de novo',
};

/** Quem pode estar num jogo: os membros que jogam (quem só organiza o time fica fora, como no sorteio e no ranking). */
export function membrosQueJogam(members) {
  return (members || []).filter((m) => m.joga !== false);
}

/**
 * Quem pode entrar nos times: os membros marcados no passo 2 + os convidados sem app (só o nome). A chave do convidado leva um número que
 * só cresce, para tirar um da lista não trocar a chave dos outros.
 * @param {Array<{ id: string, nome?: string, avatar_url?: string|null }>} membros
 * @param {Record<string, { jogou?: boolean, gr?: boolean }>} presentes
 * @param {Array<{ id: number, nome: string }>} convidados
 */
export function poolDoJogoPassado(membros, presentes, convidados) {
  return [
    ...(membros || []).filter((m) => presentes?.[m.id]?.jogou).map((m) => ({ key: `u:${m.id}`, user_id: m.id, nome: m.nome || 'Jogador', avatar_url: m.avatar_url || null, convidado: false })),
    ...(convidados || []).map((c) => ({ key: `g:${c.id}`, user_id: null, nome: c.nome, avatar_url: null, convidado: true })),
  ];
}

/**
 * O plantel de cada time sem quem deixou de jogar (a pessoa voltou ao passo 2 e desmarcou alguém) — as chaves que não estão mais no pool saem.
 * Sempre devolve uma lista por time (`quantos`), mesmo vazia.
 */
export function atribuicaoLimpa(atrib, pool, quantos = (atrib || []).length) {
  const chaves = new Set(pool.map((p) => p.key));
  return Array.from({ length: quantos }, (_, i) => ((atrib || [])[i] || []).filter((k) => chaves.has(k)));
}

/**
 * O instante do jogo, lido no relógio do TIME (lei da hora do jogo): a hora vem do campo; sem hora, 12:00 (a hora é opcional).
 * @returns {string|null} ISO, ou null se a data não vale
 */
export function instanteDoJogoPassado({ data, hora, fuso }) {
  if (!data) return null;
  return instanteNoCampo(data, hora || '12:00', fuso);
}

/** O jogo passado já aconteceu? (Depois de agora não vale: hoje, às 23:00, antes das 23:00.) */
export function jaAconteceu(iso, agora = Date.now()) {
  const ms = iso ? Date.parse(iso) : NaN;
  return !Number.isNaN(ms) && ms <= agora;
}

/** Quem entra na lista de gols: os membros de TODOS os times (2, 3 ou 4 — o rodízio também tem artilheiro), com o nome do time e o índice. Convidado sem app fica de fora. */
export function jogadoresDoResultado(nomes, atrib, pool) {
  const porChave = Object.fromEntries(pool.map((p) => [p.key, p]));
  return (atrib || []).map((_, i) => i).flatMap((i) => (atrib[i] || [])
    .map((k) => porChave[k])
    .filter((p) => p && p.user_id)
    .map((p) => ({ user_id: p.user_id, nome: p.nome, avatar_url: p.avatar_url, time: nomes[i], timeIndex: i })));
}

/**
 * Os dois corpos do resultado, a partir do que a pessoa preencheu no passo 4 (o estado do ResultadoEditor):
 *   · com 2, 3 ou 4 times: quem ganhou (campeão, ou empate com 2), o placar digitado e os gols de cada um vão num pedido só, o do jogo
 *     (PATCH /api/games/:id/resultado) — o motor deduz o resto, e placar e vencedor nunca se contradizem;
 *   · o artilheiro e o destaque vão no pedido do feed (PATCH /api/feed/games/:id/resultado); foto e rodada de cerveja ficam para Ajustes → Jogos;
 *   · sem times: nenhum resultado, só os prêmios (artilheiro, destaque) se houver.
 * O campeão só vale se o time existe (a pessoa pode ter voltado e trocado 4 times por 3).
 * @returns {{ jogo: object|null, feed: object|null }} `null` = esse pedido nem sai
 */
export function resultadoDoPassado({ nTimes, usaTimes, estado, jogadores }) {
  const jogo = usaTimes && nTimes >= 2 && temResultadoNoEstado(estado, { nTimes, jogadores })
    ? corpoDoResultadoDoJogo(estado, { nTimes, jogadores })
    : null;
  // Foto do campeão e rodada de cerveja ficam de fora do passo a passo.
  const corpoFeed = corpoDosPremios({ ...estado, campeaoFoto: null, temRodada: false, rodadaId: '', rodadaFoto: null }, { soPreenchidos: true });
  return { jogo, feed: temPremio(corpoFeed) ? corpoFeed : null };
}

/**
 * A sequência de pedidos que grava o jogo passado, na ordem. `caminho(id)` recebe o id do jogo (que só existe depois do primeiro pedido).
 * Presença e times não avisam ninguém; o primeiro pedido que dá resultado (ou prêmio) avisa o time ("Resultado registrado!"), uma vez só,
 * como quando o admin lança qualquer resultado.
 */
export function planoDoJogoPassado({ slug, iso, local, jogadores, times, resultado }) {
  const plano = [
    { id: 'jogo', metodo: 'POST', caminho: () => '/api/games', corpo: { team_slug: slug, data: iso, local: (local || '').trim() || null, historico: true } },
    { id: 'presencas', metodo: 'POST', caminho: (gameId) => `/api/games/${gameId}/presencas`, corpo: { jogadores } },
  ];
  if (times) plano.push({ id: 'times', metodo: 'POST', caminho: (gameId) => `/api/games/${gameId}/times-manuais`, corpo: times });
  if (resultado?.jogo) plano.push({ id: 'resultado', metodo: 'PATCH', caminho: (gameId) => `/api/games/${gameId}/resultado`, corpo: resultado.jogo });
  if (resultado?.feed) plano.push({ id: 'premios', metodo: 'PATCH', caminho: (gameId) => `/api/feed/games/${gameId}/resultado`, corpo: resultado.feed });
  return plano;
}

/** Os jogadores do POST /api/games/:id/presencas: só quem tem conta, com o selo de goleiro. Convidado sem app não tem presença (entra só nos times). */
export function presencasParaGravar(membros, presentes) {
  return (membros || []).filter((m) => presentes?.[m.id]?.jogou).map((m) => ({ user_id: m.id, goleiro: !!presentes[m.id]?.gr }));
}

/**
 * Executa o plano, retomando de onde parou. `progresso` é { gameId, feitos } e é MUTADO a cada pedido que dá certo: quem chama o guarda entre as
 * tentativas, e "Tentar de novo" volta a chamar com o mesmo objeto — o que já foi gravado não se repete e o jogo não é criado outra vez.
 * Se um pedido falha, o erro sobe e o progresso fica como estava.
 * @param {Array<{ id: string, metodo: string, caminho: (gameId: string) => string, corpo: object }>} plano
 * @param {{ gameId: string|null, feitos: string[] }} progresso
 * @param {(caminho: string, opcoes: { method: string, body: string }) => Promise<any>} chamar o apiFetch (ou um de mentira, nos testes)
 * @returns {Promise<string>} o id do jogo
 */
export async function executarPlano(plano, progresso, chamar) {
  for (const passo of plano) {
    if (progresso.feitos.includes(passo.id)) continue;
    const resposta = await chamar(passo.caminho(progresso.gameId), { method: passo.metodo, body: JSON.stringify(passo.corpo) });
    if (passo.id === 'jogo') progresso.gameId = resposta?.game?.id || null;
    progresso.feitos.push(passo.id);
  }
  return progresso.gameId;
}

/** A linha-resumo do passo 4: "Quinta, 1 de out. · 20:00 · 9 jogaram · 2 times" — dia e hora SÓ pela dataHora.js. */
export function resumoDoJogoPassado({ iso, comHora, fuso, jogaram, nTimes }) {
  const partes = [dataComDiaPorExtenso(iso, fuso)];
  if (comHora) partes.push(formatarHora(iso, fuso));
  partes.push(jogaram === 1 ? '1 jogou' : `${jogaram} jogaram`);
  if (nTimes) partes.push(`${nTimes} times`);
  return partes.join(' · ');
}
