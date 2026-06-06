// Futty v2.0 — PlayerCard: card premium do jogador (estilo FIFA), proporção 2:3.
// Usado em Início e Perfil. Nos outros locais mantém-se o PlayerAvatar simples.
import { useState } from 'react';
import { urlAsset, iniciaisNome, nomeJogador } from '../utils/avatar';

// Cores de uniforme (6) para o fundo das iniciais quando não há avatar.
const COR_HEX = {
  preto: '#1a1a1a',
  verde: '#00e5a0',
  azul: '#3b82f6',
  vermelho: '#ef4444',
  amarelo: '#f59e0b',
  cinzento: '#888888',
};

// Posições estáticas das faíscas (nada de Math.random no render).
const SPARKLES = [
  { left: '18%', top: '28%', cor: '#d4a017', delay: '0s' },
  { left: '72%', top: '18%', cor: '#00e5a0', delay: '0.4s' },
  { left: '42%', top: '52%', cor: '#d4a017', delay: '0.8s' },
  { left: '82%', top: '40%', cor: '#00e5a0', delay: '1.2s' },
  { left: '28%', top: '64%', cor: '#d4a017', delay: '1.6s' },
  { left: '60%', top: '70%', cor: '#00e5a0', delay: '2s' },
];

const KEYFRAMES = `
@keyframes pcSparkle { 0%,100% { opacity:0; transform:scale(0); } 50% { opacity:1; transform:scale(1); } }
@keyframes pcGlow { 0%,100% { opacity:0.7; } 50% { opacity:1; } }
`;

export default function PlayerCard({ jogador = {}, stats = {}, equipa = null }) {
  const [imgFalhou, setImgFalhou] = useState(false);

  const nome = nomeJogador(jogador);
  const avatarSrc = jogador?.avatar_url ? urlAsset(jogador.avatar_url) : null;
  const corBg = COR_HEX[jogador?.cor_preferida] || '#15151a';
  const nota = Number.isFinite(stats?.nota) ? Number(stats.nota).toFixed(1) : '--';
  const temAvatar = avatarSrc && !imgFalhou;

  return (
    <div
      aria-label={`Card de ${nome}${equipa?.nome ? ` · ${equipa.nome}` : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '2 / 3',
        borderRadius: 16,
        overflow: 'hidden',
        // Fallback de estádio (caso a imagem não carregue).
        background: 'radial-gradient(ellipse 120% 80% at 50% 0%, #1b2433, #0a0d14 70%, #05070b)',
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* 1. FUNDO DE ESTÁDIO */}
      <img
        src="/stadium_bg.png"
        alt=""
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* 2. EFEITOS DE LUZ — holofotes + faíscas */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(circle at 25% 0%, rgba(255,255,220,0.12), transparent 42%),' +
            'radial-gradient(circle at 75% 0%, rgba(255,255,220,0.12), transparent 42%)',
        }}
      />
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: s.cor,
            boxShadow: `0 0 6px ${s.cor}`,
            pointerEvents: 'none',
            animation: `pcSparkle 2.4s ease-in-out ${s.delay} infinite`,
          }}
        />
      ))}

      {/* 3. AVATAR DO JOGADOR */}
      {temAvatar ? (
        <img
          src={avatarSrc}
          alt=""
          onError={() => setImgFalhou(true)}
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '85%',
            height: '78%',
            objectFit: 'contain',
            objectPosition: 'top center',
            filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.9))',
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '70%',
            height: '60%',
            display: 'grid',
            placeItems: 'center',
            borderTopLeftRadius: '50%',
            borderTopRightRadius: '50%',
            background: `radial-gradient(circle at 50% 40%, ${corBg}, rgba(0,0,0,0.2))`,
            color: '#fff',
            fontWeight: 900,
            fontSize: 'clamp(28px, 14vw, 56px)',
            textShadow: '0 2px 10px rgba(0,0,0,0.7)',
          }}
        >
          {iniciaisNome(nome)}
        </div>
      )}

      {/* 4. GRADIENTE INFERIOR */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '35%',
          pointerEvents: 'none',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.88))',
        }}
      />

      {/* 5. NOME DO JOGADOR */}
      <div
        style={{
          position: 'absolute',
          left: 8,
          right: 8,
          bottom: 12,
          textAlign: 'center',
          textTransform: 'uppercase',
          fontWeight: 900,
          fontSize: 20,
          lineHeight: 1.1,
          color: '#fff',
          textShadow: '0 0 20px rgba(0,229,160,0.5)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {nome}
      </div>

      {/* 6. BADGE NOTA */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          border: '1px solid #d4a017',
          borderRadius: 8,
          padding: '4px 8px',
          textAlign: 'center',
          lineHeight: 1,
        }}
      >
        <div style={{ color: '#d4a017', fontSize: 18, fontWeight: 900 }}>{nota}</div>
        <div style={{ color: 'var(--text-dim)', fontSize: 7, fontWeight: 800, letterSpacing: '0.12em' }}>NOTA</div>
      </div>

      {/* 7. FRAME DOURADO (SVG por cima, sem interação) */}
      <svg
        viewBox="0 0 220 330"
        preserveAspectRatio="none"
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', animation: 'pcGlow 2.5s ease-in-out infinite' }}
      >
        <defs>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f0d060" />
            <stop offset="35%" stopColor="#d4a017" />
            <stop offset="70%" stopColor="#f5e070" />
            <stop offset="100%" stopColor="#b8860b" />
          </linearGradient>
        </defs>
        {/* Borda principal com cantos cortados */}
        <path
          d="M16,0 L0,16 L0,314 L16,330 L204,330 L220,314 L220,16 L204,0 Z"
          fill="none"
          stroke="url(#goldGrad)"
          strokeWidth="2"
        />
        {/* Borda interior mais fina */}
        <path
          d="M18,4 L4,18 L4,312 L18,326 L202,326 L216,312 L216,18 L202,4 Z"
          fill="none"
          stroke="#f5e070"
          strokeWidth="0.5"
          strokeOpacity="0.3"
        />
        {/* Linhas decorativas a meio (esquerda/direita) */}
        <line x1="0" y1="165" x2="16" y2="165" stroke="url(#goldGrad)" strokeWidth="1" />
        <line x1="204" y1="165" x2="220" y2="165" stroke="url(#goldGrad)" strokeWidth="1" />
        {/* Círculos dourados nos cantos */}
        {[
          [9, 9],
          [211, 9],
          [9, 321],
          [211, 321],
        ].map(([cx, cy]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r="3" fill="#d4a017" />
            <circle cx={cx} cy={cy} r="1.5" fill="#f5e070" />
          </g>
        ))}
      </svg>
    </div>
  );
}
