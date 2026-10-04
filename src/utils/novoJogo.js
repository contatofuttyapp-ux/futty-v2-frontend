// Futty v2.0 — Rodada 29S, bloco A (achados 151 a 156): as contas do "Marcar jogo" (Novo jogo), puras, para testar no Node.
import { dataComDiaPorExtenso, diaDeCalendario, formatarHora, instanteNoCampo, rabichoDoFuso } from './dataHora';

/** A hora de uma pelada: o jogo nasce às 20:00 (achado 155), não na hora do relógio de quem abriu a página. */
export const HORA_PADRAO = '20:00';

/**
 * Para onde vai o "Jogo passado →" do Novo jogo: a rota própria do passo a passo (bloco B). UM ponto só — a URL mora aqui e em mais lugar nenhum.
 */
export function caminhoDoJogoPassado(slug) {
  return `/time/${slug}/jogo/passado`;
}

/**
 * O que o "ingresso" do jogo mostra, a partir do que a pessoa digitou — SÓ pela dataHora.js (lei da hora do jogo): o dia por extenso e a hora são
 * lidos no relógio do TIME, e o rabicho com a cidade do time só existe quando o relógio de quem olha é outro. Campo vazio → texto vazio.
 * @param {{ data?: string, hora?: string, fuso?: string, cidade?: string, olhando?: string }} entrada `olhando` só existe para o teste
 * @returns {{ dia: string, hora: string, rabicho: string }}
 */
export function dadosDoIngresso({ data, hora, fuso, cidade, olhando } = {}) {
  const dia = data ? dataComDiaPorExtenso(instanteNoCampo(data, '12:00', fuso), fuso) : '';
  const iso = hora ? instanteNoCampo(data || diaDeCalendario(new Date(), fuso), hora, fuso) : null;
  return { dia, hora: iso ? formatarHora(iso, fuso) : '', rabicho: rabichoDoFuso(iso || new Date(), fuso, { cidade, olhando }) };
}

/**
 * A hora com que o Novo jogo nasce: a do ÚLTIMO jogo do time (o de data mais distante), lida no relógio do time, quando os jogos do time
 * já estão em cache; senão, 20:00. Nenhum pedido novo só para isso: quem chama passa os jogos que já tem (o cache do Início).
 * @param {Array<{ team_slug?: string, date?: string|null }>|null|undefined} jogos jogos no formato do /api/inicio (convites.games)
 * @param {{ slug: string, fuso?: string }} time
 */
export function horaSugerida(jogos, { slug, fuso } = {}) {
  let ultimo = null;
  for (const j of jogos || []) {
    if (j?.team_slug !== slug) continue;
    const ms = j.date ? Date.parse(j.date) : NaN;
    if (Number.isNaN(ms)) continue;
    if (!ultimo || ms > ultimo.ms) ultimo = { ms, iso: j.date };
  }
  return (ultimo && formatarHora(ultimo.iso, fuso)) || HORA_PADRAO;
}
