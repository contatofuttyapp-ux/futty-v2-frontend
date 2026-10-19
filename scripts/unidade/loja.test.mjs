// Futty v2.0 — Pagamentos P2: a loja (lib/loja.js) e os cartões dos Planos (lib/planos.js#produtosDaTela).
//
// O que se tranca aqui (sem aparelho, sem loja, sem rede — o SDK do RevenueCat e o motor são de mentira):
//   1. web → indisponível, e nenhum método do SDK é chamado;
//   2. nativo SEM a chave pública → indisponível (o app segue no "Pedir ativação");
//   3. a conta: configure com o users.id na 1ª vez, logIn na troca, logOut na saída; se a troca falhar,
//      a loja fica sem conta — nunca compra em nome de quem estava antes;
//   4. os produtos vêm com o preço da LOJA (ofertas e, o que faltar, pelo id);
//   5. comprar: o team_id vai como atributo antes do pacote; a compra é do PACOTE da oferta (purchasePackage, com o
//      objeto como o getOfferings() o devolveu) e só o que a oferta não trouxe cai no purchaseStoreProduct; cancelar NÃO
//      é erro; erro de rede vira recado curto; todo erro leva o detalhe (code, readableErrorCode, underlyingErrorMessage)
//      que a tela mostra só ao testador;
//   6. restaurar → pede à loja e manda as transações ao motor (POST /api/compras/sincronizar);
//   7. lojaLigada só com o motor ligado (loja_pronta) E a loja disponível;
//   8. os cartões: sem loja, o pedido (sem valor, sem manto); com loja, "Comprar · preço" com o preço
//      e a moeda da loja, e o produto que a loja não devolveu não aparece.
//
// Uso: npm test  (ou: node --import ./scripts/unidade/registrar.mjs --test scripts/unidade/loja.test.mjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerPagina } from './_fonteDaPagina.mjs';

globalThis.__FUTTY_ENV__ = {};

const { criarLoja, IDS_NA_LOJA, detalheDoErro, linhaDoDetalhe } = await import('../../src/lib/loja.js');
const { produtosDaTela, MINHA_GERACOES } = await import('../../src/lib/planos.js');

const EU = '22222222-2222-2222-2222-222222222222';
const OUTRA = '33333333-3333-3333-3333-333333333333';
const TIME = '11111111-1111-1111-1111-111111111111';

const item = (id, priceString, price, currencyCode = 'BRL') => ({ identifier: id, priceString, price, currencyCode });
// Um pacote de oferta como o getOfferings() o devolve: identifier, o contexto da oferta e o produto. A ponte do iOS recusa um pacote sem os dois primeiros.
const pacoteDaOferta = (identifier, produto) => ({ identifier, packageType: 'CUSTOM', presentedOfferingContext: { offeringIdentifier: 'default', placementIdentifier: null, targetingContext: null }, product: produto });
// O erro do plugin na ponte do Capacitor: o code no erro, o resto dentro de data.
const erroDaPonte = (message, code, data = {}) => Object.assign(new Error(message), { code, data });

/** SDK de mentira: grava cada chamada; `respostas` troca o comportamento de um método. */
function sdkFalso(respostas = {}) {
  const chamadas = [];
  const metodo = (nome, padrao) => async (arg) => {
    chamadas.push({ nome, arg });
    if (respostas[nome]) return respostas[nome](arg);
    return padrao?.(arg);
  };
  const sdk = {
    configure: metodo('configure'),
    logIn: metodo('logIn', () => ({ customerInfo: {}, created: false })),
    logOut: metodo('logOut', () => ({ customerInfo: {} })),
    getOfferings: metodo('getOfferings', () => ({
      current: { identifier: 'default', availablePackages: [pacoteDaOferta('minha', item('futty_minha', 'R$ 9,90', 9.9)), pacoteDaOferta('pacote', item('futty_pacote', 'R$ 49,90', 49.9))] },
      all: {},
    })),
    getProducts: metodo('getProducts', () => ({ products: [item('futty_manto', 'R$ 49,90', 49.9)] })),
    setAttributes: metodo('setAttributes'),
    purchaseStoreProduct: metodo('purchaseStoreProduct', () => ({ productIdentifier: 'futty_minha', customerInfo: { nonSubscriptionTransactions: [] } })),
    purchasePackage: metodo('purchasePackage', () => ({ productIdentifier: 'futty_minha', customerInfo: { nonSubscriptionTransactions: [] } })),
    restorePurchases: metodo('restorePurchases', () => ({
      customerInfo: { nonSubscriptionTransactions: [{ productIdentifier: 'futty_minha', transactionIdentifier: '2000000999', purchaseDate: '2026-09-26T12:00:00Z', purchaseToken: null }] },
    })),
  };
  return { sdk, chamadas, nomes: () => chamadas.map((c) => c.nome) };
}

function montar({ plataforma = 'ios', chaves = { ios: 'appl_publica', android: 'goog_publica' }, respostas, motor } = {}) {
  const falso = sdkFalso(respostas);
  const pedidos = [];
  const api = async (caminho, opcoes) => {
    pedidos.push({ caminho, corpo: opcoes?.body ? JSON.parse(opcoes.body) : null });
    return motor ? motor(caminho) : { creditadas: 1, ja_existiam: 0, nao_confirmadas: 0, recusadas: [] };
  };
  const loja = criarLoja({ Purchases: falso.sdk, plataforma: () => plataforma, chaves, apiFetch: api });
  return { loja, ...falso, pedidos };
}

test('web → indisponível em tudo, e o SDK nem é tocado', async () => {
  const { loja, chamadas } = montar({ plataforma: 'web' });
  assert.equal(loja.lojaDisponivel(), false);
  assert.deepEqual(await loja.iniciarLoja(EU), { disponivel: false });
  assert.deepEqual(await loja.produtosDaLoja(), { disponivel: false });
  assert.deepEqual(await loja.comprar('minha'), { disponivel: false });
  assert.deepEqual(await loja.restaurar(), { disponivel: false });
  await loja.sairDaLoja();
  assert.equal(chamadas.length, 0);
});

test('nativo SEM a chave pública da plataforma → indisponível (o app segue no pedido)', async () => {
  const { loja, chamadas } = montar({ plataforma: 'ios', chaves: { ios: '', android: 'goog_publica' } });
  assert.equal(loja.lojaDisponivel(), false);
  assert.deepEqual(await loja.iniciarLoja(EU), { disponivel: false });
  assert.deepEqual(await loja.comprar('minha'), { disponivel: false });
  assert.equal(chamadas.length, 0);
  // A chave do Android não serve ao iPhone, e vice-versa.
  assert.equal(montar({ plataforma: 'android', chaves: { ios: 'appl_publica' } }).loja.lojaDisponivel(), false);
});

test('a conta: configure com o users.id, logIn na troca, logOut na saída — sem repetir', async () => {
  const { loja, chamadas, nomes } = montar();
  assert.deepEqual(await loja.iniciarLoja(EU), { disponivel: true });
  assert.deepEqual(chamadas[0], { nome: 'configure', arg: { apiKey: 'appl_publica', appUserID: EU } });
  await loja.iniciarLoja(EU); // StrictMode, efeito duplo: não configura de novo
  assert.deepEqual(nomes(), ['configure']);
  await loja.sairDaLoja();
  await loja.iniciarLoja(OUTRA);
  assert.deepEqual(nomes(), ['configure', 'logOut', 'logIn']);
  assert.deepEqual(chamadas[2].arg, { appUserID: OUTRA });
});

test('configure recusado (chave inválida) → a loja sai de cena até reabrir o app', async () => {
  const { loja } = montar({ respostas: { configure: () => { throw Object.assign(new Error('invalid key'), { code: '11' }); } } });
  assert.deepEqual(await loja.iniciarLoja(EU), { disponivel: false });
  assert.equal(loja.lojaDisponivel(), false);
});

test('troca de conta que falha deixa a loja SEM conta: não compra em nome de quem estava antes', async () => {
  const { loja, nomes } = montar({ respostas: { logIn: () => { throw Object.assign(new Error('offline'), { code: '10' }); } } });
  await loja.iniciarLoja(EU);
  await loja.iniciarLoja(OUTRA); // o logIn falha
  assert.deepEqual(await loja.comprar('minha'), { disponivel: false });
  assert.ok(!nomes().includes('purchaseStoreProduct'));
});

test('produtos com o preço da LOJA: ofertas primeiro, o que faltar pelo id (como não-assinatura)', async () => {
  const { loja, chamadas } = montar();
  await loja.iniciarLoja(EU);
  const r = await loja.produtosDaLoja();
  assert.equal(r.disponivel, true);
  assert.deepEqual(r.produtos.minha, { id: 'minha', priceString: 'R$ 9,90', preco: 9.9, moeda: 'BRL' });
  assert.equal(r.produtos.manto.priceString, 'R$ 49,90');
  const busca = chamadas.find((c) => c.nome === 'getProducts');
  assert.deepEqual(busca.arg, { productIdentifiers: [IDS_NA_LOJA.manto], type: 'NON_SUBSCRIPTION' });
});

test('comprar: o pacote leva o team_id como atributo ANTES da compra; a Minha não', async () => {
  const { loja, chamadas, nomes } = montar();
  await loja.iniciarLoja(EU);
  const r = await loja.comprar('pacote', { teamId: TIME });
  assert.equal(r.ok, true);
  const i = nomes().indexOf('setAttributes');
  assert.ok(i >= 0 && i < nomes().indexOf('purchasePackage'));
  assert.deepEqual(chamadas[i].arg, { team_id: TIME });
  assert.equal(chamadas.find((c) => c.nome === 'purchasePackage').arg.aPackage.product.identifier, 'futty_pacote');

  const outra = montar();
  await outra.loja.iniciarLoja(EU);
  await outra.loja.comprar('minha');
  assert.ok(!outra.nomes().includes('setAttributes'));
  assert.deepEqual(await outra.loja.comprar('pacote'), { disponivel: true, ok: false, erro: 'Escolha o time.' });
});

test('comprar: o pacote da oferta vai INTEIRO, como o getOfferings() o devolveu (identifier e presentedOfferingContext), e o purchaseStoreProduct não é chamado', async () => {
  const { loja, chamadas, nomes } = montar();
  await loja.iniciarLoja(EU);
  const ofertas = await (async () => { const r = chamadas.length; await loja.produtosDaLoja(); return chamadas.slice(r).find((c) => c.nome === 'getOfferings'); })();
  assert.ok(ofertas, 'o getOfferings foi pedido');
  const r = await loja.comprar('minha');
  assert.equal(r.ok, true);
  const compra = chamadas.find((c) => c.nome === 'purchasePackage');
  assert.deepEqual(Object.keys(compra.arg), ['aPackage'], 'só o aPackage, sem produto solto');
  assert.equal(compra.arg.aPackage.identifier, 'minha');
  assert.deepEqual(compra.arg.aPackage.presentedOfferingContext, { offeringIdentifier: 'default', placementIdentifier: null, targetingContext: null });
  assert.equal(compra.arg.aPackage.product.identifier, 'futty_minha');
  assert.ok(!nomes().includes('purchaseStoreProduct'));
});

test('comprar o que a oferta não trouxe (achado pelo id): cai no purchaseStoreProduct, com o produto', async () => {
  const { loja, chamadas, nomes } = montar();
  await loja.iniciarLoja(EU);
  const r = await loja.comprar('manto', { teamId: TIME });
  assert.equal(r.ok, true);
  assert.ok(!nomes().includes('purchasePackage'));
  assert.equal(chamadas.find((c) => c.nome === 'purchaseStoreProduct').arg.product.identifier, 'futty_manto');
});

test('comprar cancelado pela pessoa → { cancelado: true }, sem erro nenhum (userCancelled solto no erro ou dentro de data)', async () => {
  const { loja } = montar({ respostas: { purchasePackage: () => { throw Object.assign(new Error('Purchase was cancelled.'), { code: '1', userCancelled: true }); } } });
  await loja.iniciarLoja(EU);
  const r = await loja.comprar('minha');
  assert.deepEqual(r, { disponivel: true, cancelado: true });
  assert.equal('erro' in r, false);
  const naPonte = montar({ respostas: { purchasePackage: () => { throw erroDaPonte('Purchase was cancelled.', '1', { userCancelled: true }); } } });
  await naPonte.loja.iniciarLoja(EU);
  assert.deepEqual(await naPonte.loja.comprar('minha'), { disponivel: true, cancelado: true });
});

test('comprar com a rede fora → recado curto, sem código nem inglês (o detalhe vai à parte, para o testador)', async () => {
  const { loja } = montar({ respostas: { purchasePackage: () => { throw Object.assign(new Error('Error performing request.'), { code: '10' }); } } });
  await loja.iniciarLoja(EU);
  assert.deepEqual(await loja.comprar('minha'), { disponivel: true, ok: false, erro: 'Sem conexão com a loja. Tente de novo.', detalhe: { code: '10', readableErrorCode: null, underlyingErrorMessage: null } });
});

test('o STORE_PROBLEM do iPhone: o recado de sempre, e o detalhe traz code, readableErrorCode e underlyingErrorMessage lidos de data', async () => {
  const { loja } = montar({ respostas: { purchasePackage: () => { throw erroDaPonte('There was a problem with the App Store.', '2', { readableErrorCode: 'STORE_PROBLEM', underlyingErrorMessage: 'The operation couldn’t be completed. (SKErrorDomain error 0.)' }); } } });
  await loja.iniciarLoja(EU);
  const r = await loja.comprar('minha');
  assert.equal(r.ok, false);
  assert.equal(r.erro, 'A loja não respondeu. Tente de novo.');
  assert.deepEqual(r.detalhe, { code: '2', readableErrorCode: 'STORE_PROBLEM', underlyingErrorMessage: 'The operation couldn’t be completed. (SKErrorDomain error 0.)' });
  assert.equal(linhaDoDetalhe(r.detalhe), 'code: 2 · readableErrorCode: STORE_PROBLEM · underlyingErrorMessage: The operation couldn’t be completed. (SKErrorDomain error 0.)');
});

test('detalheDoErro: lê do erro, de data e de userInfo; corta em 300; ignora objeto; campo ausente é null; linhaDoDetalhe põe — no que faltou', () => {
  assert.deepEqual(detalheDoErro({ code: '3', readableErrorCode: 'PURCHASE_NOT_ALLOWED_ERROR', underlyingErrorMessage: 'x' }), { code: '3', readableErrorCode: 'PURCHASE_NOT_ALLOWED_ERROR', underlyingErrorMessage: 'x' });
  assert.deepEqual(detalheDoErro({ code: '2', data: { userInfo: { readableErrorCode: 'STORE_PROBLEM' }, underlying_error_message: 'y' } }), { code: '2', readableErrorCode: 'STORE_PROBLEM', underlyingErrorMessage: 'y' });
  assert.equal(detalheDoErro({ code: '2', data: { underlyingErrorMessage: 'a'.repeat(500) } }).underlyingErrorMessage.length, 300);
  assert.deepEqual(detalheDoErro({ code: { a: 1 }, data: { readableErrorCode: { b: 2 } } }), { code: null, readableErrorCode: null, underlyingErrorMessage: null });
  assert.deepEqual(detalheDoErro(null), { code: null, readableErrorCode: null, underlyingErrorMessage: null });
  assert.equal(linhaDoDetalhe(detalheDoErro({ code: '2' })), 'code: 2 · readableErrorCode: — · underlyingErrorMessage: —');
  assert.equal(linhaDoDetalhe(null), '');
});

test('o código do erro que vem só dentro de data também escolhe o recado', async () => {
  const { loja } = montar({ respostas: { purchasePackage: () => { throw Object.assign(new Error('x'), { data: { code: '2' } }); } } });
  await loja.iniciarLoja(EU);
  assert.equal((await loja.comprar('minha')).erro, 'A loja não respondeu. Tente de novo.');
});

test('restaurar → pede à loja e manda as transações ao motor, que devolve o que creditou', async () => {
  const { loja, nomes, pedidos } = montar();
  await loja.iniciarLoja(EU);
  const r = await loja.restaurar();
  assert.ok(nomes().includes('restorePurchases'));
  assert.equal(pedidos.length, 1);
  assert.equal(pedidos[0].caminho, '/api/compras/sincronizar');
  assert.deepEqual(pedidos[0].corpo, { nonSubscriptionTransactions: [{ productIdentifier: 'futty_minha', transactionIdentifier: '2000000999', purchaseDate: '2026-09-26T12:00:00Z' }] });
  assert.deepEqual(r, { disponivel: true, ok: true, resumo: { creditadas: 1, ja_existiam: 0, nao_confirmadas: 0, recusadas: [] } });
});

test('restaurar com o motor sem RC_API_KEY (503) → recado, não quebra', async () => {
  const { loja } = montar({ motor: () => { throw Object.assign(new Error('As compras ainda não estão disponíveis.'), { code: 'COMPRAS_INDISPONIVEL', status: 503 }); } });
  await loja.iniciarLoja(EU);
  assert.deepEqual(await loja.restaurar(), { disponivel: true, ok: false, erro: 'Restaurar compras não está disponível agora.' });
});

test('sincronizarAposCompra nunca lança e leva o time do pacote', async () => {
  const quebrado = montar({ motor: () => { throw new Error('fora do ar'); } });
  assert.equal(await quebrado.loja.sincronizarAposCompra({ nonSubscriptionTransactions: [] }), null);
  const { loja, pedidos } = montar();
  await loja.sincronizarAposCompra({ nonSubscriptionTransactions: [] }, { teamId: TIME });
  assert.deepEqual(pedidos[0].corpo, { nonSubscriptionTransactions: [], teamId: TIME });
});

test('lojaLigada: só com o motor ligado (loja_pronta) E a loja disponível', () => {
  const nativa = montar().loja;
  assert.equal(nativa.lojaLigada({ loja_pronta: true }), true);
  assert.equal(nativa.lojaLigada({ loja_pronta: false }), false);
  assert.equal(nativa.lojaLigada(null), false);
  assert.equal(montar({ plataforma: 'web' }).loja.lojaLigada({ loja_pronta: true }), false);
});

test('cartões: sem loja, o pedido (sem valor, sem manto); com loja, "Comprar · preço" da loja', () => {
  const pedido = produtosDaTela(false);
  assert.deepEqual(pedido.map((p) => p.id), ['pacote', 'minha']);
  assert.ok(pedido.every((p) => !p.preco && /^Pedir/.test(p.botao)));
  assert.equal(pedido[1].botaoBloco, `Pedir a minha · ${MINHA_GERACOES} gerações`);

  const loja = produtosDaTela(true, {
    minha: { priceString: 'R$ 9,90', preco: 9.9, moeda: 'BRL' },
    pacote: { priceString: 'R$ 49,90', preco: 49.9, moeda: 'BRL' },
  });
  assert.deepEqual(loja.map((p) => p.id), ['pacote', 'minha'], 'o manto que a loja não devolveu não aparece');
  const minha = loja.find((p) => p.id === 'minha');
  assert.equal(minha.botao, 'Comprar · R$ 9,90');
  assert.equal(minha.preco, 'R$ 9,90');
  const pacote = loja.find((p) => p.id === 'pacote');
  assert.match(pacote.porJogador, /^R\$\s2,00 por jogador$/, 'o por jogador sai do preço e da moeda da LOJA');

  const euro = produtosDaTela(true, { manto: { priceString: '14,99 €', preco: 14.99, moeda: 'EUR' } });
  assert.equal(euro[0].preco, '+14,99 €');
  assert.equal(euro[0].botao, 'Comprar · 14,99 €');
});

// ─── Rodada 31F: o Pacote do time está sempre à venda (presente para o time) ───────────────────────────────────────────────────────────────
test('31F · pacote ainda não ativo: o cartão é o de sempre ("Pacote do time", "Comprar · preço")', () => {
  const { produtosDaTela: cartoes } = { produtosDaTela };
  const pacote = cartoes(true, { pacote: { priceString: 'US$ 12,99', preco: 12.99, moeda: 'USD' } }).find((p) => p.id === 'pacote');
  assert.equal(pacote.nome, 'Pacote do time');
  assert.equal(pacote.botao, 'Comprar · US$ 12,99');
});

test('31F · pacote já ativo: título "Mais figurinhas pro seu time", a linha do presente e o botão "Comprar para o time · preço" (nunca "Já é seu")', () => {
  const lista = produtosDaTela(true, { pacote: { priceString: 'US$ 12,99', preco: 12.99, moeda: 'USD' }, minha: { priceString: 'US$ 2,99', preco: 2.99, moeda: 'USD' } }, { pacoteAtivo: true });
  const pacote = lista.find((p) => p.id === 'pacote');
  assert.equal(pacote.nome, 'Mais figurinhas pro seu time');
  assert.equal(pacote.resumo, 'Presenteie o time: +2 gerações para cada jogador.');
  assert.equal(pacote.botao, 'Comprar para o time · US$ 12,99');
  assert.equal(pacote.preco, 'US$ 12,99');
  assert.ok(pacote.features.every((f) => !/já é seu|não precisa comprar/i.test(f)));
  // a Minha Figurinha não muda com o pacote do time
  assert.equal(lista.find((p) => p.id === 'minha').botao, 'Comprar · US$ 2,99');
});

test('31F · o código de Planos e da Figurinha não tem mais o selo "Já é seu" do pacote nem a linha "Não precisa comprar de novo"', async () => {
  const { readFileSync } = await import('node:fs');
  const planos = readFileSync(new URL('../../src/pages/Planos.jsx', import.meta.url), 'utf8');
  assert.ok(!/Não precisa comprar de novo/.test(planos));
  assert.match(planos, /const jaAtivo = p\.id === 'manto' \? !!meuTime\?\.manto_proprio : false;/, 'só o manto é "já é seu"');
  assert.match(planos, /O pacote é comprado pelo dono do time\./);
  const figurinha = lerPagina('Figurinha');
  assert.match(figurinha, /presente \? 'Comprar para o time' : 'Comprar para o meu time'/);
});
