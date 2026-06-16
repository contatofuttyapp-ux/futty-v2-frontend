// Futty v2.0 — Router principal
import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorPage from './components/ErrorPage';

// Páginas em lazy loading (cada uma no seu chunk).
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Inicio = lazy(() => import('./pages/Inicio'));
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
const Explorar = lazy(() => import('./pages/Explorar'));

// "/" → redireciona para /home (se autenticado) ou /login
function IndexRedirect() {
  const { session, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={session ? '/home' : '/login'} replace />;
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

export default function App() {
  const [loading, setLoading] = useState(true);
  return (
    <ErrorBoundary>
      {loading && <LoadingScreen onDone={() => setLoading(false)} />}
      <AuthProvider>
        <BrowserRouter>
        <Layout>
          <Suspense fallback={<LoadingScreen />}>
          <Routes>
          <Route path="/" element={<IndexRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/convite/:token" element={<ConviteRoute />} />
          {/* Vista pública do sorteio (sem login) */}
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
          {/* fallback — página inexistente */}
          <Route path="*" element={<ErrorPage mensagem="Esta página não existe." />} />
          </Routes>
          </Suspense>
        </Layout>
      </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
