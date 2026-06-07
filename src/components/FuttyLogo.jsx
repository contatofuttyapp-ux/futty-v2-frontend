// Futty v2.0 — Marca "FUT." unificada (texto + ícone opcional).
import { Link } from 'react-router-dom';

const SIZES = {
  sm: { icon: 18, text: 16 },
  md: { icon: 24, text: 20 },
  lg: { icon: 36, text: 32 },
};

export default function FuttyLogo({ size = 'md', showIcon = false, linkTo = null }) {
  const s = SIZES[size] || SIZES.md;

  const conteudo = (
    <>
      {showIcon ? (
        <img src="/icons/icon-192.png" width={s.icon} height={s.icon} alt="" style={{ borderRadius: 6, marginRight: 6 }} />
      ) : null}
      <span
        style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: s.text,
          letterSpacing: '0.2em',
          color: '#ffffff',
          lineHeight: 1,
        }}
      >
        FUTTY
      </span>
    </>
  );

  const baseStyle = { display: 'flex', alignItems: 'center' };

  return linkTo ? (
    <Link to={linkTo} style={{ ...baseStyle, textDecoration: 'none' }}>
      {conteudo}
    </Link>
  ) : (
    <div style={baseStyle}>{conteudo}</div>
  );
}
