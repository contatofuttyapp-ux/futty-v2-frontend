// Futty v2.0 — O ÚNICO loading de ecrã do app: o F grande, sozinho, centrado.
//
// FASE 3.58 — CENTRADO POR CONSTRUÇÃO. Antes vivia no fluxo com
// minHeight: calc(100dvh - 120px), e o centro dependia do que cada página tinha por
// cima: a Figurinha punha-o num <main> com minHeight próprio, o Ranking a seguir a um
// header, os Jogos dentro de um div com margem. Três wrappers, três centros — e o
// calc só podia acertar num deles. Agora sai do fluxo: fixed + inset 0 → o F cai no
// centro GEOMÉTRICO do viewport, igual em todas as páginas, seja o que for que exista
// acima ou abaixo. É a mesma técnica que arrumou o overlay de geração na 3.57.
//
// zIndex 40: abaixo da bottom nav (50) e da topbar (100), para as duas ficarem
// visíveis por cima — o utilizador continua a ver onde está e pode sair.
// pointerEvents: none — este ecrã não bloqueia nada. É informativo, não modal: durante
// o carregamento nada há para clicar por baixo, mas se houvesse não queremos que um
// div invisível de ecrã inteiro engula os cliques.
//
// Excepção: micro-loadings dentro de botões e o overlay de geração (que é relativo ao
// CARD, não ao viewport) usam o <FuttyLoader> directo e não este componente.
import FuttyLoader from './FuttyLoader';

export default function LoadingFutty() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <FuttyLoader size={129} label={null} />
    </div>
  );
}
