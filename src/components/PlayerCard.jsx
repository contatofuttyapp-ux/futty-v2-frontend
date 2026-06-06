// Futty v2.0 — PlayerCard: card premium do jogador (estilo FIFA UT + luxo).
// Tudo em CSS puro (zero libs). Usado em Início, Perfil e Figurinha.
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

// 12 partículas flutuantes (posições/durações fixas — sem Math.random).
const PARTICULAS = [
  { left: '12%', top: '70%', size: 3, cor: '#d4a017', dur: '3.2s', delay: '0s' },
  { left: '24%', top: '55%', size: 2, cor: '#00e5a0', dur: '4s', delay: '0.6s' },
  { left: '38%', top: '80%', size: 4, cor: '#ffffff', dur: '2.6s', delay: '1.1s' },
  { left: '50%', top: '62%', size: 2, cor: '#d4a017', dur: '3.6s', delay: '0.3s' },
  { left: '63%', top: '74%', size: 3, cor: '#00e5a0', dur: '4.4s', delay: '1.5s' },
  { left: '78%', top: '58%', size: 2, cor: '#ffffff', dur: '3s', delay: '0.9s' },
  { left: '86%', top: '72%', size: 4, cor: '#d4a017', dur: '5s', delay: '2s' },
  { left: '18%', top: '40%', size: 2, cor: '#00e5a0', dur: '3.4s', delay: '1.8s' },
  { left: '44%', top: '34%', size: 3, cor: '#ffffff', dur: '4.2s', delay: '0.2s' },
  { left: '70%', top: '42%', size: 2, cor: '#d4a017', dur: '2.8s', delay: '1.3s' },
  { left: '32%', top: '24%', size: 2, cor: '#00e5a0', dur: '3.8s', delay: '2.4s' },
  { left: '58%', top: '20%', size: 3, cor: '#ffffff', dur: '4.6s', delay: '0.7s' },
];

// 6 estrelinhas à volta do nome.
const ESTRELAS = [
  { left: '20%', bottom: '70px', dur: '2.4s', delay: '0s' },
  { left: '34%', bottom: '84px', dur: '3s', delay: '0.5s' },
  { left: '48%', bottom: '90px', dur: '2.6s', delay: '1s' },
  { left: '60%', bottom: '84px', dur: '3.2s', delay: '0.3s' },
  { left: '74%', bottom: '72px', dur: '2.8s', delay: '0.8s' },
  { left: '84%', bottom: '64px', dur: '3.4s', delay: '1.4s' },
];

const KEYFRAMES = `
@keyframes pcFloat { 0% { transform: translateY(0) scale(1); opacity: 0; } 20% { opacity: 1; } 80% { opacity: 0.8; } 100% { transform: translateY(-24px) scale(0.5); opacity: 0; } }
@keyframes pcShine { 0% { transform: translateY(-100%) skewY(-5deg); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(200%) skewY(-5deg); opacity: 0; } }
@keyframes pcNamePulse { from { text-shadow: 0 0 10px rgba(0,229,160,0.6), 0 0 20px rgba(0,229,160,0.3); } to { text-shadow: 0 0 16px rgba(0,229,160,1), 0 0 32px rgba(0,229,160,0.6), 0 0 48px rgba(0,229,160,0.2); } }
@keyframes pcStarTwinkle { 0%, 100% { opacity: 0; transform: scale(0.5); } 50% { opacity: 1; transform: scale(1.2); } }
@keyframes pcScanLine { from { transform: translateY(0); } to { transform: translateY(100%); } }
@keyframes pcGlow { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
@keyframes pcBadgePulse { 0%, 100% { box-shadow: 0 0 6px rgba(212,160,23,0.4); } 50% { box-shadow: 0 0 14px rgba(212,160,23,0.8); } }
`;

export default function PlayerCard({ jogador = {}, stats = {}, equipa = null, fundo = 'stadium', corFrame = '#d4a017', mostrarStats = false }) {
  const [imgFalhou, setImgFalhou] = useState(false);

  const nome = nomeJogador(jogador);
  const avatarSrc = jogador?.avatar_url ? urlAsset(jogador.avatar_url) : null;
  const corBg = COR_HEX[jogador?.cor_preferida] || '#15151a';
  const nota = Number.isFinite(stats?.nota) ? Number(stats.nota).toFixed(1) : '--';
  const temAvatar = avatarSrc && !imgFalhou;

  // Frame: o dourado usa o gradiente; outras cores são sólidas.
  const ehDourado = corFrame === '#d4a017';
  const strokeRef = ehDourado ? 'url(#goldGrad)' : corFrame;
  const dotOuter = ehDourado ? '#d4a017' : corFrame;
  const dotInner = ehDourado ? '#f5e070' : '#ffffff';
  const fundoCss =
    fundo === 'preto'
      ? '#000000'
      : fundo === 'blur'
        ? 'radial-gradient(ellipse 90% 70% at 50% 45%, #0c3a26, #061410 55%, #000 100%)'
        : 'radial-gradient(ellipse 120% 80% at 50% 0%, #1b2433, #0a0d14 70%, #05070b)';

  return (
    <div
      aria-label={`Card de ${nome}${equipa?.nome ? ` · ${equipa.nome}` : ''}`}
      style={{ position: 'relative', width: '100%', aspectRatio: '2 / 3', borderRadius: 16, overflow: 'hidden', background: fundoCss }}
    >
      <style>{KEYFRAMES}</style>

      {/* z0 — FUNDO DE ESTÁDIO (só na opção estádio) */}
      {fundo === 'stadium' ? (
        <img
          src="/stadium_bg.png"
          alt=""
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
          style={{ position: 'absolute', inset: 0, zIndex: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : null}

      {/* z1 — holofotes + vinheta (profundidade) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background:
            'radial-gradient(circle at 25% 0%, rgba(255,255,220,0.12), transparent 42%),' +
            'radial-gradient(circle at 75% 0%, rgba(255,255,220,0.12), transparent 42%)',
        }}
      />
      <div
        style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)' }}
      />

      {/* z2 — PARTÍCULAS FLUTUANTES */}
      {PARTICULAS.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            zIndex: 2,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.cor,
            boxShadow: `0 0 ${p.size * 2}px ${p.cor}`,
            pointerEvents: 'none',
            willChange: 'transform, opacity',
            animation: `pcFloat ${p.dur} ease-in-out ${p.delay} infinite`,
          }}
        />
      ))}

      {/* z3 — AVATAR DO JOGADOR */}
      {temAvatar ? (
        <img
          src={avatarSrc}
          alt=""
          onError={() => setImgFalhou(true)}
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            zIndex: 3,
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
            zIndex: 3,
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

      {/* z4 — REFLEXO DE LUZ (holográfico) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            left: '-50%',
            top: 0,
            width: '200%',
            height: '60%',
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.08), transparent)',
            willChange: 'transform, opacity',
            animation: 'pcShine 3s ease-in-out 6s infinite',
          }}
        />
      </div>

      {/* z5 — GRADIENTE INFERIOR */}
      <div
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 5, height: '35%', pointerEvents: 'none', background: 'linear-gradient(transparent, rgba(0,0,0,0.88))' }}
      />

      {/* z6 — ESTRELINHAS à volta do nome */}
      {ESTRELAS.map((s, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            position: 'absolute',
            left: s.left,
            bottom: s.bottom,
            zIndex: 6,
            fontSize: 8,
            color: '#d4a017',
            lineHeight: 1,
            pointerEvents: 'none',
            willChange: 'transform, opacity',
            animation: `pcStarTwinkle ${s.dur} ease-in-out ${s.delay} infinite`,
          }}
        >
          ✦
        </span>
      ))}

      {/* z6 — NOME DO JOGADOR (+ stats opcionais) */}
      <div style={{ position: 'absolute', left: 8, right: 8, bottom: 12, zIndex: 6, textAlign: 'center' }}>
        <div
          style={{
            textTransform: 'uppercase',
            fontWeight: 900,
            fontSize: 24,
            letterSpacing: '0.16em',
            lineHeight: 1.1,
            color: '#fff',
            textShadow: '0 0 10px rgba(0,229,160,0.8), 0 0 20px rgba(0,229,160,0.4), 0 0 40px rgba(0,229,160,0.2)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            animation: 'pcNamePulse 3s ease-in-out infinite alternate',
          }}
        >
          {nome}
        </div>
        {mostrarStats ? (
          <div style={{ marginTop: 4, display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>
            <span style={{ color: '#d4a017' }}>{nota}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{stats?.jogos ?? 0}J</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{stats?.gols ?? 0}G</span>
          </div>
        ) : null}
      </div>

      {/* z7 — BADGE NOTA */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 7,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          border: '1px solid #d4a017',
          borderRadius: 8,
          padding: '4px 8px',
          textAlign: 'center',
          lineHeight: 1,
          boxShadow: '0 0 8px rgba(212,160,23,0.5)',
          animation: 'pcBadgePulse 2s ease-in-out infinite',
        }}
      >
        <div style={{ color: '#d4a017', fontSize: 20, fontWeight: 900 }}>{nota}</div>
        <div style={{ color: 'var(--text-dim)', fontSize: 7, fontWeight: 800, letterSpacing: '0.12em' }}>NOTA</div>
      </div>

      {/* z8 — LINHA DE SCAN (desce pelo frame) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: '100%',
            background: `linear-gradient(to bottom, ${corFrame} 0, ${corFrame} 1.5px, transparent 1.5px)`,
            opacity: 0.4,
            willChange: 'transform',
            animation: 'pcScanLine 2s linear infinite',
          }}
        />
      </div>

      {/* z8 — FRAME DOURADO (SVG com glow) */}
      <svg
        viewBox="0 0 220 330"
        preserveAspectRatio="none"
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 8,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          filter: `drop-shadow(0 0 8px ${corFrame}99) drop-shadow(0 0 20px ${corFrame}4d)`,
          willChange: 'opacity',
          animation: 'pcGlow 2.5s ease-in-out infinite',
        }}
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
        <path d="M16,0 L0,16 L0,314 L16,330 L204,330 L220,314 L220,16 L204,0 Z" fill="none" stroke={strokeRef} strokeWidth="2" />
        {/* Borda interior mais fina */}
        <path d="M18,4 L4,18 L4,312 L18,326 L202,326 L216,312 L216,18 L202,4 Z" fill="none" stroke={dotInner} strokeWidth="0.5" strokeOpacity="0.3" />
        {/* Linhas decorativas a meio (esquerda/direita) */}
        <line x1="0" y1="165" x2="16" y2="165" stroke={strokeRef} strokeWidth="1" />
        <line x1="204" y1="165" x2="220" y2="165" stroke={strokeRef} strokeWidth="1" />
        {/* Círculos nos cantos */}
        {[
          [9, 9],
          [211, 9],
          [9, 321],
          [211, 321],
        ].map(([cx, cy]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r="3" fill={dotOuter} />
            <circle cx={cx} cy={cy} r="1.5" fill={dotInner} />
          </g>
        ))}
      </svg>
    </div>
  );
}
