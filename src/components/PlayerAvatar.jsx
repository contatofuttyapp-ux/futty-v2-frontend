// Futty v2.0 — Avatar do jogador com glow neon (foto ou iniciais)
import { initials } from '../utils/teamColors';

export default function PlayerAvatar({ nome, avatarUrl, lg = false }) {
  return (
    <div className={`pavatar ${lg ? 'pavatar--lg' : ''}`}>
      {avatarUrl ? <img src={avatarUrl} alt="" /> : initials(nome) || '?'}
    </div>
  );
}
