// Futty v2.0 — Figurinha: a zona do card — o cromo vivo (levitação, camadas, partículas, glints) e a sombra no chão.
import { RefreshCw } from 'lucide-react';
import FuttyLoader from '../../components/FuttyLoader';
import { CLIP_OCTOGONO, FUTTY_PARTICULAS, GOLDEN_GLINTS_UI } from './constantes';

export default function ZonaDoCard({ avatarEhIA, erroIA, fotoLocal, fundo, fundoUrl, gerandoIA, jogadorUrl, overlayGerando, placaUrl, setSheetAvatarAberto, temFoto, uploadFoto }) {
  return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 16px' }}>
          <div className="fig-card-enter fig-studio-card" style={{ position: 'relative' }}>
            {/* Sombra viva no chão (contra-fase com a levitação) */}
            <div
              className="fig-shadow"
              style={{ position: 'absolute', left: '15%', bottom: -18, width: '70%', height: 14, background: 'radial-gradient(ellipse, rgba(212,160,23,0.35), rgba(0,0,0,0.5) 60%, transparent)', filter: 'blur(8px)', pointerEvents: 'none', zIndex: 0 }}
            />
            {/* Bob (translateY) exterior → Sway (rotate 3D) interior */}
            <div className="fig-bob" style={{ position: 'relative', width: '100%', height: '100%', zIndex: 1 }}>
              <div className="fig-sway" style={{ position: 'relative', width: '100%', height: '100%' }}>
                {fundoUrl ? (
                  <>
                    {/* Camada de fundo — card completo SEM jogador */}
                    <img
                      src={fundoUrl}
                      alt="figurinha"
                      className="fig-aura"
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 2 }}
                    />

                    {/* Fundo vivo — partículas ENTRE o fundo e o jogador (caem atrás dele).
                        Estádio E Gradiente (chuva dourada sobre a carta gold). */}
                    {avatarEhIA && (fundo === 'estadio' || fundo === 'gradiente') ? (
                      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 3, containerType: 'size', mixBlendMode: 'screen', clipPath: CLIP_OCTOGONO }}>
                        {FUTTY_PARTICULAS.map((p, i) => {
                          // Sobre o facetado escuro: brancas → branco-quente; douradas
                          // mantêm-se (a chuva é o "premium discreto").
                          const cor = fundo === 'gradiente' && p.cor === '#ffffff' ? '#fff8dc' : p.cor;
                          return (
                            <span
                              key={i}
                              className="fig-particle"
                              style={{ position: 'absolute', left: `${p.left}%`, top: '-5%', width: p.size, height: p.size, borderRadius: '50%', background: cor, boxShadow: `0 0 6px ${cor}`, animationDuration: `${p.dur * 1.25}s`, animationDelay: `${p.delay}s` }}
                            />
                          );
                        })}
                      </div>
                    ) : null}
                    {/* Sem névoa no fundo Épico: o facetado é gráfico, não atmosférico; a bruma por cima embaçaria o
                        lapidado. As partículas (chuva) ficam — dão o "premium discreto" sem embaçar. */}

                    {/* GOLDEN — mina encantada VIVA no preview: poeira de diamante a z3,
                        ATRÁS do jogador (lei do brilho do cromo). O download leva o pico
                        estático (canvas). reduced-motion → pontos ténues sem flash. */}
                    {fundo === 'golden' ? (
                      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 3, clipPath: CLIP_OCTOGONO }}>
                        {GOLDEN_GLINTS_UI.map((g, i) => (
                          <span key={i} className="fig-glint" style={{ left: `${g.x}%`, top: `${g.y}%`, '--gd': `${g.d}px`, '--gdl': `${g.dl}s`, '--gdur': `${g.dur}s` }}>
                            <span className="fig-glint__dot" />
                            <span className="fig-glint__cross" />
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {/* Camada do jogador — só o avatar, por cima das partículas */}
                    {jogadorUrl ? (
                      <img
                        src={jogadorUrl}
                        alt=""
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', zIndex: 4 }}
                      />
                    ) : null}

                    {/* Camada placa+nome — POR CIMA do jogador (nunca tapada por ele) */}
                    {placaUrl ? (
                      <img
                        src={placaUrl}
                        alt=""
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', zIndex: 5 }}
                      />
                    ) : null}

                    {/* Glow pulsante fixo sobre a zona do nome (nada a atravessá-lo) */}
                    <div className="fig-name-glow" style={{ position: 'absolute', left: 0, bottom: '8%', width: '100%', height: '20%', pointerEvents: 'none', zIndex: 5, background: 'radial-gradient(ellipse 55% 70% at 50% 55%, rgba(245,224,112,0.20), transparent 70%)', mixBlendMode: 'screen', WebkitMaskImage: 'linear-gradient(to top, black 0%, black 55%, transparent 100%)', maskImage: 'linear-gradient(to top, black 0%, black 55%, transparent 100%)' }} />

                    {/* Luz direccional sincronizada com o sway (desloca-se → volume 3D).
                        Wrapper estático recorta o octógono; o interior desliza. */}
                    <div style={{ position: 'absolute', inset: 0, zIndex: 6, pointerEvents: 'none', overflow: 'hidden', clipPath: CLIP_OCTOGONO }}>
                      <div className="fig-light" style={{ position: 'absolute', inset: '-5%', background: 'linear-gradient(105deg, rgba(255,245,200,0.08) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.12) 100%)', mixBlendMode: 'soft-light', WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 45%, transparent 75%)', maskImage: 'linear-gradient(to bottom, black 0%, black 45%, transparent 75%)' }} />
                    </div>

                    {/* Linha de brilho a percorrer o frame (cromo a apanhar luz) */}
                    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 7, clipPath: CLIP_OCTOGONO }}>
                      <div className="fig-frame-shine" style={{ position: 'absolute', top: 0, left: 0, width: '250%', height: '100%', background: 'linear-gradient(115deg, transparent 44%, rgba(255,240,180,0.35) 50%, transparent 56%)', mixBlendMode: 'screen' }} />
                    </div>

                    {/* Dots dos cantos a cintilar intercalados (sobre os dots do canvas:
                        19*k → 4.75% na horizontal, 3.17% na vertical num card 2:3) */}
                    {[
                      { pos: { top: '3.17%', left: '4.75%', marginTop: -5, marginLeft: -5 }, delay: 0 },
                      { pos: { top: '3.17%', right: '4.75%', marginTop: -5, marginRight: -5 }, delay: 2.1 },
                      { pos: { bottom: '3.17%', left: '4.75%', marginBottom: -5, marginLeft: -5 }, delay: 4.3 },
                      { pos: { bottom: '3.17%', right: '4.75%', marginBottom: -5, marginRight: -5 }, delay: 6.2 },
                    ].map((d, i) => (
                      <span
                        key={i}
                        className="fig-dot-twinkle"
                        style={{ position: 'absolute', ...d.pos, width: 10, height: 10, borderRadius: 1, background: 'linear-gradient(135deg, #f5e070, #d4a017)', mixBlendMode: 'screen', pointerEvents: 'none', zIndex: 7, animationDelay: `${d.delay}s` }}
                      />
                    ))}
                  </>
                ) : (
                  // GRUPO B 6a — ver nota no fallback da estreia: o F a carregar em vez
                  // do PlayerCard (a geração anterior do cromo).
                  <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
                    <FuttyLoader size={96} label={null} />
                  </div>
                )}

              </div>
            </div>
            {/* Estado "a gerar" — cobre a zona do card */}
            {/* Sem avatar IA o card já veste o genérico da casa (ver `jogadorCard`
                acima) — não há mais empty state de silhueta a desenhar aqui. */}
            {gerandoIA || erroIA ? overlayGerando : null}
            {/* Trocar visual — só quando o card veste o genérico da casa: sem Brilhante E SEM FOTO. Com foto o card
                mostra a foto e o genérico não aparece em lugar nenhum: o botão não mudaria nada. Sem foto, a
                escolha vale para todas as telas (Início, Ranking, Presença). */}
            {!avatarEhIA && !temFoto && !fotoLocal && !uploadFoto && !gerandoIA && !erroIA ? (
              <button
                type="button"
                className="hud-corners-s"
                aria-label="Trocar visual do card"
                onClick={() => setSheetAvatarAberto(true)}
                style={{ position: 'absolute', top: 10, right: 10, zIndex: 8, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px 6px 8px', border: '1px solid rgba(212,160,23,0.5)', background: 'rgba(13,13,18,0.82)', color: '#d4a017', cursor: 'pointer', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}
              >
                <RefreshCw size={15} />
                Trocar avatar
              </button>
            ) : null}
          </div>
        </div>
  );
}
