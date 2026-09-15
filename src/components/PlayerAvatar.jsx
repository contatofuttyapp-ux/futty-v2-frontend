// Futty v2.0 — Avatar do jogador.
// Três modos, nesta ordem de prioridade:
//  - avatarUrl: foto direta (uso geral)
//  - jogador + cor: resolve via avatarParaCor() (fonte única) com fallback a iniciais
//  - userId (+ avatarGenerico): sem foto, mostra o avatar genérico da casa — nunca
//    a silhueta "?" — usado nas listas de pessoas identificadas (membros, perfil).
import { useState } from 'react';
import SilhuetaJogador from './SilhuetaJogador';
import { avatarParaCor, urlAsset, urlImagem } from '../utils/avatar';
import { avatarGenericoUrl } from '../utils/avatarGenerico';

// Tamanho da caixa em px CSS, por variante (ver .pavatar em styles/app.css).
const PX = { lg: 128, md: 72, sm: 36, base: 52 };

export default function PlayerAvatar({ avatarUrl, jogador = null, cor = null, userId = null, avatarGenerico = null, lg = false, md = false, sm = false, glow = false, gold = false, size = null, eager = false }) {
  const [falhou, setFalhou] = useState(false);

  // Fonte da imagem: avatarUrl resolvido (frontend/backend/absoluto) OU por cor do
  // time OU (sem foto, mas com identidade) o genérico da casa.
  const bruto = avatarUrl
    ? urlAsset(avatarUrl)
    : (jogador && cor ? avatarParaCor(jogador, cor) : (userId != null ? avatarGenericoUrl(userId, avatarGenerico) : null));

  // Velocidade 6B: pede ao motor o tamanho que a caixa realmente mostra. O dobro
  // do px CSS cobre as telas de 2x/3x sem ficar borrado; acima de 128 CSS já é
  // cartão grande, e aí vale o degrau de 512.
  const px = size || (lg ? PX.lg : md ? PX.md : sm ? PX.sm : PX.base);
  const src = bruto ? urlImagem(bruto, px <= 64 ? 128 : px <= 128 ? 256 : 512) : null;

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
        // width/height = a caixa real: reserva o espaço antes da imagem chegar,
        // por isso a lista não salta quando cada avatar aparece.
        <img
          src={src}
          alt=""
          width={px}
          height={px}
          decoding="async"
          loading={eager ? 'eager' : 'lazy'}
          onError={() => setFalhou(true)}
        />
      ) : (
        <SilhuetaJogador size="78%" />
      )}
    </div>
  );
}
