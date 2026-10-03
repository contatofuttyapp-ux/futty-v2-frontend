// Futty v2.0 — Avatar do time nos tamanhos de sempre (sm/md/lg). Rodada 29I, bloco 3: é o MESMO escudo do resto do app
// (EscudoEquipa) — a "cor de fundo do avatar", que era um segundo controle de cor sem explicação (achado 102), saiu.
import EscudoEquipa from './EscudoEquipa';

const SIZES = { sm: 32, md: 48, lg: 64 };

export default function TeamAvatar({ team = {}, size = 'md' }) {
  return <EscudoEquipa team={team} size={SIZES[size] || SIZES.md} />;
}
