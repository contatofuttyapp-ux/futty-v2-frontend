// Futty v2.0 — Router principal
import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PerfilProvider } from './context/PerfilContext';
import { SessaoProvider } from './context/SessaoContext';
import { I18nProvider } from './context/I18nContext';
import { useAuth } from './hooks/useAuth';
import AuthGuard from './components/AuthGuard';
import SuperAdminGuard from './components/SuperAdminGuard';
import CookieBanner from './components/CookieBanner';
import RouteTitle from './components/RouteTitle';
import MedidorNavegacao from './components/MedidorNavegacao';
import DeepLinkListener from './components/DeepLinkListener';
import Layout from './components/Layout';
import LoadingFutty from './components/LoadingFutty';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorPage from './components/ErrorPage';
import PageTransition from './components/PageTransition';
import { lazyComRetry } from './utils/lazyComRetry';
import { caminhoNovoDeEquipa } from './lib/rotasAntigas';
import {
  importarInicio,
  importarFeed,
  importarRanking,
  importarFigurinha,
  importarMeuPerfil,
} from './lib/preaquecerAbas';

// Páginas em lazy loading (cada uma no seu chunk), com retry (ver utils/lazyComRetry.js) para quando
// o chunk falha a carregar (deploy novo publicado com a pessoa já de app aberto, ou resposta ruim
// transitória da CDN).
//
// As cinco abas da barra de baixo importam-se através de lib/preaquecerAbas.js: são as MESMAS funções
// que a BottomNav usa para as pré-carregar em ócio. Partilhar a função é o que garante que
// pré-aquecer e navegar falam do mesmo módulo — o registo do browser devolve a mesma promessa.
const Login = lazyComRetry(() => import('./pages/Login'));
const Register = lazyComRetry(() => import('./pages/Register'));
const ForgotPassword = lazyComRetry(() => import('./pages/ForgotPassword'));
const Inicio = lazyComRetry(importarInicio);
const Onboarding = lazyComRetry(() => import('./pages/Onboarding'));
const SorteioShow = lazyComRetry(() => import('./pages/SorteioShow'));
const CriarEquipa = lazyComRetry(() => import('./pages/CriarEquipa'));
const Equipa = lazyComRetry(() => import('./pages/Equipa'));
const Convite = lazyComRetry(() => import('./pages/Convite'));
const Jogos = lazyComRetry(() => import('./pages/Jogos'));
const NovoJogo = lazyComRetry(() => import('./pages/NovoJogo'));
const JogoPassado = lazyComRetry(() => import('./pages/JogoPassado'));
const Jogo = lazyComRetry(() => import('./pages/Jogo'));
const Ranking = lazyComRetry(importarRanking);
const Campeonato = lazyComRetry(() => import('./pages/Campeonato'));
const JogadorPerfil = lazyComRetry(() => import('./pages/JogadorPerfil'));
const AdminPanel = lazyComRetry(() => import('./pages/AdminPanel'));
const AlterarPassword = lazyComRetry(() => import('./pages/AlterarPassword'));
const Feed = lazyComRetry(importarFeed);
const Figurinha = lazyComRetry(importarFigurinha);
const MeuPerfil = lazyComRetry(importarMeuPerfil);
const Planos = lazyComRetry(() => import('./pages/Planos'));
const SorteioPublico = lazyComRetry(() => import('./pages/SorteioPublico'));
const SorteioCurto = lazyComRetry(() => import('./pages/SorteioCurto'));
const CampeonatoPublico = lazyComRetry(() => import('./pages/CampeonatoPublico'));
const Explorar = lazyComRetry(() => import('./pages/Explorar'));
const LandingPage = lazyComRetry(() => import('./pages/LandingPage'));
const Super = lazyComRetry(() => import('./pages/Super'));
const Gabinete = lazyComRetry(() => import('./pages/Gabinete'));
const Termos = lazyComRetry(() => import('./pages/Termos'));
const Privacidade = lazyComRetry(() => import('./pages/Privacidade'));
const ExcluirConta = lazyComRetry(() => import('./pages/ExcluirConta'));
const Diagnostico = lazyComRetry(() => import('./pages/Diagnostico'));

// "/" → /home se autenticado; senão a landing page (visitante).
// O `loading` é o do AuthProvider e só é verdade quando NÃO há sessão guardada no aparelho: com sessão,
// o AuthProvider já nasce com ela (leitura síncrona do localStorage) e nunca se passa por aqui. Quem
// chega a ver este F é o visitante de primeira viagem, e só enquanto o Supabase responde.
function IndexRedirect() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingFutty motivo="sessao" />;
  if (session) return <Navigate to="/home" replace />;
  return <LandingPage />;
}

// O 404 de quem não tem sessão leva à landing e ao cadastro; o de quem tem, ao Início e ao Explorar.
function PaginaNaoEncontrada() {
  const { session } = useAuth();
  return <ErrorPage titulo="Página não encontrada" mensagem="Esta página não existe." semSessao={!session} />;
}

// As rotas em português de Portugal (/equipa/…, /criar-equipa) viraram /time/… e /criar-time. As antigas
// CONTINUAM valendo — link que já foi para o grupo do WhatsApp, favorito, notificação já enviada — e levam
// para as novas, com a query (?entrou=1), o # e o state de quem chegou.
function RedirecionaEquipa() {
  const { pathname, search, hash, state } = useLocation();
  return <Navigate to={`${caminhoNovoDeEquipa(pathname)}${search}${hash}`} replace state={state} />;
}

// Remonta a página do time quando o slug muda (reinicia o estado de loading)
function EquipaRoute() {
  const { slug } = useParams();
  return <Equipa key={slug} />;
}

// Remonta a página de convite quando o token muda
function ConviteRoute() {
  const { token } = useParams();
  return <Convite key={token} />;
}

// Remonta a página do jogo quando o id muda
function JogoRoute() {
  const { id } = useParams();
  return <Jogo key={id} />;
}

// Rotas que exigem login: [caminho, tela, só super-admin?]. A ordem não manda (o roteador
// escolhe a rota mais específica); só agrupa por assunto.
const ROTAS_PRIVADAS = [
  ['/home', Inicio],
  ['/onboarding', Onboarding],
  ['/criar-time', CriarEquipa],
  ['/time/:slug', EquipaRoute],
  ['/time/:slug/jogos', Jogos],
  ['/time/:slug/ranking', Ranking],
  // Sem :slug: para onde a BottomNav manda quem ainda não tem time (ver `rankingTo` em
  // BottomNav.jsx). O próprio Ranking.jsx detecta a ausência do slug e mostra o convite a
  // criar/entrar.
  ['/ranking', Ranking],
  ['/time/:slug/campeonato', Campeonato],
  ['/time/:slug/campeonato/:id', Campeonato],
  ['/time/:slug/jogador/:userId', JogadorPerfil],
  ['/time/:slug/jogo/novo', NovoJogo],
  ['/time/:slug/jogo/passado', JogoPassado], // O passo a passo (abre de "Jogo passado →" no Marcar jogo)
  ['/time/:slug/jogo/:id/sorteio', SorteioShow],
  ['/time/:slug/jogo/:id', JogoRoute],
  ['/admin/:slug', AdminPanel],
  ['/feed', Feed],
  ['/figurinha', Figurinha],
  // A caixa-preta do app: só o super-admin, pelo Gabinete; o número de todo mundo vem da telemetria
  // anônima (sem botão).
  ['/diagnostico', Diagnostico, true],
  ['/perfil', MeuPerfil],
  ['/planos', Planos],
  ['/alterar-password', AlterarPassword],
  ['/explorar', Explorar],
  ['/super', Super, true],
  ['/gabinete', Gabinete, true],
];

// Rotas animadas: o PageTransition (keyed pelo pathname) faz o fade/deslize de
// entrada em CSS. Trocar a key remonta o div e é isso que recomeça o keyframe.
//
// Sem <AnimatePresence mode="wait">: ele seguraria a página nova até a animação de SAÍDA da antiga
// acabar, ou seja, poria a visibilidade do app atrás de uma animação JS ter de terminar — exatamente
// o que fez o app abrir invisível (ver components/PageTransition.jsx). Uma saída de 0,18s não paga
// esse risco, e sem ela o React troca a página na hora.
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <Suspense fallback={<LoadingFutty motivo="codigo" />}>
      <PageTransition key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<IndexRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/termos" element={<Termos />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="/excluir-conta" element={<ExcluirConta />} />
          {/* Os endereços antigos: redirecionam para /time e /criar-time. */}
          <Route path="/equipa/*" element={<RedirecionaEquipa />} />
          <Route path="/equipa" element={<RedirecionaEquipa />} />
          <Route path="/criar-equipa" element={<Navigate to="/criar-time" replace />} />
          {/* A página do Avise-me saiu (a inicial já é a de verdade); os links antigos das redes caem na inicial. */}
          <Route path="/avise-me" element={<Navigate to="/" replace />} />
          <Route path="/convite/:token" element={<ConviteRoute />} />
          {/* O link curto do convite, futtyapp.com.br/c/<código> — a mesma tela. */}
          <Route path="/c/:token" element={<ConviteRoute />} />
          {/* Vista pública do sorteio (sem login) */}
          <Route path="/p/campeonato/:slug/:id" element={<CampeonatoPublico />} />
          <Route path="/p/:slug/:gameId" element={<SorteioPublico />} />
          {/* O link curto do sorteio, futtyapp.com.br/s/<código> — leva à vista pública de sempre. */}
          <Route path="/s/:codigo" element={<SorteioCurto />} />
          {/* As rotas com login vêm da tabela ROTAS_PRIVADAS (um <Route> + AuthGuard
              repetido 25 vezes custava ~1,4 KB do arranque). */}
          {ROTAS_PRIVADAS.map(([path, Tela, soSuper]) => (
            <Route
              key={path}
              path={path}
              element={<AuthGuard>{soSuper ? <SuperAdminGuard><Tela /></SuperAdminGuard> : <Tela />}</AuthGuard>}
            />
          ))}
          {/* fallback — página inexistente */}
          <Route path="*" element={<PaginaNaoEncontrada />} />
        </Routes>
      </PageTransition>
    </Suspense>
  );
}

// Sem tempo artificial no arranque: o único loading é o LoadingFutty, e só enquanto a sessão for mesmo
// desconhecida (um overlay fixo de 1200 ms + 400 ms de fade era cobrado de quem já tinha tudo em
// cache). No app da loja quem cobre o boot é a tela de abertura do sistema, que sai quando a WebView pinta.
export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <AuthProvider>
          <PerfilProvider>
            <BrowserRouter>
              {/* SessaoProvider tem de ficar ACIMA do Layout: o Layout lê equipas no
                  seu próprio corpo (rankingTo da BottomNav), e o InicioProvider é
                  montado como FILHO do Layout — um contexto só é visível para
                  descendentes, nunca para quem o envolve. */}
              <SessaoProvider>
                <RouteTitle />
                <MedidorNavegacao />
                <DeepLinkListener />
                <Layout>
                  <AnimatedRoutes />
                </Layout>
                <CookieBanner />
              </SessaoProvider>
            </BrowserRouter>
          </PerfilProvider>
        </AuthProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
