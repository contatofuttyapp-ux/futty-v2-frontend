// Futty v2.0 — O que entra embaixo da máquina quando a cerimônia termina.
//   · sorteado: o selo SORTEADO (ouro).
//   · sorteado e ajustado: a máquina acabou de girar o ORIGINAL (o que a roleta deu). Aqui vem o passo "Ajuste de
//     <nome>" — cada troca numa linha —, depois os times finais (quem trocou de lugar com moldura dourada) e, por
//     último, o selo SORTEADO E AJUSTADO POR <nome> (roxo). Nada fica escondido: quem olha vê o que saiu e o que mudou.
// Tudo entra em sequência por CSS (.entra-em-sequencia); o estado natural é visível.
import SeloDoSorteio, { ListaDeTrocas } from './SeloDoSorteio';
import TimesEmCartoes from './TimesEmCartoes';
import { atrasoCss, duracaoDosCartoes } from '../utils/tempoDosCartoes';

const RAJ = "'Rajdhani', sans-serif";
const PASSO_TROCA = 0.35; // s entre uma troca e a seguinte: dá tempo de ler
const ROTULO = { fontFamily: RAJ, fontWeight: 700, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' };

export default function FimDoSorteio({ selo, ajuste = null, final = null }) {
  if (!selo) return null;
  if (!ajuste || !final) {
    return (
      <div data-fim-do-sorteio="sorteado" className="entra-em-sequencia" style={{ maxWidth: 480, margin: '14px auto 0', padding: '0 16px' }}>
        <SeloDoSorteio selo={selo} largo />
      </div>
    );
  }
  const inicioTimes = 0.4 + ajuste.trocas.length * PASSO_TROCA + 0.5;
  const cartoes = { times: final.times, reservas: final.reservas, atraso0: inicioTimes + 0.3, passo: 0.06, pausaEntreTimes: 0.15 };
  const inicioSelo = duracaoDosCartoes(cartoes);
  return (
    <section data-fim-do-sorteio="ajustado" style={{ maxWidth: 480, margin: '14px auto 0', padding: '0 16px', display: 'grid', gap: 12 }}>
      <div data-passo-do-ajuste className="entra-em-sequencia" style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 18, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c9b6ff' }}>
        {ajuste.titulo}
      </div>
      <ListaDeTrocas trocas={ajuste.trocas} passo={PASSO_TROCA} atraso0={0.4} />
      <div className="entra-em-sequencia" style={{ ...ROTULO, '--d': atrasoCss(inicioTimes), marginTop: 4 }}>Times finais</div>
      <TimesEmCartoes {...cartoes} destacar={ajuste.movidos} />
      <div className="entra-em-sequencia" style={{ '--d': atrasoCss(inicioSelo) }}>
        <SeloDoSorteio selo={selo} largo />
      </div>
    </section>
  );
}
