// Futty v2.0 — Helpers de formatação (datas)

export function formatDataHora(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-PT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function diaMes(iso) {
  if (!iso) return { dia: '--', mes: '' };
  const d = new Date(iso);
  return {
    dia: String(d.getDate()).padStart(2, '0'),
    mes: d.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', ''),
  };
}

export const STATUS_LABEL = {
  agendado: 'Agendado',
  em_curso: 'Em curso',
  terminado: 'Terminado',
  cancelado: 'Cancelado',
};
