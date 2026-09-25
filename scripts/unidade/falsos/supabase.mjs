// Cliente Supabase de mentira para os testes de unidade (ver ../resolver-sem-extensao.mjs): o teste
// põe em globalThis.__FUTTY_SUPABASE__ o objeto que quiser (auth.getSession, refreshSession, signOut…).
export const supabase = new Proxy({}, {
  get(_alvo, prop) {
    const real = globalThis.__FUTTY_SUPABASE__;
    if (!real) throw new Error('teste sem globalThis.__FUTTY_SUPABASE__');
    return real[prop];
  },
});
