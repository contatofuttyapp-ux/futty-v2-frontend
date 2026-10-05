// Futty v2.0 — Funções puras de formatação.
import { diaDoMes, formatarDataHora, mesCurto } from './dataHora';
import { formatarNota, formatarPontos } from './numero';

export const STATUS_LABELS = {
  agendado: 'Agendado',
  em_curso: 'Em andamento',
  terminado: 'Terminado',
  cancelado: 'Cancelado',
};

/**
 * Data + hora do jogo (ex.: "qua., 18 de jun. · 22:00") no relógio do CAMPO: `fuso` é o do time (Rodada 29I, achado 83).
 * Uma forma só em toda tela — a de src/utils/dataHora.js, com o rabicho "· horário de <cidade>" para quem está noutro relógio
 * (`opcoes.cidade`: a do time).
 */
export function formatDateTime(iso, fuso, opcoes) {
  return formatarDataHora(iso, fuso, opcoes);
}

/** Dia e mês curtos para o cartão de jogo, no relógio do campo (`fuso` do time). */
export function dayMonth(iso, fuso) {
  const dia = diaDoMes(iso, fuso);
  if (dia == null) return { day: '--', month: '' };
  return { day: String(dia).padStart(2, '0'), month: mesCurto(iso, fuso) };
}

// Achado 119 (29J): "★ -" no Elenco, "--" no Início e no Perfil, "—" na vitrine — quatro formas
// para a mesma coisa. Uma só, que diga o que é (a vitrine já dizia certo: "Sem nota ainda").
export const SEM_NOTA_AINDA = 'sem nota ainda';

/** Nota formatada em PT-BR com UMA casa ("9,1") ou SEM_NOTA_AINDA se não houver votos. Rodada 29Z: era "9.10". */
export function formatRating(value) {
  return Number(value) > 0 ? formatarNota(value) : SEM_NOTA_AINDA;
}

/** Score do ranking em PT-BR, uma casa ("77,9"). */
export function formatScore(value) {
  return formatarPontos(value || 0);
}
