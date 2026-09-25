// Futty v2.0 — O card mudou: tudo o que guarda o rosto antigo muda junto (RODADA 27, 25-set).
//
// Relato do dono, conta backup no celular: "não sei se o reenquadramento chega ao Início". Não chegava
// direito. A foto nova entrava no perfil (PerfilContext) e no cache `me`, mas o cache do Início
// (`inicio`, com o `me` de ANTES lá dentro) e os do Ranking, do Feed e dos times seguiam com o rosto
// velho — e o Início, ao montar, hidratava o perfil A PARTIR desse cache velho e pintava o cromo
// antigo por ~2 s, até o /api/inicio responder (medido no iPhone simulado: "cromo antigo → cromo novo",
// 3,9 s; o Ranking nem trocou, porque o cache dele é "fresco" por 30 s e a tela nem pede de novo).
//
// Aqui mora tudo o que se faz DEPOIS de uma mudança no card, num sítio só:
//
//   · `alinharCachesComOPerfil` — quando um perfil CONFIRMADO chega (o PATCH da Figurinha, o GET
//     /api/me depois de gerar, o /api/inicio), o `me` guardado no Início passa a ser esse, e, se o
//     rosto mudou (foto, recorte, figurinha, genérico), cada objeto que é ESTA pessoa nos outros
//     caches (linha do Ranking, presença, post do Feed, membro do time) recebe os campos novos.
//     Não renova o carimbo: a resposta continua tão velha quanto era, só concorda com a mudança;
//   · `aquecerImagensDoRosto` — o browser começa a baixar a foto nova nos tamanhos que as telas
//     pedem (o motor já deixa os derivados prontos no upload; ver backend/utils/derivadosMidia.js),
//     e a primeira tela que a pedir a encontra no cache HTTP.
//
// Só troca campos que o objeto JÁ tem: uma linha do Ranking sem `foto_url` não ganha `foto_url`.
import { PREFIXO, chaveCompleta } from './cacheLocal';
import { urlAsset, urlImagem } from '../utils/avatar';

/**
 * As chaves (sem o prefixo) que `userId` tem guardadas. Serve a quem precisa de olhar
 * para TODAS as respostas guardadas de uma vez (lib/cacheCard.js). Nunca lança.
 */
export function chavesDoCache(userId) {
  if (!userId) return [];
  const prefixo = `${PREFIXO}${userId}:`;
  const chaves = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefixo)) chaves.push(k.slice(prefixo.length));
    }
  } catch {
    /* localStorage indisponível — sem chaves */
  }
  return chaves;
}

/**
 * Reescreve o conteúdo de uma entrada que JÁ existe, SEM renovar o carimbo (Rodada 27).
 *
 * Emendar não é buscar: a resposta continua tão velha quanto era (é a idade dela que decide se a
 * tela revalida por trás), só que agora concorda com uma mudança que a própria pessoa acabou de
 * fazer — trocou a foto, o enquadramento, o genérico. Sem isto, a foto nova morava no perfil e a
 * antiga ficava viva no cache do Início, do Ranking, da Resenha, e voltava a aparecer na primeira
 * tela que a lesse (o "reenquadramento não chega ao Início" do relato do dono).
 *
 * `emendar(dados)` recebe o conteúdo já lido e devolve o novo — ou `undefined` para deixar a
 * entrada como está (nada é regravado). Devolve true se regravou. Nunca lança.
 */
export function emendarCache(userId, chave, emendar) {
  if (!userId) return false;
  try {
    const k = chaveCompleta(userId, chave);
    const bruto = localStorage.getItem(k);
    if (!bruto) return false;
    const entrada = JSON.parse(bruto);
    if (!entrada || entrada.dados == null) return false;
    const novos = emendar(entrada.dados);
    if (novos === undefined) return false;
    localStorage.setItem(k, JSON.stringify({ ...entrada, dados: novos }));
    return true;
  } catch {
    return false; // quota cheia / entrada corrompida — cache é só otimização
  }
}

/** O que identifica o rosto de uma pessoa em qualquer resposta guardada. */
export const CAMPOS_DO_ROSTO = ['avatar_url', 'foto_url', 'foto_original_url', 'avatar_generico'];

const PROFUNDIDADE_MAX = 12;
const ehObjeto = (x) => x !== null && typeof x === 'object';

/** O rosto de um `user` (só os campos que ele traz), pronto para copiar. */
export function rostoDe(user) {
  const r = {};
  if (!ehObjeto(user)) return r;
  for (const campo of CAMPOS_DO_ROSTO) if (campo in user) r[campo] = user[campo] ?? null;
  return r;
}

/** O rosto mudou entre dois `user`? (`null` e ausente contam como o mesmo). */
export function rostoMudou(antes, depois) {
  return CAMPOS_DO_ROSTO.some((c) => (antes?.[c] ?? null) !== (depois?.[c] ?? null));
}

/**
 * Percorre `no` e, em cada objeto que é a pessoa `userId` (`id` ou `user_id`), troca os campos do rosto
 * que ele JÁ traz. Mexe no próprio objeto (quem chama acabou de o ler do localStorage: é dele).
 * Devolve true se trocou alguma coisa.
 */
export function emendarRostoNoNo(no, userId, rosto, prof = 0) {
  if (!ehObjeto(no) || prof > PROFUNDIDADE_MAX) return false;
  let mexeu = false;
  if (Array.isArray(no)) {
    for (const item of no) if (emendarRostoNoNo(item, userId, rosto, prof + 1)) mexeu = true;
    return mexeu;
  }
  if (no.id === userId || no.user_id === userId) {
    for (const campo of CAMPOS_DO_ROSTO) {
      if (campo in no && campo in rosto && no[campo] !== rosto[campo]) {
        no[campo] = rosto[campo];
        mexeu = true;
      }
    }
  }
  for (const valor of Object.values(no)) {
    if (ehObjeto(valor) && emendarRostoNoNo(valor, userId, rosto, prof + 1)) mexeu = true;
  }
  return mexeu;
}

/**
 * Um `me` CONFIRMADO chegou (não o do cache!). Alinha os caches guardados com ele.
 *
 * @param {string} userId
 * @param {object} me        o payload inteiro ({ user, slots, stats }), como o /api/me devolve
 * @param {object} [anterior] o `me` que estava em memória antes — para saber se o rosto mudou. Sem ele,
 *                            assume-se que mudou (o custo é só percorrer os caches uma vez).
 * @param {{ ignorar?: string[] }} [opcoes] chaves que quem chama grava por conta própria (o
 *                            InicioContext grava o `inicio` inteiro logo a seguir a hidratar).
 * @returns {{ rostoMudou: boolean, chaves: string[] }} o que foi olhado (para teste e diagnóstico)
 */
export function alinharCachesComOPerfil(userId, me, anterior, { ignorar = [] } = {}) {
  if (!userId || !ehObjeto(me?.user)) return { rostoMudou: false, chaves: [] };
  const mudou = !anterior?.user || rostoMudou(anterior.user, me.user);
  const rosto = rostoDe(me.user);
  // Sem mudança no rosto só o `me` do Início precisa acompanhar (fundo, kit, nome, créditos...): uma
  // entrada, e nenhuma varredura. Com mudança, todas as respostas guardadas, menos o `me` (esse o
  // PerfilContext acabou de gravar).
  const chaves = (mudou ? chavesDoCache(userId).filter((c) => c !== 'me') : ['inicio']).filter((c) => !ignorar.includes(c));
  for (const chave of chaves) {
    emendarCache(userId, chave, (dados) => {
      let novo = dados;
      let mexeu = false;
      if (chave === 'inicio' && ehObjeto(dados) && ehObjeto(dados.me) && dados.me !== me) {
        novo = { ...dados, me }; // o Início guarda o `me` inteiro, e é dele que o cromo nasce
        mexeu = true;
      }
      if (mudou && emendarRostoNoNo(novo, userId, rosto)) mexeu = true;
      return mexeu ? novo : undefined;
    });
  }
  return { rostoMudou: mudou, chaves };
}

/**
 * O que o PerfilContext chama a cada perfil CONFIRMADO (via lib/alinharCard.js): alinha os caches e, se o
 * rosto mudou, o browser já começa a baixar a foto nova. `doInicio`: o `me` veio dentro do /api/inicio,
 * que o InicioContext grava por conta própria logo a seguir — o `inicio` fica de fora.
 */
export function aoAceitarPerfil(userId, me, anterior, doInicio = false) {
  // Perfil igual ao que já estava (o polling de "gerando" chega a cada 5 s): nada a alinhar.
  if (anterior && JSON.stringify(anterior) === JSON.stringify(me)) return false;
  const { rostoMudou: mudou } = alinharCachesComOPerfil(userId, me, anterior, { ignorar: doInicio ? ['inicio'] : [] });
  if (mudou && anterior) aquecerImagensDoRosto(me.user, anterior.user);
  return mudou;
}

// Os tamanhos em que as telas pedem a foto da pessoa — o mesmo conjunto que o motor deixa pronto no
// upload (backend/utils/derivadosMidia.js, TAMANHOS_DA_FOTO): o cromo e a Figurinha em 512 (o canvas
// pede com CORS; a <img> sem), as listas em 128 quadrado (Ranking, Presença, Início), o Perfil em 128.
function pedidosDaFoto(url) {
  const base = urlAsset(url);
  return [
    { src: urlImagem(base, 512), cors: true },
    { src: urlImagem(base, 512), cors: false },
    { src: urlImagem(base, 128, { quadrado: true }), cors: false },
    { src: urlImagem(base, 128), cors: false },
  ];
}

/**
 * O browser começa a baixar o rosto NOVO (o que mudou entre `anterior` e `user`) nos tamanhos das
 * telas. Só o proxy de imagem: o resto (genéricos, foto do Google) já tem cache próprio.
 * O `crossOrigin` das duas formas de 512 não é capricho: o motor manda `Vary: Origin`, então o
 * cache HTTP guarda a forma do canvas e a da <img> em entradas SEPARADAS (ver preaquecerDados.js).
 */
export function aquecerImagensDoRosto(user, anterior) {
  if (typeof Image === 'undefined' || !ehObjeto(user)) return 0;
  const novas = new Set();
  for (const campo of ['avatar_url', 'foto_url']) {
    const u = user[campo];
    if (typeof u === 'string' && u.includes('/api/media/') && u !== anterior?.[campo]) novas.add(u);
  }
  const pedidos = [...novas].flatMap(pedidosDaFoto);
  if (!pedidos.length) return 0;
  // Depois do quadro atual: quem acabou de trocar a foto está com a tela ocupada a pintá-la.
  setTimeout(() => {
    for (const { src, cors } of pedidos) {
      try {
        const img = new Image();
        if (cors) img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.src = src;
      } catch { /* adiantamento: nunca uma dependência */ }
    }
  }, 0);
  return pedidos.length;
}

/**
 * O estado dos Brilhantes (direito, créditos, pedidos) mudou — gerou, pediu ativação — e o Início
 * guardado ainda diz o que valia antes. A Figurinha se abre a partir dele (brilhanteDoInicio), então
 * sem isto o contador "N gerações restantes" nascia com o número de antes de gerar. Mesmo formato que
 * `estadoBrilhantes()` devolve, escrito no formato que o /api/inicio traz.
 */
export function espelharBrilhantesNoInicio(userId, estado) {
  if (!userId || !ehObjeto(estado?.direito)) return false;
  return emendarCache(userId, 'inicio', (dados) => {
    if (!ehObjeto(dados)) return undefined;
    return {
      ...dados,
      brilhante: {
        ...(ehObjeto(dados.brilhante) ? dados.brilhante : {}),
        fonte: estado.direito.fonte ?? null,
        team_id: estado.direito.team_id ?? null,
        kit_id: estado.direito.kit_id ?? null,
        restantes: estado.direito.restantes ?? 0,
        creditos: estado.creditos ?? 0,
      },
      pedidos_brilhante: Array.isArray(estado.pedidos) ? estado.pedidos : (dados.pedidos_brilhante || []),
    };
  });
}
