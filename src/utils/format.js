// Futty v2.0 — Funções puras de formatação.
import { diaDoMes, formatarDataHora, mesCurto } from './dataHora';

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

/** Média de votos formatada (2 casas) ou "--" se não houver votos. */
export function formatRating(value) {
  return Number(value) > 0 ? Number(value).toFixed(2) : '--';
}

/** Score do ranking formatado (1 casa decimal). */
export function formatScore(value) {
  return Number(value || 0).toFixed(1);
}
