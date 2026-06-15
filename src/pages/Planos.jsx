// Futty v2.0 — Planos (/planos): Free / Pro / Elite lado a lado.
// Botões "Assinar" abrem o Checkout do Stripe; ?sucesso=1 confirma o pagamento.
import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useApi } from '../hooks/useApi';
import Topbar from '../components/Topbar';
import Toast from '../components/Toast';
import '../styles/app.css';

const PLANOS = [
  {
    id: 'free',
    nome: 'Free',
    preco: 'Grátis',
    features: ['Sorteio', 'Ranking', 'Resenha', '3 avatares IA'],
    botao: null,
  },
  {
    id: 'pro',
    nome: 'Pro ★',
    preco: 'R$9,90/mês · €2,99/mês',
    features: ['Tudo do Free', '50 avatares IA/mês', 'Sem anúncios', 'Frames exclusivos', 'Badge dourado'],
    botao: 'Assinar Pro',
  },
  {
    id: 'elite',
    nome: 'Elite 👑',
    preco: 'R$24,90/mês · €7,99/mês',
    features: ['Tudo do Pro', '100 avatares IA/mês', 'Kit Elite dourado', 'Figurinha animada (em breve)'],
    botao: 'Assinar Elite',
  },
];

export default function Planos() {
  const { data: me, reload } = useApi('/api/me');
  const planoAtual = me?.user?.plan || 'free';
  const [planoBusy, setPlanoBusy] = useState(null);
  // Deteta o regresso do checkout (?sucesso=1) já no estado inicial do toast.
  const [toast, setToast] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('sucesso') === '1'
      ? { tipo: 'success', mensagem: 'Pagamento confirmado! 🎉 O teu plano será activado em instantes.' }
      : null;
  });

  // Após o sucesso: limpa o ?sucesso=1 da URL e refaz o fetch do plano
  // (o webhook pode demorar uns segundos a processar).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sucesso') !== '1') return undefined;
    window.history.replaceState({}, '', '/planos');
    reload();
    const t = setTimeout(() => reload(), 3000);
    return () => clearTimeout(t);
  }, [reload]);

  async function assinar(plan) {
    if (planoBusy) return;
    setPlanoBusy(plan);
    try {
      // Moeda pelo idioma do browser: pt-BR → BRL; restantes → EUR.
      const moeda = navigator.language === 'pt-BR' ? 'BRL' : 'EUR';
      const data = await apiFetch('/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan, moeda }),
      });
      window.location.assign(data.url); // redireciona para o Stripe
    } catch (err) {
      setToast({ tipo: 'error', mensagem: err?.message || 'Não foi possível iniciar o pagamento.' });
      setPlanoBusy(null);
    }
  }

  return (
    <div className="app-shell">
      <Topbar title="Planos" back="/perfil" />
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
        <p style={{ textAlign: 'center', color: 'var(--label-color)', fontSize: 13, margin: '4px 0 16px' }}>
          Escolhe o teu plano Futty.
        </p>

        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollSnapType: 'x mandatory' }}>
          {PLANOS.map((p) => {
            const atual = planoAtual === p.id;
            return (
              <div
                key={p.id}
                style={{
                  flex: '0 0 auto',
                  width: 'min(78vw, 280px)',
                  scrollSnapAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  padding: 18,
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--surface-1)',
                  border: atual ? '2px solid var(--neon)' : '1px solid var(--border-subtle)',
                  boxShadow: atual ? '0 0 16px rgba(139,92,246,0.35)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#fff' }}>{p.nome}</span>
                  {atual ? (
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: 'var(--neon)', border: '1px solid var(--border-accent)', borderRadius: 'var(--radius-pill)', padding: '3px 8px', whiteSpace: 'nowrap' }}>
                      Plano actual
                    </span>
                  ) : null}
                </div>

                <div style={{ fontSize: 15, fontWeight: 700, color: '#d4a017' }}>{p.preco}</div>

                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8, flex: 1 }}>
                  {p.features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                      <Check size={15} color="#8b5cf6" style={{ flexShrink: 0 }} /> {f}
                    </li>
                  ))}
                </ul>

                {/* Botão de checkout — escondido no plano actual (já tem o badge). */}
                {p.botao && !atual ? (
                  <button
                    type="button"
                    className="btn btn--purple"
                    style={{ width: '100%' }}
                    disabled={!!planoBusy}
                    onClick={() => assinar(p.id)}
                  >
                    {planoBusy === p.id ? 'A redirecionar…' : p.botao}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </main>

      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
