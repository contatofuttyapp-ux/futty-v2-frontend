// Futty v2.0 — "Esta imagem já está perto da tela?": a foto da Resenha só é pedida quando vai aparecer.
//
// O `loading="lazy"` do navegador não basta no celular: o Chrome baixa tudo o que está a até 1.250–2.500 px da tela (mais de duas telas
// inteiras da Resenha) e o WebKit tem a régua dele. Na abertura isso vira dezenas de fotos e avatares disputando o rádio com o próprio
// /api/feed — que vem de São Paulo. Aqui o `src` só entra quando o elemento chega a MARGEM da tela; até lá a caixa já reserva o lugar
// (width/height), então nada pula.
//
// Um observador só para a página inteira (não um por imagem): a Resenha tem centenas de avatares, e cada IntersectionObserver é
// trabalho do navegador a cada rolagem. Quem já ficou perto não volta a esconder (a imagem já baixou; tirar o `src` só faria piscar).
import { useEffect, useState } from 'react';

const MARGEM = '320px 0px';
let observador = null;
const avisos = new Map(); // elemento -> função que marca "perto"

function observar(el, aoChegar) {
  if (!observador) {
    observador = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        const avisar = avisos.get(e.target);
        avisos.delete(e.target);
        observador.unobserve(e.target);
        if (avisar) avisar();
      }
    }, { rootMargin: MARGEM });
  }
  avisos.set(el, aoChegar);
  observador.observe(el);
  return () => {
    avisos.delete(el);
    observador?.unobserve(el);
  };
}

/**
 * `true` quando o elemento de `ref` chegou perto da tela (e daí para sempre). Sem IntersectionObserver (navegador muito antigo),
 * `true` já de saída: a imagem carrega como antes.
 */
export function usePertoDaTela(ref) {
  const [perto, setPerto] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (perto || !ref.current) return undefined;
    return observar(ref.current, () => setPerto(true));
  }, [perto, ref]);
  return perto;
}
