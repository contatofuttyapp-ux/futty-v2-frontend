// Futty v2.0 — Ícone SVG custom (de /public/icons). Os SVGs têm os paths a preto
// por defeito; o filtro CSS recolore conforme `color` (dourado, branco ou cinzento).
export default function Icon({ name, size = 24, color = '#d4a017', className = '' }) {
  const filter =
    color === '#d4a017'
      ? 'invert(67%) sepia(55%) saturate(700%) hue-rotate(5deg) brightness(95%) contrast(95%)'
      : color === 'white' || color === '#ffffff'
        ? 'invert(1)'
        : color === 'grey' || color === '#555566'
          ? 'invert(35%) sepia(0%) saturate(0%) brightness(60%)'
          : 'none';

  return (
    <img
      src={`/icons/${name}.svg`}
      alt={name}
      style={{ width: size, height: size, display: 'block', filter }}
      className={className}
    />
  );
}
