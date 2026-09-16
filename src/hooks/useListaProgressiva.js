// Futty v2.0 — Listas em duas levas (VELOCIDADE 8, 16-set).
//
// O PROBLEMA: a Resenha punha os 20 itens do feed no MESMO commit do React —
// cada um com avatar, foto, barra de reações e a prévia de até 2 comentários com
// mais avatares. Isso é uma leva de layout e de pintura enorme, num só quadro, e
// a pessoa não vê nada até ela acabar. O Ranking faz o mesmo com 23 linhas, cada
// uma com moldura, pódio e botões animados (os relatórios do iPhone: 1389, 1866
// e 2121 ms para pintar).
//
// A ideia é simples: os primeiros itens — os que cabem na tela — pintam já; o
// resto entra dois quadros depois, quando a pessoa já tem alguma coisa à frente.
// Dois quadros porque o primeiro ainda cai antes do desenho e o segundo já corre
// com a 1ª leva pintada (o mesmo critério da pintura em lib/diagnostico.js).
//
// startTransition: diz ao React que a 2ª leva é trabalho de fundo. Se a pessoa
// tocar em alguma coisa a meio, o toque passa à frente em vez de esperar que o
// resto da lista acabe de montar.
import { startTransition, useEffect, useState } from 'react';

const VAZIO = [];

/** Duas listas são "a mesma" se têm o mesmo tamanho e as mesmas pontas. */
function mudou(a, b) {
  if (a.length !== b.length) return true;
  if (a.length === 0) return false;
  return a[0] !== b[0] || a[a.length - 1] !== b[b.length - 1];
}

/**
 * @param {Array} itens - a lista inteira, já filtrada e ordenada.
 * @param {number} primeiros - quantos entram no 1º commit.
 * @returns {Array} a fatia a desenhar agora (a lista inteira, dois quadros
 *   depois). Listas curtas passam inteiras à primeira — dividir em duas levas
 *   uma lista que já cabe num quadro só acrescentava um quadro de espera.
 */
export function useListaProgressiva(itens, primeiros = 6) {
  const lista = itens || VAZIO;
  const [limite, setLimite] = useState(primeiros);
  // Lista nova (mudou de time, chegou a resposta fresca, apagou-se um post):
  // volta à 1ª leva. Ajuste DURANTE o render — é o padrão oficial do React para
  // estado derivado de props, o mesmo que o useApiComCache já usa; um efeito
  // corria tarde de mais (a lista inteira já tinha sido montada).
  //
  // A comparação é de CONTEÚDO, não de identidade, e isso não é preciosismo:
  // um chamador que faça `dados?.lista || []` devolve um array novo a cada
  // render, e comparar identidades poria isto a repor estado em ciclo — render
  // infinito, tela em branco. Apanhado em campo no Ranking (o useRanking fazia
  // exactamente isso; também já leva um VAZIO estável). Comprimento + primeiro +
  // último chega: duas listas com o mesmo tamanho e as mesmas pontas são, para
  // efeito de quantas linhas desenhar, a mesma lista.
  const [vista, setVista] = useState(lista);
  if (vista !== lista && mudou(vista, lista)) {
    setVista(lista);
    setLimite(primeiros);
  }

  const faltam = lista.length > limite;

  useEffect(() => {
    if (!faltam) return undefined;
    if (typeof requestAnimationFrame === 'undefined') {
      startTransition(() => setLimite(Number.MAX_SAFE_INTEGER));
      return undefined;
    }
    let segundo = null;
    const primeiro = requestAnimationFrame(() => {
      segundo = requestAnimationFrame(() => {
        startTransition(() => setLimite(Number.MAX_SAFE_INTEGER));
      });
    });
    return () => {
      cancelAnimationFrame(primeiro);
      if (segundo != null) cancelAnimationFrame(segundo);
    };
  }, [faltam]);

  return faltam ? lista.slice(0, limite) : lista;
}
