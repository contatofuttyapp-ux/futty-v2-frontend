// Futty v2.0 — Início: o dia do jogo por extenso, na pergunta do aviso de ausência.

import { formatarData } from '../../utils/dataHora';

// "quinta-feira, 08/10" — o dia do jogo na pergunta do aviso de ausência. No relógio do CAMPO (fuso do time).
function diaDoJogo(iso, fuso) {
  return formatarData(iso, fuso, 'longa') || null;
}

export { diaDoJogo };
