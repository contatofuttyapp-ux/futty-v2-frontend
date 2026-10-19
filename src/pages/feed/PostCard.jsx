// Futty v2.0 — O cartão de um post na Resenha.

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { assetUrl } from '../../lib/api';
import { urlImagem } from '../../utils/avatar';
import { haQuantoTempo } from '../../utils/haQuantoTempo';
import Reacoes from '../../components/Reacoes';
import Comentarios from '../../components/Comentarios';
import ImagemDoPost from '../../components/ImagemDoPost';
import DenunciaModal from '../../components/DenunciaModal';
import Toast from '../../components/Toast';
import { detectarVideoLink } from './videoLink';
import { BORDA_VIDRO, CARD, iconBtn } from './comum';
import { ComentariosResumo, FeedAvatar, LinkVitrine } from './pecas';
import { VideoLinkCard } from './VideoLinkCard';

function PostCard({ p, podeApagar, isAdmin, teamSlug, meId, onDelete, onOpenImage, onBloquear, index = 0 }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const videoLink = detectarVideoLink(p.body);
  // Com card de vídeo, o URL não aparece no corpo (strip só na EXIBIÇÃO; body
  // guardado intacto). Post só-com-link fica sem texto → mostra só o card.
  const bodyExibido = videoLink ? String(p.body).replace(videoLink.url, '').trim() : p.body;
  const [confirmar, setConfirmar] = useState(false);
  const [comentariosAbertos, setComentariosAbertos] = useState(false);
  const [contagem, setContagem] = useState(null);
  const [denunciaAberta, setDenunciaAberta] = useState(false);
  // P3-17 — memória da denúncia: sem isto, o post não ficava marcado e dava para repetir
  // sem saber. Estado local persistido por post (sobrevive a refresh).
  const [denunciado, setDenunciado] = useState(() => {
    try { return localStorage.getItem(`futty_denunciado_${p.id}`) === '1'; } catch { return false; }
  });
  const [toast, setToast] = useState(null);
  const media = Array.isArray(p.media) ? p.media : [];
  const podeDenunciar = p.author_id !== meId;

  return (
    <div className="anim-slide-in feed-card" style={{ ...CARD, animationDelay: `${index * 0.06}s` }}>
      {/* A) HEADER */}
      <div style={{ padding: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {/* Avatar e nome abrem a vitrine do autor, como no Ranking.
            Só com `teamSlug`: a vitrine vive dentro de um
            time, e sem ele não há rota. Sem slug ficam em texto seco —
            um nome que não leva a lado nenhum é melhor do que um link morto. */}
        <LinkVitrine teamSlug={teamSlug} userId={p.author_id} style={{ lineHeight: 0, flexShrink: 0 }}>
          <FeedAvatar nome={p.author_nome} avatarUrl={p.author_avatar_url} size={40} />
        </LinkVitrine>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <LinkVitrine teamSlug={teamSlug} userId={p.author_id} style={{ fontWeight: 800, color: '#fff', fontSize: 14, textDecoration: 'none' }}>
              {p.author_nome || 'Membro'}
            </LinkVitrine>
            {p.team_name ? (
              <span className="hud-corners-s" style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: '#b69cff', background: 'rgba(124,58,237,0.18)', border: '1px solid var(--purple)', padding: '2px 8px' }}>
                {p.team_name}
              </span>
            ) : null}
          </div>
          <div style={{ marginTop: 2, fontSize: 11, color: 'var(--text-dim)' }}>{haQuantoTempo(p.created_at)}</div>
        </div>
        {podeApagar || podeDenunciar ? (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button type="button" aria-label="Opções" onClick={() => setMenuAberto((v) => !v)} style={iconBtn}>
              ⋯
            </button>
            {menuAberto ? (
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, minWidth: 150, background: 'rgba(12, 12, 18, 0.98)', border: BORDA_VIDRO, clipPath: 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)', overflow: 'hidden', zIndex: 5 }}>
                {podeDenunciar ? (
                  denunciado ? (
                    <span style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', color: '#7bd88f', fontWeight: 700, fontSize: 13 }}>
                      Denunciado ✓
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuAberto(false);
                        setDenunciaAberta(true);
                      }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'transparent', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                    >
                      Denunciar
                    </button>
                  )
                ) : null}
                {podeDenunciar ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuAberto(false);
                      if (!window.confirm(`Bloquear ${p.author_nome || 'este jogador'}? Você deixa de ver o conteúdo dele/a, e ele/a deixa de ver o seu.`)) return;
                      onBloquear?.(p.author_id);
                    }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'transparent', color: '#fda4af', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                  >
                    Bloquear jogador
                  </button>
                ) : null}
                {podeApagar ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuAberto(false);
                      setConfirmar(true);
                    }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'transparent', color: '#fda4af', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                  >
                    Excluir
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* B) CORPO */}
      {bodyExibido ? (
        <div style={{ padding: '0 14px 12px', whiteSpace: 'pre-wrap', color: '#fff', fontSize: 14, lineHeight: 1.5 }}>{bodyExibido}</div>
      ) : null}
      {videoLink ? <VideoLinkCard video={videoLink} /> : null}
      {media.length === 1 ? (
        // Uma média: largura total. A PÁGINA MANDA NA ALTURA — horizontal fica
        // natural (baixa); vertical é limitada (max-height, cover ancorado ao topo)
        // para nunca dominar o ecrã. Toque abre o fullscreen.
        <div style={{ padding: '0 14px 12px' }}>
          {media[0].media_type === 'video' ? (
            <video src={assetUrl(media[0].url)} controls style={{ width: '100%', maxHeight: 460, borderRadius: 10, display: 'block', background: '#000' }} />
          ) : (
            // 512, não 1024. A caixa tem 362 pt de largura — 1024 é quatro vezes mais pixels para descodificar do que o
            // que cabe, e essa descodificação é na thread principal, a meio da rolagem. O toque abre o ORIGINAL em tela
            // cheia (onOpenImage leva a url sem `w`), por isso ninguém perde detalhe nenhum: perde-se só o que estava a
            // ser deitado fora na miniatura. Foto que falha vira uma linha curta com "tentar de novo", não um buraco de
            // 460 px.
            <ImagemDoPost
              src={urlImagem(assetUrl(media[0].url), 512)}
              onAbrir={() => onOpenImage(assetUrl(media[0].url))}
              estiloBotao={{ padding: 0, border: 'none', background: 'transparent', cursor: 'zoom-in', display: 'block', width: '100%' }}
              largura={362}
              altura={460}
              estiloImg={{ width: '100%', maxWidth: '100%', height: 'auto', maxHeight: 460, objectFit: 'cover', objectPosition: 'top', borderRadius: 10, display: 'block' }}
            />
          )}
        </div>
      ) : media.length ? (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 14px 12px' }}>
          {media.map((m, ix) => {
            const url = assetUrl(m.url);
            return (
              <div key={`${m.url}-${ix}`} style={{ flexShrink: 0, borderRadius: 10, overflow: 'hidden' }}>
                {m.media_type === 'video' ? (
                  <video src={url} controls style={{ width: 240, maxHeight: 220, display: 'block', background: '#000' }} />
                ) : (
                  <ImagemDoPost
                    src={urlImagem(url, 512)}
                    onAbrir={() => onOpenImage(url)}
                    estiloBotao={{ padding: 0, border: 'none', background: 'transparent', cursor: 'zoom-in', display: 'block' }}
                    largura={240}
                    altura={220}
                    estiloImg={{ width: 240, maxWidth: '100%', height: 'auto', maxHeight: 220, objectFit: 'cover', display: 'block' }}
                    larguraMinFalha={240}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* C) REAÇÕES */}
      <div style={{ padding: '12px 14px', borderTop: BORDA_VIDRO }}>
        <Reacoes targetType="post" targetId={p.id} contagemInicial={p.contagem_reacoes} minhaReacaoInicial={p.minha_reacao} compacto />
      </div>

      {/* D) COMENTÁRIOS — 2 recentes inline + ver todos */}
      <ComentariosResumo
        recentes={p.comentarios_recentes}
        total={contagem != null ? contagem : p.comentarios_total}
        aberto={comentariosAbertos}
        onToggle={() => setComentariosAbertos((v) => !v)}
      >
        <Comentarios parentType="post" parentId={p.id} visivel={comentariosAbertos} isAdmin={isAdmin} teamSlug={teamSlug} onCount={setContagem} />
      </ComentariosResumo>

      {/* Denúncia do post + toast */}
      {denunciaAberta ? (
        <DenunciaModal
          targetType="post"
          targetId={p.id}
          onClose={() => setDenunciaAberta(false)}
          onResult={(r) => {
            setToast({ tipo: r.tipo, mensagem: r.mensagem });
            if (r.tipo === 'success') {
              setDenunciado(true);
              try { localStorage.setItem(`futty_denunciado_${p.id}`, '1'); } catch { /* priv */ }
            }
          }}
        />
      ) : null}
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}

      {/* Modal de confirmação de apagar — portal para o body, mesma
          razão do LoadingFutty.jsx: fixed dentro do [data-page] não ancora na tela. */}
      {confirmar ? createPortal(
        <div className="modal-overlay" role="presentation" onClick={() => setConfirmar(false)}>
          <div className="modal-card modal-card--hud" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__inner">
              <p style={{ fontSize: 15, marginBottom: 16 }}>Tem certeza que quer excluir este post?</p>
              <button
                type="button"
                className="btn btn--hud hud-corners-s"
                style={{ width: '100%', background: 'var(--danger)', color: '#fff' }}
                onClick={() => {
                  setConfirmar(false);
                  onDelete(p.id);
                }}
              >
                Excluir
              </button>
              <button type="button" className="btn btn--ghost btn--sm btn--hud hud-corners-s" style={{ width: '100%', marginTop: 10 }} onClick={() => setConfirmar(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}

export { PostCard };
