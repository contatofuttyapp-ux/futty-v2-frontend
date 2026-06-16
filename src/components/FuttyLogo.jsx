// Futty v2.0 — Logo da marca (imagem). variant: 'flat' (dourado) | 'metallic' (âmbar).
export default function FuttyLogo({ size = 32, variant = 'flat' }) {
  const src = variant === 'metallic' ? '/futty-logo-metallic.png' : '/futty-logo-flat.png';
  return (
    <img
      src={src}
      alt="Futty"
      style={{ height: size, width: 'auto', display: 'block' }}
    />
  );
}
