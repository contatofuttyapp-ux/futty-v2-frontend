// Os 4 lugares que seriam silhueta no Sorteio da peça 01 ganham FIGURINHA (LOJA-PRINTS-OUT.md) — o cartão
// com peito e uniforme, como o do Bruninho, e não o close do rosto de public/onboarding/. Geradas pela
// bancada do motor (backend/scripts/_bench/gerar-modelos-ficticios.js --loja, receita V6 de produção) em
// LOJA/demo-avatares/, fora do repositório: <arquivo>-avatar.png é o que a captura serve no Sorteio,
// <arquivo>-card.png é a figurinha na moldura, para a folha.
//
// "Índio" e "Nego Di" (apelidos de cor/etnia) saem da peça: no lugar do Índio entra o Paredão, fictício
// novo; no do Nego Di, o próprio dono, com o nome do perfil dele (o nome_jogador, que é o que o app mostra
// no Sorteio). Careca e Zé Gordo ficam e ganham rosto que combina.
// Lido por capturar-telas.mjs (a resposta simulada do jogo) e por gerar-imagens.mjs --avatares (a folha dos
// 4 cartões).
export const FIGURINHAS_DO_SORTEIO = [
  { noBanco: 'Índio', nome: 'Paredão', arquivo: 'l3-paredao', time: 'Time Ouro', nota: 'no lugar do Índio' },
  { noBanco: 'Careca', nome: 'Careca', arquivo: 'l1-careca', time: 'Time Ouro', nota: 'fictício novo' },
  { noBanco: 'Zé Gordo', nome: 'Zé Gordo', arquivo: 'l2-ze-gordo', time: 'Time Ouro', nota: 'fictício novo' },
  { noBanco: 'Nego Di', nome: 'Chavo, el matador', arquivo: 'dono', time: 'Time Roxo', nota: 'o dono, no lugar do Nego Di' },
];
