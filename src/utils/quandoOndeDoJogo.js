// Futty v2.0 — "qui., 8 de out · 20:00 · Society Madalena — campo 2" —
// a linha de quando e onde é o jogo, para a página pública do sorteio (/p/, /s/), no relógio do
// CAMPO (fuso do time) com o rabicho da cidade quando for diferente do de quem olha.
import { formatarDataHora } from './dataHora';

/**
 * @param {{ data: string|null, local: string|null }|null|undefined} jogo
 * @param {{ fuso?: string, cidade?: string }|null|undefined} equipa
 * @param {{ olhando?: string }} [opcoes] só para o teste (o fuso de quem olha, ver rabichoDoFuso).
 * @returns {string} "qui., 8 de out · 20:00[· horário de <cidade>][ · <local>]" ou '' sem data.
 */
export function quandoOndeDoJogo(jogo, equipa, opcoes) {
  if (!jogo?.data) return '';
  const dataHora = formatarDataHora(jogo.data, equipa?.fuso, { cidade: equipa?.cidade, ...opcoes });
  return [dataHora, jogo.local].filter(Boolean).join(' · ');
}
