// Futty v2.0 — Toast simples no topo do ecrã (auto-dismiss 3s com fade).
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const CORES = {
  success: 'var(--neon)',
  error: 'var(--danger)',
  info: 'var(--text-dim)',
};

export default function Toast({ mensagem, tipo = 'info', onClose }) {
  const [saindo, setSaindo] = useState(false);

  // P3-15 — mensagens sucessivas atropelavam-se: a 2ª herdava o fade da 1ª e sumia
  // depressa. Ao mudar a mensagem, reinicia a visibilidade (padrão React: ajustar estado
  // durante o render) e o timer reinicia → cada toast recebe o tempo completo.
  const [msgAnterior, setMsgAnterior] = useState(mensagem);
  if (mensagem !== msgAnterior) {
    setMsgAnterior(mensagem);
    setSaindo(false);
  }

  useEffect(() => {
    const t1 = setTimeout(() => setSaindo(true), 2600); // inicia o fade
    const t2 = setTimeout(() => onClose?.(), 3000); // remove
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [mensagem, tipo, onClose]);

  if (!mensagem) return null;
  const cor = CORES[tipo] || CORES.info;

  // Portal para o body (15-set): position:fixed dentro do [data-page] animado
  // (pageEntra em app.css) não centra/ancora ao viewport de forma confiável no
  // WebKit do iPhone — ver a nota em LoadingFutty.jsx.
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        // calc(), não 16 fixo (14-set, VELOCIDADE 5): sem o inset, o toast
        // nascia debaixo do relógio/ilha no iPhone.
        top: 'calc(16px + env(safe-area-inset-top, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 300,
        maxWidth: '90vw',
        padding: '10px 16px',
        borderRadius: 12,
        background: '#101012',
        border: `1px solid ${cor}`,
        color: cor,
        fontSize: 13,
        fontWeight: 700,
        textAlign: 'center',
        boxShadow: '0 8px 24px -8px rgba(0,0,0,0.7)',
        opacity: saindo ? 0 : 1,
        transition: 'opacity 0.35s ease',
      }}
    >
      {mensagem}
    </div>,
    document.body
  );
}
