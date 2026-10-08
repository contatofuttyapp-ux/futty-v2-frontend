// Futty v2.0 — palpite de género pelo nome (Rodada 30A, decisão do dono: sem campo "sexo").
// Primeiros nomes femininos brasileiros comuns, minúsculos e SEM acento (mesma normalização de
// utils/cidades.js). Usado só para escolher o POOL do avatar genérico (3 femininos vs. 3 masculinos)
// quando a pessoa não escolheu o seu — nunca para nada além disso.
export const NOMES_FEMININOS = new Set([
  'maria', 'ana', 'francisca', 'antonia', 'adriana', 'juliana', 'marcia', 'fernanda', 'patricia', 'aline',
  'sandra', 'camila', 'amanda', 'bruna', 'jessica', 'leticia', 'julia', 'luciana', 'vanessa', 'mariana',
  'gabriela', 'valeria', 'natalia', 'rosana', 'bianca', 'raquel', 'tatiana', 'vivian', 'viviane', 'debora',
  'priscila', 'monica', 'cristina', 'simone', 'rita', 'rosa', 'teresa', 'lucia', 'helena', 'beatriz',
  'carolina', 'larissa', 'renata', 'daniela', 'flavia', 'cristiane', 'jaqueline', 'michele', 'michelle', 'elaine',
  'andrea', 'claudia', 'gisele', 'silvia', 'rute', 'ruth', 'eliane', 'denise', 'luisa', 'luiza',
  'isabela', 'isabel', 'isabella', 'sofia', 'sophia', 'alice', 'laura', 'manuela', 'heloisa', 'clara',
  'yasmin', 'lara', 'melissa', 'emanuelly', 'agatha', 'giovanna', 'livia', 'lorena', 'nicole', 'rafaela',
  'vitoria', 'eduarda', 'maite', 'marina', 'paula', 'pauline', 'roberta', 'raissa', 'taina', 'thais',
  'thalita', 'tainara', 'kelly', 'karina', 'karen', 'katia', 'kamila', 'barbara', 'brenda', 'dayane',
  'deise', 'edna', 'eliza', 'elisa', 'elisangela', 'erica', 'eunice', 'fabiana', 'fatima', 'gilda',
  'gloria', 'graziela', 'graziella', 'heloise', 'ingrid', 'irene', 'ivone', 'jacqueline', 'janaina', 'joana',
  'josefa', 'joselia', 'jussara', 'keila', 'laira', 'leila', 'lilian', 'liliane', 'lindalva', 'luana',
  'luzia', 'madalena', 'magda', 'marcela', 'margarida', 'marilia', 'marisa', 'marta', 'mayara', 'meire',
  'milena', 'miriam', 'nadia', 'nair', 'nathalia', 'nilza', 'noemia', 'odete', 'olivia', 'paloma',
  'pamela', 'penha', 'rejane', 'regina', 'rosangela', 'rosaria', 'rosemeire', 'rosimeire', 'sabrina', 'samanta',
  'sara', 'selma', 'severina', 'sheila', 'solange', 'soraia', 'sueli', 'suellen', 'tamires', 'tania',
  'telma', 'terezinha', 'valentina', 'valdirene', 'veronica', 'vilma', 'wanessa', 'yara', 'yolanda', 'zenaide',
  'zilda', 'zuleide',
]);

// Rodada 30C: a lista grande (Brasil + Portugal, ~9 mil nomes — ver scripts/nomes/) chega depois,
// por import() DINÂMICO (nunca estático: entraria no pacote de arranque). Enquanto não chega, o
// palpite usa só o Set acima (instantâneo); quando chega, fica em cache em memória e os PRÓXIMOS
// palpites (avatarGenerico.js) passam a consultar as duas listas juntas — nenhuma tela força
// recarregar: a correção aparece na próxima vez que o palpite for pedido (próxima renderização).
let listaGrande = null; // Set<string> | null — null até carregar
let promessaCarregamento = null;

/** Dispara (uma vez só; chamadas seguintes reaproveitam) o carregamento da lista grande. */
export function carregarNomesFemininos() {
  if (!promessaCarregamento) {
    promessaCarregamento = import('./nomesFemininos.lista.js')
      .then((modulo) => { listaGrande = new Set(modulo.default); return listaGrande; })
      .catch(() => null); // sem rede/offline: fica no palpite pequeno, para sempre — não é erro fatal
  }
  return promessaCarregamento;
}

/** `nome` já normalizado (minúsculas, sem acento — ver normalizarNome em avatarGenerico.js). */
export function nomeEhFemininoConhecido(nomeNormalizado) {
  if (NOMES_FEMININOS.has(nomeNormalizado)) return true;
  return !!listaGrande && listaGrande.has(nomeNormalizado);
}
