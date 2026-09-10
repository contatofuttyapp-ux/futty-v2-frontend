// Futty v2.0 — Router principal
import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { PerfilProvider } from './context/PerfilContext';
import { I18nProvider } from './context/I18nContext';
import { useAuth } from './hooks/useAuth';
import AuthGuard from './components/AuthGuard';
import SuperAdminGuard from './components/SuperAdminGuard';
import CookieBanner from './components/CookieBanner';
import RouteTitle from './components/RouteTitle';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import LoadingFutty from './components/LoadingFutty';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorPage from './components/ErrorPage';
import PageTransition from './components/PageTransition';

// Páginas em lazy loading (cada uma no seu chunk).
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Inicio = lazy(() => import('./pages/Inicio'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const SorteioShow = lazy(() => import('./pages/SorteioShow'));
const CriarEquipa = lazy(() => import('./pages/CriarEquipa'));
const Equipa = lazy(() => import('./pages/Equipa'));
const Convite = lazy(() => import('./pages/Convite'));
const Jogos = lazy(() => import('./pages/Jogos'));
const NovoJogo = lazy(() => import('./pages/NovoJogo'));
const Jogo = lazy(() => import('./pages/Jogo'));
const Ranking = lazy(() => import('./pages/Ranking'));
const Campeonato = lazy(() => import('./pages/Campeonato'));
const JogadorPerfil = lazy(() => import('./pages/JogadorPerfil'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const AlterarPassword = lazy(() => import('./pages/AlterarPassword'));
const Feed = lazy(() => import('./pages/Feed'));
const Figurinha = lazy(() => import('./pages/Figurinha'));
const MeuPerfil = lazy(() => import('./pages/MeuPerfil'));
const Planos = lazy(() => import('./pages/Planos'));
const SorteioPublico = lazy(() => import('./pages/SorteioPublico'));
const CampeonatoPublico = lazy(() => import('./pages/CampeonatoPublico'));
const Explorar = lazy(() => import('./pages/Explorar'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Super = lazy(() => import('./pages/Super'));
const Gabinete = lazy(() => import('./pages/Gabinete'));
const Termos = lazy(() => import('./pages/Termos'));
const Privacidade = lazy(() => import('./pages/Privacidade'));

// "/" → /home se autenticado; senão a landing page (visitante).
//
// VAGA 1 (B2) — o `loading` aqui é o do AuthProvider: dura o que o getSession() do
// Supabase demorar, e isso não tem prazo. O LoadingScreen do arranque, esse, sai a
// horas fixas (1200ms + 400ms de fade). Quando a rede é lenta o overlay desaparece
// primeiro e este `return null` deixava o visitante a olhar para o vazio — o branco
// do arranque. Agora o F continua a desenhar-se até haver resposta.
// Os dois são fixed/inset:0 centrados com o mesmo <FuttyLoader size={129}>, por isso
// a passagem de um para o outro é invisível: o F não salta, não muda de tamanho.
// A lógica é a mesma — só o null deu lugar a um componente.
function IndexRedirect() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingFutty />;
  if (session) return <Navigate to="/home" replace />;
  return <LandingPage />;
}

// Remonta a página da equipa quando o slug muda (reinicia o estado de loading)
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

// Rotas animadas: AnimatePresence deteta a mudança de rota pela location e
// o PageTransition (keyed pelo pathname) faz o fade/deslize de saída/entrada.
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AnimatePresence mode="wait">
        <PageTransition key={location.pathname}>
          <Routes location={location}>
          <Route path="/" element={<IndexRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/termos" element={<Termos />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="/convite/:token" element={<ConviteRoute />} />
          {/* Vista pública do sorteio (sem login) */}
          <Route path="/p/campeonato/:slug/:id" element={<CampeonatoPublico />} />
          <Route path="/p/:slug/:gameId" element={<SorteioPublico />} />
          <Route
            path="/home"
            element={
              <AuthGuard>
                <Inicio />
              </AuthGuard>
            }
          />
          <Route
            path="/onboarding"
            element={
              <AuthGuard>
                <Onboarding />
              </AuthGuard>
            }
          />
          <Route
            path="/criar-equipa"
            element={
              <AuthGuard>
                <CriarEquipa />
              </AuthGuard>
            }
          />
          <Route
            path="/equipa/:slug"
            element={
              <AuthGuard>
                <EquipaRoute />
              </AuthGuard>
            }
          />
          <Route
            path="/equipa/:slug/jogos"
            element={
              <AuthGuard>
                <Jogos />
              </AuthGuard>
            }
          />
          <Route
            path="/equipa/:slug/ranking"
            element={
              <AuthGuard>
                <Ranking />
              </AuthGuard>
            }
          />
          <Route
            path="/equipa/:slug/campeonato"
            element={
              <AuthGuard>
                <Campeonato />
              </AuthGuard>
            }
          />
          <Route
            path="/equipa/:slug/campeonato/:id"
            element={
              <AuthGuard>
                <Campeonato />
              </AuthGuard>
            }
          />
          <Route
            path="/equipa/:slug/jogador/:userId"
            element={
              <AuthGuard>
                <JogadorPerfil />
              </AuthGuard>
            }
          />
          <Route
            path="/equipa/:slug/jogo/novo"
            element={
              <AuthGuard>
                <NovoJogo />
              </AuthGuard>
            }
          />
          <Route
            path="/equipa/:slug/jogo/:id/sorteio"
            element={
              <AuthGuard>
                <SorteioShow />
              </AuthGuard>
            }
          />
          <Route
            path="/equipa/:slug/jogo/:id"
            element={
              <AuthGuard>
                <JogoRoute />
              </AuthGuard>
            }
          />
          <Route
            path="/admin/:slug"
            element={
              <AuthGuard>
                <AdminPanel />
              </AuthGuard>
            }
          />
          <Route
            path="/feed"
            element={
              <AuthGuard>
                <Feed />
              </AuthGuard>
            }
          />
          <Route
            path="/figurinha"
            element={
              <AuthGuard>
                <Figurinha />
              </AuthGuard>
            }
          />
          <Route
            path="/perfil"
            element={
              <AuthGuard>
                <MeuPerfil />
              </AuthGuard>
            }
          />
          <Route
            path="/planos"
            element={
              <AuthGuard>
                <Planos />
              </AuthGuard>
            }
          />
          <Route
            path="/alterar-password"
            element={
              <AuthGuard>
                <AlterarPassword />
              </AuthGuard>
            }
          />
          <Route
            path="/explorar"
            element={
              <AuthGuard>
                <Explorar />
              </AuthGuard>
            }
          />
          <Route
            path="/super"
            element={
              <AuthGuard>
                <SuperAdminGuard>
                  <Super />
                </SuperAdminGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/gabinete"
            element={
              <AuthGuard>
                <SuperAdminGuard>
                  <Gabinete />
                </SuperAdminGuard>
              </AuthGuard>
            }
          />
          {/* fallback — página inexistente */}
          <Route path="*" element={<ErrorPage titulo="Página não encontrada" mensagem="Esta página não existe." />} />
          </Routes>
        </PageTransition>
      </AnimatePresence>
    </Suspense>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  return (
    <ErrorBoundary>
      {loading && <LoadingScreen onDone={() => setLoading(false)} />}
      <I18nProvider>
        <AuthProvider>
          <PerfilProvider>
            <BrowserRouter>
              <RouteTitle />
              <Layout>
                <AnimatedRoutes />
              </Layout>
              <CookieBanner />
            </BrowserRouter>
          </PerfilProvider>
        </AuthProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
