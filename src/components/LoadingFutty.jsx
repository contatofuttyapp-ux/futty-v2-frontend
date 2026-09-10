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
import { useEffect, useState } from 'react';
import FuttyLoader from './FuttyLoader';
// tGlobal (não-reactivo): este ecrã também é usado FORA do I18nProvider
// (guarda de auth no arranque) — hook aqui rebenta; tGlobal lê o idioma guardado.
import { tGlobal } from '../lib/i18n';

// P3-14 — se o carregamento passar dos 4s, uma legenda discreta aparece por baixo do F
// (contexto: "não travou, ainda estamos a puxar"). `legenda` é opcional — cada página
// pode passar a sua; por omissão, a linha da casa em PT-BR (texto-base = chave i18n),
// com tom de jogo — escolhida pelo dono a 31-jul.
// Achado 3/23 (roteiro 10-set): a 3s a legenda aparecia em quase toda navegação —
// subiu para 4s enquanto o backend não fica consistentemente mais rápido.
export default function LoadingFutty({ legenda = 'Bola parada…\nO servidor tá demorando mais que o normal' }) {
  const [mostrarLegenda, setMostrarLegenda] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMostrarLegenda(true), 4000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        pointerEvents: 'none',
      }}
    >
      <FuttyLoader size={129} label={null} />
      {mostrarLegenda ? (
        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, letterSpacing: '0.06em', whiteSpace: 'pre-line', textAlign: 'center', color: 'var(--text-dim)', opacity: 0.85, transition: 'opacity 0.4s ease' }}>
          {tGlobal(legenda)}
        </span>
      ) : null}
    </div>
  );
}
