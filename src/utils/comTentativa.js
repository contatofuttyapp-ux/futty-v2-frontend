// Futty v2.0 — o endereço da foto na N-ésima tentativa. A primeira é o endereço de sempre; as outras
// ganham ?r=N (ou &r=N), para o navegador não reaproveitar a resposta que falhou. O token da mídia
// (/api/media/:token) vive no caminho, então a query não o altera.
export function comTentativa(src, tentativa) {
  if (!tentativa) return src;
  return `${src}${String(src).includes('?') ? '&' : '?'}r=${tentativa}`;
}
