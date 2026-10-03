// Futty v2.0 — Rodada 29L (achado 130): a faixa que rola e AVISA que rola. A borda por onde ainda há conteúdo esmaece (CSS em app.css,
// `[data-mais-dir]` / `[data-mais-esq]`) e uma seta, que também é botão, rola uma "página". Sem conteúdo escondido, não aparece nada.
// `className` e o resto vão para o trilho (é nele que mora o `overflow-x`); `envoltorioClassName` é para o que o trilho fazia de caixa
// (largura, margem) — a seta fica presa ao envoltório, não rola junto.
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useIndicadorDeRolagem } from '../hooks/useIndicadorDeRolagem';
import { passoDaSeta } from '../utils/faixaRolavel';

export default function FaixaRolavel({ children, className = '', envoltorioClassName = '', rotuloMais = 'Ver mais', rotuloAnteriores = 'Ver anteriores', ...resto }) {
  const { aoMontar, no, esquerda, direita } = useIndicadorDeRolagem();

  function rolar(sentido) {
    if (!no) return;
    const reduzido = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    no.scrollTo({
      left: passoDaSeta({ sentido, scrollLeft: no.scrollLeft, clientWidth: no.clientWidth, scrollWidth: no.scrollWidth }),
      behavior: reduzido ? 'auto' : 'smooth',
    });
  }

  return (
    <div className={`faixa-rolavel ${envoltorioClassName}`.trim()} data-faixa-rolavel>
      <div
        ref={aoMontar}
        className={className}
        data-mais-esq={esquerda ? '1' : undefined}
        data-mais-dir={direita ? '1' : undefined}
        {...resto}
      >
        {children}
      </div>
      {esquerda ? (
        <button type="button" className="faixa-rolavel__seta faixa-rolavel__seta--esq" data-seta="esq" aria-label={rotuloAnteriores} tabIndex={-1} onClick={() => rolar(-1)}>
          <ChevronLeft size={16} />
        </button>
      ) : null}
      {direita ? (
        <button type="button" className="faixa-rolavel__seta faixa-rolavel__seta--dir" data-seta="dir" aria-label={rotuloMais} tabIndex={-1} onClick={() => rolar(1)}>
          <ChevronRight size={16} />
        </button>
      ) : null}
    </div>
  );
}
