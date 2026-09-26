// Futty v2.0 — Toast simples no topo do ecrã (auto-dismiss 3s com fade).
// Pagamentos P2: `acao` opcional ({ rotulo, aoTocar }) — um botão dentro do toast (ex.: "Tentar de
// novo" depois de uma compra que falhou). Com ação o toast fica 6 s, para dar tempo de tocar.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const CORES = {
  success: 'var(--neon)',
  error: 'var(--danger)',
  info: 'var(--text-dim)',
};

export default function Toast({ mensagem, tipo = 'info', onClose, acao = null }) {
  const [saindo, setSaindo] = useState(false);

  // P3-15 — mensagens sucessivas atropelavam-se: a 2ª herdava o fade da 1ª e sumia
  // depressa. Ao mudar a mensagem, reinicia a visibilidade (padrão React: ajustar estado
  // durante o render) e o timer reinicia → cada toast recebe o tempo completo.
  const [msgAnterior, setMsgAnterior] = useState(mensagem);
  if (mensagem !== msgAnterior) {
    setMsgAnterior(mensagem);
    setSaindo(false);
  }

  const duracao = acao ? 6000 : 3000;
  useEffect(() => {
    const t1 = setTimeout(() => setSaindo(true), duracao - 400); // inicia o fade
    const t2 = setTimeout(() => onClose?.(), duracao); // remove
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [mensagem, tipo, onClose, duracao]);

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
      {acao ? (
        <button
          type="button"
          onClick={() => { acao.aoTocar(); onClose?.(); }}
          style={{ display: 'block', margin: '8px auto 0', padding: '6px 14px', fontSize: 13, fontWeight: 700, color: '#0d0d12', background: cor, border: 'none', borderRadius: 8, cursor: 'pointer' }}
        >
          {acao.rotulo}
        </button>
      ) : null}
    </div>,
    document.body
  );
}
