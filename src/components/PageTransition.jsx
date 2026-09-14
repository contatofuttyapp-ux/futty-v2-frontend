// Futty v2.0 — PageTransition: fade + leve deslize vertical entre páginas.
//
// BUILD 11 — ERA FRAMER-MOTION E DEIXAVA O APP INVISÍVEL. O motion.div entrava
// com `initial={{opacity:0}}` e dependia de um efeito JS para animar até
// opacity 1. Em "/" o caminho era este: o IndexRedirect devolve <LoadingFutty/>
// enquanto o auth carrega — SEM suspender —, então o motion.div COMMITA no DOM
// já com o style inline `opacity:0; transform:translateY(8px)`; logo a seguir o
// auth resolve, o <LandingPage/> (lazy) suspende com a árvore JÁ montada, o
// React esconde a subárvore e destrói os efeitos a meio da animação; quando o
// chunk chega e a árvore reaparece, o framer-motion não recomeça a entrada (o
// elemento nunca desmontou, a key não mudou) e o style inline fica em opacity 0
// PARA SEMPRE. Página inteira no DOM, zero erros no console, invisível.
// Só apanhava visitante sem sessão: com sessão o IndexRedirect vai direto ao
// /home e nunca passa por aqui — foi por isso que passou builds despercebido.
//
// A regra que fica: a visibilidade da página NUNCA depende de uma animação JS
// terminar. A transição é CSS (.page-transition em styles/app.css), tocada pelo
// motor de animação do browser; o estado natural do elemento é VISÍVEL, e o
// prefers-reduced-motion desliga a animação sem nunca esconder nada. A remontagem
// a cada rota (key={pathname} em App.jsx) é o que faz o keyframe recomeçar.
export default function PageTransition({ children }) {
  return (
    <div className="page-transition" data-page>
      {children}
    </div>
  );
}
