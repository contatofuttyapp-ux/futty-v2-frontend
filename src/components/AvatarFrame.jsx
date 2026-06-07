// Futty v2.0 — Moldura de avatar com 4 cantos em L dourados.
// L alongado (~30% do lado) e fino (2px); glow via drop-shadow (segue a forma
// em L, sem halo quadrado). Respiração lenta e desencontrada (cornerBreath),
// um delay por avatar — calmo, não "árvore de Natal". Usar em avatares >= 48px.
const OURO = '#d4a017';

export default function AvatarFrame({ children, size = 48, active = true, dur = '4.5s', delay = '0s', className }) {
  // Traço do L ~30% do lado da caixa (mantém-se fino a 2px).
  const cornerSize = Math.round(size * 0.3);

  // Todos os 4 cantos partilham o mesmo delay (respiram juntos, por avatar).
  const canto = (extra) => ({
    position: 'absolute',
    width: cornerSize,
    height: cornerSize,
    pointerEvents: 'none',
    zIndex: 2,
    filter: `drop-shadow(0 0 3px ${OURO})`,
    ...(active
      ? { animation: `cornerBreath ${dur} ease-in-out ${delay} infinite`, willChange: 'opacity' }
      : { opacity: 0.5 }),
    ...extra,
  });

  return (
    <div className={className} style={{ position: 'relative', display: 'inline-block', borderRadius: 6 }}>
      {children}
      <div className="avatar-corner" style={canto({ top: -2, left: -2, borderTop: `2px solid ${OURO}`, borderLeft: `2px solid ${OURO}`, borderRadius: '2px 0 0 0' })} />
      <div className="avatar-corner" style={canto({ top: -2, right: -2, borderTop: `2px solid ${OURO}`, borderRight: `2px solid ${OURO}`, borderRadius: '0 2px 0 0' })} />
      <div className="avatar-corner" style={canto({ bottom: -2, right: -2, borderBottom: `2px solid ${OURO}`, borderRight: `2px solid ${OURO}`, borderRadius: '0 0 2px 0' })} />
      <div className="avatar-corner" style={canto({ bottom: -2, left: -2, borderBottom: `2px solid ${OURO}`, borderLeft: `2px solid ${OURO}`, borderRadius: '0 0 0 2px' })} />
    </div>
  );
}
