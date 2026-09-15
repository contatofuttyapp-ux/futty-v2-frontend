// Futty v2.0 — lazy() com retry para falhas de chunk (build 10, achado real:
// uma resposta ruim transitória da CDN ficou presa no cache do service worker
// — ver public/sw.js — e o import dinâmico de uma tela quebrava com "Failed
// to fetch dynamically imported module"; o ErrorBoundary caía em "Algo deu
// errado" e, no iPhone, o sintoma era o F carregar e ficar só o fundo.
//
// Duas camadas de defesa:
// 1. Retry simples (o sw.js já não guarda respostas ruins — ver comentário
//    lá — então uma 2ª tentativa já deve ir à rede de verdade). Cache-busting
//    por query string NÃO dá para fazer aqui: o import() do Vite é estático
//    (resolvido em build para a URL com hash), e o Safari — o browser que
//    importa neste app — não expõe a URL que falhou na mensagem de erro
//    (ao contrário do Chrome), então não há como reconstruir um pedido
//    "fresco" manualmente de forma confiável entre browsers.
// 2. Se o retry falhar de novo, o chunk provavelmente já não existe mesmo
//    (deploy novo apagou o hash antigo do CDN) — a única saída real é
//    recarregar a PÁGINA, que busca um index.html novo com os hashes
//    certos. Um reload só, guardado por sessionStorage: se mesmo assim
//    continuar a falhar, mostra o ErrorBoundary normal em vez de entrar
//    num loop de recarregar para sempre.
import { lazy } from 'react';

const CHAVE_JA_RECARREGOU = 'futty_chunk_reload';

function ehFalhaDeChunk(erro) {
  const msg = String(erro?.message || erro || '');
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(msg);
}

function aguardar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function lazyComRetry(importarFn) {
  return lazy(() => {
    // Velocidade 7B: módulo já carregado (lib/preaquecerAbas.js) vai por um
    // thenable SÍNCRONO — o React.lazy resolve-o na própria renderização e a
    // tela aparece sem passar pelo F do Suspense (e sem os ~300 ms que o React
    // segura o fallback antes de revelar). Uma promessa, mesmo resolvida, suspende.
    const pronto = importarFn.jaCarregado?.();
    if (pronto) return { then: (resolver) => resolver(pronto) };
    return carregarComRetry(importarFn);
  });
}

async function carregarComRetry(importarFn) {
  try {
    return await importarFn();
  } catch (erro) {
    if (!ehFalhaDeChunk(erro)) throw erro;

    await aguardar(300);
    try {
      return await importarFn();
    } catch (erro2) {
      if (!ehFalhaDeChunk(erro2)) throw erro2;

      let jaRecarregou = false;
      try {
        jaRecarregou = sessionStorage.getItem(CHAVE_JA_RECARREGOU) === '1';
      } catch {
        /* storage bloqueado — segue sem esse controlo, melhor arriscar um reload a mais que ficar preso */
      }
      if (jaRecarregou) throw erro2; // já tentou nesta sessão — mostra o ErrorBoundary, não recarrega em loop

      try {
        sessionStorage.setItem(CHAVE_JA_RECARREGOU, '1');
      } catch {
        /* ignora — se não guardar, o pior caso é um reload a mais numa próxima falha */
      }
      window.location.reload();
      // Fica pendurado até o reload de verdade acontecer — não há para onde devolver.
      return new Promise(() => {});
    }
  }
}
