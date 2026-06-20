// Futty v2.0 — Logo da marca (imagem).
// variant: 'flat' (dourado) | 'metallic' (âmbar) | 'wordmark' (lettering "FUTTY" vetorizado).
export default function FuttyLogo({ size = 32, variant = 'flat', color = '#d4a017' }) {
  if (variant === 'wordmark') {
    // O SVG tem os paths a preto por defeito; o filtro CSS recolore conforme `color`.
    const isWhite = color === '#ffffff' || color === 'white';
    const filter = isWhite
      ? 'invert(1)' // preto → branco
      : color === '#d4a017'
        ? 'invert(67%) sepia(55%) saturate(700%) hue-rotate(5deg) brightness(95%) contrast(95%)' // preto → dourado
        : 'none';
    return (
      <img
        src="/futty-wordmark.svg"
        alt="Futty"
        style={{ height: size, width: 'auto', display: 'block', filter }}
      />
    );
  }

  const src = variant === 'metallic' ? '/futty-logo-metallic.png' : '/futty-logo-flat.png';
  return (
    <img
      src={src}
      alt="Futty"
      style={{ height: size, width: 'auto', display: 'block' }}
    />
  );
}
