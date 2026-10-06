// Futty v2.0 — O cliente Supabase POR PEDIDO.
//
// Com o supabase-js no arranque, o chunk de 201 KB que o index.html manda pré-carregar leva o nome
// "futtyMonograma" — que não tem nada de monograma: os dois caminhos do F são 700 bytes. O chunk é o
// @supabase/supabase-js inteiro. O rolldown junta os módulos partilhados num chunk só e batiza-o pelo
// primeiro que lhe aparece; o nome mente, e a leitura que se faz dele ("os caminhos SVG do F pesam 201 KB")
// manda consertar a coisa errada.
//
// 201 KB é um TERÇO de tudo o que o arranque tem de compilar — e compilar é exactamente o que dói na 1ª
// abertura depois de instalar/atualizar, quando o WebKit ainda não tem cache de bytecode. E não é preciso: a
// sessão que o app usa para desenhar a 1ª tela é lida do localStorage de forma SÍNCRONA (AuthContext,
// "sessão otimista"), sem tocar no supabase-js.
//
// Então o cliente chega por import dinâmico. Quem o pede primeiro é o próprio AuthProvider, no efeito de
// montagem — ou seja, o download começa no mesmo instante em que começaria com um import estático; a 1ª
// pintura é que não espera pela COMPILAÇÃO dele.
//
// A promessa é guardada: o registo de módulos do browser devolve sempre a mesma para o mesmo import(), e o
// createClient corre uma vez só (dois clientes na mesma página disputariam o refresh do token).
//
// Quem importa './supabase' DIRETO continua a poder fazê-lo: são telas em lazy (Login, Register,
// ForgotPassword, AlterarPassword, Figurinha), e o chunk delas já carrega fora do arranque. O que não pode
// acontecer é um import estático a partir da raiz (App.jsx e o que ele arrasta) — é isso que põe o
// supabase-js no modulepreload.
let promessa = null;

/** O cliente Supabase, quando ele chegar. Guarda a promessa: uma só instância. */
export function obterSupabase() {
  if (!promessa) promessa = import('./supabase').then((m) => m.supabase);
  return promessa;
}
