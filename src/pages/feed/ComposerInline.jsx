// Futty v2.0 — O campo de escrever um post, no topo da Resenha.

import { useEffect, useRef, useState } from 'react';
import { Camera, Link2 } from 'lucide-react';
import { apiFetch, assetUrl } from '../../lib/api';
import { urlImagem } from '../../utils/avatar';
import UploadComCrop from '../../components/UploadComCrop';
import { detectarVideoLink } from './videoLink';
import { FeedAvatar } from './pecas';
import { BORDA_VIDRO, iconBtn } from './comum';
import { VideoLinkCard } from './VideoLinkCard';

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

export { ComposerInline };
