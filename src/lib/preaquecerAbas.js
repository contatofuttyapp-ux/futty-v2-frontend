// Futty v2.0 — Pré-aquecimento dos chunks das abas (VELOCIDADE 4).
//
// Cada tela vive no seu próprio chunk (lazy() em App.jsx) e, até 14-set, esse
// chunk só começava a ser lido no TOQUE: a pessoa tocava em "Resenha" e ficava
// a olhar para a tela antiga enquanto o ficheiro era buscado, lido e executado.
// Na web isso é uma ida à rede; no app é leitura de disco mais o custo de
// executar o módulo — menos, mas ainda o suficiente para o toque parecer morto.
//
// Aqui as quatro vizinhas do Início são carregadas quando o aparelho está
// PARADO, depois da primeira tela já estar desenhada.
//
// VELOCIDADE 8 (16-set) — "parado" era requestIdleCallback com setTimeout(1200)
// de reserva. O Safari não tem requestIdleCallback: no iPhone era sempre o
// setTimeout, e 1,2 s depois de abrir o app cinco chunks de JS chegavam ao
// mesmo tempo para serem COMPILADOS — em cima do primeiro toque da pessoa.
// Destes cinco, quatro são telas que ela talvez nem visite. É o mais caro dos
// trabalhos de segundo plano (compilar é trabalho de thread principal; uma
// imagem pelo menos descodifica-se de lado), por isso é o que mais tinha a
// ganhar em esperar. Agora quem decide é o lib/ritmo.js, e as abas entram UMA
// DE CADA VEZ, com um toque a mandar parar entre elas.
//
// As mesmas funções servem o lazy() em App.jsx — é de propósito. O registo de
// módulos do browser devolve sempre a MESMA promessa para o mesmo import(), por
// isso pré-aquecer e depois navegar não descarrega duas vezes, e pré-aquecer a
// meio de um lazy() em curso não atrapalha nada.

// Velocidade 7B: cada função lembra o módulo depois de carregado
// (`jaCarregado()`). O React.lazy suspende na primeira renderização sempre que
// recebe uma promessa — mesmo já resolvida — e ainda segura o fallback ~300 ms;
// com o módulo em mãos, utils/lazyComRetry.js entrega-o sem suspender.
import { esperarSeOcupado, quandoParado, respirar } from './ritmo';

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

  let parado = false;
  const cancelar = quandoParado(async () => {
    for (const carregar of ABAS) {
      if (parado) return;
      // Um toque entre duas abas manda esperar: compilar o chunk seguinte pode
      // muito bem ser o que come o quadro do toque que a pessoa acabou de dar.
      await esperarSeOcupado();
      await respirar();
      // Falhar aqui não é erro de ninguém: é só um chunk que será buscado no
      // toque, como era antes. Nunca pode borbulhar para a tela.
      await carregar().catch(() => {});
    }
  });

  return () => {
    parado = true;
    cancelar();
  };
}
