// Futty v2.0 — Toast simples no topo do ecrã (auto-dismiss 3s com fade).
import { useEffect, useState } from 'react';

const CORES = {
  success: 'var(--neon)',
  error: 'var(--danger)',
  info: 'var(--text-dim)',
};

export default function Toast({ mensagem, tipo = 'info', onClose }) {
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setSaindo(true), 2600); // inicia o fade
    const t2 = setTimeout(() => onClose?.(), 3000); // remove
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onClose]);

  if (!mensagem) return null;
  const cor = CORES[tipo] || CORES.info;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 16,
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
    </div>
  );
}
