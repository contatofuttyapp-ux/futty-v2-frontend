// Futty v2.0 — Avatar do jogador (foto ou iniciais). Glow verde só quando glow=true.
import { initials } from '../utils/teamColors';

export default function PlayerAvatar({ nome, avatarUrl, lg = false, glow = false }) {
  const cls = ['pavatar', lg && 'pavatar--lg', glow && 'pavatar--glow'].filter(Boolean).join(' ');
  return <div className={cls}>{avatarUrl ? <img src={avatarUrl} alt="" /> : initials(nome) || '?'}</div>;
}
