// Futty v2.0 — As peças pequenas dos cartões da Resenha: o link da vitrine, o avatar, a linha do prêmio e o resumo dos comentários.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { assetUrl } from '../../lib/api';
import { urlImagem } from '../../utils/avatar';
import { contar } from '../../utils/plural';
import SilhuetaJogador from '../../components/SilhuetaJogador';
import { apoioForte, linkBtn } from './comum';

// Envolve o que estiver dentro num link para a vitrine do jogador.
// Sem `teamSlug` ou sem `userId` não há rota possível: devolve o conteúdo cru,
// sem link. É o mesmo destino que o avatar do Ranking já abre.
function LinkVitrine({ teamSlug, userId, style, children }) {
  if (!teamSlug || !userId) return <span style={style}>{children}</span>;
  return (
    <Link to={`/time/${teamSlug}/jogador/${userId}`} style={style} aria-label="Ver a vitrine deste jogador">
      {children}
    </Link>
  );
}

// ─── Avatar — moldura V1 do cânone (.avatar-frame), única na página ────────────
function FeedAvatar({ avatarUrl, size = 48 }) {
  const [falhou, setFalhou] = useState(false);
  const src = avatarUrl ? urlImagem(assetUrl(avatarUrl), 128, { quadrado: true }) : null;
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
          {sub?.gols ? <span style={apoioForte}> · {contar(sub.gols, 'gol', 'gols')}</span> : null}
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

export { ComentariosResumo, FeedAvatar, LinkVitrine, PremioRow };
