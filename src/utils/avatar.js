// Futty v2.0 — FONTE ÚNICA DE VERDADE para resolução de avatares.
// Todos os sítios que mostram avatares do sorteio (slot, resultado, canvas de
// download) importam daqui. Sem exceção.

// ─── Configuração ────────────────────────────────────────────────────────────

// URL base do backend (onde estão fotos servidas pelo backend, ex.: /uploads).
function backendBase() {
  const v = import.meta.env.VITE_API_URL;
  return String(v || 'http://localhost:3001').trim().replace(/\/+$/, '');
}

// Ordem das cores por índice de time (0=verde, 1=azul, 2=vermelho, 3=preto).
export const COR_POR_TIME = ['verde', 'azul', 'vermelho', 'preto'];
const CORES_VALIDAS = ['verde', 'azul', 'vermelho', 'preto'];

// ─── Funções base ─────────────────────────────────────────────────────────────

// Converte um caminho do backend em URL absoluta. URLs http(s) passam intactas.
export function urlAsset(caminho) {
  if (!caminho) return '';
  const s = String(caminho).trim();
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  return `${backendBase()}${s.startsWith('/') ? s : `/${s}`}`;
}

// Genérico colorido (servido pelo FRONTEND em /avatares/genericos/<cor>.png).
// Nota V2: os genéricos estão no public do frontend, não no backend.
function genericoColorido(cor) {
  return `/avatares/genericos/${cor}.png`;
}

// Nome de exibição do jogador (nome_jogador → nome → #id).
export function nomeJogador(j) {
  return String(j?.nome_jogador ?? j?.nome ?? '').trim() || `#${j?.id ?? j?.user_id ?? '?'}`;
}

// Iniciais do nome (2 letras).
export function iniciaisNome(nome) {
  const n = String(nome ?? '').trim();
  if (!n) return '?';
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

// ─── Resolução de avatar por cor do time ─────────────────────────────────────

// Devolve o URL do avatar do jogador para uma cor de time.
// Prioridade: foto personalizada na cor (campos V1) → avatar_url (foto única V2)
//             → foto verde (fallback V1) → genérico colorido (frontend).
// Usada em TODOS os lugares: slot, resultado e canvas de download.
export function avatarParaCor(jogador, cor) {
  const c = CORES_VALIDAS.includes(cor) ? cor : 'verde';
  const campo = {
    verde: 'avatar_verde_exibir',
    azul: 'avatar_azul_exibir',
    vermelho: 'avatar_vermelho_exibir',
    preto: 'avatar_preto_exibir',
  }[c];

  // 1. Foto personalizada na cor do time (dados estilo V1, se existirem)
  const fotoCor = urlAsset(jogador?.[campo]);
  if (fotoCor) return fotoCor;

  // 2. Foto única do jogador (V2) ou fallback verde (V1)
  const fotoUnica = urlAsset(jogador?.avatar_url) || urlAsset(jogador?.avatar_verde_exibir);
  if (fotoUnica) return fotoUnica;

  // 3. Último recurso: genérico colorido (não animal). Em "preto" não há ficheiro,
  //    o onError de quem usa cai nas iniciais.
  return genericoColorido(c);
}

// Devolve a cor do time para um índice (0-based).
export function corDoTime(indice) {
  return COR_POR_TIME[indice % COR_POR_TIME.length];
}
