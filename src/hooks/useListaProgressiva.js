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

// FLUIDEZ 2 (16-set) — o "resto" deixa de ser UMA leva.
//
// A Velocidade 8 partiu a lista em duas: os primeiros já, o resto dois quadros
// depois. Só que "o resto" continuava a ser um commit único — numa Resenha com
// 20 posts, o segundo commit monta 14 cartões de uma vez, cada um com avatar,
// foto, barra de reações e prévia de comentários. É menos mau do que 20 num só
// quadro, mas ainda é um quadro que a pessoa sente.
//
// Agora o resto entra de 5 em 5, com um quadro entre lotes. Cinco porque é
// pouco mais do que cabe numa tela de telemóvel: grande o suficiente para a
// lista não demorar a completar-se, pequeno o suficiente para nenhum lote
// segurar a tela.
const POR_LOTE = 5;

/**
 * @param {Array} itens - a lista inteira, já filtrada e ordenada.
 * @param {number} primeiros - quantos entram no 1º commit.
 * @returns {Array} a fatia a desenhar agora. Listas curtas passam inteiras à
 *   primeira — dividir uma lista que já cabe num quadro só acrescentava espera.
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
    // Dois quadros até ao 1º lote (o primeiro ainda cai antes do desenho, o
    // segundo já corre com a 1ª leva pintada), e um quadro entre lotes.
    let pedido = null;
    let vivo = true;
    const maisUmLote = () => {
      if (!vivo) return;
      startTransition(() => setLimite((n) => n + POR_LOTE));
    };
    pedido = requestAnimationFrame(() => {
      pedido = requestAnimationFrame(maisUmLote);
    });
    return () => {
      vivo = false;
      if (pedido != null) cancelAnimationFrame(pedido);
    };
    // `limite` na lista de dependências de propósito: cada lote que entra
    // reagenda o seguinte, até `faltam` ficar falso e o efeito parar sozinho.
  }, [faltam, limite]);

  return faltam ? lista.slice(0, limite) : lista;
}
