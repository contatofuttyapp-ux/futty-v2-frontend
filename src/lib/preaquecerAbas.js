// Futty v2.0 — Pré-aquecimento dos chunks das abas (VELOCIDADE 4).
//
// Cada tela vive no seu próprio chunk (lazy() em App.jsx) e, até 14-set, esse
// chunk só começava a ser lido no TOQUE: a pessoa tocava em "Resenha" e ficava
// a olhar para a tela antiga enquanto o ficheiro era buscado, lido e executado.
// Na web isso é uma ida à rede; no app é leitura de disco mais o custo de
// executar o módulo — menos, mas ainda o suficiente para o toque parecer morto.
//
// Aqui as quatro vizinhas do Início são carregadas quando o browser está PARADO,
// depois da primeira tela já estar desenhada. O requestIdleCallback é que
// garante isso: nunca disputa com o que a pessoa está a ver agora.
//
// As mesmas funções servem o lazy() em App.jsx — é de propósito. O registo de
// módulos do browser devolve sempre a MESMA promessa para o mesmo import(), por
// isso pré-aquecer e depois navegar não descarrega duas vezes, e pré-aquecer a
// meio de um lazy() em curso não atrapalha nada.

// Velocidade 7B: cada função lembra o módulo depois de carregado
// (`jaCarregado()`). O React.lazy suspende na primeira renderização sempre que
// recebe uma promessa — mesmo já resolvida — e ainda segura o fallback ~300 ms;
// com o módulo em mãos, utils/lazyComRetry.js entrega-o sem suspender.
function lembrar(importar) {
  let modulo = null;
  const carregar = () => (modulo ? Promise.resolve(modulo) : importar().then((m) => { modulo = m; return m; }));
  carregar.jaCarregado = () => modulo;
  return carregar;
}

export const importarInicio = lembrar(() => import('../pages/Inicio'));
export const importarFeed = lembrar(() => import('../pages/Feed'));
export const importarRanking = lembrar(() => import('../pages/Ranking'));
export const importarFigurinha = lembrar(() => import('../pages/Figurinha'));
export const importarMeuPerfil = lembrar(() => import('../pages/MeuPerfil'));

// Só as abas da barra de baixo. Telas fundas (Equipa, Jogo, Campeonato, Admin)
// ficam de fora de propósito: pré-carregar tudo seria trocar uma espera no
// toque por uma competição de banda com a tela que está à frente.
const ABAS = [importarInicio, importarFeed, importarRanking, importarFigurinha, importarMeuPerfil];

let jaPediu = false;

/**
 * Agenda o carregamento dos chunks das abas para o próximo momento de ócio.
 * Devolve uma função que cancela o agendamento (para o cleanup do efeito).
 * Corre uma vez por sessão — depois disso os módulos já estão no registo.
 */
export function preaquecerAbas() {
  if (jaPediu || typeof window === 'undefined') return () => {};
  jaPediu = true;

  // requestIdleCallback não existe no Safari anterior ao 16.4, e o piso do app
  // é o iOS 15 — daí o setTimeout como alternativa. 1200 ms é depois de a
  // primeira tela estar desenhada e das chamadas dela terem partido.
  const agendar = window.requestIdleCallback || ((fn) => window.setTimeout(fn, 1200));
  const cancelar = window.cancelIdleCallback || window.clearTimeout;

  const id = agendar(() => {
    // Falhar aqui não é erro de ninguém: é só um chunk que será buscado no
    // toque, como era antes. Nunca pode borbulhar para a tela.
    ABAS.forEach((carregar) => {
      carregar().catch(() => {});
    });
  });

  return () => cancelar.call(window, id);
}
