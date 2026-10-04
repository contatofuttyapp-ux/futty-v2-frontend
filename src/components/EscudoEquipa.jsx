// Futty v2.0 — O escudo do time. Com logo, o logo; sem logo, as iniciais sobre o escudo que o admin escolheu (Rodada 29I, bloco 3):
// cor principal + segunda cor + padrão, da paleta fixa — utils/escudo.js. O desenho é o das bancadas aprovadas pelo dono
// (DESIGN/escudo-cores.html e escudo-padroes.html): círculo, anel claro de 1,5 px, sombra curta, iniciais 800 com sombra. Legível em
// 84, 36 e 20 px. Tamanhos livres via `size`.
// Rodada 29T (achado 160): o logo que não carrega (endereço quebrado, foto apagada) cai nas iniciais — o escudo nunca fica vazio.
import { useState } from 'react';
import { initials } from '../utils/teamColors';
import { camadasDoEscudo, letraDoEscudo } from '../utils/escudo';
import { assetUrl } from '../lib/api';
import { urlImagem } from '../utils/avatar';

const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export default function EscudoEquipa({ team = {}, size = 22 }) {
  const ini = initials(team.nome) || '?';
  const raw = team.logo_url || null;
  // Velocidade 6B: o escudo vive entre 20 e 84 px CSS — 192 cobre tudo em 2x.
  const srcDoLogo = raw ? (raw.startsWith('blob:') || raw.startsWith('data:') ? raw : urlImagem(assetUrl(raw), size > 64 ? 192 : 128)) : null;
  // O endereço que falhou fica guardado: um logo novo (outro endereço) volta a ser tentado, sem efeito nem reinício de estado.
  const [logoQuebrado, setLogoQuebrado] = useState(null);
  const src = srcDoLogo && logoQuebrado !== srcDoLogo ? srcDoLogo : null;
  const { fundo, camada } = camadasDoEscudo(team);
  return (
    <span
      aria-hidden
      data-escudo={src ? 'logo' : team.escudo_padrao || 'solido'}
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        borderRadius: '50%',
        overflow: 'hidden',
        background: src ? '#0c0c10' : fundo,
        boxShadow: '0 0 0 1.5px rgba(255,255,255,.14), 0 2px 8px rgba(0,0,0,.5)',
        color: '#fff',
        fontFamily: SANS,
        fontWeight: 800,
        fontSize: letraDoEscudo(size),
        lineHeight: 1,
        letterSpacing: '.03em',
      }}
    >
      {/* minWidth/minHeight 0: item de grid — ver a nota em .pavatar img (app.css). */}
      {src ? (
        <img src={src} alt="" decoding="async" onError={() => setLogoQuebrado(src)} style={{ display: 'block', width: '100%', height: '100%', minWidth: 0, minHeight: 0, objectFit: 'cover' }} />
      ) : (
        <>
          {camada ? <i style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'block', background: camada }} /> : null}
          <span style={{ position: 'relative', zIndex: 3, textShadow: '0 1px 3px rgba(0,0,0,.55)' }}>{ini}</span>
        </>
      )}
    </span>
  );
}
