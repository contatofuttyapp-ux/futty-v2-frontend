// Futty v2.0 — Avatar genérico da casa (31-jul, ordem do dono). Jogador faceless
// vestindo o kit Dark Gold, usado como card do jogador ENQUANTO ele não gera o
// avatar IA próprio — substitui as iniciais e o empty state "espera por você".
// 6 variantes (masc m1-m3, fem f1-f3): o app NÃO pergunta sexo — a pessoa escolhe
// o dela num seletor (ver AvatarGenericoSheet); sem escolha, rodízio masculino por
// hash do id (comportamento original, antes de existir escolha).
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

// `escolha` = users.avatar_generico ('m1'..'f3'), se a pessoa já escolheu. Sem
// escolha válida, cai no rodízio determinístico de sempre (mesmo id → mesmo genérico).
export function avatarGenericoUrl(userId, escolha) {
  if (escolha) {
    const achado = AVATARES_GENERICOS_TODOS.find((a) => a.key === escolha);
    if (achado) return achado.url;
  }
  return AVATARES_GENERICOS_MASC[hashId(userId) % AVATARES_GENERICOS_MASC.length].url;
}
