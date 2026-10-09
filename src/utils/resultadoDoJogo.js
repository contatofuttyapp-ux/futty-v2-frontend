// Futty v2.0 — as contas do resultado de um jogo, puras (sem React, sem rede), para os DOIS editores — o
// ResultadoEditor (o do Jogo: PATCH /api/games/:id/resultado) e o ResultadoModal (o de Ajustes: PATCH
// /api/feed/games/:id/resultado) — e para o passo a passo do Jogo passado, onde eles devolvem os dados em
// vez de salvar. Um corpo só por pedido, montado aqui, seja qual for a tela que o manda.
import { chaveDoJogador } from './seloDoSorteio';

/** Soma dos gols de cada time (0 = A, 1 = B) a partir do mapa { chave: gols } (chaveDoJogador) e dos jogadores `{ user_id, nome, timeIndex }`. */
export function somaDeGolsPorTime(golsMap, jogadores) {
  const soma = [0, 0];
  for (const j of jogadores || []) {
    if (j?.timeIndex === 0 || j?.timeIndex === 1) soma[j.timeIndex] += Math.max(0, Number(golsMap?.[chaveDoJogador(j)]) || 0);
  }
  return soma;
}

/** Algum gol foi marcado na lista de gols? */
export function temGols(golsMap) {
  return Object.values(golsMap || {}).some((n) => Number(n) > 0);
}

/**
 * O que os dois campos do placar mostram no modo "devolver": o que a pessoa digitou ou, enquanto ela não mexeu (`null`), a soma dos gols que
 * ela registrou — e vazio quando não há gol nenhum (o placar é opcional). O valor MOSTRADO é o valor ENVIADO.
 * @returns {{ a: string, b: string }}
 */
export function placarEfetivo({ placarA, placarB, golsMap }, jogadores) {
  const [somaA, somaB] = somaDeGolsPorTime(golsMap, jogadores);
  const comGols = temGols(golsMap);
  return {
    a: placarA ?? (comGols ? String(somaA) : ''),
    b: placarB ?? (comGols ? String(somaB) : ''),
  };
}

/**
 * O nível do resultado de um jogo passado (o motor tem 4): 0 sem resultado · 1 quem ganhou · 2 + placar · 3 + gols de cada um.
 * Sem quem ganhou não há nada para gravar, mesmo que haja gols digitados.
 */
export function nivelDoPassado(estado, jogadores) {
  if (!estado?.vencedor) return 0;
  if (temGols(estado.golsMap)) return 3;
  const { a, b } = placarEfetivo(estado, jogadores);
  return a !== '' || b !== '' ? 2 : 1;
}

/**
 * O corpo do PATCH /api/games/:id/resultado. Convidado sem app não tem user_id: o gol dele vai por
 * `convidado_nome` (a mesma chave do motor identifica o jogador dos dois lados, sem misturar dois convidados).
 * @param {{ nivel: number, vencedor?: string|null, placarA?: any, placarB?: any, golsMap?: object }} estado
 * @param {Array<{ user_id: string, nome: string }>} jogadores quem entra na lista de gols (nível 3)
 */
export function corpoDoResultadoDoJogo({ nivel, vencedor, placarA, placarB, golsMap }, jogadores) {
  const body = { nivel };
  if (nivel >= 1) body.time_vencedor = vencedor;
  if (nivel >= 2) {
    body.placar_a = Math.max(0, Number(placarA) || 0);
    body.placar_b = Math.max(0, Number(placarB) || 0);
  }
  if (nivel === 3) {
    body.gols = (jogadores || []).map((j) => ({
      user_id: j.user_id || null,
      convidado_nome: j.user_id ? null : String(j.nome || '').trim() || null,
      gols: golsMap?.[chaveDoJogador(j)] || 0,
    }));
  }
  return body;
}

/** O que o ResultadoModal guarda enquanto a pessoa preenche (campeão, artilheiro, destaque, rodada de cerveja). */
export const PREMIOS_VAZIOS = {
  campeaoIdx: null, campeaoFoto: null,
  temArt: false, artId: '', artGols: 1,
  temDest: false, destId: '', destTitulo: '',
  temRodada: false, rodadaId: '', rodadaFoto: null,
};

/**
 * O corpo do PATCH /api/feed/games/:id/resultado. Sem `soPreenchidos` (o modal de Ajustes), o que a pessoa desligou vai como `null` — é assim
 * que um prêmio se apaga ao EDITAR um resultado. Com `soPreenchidos` (jogo novo, nada para apagar), só vai o que existe.
 */
export function corpoDosPremios(v, { soPreenchidos = false } = {}) {
  const patch = {};
  if (v.campeaoIdx !== null && v.campeaoIdx !== undefined) patch.campeao_time_index = v.campeaoIdx;
  if (v.campeaoFoto) patch.campeao_foto_url = v.campeaoFoto;
  patch.artilheiro_user_id = v.temArt && v.artId ? v.artId : null;
  patch.artilheiro_gols = v.temArt && v.artId ? Math.max(1, Number(v.artGols) || 1) : null;
  patch.destaque_user_id = v.temDest && v.destId ? v.destId : null;
  patch.destaque_titulo = v.temDest && v.destId ? (v.destTitulo || '').trim() || null : null;
  patch.rodada_user_id = v.temRodada && v.rodadaId ? v.rodadaId : null;
  if (v.temRodada && v.rodadaId && v.rodadaFoto) patch.rodada_foto_url = v.rodadaFoto;
  if (!soPreenchidos) return patch;
  return Object.fromEntries(Object.entries(patch).filter(([, valor]) => valor !== null));
}

/** Há campeão, artilheiro, destaque ou rodada para mandar ao PATCH do feed? (Sem isso o pedido nem sai — e ninguém é avisado.) */
export function temPremio(corpo) {
  return corpo.campeao_time_index != null || !!corpo.artilheiro_user_id || !!corpo.destaque_user_id || !!corpo.rodada_user_id;
}
