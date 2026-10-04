// Futty v2.0 — Rodada 29B (D): o CampoCidade em lazy, com um campo comum enquanto o código (e depois a lista) não chega.
// As três telas que têm o campo (Explorar, criar time, painel do time) importam ESTE arquivo; o de verdade só desce
// quando o campo aparece — o arranque do app tem teto de 320 KiB e não paga nada por isto.
import { Suspense, lazy } from 'react';

const CampoCidade = lazy(() => import('./CampoCidade'));

export default function CampoCidadeLazy({ valor, aoMudar, aoSugestoes = null, placeholder = 'Ex: Brasília', maxLength = 100, className = 'input input--hud', style, ...resto }) {
  return (
    <Suspense
      fallback={(
        <input
          {...resto}
          className={className}
          value={valor}
          maxLength={maxLength}
          placeholder={placeholder}
          style={{ width: '100%', fontFamily: "'Rajdhani', sans-serif", fontSize: 16, ...style }}
          onChange={(e) => aoMudar(e.target.value, null)}
        />
      )}
    >
      <CampoCidade valor={valor} aoMudar={aoMudar} aoSugestoes={aoSugestoes} placeholder={placeholder} maxLength={maxLength} className={className} style={style} {...resto} />
    </Suspense>
  );
}
