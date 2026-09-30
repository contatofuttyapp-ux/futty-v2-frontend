// Futty v2.0 — Rodada 29A (G): "Você joga na linha · trocar" / "Você joga no gol · trocar".
// A escolha entre jogar na linha ou no gol vivia num chip no meio da página do time e o dono não a achou.
// Agora é este botão, com o estado escrito por extenso, no card do próprio jogador (topo da página do time)
// e na seção "Meus times" do Perfil. Quem grava é quem usa (PATCH /api/equipas/:slug/membros/posicao, que já existia).
// Gol = chip dourado (ativo); linha = roxo da casa, como era.
export const TEXTO_APOIO_LINHA_GOL = 'Vale para os sorteios deste time. Dá para mudar em cada jogo.';

export default function EscolhaLinhaGol({ goleiro, ocupado = false, aoTrocar }) {
  const estado = goleiro ? 'no gol' : 'na linha';
  return (
    <button
      type="button"
      aria-pressed={!!goleiro}
      aria-label={`Você joga ${estado}. Tocar para trocar para ${goleiro ? 'a linha' : 'o gol'}.`}
      className={`chip ${goleiro ? 'chip--active' : ''}`}
      disabled={ocupado}
      onClick={() => aoTrocar(!goleiro)}
      style={goleiro ? undefined : { color: '#b69cff', borderColor: 'rgba(139,92,246,0.55)', background: 'rgba(139,92,246,0.08)' }}
    >
      Você joga {estado} · trocar
    </button>
  );
}
