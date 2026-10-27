// Futty v2.0 — "Vou / Não vou" TRAVADO (regra do dono). Um componente só, no cartão do jogo do Início e na página do jogo:
//   · sem resposta: os dois botões, Vou e Não vou;
//   · respondeu: "Você está confirmado" (com o check) ou "Você não vai nesse jogo" — os botões somem; ao lado, pequeno, "Trocar resposta",
//     que reabre os dois;
//   · lista fechada (passou a hora do sorteio, ou o admin sorteou antes): só o estado, sem botão nenhum;
//   · jogo cheio: a posição na lista de espera e "Sair da lista".
import { useState } from 'react';
import { Check } from 'lucide-react';

const TROCAR = { border: 'none', background: 'transparent', color: 'var(--neon)', fontWeight: 700, fontSize: 12, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', padding: '4px 0', flexShrink: 0 };

export default function RespostaDoJogo({ resposta = null, aberta = true, espera = null, ocupado = false, onResponder, onSairEspera = null, pulsar = true }) {
  const [trocando, setTrocando] = useState(false);

  async function responder(status) {
    await onResponder(status);
    setTrocando(false);
  }

  if (espera != null) {
    return (
      <div className="gcard__presence" data-resposta="espera" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: '#c9b6ff' }}>Você está em {espera}º na lista de espera</span>
        {aberta && onSairEspera ? <button type="button" data-sair-espera style={TROCAR} disabled={ocupado} onClick={onSairEspera}>Sair da lista</button> : null}
      </div>
    );
  }

  if (resposta && !trocando) {
    const vai = resposta === 'confirmado';
    return (
      <div className="gcard__presence" data-resposta={resposta} style={{ flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <span data-resposta-texto style={{ flex: 1, minWidth: 0, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: vai ? '#7bd88f' : 'var(--text-dim)' }}>
          {vai ? <Check size={16} strokeWidth={2.6} aria-hidden="true" /> : null}
          {vai ? 'Você está confirmado' : 'Você não vai nesse jogo'}
        </span>
        {aberta ? <button type="button" data-trocar-resposta style={{ ...TROCAR, opacity: ocupado ? 0.6 : 1 }} disabled={ocupado} onClick={() => setTrocando(true)}>Trocar resposta</button> : null}
      </div>
    );
  }

  if (!aberta) {
    return (
      <div className="gcard__presence" data-resposta="fechada">
        <span className="texto-apoio" style={{ margin: 0 }}>Lista fechada. Você não respondeu.</span>
      </div>
    );
  }

  // O pulso do "Vou" marca a ação disponível; o .pulse-active vai no botão e o glow no wrapper (os 45° do botão cortariam a sombra).
  return (
    <div className="gcard__presence" data-resposta="pergunta">
      <span className={`pbtn-slot ${pulsar && !ocupado ? 'pbtn-pulse' : ''}`}>
        <button type="button" data-vou className={`pbtn pbtn--go hud-corners-s ${pulsar && !ocupado ? 'pulse-active tab-shine' : ''}`} disabled={ocupado} onClick={() => responder('confirmado')}>
          Vou
        </button>
      </span>
      <button type="button" data-nao-vou className="pbtn pbtn--no hud-corners-s" disabled={ocupado} onClick={() => responder('recusado')}>
        Não vou
      </button>
      {trocando ? <button type="button" data-manter-resposta style={{ ...TROCAR, color: 'var(--text-dim)' }} onClick={() => setTrocando(false)}>Manter</button> : null}
    </div>
  );
}
