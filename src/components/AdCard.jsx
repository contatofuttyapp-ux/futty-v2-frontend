// Futty v2.0 — Card de publicidade nativo (puramente frontend, sem backend).
// Variants: 'native' (feed/início) e 'banner' (fixo no sorteio).

const BASE = {
  position: 'relative',
  width: '100%',
  overflow: 'hidden',
  background: '#0d0d12',
  border: '1px solid rgba(212,160,23,0.06)',
  borderLeft: '2px solid rgba(212,160,23,0.3)',
};

export default function AdCard({ imageUrl, linkUrl = '#', label = 'Pub.', variant = 'native' }) {
  const box =
    variant === 'banner'
      ? { ...BASE, height: 72, borderRadius: 10, boxShadow: '0 -4px 20px rgba(0,0,0,0.6)' }
      : { ...BASE, height: 100, borderRadius: 8 };

  const conteudo = imageUrl ? (
    <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        border: '1px dashed rgba(212,160,23,0.12)',
        borderRadius: 'inherit',
      }}
    >
      <span style={{ fontSize: 22 }}>📢</span>
      <div>
        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, color: '#d4a017' }}>Parceiros Futty</div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>espaço publicitário</div>
      </div>
    </div>
  );

  const corpo = linkUrl ? (
    <a href={linkUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', height: '100%' }}>
      {conteudo}
    </a>
  ) : (
    conteudo
  );

  return (
    <div style={box}>
      {corpo}
      <span
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          fontSize: 8,
          color: 'rgba(255,255,255,0.2)',
          background: 'rgba(0,0,0,0.5)',
          padding: '2px 5px',
          borderRadius: '0 8px 0 4px',
        }}
      >
        {label}
      </span>
    </div>
  );
}
