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
import {
  importarInicio,
  importarFeed,
  importarRanking,
  importarFigurinha,
  importarMeuPerfil,
} from './lib/preaquecerAbas';

// Páginas em lazy loading (cada uma no seu chunk), com retry (build 10 —
// ver utils/lazyComRetry.js) para quando o chunk falha a carregar (deploy
// novo publicado com a pessoa já de app aberto, ou resposta ruim transitória
// da CDN).
//
// As cinco abas da barra de baixo importam-se através de lib/preaquecerAbas.js:
// são as MESMAS funções que a BottomNav usa para as pré-carregar em ócio
// (VELOCIDADE 4). Partilhar a função é o que garante que pré-aquecer e navegar
// falam do mesmo módulo — o registo do browser devolve a mesma promessa.
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
//
// VELOCIDADE 5 (14-set) — este `loading` é o do AuthProvider e agora só é verdade
// quando NÃO há sessão guardada no aparelho: com sessão, o AuthProvider já nasce
// com ela (leitura síncrona do localStorage) e nunca se passa por aqui. Quem chega
// a ver este F é o visitante de primeira viagem, e só enquanto o Supabase responde.
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

// Rotas animadas: o PageTransition (keyed pelo pathname) faz o fade/deslize de
// entrada em CSS. Trocar a key remonta o div e é isso que recomeça o keyframe.
//
// BUILD 11 — SAIU O <AnimatePresence mode="wait">. Servia para segurar a página
// nova até a animação de SAÍDA da antiga acabar; ou seja, punha a visibilidade
// do app atrás de uma animação JS ter de terminar — exatamente o que fez o app
// abrir invisível (ver components/PageTransition.jsx). Uma saída de 0,18s não
// paga esse risco, e sem ela o React troca a página na hora.
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <Suspense fallback={<LoadingFutty />}>
      <PageTransition key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<IndexRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/termos" element={<Termos />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="/excluir-conta" element={<ExcluirConta />} />
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
          {/* Sem :slug: para onde a BottomNav manda quem ainda não tem time
              (ver `rankingTo` em BottomNav.jsx). O próprio Ranking.jsx detecta
              a ausência do slug e mostra o convite a criar/entrar. */}
          <Route
            path="/ranking"
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
          {/* VELOCIDADE 4 — a caixa-preta do app, aberta a toda gente durante o
              teste: quem sente a lentidão é quem tem o aparelho na mão. */}
          <Route
            path="/diagnostico"
            element={
              <AuthGuard>
                <Diagnostico />
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
    </Suspense>
  );
}

// VELOCIDADE 5 (14-set) — SEM TEMPO ARTIFICIAL no arranque. Havia aqui um overlay
// que ficava 1200 ms fixos mais 400 ms de fade, em TODA abertura, olhasse ou não o
// app para o que já estava pronto: um segundo e meio cobrado a quem já tinha tudo
// em cache. O único loading de arranque passa a ser o LoadingFutty, e só enquanto
// a sessão for mesmo desconhecida. No app da loja quem cobre o boot é a tela de
// abertura do sistema, que sai quando a WebView pinta — o overlay duplicava-a.
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
