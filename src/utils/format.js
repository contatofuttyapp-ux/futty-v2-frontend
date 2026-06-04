// Futty v2.0 — Funções puras de formatação.

export const STATUS_LABELS = {
  agendado: 'Agendado',
  em_curso: 'Em curso',
  terminado: 'Terminado',
  cancelado: 'Cancelado',
};

/** Data + hora curtas em PT (ex.: "qua, 18 jun, 22:00"). */
export function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-PT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Dia e mês curtos para o cartão de jogo. */
export function dayMonth(iso) {
  if (!iso) return { day: '--', month: '' };
  const d = new Date(iso);
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', ''),
  };
}

/** Média de votos formatada (2 casas) ou "--" se não houver votos. */
export function formatRating(value) {
  return Number(value) > 0 ? Number(value).toFixed(2) : '--';
}

/** Score do ranking formatado (1 casa decimal). */
export function formatScore(value) {
  return Number(value || 0).toFixed(1);
}
