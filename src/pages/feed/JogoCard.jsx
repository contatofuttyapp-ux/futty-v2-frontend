// Futty v2.0 — O cartão de um jogo na Resenha.

import { useState } from 'react';
import { Eye, Handshake, Share2 } from 'lucide-react';
import { assetUrl } from '../../lib/api';
import { urlImagem } from '../../utils/avatar';
import { haQuantoTempo } from '../../utils/haQuantoTempo';
import { contar } from '../../utils/plural';
import { empateDaResenha } from '../../utils/resultadoDoJogo';
import Icon from '../../components/Icon';
import Reacoes from '../../components/Reacoes';
import Comentarios from '../../components/Comentarios';
import ImagemDoPost from '../../components/ImagemDoPost';
import { apoioForte, BORDA_VIDRO, CARD, COR_ARTILHEIRO, COR_DESTAQUE, dataExtensa, horaDe, rodapeDoCartao, rotuloComIcone, timeCampeao } from './comum';
import { ComentariosResumo, FeedAvatar, PremioRow } from './pecas';

// ─── Card de JOGO ──────────────────────────────────────────────────────────────
// Exportado para a bancada das provas no navegador (scripts/provas/rodada-30i.*): o card de verdade, sem a página em volta.
export function JogoCard({ j, isAdmin, teamSlug, onOpenImage, index = 0 }) {
  const [detalhes, setDetalhes] = useState(true);
  const [comentariosAbertos, setComentariosAbertos] = useState(false);
  const [contagem, setContagem] = useState(null);

  const campeao = timeCampeao(j);
  const jogadoresCampeao = campeao?.jogadores || [];
  const nomesCampeao = jogadoresCampeao.map((p) => p.nome).filter(Boolean).join(' · ');
  // Sem campeão, o jogo que terminou empatado ganha o próprio bloco: "Empate · Ouro 2 × 2 Roxo".
  const empate = campeao ? null : empateDaResenha(j);
  const foto = j.campeao_foto_url ? assetUrl(j.campeao_foto_url) : null;

  async function partilhar() {
    const linhas = [
      `${dataExtensa(j.date, j.fuso)} · ${horaDe(j.date, j.fuso)}`,
      nomesCampeao ? `🏆 Time campeão: ${nomesCampeao}` : null,
      empate ? `Empate · ${empate.frase}` : null,
      j.artilheiro_nome ? `⚽ Artilheiro: ${j.artilheiro_nome}${j.artilheiro_gols ? ` · ${contar(j.artilheiro_gols, 'gol', 'gols')}` : ''}` : null,
      j.destaque_nome ? `⭐ Destaque: ${j.destaque_nome}${j.destaque_titulo ? ` – ${j.destaque_titulo}` : ''}` : null,
    ].filter(Boolean);
    try {
      if (navigator.share) await navigator.share({ title: 'Futty', text: linhas.join('\n') });
    } catch {
      // partilha cancelada/indisponível
    }
  }

  return (
    <div className="anim-slide-in feed-card" style={{ ...CARD, animationDelay: `${index * 0.06}s` }}>
      {/* A) HEADER */}
      <div style={{ padding: 14, position: 'relative' }}>
        <div style={{ paddingRight: 80 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--neon)', letterSpacing: '0.04em' }}>
            {dataExtensa(j.date, j.fuso)} · {horaDe(j.date, j.fuso)} ·{' '}
            <span style={apoioForte}>{haQuantoTempo(j.date)}</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-dim)', fontWeight: 600 }}>
            {[j.team_name, j.location].filter(Boolean).join(' · ') || 'Jogo'}
          </div>
        </div>
        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 10 }}>
          <button type="button" aria-label={detalhes ? 'Esconder detalhes' : 'Mostrar detalhes'} onClick={() => setDetalhes((v) => !v)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex' }}>
            <Eye size={16} strokeWidth={1.5} color="rgba(255,255,255,0.25)" />
          </button>
          <button type="button" aria-label="Compartilhar" onClick={partilhar} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex' }}>
            <Share2 size={16} strokeWidth={1.5} color="rgba(255,255,255,0.25)" />
          </button>
        </div>
      </div>

      {detalhes ? (
        <>
          {/* B) FOTO DO JOGO (sangra até às bordas) */}
          {foto ? (
            // Foto de post: lazy; os atributos só reservam a proporção, o CSS manda no tamanho. 512 na lista (o toque
            // abre o original). Se a foto falha, vira uma linha curta com "tentar de novo" (ImagemDoPost).
            <ImagemDoPost
              src={urlImagem(foto, 512)}
              onAbrir={() => onOpenImage(foto)}
              estiloBotao={{ display: 'block', width: '100%', padding: 0, border: 'none', background: '#000', cursor: 'zoom-in' }}
              largura={390}
              altura={420}
              estiloImg={{ width: '100%', maxWidth: '100%', height: 'auto', maxHeight: 420, objectFit: 'cover', display: 'block' }}
              estiloFalha={{ width: 'calc(100% - 28px)', margin: '8px 14px' }}
            />
          ) : null}

          {/* C) TIME CAMPEÃO — respira como o cromo (bob+sway aninhados). */}
          {jogadoresCampeao.length ? (
            <div className="feed-cromo-bob">
              <div className="feed-cromo-sway">
                <div
                  style={{
                    padding: 14,
                    borderTop: BORDA_VIDRO,
                    background: foto ? 'transparent' : 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(124,58,237,0.08))',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--neon)', textTransform: 'uppercase' }}>
                    <span style={rotuloComIcone}>
                      <Icon name="medalha" size={14} />
                      Time campeão
                    </span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.45 }}>{nomesCampeao}</div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {jogadoresCampeao.map((p) => (
                      <div key={p.user_id || p.nome} style={{ flexShrink: 0 }}>
                        <FeedAvatar nome={p.nome} avatarUrl={p.avatar_url} size={48} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* C1) SÓ A FOTO — jogo antigo, de antes do app, que tem a foto do campeão e nenhum resultado lançado: a legenda diz o que a foto
              é, sem nomes (o app não sabe quem ganhou e não inventa). Parado: flutuar é do bloco com o time campeão. */}
          {foto && !jogadoresCampeao.length && !empate ? (
            <div data-so-foto style={{ padding: '10px 14px', borderTop: BORDA_VIDRO }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--neon)', textTransform: 'uppercase' }}>
                <Icon name="medalha" size={14} />
                Time campeão
              </span>
            </div>
          ) : null}

          {/* C2) EMPATE — no lugar do time campeão, com a mesma respiração: os dois times e, se houve, o placar. */}
          {empate ? (
            <div className="feed-cromo-bob">
              <div className="feed-cromo-sway">
                <div
                  data-empate
                  style={{
                    padding: 14,
                    borderTop: BORDA_VIDRO,
                    background: foto ? 'transparent' : 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(124,58,237,0.08))',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--neon)', textTransform: 'uppercase' }}>
                    <span style={rotuloComIcone}>
                      <Handshake size={14} aria-hidden="true" />
                      Empate
                    </span>
                  </div>
                  <div data-empate-frase style={{ marginTop: 8, fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.45 }}>{empate.frase}</div>
                  {empate.times.map((t, i) => (
                    <div key={i} style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)' }}>{t.nome}</div>
                      <div style={{ marginTop: 6, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                        {t.jogadores.map((p) => (
                          <div key={p.user_id || p.nome} style={{ flexShrink: 0 }}>
                            <FeedAvatar nome={p.nome} avatarUrl={p.avatar_url} size={40} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* D) ARTILHEIRO — mesma respiração, delay desfasado. */}
          {j.artilheiro_user_id ? (
            <div className="feed-cromo-bob" style={{ animationDelay: '-2.4s' }}>
              <div className="feed-cromo-sway" style={{ animationDelay: '-3.1s' }}>
                <PremioRow
                  label="Artilheiro do dia"
                  labelColor={COR_ARTILHEIRO}
                  nome={j.artilheiro_nome || 'Artilheiro'}
                  sub={{ avatarUrl: j.artilheiro_avatar_url, gols: j.artilheiro_gols }}
                />
              </div>
            </div>
          ) : null}

          {/* E) DESTAQUE — mesma respiração, delay desfasado. */}
          {j.destaque_user_id ? (
            <div className="feed-cromo-bob" style={{ animationDelay: '-4.8s' }}>
              <div className="feed-cromo-sway" style={{ animationDelay: '-6.2s' }}>
                <PremioRow
                  label="Destaque do dia"
                  labelColor={COR_DESTAQUE}
                  nome={j.destaque_nome || 'Destaque'}
                  sub={{ avatarUrl: j.destaque_avatar_url, titulo: j.destaque_titulo }}
                />
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {/* G) REAÇÕES */}
      <div style={rodapeDoCartao}>
        <Reacoes targetType="game" targetId={j.id} contagemInicial={j.contagem_reacoes} minhaReacaoInicial={j.minha_reacao} compacto />
      </div>

      {/* H) COMENTÁRIOS — 2 recentes inline + ver todos */}
      <ComentariosResumo
        recentes={j.comentarios_recentes}
        total={contagem != null ? contagem : j.comentarios_total}
        aberto={comentariosAbertos}
        onToggle={() => setComentariosAbertos((v) => !v)}
      >
        <Comentarios parentType="game" parentId={j.id} visivel={comentariosAbertos} isAdmin={isAdmin} teamSlug={teamSlug} onCount={setContagem} />
      </ComentariosResumo>
    </div>
  );
}
