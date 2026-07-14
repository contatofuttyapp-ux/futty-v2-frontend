// Futty v2.0 — Planos (/planos): Free / Pro / Elite lado a lado.
// Botões "Assinar" abrem o Checkout do Stripe; ?sucesso=1 confirma o pagamento.
import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useApi } from '../hooks/useApi';
import Topbar from '../components/Topbar';
import Toast from '../components/Toast';
import Icon from '../components/Icon';
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
    nome: 'Pro',
    icone: 'estrela', // asset da casa — substitui o ★ do texto
    preco: 'R$9,90/mês · €2,99/mês',
    features: ['Tudo do Free', '50 avatares IA/mês', 'Sem anúncios', 'Frames exclusivos', 'Badge dourado'],
    botao: 'Assinar Pro',
  },
  {
    id: 'elite',
    nome: 'Elite',
    icone: 'coroa', // asset da casa (/icons/coroa.svg), tingido a dourado — substitui o emoji 👑
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
      ? { tipo: 'success', mensagem: 'Pagamento confirmado! 🎉 O teu plano será ativado em instantes.' }
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
      {/* Linguagem da Figurinha: topbar HUD (wordmark dourado + linha com degrau 45°).
          `back` mantido — esta página não está na bottom nav. */}
      <Topbar hud="PLANOS" back="/perfil" />
      {/* paddings do .app-main apertados (default 32/64 = 96px de espaço morto): os 3
          cards + CTAs passam a caber sem scroll em 390×844 e 430×932. O padding
          inferior mantém folga para a bottom nav fixa (75px). */}
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 8, paddingBottom: 12 }}>
        {/* Topbar → cards, directo. Cards EMPILHADOS, ordem Free → Pro → Elite.
            Layout compacto para caber sem scroll em viewports normais. */}
        <div style={{ display: 'grid', gap: 10, maxWidth: 460, margin: '0 auto' }}>
          {PLANOS.map((p) => {
            const atual = planoAtual === p.id;
            return (
              <div
                key={p.id}
                className="hud-corners"
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: 16,
                  background: 'var(--surface-1)',
                  // Destaque a DOURADO (era roxo) — mesma leitura do tile activo da figurinha.
                  border: atual ? '2px solid #d4a017' : '1px solid var(--border-subtle)',
                  boxShadow: atual ? '0 0 14px rgba(212,160,23,0.45)' : 'none',
                }}
              >
                {/* Losango decorativo discreto no card destacado. */}
                {atual ? (
                  <span aria-hidden="true" style={{ position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 1, transform: 'rotate(45deg)', background: 'linear-gradient(135deg, #f5e070, #d4a017)' }} />
                ) : null}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#fff' }}>{p.nome}</span>
                    {p.icone ? <Icon name={p.icone} size={19} color="#d4a017" /> : null}
                  </span>
                  {atual ? (
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: '#d4a017', border: '1px solid rgba(212,160,23,0.5)', borderRadius: 'var(--radius-pill)', padding: '3px 8px', whiteSpace: 'nowrap' }}>
                      Plano atual
                    </span>
                  ) : null}
                </div>

                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 17, fontWeight: 700, color: '#d4a017' }}>{p.preco}</div>

                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 5, flex: 1 }}>
                  {p.features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, lineHeight: 1.25, color: 'rgba(255,255,255,0.8)' }}>
                      <Check size={15} color="#8b5cf6" style={{ flexShrink: 0 }} /> {f}
                    </li>
                  ))}
                </ul>

                {/* Botão de checkout — escondido no plano actual (já tem o badge).
                    Hierarquia da Figurinha: o CTA principal (Pro, o do ★) leva o
                    gradiente dourado + texto escuro; os restantes ficam em outline
                    roxo recuado. Lógica de checkout inalterada. */}
                {p.botao && !atual ? (
                  p.id === 'pro' ? (
                    <div style={{ display: 'flex', filter: 'drop-shadow(0 0 9px rgba(212,160,23,0.4))' }}>
                      <button
                        type="button"
                        className="btn hud-corners"
                        style={{ width: '100%', border: 'none', fontWeight: 800, color: '#0d0d12', background: 'linear-gradient(135deg, #f0c94a, #d4a017, #b8860b)' }}
                        disabled={!!planoBusy}
                        onClick={() => assinar(p.id)}
                      >
                        {planoBusy === p.id ? 'Redirecionando…' : p.botao}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--purple-outline hud-corners"
                      style={{ width: '100%', borderColor: 'rgba(139,92,246,0.5)', color: 'rgba(255,255,255,0.85)' }}
                      disabled={!!planoBusy}
                      onClick={() => assinar(p.id)}
                    >
                      {planoBusy === p.id ? 'Redirecionando…' : p.botao}
                    </button>
                  )
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
