// Futty v2.0 — Avatar do jogador.
// Três modos, nesta ordem de prioridade:
//  - avatarUrl: foto direta (uso geral)
//  - jogador + cor: resolve via avatarParaCor() (fonte única) com fallback a iniciais
//  - userId (+ avatarGenerico): sem foto, mostra o avatar genérico da casa — nunca
//    a silhueta "?" — usado nas listas de pessoas identificadas (membros, perfil).
import { useState } from 'react';
import SilhuetaJogador from './SilhuetaJogador';
import { avatarParaCor, urlAsset } from '../utils/avatar';
import { avatarGenericoUrl } from '../utils/avatarGenerico';

export default function PlayerAvatar({ avatarUrl, jogador = null, cor = null, userId = null, avatarGenerico = null, lg = false, md = false, sm = false, glow = false, gold = false, size = null }) {
  const [falhou, setFalhou] = useState(false);

  // Fonte da imagem: avatarUrl resolvido (frontend/backend/absoluto) OU por cor do
  // time OU (sem foto, mas com identidade) o genérico da casa.
  const src = avatarUrl
    ? urlAsset(avatarUrl)
    : (jogador && cor ? avatarParaCor(jogador, cor) : (userId != null ? avatarGenericoUrl(userId, avatarGenerico) : null));


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

  // size numérico → preenche caixas não-standard (ex.: dentro de AvatarFrame).
  // A imagem já preenche 100% via `.pavatar img` (cover, top center).
  const estilo = size ? { width: size, height: size, fontSize: Math.round(size * 0.34) } : undefined;

  return (
    <div className={cls} style={estilo}>
      {src && !falhou ? (
        <img src={src} alt="" onError={() => setFalhou(true)} />
      ) : (
        <SilhuetaJogador size="78%" />
      )}
    </div>
  );
}
