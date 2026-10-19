// Futty v2.0 — Figurinha: o cartão "Loja de figurinhas" (Minha Figurinha e o pacote do time; comprar ou pedir ativação).
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { urlAsset } from '../../utils/avatar';
import { MINHA_GERACOES, PACOTE_DE_PRESENTE, PACOTE_GERACOES_POR_JOGADOR, PACOTE_JOGADORES } from '../../lib/planos';
import { CLIP_OCTOGONO } from './constantes';
import { botaoDaLoja, losangoDoCanto } from './estilos';

export default function CartaoDaLoja({ brilhante, lojaConvida, lojaLigada, meuTimeBrilhante, navigate, pacoteDoTimeAtivo, pedidoVivo, recadoPedido, textoDoConvite }) {
  return (
          <div data-cartao-loja className="hud-corners" style={{ position: 'relative', background: 'rgba(255, 255, 255, 0.03)', border: '1.2px solid rgba(212,160,23,0.5)', boxShadow: '0 0 14px rgba(212,160,23,0.18)', padding: '16px', display: 'grid', gap: 12 }}>
              <span aria-hidden="true" style={losangoDoCanto} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {lojaConvida ? (
                  <img
                    src={urlAsset('/avatares/exemplo-brilhante.webp')}
                    alt="Exemplo de figurinha"
                    width={72}
                    height={108}
                    loading="lazy"
                    decoding="async"
                    style={{ width: 72, height: 108, objectFit: 'cover', flexShrink: 0, clipPath: CLIP_OCTOGONO, border: '1.5px solid rgba(212,160,23,0.55)' }}
                  />
                ) : null}
                <div style={{ display: 'grid', gap: 5, minWidth: 0 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 18, color: '#f0c94a' }}>
                    <ShoppingBag size={16} aria-hidden="true" /> Loja de figurinhas
                  </span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.45, color: 'rgba(255,255,255,0.78)' }}>
                    {lojaConvida
                      ? 'Sua foto vira uma figurinha de verdade, no uniforme do Futty, com os 6 fundos liberados.'
                      : 'Mais gerações para pintar uniformes novos e refazer a sua figurinha.'}
                  </span>
                </div>
              </div>
              {recadoPedido ? (
                // Recusa fala em branco, não em dourado: o dourado desta tela é
                // convite ("dá para ter"), e um não pintado de convite mente.
                <div
                  className="hud-corners-s"
                  role="status"
                  style={pedidoVivo?.estado === 'recusado'
                    ? { padding: '9px 11px', fontSize: 12.5, lineHeight: 1.4, textAlign: 'center', color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.14)' }
                    : { padding: '9px 11px', fontSize: 12.5, lineHeight: 1.4, textAlign: 'center', color: '#f0c94a', background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.45)' }}
                >
                  {recadoPedido}
                </div>
              ) : null}
              {brilhante ? (
                <>
                  {/* Minha Figurinha: para todo mundo. O botão leva aos Planos com ela em destaque — lá se compra
                      (loja ligada) ou se pede. */}
                  <div data-loja-produto="minha" style={{ display: 'grid', gap: 8 }}>
                    <div style={{ display: 'grid', gap: 2 }}>
                      <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 16, color: '#fff' }}>Minha Figurinha</span>
                      <span style={{ fontSize: 12, lineHeight: 1.4, color: 'rgba(255,255,255,0.7)' }}>{MINHA_GERACOES} gerações, no uniforme que você escolher.</span>
                    </div>
                    <span className="cta-gold-glow" style={{ display: 'flex' }}>
                      <button
                        type="button"
                        data-loja-comprar="minha"
                        className="btn hud-corners cta-gold"
                        style={botaoDaLoja}
                        onClick={() => navigate('/planos?destaque=minha')}
                      >
                        {textoDoConvite('minha')}
                      </button>
                    </span>
                  </div>
                  {/* Pacote do time: só o dono. É o que resolve o time inteiro, e a venda maior. Com o pacote já
                      ativo o cartão vira presente (+2 gerações para cada jogador) e o botão segue o mesmo. */}
                  {meuTimeBrilhante ? (
                    <div data-loja-produto="pacote" style={{ display: 'grid', gap: 8, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
                      <div style={{ display: 'grid', gap: 2 }}>
                        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 16, color: '#fff' }}>
                          {pacoteDoTimeAtivo ? PACOTE_DE_PRESENTE.nome : 'Pacote do time'}
                        </span>
                        <span style={{ fontSize: 12, lineHeight: 1.4, color: 'rgba(255,255,255,0.7)' }}>
                          {pacoteDoTimeAtivo ? PACOTE_DE_PRESENTE.resumo : `${PACOTE_GERACOES_POR_JOGADOR} gerações por jogador, até ${PACOTE_JOGADORES}.`}
                        </span>
                      </div>
                      {!pacoteDoTimeAtivo || lojaLigada ? (
                        <span className="cta-gold-glow" style={{ display: 'flex' }}>
                          <button
                            type="button"
                            data-convite-pacote={pacoteDoTimeAtivo ? 'presente' : 'novo'}
                            data-loja-comprar="pacote"
                            className="btn hud-corners cta-gold"
                            style={botaoDaLoja}
                            onClick={() => navigate('/planos?destaque=pacote')}
                          >
                            {textoDoConvite('pacote', { presente: pacoteDoTimeAtivo })}
                          </button>
                        </span>
                      ) : (
                        // Sem a loja não há como comprar mais um pacote, e pedir a ativação de um time já ativo não faz nada.
                        <div className="hud-corners" style={{ textAlign: 'center', padding: '9px 11px', fontSize: 12.5, lineHeight: 1.4, color: 'rgba(255,255,255,0.7)', border: '1.2px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)' }}>
                          O time já tem o pacote.
                        </div>
                      )}
                      {/* Pacote ativo sem uniforme (comprado na loja): ninguém gera até o dono escolher. */}
                      {pacoteDoTimeAtivo && !meuTimeBrilhante.brilhante_kit ? (
                        <span className="cta-gold-glow" style={{ display: 'flex' }}>
                          <button
                            type="button"
                            className="btn hud-corners cta-gold"
                            style={botaoDaLoja}
                            onClick={() => navigate(`/planos?uniforme=${meuTimeBrilhante.id}`)}
                          >
                            Escolher o uniforme do time
                          </button>
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                // O estado da loja ainda não chegou: um caminho honesto até ela, em vez de um botão que poderia dizer "Pedir"
                // e virar "Comprar" um instante depois.
                <span className="cta-gold-glow" style={{ display: 'flex' }}>
                  <button type="button" data-loja-comprar="ver" className="btn hud-corners cta-gold" style={botaoDaLoja} onClick={() => navigate('/planos')}>
                    Ver a loja
                  </button>
                </span>
              )}
              <Link to="/planos" style={{ fontSize: 11.5, color: 'var(--label-color)', textAlign: 'center', textDecoration: 'none' }}>
                Ver tudo na loja →
              </Link>
            </div>
  );
}
