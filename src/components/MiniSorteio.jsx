// Futty v2.0 — Rodada 29E: o mini sorteio ao vivo do passo 1 do Onboarding — a máquina pequena na receita da máquina do
// sorteio (styles/sorteio-maquina.css: .maq, .luz em mqCalm, .janela, .baseluz) com a janela do sorteio REAL: dois grupos,
// TIME A (ouro) e TIME B (roxo), 3 vagas cada, nas molduras de lá (.slot tracejado → .mmold com a figurinha, mPop ao
// entrar, micro-lâmpadas .mb, nome em Rajdhani). Seis figurinhas FICTÍCIAS (utils/miniSorteio.js) entram uma a uma
// alternando A/B, seguram com as micro-lâmpadas piscando, esvaziam e recomeçam noutra ordem — ciclo de ~7 s, sem som (não
// há gesto), só CSS + um relógio de setTimeout. prefers-reduced-motion: os 6 já no lugar, parados. Estado natural (antes do
// JS correr): os 6 no lugar.
import { useEffect, useState } from 'react';
import { urlAsset } from '../utils/avatar';
import { reguaDeLuzes } from '../utils/luzesSlot';
import { FIGURINHAS, TIMES, VAGAS_POR_TIME, agendaDoCiclo, ordemDoCiclo } from '../utils/miniSorteio';
import '../styles/mini-sorteio.css';

// As quatro réguas partilham um contador só, como na máquina do sorteio (a de baixo continua a de cima).
const REGUAS = (() => {
  let i = 0;
  const regua = (n) => { const fila = reguaDeLuzes({ n, inicio: i }); i += n; return fila; };
  return { cima: regua(22), cimaRoxa: regua(22), base: regua(24), baseRoxa: regua(24) };
})();
// As 6 micro-lâmpadas de cada moldura, nas posições da máquina do sorteio (CerimoniaSorteio.jsx, MBPOS).
const MBPOS = [[20, 2], [80, 2], [2, 40], [97, 40], [2, 72], [97, 72]];
const POR_ID = Object.fromEntries(FIGURINHAS.map((f) => [f.id, f]));
const AGENDA = agendaDoCiclo();

function movimentoReduzido() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// O relógio: vazio → entradas (1..6) → cheio (micro-lâmpadas) → saindo (fade) → vazio → próximo ciclo, noutra ordem.
// O estado inicial é o natural: os 6 no lugar (ciclo 0, cheio) — é o que fica com movimento reduzido.
function useCiclo() {
  const [estado, setEstado] = useState({ ciclo: 0, fase: 'cheio', colocadas: FIGURINHAS.length });
  useEffect(() => {
    if (movimentoReduzido()) return undefined;
    let ciclo = 0;
    let timers = [];
    const em = (ms, fn) => { timers.push(setTimeout(fn, ms)); };
    const rodar = () => {
      timers = [];
      setEstado({ ciclo, fase: 'vazio', colocadas: 0 });
      AGENDA.entradas.forEach((t, k) => em(t, () => setEstado({ ciclo, fase: 'entrando', colocadas: k + 1 })));
      em(AGENDA.cheioEm, () => setEstado({ ciclo, fase: 'cheio', colocadas: FIGURINHAS.length }));
      em(AGENDA.saindoEm, () => setEstado({ ciclo, fase: 'saindo', colocadas: FIGURINHAS.length }));
      em(AGENDA.vazioEm, () => setEstado({ ciclo, fase: 'vazio', colocadas: 0 }));
      em(AGENDA.fimEm, () => { ciclo += 1; rodar(); });
    };
    rodar();
    return () => { timers.forEach(clearTimeout); };
  }, []);
  return estado;
}

function Lampada({ luz }) {
  return <i className="luz" style={{ '--i': luz.i }} />;
}

function Moldura({ figurinha, saindo }) {
  return (
    <div className={`mmold${saindo ? ' sai' : ''}`} data-figurinha={figurinha.id}>
      <div className="fr"><img src={urlAsset(figurinha.arquivo)} alt="" width="56" height="75" decoding="async" /></div>
      {MBPOS.map(([x, y], i) => <span key={i} className="mb" style={{ '--i': i, left: `${x}%`, top: `${y}%` }} />)}
      <span className="nm">{figurinha.nome}</span>
    </div>
  );
}

function Grupo({ time, entradas, fase }) {
  return (
    <div className={`grupo ${time.id === 'A' ? 'ouro' : 'roxo'}${fase === 'cheio' ? ' cheio' : ''}`} style={{ '--tc': time.cor, '--tg': time.brilho }} data-time={time.id}>
      <div className="ghead">{time.nome}</div>
      <div className="srow">
        {Array.from({ length: VAGAS_POR_TIME }, (_, vaga) => {
          const e = entradas.find((x) => x.vaga === vaga);
          return (
            <div key={vaga} className={`slot${e ? ' cheio' : ''}`} data-vaga={vaga}>
              {e ? <Moldura figurinha={POR_ID[e.id]} saindo={fase === 'saindo'} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MiniSorteio() {
  const { ciclo, fase, colocadas } = useCiclo();
  const ordem = ordemDoCiclo(ciclo).filter((e) => e.ordem < colocadas);
  return (
    <div className="msq" data-fase={fase} data-ciclo={ciclo}>
      <div className="maq" aria-hidden="true">
        <div className="luzes">{REGUAS.cima.map((l) => <Lampada key={l.i} luz={l} />)}</div>
        <div className="luzes roxa">{REGUAS.cimaRoxa.map((l) => <Lampada key={l.i} luz={l} />)}</div>
        <div className="janela">
          {TIMES.map((time) => <Grupo key={time.id} time={time} entradas={ordem.filter((e) => e.time === time.id)} fase={fase} />)}
        </div>
        <div className="baseluz">
          <div className="fila">{REGUAS.base.map((l) => <Lampada key={l.i} luz={l} />)}</div>
          <div className="fila roxa">{REGUAS.baseRoxa.map((l) => <Lampada key={l.i} luz={l} />)}</div>
        </div>
      </div>
      <p className="msq-legenda">Sorteio justo, ranking e figurinha de colecionador.</p>
    </div>
  );
}
