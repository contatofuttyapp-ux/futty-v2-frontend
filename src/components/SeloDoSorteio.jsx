// Futty v2.0 — O selo do sorteio: SORTEADO (ouro) · SORTEADO E AJUSTADO POR <nome> (roxo) · MONTADO À MÃO POR
// <nome> (prata). A receita é a do carrossel do sorteio (REDES/CARROSSEL-sorteio-de-times/05-selo): chapa cheia,
// canto cortado a 45° em cima à esquerda e embaixo à direita, Rajdhani em maiúsculas espaçadas. O nome de quem
// fez o ajuste ou montou nunca é cortado: o selo quebra em duas linhas (a regra do nome inteiro vale aqui também).
// `detalhe` ("2º sorteio deste jogo") vai numa linha discreta logo abaixo.
import { CORES_DO_SELO } from '../utils/seloDoSorteio';

const RAJ = "'Rajdhani', sans-serif";
const CORTE = 'polygon(9px 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%, 0 9px)';

/** `largo` = a faixa de largura inteira (cerimônia, apresentação); sem ele, a etiqueta compacta (tela do jogo, link). */
export default function SeloDoSorteio({ selo, largo = false, style }) {
  if (!selo) return null;
  const cor = CORES_DO_SELO[selo.tipo] || CORES_DO_SELO.sorteado;
  const fundo = `linear-gradient(90deg, ${cor.de}, ${cor.ate})`;
  return (
    <div data-selo-do-sorteio={selo.tipo} style={{ display: largo ? 'block' : 'inline-block', maxWidth: '100%', ...style }}>
      <div
        style={{
          background: fundo,
          color: cor.texto,
          clipPath: CORTE,
          fontFamily: RAJ,
          fontWeight: 700,
          fontSize: largo ? 15 : 12,
          letterSpacing: largo ? '0.16em' : '0.12em',
          textTransform: 'uppercase',
          textAlign: largo ? 'center' : 'left',
          lineHeight: 1.25,
          padding: largo ? '11px 18px' : '6px 12px',
          overflowWrap: 'anywhere',
        }}
      >
        {selo.texto}
      </div>
      {selo.detalhe ? (
        <div data-selo-detalhe style={{ marginTop: 5, fontFamily: RAJ, fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: cor.detalhe, textAlign: largo ? 'center' : 'left' }}>
          {selo.detalhe}
        </div>
      ) : null}
    </div>
  );
}

/** As trocas do ajuste, uma por linha: TROCA · <nome> saiu do Ouro para o Roxo (a receita do slide do carrossel). */
export function ListaDeTrocas({ trocas, style }) {
  if (!trocas?.length) return null;
  return (
    <ul data-trocas style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6, ...style }}>
      {trocas.map((t) => (
        <li key={t.chave} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 14, color: '#d8d4e6', lineHeight: 1.35 }}>
          <span style={{ flexShrink: 0, fontFamily: RAJ, fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', color: '#1a1206', background: '#f0c94a', padding: '2px 7px', clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}>TROCA</span>
          <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            <b style={{ color: '#fff' }}>{t.nome}</b> {t.resto}
          </span>
        </li>
      ))}
    </ul>
  );
}
