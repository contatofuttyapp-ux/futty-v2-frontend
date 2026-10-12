// Futty v2.0 — Toast: o aviso de uma linha, no MEIO da tela.
// Um componente só, sem exceção por tela: todas as chamadas `showToast(...)` das páginas acabam aqui.
//   · centrado, largura máx. 320, fundo escuro com desfoque, ícone por tipo (✓ sucesso · ! erro · i info);
//   · some sozinho em 2 s (6 s quando leva ação); ERRO fica até a pessoa tocar nele;
//   · entra e sai em 180 ms; com `prefers-reduced-motion` aparece e some sem animar (estilos: index.css).
// `acao` opcional ({ rotulo, aoTocar, neutro }) — um botão dentro do toast (ex.: "Tentar de novo"). O botão fecha o aviso depois de agir.
// Com `neutro` o botão é cinza (não pinta de vermelho num erro) e o aviso NÃO fecha ao toque no resto: só o botão fecha, e o texto
// dá para selecionar. A compra que falhou usa assim: o único botão é "Fechar".
// `detalhe` opcional: uma linha pequena embaixo da mensagem (o detalhe técnico que só o testador da loja vê).
// `posicao` opcional: 'meio' (o padrão) ou 'topo' — para a tela em que o meio é onde estão os botões (o "Temos campeão!" não pode
// cobrir os de compartilhar).
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

export default function Toast({ mensagem, tipo = 'info', onClose, acao = null, posicao = 'meio', detalhe = null }) {
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
  const fechaAoTocar = eErro && !acao?.neutro; // com ação também: o botão age, o resto do aviso fecha (menos com ação neutra: só ela fecha)

  // Portal para o body: position:fixed dentro do [data-page] animado
  // (pageEntra em app.css) não centra/ancora ao viewport de forma confiável no
  // WebKit do iPhone — ver a nota em LoadingFutty.jsx.
  // Sem ação e sem precisar de toque, o aviso não intercepta toques: a pessoa continua a mexer
  // na tela por baixo.
  return createPortal(
    <div
      key={mensagem}
      role={eErro ? 'alert' : 'status'}
      aria-live={eErro ? 'assertive' : 'polite'}
      className={`futty-toast${posicao === 'topo' ? ' futty-toast--topo' : ''}${saindo ? ' futty-toast--saindo' : ''}${fechaAoTocar ? ' futty-toast--toque' : ''}`}
      style={{ '--toast-cor': cor, pointerEvents: acao || fechaAoTocar ? 'auto' : 'none' }}
      onClick={fechaAoTocar ? fechar : undefined}
    >
      <span className="futty-toast__icone" aria-hidden="true">{ICONES[tipo] || ICONES.info}</span>
      <span className="futty-toast__texto">{mensagem}</span>
      {detalhe ? <span className="futty-toast__detalhe" data-toast-detalhe>{detalhe}</span> : null}
      {fechaAoTocar ? <span className="futty-toast__dica">Toque para fechar</span> : null}
      {acao ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); acao.aoTocar(); onClose?.(); }}
          className={`futty-toast__acao${acao.neutro ? ' futty-toast__acao--neutra' : ''}`}
        >
          {acao.rotulo}
        </button>
      ) : null}
    </div>,
    document.body
  );
}
