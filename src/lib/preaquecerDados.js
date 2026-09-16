// Futty v2.0 — Pré-aquecimento (VELOCIDADE 6B, 15-set). IDEIA DO DONO:
//
//   "o app abre leve e, em segundo plano, baixa o resto — dados e imagens de
//    todas as abas — para que o primeiro toque em qualquer aba seja instantâneo."
//
// Corre UMA vez por abertura do app, depois de o Início já estar pintado, e só
// quando o aparelho está parado (requestIdleCallback). Os dados vão para as
// MESMAS chaves do cache local que cada tela lê — não há caminho especial nem
// formato paralelo: a tela nem sabe que isto existe, só encontra o cache cheio.
// As imagens vão para o cache HTTP do WebView através de `new Image()`, nos
// mesmos tamanhos que as telas pedem, para a tela depois nem ir à rede.
//
// Regras de boa educação:
//   · um pedido de cada vez (nunca competir com o que a tela está a fazer);
//   · nada disto acontece em ligação fraca ou com poupança de dados ligada;
//   · qualquer falha é silenciosa — isto é adiantamento, nunca uma dependência.
import { apiFetch } from './api';
import { gravarCache, lerCacheComIdade } from './cacheLocal';
import { marcarPreaquecimento, registarPreaquecimento, marcarPreaquecimentoAgendado, tarefaEmCurso } from './diagnostico';
import { esperarSeOcupado, quandoParado, respirar } from './ritmo';
import { urlImagem } from '../utils/avatar';

// VELOCIDADE 8 (16-set) — 4 → 2. Quatro imagens ao mesmo tempo não é só banda:
// são quatro descodificações a disputar a thread com a tela que a pessoa está a
// tocar. Duas adiantam quase tanto e não se sentem.
const IMAGENS_EM_PARALELO = 2;
// Teto de imagens por aquecimento: um time grande tem 30+ avatares e não vale
// a pena descer todos — as primeiras são as que aparecem nas listas.
const MAX_IMAGENS = 24;
// Velocidade 7B: a mesma janela de frescor das telas (useApiComCache, Figurinha).
// Se a pessoa abriu a Figurinha antes de o aquecimento chegar aos selos, a tela
// já os buscou e gravou — pedir de novo por trás era o "selos em dobro".
const FRESCO_MS = 30000;

let jaCorreu = false;

/** Reinicia entre contas (chamado no signOut, a par do limparCacheLocal). */
export function esquecerPreaquecimento() {
  jaCorreu = false;
}

// VELOCIDADE 8 — O emRepouso() de antes usava requestIdleCallback e caía num
// setTimeout(1500) quando ele não existe. O Safari NÃO TEM requestIdleCallback:
// no iPhone era SEMPRE o setTimeout, ou seja, isto arrancava 1,5 s depois do
// Início — em cima do primeiro toque da pessoa. Agora quem decide é o
// lib/ritmo.js: 1ª pintura feita + 3 s sem toque nenhum (mais 5 s na primeira
// abertura de uma versão nova, que é a pior de todas).

// Ligação fraca ou "poupar dados" → não se gasta megabyte nenhum a adivinhar.
function ligacaoPermite() {
  const c = typeof navigator !== 'undefined' ? navigator.connection : null;
  if (!c) return true; // sem informação (iOS), assume-se que dá
  if (c.saveData) return false;
  return !['2g', 'slow-2g'].includes(c.effectiveType);
}

/** Recolhe URLs do proxy de imagem dentro de um payload qualquer. */
function colherImagens(no, saida, prof = 0) {
  if (!no || prof > 8 || saida.size >= MAX_IMAGENS) return;
  if (typeof no === 'string') {
    if (no.includes('/api/media/')) saida.add(no);
    return;
  }
  if (Array.isArray(no)) {
    for (const v of no) colherImagens(v, saida, prof + 1);
    return;
  }
  if (typeof no === 'object') {
    for (const v of Object.values(no)) colherImagens(v, saida, prof + 1);
  }
}

function baixarImagem(url, crossOrigin) {
  return new Promise((resolve) => {
    const img = new Image();
    // O canvas da figurinha carrega o avatar do próprio usuário com
    // crossOrigin='anonymous'. O CORS manda Vary: Origin, por isso o browser
    // guarda as duas formas em entradas SEPARADAS do cache — aquecer sem o
    // crossOrigin não serviria de nada ao canvas.
    if (crossOrigin) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

async function emLotes(tarefas, tamanho) {
  let feitas = 0;
  for (let i = 0; i < tarefas.length; i += tamanho) {
    // Antes de CADA lote: se a pessoa mexeu na tela, espera 1,5 s. O
    // quandoParado só decide quando começar; um aquecimento de 20 imagens dura
    // muito mais do que o toque seguinte demora a chegar.
    await esperarSeOcupado();
    await respirar();
    const lote = tarefas.slice(i, i + tamanho).map((t) => t());
    const r = await Promise.all(lote);
    feitas += r.filter(Boolean).length;
  }
  return feitas;
}

/**
 * @param {string} userId
 * @param {object} dadosInicio - o payload de /api/inicio já resolvido (para
 *   saber o time principal e aproveitar as imagens que ele já traz).
 */
export function preaquecer(userId, dadosInicio) {
  if (jaCorreu || !userId) return;
  jaCorreu = true;
  if (!ligacaoPermite()) return;

  quandoParado(async () => {
    const t0 = Date.now();
    // Enquanto isto corre, o medidor de travadas atribui a este trabalho
    // qualquer quadro perdido — é assim que se prova (ou se ilibam) as imagens
    // em segundo plano como causa do engasgo.
    marcarPreaquecimento(true);
    const slug = dadosInicio?.teams?.teams?.[0]?.slug || null;
    const payloads = [dadosInicio];
    let itens = 0;

    // ── Dados, um pedido de cada vez ──
    // As chaves são EXATAMENTE as que as telas leem: 'feed' (Feed.jsx),
    // 'ranking:<slug>' (useRanking), 'selos' (Figurinha), 'blocks' (MeuPerfil).
    const passos = [];
    if (slug) {
      passos.push(['/api/feed', 'feed', (d) => d]);
      passos.push([`/api/teams/${slug}/ranking`, `ranking:${slug}`, (d) => d]);
    }
    // A Figurinha guarda só o ARRAY de selos, não o payload — tem de ser igual,
    // senão a tela lia um objeto onde espera uma lista.
    passos.push(['/api/me/selos', 'selos', (d) => d?.selos || []]);
    passos.push(['/api/blocks', 'blocks', (d) => d]);

    for (const [rota, chave, moldar] of passos) {
      const recente = lerCacheComIdade(userId, chave);
      if (recente && recente.idadeMs < FRESCO_MS) {
        payloads.push(recente.dados);
        continue;
      }
      // Entre cada passo: um toque manda esperar, e um setTimeout(0) devolve a
      // thread ao browser antes de gravar o próximo payload no cache (que é
      // JSON.stringify de um objeto grande — trabalho síncrono a valer).
      await esperarSeOcupado();
      await respirar();
      // Rodada 12A: o passo fica anotado em qualquer travada que caia aqui. O
      // caro não é esperar a rede, é o gravarCache logo abaixo (JSON.stringify
      // de um payload grande é trabalho síncrono a valer) — e sem o nome do
      // passo o relatório dizia só "pré-aquecimento".
      const fimDaTarefa = tarefaEmCurso(`preaquecimento:${chave}`);
      try {
        const d = await apiFetch(rota, { segundoPlano: true });
        gravarCache(userId, chave, moldar(d));
        payloads.push(d);
        itens += 1;
      } catch {
        /* silencioso: isto é adiantamento, não uma dependência */
      } finally {
        fimDaTarefa();
      }
    }

    // ── Imagens ──
    const urls = new Set();
    for (const p of payloads) colherImagens(p, urls);

    // O avatar do PRÓPRIO usuário é o mais importante: é o cromo do Início e
    // entra no canvas da figurinha. Vai em 512 e DUAS VEZES — com e sem
    // crossOrigin. Não é desperdício: o CORS manda `Vary: Origin`, por isso o
    // browser guarda as duas formas em entradas SEPARADAS do cache. O canvas
    // carrega-o com crossOrigin (senão o toBlob() lançava); a <img> da tela da
    // Figurinha carrega-o sem. Aquecer só uma deixava a outra a ir à rede.
    const meu = dadosInicio?.me?.user?.avatar_url || null;
    const tarefas = [];
    if (meu && meu.includes('/api/media/')) {
      const grande = urlImagem(meu, 512);
      tarefas.push(() => baixarImagem(grande, true));
      tarefas.push(() => baixarImagem(grande, false));
      // `meu` FICA no conjunto de propósito: o mesmo avatar também aparece
      // pequeno (badge da Figurinha, listas de membros), e 128 é outra entrada
      // do cache. Aquecer só o 512 deixava o pequeno a ir à rede.
    }
    // A foto ORIGINAL (a que a pessoa enviou) é outra imagem, e a tela da
    // Figurinha mostra-a grande (46vh) — pede-a em 512, não em 128 como as
    // listas. Sem isto, abrir a Figurinha continuava a custar uma ida à rede.
    const minhaFoto = dadosInicio?.me?.user?.foto_url || null;
    if (minhaFoto && minhaFoto.includes('/api/media/') && minhaFoto !== meu) {
      tarefas.push(() => baixarImagem(urlImagem(minhaFoto, 512), false));
    }
    // O resto vai no tamanho das listas.
    for (const u of urls) tarefas.push(() => baixarImagem(urlImagem(u, 128), false));

    const imagens = await emLotes(tarefas, IMAGENS_EM_PARALELO);
    marcarPreaquecimento(false);
    registarPreaquecimento({ itens, imagens, ms: Date.now() - t0 });
  }, { aoAgendar: marcarPreaquecimentoAgendado });
}
