// Futty v2.0 — O tamanho da página da Resenha, num lugar só: a tela (pages/Feed.jsx) e o pré-aquecimento (lib/preaquecerDados.js)
// pedem o MESMO endereço, senão o que o pré-aquecimento guardou não serve à tela.
//
// 8 itens: o que cabe em duas telas e meia de celular. Cada cartão traz foto, até uma dúzia de avatares, reações e a prévia dos
// comentários; com 20 a primeira resposta pesava o dobro (30 KB contra 13 KB) e o celular desenhava doze cartões que ninguém via
// antes de rolar. O resto vem rolando (o sentinela do fim da lista pede a página seguinte antes de a pessoa chegar lá).
export const PAGINA_DA_RESENHA = 8;

/** O endereço da primeira página (e, com `antes`, da seguinte). */
export const enderecoDaResenha = (antes = null) => `/api/feed?limite=${PAGINA_DA_RESENHA}${antes ? `&antes=${encodeURIComponent(antes)}` : ''}`;
