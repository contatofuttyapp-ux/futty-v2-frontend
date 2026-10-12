// Bancada da prova de XSS dos cartões 9:16 (scripts/provas/xss.prova.mjs): as funções de DE VERDADE que desenham o cartão do campeão, o do pódio e o do
// time sorteado (utils/campeonatoCartao.js, utils/sorteioCartao.js), expostas em window para a prova chamar com nomes hostis. São canvas (fillText):
// texto, nunca HTML — a prova confere que o texto hostil vai LITERAL para o desenho, que sai 1080×1920 e que nada executa nem pede endereço de fora.
import { canvasCartaoCampeao, canvasCartaoPodio } from '../../src/utils/campeonatoCartao';
import { gerarCartao916 } from '../../src/utils/sorteioCartao';

window.__cartoes = { canvasCartaoCampeao, canvasCartaoPodio, gerarCartao916 };
document.getElementById('raiz').dataset.pronto = '1';
