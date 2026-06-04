// Futty v2.0 — Overlay fullscreen que envolve a SorteioSlotMachine.
// Recebe o objeto jogo completo (da API) e transforma-o internamente.
import { useEffect, useMemo } from 'react';
import SorteioSlotMachine from './SorteioSlotMachine.jsx';
import { jogoParaSorteioSlot, contarJogadoresSorteio, formatarDataJogo } from '../utils/sorteioUiHelpers.js';

export default function SorteioOverlay({ jogo, onClose, reducedMotion = false }) {
  // Fechar com a tecla Escape.
  useEffect(() => {
    if (!jogo) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jogo, onClose]);

  // Transforma o jogo no formato do slot — só recalcula quando o jogo muda.
  const sorteio = useMemo(() => (jogo ? jogoParaSorteioSlot(jogo) : null), [jogo]);
  const totalJogadores = useMemo(() => (sorteio ? contarJogadoresSorteio(sorteio) : 0), [sorteio]);

  // Não renderiza se não há jogo ou não há jogadores sorteados.
  if (!jogo || !sorteio || !totalJogadores) return null;

  const meta = {
    titulo: String(jogo?.location || jogo?.local || '').trim() || 'Jogo',
    dataLabel: formatarDataJogo(jogo),
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        background: '#050810',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <SorteioSlotMachine sorteio={sorteio} meta={meta} reducedMotion={reducedMotion} onClose={onClose} />
    </div>
  );
}
