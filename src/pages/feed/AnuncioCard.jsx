// Futty v2.0 — O cartão de anúncio na Resenha.

import { haQuantoTempo } from '../../utils/haQuantoTempo';
import Icon from '../../components/Icon';
import { CLIP_CARD } from './comum';
import { FeedAvatar } from './pecas';

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

export { AnuncioCard };
