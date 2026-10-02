// Futty v2.0 — Rodada 29H (item 3): a data de nascimento em ROLINHOS (dia · mês · ano), um componente só para o
// cadastro, o onboarding e o banner do Início — igual no iPhone, no Android e no computador (o <input type="date">
// era um seletor diferente em cada sistema, e o do iPhone nem mostrava o dia).
//
// Regras: nenhum ano futuro (a lista de anos acaba em ano atual − IDADE_MINIMA, o mesmo teto de `nascimentoMaximo()`);
// o dia acompanha o mês (30, 31, fevereiro 28/29). O componente só entrega a data (`onChange('AAAA-MM-DD')`) quando a
// pessoa mexeu nos TRÊS rolos (rolou, tocou na coluna ou apertou as setas) — o valor de partida é só um lugar para os
// rolos começarem, nunca uma resposta; tocar na coluna já vale como "mexi" (quem nasceu no dia 15, o dia de partida,
// confirma o 15 só de tocar nele). Quem decide se a idade serve é quem chama (`menorQueIdadeMinima`, `MSG_MENOR`); aqui um mês/dia depois do teto no último
// ano continua escolhível de propósito, para a frase da casa aparecer em vez de o rolo recusar em silêncio.
//
// Rolo = lista com rolagem e `scroll-snap` (CSS em app.css, ".rolinhos"): o item no centro é o escolhido. Toque num
// item o leva ao centro; setas ↑ ↓ andam um item (teclado e leitor de tela: role="listbox"). Estado natural visível,
// sem animação em JS.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ANO_MINIMO, MESES, anoMaximo as anoMaximoDeHoje, comporData, diasDoMes } from '../utils/dataRolinhos';

const ALTURA = 40; // px por item — precisa bater com .rolo__item em app.css

function Rolo({ nome, rotulo, itens, indice, tocado, aoEscolher }) {
  const ref = useRef(null);
  const indiceAtual = useRef(indice);
  // O gesto lê o índice de agora (não o do render em que o ouvinte nasceu): atualizado a cada commit, antes dos outros efeitos.
  useLayoutEffect(() => { indiceAtual.current = indice; });

  // Posição de partida e qualquer mudança vinda de fora (o dia que encolhe quando o mês é mais curto): instantânea.
  // Quando a posição já é a do índice (a pessoa rolou até aqui), não mexe — mexer interromperia o gesto dela.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && Math.round(el.scrollTop / ALTURA) !== indice) el.scrollTop = indice * ALTURA;
  }, [indice, itens.length]);

  function aoRolar() {
    const el = ref.current;
    if (!el) return;
    const i = Math.max(0, Math.min(itens.length - 1, Math.round(el.scrollTop / ALTURA)));
    if (i !== indiceAtual.current) aoEscolher(i);
  }

  function levar(i) {
    const el = ref.current;
    if (!el) return;
    if (i === indiceAtual.current) aoEscolher(i); // marca "mexeu" mesmo sem andar
    el.scrollTo({ top: i * ALTURA, behavior: 'smooth' });
  }

  function aoTeclar(e) {
    const passo = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    levar(Math.max(0, Math.min(itens.length - 1, indiceAtual.current + passo)));
  }

  return (
    <div
      ref={ref}
      className="rolo"
      role="listbox"
      aria-label={rotulo}
      tabIndex={0}
      data-rolo={nome}
      data-escolhido={tocado ? String(itens[indice]?.valor) : ''}
      onScroll={aoRolar}
      onKeyDown={aoTeclar}
      onPointerDown={() => aoEscolher(indiceAtual.current)}
    >
      <i className="rolo__esp" aria-hidden="true" />
      {itens.map((item, i) => (
        <div
          key={item.valor}
          role="option"
          aria-selected={i === indice}
          data-valor={item.valor}
          className={`rolo__item${i === indice ? ' rolo__item--atual' : ''}`}
          onClick={() => levar(i)}
        >
          {item.texto}
        </div>
      ))}
      <i className="rolo__esp" aria-hidden="true" />
    </div>
  );
}

/**
 * @param {object}   p
 * @param {(valor: string) => void} p.onChange  'AAAA-MM-DD' quando os três rolos foram mexidos; '' enquanto falta algum
 * @param {string}   [p.id]                      id do grupo (para o <label> e para as cenas)
 * @param {string}   [p.rotulo]                  nome do grupo para leitor de tela
 */
export default function RolinhosData({ onChange, id, rotulo = 'Data de nascimento' }) {
  const anoMaximo = anoMaximoDeHoje();
  // Ponto de partida dos rolos (só onde começam; não vale como resposta até a pessoa mexer em cada um).
  const [dia, setDia] = useState(15);
  const [mes, setMes] = useState(6);
  const [ano, setAno] = useState(anoMaximo - 12);
  const [tocados, setTocados] = useState({ dia: false, mes: false, ano: false });

  const diasNoMes = diasDoMes(mes, ano);
  const diaVisto = Math.min(dia, diasNoMes);
  const todos = tocados.dia && tocados.mes && tocados.ano;
  const valor = todos ? comporData({ dia, mes, ano }) : '';

  const avisar = useRef(onChange);
  useEffect(() => { avisar.current = onChange; });
  useEffect(() => { avisar.current?.(valor); }, [valor]);

  const marcar = (qual) => setTocados((t) => (t[qual] ? t : { ...t, [qual]: true }));

  const itensDia = Array.from({ length: diasNoMes }, (_, i) => ({ valor: i + 1, texto: String(i + 1) }));
  const itensMes = MESES.map((texto, i) => ({ valor: i + 1, texto }));
  const itensAno = Array.from({ length: anoMaximo - ANO_MINIMO + 1 }, (_, i) => ({ valor: ANO_MINIMO + i, texto: String(ANO_MINIMO + i) }));

  return (
    <div id={id} className={`rolinhos${todos ? ' rolinhos--completo' : ''}`} role="group" aria-label={rotulo} data-rolinhos data-valor-data={valor}>
      <span className="rolinhos__faixa" aria-hidden="true" />
      <Rolo nome="dia" rotulo="Dia" itens={itensDia} indice={diaVisto - 1} tocado={tocados.dia} aoEscolher={(i) => { setDia(i + 1); marcar('dia'); }} />
      <Rolo nome="mes" rotulo="Mês" itens={itensMes} indice={mes - 1} tocado={tocados.mes} aoEscolher={(i) => { setMes(i + 1); marcar('mes'); }} />
      <Rolo nome="ano" rotulo="Ano" itens={itensAno} indice={ano - ANO_MINIMO} tocado={tocados.ano} aoEscolher={(i) => { setAno(ANO_MINIMO + i); marcar('ano'); }} />
    </div>
  );
}
