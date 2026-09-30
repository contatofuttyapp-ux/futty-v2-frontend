// Futty v2.0 — Toast: o aviso de uma linha, no MEIO da tela (Rodada 29A, pedido do dono, 30-set).
// Um componente só, sem exceção por tela: todas as chamadas `showToast(...)` das páginas acabam aqui.
//   · centrado, largura máx. 320, fundo escuro com desfoque, ícone por tipo (✓ sucesso · ! erro · i info);
//   · some sozinho em 2 s (6 s quando leva ação); ERRO fica até a pessoa tocar nele;
//   · entra e sai em 180 ms; com `prefers-reduced-motion` aparece e some sem animar (estilos: index.css).
// Pagamentos P2: `acao` opcional ({ rotulo, aoTocar }) — um botão dentro do toast (ex.: "Tentar de
// novo" depois de uma compra que falhou).
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const CORES = {
  success: 'var(--neon)',
  error: 'var(--danger)',
  info: 'var(--text-dim)',
};
const ICONES = { success: '✓', error: '!', info: 'i' };

const SAIDA_MS = 180;
const DURACAO_MS = 2000;
const DURACAO_COM_ACAO_MS = 6000;

export default function Toast({ mensagem, tipo = 'info', onClose, acao = null }) {
  const [saindo, setSaindo] = useState(false);
  const fechando = useRef(null);

  // P3-15 — mensagens sucessivas atropelavam-se: a 2ª herdava o fade da 1ª e sumia
  // depressa. Ao mudar a mensagem, reinicia a visibilidade (padrão React: ajustar estado
  // durante o render) e o timer reinicia → cada toast recebe o tempo completo.
  const [msgAnterior, setMsgAnterior] = useState(mensagem);
  if (mensagem !== msgAnterior) {
    setMsgAnterior(mensagem);
    setSaindo(false);
  }

  // Erro não tem relógio: fica até tocar (quem erra precisa de tempo para ler). Os outros somem.
  const eErro = tipo === 'error';
  const duracao = eErro ? null : acao ? DURACAO_COM_ACAO_MS : DURACAO_MS;
  useEffect(() => {
    if (duracao == null) return undefined;
    const t1 = setTimeout(() => setSaindo(true), duracao - SAIDA_MS); // inicia a saída
    const t2 = setTimeout(() => onClose?.(), duracao); // remove
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [mensagem, tipo, onClose, duracao]);
  useEffect(() => () => clearTimeout(fechando.current), []);

  if (!mensagem) return null;
  const cor = CORES[tipo] || CORES.info;

  // Toque no erro: sai em 180 ms e só então pede a remoção.
  function fechar() {
    setSaindo(true);
    clearTimeout(fechando.current);
    fechando.current = setTimeout(() => onClose?.(), SAIDA_MS);
  }
  const fechaAoTocar = eErro; // com ação também: o botão age, o resto do aviso fecha

  // Portal para o body (15-set): position:fixed dentro do [data-page] animado
  // (pageEntra em app.css) não centra/ancora ao viewport de forma confiável no
  // WebKit do iPhone — ver a nota em LoadingFutty.jsx.
  // Sem ação e sem precisar de toque, o aviso não intercepta toques: a pessoa continua a mexer na tela por baixo.
  return createPortal(
    <div
      key={mensagem}
      role={eErro ? 'alert' : 'status'}
      aria-live={eErro ? 'assertive' : 'polite'}
      className={`futty-toast${saindo ? ' futty-toast--saindo' : ''}${fechaAoTocar ? ' futty-toast--toque' : ''}`}
      style={{ '--toast-cor': cor, pointerEvents: acao || fechaAoTocar ? 'auto' : 'none' }}
      onClick={fechaAoTocar ? fechar : undefined}
    >
      <span className="futty-toast__icone" aria-hidden="true">{ICONES[tipo] || ICONES.info}</span>
      <span className="futty-toast__texto">{mensagem}</span>
      {fechaAoTocar ? <span className="futty-toast__dica">Toque para fechar</span> : null}
      {acao ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); acao.aoTocar(); onClose?.(); }}
          className="futty-toast__acao"
        >
          {acao.rotulo}
        </button>
      ) : null}
    </div>,
    document.body
  );
}
