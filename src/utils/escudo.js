// Futty v2.0 — o escudo do time sem logo.
//
// UM controle, "Escudo do time": cor principal + segunda cor + padrão. Paleta FIXA de 12 cores, igual no
// motor (backend/utils/escudo.js) e na regra do banco (migração 077); 6 padrões = 864 escudos, todos
// legíveis em 84, 36 e 20 px. O desenho é o das bancadas aprovadas pelo dono, DESIGN/escudo-cores.html e
// DESIGN/escudo-padroes.html, copiado de lá (não reescalado). Reprovados pelo dono e fora daqui: RGB
// livre, quadriculado, listras finas, pontinhos, gradiente.
//
// A cor principal continua em teams.cor. A chave antiga 'verde' sempre foi mostrada como ROXO (#8b5cf6)
// e segue assim — por isso o verde de verdade da paleta tem a chave 'gramado' (na tela, "Verde").

export const PALETA = [
  { chave: 'roxo', nome: 'Roxo', hex: '#8b5cf6' },
  { chave: 'azul', nome: 'Azul', hex: '#3b82f6' },
  { chave: 'ciano', nome: 'Ciano', hex: '#06b6d4' },
  { chave: 'gramado', nome: 'Verde', hex: '#22a060' },
  { chave: 'lima', nome: 'Lima', hex: '#65a30d' },
  { chave: 'ouro', nome: 'Ouro', hex: '#d4a017' },
  { chave: 'laranja', nome: 'Laranja', hex: '#ea7317' },
  { chave: 'vermelho', nome: 'Vermelho', hex: '#dc2626' },
  { chave: 'rosa', nome: 'Rosa', hex: '#db2777' },
  { chave: 'vinho', nome: 'Vinho', hex: '#9d174d' },
  { chave: 'grafite', nome: 'Grafite', hex: '#3f4654' },
  { chave: 'preto', nome: 'Preto', hex: '#1c1c20' },
];

export const PADROES = [
  { chave: 'solido', nome: 'Sólido' },
  { chave: 'faixa', nome: 'Faixa' },
  { chave: 'metade', nome: 'Metade' },
  { chave: 'listras', nome: 'Listras' },
  { chave: 'barra', nome: 'Barra' },
  { chave: 'aro', nome: 'Aro' },
];

const POR_CHAVE = Object.fromEntries(PALETA.map((c) => [c.chave, c]));
// A chave antiga (001_schema): 'verde' é o roxo da casa desde sempre.
const ANTIGAS = { verde: 'roxo' };

/** A chave da paleta que a cor guardada quer dizer ('verde' → 'roxo'; desconhecida ou vazia → 'roxo'). */
export function chaveDaCor(chave) {
  if (POR_CHAVE[chave]) return chave;
  return ANTIGAS[chave] || 'roxo';
}

/** O hex de uma chave (guardada ou da paleta). */
export function hexDaCor(chave) {
  return POR_CHAVE[chaveDaCor(chave)].hex;
}

/** A segunda cor que a tela sugere quando a pessoa escolhe um padrão sem ter segunda cor ainda: ouro (ou preto, se a principal é ouro). */
export function segundaCorSugerida(cor) {
  return chaveDaCor(cor) === 'ouro' ? 'preto' : 'ouro';
}

/**
 * O escudo de um time em duas camadas CSS, como na bancada: `fundo` (o background do círculo) e `camada` (o <i> por cima, ou null).
 * Sem segunda cor, ou com padrão sólido/desconhecido, é sólido na cor principal.
 */
export function camadasDoEscudo({ cor, escudo_cor2: cor2, escudo_padrao: padrao } = {}) {
  const a = hexDaCor(cor);
  const b = cor2 && POR_CHAVE[cor2] ? POR_CHAVE[cor2].hex : null;
  switch (b ? padrao : 'solido') {
    case 'faixa': return { fundo: a, camada: `linear-gradient(115deg,transparent 0 46%,${b} 46% 68%,transparent 68%)` };
    case 'metade': return { fundo: `linear-gradient(90deg,${a} 0 50%,${b} 50% 100%)`, camada: null };
    case 'listras': return { fundo: `repeating-linear-gradient(90deg,${a} 0 25%,${b} 25% 50%)`, camada: null };
    case 'barra': return { fundo: a, camada: `linear-gradient(180deg,transparent 0 38%,${b} 38% 62%,transparent 62%)` };
    case 'aro': return { fundo: b, camada: `radial-gradient(circle,${a} 0 66%,transparent 66%)` };
    default: return { fundo: a, camada: null };
  }
}

/** O corpo das iniciais na régua da bancada: 84 px → 30, 36 px → 14, 20 px → 8 (e proporcional entre eles). */
export function letraDoEscudo(size) {
  const fator = size >= 60 ? 30 / 84 : size >= 30 ? 14 / 36 : 8 / 20;
  return Math.round(size * fator);
}
