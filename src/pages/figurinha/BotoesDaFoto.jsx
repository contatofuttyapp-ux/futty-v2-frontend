// Futty v2.0 — Figurinha: os botões de baixo do card — gerar a figurinha, trocar a foto, o contador de gerações e o recado do pedido.
import { Camera } from 'lucide-react';
import FuttyLoader from '../../components/FuttyLoader';
import RotuloGerar from '../../components/RotuloGerar';
import { EstrelaIA } from './constantes';

export default function BotoesDaFoto({ avatarEhIA, brilharGerar, gerandoIA, gerarAvatarIA, jogador, setModalFoto, temDireitoDeGerar, temFoto, totalGeracoes, uploadFoto }) {
  return (
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                className="btn btn--purple-outline fig-io-btn hud-corners"
                style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, paddingLeft: 12, paddingRight: 12 }}
                disabled={uploadFoto || gerandoIA}
                onClick={() => setModalFoto(true)}
              >
                <Camera size={16} /> {jogador.avatar_url ? 'Trocar foto' : 'Adicionar foto'}
              </button>
              {/* SPEC-FIGURINHA-3 §7: "Trocar foto" SEMPRE (à esquerda); o botão
                  de gerar só existe para quem tem DIREITO. Sem direito, o que
                  aparece por baixo é o bloco "Vire Brilhante" — não um botão
                  que só serve para levar um 403 na cara. */}
              {!temFoto ? (
                <div style={{ flex: 1, fontSize: 12, color: 'var(--label-color)', textAlign: 'center', alignSelf: 'center' }}>
                  Adicione uma foto para começar
                </div>
              ) : !temDireitoDeGerar && !gerandoIA ? null : (
                brilharGerar || (temDireitoDeGerar && !avatarEhIA) ? (
                  // EXACTAMENTE a receita do "Ver sorteio" (Inicio.jsx): o glow fica no WRAPPER, em
                  // drop-shadow (filter não é cortado pelo clip-path); o pulso de BORDA fica no botão
                  // (essa metade sobrevive ao recorte a 45° do hud-corners). fig-io-btn
                  // continua nas duas classes só para a ALTURA: .cta-gold sozinho
                  // vale 46px e quebraria a linha com "Trocar foto" (40px, 34px em
                  // ecrãs curtos) — o par .fig-io-btn.cta-gold no app.css resolve
                  // esse empate de especificidade a favor da grade existente.
                  <span className="cta-gold-glow pulse-glow" style={{ flex: 1, display: 'flex' }}>
                    <button
                      type="button"
                      className="btn hud-corners fig-io-btn fig-gerar cta-gold pulse-active"
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                      disabled={gerandoIA || uploadFoto}
                      onClick={gerarAvatarIA}
                    >
                      <EstrelaIA size={16} color="#f0c94a" /> <RotuloGerar />
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn--purple fig-io-btn fig-gerar hud-corners"
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    disabled={gerandoIA || uploadFoto}
                    onClick={gerarAvatarIA}
                  >
                    {gerandoIA ? (
                      <>
                        <FuttyLoader size={22} label={null} /> Gerando…
                      </>
                    ) : (
                      <>
                        <EstrelaIA size={16} color="#ffffff" /> <RotuloGerar />
                      </>
                    )}
                  </button>
                )
              )}
            </div>
            {/* Contador de gerações (§7): a SOMA de tudo o que a pessoa pode gerar — pacotes dos times e créditos, sem separar um do
                outro. Qual direito gasta (o uniforme do time sai do pacote; os outros, do crédito) é decidido por baixo. */}
            {totalGeracoes > 0 ? (
              <span data-contador-geracoes={totalGeracoes} style={{ fontSize: 11, color: 'var(--label-color)', textAlign: 'center' }}>
                {totalGeracoes === 1 ? 'Resta 1 geração' : `Restam ${totalGeracoes} gerações`}
              </span>
            ) : null}
            {/* Sem link de "comprar mais gerações" aqui: o cartão "Loja de figurinhas" está logo abaixo, sempre, e o botão
                dele já é esse caminho — repetir o botão duas vezes seguidas só confunde. */}
            {/* Sem legenda de tempo própria sob o botão: a mensagem acima da linha já cobre gerandoIA, e duas
                legendas de tempo diferentes ao mesmo tempo confundem mais do que ajudam. */}
          </div>
  );
}
