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
 * Data + hora do jogo (ex.: "qua., 18 de jun. · 22:00") no relógio do CAMPO: `fuso` é o do time.
 * Uma forma só em toda tela — a de src/utils/dataHora.js, com o rabicho "· horário de <cidade>" para quem está
 * noutro relógio (`opcoes.cidade`: a do time).
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

// "★ -" no Elenco, "--" no Início e no Perfil, "—" na vitrine: quatro formas
// para a mesma coisa. Uma só, que diga o que é.
export const SEM_NOTA = 'sem nota';

/**
 * Nota de 0 a 10 em PT-BR ("7,5", "8") ou SEM_NOTA quando ninguém votou (o motor manda null). O 0 é nota: quem recebeu só zeros tem
 * nota 0, não "sem nota".
 */
export function formatRating(value) {
  const n = typeof value === 'number' ? value : value == null || value === '' ? Number.NaN : Number(value);
  return Number.isFinite(n) && n >= 0 ? formatarNota(n) : SEM_NOTA;
}

/** Score do ranking em PT-BR, uma casa ("77,9"). */
export function formatScore(value) {
  return formatarPontos(value || 0);
}
