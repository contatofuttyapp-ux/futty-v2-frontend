// Futty v2.0 — Resenha (/feed): feed social por equipa.
// Jogos passados com resultado + posts editoriais. Sem Topbar (título no conteúdo).
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, ExternalLink, Eye, Link2, Music2, Play, Share2, Video } from 'lucide-react';
import { apiFetch, assetUrl } from '../lib/api';
import { urlImagem } from '../utils/avatar';
import AdCard from '../components/AdCard';
import Icon from '../components/Icon';
import Topbar from '../components/Topbar';
import LoadingFutty from '../components/LoadingFutty';
import { useAuth } from '../hooks/useAuth';
import { usePerfil } from '../context/PerfilContext';
import { useTeams } from '../hooks/useTeam';
import { useAd } from '../hooks/useAd';
import { useApiComCache } from '../hooks/useApiComCache';
import SilhuetaJogador from '../components/SilhuetaJogador';
import Reacoes from '../components/Reacoes';
import Comentarios from '../components/Comentarios';
import UploadComCrop from '../components/UploadComCrop';
import EscudoEquipa from '../components/EscudoEquipa';
import DenunciaModal from '../components/DenunciaModal';
import Toast from '../components/Toast';
import EstadoSemTime from '../components/EstadoSemTime';
import '../styles/app.css';

// Cores de acento (theme.js): neon, purple, warning (#f59e0b).
const COR_ARTILHEIRO = '#7c3aed';
const COR_DESTAQUE = '#f59e0b';
// Material da casa = VIDRO: véu branco 3% sobre base TRANSPARENTE (a aurora atravessa,
// como Planos/Perfil) + cantos a 45° à escala de card (corte cheio 8px). Estreia do
// vidro na Resenha. As divisórias internas passam de #222 a branco baixo-alpha.
const CLIP_CARD =
  'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)';
const BORDA_VIDRO = '1px solid rgba(255, 255, 255, 0.07)';
const CARD = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  overflow: 'hidden',
  clipPath: CLIP_CARD,
};

// ─── Helpers de data ──────────────────────────────────────────────────────────
function dataExtensa(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}
function horaDe(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function haQuantoTempo(iso) {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return '';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 60) return `há ${Math.max(1, min)} min`;
  const h = Math.floor(diff / 3600000);
  if (h < 48) return `há ${h} h`;
  const dias = Math.floor(diff / 86400000);
  if (dias < 14) return `há ${dias} dias`;
  const sem = Math.floor(dias / 7);
  if (sem < 8) return `há ${sem} semanas`;
  return `há ${Math.floor(dias / 30)} meses`;
}

// Jogadores do time campeão (a partir de times_resultado + campeao_time_index).
function timeCampeao(j) {
  const times = j?.times_resultado?.times;
  if (!Array.isArray(times)) return null;
  const idx = j?.campeao_time_index;
  if (idx == null || idx < 0 || idx >= times.length) return null;
  return times[idx];
}

// ─── Avatar — moldura V1 do cânone (.avatar-frame), única na página ────────────
function FeedAvatar({ avatarUrl, size = 48 }) {
  const [falhou, setFalhou] = useState(false);
  const src = avatarUrl ? urlImagem(assetUrl(avatarUrl), 128) : null;
  return (
    <span className="avatar-frame" style={{ width: size, height: size, flexShrink: 0 }}>
      <span className="avatar-frame__fill" style={{ fontSize: Math.round(size * 0.34) }}>
        {src && !falhou ? <img src={src} alt="" decoding="async" onError={() => setFalhou(true)} /> : <SilhuetaJogador size="76%" />}
      </span>
      <span className="avatar-frame__veil" />
      <span className="avatar-frame__lc avatar-frame__lc--tl" />
      <span className="avatar-frame__lc avatar-frame__lc--tr" />
      <span className="avatar-frame__lc avatar-frame__lc--br" />
      <span className="avatar-frame__lc avatar-frame__lc--bl" />
    </span>
  );
}

// ─── Bloco "prémio" (artilheiro / destaque) ────────────────────────────────────
function PremioRow({ label, labelColor, nome, sub }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px', margin: '12px 14px', clipPath: 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)', background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.3)' }}>
      <FeedAvatar nome={nome} avatarUrl={sub?.avatarUrl} size={56} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: labelColor, textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{ marginTop: 4, fontFamily: "'Rajdhani', sans-serif", fontSize: 17, fontWeight: 700, color: '#fff' }}>
          {nome}
          {sub?.gols ? <span style={{ color: 'var(--text-dim)', fontWeight: 700 }}> · {sub.gols} gols</span> : null}
        </div>
        {sub?.titulo ? (
          <div style={{ marginTop: 2, fontSize: 13, color: 'var(--text-dim)', fontStyle: 'italic' }}>{sub.titulo}</div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Comentários: 2 recentes inline (vidro) + "Ver todos" que abre o fluxo actual ──
function ComentariosResumo({ recentes = [], total = 0, aberto, onToggle, children }) {
  const label = aberto ? 'Esconder comentários' : total > 2 ? `Ver todos os ${total} comentários` : total > 0 ? 'Responder' : 'Comentar';
  return (
    <div style={{ padding: '0 14px 12px' }}>
      {!aberto && recentes.length > 0 ? (
        // minmax(0, 1fr): a prévia cortada em 2 linhas (-webkit-box) mede, no
        // WebKit, a frase inteira numa linha só — uma coluna automática cresceria até ela.
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 8, marginBottom: 8 }}>
          {recentes.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <FeedAvatar nome={c.nome} avatarUrl={c.avatar_url} size={28} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 12, color: '#fff' }}>{c.nome || 'Membro'}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginLeft: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.body}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <button type="button" onClick={onToggle} style={linkBtn}>{label}</button>
      {children}
    </div>
  );
}

// ─── Card de JOGO ──────────────────────────────────────────────────────────────
function JogoCard({ j, isAdmin, teamSlug, onOpenImage, index = 0 }) {
  const [detalhes, setDetalhes] = useState(true);
  const [comentariosAbertos, setComentariosAbertos] = useState(false);
  const [contagem, setContagem] = useState(null);

  const campeao = timeCampeao(j);
  const jogadoresCampeao = campeao?.jogadores || [];
  const nomesCampeao = jogadoresCampeao.map((p) => p.nome).filter(Boolean).join(' · ');
  const foto = j.campeao_foto_url ? assetUrl(j.campeao_foto_url) : null;

  async function partilhar() {
    const linhas = [
      `${dataExtensa(j.date)} · ${horaDe(j.date)}`,
      nomesCampeao ? `🏆 Time campeão: ${nomesCampeao}` : null,
      j.artilheiro_nome ? `⚽ Artilheiro: ${j.artilheiro_nome}${j.artilheiro_gols ? ` · ${j.artilheiro_gols} gols` : ''}` : null,
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
            {dataExtensa(j.date)} · {horaDe(j.date)} ·{' '}
            <span style={{ color: 'var(--text-dim)', fontWeight: 700 }}>{haQuantoTempo(j.date)}</span>
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
            <button
              type="button"
              onClick={() => onOpenImage(foto)}
              style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: '#000', cursor: 'zoom-in' }}
            >
              {/* Foto de post: lazy; os atributos só reservam a proporção, o CSS manda no tamanho. */}
              <img src={urlImagem(foto, 1024)} alt="" width={390} height={420} loading="lazy" decoding="async" style={{ width: '100%', maxWidth: '100%', height: 'auto', maxHeight: 420, objectFit: 'cover', display: 'block' }} />
            </button>
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
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
      <div style={{ padding: '12px 14px', borderTop: BORDA_VIDRO }}>
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

// ─── Card de POST editorial ────────────────────────────────────────────────────
// Anúncio oficial do admin: post especial, sem like/comentário, destaque dourado.
function AnuncioCard({ p, index = 0 }) {
  const titulo = p.conteudo?.titulo || 'Anúncio';
  const mensagem = p.conteudo?.mensagem || p.body || '';
  return (
    <div
      className="anim-slide-in feed-card"
      style={{
        clipPath: CLIP_CARD,
        background: 'rgba(212,160,23,0.08)',
        border: '1px solid rgba(212,160,23,0.22)',
        borderLeft: '3px solid #d4a017',
        overflow: 'hidden',
        animationDelay: `${index * 0.06}s`,
      }}
    >
      <div style={{ padding: 14 }}>
        {/* Badge */}
        <span
          style={{
            display: 'inline-block',
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#d4a017',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="anuncio" size={14} />
            Anúncio oficial
          </span>
        </span>

        {/* Título em destaque */}
        <div
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 800,
            fontSize: 19,
            lineHeight: 1.15,
            color: '#fff',
            marginTop: 6,
          }}
        >
          {titulo}
        </div>

        {/* Mensagem */}
        {mensagem ? (
          <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 1.5 }}>
            {mensagem}
          </div>
        ) : null}

        {/* Rodapé: autor + data */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
          <FeedAvatar nome={p.author_nome} avatarUrl={p.author_avatar_url} size={28} />
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {p.author_nome || 'Admin'} · {haQuantoTempo(p.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Vídeo por LINK (zero storage nosso) ────────────────────────────────────────
// Deteta o 1º URL de YouTube/TikTok/Instagram no corpo do post. YouTube = thumbnail
// + play (embed inline ao tocar); TikTok/Instagram = card de link (abre nova aba).
const RE_YOUTUBE = /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;
const RE_TIKTOK = /https?:\/\/(?:www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+/i;
const RE_INSTAGRAM = /https?:\/\/(?:www\.)?instagram\.com\/(?:reel|reels|p|tv)\/[^\s?/#]+/i;

function detectarVideoLink(texto) {
  if (!texto) return null;
  const yt = texto.match(RE_YOUTUBE);
  if (yt) return { tipo: 'youtube', id: yt[1], url: yt[0] };
  const tk = texto.match(RE_TIKTOK);
  if (tk) return { tipo: 'tiktok', url: tk[0] };
  const ig = texto.match(RE_INSTAGRAM);
  if (ig) return { tipo: 'instagram', url: ig[0] };
  return null;
}

function VideoLinkCard({ video }) {
  const [tocando, setTocando] = useState(false);
  if (video.tipo === 'youtube') {
    return (
      <div style={{ margin: '0 14px 12px', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#000' }}>
        {tocando ? (
          // Embed INLINE no próprio card. border-radius (NÃO clip-path) no wrapper;
          // e o card (.anim-slide-in) já não persiste transform (fill backwards),
          // portanto os controlos do iframe respondem ao clique real.
          <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000' }}>
            <iframe
              src={`https://www.youtube.com/embed/${video.id}?enablejsapi=1&autoplay=1&controls=1&playsinline=1&rel=0`}
              title="YouTube"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setTocando(true)}
            aria-label="Reproduzir vídeo"
            style={{ position: 'relative', display: 'block', width: '100%', padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }}
          >
            <img src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`} alt="" style={{ width: '100%', display: 'block', aspectRatio: '16 / 9', objectFit: 'cover' }} />
            <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
              <span style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(212,160,23,0.92)', color: '#1a1408', display: 'grid', placeItems: 'center' }}>
                <Play size={24} fill="#1a1408" style={{ marginLeft: 3 }} />
              </span>
            </span>
          </button>
        )}
      </div>
    );
  }
  const nome = video.tipo === 'tiktok' ? 'TikTok' : 'Instagram';
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 14px 12px', padding: '11px 14px', clipPath: 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none', color: '#fff' }}
    >
      <span style={{ color: '#f0c94a', display: 'grid', placeItems: 'center' }} aria-hidden>
        {video.tipo === 'tiktok' ? <Music2 size={22} /> : <Video size={22} />}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>Ver vídeo no {nome}</span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.url}</span>
      </span>
      <ExternalLink size={16} style={{ color: '#f0c94a', flexShrink: 0 }} aria-hidden />
    </a>
  );
}

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
        <FeedAvatar nome={p.author_nome} avatarUrl={p.author_avatar_url} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>{p.author_nome || 'Membro'}</span>
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
            <button type="button" onClick={() => onOpenImage(assetUrl(media[0].url))} style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'zoom-in', display: 'block', width: '100%' }}>
              <img src={urlImagem(assetUrl(media[0].url), 1024)} alt="" width={362} height={460} loading="lazy" decoding="async" style={{ width: '100%', maxWidth: '100%', height: 'auto', maxHeight: 460, objectFit: 'cover', objectPosition: 'top', borderRadius: 10, display: 'block' }} />
            </button>
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
                  <button type="button" onClick={() => onOpenImage(url)} style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'zoom-in', display: 'block' }}>
                    <img src={urlImagem(url, 512)} alt="" loading="lazy" decoding="async" width={240} height={220} style={{ width: 240, maxWidth: '100%', height: 'auto', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
                  </button>
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

      {/* Modal de confirmação de apagar */}
      {confirmar ? (
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
        </div>
      ) : null}
    </div>
  );
}

// ─── Formulário de novo post (drawer de baixo) ─────────────────────────────────
// Composer INLINE (padrão Facebook): colapsado = avatar + convite (CTA dourado);
// tocar expande NA PÁGINA (sem sheet) — textarea autofocus, select se >1 equipa,
// média (câmera lucide) e Publicar. Publicar colapsa e o post entra no feed.
// Só o CropModal (dentro do UploadComCrop) usa portal.
function ComposerInline({ teams, user, nome, onCreated }) {
  const [expandido, setExpandido] = useState(false);
  const [teamId, setTeamId] = useState(teams[0]?.id || '');
  const [texto, setTexto] = useState('');
  const [media, setMedia] = useState([]); // { url, media_type }
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const [linkAberto, setLinkAberto] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [linkUrl, setLinkUrl] = useState(''); // URL de vídeo confirmado (entra no body)
  const [linkAviso, setLinkAviso] = useState('');
  const taRef = useRef(null);

  const videoPreview = linkUrl ? detectarVideoLink(linkUrl) : null;

  function confirmarLink() {
    const v = detectarVideoLink(linkInput);
    if (!v) {
      setLinkAviso('Link não reconhecido (YouTube, TikTok ou Instagram).');
      return;
    }
    setLinkUrl(v.url);
    setLinkAberto(false);
    setLinkInput('');
    setLinkAviso('');
  }
  function removerLink() {
    setLinkUrl('');
    setLinkAberto(false);
    setLinkInput('');
    setLinkAviso('');
  }

  useEffect(() => {
    if (expandido) taRef.current?.focus();
  }, [expandido]);

  function addMedia(url, mediaType) {
    setMedia((m) => (m.length >= 4 ? m : [...m, { url, media_type: mediaType }]));
  }
  function removeMedia(i) {
    setMedia((m) => m.filter((_, ix) => ix !== i));
  }
  function colapsar() {
    setExpandido(false);
    setTexto('');
    setMedia([]);
    setErro('');
    removerLink();
  }

  async function publicar() {
    if (busy) return;
    if (!teamId) {
      setErro('Escolha um time.');
      return;
    }
    // O link entra no body (mecânica actual: o VideoLinkCard deteta-o no feed).
    const bodyFinal = [texto.trim(), linkUrl].filter(Boolean).join('\n\n');
    if (!bodyFinal && media.length === 0) {
      setErro('Escreva algo, adicione mídia ou um link.');
      return;
    }
    setBusy(true);
    setErro('');
    try {
      const res = await apiFetch('/api/feed/posts', {
        method: 'POST',
        body: JSON.stringify({
          team_id: teamId,
          body: bodyFinal,
          media: media.map((m, i) => ({ url: m.url, media_type: m.media_type, position: i })),
        }),
      });
      onCreated(res.post);
      colapsar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setBusy(false);
    }
  }

  // COLAPSADO — CTA da página: avatar V1 + convite legível, borda dourada. Sem câmera.
  if (!expandido) {
    return (
      <button
        type="button"
        onClick={() => setExpandido(true)}
        className="hud-corners-s"
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,160,23,0.35)', cursor: 'pointer', textAlign: 'left' }}
      >
        <FeedAvatar nome={nome} avatarUrl={user?.avatar_url} size={40} />
        <span style={{ flex: 1, minWidth: 0, color: 'rgba(255,255,255,0.72)', fontSize: 14 }}>
          Solte a resenha, {nome}…
        </span>
      </button>
    );
  }

  // EXPANDIDO — composer inline.
  return (
    <div
      className="hud-corners-s"
      style={{ marginTop: 14, padding: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,160,23,0.35)', display: 'grid', gap: 12 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <FeedAvatar nome={nome} avatarUrl={user?.avatar_url} size={40} />
        <div style={{ flex: 1, fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: '0.04em' }}>Nova resenha</div>
        <button type="button" aria-label="Fechar" onClick={colapsar} style={iconBtn}>✕</button>
      </div>

      {teams.length > 1 ? (
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="input input--hud hud-corners-s"
          style={{ fontSize: 16 }}
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
      ) : null}

      <div style={{ position: 'relative' }}>
        <textarea
          ref={taRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value.slice(0, 2000))}
          placeholder="Escreva sua resenha…"
          rows={4}
          className="input input--hud hud-corners-s"
          style={{ fontSize: 16, resize: 'vertical' }}
        />
        <div style={{ position: 'absolute', right: 10, bottom: 8, fontSize: 11, color: 'var(--text-dim)' }}>{texto.length}/2000</div>
      </div>

      {/* Média (máx 4) */}
      {media.length ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {media.map((m, ix) => (
            <div key={`${m.url}-${ix}`} style={{ position: 'relative', width: 80, height: 80, clipPath: 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)', overflow: 'hidden', border: BORDA_VIDRO }}>
              {m.media_type === 'video' ? (
                <video src={assetUrl(m.url)} style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }} />
              ) : (
                <img src={urlImagem(assetUrl(m.url), 256)} alt="" width={80} height={80} decoding="async" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <button
                type="button"
                aria-label="Remover"
                onClick={() => removeMedia(ix)}
                style={{ position: 'absolute', top: 2, right: 2, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.7)', color: '#fff', cursor: 'pointer', fontSize: 12, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Preview do vídeo por link — o MESMO card do feed, já no composer. */}
      {videoPreview ? (
        <div style={{ position: 'relative' }}>
          <VideoLinkCard video={videoPreview} />
          <button
            type="button"
            aria-label="Remover link"
            onClick={removerLink}
            style={{ position: 'absolute', top: 2, right: 16, width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.72)', color: '#fff', cursor: 'pointer', fontSize: 13, lineHeight: 1, zIndex: 2 }}
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* Campo de URL inline (colar + OK). */}
      {linkAberto ? (
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="url"
              value={linkInput}
              autoFocus
              onChange={(e) => { setLinkInput(e.target.value); setLinkAviso(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmarLink(); } }}
              placeholder="Cole o link (YouTube, TikTok ou Instagram)"
              className="input input--hud hud-corners-s"
              style={{ flex: 1, fontSize: 16 }}
            />
            <button type="button" className="btn btn--hud btn--gold hud-corners-s" style={{ minWidth: 64 }} onClick={confirmarLink}>OK</button>
          </div>
          {linkAviso ? <div style={{ fontSize: 12, color: 'var(--danger)' }}>{linkAviso}</div> : null}
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {media.length < 4 ? (
          <UploadComCrop
            onUpload={addMedia}
            aspect={1}
            aspectos={[{ k: '1:1', v: 1 }, { k: '3:4', v: 3 / 4 }, { k: '4:3', v: 4 / 3 }, { k: '16:9', v: 16 / 9 }, { k: 'Livre', v: 0 }]}
            accept="image/*"
            label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Camera size={16} /> Foto</span>}
          />
        ) : <span />}
        {!linkUrl ? (
          <button
            type="button"
            onClick={() => setLinkAberto((v) => !v)}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', borderRadius: 12, border: '1px dashed var(--border)', background: linkAberto ? 'rgba(212,160,23,0.10)' : 'rgba(255,255,255,0.03)', color: 'var(--neon)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            <Link2 size={16} /> Link
          </button>
        ) : null}
        {erro ? <div style={{ fontSize: 13, color: 'var(--danger)' }}>{erro}</div> : null}
        <button type="button" className="btn btn--hud btn--gold hud-corners-s" style={{ marginLeft: 'auto', minWidth: 128 }} disabled={busy || (!texto.trim() && media.length === 0 && !linkUrl)} onClick={publicar}>
          {busy ? 'Publicando…' : 'Publicar'}
        </button>
      </div>
    </div>
  );
}

// Estilos partilhados de botões pequenos.
const iconBtn = {
  width: 34,
  height: 34,
  clipPath: 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  background: 'rgba(255, 255, 255, 0.04)',
  color: 'var(--text)',
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
  fontSize: 15,
  lineHeight: 1,
};
const linkBtn = {
  border: 'none',
  background: 'transparent',
  padding: '4px 0',
  color: 'var(--text-dim)',
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
};

// ─── Página ────────────────────────────────────────────────────────────────────
export default function Feed() {
  const { user: authUser } = useAuth();
  const { perfil } = usePerfil();
  // O usuário do Auth só tem id e e-mail; nome_jogador e avatar_url vivem no
  // perfil (/api/me). Sem isto o compositor dizia "Solte a resenha, Jogador…".
  const user = perfil?.user ? { ...authUser, ...perfil.user } : authUser;
  const { teams, loading: teamsLoading } = useTeams();
  // A resenha é por time: sem um, não há o que filtrar nem onde publicar — é o
  // mesmo convite do Ranking, com identidade própria (ver EstadoSemTime).
  // !teamsLoading evita mostrar isto por um instante antes de saber se há time.
  const semTime = !teamsLoading && teams.length === 0;

  // VELOCIDADE 4 — a Resenha era a única das cinco abas sem cache nenhum: um
  // apiFetch cru dentro de um efeito, e o loader a tapar a tela inteira até a
  // resposta chegar de São Paulo. Quem está em Lisboa pagava essa espera em
  // TODA visita à aba. Agora entra no mesmo stale-while-revalidate do resto da
  // casa: pinta o feed da última visita na hora e actualiza por trás.
  const { data: feedData, loading: feedCarregando, error: feedErro } = useApiComCache('/api/feed', 'feed');

  // VELOCIDADE 6B (15-set): o anúncio é pedido AQUI, no topo, em paralelo com o
  // feed. Antes o AdCard só era montado entre o 3º e o 4º item da lista, por
  // isso o pedido dele só começava depois do /api/feed inteiro ter chegado e
  // sido pintado — duas idas a São Paulo em fila por uma faixa de 100 px.
  // `pagina='inicio'` de propósito: é a página configurada no Gabinete.
  const { ad: adFeed, pronto: adPronto } = useAd('inicio');

  const [items, setItems] = useState(null); // null = ainda não há nada para mostrar
  const [erro, setErro] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [imgFull, setImgFull] = useState(null);
  const [novoPostId, setNovoPostId] = useState(null); // P2-11: post acabado de criar

  // `items` continua a ser estado local porque as ações fazem optimistic update
  // por cima dele (apagar post, publicar, bloquear jogador). Sincronizado
  // DURANTE o render a partir do hook — mesmo padrão do MeuPerfil e do Início,
  // nunca num efeito (lint react-hooks/set-state-in-effect).
  const [feedAnterior, setFeedAnterior] = useState(undefined);
  if (feedData !== feedAnterior) {
    setFeedAnterior(feedData);
    if (feedData) setItems(feedData.items || []);
  }

  // Bloqueio entre jogadores (Apple UGC 1.2): remove localmente todo o conteúdo
  // dessa pessoa (o servidor já filtra desde já para pedidos futuros).
  async function bloquear(userId) {
    await apiFetch('/api/blocks', { method: 'POST', body: JSON.stringify({ blocked_id: userId }) });
    setItems((prev) => (prev || []).filter((i) => i.author_id !== userId));
  }

  // Equipas onde o utilizador pode publicar (admin OU pode_postar).
  const equipasParaPostar = useMemo(() => teams.filter((t) => t.role === 'admin' || t.pode_postar), [teams]);
  const podeCriar = equipasParaPostar.length > 0;

  const filtrados = useMemo(
    () => (items || []).filter((i) => selectedTeam === 'all' || i.team_id === selectedTeam),
    [items, selectedTeam]
  );

  async function apagarPost(id) {
    setErro('');
    try {
      await apiFetch(`/api/feed/posts/${id}`, { method: 'DELETE' });
      setItems((cur) => (cur || []).filter((i) => !(i.kind === 'post' && i.id === id)));
    } catch (err) {
      setErro(err.message);
    }
  }

  function aoCriarPost(post) {
    if (!post) return;
    setItems((cur) => [{ ...post, kind: 'post' }, ...(cur || [])]);
    // P2-11: em feeds longos o post novo entrava sem se ver. Marca-o para o
    // efeito o rolar até à vista e piscar dourado 2s.
    setNovoPostId(post.id);
  }

  // P2-11: quando há post novo, rola até ele e limpa o destaque após 2s.
  useEffect(() => {
    if (!novoPostId) return;
    const el = document.getElementById(`feed-item-${novoPostId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => setNovoPostId(null), 2000);
    return () => clearTimeout(t);
  }, [novoPostId]);

  // Só há loader quando não há NADA para mostrar (nem cache, nem resposta).
  // Com cache, a tela pinta e a actualização acontece por trás, sem loader.
  const loading = items === null && feedCarregando;
  const meId = user?.id;
  // Fonte do nome = a do Início (nome_jogador primeiro). NUNCA o derivado do email.
  const nomeUser = user?.nome_jogador || user?.nome || 'Jogador';
  const primeiroNome = nomeUser.split(' ')[0];

  return (
    <div className="app-shell page-reveal">
      <Topbar hud="RESENHA" />
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
        {semTime ? (
          <EstadoSemTime icone="resenha" mensagem="A resenha é do time. Crie o seu ou entre em um." />
        ) : (
          <>
            {/* 2. CHIPS DE EQUIPA */}
            <div className="chips-row">
              <button type="button" className={`chip ${selectedTeam === 'all' ? 'chip--active tab-shine' : ''}`} onClick={() => setSelectedTeam('all')}>
                Todas
              </button>
              {teams.map((t) => (
                <button key={t.id} type="button" className={`chip ${selectedTeam === t.id ? 'chip--active tab-shine' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }} onClick={() => setSelectedTeam(t.id)}>
                  <EscudoEquipa team={t} size={20} />
                  {t.nome}
                </button>
              ))}
            </div>

            {erro || feedErro ? <div className="alert alert--error" style={{ marginTop: 12 }}>{erro || feedErro}</div> : null}

            {/* 2.5 COMPOSER INLINE NO TOPO (só para quem pode publicar). Substitui o FAB. */}
            {podeCriar ? (
              <ComposerInline teams={equipasParaPostar} user={user} nome={primeiroNome} onCreated={aoCriarPost} />
            ) : null}

            {/* 3. FEED — coluna travada na largura da tela (minmax(0, 1fr)). Com a
                coluna automática, um card largo (a prévia de comentário acima)
                alargava TODOS para 638 px num iPhone de 430: era o (b) da 7B. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14, marginTop: 14 }}>
              {loading ? (
                <LoadingFutty />
              ) : filtrados.length === 0 ? (
                <div className="empty-state" style={{ marginTop: 8 }}>
                  <div className="empty-state__emoji"><Icon name="resenha" size={40} /></div>
                  <p className="muted">Ainda não há jogos na resenha.</p>
                </div>
              ) : (
                filtrados.map((item, i) => {
                  const equipa = teams.find((t) => t.id === item.team_id);
                  const ehAdmin = equipa?.role === 'admin';
                  const slug = equipa?.slug || item.team_slug || null;
                  const inner =
                    item.kind === 'post' && item.tipo === 'anuncio' ? (
                      <AnuncioCard p={item} index={i} />
                    ) : item.kind === 'post' ? (
                      <PostCard
                        p={item}
                        podeApagar={item.author_id === meId || ehAdmin}
                        isAdmin={ehAdmin}
                        teamSlug={slug}
                        meId={meId}
                        onDelete={apagarPost}
                        onOpenImage={setImgFull}
                        onBloquear={bloquear}
                        index={i}
                      />
                    ) : (
                      <JogoCard j={item} isAdmin={ehAdmin} teamSlug={slug} onOpenImage={setImgFull} index={i} />
                    );
                  // P2-11: âncora de scroll + destaque dourado no post recém-criado.
                  const card = (
                    <div
                      key={`item-${item.kind}-${item.id}`}
                      id={`feed-item-${item.id}`}
                      className={item.kind === 'post' && item.id === novoPostId ? 'post-recem' : undefined}
                      style={{ minWidth: 0, maxWidth: '100%' }}
                    >
                      {inner}
                    </div>
                  );
                  // Anúncio nativo entre o 3º e o 4º item do feed.
                  if (i === 2) {
                    return (
                      <Fragment key={`feed-ad-${item.id}`}>
                        {card}
                        <AdCard variant="native" ad={adFeed} prontoExterno={adPronto} />
                      </Fragment>
                    );
                  }
                  return card;
                })
              )}
            </div>
          </>
        )}
      </main>

      {/* (O FAB e o sheet de Novo post morreram: o composer é inline no topo.
          Só o CropModal — dentro do UploadComCrop — e o fullscreen usam portal.) */}
      {imgFull
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Imagem"
              onClick={() => setImgFull(null)}
              style={{ position: 'fixed', inset: 0, zIndex: 150, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            >
              <img src={imgFull} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
