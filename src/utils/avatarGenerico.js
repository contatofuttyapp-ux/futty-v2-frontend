// Futty v2.0 — Avatar genérico da casa. Jogador faceless
// vestindo o kit Dark Gold, usado como card do jogador ENQUANTO ele não gera o
// avatar IA próprio — substitui as iniciais e o empty state "espera por você".
// 6 variantes (masc m1-m3, fem f1-f3): o app NÃO pergunta sexo (Rodada 30A, decisão do
// dono) — a pessoa escolhe o dela num seletor (ver AvatarGenericoSheet); sem escolha, o
// palpite pelo primeiro nome escolhe o GRUPO (fem/masc, nomesFemininos.js) e o hash do
// id (ou do nome, sem id — convidado sem app) escolhe QUAL dos 3 dentro do grupo.
import { primeiroNome } from './primeiroNome';
import { NOMES_FEMININOS } from './nomesFemininos';

const BASE = 'https://ynzmjcvqdljffgbeqglh.supabase.co/storage/v1/object/public/kits';

export const AVATARES_GENERICOS_MASC = [
  { key: 'm1', url: `${BASE}/avatar-generico-1.png` },
  { key: 'm2', url: `${BASE}/avatar-generico-2.png` },
  { key: 'm3', url: `${BASE}/avatar-generico-3.png` },
];
export const AVATARES_GENERICOS_FEM = [
  { key: 'f1', url: `${BASE}/avatar-generico-f-1.png` },
  { key: 'f2', url: `${BASE}/avatar-generico-f-2.png` },
  { key: 'f3', url: `${BASE}/avatar-generico-f-3.png` },
];
export const AVATARES_GENERICOS_TODOS = [...AVATARES_GENERICOS_MASC, ...AVATARES_GENERICOS_FEM];

function hashId(id) {
  const s = String(id ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Mesma normalização da lista (sem acento, minúsculas) — tem de bater letra a letra com
// nomesFemininos.js para "Mariana"/"MARIANA"/"Márcia" caírem no Set.
function normalizarNome(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Palpite pelo primeiro nome: está na lista de femininos → grupo feminino; senão
// (sem nome também) o masculino, o padrão de sempre.
function poolPeloNome(nome) {
  const primeiro = normalizarNome(primeiroNome(nome));
  return primeiro && NOMES_FEMININOS.has(primeiro) ? AVATARES_GENERICOS_FEM : AVATARES_GENERICOS_MASC;
}

// `escolha` = users.avatar_generico ('m1'..'f3'), se a pessoa já escolheu. Sem escolha
// válida: o `nome` escolhe o grupo (fem/masc) e o hash do `userId` (ou do próprio nome,
// quando não há id — convidado sem app) escolhe qual dos 3 — mesma pessoa, mesmo boneco
// em todo lugar (Rodada 30A).
export function avatarGenericoUrl(userId, escolha, nome) {
  if (escolha) {
    const achado = AVATARES_GENERICOS_TODOS.find((a) => a.key === escolha);
    if (achado) return achado.url;
  }
  const pool = poolPeloNome(nome);
  const chave = userId != null ? userId : nome;
  return pool[hashId(chave) % pool.length].url;
}
