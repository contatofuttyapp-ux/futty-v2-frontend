// Futty v2.0 — uma faixa que rola para o lado tem de DIZER que rola. Esta é a conta, pura para testar no
// Node: dado o que o navegador mede num trilho horizontal, há mais coisa à esquerda? à direita?
export const FOLGA_PX = 4;

/** `{ esquerda, direita }`: ainda há conteúdo escondido de cada lado. Trilho que cabe inteiro (ou medida zerada) não tem nenhum. */
export function estadoDaFaixa({ scrollLeft = 0, clientWidth = 0, scrollWidth = 0 } = {}, folga = FOLGA_PX) {
  const rolavel = clientWidth > 0 && scrollWidth - clientWidth > folga;
  return {
    esquerda: rolavel && scrollLeft > folga,
    direita: rolavel && scrollLeft + clientWidth < scrollWidth - folga,
  };
}

/** Quanto a seta rola por toque: quase uma "página" do trilho, deixando uma peça de contexto. Nunca passa do fim. */
export function passoDaSeta({ sentido, scrollLeft = 0, clientWidth = 0, scrollWidth = 0 }) {
  const passo = Math.max(1, Math.round(clientWidth * 0.8));
  const alvo = scrollLeft + (sentido < 0 ? -passo : passo);
  return Math.min(Math.max(0, alvo), Math.max(0, scrollWidth - clientWidth));
}
