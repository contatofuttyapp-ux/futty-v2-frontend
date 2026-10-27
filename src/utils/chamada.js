// Futty v2.0 — A chamada do jogo nas telas: a hora do sorteio, a contagem regressiva e a resposta de quem olha.
//
// O jogo nasce chamando (o motor: backend/utils/chamadaDoJogo.js). A lista de presença fecha sozinha na hora do sorteio — ou quando o
// admin sorteia antes. Aqui só o texto: "Sorteio às 20:00" (mesmo dia do jogo) ou "Sorteio: qua. 28/10 às 20:00", "Sorteio em 2h 15min"
// e, depois, "Lista fechada · 8 confirmados". A palavra "prazo" não aparece. Puro (sem React), para o teste rodar no Node.
import { diaCurtoComData, diaDeCalendario, formatarHora } from './dataHora.js';
import { plural } from './plural.js';

/** O sorteio padrão é 1 hora antes do jogo (a mesma regra do motor). */
export const UMA_HORA_MS = 60 * 60 * 1000;

/** "Sorteio às 20:00" quando o sorteio é no dia do jogo; "Sorteio: qua. 28/10 às 20:00" quando é noutro dia. No relógio do time. */
export function textoDoSorteio(sorteioEm, dataDoJogo, fuso) {
  if (!sorteioEm) return '';
  const hora = formatarHora(sorteioEm, fuso);
  if (dataDoJogo && diaDeCalendario(sorteioEm, fuso) === diaDeCalendario(dataDoJogo, fuso)) return `Sorteio às ${hora}`;
  return `Sorteio: ${diaCurtoComData(sorteioEm, fuso)} às ${hora}`;
}

/**
 * A contagem regressiva até o sorteio: "Sorteio em 3 dias", "Sorteio em 1 dia e 4h", "Sorteio em 2h 15min", "Sorteio em 35min".
 * null quando já passou (a lista fechou). `agora` só existe para o teste.
 */
export function contagemDoSorteio(sorteioEm, agora = Date.now()) {
  const falta = new Date(sorteioEm).getTime() - agora;
  if (!Number.isFinite(falta) || falta <= 0) return null;
  const minutos = Math.max(1, Math.ceil(falta / 60000));
  const dias = Math.floor(minutos / 1440);
  const horas = Math.floor((minutos % 1440) / 60);
  const resto = minutos % 60;
  if (dias >= 2) return `Sorteio em ${dias} dias`;
  if (dias === 1) return horas ? `Sorteio em 1 dia e ${horas}h` : 'Sorteio em 1 dia';
  if (horas) return resto ? `Sorteio em ${horas}h ${resto}min` : `Sorteio em ${horas}h`;
  return `Sorteio em ${resto}min`;
}

/** Depois do sorteio (ou se o admin sorteou antes): "Lista fechada · 8 confirmados". */
export function textoDaListaFechada(confirmados) {
  const n = Number(confirmados) || 0;
  return `Lista fechada · ${n} ${plural(n, 'confirmado', 'confirmados')}`;
}

/** A resposta de quem olha, a partir do jogo do Início (user_status do motor): 'confirmado' | 'recusado' | null. */
export function respostaDoJogo(game) {
  if (game?.user_status === 'going') return 'confirmado';
  if (game?.user_status === 'not_going') return 'recusado';
  return null;
}
