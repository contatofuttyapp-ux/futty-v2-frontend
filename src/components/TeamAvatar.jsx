// Futty v2.0 — Avatar da equipa: logo (se existir) ou iniciais sobre a cor de fundo.
import { assetUrl } from '../lib/api';
import { initials } from '../utils/teamColors';

const SIZES = { sm: 32, md: 48, lg: 64 };

export default function TeamAvatar({ team = {}, size = 'md' }) {
  const px = SIZES[size] || SIZES.md;
  const bg = team.cor_fundo || '#1a1a2e';
  const raw = team.logo_url || null;
  // URLs de preview (blob:/data:) passam intactas; relativas resolvem via assetUrl.
  const src = raw ? (raw.startsWith('blob:') || raw.startsWith('data:') ? raw : assetUrl(raw)) : null;

  return (
    <div
      style={{
        width: px,
        height: px,
        borderRadius: '50%',
        flexShrink: 0,
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
        background: bg,
        color: '#fff',
        fontWeight: 800,
        fontSize: Math.round(px * 0.4),
      }}
    >
      {src ? (
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        initials(team.nome) || '?'
      )}
    </div>
  );
}
