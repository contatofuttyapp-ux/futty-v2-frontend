// Futty v2.0 — A loja (Pagamentos P2, 26-set): o ÚNICO lugar do app que fala com o RevenueCat.
//
// O app compra pela App Store / Google Play através do SDK do RevenueCat
// (@revenuecat/purchases-capacitor). Quem credita é o MOTOR: o webhook do RevenueCat chega a
// POST /api/compras/webhook/revenuecat, e o "sincronizar" daqui só diz ao motor que transações
// procurar — ele confirma cada uma na API do RevenueCat antes de creditar (backend/docs/COMPRAS.md).
//
// Só existe no app nativo. Na web, e no nativo sem a chave pública do SDK no build
// (VITE_RC_APPLE_KEY / VITE_RC_GOOGLE_KEY), tudo aqui devolve `{ disponivel: false }` e as telas
// seguem no "Pedir ativação" — nunca quebra, nunca finge vender.
//
// Mora FORA do arranque (teto de 320 KiB): quem o carrega são as telas que vendem (Figurinha,
// Planos) através de lib/ligarLoja.js, que o liga ao PerfilContext — a conta que entra configura
// o SDK com o próprio users.id (é esse o app_user_id que o webhook procura); a que sai faz logOut,
// para compras de duas contas no mesmo celular nunca se misturarem.
import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { apiFetch } from './api';

/** Os ids dos produtos nas duas lojas — os mesmos de PRODUTOS_LOJA no motor (routes/compras.js). */
export const IDS_NA_LOJA = { minha: 'futty_minha', pacote: 'futty_pacote', manto: 'futty_manto' };
const PRODUTO_DO_ID = Object.fromEntries(Object.entries(IDS_NA_LOJA).map(([produto, id]) => [id, produto]));

const INDISPONIVEL = Object.freeze({ disponivel: false });

/** O produto nosso de um item da loja. No Google um item pode vir como "id:opção" — conta o id. */
function produtoDoItem(item) {
  return PRODUTO_DO_ID[String(item?.identifier || '').split(':')[0]] || null;
}

/** A pessoa desistiu na folha da loja: não é erro, a tela volta calada. */
function compraCancelada(e) {
  return e?.userCancelled === true || String(e?.code) === '1';
}

// Os códigos são os PURCHASES_ERROR_CODE do SDK (strings numéricas).
const MENSAGENS = {
  2: 'A loja não respondeu. Tente de novo.',
  3: 'Compras estão bloqueadas neste celular.',
  5: 'Este item não está à venda na loja agora.',
  10: 'Sem conexão com a loja. Tente de novo.',
  15: 'Já tem uma compra em andamento.',
  20: 'Pagamento pendente: vale assim que a loja confirmar.',
};
function mensagemDoErro(e) {
  return MENSAGENS[String(e?.code)] || 'Não deu para concluir a compra. Tente de novo.';
}

/**
 * Fábrica com tudo injetável — os testes (scripts/unidade/loja.test.mjs) passam um plugin de
 * mentira. `plataforma()` devolve 'ios' | 'android' | 'web'; `chaves` = { ios, android }.
 */
export function criarLoja({ Purchases: sdk, plataforma, chaves, apiFetch: api }) {
  let configurado = false; // o SDK já recebeu o configure() neste processo
  let conta = null; // o users.id com que o SDK está identificado agora
  let falhou = false; // configure() recusou (chave inválida): loja fora até reabrir o app
  let itens = null; // { minha, pacote, manto } → o produto da loja, para o purchaseStoreProduct
  let fila = Promise.resolve();

  const chave = () => ({ ios: chaves?.ios, android: chaves?.android })[plataforma()] || null;

  /** true só no nativo, com a chave pública da plataforma no build e o SDK sem recusa. */
  function lojaDisponivel() {
    return plataforma() !== 'web' && !!chave() && !falhou;
  }

  // configure/logIn/logOut nunca correm ao mesmo tempo: a troca de conta espera a anterior.
  function emFila(fn) {
    const vez = fila.then(fn, fn);
    fila = vez.catch(() => {});
    return vez;
  }

  /** Configura o SDK para esta conta (a 1ª vez) ou troca de conta (logIn). Idempotente. */
  function iniciarLoja(userId) {
    if (!userId || !lojaDisponivel()) return Promise.resolve(INDISPONIVEL);
    return emFila(async () => {
      if (conta === userId) return { disponivel: true };
      // Até a troca dar certo, a loja não tem conta: uma compra nunca sai em nome de quem
      // estava antes (o logIn precisa de rede e pode falhar).
      conta = null;
      try {
        if (!configurado) {
          await sdk.configure({ apiKey: chave(), appUserID: userId });
          configurado = true;
        } else {
          await sdk.logIn({ appUserID: userId });
        }
        conta = userId;
        return { disponivel: true };
      } catch (e) {
        console.warn('[loja] não deu para ligar a loja:', e?.code, e?.message);
        if (!configurado) falhou = true;
        return INDISPONIVEL;
      }
    });
  }

  /** A conta saiu do aparelho: o SDK volta a anônimo. Sem SDK ligado, não faz nada. */
  function sairDaLoja() {
    // Sempre pela fila: um configure ainda em curso termina antes, e aí sai.
    // Com o SDK ligado sai sempre, mesmo sem conta confirmada (um logIn que falhou deixou o SDK
    // na conta anterior); se ele já estiver anônimo, o logOut recusa e está tudo certo.
    return emFila(async () => {
      if (!configurado) return;
      conta = null;
      try {
        await sdk.logOut();
      } catch (e) {
        console.warn('[loja] logOut:', e?.code, e?.message);
      }
    });
  }

  /** Espera a configuração em curso; true se o SDK está pronto para a conta atual. */
  async function pronta() {
    if (!lojaDisponivel()) return false;
    await fila;
    return !!conta;
  }

  /**
   * Os produtos com o preço FORMATADO PELA LOJA (`priceString`): é a loja que sabe a moeda da
   * conta da pessoa. Primeiro as ofertas (o que o painel do RevenueCat oferece); o que faltar,
   * direto pelo id. Devolve { disponivel, produtos: { minha: { id, priceString, preco, moeda } } }
   * — um produto que a loja não devolveu fica de fora (a tela não mostra o que não se vende).
   */
  async function produtosDaLoja() {
    if (!(await pronta())) return INDISPONIVEL;
    try {
      const achados = {};
      try {
        const ofertas = await sdk.getOfferings();
        for (const oferta of [ofertas?.current, ...Object.values(ofertas?.all || {})]) {
          for (const pacote of oferta?.availablePackages || []) {
            const produto = produtoDoItem(pacote?.product);
            if (produto && !achados[produto]) achados[produto] = pacote.product;
          }
        }
      } catch (e) {
        console.warn('[loja] ofertas:', e?.code, e?.message);
      }
      const faltam = Object.keys(IDS_NA_LOJA).filter((p) => !achados[p]);
      if (faltam.length) {
        const { products } = await sdk.getProducts({ productIdentifiers: faltam.map((p) => IDS_NA_LOJA[p]), type: 'NON_SUBSCRIPTION' });
        for (const item of products || []) {
          const produto = produtoDoItem(item);
          if (produto && !achados[produto]) achados[produto] = item;
        }
      }
      itens = achados;
      const produtos = {};
      for (const [id, item] of Object.entries(achados)) {
        produtos[id] = { id, priceString: item.priceString, preco: item.price, moeda: item.currencyCode };
      }
      return { disponivel: true, produtos };
    } catch (e) {
      console.warn('[loja] produtos:', e?.code, e?.message);
      return { disponivel: true, produtos: {}, erro: 'Não deu para falar com a loja agora.' };
    }
  }

  /**
   * Compra um produto. Pacote e manto são de um time: o `team_id` vai como atributo do
   * assinante ANTES da compra (o webhook lê daí). Devolve { ok: true, customerInfo } |
   * { cancelado: true } (a pessoa desistiu — não é erro) | { ok: false, erro }.
   */
  async function comprar(produtoId, { teamId = null } = {}) {
    if (!(await pronta())) return INDISPONIVEL;
    if (produtoId !== 'minha' && !teamId) return { disponivel: true, ok: false, erro: 'Escolha o time.' };
    if (!itens?.[produtoId]) await produtosDaLoja();
    const item = itens?.[produtoId];
    if (!item) return { disponivel: true, ok: false, erro: MENSAGENS[5] };
    try {
      if (produtoId !== 'minha') await sdk.setAttributes({ team_id: String(teamId) });
      const r = await sdk.purchaseStoreProduct({ product: item });
      return { disponivel: true, ok: true, customerInfo: r?.customerInfo || null };
    } catch (e) {
      if (compraCancelada(e)) return { disponivel: true, cancelado: true };
      console.warn('[loja] compra não concluída:', e?.code, e?.message);
      return { disponivel: true, ok: false, erro: mensagemDoErro(e) };
    }
  }

  /** Manda ao motor as transações que o SDK conhece; ele só credita o que o RevenueCat confirmar. */
  function sincronizar(customerInfo, teamId = null) {
    const transacoes = (customerInfo?.nonSubscriptionTransactions || []).map((t) => ({
      productIdentifier: t.productIdentifier,
      transactionIdentifier: t.transactionIdentifier,
      purchaseDate: t.purchaseDate,
    }));
    return api('/api/compras/sincronizar', {
      method: 'POST',
      body: JSON.stringify(teamId ? { nonSubscriptionTransactions: transacoes, teamId } : { nonSubscriptionTransactions: transacoes }),
    });
  }

  /**
   * Logo depois de uma compra: o webhook pode chegar 1–2 s depois, e assim a tela já atualiza.
   * Nunca lança — se falhar, o webhook credita na mesma. Devolve o resumo do motor ou null.
   */
  async function sincronizarAposCompra(customerInfo, { teamId = null } = {}) {
    try {
      return await sincronizar(customerInfo, teamId);
    } catch (e) {
      console.warn('[loja] sincronizar depois da compra:', e?.message);
      return null;
    }
  }

  /**
   * "Restaurar compras": o SDK pergunta à loja o que esta conta da loja já pagou, e o motor
   * credita só o que ainda não estava creditado. Devolve { ok: true, resumo } — o resumo do
   * motor: { creditadas, ja_existiam, nao_confirmadas, recusadas } — ou { ok: false, erro }.
   */
  async function restaurar() {
    if (!(await pronta())) return INDISPONIVEL;
    try {
      const { customerInfo } = await sdk.restorePurchases();
      const resumo = await sincronizar(customerInfo);
      return { disponivel: true, ok: true, resumo };
    } catch (e) {
      console.warn('[loja] restaurar:', e?.code, e?.message);
      const erro = e?.code === 'COMPRAS_INDISPONIVEL' ? 'Restaurar compras não está disponível agora.' : mensagemDoErro(e);
      return { disponivel: true, ok: false, erro };
    }
  }

  return { lojaDisponivel, iniciarLoja, sairDaLoja, produtosDaLoja, comprar, restaurar, sincronizarAposCompra };
}

const loja = criarLoja({
  Purchases,
  plataforma: () => Capacitor.getPlatform(),
  chaves: { ios: import.meta.env.VITE_RC_APPLE_KEY, android: import.meta.env.VITE_RC_GOOGLE_KEY },
  apiFetch,
});

export const { lojaDisponivel, iniciarLoja, sairDaLoja, produtosDaLoja, comprar, restaurar, sincronizarAposCompra } = loja;
