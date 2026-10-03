// Futty v2.0 — Rodada 29I (achado 92): o primeiro nome de uma pessoa, sem a pontuação colada.
//
// A conta "CHAVO, EL MATADOR" virava "Solte a resenha, Chavo,…" — o app cortava no primeiro espaço e a vírgula ia junto. Qualquer nome
// com vírgula, ponto ou hífen no fim da primeira palavra fazia isso. Puro (sem React), para testar no Node.

// vírgula, ponto, ponto e vírgula, dois-pontos, hífens/travessões e o espaço que sobrar — do começo e do FIM da palavra, nunca do meio
// ("João-Pedro" é um nome só).
const PONTUACAO_NO_FIM = /[\s,.;:\-–—]+$/u;
const PONTUACAO_NO_COMECO = /^[\s,.;:\-–—]+/u;

/** "CHAVO, EL MATADOR" → "CHAVO" · "Tonhão" → "Tonhão" · "  Rafa - o Mago" → "Rafa". Sem nome, devolve ''. A caixa fica como a pessoa escreveu. */
export function primeiroNome(nome) {
  const inteiro = String(nome ?? '').trim();
  if (!inteiro) return '';
  const primeira = inteiro.split(/\s+/u)[0];
  const limpa = primeira.replace(PONTUACAO_NO_COMECO, '').replace(PONTUACAO_NO_FIM, '');
  if (limpa) return limpa;
  // A "palavra" era só pontuação ("- Rafa"): tira-a e tenta a seguinte.
  const resto = inteiro.replace(PONTUACAO_NO_COMECO, '');
  return resto ? primeiroNome(resto) : '';
}
