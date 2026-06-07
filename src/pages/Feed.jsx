// Futty v2.0 — Resenha (/feed): feed social por equipa.
// Jogos passados com resultado + posts editoriais. Sem Topbar (título no conteúdo).
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Trophy, Eye, Share2 } from 'lucide-react';
import { apiFetch, assetUrl } from '../lib/api';
import AdCard from '../components/AdCard';
import { useAuth } from '../hooks/useAuth';
import { useTeams } from '../hooks/useTeam';
import { iniciaisNome } from '../utils/avatar';
import PlayerAvatar from '../components/PlayerAvatar';
import Reacoes from '../components/Reacoes';
import Comentarios from '../components/Comentarios';
import UploadComCrop from '../components/UploadComCrop';
import DenunciaModal from '../components/DenunciaModal';
import Toast from '../components/Toast';
import '../styles/app.css';

// Cores de acento (theme.js): neon, purple, warning (#f59e0b). O laranja da
// rodada de cerveja (#f97316) é o único valor explícito do briefing fora do theme.
const COR_ARTILHEIRO = '#7c3aed';
const COR_DESTAQUE = '#f59e0b';
const COR_RODADA = '#f97316';
const CARD = {
  borderRadius: 12,
  background: '#111111',
  border: '1px solid #222222',
  overflow: 'hidden',
};

// ─── Helpers de data ──────────────────────────────────────────────────────────
function dataExtensa(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' });
}
function horaDe(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
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

// ─── Avatar com glow colorido (artilheiro/destaque/rodada/autor) ───────────────
function FeedAvatar({ nome, avatarUrl, size = 48, glow = null }) {
  const [falhou, setFalhou] = useState(false);
  const src = avatarUrl ? assetUrl(avatarUrl) : null;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        overflow: 'hidden',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg-elev)',
        color: 'var(--text)',
        fontWeight: 800,
        fontSize: Math.round(size * 0.34),
        border: `1px solid ${glow || 'var(--border)'}`,
        boxShadow: glow ? `0 0 14px ${glow}55` : 'none',
      }}
    >
      {src && !falhou ? (
        <img src={src} alt="" onError={() => setFalhou(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        iniciaisNome(nome)
      )}
    </div>
  );
}

// ─── Bloco "prémio" (artilheiro / destaque) ────────────────────────────────────
function PremioRow({ glow, label, labelColor, nome, sub }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px', borderTop: '1px solid #222222' }}>
      <FeedAvatar nome={nome} avatarUrl={sub?.avatarUrl} size={64} glow={glow} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: labelColor, textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{ marginTop: 4, fontSize: 16, fontWeight: 800, color: '#fff' }}>
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

// ─── Card de JOGO ──────────────────────────────────────────────────────────────
function JogoCard({ j, isAdmin, teamSlug, onOpenImage, index = 0 }) {
  const [detalhes, setDetalhes] = useState(true);
  const [comentariosAbertos, setComentariosAbertos] = useState(false);
  const [contagem, setContagem] = useState(null);

  const campeao = timeCampeao(j);
  const jogadoresCampeao = campeao?.jogadores || [];
  const nomesCampeao = jogadoresCampeao.map((p) => p.nome).filter(Boolean).join(' · ');
  const foto = j.campeao_foto_url ? assetUrl(j.campeao_foto_url) : null;
  const rodadaFoto = j.rodada_foto_url ? assetUrl(j.rodada_foto_url) : null;

  async function partilhar() {
    const linhas = [
      `${dataExtensa(j.date)} · ${horaDe(j.date)}`,
      nomesCampeao ? `🏆 Time campeão: ${nomesCampeao}` : null,
      j.artilheiro_nome ? `⚽ Artilheiro: ${j.artilheiro_nome}${j.artilheiro_gols ? ` · ${j.artilheiro_gols} gols` : ''}` : null,
      j.destaque_nome ? `⭐ Destaque: ${j.destaque_nome}${j.destaque_titulo ? ` – ${j.destaque_titulo}` : ''}` : null,
      j.rodada_nome ? `🍺 Pagou rodada: ${j.rodada_nome}` : null,
    ].filter(Boolean);
    try {
      if (navigator.share) await navigator.share({ title: 'Futty', text: linhas.join('\n') });
    } catch {
      // partilha cancelada/indisponível
    }
  }

  return (
    <div className="anim-slide-in" style={{ ...CARD, animationDelay: `${index * 0.06}s` }}>
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
          <button type="button" aria-label="Partilhar" onClick={partilhar} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex' }}>
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
              <img src={foto} alt="" style={{ width: '100%', maxHeight: 420, objectFit: 'cover', display: 'block' }} />
            </button>
          ) : null}

          {/* C) TIME CAMPEÃO */}
          {jogadoresCampeao.length ? (
            <div
              style={{
                padding: 14,
                borderTop: '1px solid #222222',
                background: foto ? 'transparent' : 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(124,58,237,0.08))',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--neon)', textTransform: 'uppercase' }}>
                🏆 Time campeão
              </div>
              <div style={{ marginTop: 8, fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.45 }}>{nomesCampeao}</div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {jogadoresCampeao.map((p) => (
                  <div key={p.user_id || p.nome} style={{ flexShrink: 0 }}>
                    <PlayerAvatar nome={p.nome} avatarUrl={p.avatar_url} glow />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* D) ARTILHEIRO */}
          {j.artilheiro_user_id ? (
            <PremioRow
              glow={COR_ARTILHEIRO}
              label="⚽ Artilheiro do dia"
              labelColor={COR_ARTILHEIRO}
              nome={j.artilheiro_nome || 'Artilheiro'}
              sub={{ avatarUrl: j.artilheiro_avatar_url, gols: j.artilheiro_gols }}
            />
          ) : null}

          {/* E) DESTAQUE */}
          {j.destaque_user_id ? (
            <PremioRow
              glow={COR_DESTAQUE}
              label="⭐ Destaque do dia"
              labelColor={COR_DESTAQUE}
              nome={j.destaque_nome || 'Destaque'}
              sub={{ avatarUrl: j.destaque_avatar_url, titulo: j.destaque_titulo }}
            />
          ) : null}

          {/* F) PAGOU RODADA DE CERVEJA */}
          {j.rodada_user_id ? (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 14, borderTop: '1px solid #222222', background: 'rgba(249,115,22,0.06)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, maxWidth: 120 }}>
                <FeedAvatar nome={j.rodada_nome} avatarUrl={j.rodada_avatar_url} size={56} glow={COR_RODADA} />
                <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', textAlign: 'center' }}>{j.rodada_nome}</div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: COR_RODADA, textTransform: 'uppercase', textAlign: 'center' }}>
                  🍺 Pagou rodada de cerveja 🍺
                </div>
              </div>
              {rodadaFoto ? (
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/\.(mp4|webm|mov)$/i.test(rodadaFoto) ? (
                    <video src={rodadaFoto} autoPlay loop muted playsInline style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 12, display: 'block' }} />
                  ) : (
                    <button type="button" onClick={() => onOpenImage(rodadaFoto)} style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'zoom-in', display: 'block', width: '100%' }}>
                      <img src={rodadaFoto} alt="" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 12, display: 'block' }} />
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {/* G) REAÇÕES */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid #222222' }}>
        <Reacoes targetType="game" targetId={j.id} contagemInicial={j.contagem_reacoes} minhaReacaoInicial={j.minha_reacao} compacto />
      </div>

      {/* H) COMENTÁRIOS */}
      <div style={{ padding: '0 14px 12px' }}>
        <button type="button" onClick={() => setComentariosAbertos((v) => !v)} style={linkBtn}>
          {comentariosAbertos ? 'Esconder comentários' : `Ver comentários${contagem != null ? ` (${contagem})` : ''}`}
        </button>
        <Comentarios parentType="game" parentId={j.id} visivel={comentariosAbertos} isAdmin={isAdmin} teamSlug={teamSlug} onCount={setContagem} />
      </div>
    </div>
  );
}

// ─── Card de POST editorial ────────────────────────────────────────────────────
function PostCard({ p, podeApagar, isAdmin, teamSlug, meId, onDelete, onOpenImage, index = 0 }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [comentariosAbertos, setComentariosAbertos] = useState(false);
  const [contagem, setContagem] = useState(null);
  const [denunciaAberta, setDenunciaAberta] = useState(false);
  const [toast, setToast] = useState(null);
  const media = Array.isArray(p.media) ? p.media : [];
  const podeDenunciar = p.author_id !== meId;

  return (
    <div className="anim-slide-in" style={{ ...CARD, animationDelay: `${index * 0.06}s` }}>
      {/* A) HEADER */}
      <div style={{ padding: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <FeedAvatar nome={p.author_nome} avatarUrl={p.author_avatar_url} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>{p.author_nome || 'Membro'}</span>
            {p.team_name ? (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#b69cff', background: 'rgba(124,58,237,0.18)', border: '1px solid var(--purple)', borderRadius: 999, padding: '2px 8px' }}>
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
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, minWidth: 150, background: '#0c0c0c', border: '1px solid #222222', borderRadius: 10, overflow: 'hidden', zIndex: 5 }}>
                {podeDenunciar ? (
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
                    Apagar
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* B) CORPO */}
      {p.body ? (
        <div style={{ padding: '0 14px 12px', whiteSpace: 'pre-wrap', color: '#fff', fontSize: 14, lineHeight: 1.5 }}>{p.body}</div>
      ) : null}
      {media.length ? (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 14px 12px' }}>
          {media.map((m, ix) => {
            const url = assetUrl(m.url);
            return (
              <div key={`${m.url}-${ix}`} style={{ flexShrink: 0, borderRadius: 10, overflow: 'hidden' }}>
                {m.media_type === 'video' ? (
                  <video src={url} controls style={{ width: 240, maxHeight: 220, display: 'block', background: '#000' }} />
                ) : (
                  <button type="button" onClick={() => onOpenImage(url)} style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'zoom-in', display: 'block' }}>
                    <img src={url} alt="" style={{ width: 240, maxHeight: 220, objectFit: 'cover', display: 'block' }} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* C) REAÇÕES */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid #222222' }}>
        <Reacoes targetType="post" targetId={p.id} contagemInicial={p.contagem_reacoes} minhaReacaoInicial={p.minha_reacao} compacto />
      </div>

      {/* D) COMENTÁRIOS */}
      <div style={{ padding: '0 14px 12px' }}>
        <button type="button" onClick={() => setComentariosAbertos((v) => !v)} style={linkBtn}>
          {comentariosAbertos ? 'Esconder comentários' : `Ver comentários${contagem != null ? ` (${contagem})` : ''}`}
        </button>
        <Comentarios parentType="post" parentId={p.id} visivel={comentariosAbertos} isAdmin={isAdmin} teamSlug={teamSlug} onCount={setContagem} />
      </div>

      {/* Denúncia do post + toast */}
      {denunciaAberta ? (
        <DenunciaModal
          targetType="post"
          targetId={p.id}
          onClose={() => setDenunciaAberta(false)}
          onResult={(r) => setToast({ tipo: r.tipo, mensagem: r.mensagem })}
        />
      ) : null}
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}

      {/* Modal de confirmação de apagar */}
      {confirmar ? (
        <div className="modal-overlay" role="presentation" onClick={() => setConfirmar(false)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__inner">
              <p style={{ fontSize: 15, marginBottom: 16 }}>Tens a certeza que queres apagar este post?</p>
              <button
                type="button"
                className="btn btn--primary"
                style={{ width: '100%', background: 'var(--danger)', color: '#fff' }}
                onClick={() => {
                  setConfirmar(false);
                  onDelete(p.id);
                }}
              >
                Apagar
              </button>
              <button type="button" className="btn btn--ghost btn--sm" style={{ width: '100%', marginTop: 10 }} onClick={() => setConfirmar(false)}>
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
function NovoPostForm({ teams, onClose, onCreated }) {
  const [teamId, setTeamId] = useState(teams[0]?.id || '');
  const [texto, setTexto] = useState('');
  const [media, setMedia] = useState([]); // { url, media_type }
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');

  function addMedia(url, mediaType) {
    setMedia((m) => (m.length >= 4 ? m : [...m, { url, media_type: mediaType }]));
  }
  function removeMedia(i) {
    setMedia((m) => m.filter((_, ix) => ix !== i));
  }

  async function publicar() {
    if (busy) return;
    if (!teamId) {
      setErro('Escolhe uma equipa.');
      return;
    }
    if (!texto.trim() && media.length === 0) {
      setErro('Escreve algo ou adiciona média.');
      return;
    }
    setBusy(true);
    setErro('');
    try {
      const res = await apiFetch('/api/feed/posts', {
        method: 'POST',
        body: JSON.stringify({
          team_id: teamId,
          body: texto.trim(),
          media: media.map((m, i) => ({ url: m.url, media_type: m.media_type, position: i })),
        }),
      });
      onCreated(res.post);
      onClose();
    } catch (err) {
      setErro(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Novo post"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 560, background: '#101012', borderTopLeftRadius: 18, borderTopRightRadius: 18, border: '1px solid #222222', padding: 16, display: 'grid', gap: 12, maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Novo post</h2>
          <button type="button" aria-label="Fechar" onClick={onClose} style={iconBtn}>
            ✕
          </button>
        </div>

        {teams.length > 1 ? (
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #222222', background: '#0c0c0c', color: '#fff', fontSize: 14 }}
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
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, 2000))}
            placeholder="Escreve a tua resenha…"
            rows={4}
            style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 10, border: '1px solid #222222', background: '#0c0c0c', color: '#fff', fontSize: 14, resize: 'vertical' }}
          />
          <div style={{ position: 'absolute', right: 10, bottom: 8, fontSize: 11, color: 'var(--text-dim)' }}>{texto.length}/2000</div>
        </div>

        {/* Média (máx 4) */}
        {media.length ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {media.map((m, ix) => (
              <div key={`${m.url}-${ix}`} style={{ position: 'relative', width: 80, height: 80, borderRadius: 10, overflow: 'hidden', border: '1px solid #222222' }}>
                {m.media_type === 'video' ? (
                  <video src={assetUrl(m.url)} style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }} />
                ) : (
                  <img src={assetUrl(m.url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

        {media.length < 4 ? <UploadComCrop onUpload={addMedia} aspect={1} accept="image/*,video/mp4" /> : null}

        {erro ? <div style={{ fontSize: 13, color: 'var(--danger)' }}>{erro}</div> : null}

        <button type="button" className="btn btn--primary" style={{ width: '100%' }} disabled={busy} onClick={publicar}>
          {busy ? 'A publicar…' : 'Publicar'}
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton de loading ───────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ ...CARD, padding: 14 }}>
      <div style={{ height: 14, width: '50%', background: '#1a1a1a', borderRadius: 6 }} />
      <div style={{ height: 12, width: '35%', background: '#161616', borderRadius: 6, marginTop: 10 }} />
      <div style={{ height: 180, background: '#161616', borderRadius: 8, marginTop: 14 }} />
    </div>
  );
}

// Estilos partilhados de botões pequenos.
const iconBtn = {
  width: 34,
  height: 34,
  borderRadius: 10,
  border: '1px solid #222222',
  background: 'rgba(0,0,0,0.25)',
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
  const { user } = useAuth();
  const { teams } = useTeams();

  const [items, setItems] = useState(null); // null = a carregar
  const [erro, setErro] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [imgFull, setImgFull] = useState(null);
  const [formAberto, setFormAberto] = useState(false);

  // Carrega o feed uma vez; o filtro por chip é local (sem nova chamada).
  useEffect(() => {
    let ativo = true;
    apiFetch('/api/feed')
      .then((d) => ativo && setItems(d.items || []))
      .catch((err) => ativo && setErro(err.message));
    return () => {
      ativo = false;
    };
  }, []);

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
  }

  const loading = items === null;
  const meId = user?.id;

  return (
    <div className="app-shell">
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
        {/* 1. CABEÇALHO */}
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontWeight: 800, fontSize: 24, color: '#fff', margin: '4px 0 10px' }}>
          <Trophy className="trophy-entrance" size={22} strokeWidth={2} color="#d4a017" />
          Resenha
        </h1>
        <div className="app-topbar__line" style={{ marginBottom: 6 }} />

        {/* 2. CHIPS DE EQUIPA */}
        <div className="chips-row">
          <button type="button" className={`chip ${selectedTeam === 'all' ? 'chip--active' : ''}`} onClick={() => setSelectedTeam('all')}>
            Todas
          </button>
          {teams.map((t) => (
            <button key={t.id} type="button" className={`chip ${selectedTeam === t.id ? 'chip--active' : ''}`} onClick={() => setSelectedTeam(t.id)}>
              {t.nome}
            </button>
          ))}
        </div>

        {erro ? <div className="alert alert--error" style={{ marginTop: 12 }}>{erro}</div> : null}

        {/* 3. FEED */}
        <div style={{ display: 'grid', gap: 14, marginTop: 14 }}>
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : filtrados.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 8 }}>
              <div className="empty-state__emoji">📰</div>
              <p className="muted">Ainda não há jogos na resenha.</p>
            </div>
          ) : (
            filtrados.map((item, i) => {
              const equipa = teams.find((t) => t.id === item.team_id);
              const ehAdmin = equipa?.role === 'admin';
              const slug = equipa?.slug || item.team_slug || null;
              const card =
                item.kind === 'post' ? (
                  <PostCard
                    key={`post-${item.id}`}
                    p={item}
                    podeApagar={item.author_id === meId || ehAdmin}
                    isAdmin={ehAdmin}
                    teamSlug={slug}
                    meId={meId}
                    onDelete={apagarPost}
                    onOpenImage={setImgFull}
                    index={i}
                  />
                ) : (
                  <JogoCard key={`jogo-${item.id}`} j={item} isAdmin={ehAdmin} teamSlug={slug} onOpenImage={setImgFull} index={i} />
                );
              // Anúncio nativo entre o 3º e o 4º item do feed.
              if (i === 2) {
                return (
                  <Fragment key={`feed-ad-${item.id}`}>
                    {card}
                    <AdCard variant="native" />
                  </Fragment>
                );
              }
              return card;
            })
          )}
        </div>
      </main>

      {/* Botão flutuante "+" (só para quem pode publicar) */}
      {podeCriar ? (
        <button
          type="button"
          aria-label="Novo post"
          onClick={() => setFormAberto(true)}
          style={{
            position: 'fixed',
            right: 16,
            bottom: 84,
            zIndex: 90,
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: 'none',
            background: 'var(--neon)',
            color: '#04140d',
            fontSize: 28,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 8px 24px -6px rgba(139,92,246,0.7)',
          }}
        >
          ＋
        </button>
      ) : null}

      {formAberto ? <NovoPostForm teams={equipasParaPostar} onClose={() => setFormAberto(false)} onCreated={aoCriarPost} /> : null}

      {/* Modal de imagem fullscreen */}
      {imgFull ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Imagem"
          onClick={() => setImgFull(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 150, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <img src={imgFull} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
      ) : null}
    </div>
  );
}
