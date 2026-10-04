// Futty v2.0 — Rodada 29T (bloco B, achado 157): o "Sobre o time" — a bio que o time mostra no Radar de peladas. Puro (sem React, sem rede).
// É a coluna `teams.descricao` (até 300 letras) que o motor já aceita e devolve; só o nome na tela mudou (era "Descrição" em Ajustes).
// Time aberto ao público (aberto ou com aprovação) PRECISA dizer como ele é: quem pede para entrar são estranhos, e quem acha o time no Radar
// só tem isto para decidir. Time fechado não pede.

/** Até onde o motor guarda (routes/teams.js: slice(0, 300)). */
export const MAX_SOBRE_O_TIME = 300;

/** O exemplo do campo (dono): mostra o tom, não a regra. */
export const EXEMPLO_SOBRE_O_TIME = 'Ex.: Turma de 40+, joga domingo de manhã perto do Cruzeiro.';

/** A política de entrada que pede o "Sobre o time": tudo menos o time fechado (`privado`). */
export function precisaDeSobre(modo) {
  return modo === 'publico_aberto' || modo === 'publico_aprovacao';
}

/** Falta o "Sobre o time"? O time é público e o texto está vazio (só espaços conta como vazio). */
export function faltaSobre({ modo, sobre }) {
  return precisaDeSobre(modo) && !String(sobre ?? '').trim();
}

/** O que a tela diz quando falta. */
export const FALTA_SOBRE_NA_CRIACAO = 'Conte como é o time para criar.';
export const FALTA_SOBRE_NOS_AJUSTES = 'Time aberto precisa do "Sobre o time". Conte como ele é.';
