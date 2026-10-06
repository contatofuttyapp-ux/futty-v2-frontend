// Futty v2.0 — Página de erro (404 / crash), na linguagem da casa.
//
// Sem Lottie: o pacote `lottie-react` tem duplo default (interop CJS→ESM) — o default é o objecto
// {LottiePlayer, default, useLottie, useLottieInteractivity}, não o componente — e o React rebentaria com
// "Element type is invalid... got: object". Como esta é justamente a página que o ErrorBoundary mostra,
// QUALQUER 404 ou crash daria ECRÃ BRANCO: o bug se esconderia a si próprio. Em vez de remendar o import,
// entra o F da casa (o mesmo FuttyLoader de todo o app): menos uma dependência, menos um asset, e a página
// de erro fala a linguagem do resto.
import FuttyLoader from './FuttyLoader';

// É também a tela cheia dos avisos do shell — "Conta suspensa" (AuthGuard) e "Sem permissão"
// (SuperAdminGuard) usam este layout, em vez de cópias dele (~1 KB do arranque, que tem teto).
//   acao          — { rotulo, aoTocar }: troca o botão de ouro e tira o 2º elo (retry/descobrir peladas).
//   larguraTexto  — maxWidth do parágrafo (padrão 280).
//   semSessao     — a pessoa ainda não tem conta. O "início" dela é a landing (o /home a mandaria para o
//                   login) e a porta alternativa é criar a conta: o Explorar exige conta, então oferecê-lo
//                   aqui seria um beco que terminaria no login.
export default function ErrorPage({ onRetry, mensagem, titulo, acao, larguraTexto = 280, semSessao = false }) {
  const irAoInicio = () => { window.location.href = semSessao ? '/' : '/home'; };
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#050810',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <FuttyLoader size={110} label={null} />

      <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: '0.06em', color: '#fff', margin: 0 }}>
        {titulo || 'Algo deu errado'}
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, maxWidth: larguraTexto, lineHeight: 1.5, margin: 0 }}>
        {mensagem || 'O servidor está descansando. Tente de novo daqui a pouco.'}
      </p>

      {/* Sem linha técnica em letra pequena: seria inglês cru ("Failed to fetch dynamically imported module…")
          numa tela que fala com a pessoa. A mensagem técnica fica no console e no Diagnóstico (lib/ultimoErro). */}

      {/* A acção primária (ouro) tira o utilizador do beco: se há como repetir, repete;
          senão, leva ao Início (onde vivem os próximos jogos). O 2º elo é uma porta
          alternativa real — descobrir peladas — para o 404 nunca ser um fim de linha. */}
      <div style={{ display: 'grid', justifyItems: 'center', gap: 12, marginTop: 4, width: '100%', maxWidth: 260 }}>
        <div className="cta-gold-glow" style={{ display: 'flex', width: '100%' }}>
          <button
            type="button"
            className="btn hud-corners cta-gold"
            style={{ width: '100%' }}
            onClick={acao ? acao.aoTocar : onRetry || irAoInicio}
          >
            {acao ? acao.rotulo : onRetry ? 'Tentar novamente' : 'Voltar ao início'}
          </button>
        </div>
        {acao ? null : onRetry ? (
          <button
            type="button"
            className="btn btn--purple-outline hud-corners"
            style={{ width: '100%', height: 42, fontSize: 14 }}
            onClick={irAoInicio}
          >
            Voltar ao início
          </button>
        ) : (
          <a
            href={semSessao ? '/register' : '/explorar'}
            data-porta-alternativa={semSessao ? 'criar-conta' : 'explorar'}
            style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            {semSessao ? 'Ou crie sua conta' : 'Ou descubra times perto de você'}
          </a>
        )}
      </div>
    </div>
  );
}
