// Futty v2.0 — Barra de topo. Com `back`: chevron "← Voltar". Com `title` (sem back):
// só o título centrado. Com `hud`: wordmark dourado à esquerda + linha HUD (estilo
// circuito). Sem nenhum: logo F flat (fallback de marca). Linha gradiente por baixo.
//
// RODADA 12C — `back` passa a aceitar a string 'voltar' além de uma URL.
//
// Com uma URL o chevron é um <Link> para um lugar FIXO, e isso está certo para
// telas com um pai só (Planos → Perfil). Deixou de estar para a vitrine do
// jogador, que agora se abre de quatro sítios: voltar sempre para o Ranking
// mandava para uma tela onde a pessoa nunca esteve.
//
// Com 'voltar' o chevron vira um <button> que desfaz o último passo do
// histórico. Quem chega por link direto (sem histórico interno) não tem passo
// para desfazer — aí vale o `backFallback`, e sem ele o Início.
import { useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import FuttyLogo from './FuttyLogo';

/** O chevron de voltar: <Link> para uma URL, ou <button> que desfaz um passo. */
function BotaoVoltar({ back, backFallback, className, style, size }) {
  const navigate = useNavigate();
  if (back !== 'voltar') {
    return (
      <Link to={back} className={className} aria-label="Voltar" style={style}>
        <ChevronLeft size={size} />
      </Link>
    );
  }
  // `location.key` é 'default' quando esta é a PRIMEIRA entrada do histórico
  // desta aba — ou seja, a pessoa abriu o link direto e não há para onde voltar.
  const desfazer = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(backFallback || '/home', { replace: true });
  };
  return (
    <button type="button" onClick={desfazer} className={className} aria-label="Voltar" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', ...style }}>
      <ChevronLeft size={size} />
    </button>
  );
}

// Variante HUD: wordmark dourado + linha dourada com um degrau de 45° na base.
// O degrau é COLADO ao fim do texto (não um x fixo): mede-se o fim do wordmark
// dentro do SVG e converte-se para as unidades do viewBox (0–400, esticado a 100%).
// O FUNDO PRETO é recortado com a MESMA geometria da linha → a linha é a fronteira
// real entre o preto (acima) e o que está atrás (abaixo). Recalcula em resize e
// quando as fontes carregam. Robusto a qualquer título (não só "FIGURINHA").
function HudTopbar({ hud, back, backFallback }) {
  const svgRef = useRef(null);
  const textRef = useRef(null);
  const [stepX, setStepX] = useState(128); // unidades do viewBox (default até medir)

  // VELOCIDADE 8 (16-set) — mede UMA VEZ POR MONTAGEM, não a cada rota.
  //
  // Duas coisas mudaram. Primeira: as deps eram [hud], e como a Topbar é
  // remontada a cada troca de tela (o PageTransition leva key={pathname}),
  // TODA navegação voltava a ligar um ResizeObserver, a pedir dois
  // getBoundingClientRect (que forçam layout síncrono) e a pendurar-se outra vez
  // no document.fonts.ready — em cima do momento em que a tela nova está a
  // pintar. Segunda: o ResizeObserver dispara SEMPRE uma vez ao observar, logo a
  // seguir ao medir() de arranque: eram duas medições iguais por montagem, e a
  // segunda podia ainda disparar um setState a meio da pintura.
  //
  // Agora: uma medição na montagem, e só se volta a medir se a largura do SVG
  // mudar de verdade (rodar o telemóvel) ou quando as fontes assentarem — que é
  // quando o fim do texto muda de sítio, o único motivo real para remedir.
  useLayoutEffect(() => {
    let largura = 0;
    const medir = () => {
      const svg = svgRef.current;
      const txt = textRef.current;
      if (!svg || !txt) return;
      const s = svg.getBoundingClientRect();
      const t = txt.getBoundingClientRect();
      if (s.width <= 0) return;
      largura = s.width;
      const fimTexto = t.right - s.left + 6; // fim de "FIGURINHA" + 6px de respiro
      setStepX(Math.max(20, Math.min(360, (fimTexto / s.width) * 400)));
    };
    medir();

    let vivo = true;
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver((entradas) => {
        // O disparo de cortesia do observe() traz a mesma largura que acabámos
        // de ler: não é uma mudança, e remedir aí é trabalho puro.
        const nova = entradas[0]?.contentRect?.width;
        if (nova && Math.abs(nova - largura) > 0.5) medir();
      })
      : null;
    if (ro && svgRef.current) ro.observe(svgRef.current);
    // A promessa do fonts.ready já está resolvida da 2ª tela em diante; o
    // `vivo` é o que impede um setState depois de a Topbar desmontar.
    if (document.fonts?.ready) document.fonts.ready.then(() => { if (vivo) medir(); }).catch(() => {});
    return () => {
      vivo = false;
      if (ro) ro.disconnect();
    };
  }, [hud]);

  const stepEnd = Math.min(400, stepX + 9); // rampa de 45° com ~9 unidades de largura
  // Clip do fundo preto: mesma geometria da linha. y: 1→79.5%, 9→97.7% (header 44px).
  const stepClip = `polygon(0 0, 100% 0, 100% 79.5%, ${(stepEnd / 4).toFixed(2)}% 79.5%, ${(stepX / 4).toFixed(2)}% 97.7%, 0 97.7%)`;
  const linePath = `M0 9 H${stepX.toFixed(1)} L${stepEnd.toFixed(1)} 1 H400`;

  return (
    <div className="app-topbar-wrap">
      <header className="app-topbar app-topbar--hud">
        {/* Fundo preto recortado com o degrau */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            background: 'rgba(5, 8, 15, 0.8)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            clipPath: stepClip,
          }}
        />
        {/* `back` opcional: páginas fora da bottom nav (ex. /planos) precisam de saída.
            O degrau é medido a partir do fim do wordmark, por isso continua a colar-se
            ao título mesmo com o chevron a empurrá-lo para a direita. */}
        {back ? (
          <BotaoVoltar back={back} backFallback={backFallback} className="topbar-back" size={20} style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', marginRight: 4 }} />
        ) : null}
        <span
          ref={textRef}
          style={{
            position: 'relative',
            zIndex: 1,
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: '0.14em',
            color: '#d4a017',
            whiteSpace: 'nowrap',
          }}
        >
          {hud}
        </span>
        {/* Linha dourada sobre a aresta recortada (coincide com ela, não recortada). */}
        <svg
          ref={svgRef}
          width="100%"
          height="10"
          viewBox="0 0 400 10"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{ position: 'absolute', bottom: 0, left: 0, zIndex: 1, display: 'block' }}
        >
          <defs>
            <linearGradient id="hudline" x1="0" x2="1">
              <stop offset="0" stopColor="#d4a017" stopOpacity="0.9" />
              <stop offset="0.6" stopColor="#d4a017" stopOpacity="0.4" />
              <stop offset="1" stopColor="#d4a017" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={linePath} stroke="url(#hudline)" strokeWidth="1.5" fill="none" />
        </svg>
      </header>
    </div>
  );
}

export default function Topbar({ title = null, back = null, hud = null, backFallback = null }) {
  if (hud) return <HudTopbar hud={hud} back={back} backFallback={backFallback} />;

  return (
    <div className="app-topbar-wrap">
      <header className="app-topbar">
        {back ? (
          <BotaoVoltar back={back} backFallback={backFallback} className="topbar-back" size={22} />
        ) : !title ? (
          <Link to="/home" aria-label="Início" style={{ display: 'flex', alignItems: 'center' }}>
            <FuttyLogo variant="flat" size={36} />
          </Link>
        ) : null}
        {title && <span className="topbar-title">{title}</span>}
      </header>
    </div>
  );
}
