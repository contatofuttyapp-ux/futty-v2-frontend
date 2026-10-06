// Futty v2.0 — Avatar do time nos tamanhos sm/md/lg. É o MESMO escudo do resto do app (EscudoEquipa), sem
// uma "cor de fundo do avatar" à parte.
import EscudoEquipa from './EscudoEquipa';

const SIZES = { sm: 32, md: 48, lg: 64 };

export default function TeamAvatar({ team = {}, size = 'md' }) {
  return <EscudoEquipa team={team} size={SIZES[size] || SIZES.md} />;
}
