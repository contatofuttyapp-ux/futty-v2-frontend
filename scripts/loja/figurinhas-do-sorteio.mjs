// Os 4 lugares que seriam silhueta no Sorteio da peça 01 ganham FIGURINHA (LOJA-PRINTS-OUT.md) — o cartão
// com peito e uniforme, como o do Bruninho, e não o close do rosto de public/onboarding/. Geradas pela
// bancada do motor (backend/scripts/_bench/gerar-modelos-ficticios.js --loja, receita V6 de produção) em
// LOJA/demo-avatares/, fora do repositório: <arquivo>-avatar.png é o que a captura serve no Sorteio,
// <arquivo>-card.png é a figurinha na moldura, para a folha.
//
// "Índio" e "Nego Di" (apelidos de cor/etnia) saíram da peça em 6-out: no lugar do Índio entrou o
// Paredão, fictício novo; no do Nego Di, o próprio dono, com o nome do perfil dele (o nome_jogador,
// que é o que o app mostra no Sorteio). Em 8-out (Rodada 30D) mais cinco apelidos pejorativos saíram
// do banco (scripts/renomear-apelidos-demo.js): Carlos e Roberto ficam nesta peça e ganham rosto que
// combina. `noBanco` tem de bater com o nome_jogador ATUAL (pós-renomeação) — é por ele que
// comFigurinhasDoSorteio (capturar-telas.mjs) encontra o lugar certo na resposta do jogo.
// Lido por capturar-telas.mjs (a resposta simulada do jogo) e por gerar-imagens.mjs --avatares (a folha dos
// 4 cartões).
export const FIGURINHAS_DO_SORTEIO = [
  { noBanco: 'Paredão', nome: 'Paredão', arquivo: 'l3-paredao', time: 'Time Ouro', nota: 'lugar que era a silhueta' },
  { noBanco: 'Carlos', nome: 'Carlos', arquivo: 'l1-carlos', time: 'Time Ouro', nota: 'fictício novo' },
  { noBanco: 'Roberto', nome: 'Roberto', arquivo: 'l2-roberto', time: 'Time Ouro', nota: 'fictício novo' },
  { noBanco: 'Diguinho', nome: 'Chavo, el matador', arquivo: 'dono', time: 'Time Roxo', nota: 'o dono, no lugar que era a silhueta' },
];
