// Futty v2.0 — Protege /super e /gabinete: só super-admins.
// Antes redirecionava para /home EM SILÊNCIO (o clique parecia "engolido"). Agora
// mostra um estado "sem permissão" digno, na linguagem da casa, com saída para o
// Início — o utilizador percebe porque não entrou. Sem revelar o que a área contém.
import FuttyLoader from './FuttyLoader';
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
          Sem permissão
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, maxWidth: 280, lineHeight: 1.5, margin: 0 }}>
          Esta área é reservada à administração do Futty. Sua conta não tem acesso.
        </p>
        <div className="cta-gold-glow" style={{ display: 'flex', width: '100%', maxWidth: 260, marginTop: 4 }}>
          <button
            type="button"
            className="btn hud-corners cta-gold"
            style={{ width: '100%' }}
            onClick={() => { window.location.href = '/home'; }}
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return children;
}
