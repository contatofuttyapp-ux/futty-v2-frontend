// Futty v2.0 — "há 5 h": tempo decorrido, não data de calendário. Não tem fuso: vale o relógio de quem olha.
// Uma só para a Resenha, os comentários e o painel do admin (cada um tinha a sua cópia, que dizia
// "há 1 meses" entre 56 e 59 dias), concordando em tudo.
import { plural } from './plural';

/** `agora` só existe para o teste. */
export function haQuantoTempo(iso, agora = Date.now()) {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return '';
  const diff = agora - ts;
  const min = Math.floor(diff / 60000);
  if (min < 60) return `há ${Math.max(1, min)} min`;
  const h = Math.floor(diff / 3600000);
  if (h < 48) return `há ${h} h`;
  const dias = Math.floor(diff / 86400000);
  if (dias < 14) return `há ${dias} dias`;
  const sem = Math.floor(dias / 7);
  if (sem < 8) return `há ${sem} semanas`;
  const meses = Math.floor(dias / 30);
  return `há ${meses} ${plural(meses, 'mês', 'meses')}`;
}
