// Futty v2.0 — Início: gerar o cromo (o canvas da figurinha, quadrado) com o cache da sessão e o do aparelho.

import { gerarFigurinhaCanvas } from '../../utils/figurinhaCanvas';
import { gravarCromo } from '../../lib/cromoCache';

// ----- O cromo do Início -----
// É a figurinha REAL (o mesmo canvas da /figurinha), reduzida e clicável — não o
// PlayerCard, que era a geração anterior do cromo e mostrava outra coisa.
//
// COMPOSTO, nunca em camadas: o teatro do studio (partículas entre o fundo e o
// jogador, luz direccional, glint a percorrer o frame) é exclusivo da /figurinha.
// Aqui o cromo é um OBJECTO, não um palco — por cima dele só a física da casa:
// bob e sway dessincronizados (7.2s/9.3s) e a sombra no chão em contra-fase. São
// as .fig-* do studio, partilhadas de propósito: já trazem o prefers-reduced-motion.
//
// FORMATO: retrato QUADRADO nativo (600×600, sem placa nem nome) — não o card 2:3.
// O quadrado é mais baixo, deixa a página respirar e o nome vive em texto livre por
// baixo. O card 2:3 com placa continua canónico na Figurinha e no download.
//
// CACHE: cada geração é um canvas 600×600 mais a descodificação do avatar e do
// stadium_bg, e o Início remonta a cada volta da bottom nav. O dataURL fica em
// módulo (sobrevive ao unmount, ao contrário de um estado) com chave = tudo o que
// mexe nos pixéis. Mudar o fundo na Figurinha muda a chave e regenera sozinho:
// não há invalidação manual para alguém se esquecer de chamar.
//
// Este Map morre quando a aba morre. O cromo guardado em
// IndexedDB (lib/cromoCache.js) é o que atravessa ABERTURAS — sem ele, toda
// abertura do app redesenhava a figurinha do zero.
const cromoCache = new Map();

async function gerarCromoDataURL(opts, chave, userId) {
  const cached = cromoCache.get(chave);
  if (cached) return cached;
  const blob = await gerarFigurinhaCanvas(opts);
  if (!blob) return null;
  // dataURL e não objectURL: sem ciclo de vida para gerir, o cache pode
  // atravessar montagens sem ficar a apontar para um URL já revogado.
  const dataURL = await new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => resolve(null);
    fr.readAsDataURL(blob);
  });
  if (dataURL) {
    cromoCache.set(chave, dataURL);
    // Guarda o BLOB (não o dataURL): o IndexedDB aguenta-o como é, sem os +33%
    // do base64. Não se espera por isto — a tela não depende do cache.
    gravarCromo(userId, chave, blob).catch(() => {});
  }
  return dataURL;
}

export { cromoCache, gerarCromoDataURL };
