// Futty v2.0 — Avatar do jogador.
// Dois modos:
//  - avatarUrl: foto direta (uso geral)
//  - jogador + cor: resolve via avatarParaCor() (fonte única) com fallback a iniciais
import { useState } from 'react';
import { initials } from '../utils/teamColors';
import { avatarParaCor, nomeJogador, urlAsset } from '../utils/avatar';

export default function PlayerAvatar({ nome, avatarUrl, jogador = null, cor = null, lg = false, md = false, sm = false, glow = false, gold = false }) {
  const [falhou, setFalhou] = useState(false);

  // Fonte da imagem: avatarUrl resolvido (frontend/backend/absoluto) OU por cor do time.
  const src = avatarUrl ? urlAsset(avatarUrl) : (jogador && cor ? avatarParaCor(jogador, cor) : null);
  const nomeFinal = nome || (jogador ? nomeJogador(jogador) : '');

  const cls = [
    'pavatar',
    lg && 'pavatar--lg',
    md && 'pavatar--md',
    sm && 'pavatar--sm',
    glow && 'pavatar--glow',
    gold && 'pavatar--gold',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls}>
      {src && !falhou ? (
        <img src={src} alt="" onError={() => setFalhou(true)} />
      ) : (
        initials(nomeFinal) || '?'
      )}
    </div>
  );
}
