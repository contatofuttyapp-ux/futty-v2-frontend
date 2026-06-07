// Futty v2.0 — Moldura de avatar com 4 cantos em L dourados (animados).
// Usar só em avatares >= 48px. active=false → cantos estáticos mais subtis.
export default function AvatarFrame({ children, size = 48, active = true, dur = '2s', className }) {
  const cornerSize = size >= 56 ? 12 : 10;
  const canto = (extra, delay) => ({
    position: 'absolute',
    width: cornerSize,
    height: cornerSize,
    pointerEvents: 'none',
    zIndex: 2,
    ...(active ? { animation: `cornerSnake ${dur} ease-in-out ${delay} infinite` } : { opacity: 0.4 }),
    ...extra,
  });

  return (
    <div className={className} style={{ position: 'relative', display: 'inline-block', borderRadius: 6 }}>
      {children}
      <div style={canto({ top: -2, left: -2, borderTop: '2px solid #d4a017', borderLeft: '2px solid #d4a017', borderRadius: '2px 0 0 0' }, '0s')} />
      <div style={canto({ top: -2, right: -2, borderTop: '2px solid #d4a017', borderRight: '2px solid #d4a017', borderRadius: '0 2px 0 0' }, '0.5s')} />
      <div style={canto({ bottom: -2, left: -2, borderBottom: '2px solid #d4a017', borderLeft: '2px solid #d4a017', borderRadius: '0 0 0 2px' }, '1s')} />
      <div style={canto({ bottom: -2, right: -2, borderBottom: '2px solid #d4a017', borderRight: '2px solid #d4a017', borderRadius: '0 0 2px 0' }, '1.5s')} />
    </div>
  );
}
