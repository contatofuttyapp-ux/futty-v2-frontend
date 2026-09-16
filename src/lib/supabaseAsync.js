// Futty v2.0 — O cliente Supabase POR PEDIDO (VELOCIDADE 8, 16-set).
//
// ACHADO: o chunk de 201 KB que o index.html mandava pré-carregar com o nome
// "futtyMonograma" não tem nada de monograma — os dois caminhos do F são 700
// bytes. O chunk é o @supabase/supabase-js inteiro. O rolldown junta os módulos
// partilhados num chunk só e batiza-o pelo primeiro que lhe aparece; o nome
// mentia, e a leitura que se fazia dele ("os caminhos SVG do F pesam 201 KB")
// mandava consertar a coisa errada.
//
// 201 KB é um TERÇO de tudo o que o arranque tinha de compilar — e compilar é
// exactamente o que dói na 1ª abertura depois de instalar/atualizar, quando o
// WebKit ainda não tem cache de bytecode. E não é preciso: a sessão que o app
// usa para desenhar a 1ª tela é lida do localStorage de forma SÍNCRONA
// (AuthContext, "sessão otimista" da Velocidade 5), sem tocar no supabase-js.
//
// Então o cliente passa a chegar por import dinâmico. Quem o pede primeiro é o
// próprio AuthProvider, no efeito de montagem — ou seja, o download começa no
// mesmo instante em que começaria antes; o que muda é que a 1ª pintura já não
// espera pela COMPILAÇÃO dele.
//
// A promessa é guardada: o registo de módulos do browser devolve sempre a mesma
// para o mesmo import(), e o createClient corre uma vez só (dois clientes na
// mesma página disputariam o refresh do token).
//
// Quem importa './supabase' DIRETO continua a poder fazê-lo: são telas em lazy
// (Login, Register, ForgotPassword, AlterarPassword, Figurinha), e o chunk delas
// já carrega fora do arranque. O que não pode voltar a acontecer é um import
// estático a partir da raiz (App.jsx e o que ele arrasta) — era isso que punha
// o supabase-js no modulepreload.
let promessa = null;

/** O cliente Supabase, quando ele chegar. Guarda a promessa: uma só instância. */
export function obterSupabase() {
  if (!promessa) promessa = import('./supabase').then((m) => m.supabase);
  return promessa;
}
