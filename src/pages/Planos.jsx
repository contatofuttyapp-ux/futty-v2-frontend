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

// Preço por MOEDA — nunca as duas em simultâneo. A escolha segue a mesma regra do
// checkout (pt-BR → BRL, restantes → EUR). Os valores BRL mostram-se na UI mesmo que
// o price ID do Stripe ainda seja placeholder; só o checkout precisa do ID real.
const PLANOS = [
  {
    id: 'free',
    nome: 'Free',
    preco: { BRL: 'Grátis', EUR: 'Grátis' },
    features: ['Sorteio', 'Ranking', 'Resenha', '3 avatares IA'],
    botao: null,
  },
  {
    id: 'pro',
    nome: 'Pro',
    icone: 'estrela', // asset da casa — substitui o ★ do texto
    preco: { BRL: 'R$9,90/mês', EUR: '€2,99/mês' },
    features: ['Tudo do Free', '50 avatares IA/mês', 'Sem anúncios', 'Frames exclusivos', 'Badge dourado'],
    botao: 'Assinar Pro',
  },
  {
    id: 'elite',
    nome: 'Elite',
    icone: 'coroa', // asset da casa (/icons/coroa.svg), tingido a dourado — substitui o emoji 👑
    preco: { BRL: 'R$24,90/mês', EUR: '€7,99/mês' },
    features: ['Tudo do Pro', '100 avatares IA/mês', 'Kit Elite dourado'],
    botao: 'Assinar Elite',
  },
];

// FASE A — durações do sway por card. Não partilham divisores comuns úteis, por isso as
// três oscilações nunca caem em fase: a página respira em vez de pulsar em bloco.
const SWAY_DUR = { free: '7.1s', pro: '8.3s', elite: '9.7s' };

// Atmosfera: partículas douradas de fundo. Valores fixos por partícula → nunca sincronizam.
//
// A 3.56 inflou isto (6 → 12, tamanho +50%, #f5e070 dominante, tecto de opacidade
// ~0.5 → 0.75) porque os cards eram opacos e a chuva não se via por trás. Com o véu
// a 3% o pressuposto caiu: o que era compensação passou a grito. AFINAÇÃO — volta ao
// base da Figurinha: 6 partículas, tamanhos 2-4, rotação equilibrada das três cores
// (dourado-claro / dourado / branco-quente, 2+2+2 — sem dominante) e o tecto de volta
// a ~0.5 (ver o opacity do container).
// A FÍSICA NÃO MEXE: os dur/delay são os mesmos que a 3.57 recalibrou (as 6 que ficam
// mantêm os seus valores ao centésimo) e os `left` também — as que sobram são uma sim,
// uma não, para a largura continuar coberta por igual.
// Régua: sentir-se através dos cards, nunca disputar com preços/CTAs.
const PLANOS_PARTICULAS = [
  { left: 6, size: 3, cor: '#f5e070', dur: 13.8, delay: 0 },
  { left: 23, size: 2, cor: '#d4a017', dur: 12.8, delay: 5.4 },
  { left: 40, size: 4, cor: '#fff8dc', dur: 14.9, delay: 4.2 },
  { left: 57, size: 2, cor: '#f5e070', dur: 15.8, delay: 3.1 },
  { left: 74, size: 3, cor: '#d4a017', dur: 17, delay: 1.9 },
  { left: 89, size: 2, cor: '#fff8dc', dur: 18, delay: 0.8 },
];

export default function Planos() {
  const { data: me, reload } = useApi('/api/me');
  const planoAtual = me?.user?.plan || 'free';
  const [planoBusy, setPlanoBusy] = useState(null);
  // Moeda única, decidida uma vez. Ler navigator durante o render é impuro → initializer.
  // Mesma regra usada no checkout, para o preço mostrado e o cobrado nunca divergirem.
  const [moeda] = useState(() => (navigator.language === 'pt-BR' ? 'BRL' : 'EUR'));
  // Deteta o regresso do checkout (?sucesso=1) já no estado inicial do toast.
  const [toast, setToast] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('sucesso') === '1'
      ? { tipo: 'success', mensagem: 'Pagamento confirmado! Seu plano será ativado em instantes.' }
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
      // Mesma `moeda` que o UI mostra → preço exibido == preço cobrado.
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
      {/* ATMOSFERA — partículas douradas atrás dos cards. Reusa .fig-particle/futtyFall
          da figurinha; o container leva containerType:size (o keyframe usa cqh).
          FASE 3.57 — durações ×1.45 (média 10.3s → 15.0s, ~86 → ~59 px/s): com o dobro
          das partículas e +50% de tamanho, a mesma velocidade lia-se agitada.
          AFINAÇÃO — a contagem e o tamanho recuaram, mas as durações FICAM: a queda
          lenta é o que faz isto ler-se como atmosfera e não como confete. */}
      <div
        aria-hidden="true"
        // AFINAÇÃO — opacity 1 → 0.66, desfazendo a subida da 3.56. O keyframe futtyFall
        // faz pico a 0.75, por isso o tecto real das partículas é o produto dos dois:
        // 0.66 × 0.75 ≈ 0.5. O tecto vive aqui e não no keyframe porque o futtyFall é
        // partilhado com a Figurinha — mexer lá mexia na carta.
        style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none', containerType: 'size', opacity: 0.66 }}
      >
        {PLANOS_PARTICULAS.map((p, i) => (
          <span
            key={i}
            className="fig-particle"
            style={{ position: 'absolute', left: `${p.left}%`, top: '-5%', width: p.size, height: p.size, borderRadius: '50%', background: p.cor, boxShadow: `0 0 6px ${p.cor}`, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}
          />
        ))}
      </div>
      <main className="app-main" style={{ position: 'relative', zIndex: 1, paddingLeft: 16, paddingRight: 16, paddingTop: 8, paddingBottom: 12 }}>
        {/* Topbar → cards, directo. Cards EMPILHADOS, ordem Free → Pro → Elite.
            Layout compacto para caber sem scroll em viewports normais. */}
        <div style={{ display: 'grid', gap: 10, maxWidth: 460, margin: '0 auto' }}>
          {PLANOS.map((p) => {
            const atual = planoAtual === p.id;
            const heroi = p.id === 'pro'; // herói da página → levitação subtil
            const card = (
              <div
                className="hud-corners"
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: 16,
                  // FASE 3.63 — MATERIAL DE CARD DO CÂNONE: o véu do Perfil, extraído
                  // dos valores computados reais dessa página. Não é escuro translúcido
                  // (era rgba(13,13,18,0.45) + blur 4px até à 3.57) — é um VÉU BRANCO a
                  // 3%, sem blur nenhum: o card não tapa o fundo, tinge-o. As partículas
                  // passam a ver-se mais, não menos.
                  // O radius 12px do Perfil NÃO vem junto: os cantos são os 45° do
                  // .hud-corners. O Perfil é candidato a vaga; o que se herda dele é o
                  // material, não o que nele viola o cânone.
                  background: 'rgba(255, 255, 255, 0.03)',
                  // Destaque a DOURADO (era roxo) — mesma leitura do tile activo da
                  // figurinha. INTOCADO pela 3.63: a borda/glow do plano actual é
                  // hierarquia, não material. Só a borda NEUTRA adopta a do Perfil.
                  border: atual ? '2px solid #d4a017' : '1.2px solid rgba(255, 255, 255, 0.06)',
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
                    {/* Elite: a coroa cintila raro (1.2s a cada ~7s). Pro: ícone estático. */}
                    {p.icone ? (
                      <span className={p.id === 'elite' ? 'planos-coroa-twinkle' : undefined}>
                        <Icon name={p.icone} size={19} color="#d4a017" />
                      </span>
                    ) : null}
                  </span>
                  {atual ? (
                    // FASE 3.49 — cantos 45° (.hud-corners-s) em vez do radius-pill:
                    // era o último elemento redondo órfão da linguagem HUD.
                    <span className="hud-corners-s" style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: '#d4a017', border: '1px solid rgba(212,160,23,0.5)', padding: '3px 8px', whiteSpace: 'nowrap' }}>
                      Plano atual
                    </span>
                  ) : null}
                </div>

                {/* FASE 3.63 — text-shadow SÓ no preço. O véu de 3% quase não escurece,
                    por isso o texto assenta no fundo variável da página. Medido: features
                    (branco 0.8) e nome passam em todos os cenários (mín. 5.88); o preço
                    #d4a017 sobre o pico do blob DOURADO cai a 3.42 — dourado sobre
                    dourado, abaixo do AA 4.5. A sombra devolve-lhe a leitura sem mexer na
                    opacidade do card. */}
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 17, fontWeight: 700, color: '#d4a017', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{p.preco[moeda]}</div>

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
                    // FASE 3.47 — CTA dourado partilhado com o "Compartilhar" da
                    // Figurinha: gradiente, texto, altura, glow e shine vivem em
                    // .cta-gold/.cta-gold-glow (app.css). O glow deixou de pulsar; o
                    // card herói mantém o bob+sway, que continuam a dar-lhe hierarquia.
                    <div className="cta-gold-glow" style={{ display: 'flex' }}>
                      <button
                        type="button"
                        className="btn hud-corners cta-gold"
                        style={{ width: '100%' }}
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
            // FASE A — SUSPENSÃO. Os três cards ganham sombra no chão + sway; só o Pro
            // faz bob, e só a sombra dele responde em contra-fase.
            //
            // A ordem das camadas mudou face à 3.40, por física: antes a sombra vivia
            // DENTRO do .planos-bob e subia com o card — uma sombra que acompanha o
            // objecto não é sombra, é decalque. Agora o wrapper exterior é estático, a
            // sombra fica no chão, e só o card sobe por cima dela.
            return (
              <div key={p.id} style={{ position: 'relative' }}>
                <div
                  className={heroi ? 'planos-shadow' : undefined}
                  aria-hidden="true"
                  style={{ position: 'absolute', left: '14%', bottom: -7, width: '72%', height: 10, background: 'radial-gradient(ellipse, rgba(0,0,0,0.4), transparent 70%)', filter: 'blur(10px)', pointerEvents: 'none', zIndex: 0 }}
                />
                <div className={heroi ? 'planos-bob' : undefined} style={{ position: 'relative', zIndex: 1 }}>
                  <div className="planos-sway" style={{ animationDuration: SWAY_DUR[p.id] }}>{card}</div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
