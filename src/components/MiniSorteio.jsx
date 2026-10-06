// Futty v2.0 — O mini sorteio ao vivo do passo 1 do Onboarding — a máquina pequena na receita da máquina
// do sorteio (styles/sorteio-maquina.css: .maq, .luz em mqCalm, .janela, .baseluz) e, dentro, dois grupos,
// TIME A (ouro) e TIME B (roxo), com 4 ROLOS de slot machine cada (dono: 4 jogadores por time;
// .rolo/.strip/.scel de lá, a 56×75, 4 por linha). Os 8 rolos giram rápido com as 8 figurinhas FICTÍCIAS
// (utils/miniSorteio.js); a partir de 0,4 s um por vez desacelera (.slow, 1,5 s) e trava (.stop) na
// figurinha sorteada, que entra por cima na moldura do sorteio real (.rev com revPop, micro-lâmpadas .mb
// piscando, nome), alternando A/B a cada 0,75 s; quando o 8º trava (7,15 s), as réguas dão UM pulso
// (premio, 0,8 s) e os times seguram 2,5 s; fade 0,4 s; os rolos voltam a girar e recomeça com outra ordem
// — ciclo de ~10,7 s, sem som (não há gesto), só CSS + um relógio de setTimeout. prefers-reduced-motion:
// os 8 travados, sem giro. Estado natural (antes do JS correr): os 8 travados.
import { useEffect, useState } from 'react';
import { urlAsset } from '../utils/avatar';
import { reguaDeLuzes } from '../utils/luzesSlot';
import { FIGURINHAS, TIMES, VAGAS_POR_TIME, agendaDoCiclo, ordemDoCiclo, tiraDoRolo } from '../utils/miniSorteio';
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
const N = FIGURINHAS.length;
// A tira de cada rolo nasce uma vez: as 8 figurinhas na ordem própria do rolo, duas vezes (o spinY vai a −50 % e fecha sem emenda).
const TIRAS = TIMES.flatMap((_, ti) => Array.from({ length: VAGAS_POR_TIME }, (_, vaga) => tiraDoRolo(ti * VAGAS_POR_TIME + vaga)));

function movimentoReduzido() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// O relógio: girando → (0,4 s) um rolo por vez desacelera e, 1,5 s depois, trava → cheio (pulso de 0,8 s nas réguas; seguram) →
// saindo (fade) → girando de novo → próximo ciclo, noutra ordem. `desacelerando` e `travadas` contam rolos na ordem do ciclo.
// O estado inicial é o natural: os 8 travados (ciclo 0, cheio) — é o que fica com movimento reduzido.
function useCiclo() {
  const [estado, setEstado] = useState({ ciclo: 0, fase: 'cheio', desacelerando: N, travadas: N, pulso: false });
  useEffect(() => {
    if (movimentoReduzido()) return undefined;
    let ciclo = 0;
    let timers = [];
    const em = (ms, fn) => { timers.push(setTimeout(fn, ms)); };
    const rodar = () => {
      timers = [];
      setEstado({ ciclo, fase: 'girando', desacelerando: 0, travadas: 0, pulso: false });
      AGENDA.desaceleram.forEach((t, k) => em(t, () => setEstado((e) => ({ ...e, fase: 'travando', desacelerando: k + 1 }))));
      AGENDA.travam.forEach((t, k) => em(t, () => setEstado((e) => ({ ...e, fase: k + 1 === N ? 'cheio' : 'travando', travadas: k + 1, pulso: k + 1 === N }))));
      em(AGENDA.pulsoFimEm, () => setEstado((e) => ({ ...e, pulso: false })));
      em(AGENDA.saindoEm, () => setEstado((e) => ({ ...e, fase: 'saindo' })));
      em(AGENDA.girandoEm, () => setEstado({ ciclo, fase: 'girando', desacelerando: 0, travadas: 0, pulso: false }));
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

// Um rolo: a tira girando por baixo e, por cima, a figurinha sorteada na moldura do sorteio real (só aparece quando trava).
function Rolo({ vaga, tira, figurinha, estadoRolo, saindo }) {
  const travado = estadoRolo === 'travado';
  return (
    <div className={`rolo${estadoRolo === 'desacelerando' ? ' slow' : ''}${travado ? ' stop' : ''}${saindo ? ' sai' : ''}`} data-vaga={vaga} data-estado={estadoRolo}>
      <div className="strip">
        {[...tira, ...tira].map((id, i) => (
          <div key={i} className="scel"><img src={urlAsset(POR_ID[id].arquivo)} alt="" width="56" height="75" decoding="async" /></div>
        ))}
      </div>
      <div className={`rev${travado ? ' on' : ''}`} data-figurinha={figurinha.id}>
        <div className="fr"><img src={urlAsset(figurinha.arquivo)} alt="" width="56" height="75" decoding="async" /></div>
        {MBPOS.map(([x, y], i) => <span key={i} className="mb" style={{ '--i': i, left: `${x}%`, top: `${y}%` }} />)}
        <span className="nm">{figurinha.nome}</span>
      </div>
    </div>
  );
}

function Grupo({ time, ti, ordem, estado }) {
  const { fase, desacelerando, travadas } = estado;
  return (
    <div className={`grupo ${time.id === 'A' ? 'ouro' : 'roxo'}`} style={{ '--tc': time.cor, '--tg': time.brilho }} data-time={time.id}>
      <div className="ghead">{time.nome}</div>
      <div className="srow">
        {Array.from({ length: VAGAS_POR_TIME }, (_, vaga) => {
          const e = ordem.find((x) => x.time === time.id && x.vaga === vaga);
          const estadoRolo = e.ordem < travadas ? 'travado' : e.ordem < desacelerando ? 'desacelerando' : 'girando';
          return <Rolo key={vaga} vaga={vaga} tira={TIRAS[ti * VAGAS_POR_TIME + vaga]} figurinha={POR_ID[e.id]} estadoRolo={estadoRolo} saindo={fase === 'saindo'} />;
        })}
      </div>
    </div>
  );
}

export default function MiniSorteio() {
  const estado = useCiclo();
  const ordem = ordemDoCiclo(estado.ciclo);
  return (
    <div className="msq" data-fase={estado.fase} data-ciclo={estado.ciclo} data-travadas={estado.travadas}>
      <div className={`maq${estado.pulso ? ' premio' : ''}`} aria-hidden="true">
        <div className="luzes">{REGUAS.cima.map((l) => <Lampada key={l.i} luz={l} />)}</div>
        <div className="luzes roxa">{REGUAS.cimaRoxa.map((l) => <Lampada key={l.i} luz={l} />)}</div>
        <div className="janela">
          {TIMES.map((time, ti) => <Grupo key={time.id} time={time} ti={ti} ordem={ordem} estado={estado} />)}
        </div>
        <div className="baseluz">
          <div className="fila">{REGUAS.base.map((l) => <Lampada key={l.i} luz={l} />)}</div>
          <div className="fila roxa">{REGUAS.baseRoxa.map((l) => <Lampada key={l.i} luz={l} />)}</div>
        </div>
      </div>
      {/* Legenda (dono): o estilo do subtítulo. Os espaços dentro de cada frase são duros — em tela estreita a
          linha só quebra depois de um "·", em duas linhas parecidas, nunca uma palavra sozinha. */}
      <p className="msq-legenda">SORTEIO&nbsp;JUSTO&nbsp;· RANKING&nbsp;· FIGURINHA&nbsp;DE&nbsp;COLECIONADOR</p>
    </div>
  );
}
