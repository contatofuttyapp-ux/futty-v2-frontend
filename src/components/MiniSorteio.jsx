// Futty v2.0 — Rodada 29D: o mini sorteio ao vivo do passo 1 do Onboarding — uma máquina pequena na receita da máquina do
// sorteio (styles/sorteio-maquina.css: .maq, .luz em mqCalm, .janela, .rolo/.strip em spinY, .baseluz) com nomes FICTÍCIOS
// (utils/miniSorteio.js): os dois rolos giram, travam um a um em TIME OURO / TIME ROXO, seguram 2 s e recomeçam, ciclo de
// 6 s em loop. Sem som (não há gesto), 0 KB de mídia, só CSS + um relógio de setTimeout. prefers-reduced-motion: rolos
// parados num resultado, lâmpadas a 0,7. Estado natural visível (lei dos builds 10-12): sem JS os rolos mostram um nome
// e as lâmpadas seguem no CSS.
import { useEffect, useState } from 'react';
import { reguaDeLuzes } from '../utils/luzesSlot';
import { NOMES_FICTICIOS, TEMPOS, parDoCiclo, tiraDoRolo } from '../utils/miniSorteio';
import '../styles/mini-sorteio.css';

const ALTURA_NOME = 40; // = .msq .n / .msq .tira (CSS)
// As quatro réguas partilham um contador só, como na máquina do sorteio (a de baixo continua a de cima).
const REGUAS = (() => {
  let i = 0;
  const regua = (n) => { const fila = reguaDeLuzes({ n, inicio: i }); i += n; return fila; };
  return { cima: regua(22), cimaRoxa: regua(22), base: regua(24), baseRoxa: regua(24) };
})();
const TIRAS = { ouro: tiraDoRolo(0), roxo: tiraDoRolo(4) };

function movimentoReduzido() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// O relógio do ciclo: gira → trava o ouro (2,4 s) → trava o roxo (3,4 s) → segura → recomeça (6 s).
function useCiclo() {
  const [estado, setEstado] = useState(() => ({ ciclo: 0, travados: movimentoReduzido() ? 2 : 0 }));
  useEffect(() => {
    if (movimentoReduzido()) return undefined;
    let ciclo = 0;
    let t1; let t2; let t3;
    const rodar = () => {
      setEstado({ ciclo, travados: 0 });
      t1 = setTimeout(() => setEstado({ ciclo, travados: 1 }), TEMPOS.travaOuroMs);
      t2 = setTimeout(() => setEstado({ ciclo, travados: 2 }), TEMPOS.travaRoxoMs);
      t3 = setTimeout(() => { ciclo += 1; rodar(); }, TEMPOS.cicloMs);
    };
    rodar();
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  return estado;
}

function Lampada({ luz }) {
  return <i className="luz" style={{ '--i': luz.i }} />;
}

// Girando: a tira anima (spinY) e começa na posição do último nome travado (--fase), sem salto. Travado: a animação sai e
// a tira transita até a cópia de baixo do nome escolhido — sempre para a frente, nunca "anda para trás".
function Rolo({ time, nomes, escolhido, travado }) {
  const idx = nomes.indexOf(escolhido);
  const estilo = travado
    ? { transform: `translateY(${-(idx + NOMES_FICTICIOS.length) * ALTURA_NOME}px)` }
    : { '--fase': idx / NOMES_FICTICIOS.length };
  return (
    <div className={`rolo ${time}${travado ? ' travado' : ''}`} data-escolhido={travado ? escolhido : undefined}>
      <span className="quem">{time === 'ouro' ? 'Time Ouro' : 'Time Roxo'}</span>
      <div className="tira">
        <div className="strip" style={estilo}>
          {[...nomes, ...nomes].map((n, k) => <span key={k} className="n">{n}</span>)}
        </div>
      </div>
    </div>
  );
}

export default function MiniSorteio() {
  const { ciclo, travados } = useCiclo();
  const par = parDoCiclo(ciclo);
  return (
    <div className="msq">
      <div className="maq" aria-hidden="true">
        <div className="luzes">{REGUAS.cima.map((l) => <Lampada key={l.i} luz={l} />)}</div>
        <div className="luzes roxa">{REGUAS.cimaRoxa.map((l) => <Lampada key={l.i} luz={l} />)}</div>
        <div className="janela">
          <div className="rolos">
            <Rolo time="ouro" nomes={TIRAS.ouro} escolhido={par.ouro} travado={travados >= 1} />
            <Rolo time="roxo" nomes={TIRAS.roxo} escolhido={par.roxo} travado={travados >= 2} />
          </div>
        </div>
        <div className="baseluz">
          <div className="fila">{REGUAS.base.map((l) => <Lampada key={l.i} luz={l} />)}</div>
          <div className="fila roxa">{REGUAS.baseRoxa.map((l) => <Lampada key={l.i} luz={l} />)}</div>
        </div>
      </div>
      <p className="msq-legenda">Sorteio justo, ranking e a sua figurinha.</p>
    </div>
  );
}
