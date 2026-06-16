// Futty v2.0 — Onboarding (3 passos) para quem entra numa equipa pela 1ª vez.
// Slide entre passos via AnimatePresence + PageTransition. X fecha em qualquer passo.
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './PageTransition';

export default function OnboardingModal({ teamNome, onClose }) {
  const passos = [
    {
      icon: '⚽',
      titulo: `Bem-vindo ao ${teamNome || 'time'}!`,
      texto: 'Aqui organizamos os sorteios, registamos os resultados e acompanhamos o ranking.',
      botao: 'Próximo →',
    },
    {
      icon: '🃏',
      titulo: 'A tua figurinha',
      texto: 'Cria a tua figurinha personalizada. Adiciona uma foto e gera o teu avatar IA estilo cromo Panini.',
      botao: 'Próximo →',
    },
    {
      icon: '📋',
      titulo: 'Confirma a tua presença',
      texto: 'Antes de cada jogo, confirma se vais. O admin sorteia os times só com quem confirmou.',
      botao: 'Entrar →',
    },
  ];

  const [passo, setPasso] = useState(0);
  const atual = passos[passo];

  function avancar() {
    if (passo < passos.length - 1) setPasso((p) => p + 1);
    else onClose();
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 'min(92vw, 380px)',
          background: 'var(--surface-1)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px 24px 24px',
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        {/* X para fechar */}
        <button
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          style={{ position: 'absolute', top: 12, right: 14, border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 22, lineHeight: 1, cursor: 'pointer' }}
        >
          ×
        </button>

        <AnimatePresence mode="wait">
          <PageTransition key={passo}>
            <div style={{ fontSize: 48, lineHeight: 1 }}>{atual.icon}</div>
            <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 22, color: '#fff', marginTop: 14 }}>
              {atual.titulo}
            </h2>
            <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.55, color: 'rgba(255,255,255,0.8)' }}>
              {atual.texto}
            </p>
          </PageTransition>
        </AnimatePresence>

        {/* Dots de paginação */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          {passos.map((_, i) => (
            <span
              key={i}
              style={{ width: i === passo ? 20 : 8, height: 8, borderRadius: 999, background: i === passo ? 'var(--neon)' : 'rgba(255,255,255,0.2)', transition: 'all 0.25s ease' }}
            />
          ))}
        </div>

        <button type="button" className="btn btn--primary" style={{ width: '100%', marginTop: 18 }} onClick={avancar}>
          {atual.botao}
        </button>
      </div>
    </div>
  );
}
