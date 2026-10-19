// Futty v2.0 — O vídeo de um link, embutido no post.

import { useState } from 'react';
import { ExternalLink, Music2, Play, Video } from 'lucide-react';

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

export { VideoLinkCard };
