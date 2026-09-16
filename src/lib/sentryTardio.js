// Futty v2.0 — Sentry, mas depois (VELOCIDADE 8, 16-set).
//
// O Sentry.init() corria na 5ª linha do main.jsx, síncrono, e por isso os 84 KB
// do @sentry/react tinham de ser buscados, lidos e COMPILADOS antes de o React
// existir. Isso é caro exactamente quando dói: na 1ª abertura depois de
// instalar/atualizar, com o WebKit sem cache de bytecode nenhum.
//
// Um relatório de erro não tem pressa nenhuma — o que tem pressa é a tela. Aqui
// o módulo chega 3 s DEPOIS da 1ª pintura, e até lá nada se perde: dois
// ouvintes baratos (window.onerror e unhandledrejection) guardam o que
// acontecer numa fila, e a fila é despejada no Sentry assim que ele está de pé.
//
// No app da loja `tracesSampleRate` vai a 0: um trace é trabalho e rede que se
// gasta a medir, e o app nativo já tem o Diagnóstico próprio (lib/diagnostico.js)
// a medir melhor, de graça e sem sair do aparelho. Os ERROS continuam a ir —
// é para isso que o Sentry lá está.
import { Capacitor } from '@capacitor/core';
import { aposPrimeiraPintura } from './diagnostico';

// Depois da 1ª pintura ainda há trabalho por acabar (dados a chegar, imagens a
// decodificar). 3 s é o pedido do dono e é o mesmo espírito do resto da
// Velocidade 8: nada em segundo plano enquanto a tela ainda se está a compor.
const ESPERA_MS = 3000;
// Teto da fila: se o app está a lançar erros aos magotes, o problema não é a
// falta de registo — e guardar mil não ajuda ninguém.
const MAX_FILA = 20;

const fila = [];
let ligado = false;
let desligarOuvintes = null;

function guardar(erro, contexto) {
  if (fila.length >= MAX_FILA) return;
  fila.push({ erro, contexto, em: new Date().toISOString() });
}

function ouvirEnquantoEspera() {
  if (typeof window === 'undefined') return () => {};
  const naErro = (evento) => {
    if (ligado) return; // o Sentry já está de pé e apanha sozinho
    guardar(evento.error || new Error(evento.message || 'erro sem mensagem'), 'window.onerror');
  };
  const naRejeicao = (evento) => {
    if (ligado) return;
    const r = evento.reason;
    guardar(r instanceof Error ? r : new Error(String(r)), 'unhandledrejection');
  };
  window.addEventListener('error', naErro);
  window.addEventListener('unhandledrejection', naRejeicao);
  return () => {
    window.removeEventListener('error', naErro);
    window.removeEventListener('unhandledrejection', naRejeicao);
  };
}

async function acender() {
  try {
    // Aponta para a casca, não para o @sentry/react: ver lib/sentryLigar.js —
    // um namespace dinâmico não se sacode e o chunk quintuplicava.
    const { init, captureException } = await import('./sentryLigar');
    init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      enabled: import.meta.env.PROD,
      // Nativo: 0. Na web fica o 10% de sempre.
      tracesSampleRate: Capacitor.isNativePlatform() ? 0 : 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
    });
    ligado = true;
    // A fila: o que aconteceu antes de o Sentry existir vai agora, marcado com
    // o instante real e com a origem (onerror ou promessa sem catch).
    const atrasados = fila.splice(0);
    for (const { erro, contexto, em } of atrasados) {
      captureException(erro, { tags: { antesDoSentry: true, origem: contexto }, extra: { em } });
    }
  } catch {
    // Sem Sentry (chunk em falta, rede ruim): o app segue. Um relatório de erro
    // que falha não pode ser mais um erro.
  } finally {
    // Os ouvintes de espera saem sempre: ou o Sentry assumiu, ou não vai haver
    // ninguém para quem mandar a fila.
    if (desligarOuvintes) desligarOuvintes();
  }
}

/** Liga a fila agora e o Sentry 3 s depois da 1ª pintura. Chamado uma vez. */
export function prepararSentry() {
  if (typeof window === 'undefined') return;
  desligarOuvintes = ouvirEnquantoEspera();
  aposPrimeiraPintura(() => {
    window.setTimeout(acender, ESPERA_MS);
  });
}
