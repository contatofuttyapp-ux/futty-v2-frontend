// Futty v2.0 — O ícone do app flutuando, para a landing e o Avise-me — a mesma física do FuttyLoader
// (sombra no chão → bob → sway, classes em app.css). O F solto como marca não existe (lei da casa): o F de
// marca vai dentro do ícone da loja (FuttyLogo variant="icone"). Na landing a aura (.landing-glow) fica
// atrás, intacta.
import FuttyLogo from './FuttyLogo';

export default function FuttyIconeFlutuante({ size = 120 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <span
        className="futty-f-shadow"
        aria-hidden="true"
        style={{ position: 'absolute', left: '15%', bottom: -6, width: '70%', height: 8, background: 'radial-gradient(ellipse, rgba(0,0,0,0.55), transparent 70%)', filter: 'blur(6px)', pointerEvents: 'none' }}
      />
      <div className="futty-f-bob">
        <div className="futty-f-sway" style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))' }}>
          <FuttyLogo variant="icone" size={size} />
        </div>
      </div>
    </div>
  );
}
