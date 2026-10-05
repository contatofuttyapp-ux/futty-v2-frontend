// Futty v2.0 — Gabinete, "Pessoas & times → Times" (Rodada 29Y): a ordem da lista de equipas.
// Funções puras (sem React, sem rede): a tela e os testes leem a mesma regra.
//
// Nome A–Z é ordem de DICIONÁRIO PT-BR: Intl.Collator com sensitivity 'base' ignora maiúscula e acento ("gajos" fica junto do G,
// "Éden" junto do E). `numeric` põe "Time 2" antes de "Time 10".
const colatorNome = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

// Os oito critérios do seletor "Ordenar por". `coluna` é o título da tabela que os representa; `sentido` é o da seta (▲ asc, ▼ desc).
// "Suspensos primeiro" é desc porque suspenso vale 1 e ativo vale 0.
export const CRITERIOS = [
  { chave: 'nome_az', rotulo: 'Nome (A–Z)', coluna: 'nome', sentido: 'asc' },
  { chave: 'nome_za', rotulo: 'Nome (Z–A)', coluna: 'nome', sentido: 'desc' },
  { chave: 'mais_membros', rotulo: 'Mais membros', coluna: 'membros', sentido: 'desc' },
  { chave: 'menos_membros', rotulo: 'Menos membros', coluna: 'membros', sentido: 'asc' },
  { chave: 'mais_novos', rotulo: 'Mais novos', coluna: 'criado', sentido: 'desc' },
  { chave: 'mais_antigos', rotulo: 'Mais antigos', coluna: 'criado', sentido: 'asc' },
  { chave: 'suspensos_primeiro', rotulo: 'Suspensos primeiro', coluna: 'estado', sentido: 'desc' },
  // Oitavo critério: o inverso de "Suspensos primeiro" (o clique que inverte o título "Estado" precisa de um nome no seletor).
  { chave: 'ativos_primeiro', rotulo: 'Ativos primeiro', coluna: 'estado', sentido: 'asc' },
];
export const CRITERIO_PADRAO = 'nome_az';
export const CHAVE_LEMBRETE = 'futty.gabinete.times.ordem';

const POR_CHAVE = Object.fromEntries(CRITERIOS.map((c) => [c.chave, c]));
const existe = (chave) => Object.hasOwn(POR_CHAVE, chave);

// Clicar num título: a 1ª vez vale o critério natural da coluna; a 2ª (na mesma coluna) inverte — ver proximoCriterio.
const PRIMEIRO_CLIQUE = { nome: 'nome_az', membros: 'mais_membros', criado: 'mais_novos', estado: 'suspensos_primeiro' };

export function criterioDe(chave) {
  return existe(chave) ? POR_CHAVE[chave] : POR_CHAVE[CRITERIO_PADRAO];
}

export function colunaDoCriterio(chave) {
  return criterioDe(chave).coluna;
}

export function sentidoDoCriterio(chave) {
  return criterioDe(chave).sentido;
}

/** O critério que um clique no título `coluna` deixa ativo, dado o critério atual. */
export function proximoCriterio(atual, coluna) {
  const c = criterioDe(atual);
  if (c.coluna === coluna) return CRITERIOS.find((o) => o.coluna === coluna && o.chave !== c.chave).chave;
  return PRIMEIRO_CLIQUE[coluna];
}

// Valores numéricos por coluna (o nome é tratado à parte, pelo colator).
const valorDe = {
  membros: (t) => Number(t.nr_membros) || 0,
  criado: (t) => {
    const ms = Date.parse(t.created_at);
    return Number.isNaN(ms) ? 0 : ms;
  },
  estado: (t) => (t.suspensa ? 1 : 0),
};

/** Cópia de `times` na ordem do critério. Empate, em qualquer critério, desempata pelo nome (A–Z). A lista de entrada não muda. */
export function ordenarTimes(times, chave = CRITERIO_PADRAO) {
  const { coluna, sentido } = criterioDe(chave);
  const sinal = sentido === 'asc' ? 1 : -1;
  const nomes = (a, b) => colatorNome.compare(a.nome || '', b.nome || '');
  const comparar = coluna === 'nome'
    ? (a, b) => sinal * nomes(a, b)
    : (a, b) => {
      const diferenca = valorDe[coluna](a) - valorDe[coluna](b);
      return diferenca ? sinal * diferenca : nomes(a, b);
    };
  return [...(times || [])].sort(comparar);
}

/** A última escolha da pessoa neste aparelho. Sem armazenamento (modo privado, bloqueado) ou valor estranho: Nome A–Z. */
export function lerCriterioLembrado() {
  try {
    const salvo = globalThis.localStorage?.getItem(CHAVE_LEMBRETE);
    return existe(salvo) ? salvo : CRITERIO_PADRAO;
  } catch {
    return CRITERIO_PADRAO;
  }
}

/** Guarda a escolha. Se o aparelho não deixa, a ordem vale só nesta visita — a tela nunca quebra por causa disso. */
export function guardarCriterio(chave) {
  try {
    globalThis.localStorage?.setItem(CHAVE_LEMBRETE, chave);
  } catch {
    // sem armazenamento: a escolha vale só até a tela fechar
  }
}
