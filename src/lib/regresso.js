// Futty v2.0 — "O app voltou para a frente" (VELOCIDADE 8, 16-set).
//
// O PEDRO, build 19: ficou horas com o app aberto e não viu um jogo novo. Não é
// um bug de dados — é que nada, em lado nenhum, dizia ao app que ele tinha
// voltado. O /api/inicio corria uma vez ao montar o InicioContext e mais nunca;
// com o app em segundo plano a tela continuava a mostrar a fotografia do
// momento em que foi deixada, por mais tempo que passasse.
//
// São DOIS sinais, não um, e é preciso ouvir os dois:
//   visibilitychange — o do browser. Cobre a web e também o WebView quando o
//     sistema o esconde.
//   appStateChange (@capacitor/app) — o do app nativo. Há casos em que o iOS
//     devolve a app ao primeiro plano sem que o WebView dispare
//     visibilitychange (volta do seletor de apps, desbloqueio de tela).
// Os dois podem disparar quase ao mesmo tempo para o mesmo regresso, por isso há
// uma janela de silêncio: dois avisos a menos de 1 s são o mesmo regresso.
import { Capacitor } from '@capacitor/core';

// Dois sinais para o mesmo regresso não podem valer dois recarregamentos.
const JANELA_MS = 1000;

const ouvintes = new Set();
let ligado = false;
let ultimoAviso = 0;

function avisar() {
  const agora = Date.now();
  if (agora - ultimoAviso < JANELA_MS) return;
  ultimoAviso = agora;
  for (const fn of ouvintes) {
    try { fn(); } catch { /* um ouvinte a falhar não trava os outros */ }
  }
}

function ligar() {
  if (ligado || typeof document === 'undefined') return;
  ligado = true;

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) avisar();
  });

  if (Capacitor.isNativePlatform()) {
    // Dinâmico: na web o @capacitor/app não tem nada para fazer, e assim nem
    // sequer se lê o módulo.
    import('@capacitor/app')
      .then(({ App }) => App.addListener('appStateChange', ({ isActive }) => { if (isActive) avisar(); }))
      .catch(() => { /* sem o plugin fica só o visibilitychange */ });
  }
}

/**
 * Corre `fn` sempre que o app volta para a frente. Devolve a função que
 * cancela — chamar no cleanup do efeito.
 */
export function aoVoltar(fn) {
  ligar();
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}
