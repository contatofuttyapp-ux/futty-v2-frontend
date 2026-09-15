// Futty v2.0 — Escudo da equipa (fallback sem logo): iniciais num escudo do cânone
// (chanfro 45°, borda na COR da equipa, véu vidro). Quando existir logo_url (backlog
// gated na Segurança), passa a mostrar a imagem. Tamanhos livres via `size`.
import { colorOf, initials } from '../utils/teamColors';
import { assetUrl } from '../lib/api';
import { urlImagem } from '../utils/avatar';

const CLIP = 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)';

export default function EscudoEquipa({ team = {}, size = 22 }) {
  const cor = colorOf(team.cor).hex;
  const ini = initials(team.nome) || '?';
  const raw = team.logo_url || null; // backlog: upload de logo (gated na Segurança)
  // Velocidade 6B: o escudo vive entre 20 e 52 px CSS — 128 cobre tudo em 2x.
  const src = raw ? (raw.startsWith('blob:') || raw.startsWith('data:') ? raw : urlImagem(assetUrl(raw), 128)) : null;
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        clipPath: CLIP,
        border: `1px solid ${cor}`,
        // véu vidro com um toque da tinta da equipa
        background: `linear-gradient(135deg, ${cor}26, rgba(255,255,255,0.04))`,
        color: '#fff',
        fontFamily: "'Rajdhani', sans-serif",
        fontWeight: 800,
        fontSize: Math.round(size * 0.42),
        lineHeight: 1,
        letterSpacing: '0.02em',
      }}
    >
      {src ? <img src={src} alt="" width={size} height={size} decoding="async" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : ini}
    </span>
  );
}
