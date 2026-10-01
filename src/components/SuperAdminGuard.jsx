// Futty v2.0 — Protege /super e /gabinete: só super-admins.
// Antes redirecionava para /home EM SILÊNCIO (o clique parecia "engolido"). Agora
// mostra um estado "sem permissão" digno, na linguagem da casa, com saída para o
// Início — o utilizador percebe porque não entrou. Sem revelar o que a área contém.
import ErrorPage from './ErrorPage';
import { usePerfil } from '../context/PerfilContext';
import LoadingFutty from './LoadingFutty';

export default function SuperAdminGuard({ children }) {
  const { perfil: me, carregando: loading, deCache } = usePerfil();

  // deCache (14-set): bloqueio/permissão desta área nunca decide a partir do
  // cache local — mesma regra do OnboardingGate/suspenso, senão um admin
  // recém-promovido (ou rebaixado) veria por um instante o ecrã errado até o
  // /api/me fresco confirmar.
  if (loading || deCache) {
    return <LoadingFutty />;
  }

  if (me?.user?.is_super_admin !== true) {
    // Rodada 29B (D.3): o layout é o do ErrorPage (era uma cópia dele aqui).
    return (
      <ErrorPage
        titulo="Sem permissão"
        mensagem="Esta área é reservada à administração do Futty. Sua conta não tem acesso."
        acao={{ rotulo: 'Voltar ao início', aoTocar: () => { window.location.href = '/home'; } }}
      />
    );
  }

  return children;
}
