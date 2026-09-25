// Futty v2.0 — O que fazer quando a sessão dá problema (Rodada 28, bloco B). Usado pelo AuthContext;
// separado dele para o teste de unidade provar as regras sem React nem rede.

/** "Sair" é SÓ deste aparelho: o padrão do Supabase ('global') derrubava a pessoa em todos os aparelhos. */
export async function sairDesteAparelho(obterSupabase) {
  const supabase = await obterSupabase();
  return supabase.auth.signOut({ scope: 'local' });
}

/**
 * O motor disse 401 (lib/api.js). Renova UMA vez — token vencido por relógio torto, por exemplo — e
 * devolve o token novo para o pedido ser repetido. Se o Supabase recusar a renovação, ou se o motor
 * recusar de novo com o token novo (`jaRenovou`), sai só deste aparelho e devolve null. Rede fora não
 * é sessão morta: devolve null sem deslogar ninguém. Pedidos simultâneos dividem a mesma renovação.
 */
export function criarTratador401(obterSupabase) {
  let renovando = null;
  return (jaRenovou) => {
    renovando ||= (async () => {
      if (!jaRenovou) {
        const supabase = await obterSupabase();
        const { data, error } = await supabase.auth.refreshSession();
        if (data?.session) return data.session.access_token;
        if (error?.name === 'AuthRetryableFetchError') return null;
      }
      await sairDesteAparelho(obterSupabase);
      return null;
    })().finally(() => { renovando = null; });
    return renovando;
  };
}
