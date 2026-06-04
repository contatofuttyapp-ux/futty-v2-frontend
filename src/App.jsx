// Futty v2.0 — Router principal
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthGuard from './components/AuthGuard';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import CriarEquipa from './pages/CriarEquipa';
import Equipa from './pages/Equipa';
import Convite from './pages/Convite';
import Jogos from './pages/Jogos';
import NovoJogo from './pages/NovoJogo';
import Jogo from './pages/Jogo';
import Ranking from './pages/Ranking';
import JogadorPerfil from './pages/JogadorPerfil';

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
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<IndexRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/convite/:token" element={<ConviteRoute />} />
          <Route
            path="/home"
            element={
              <AuthGuard>
                <Home />
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
          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
