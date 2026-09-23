// Futty v2.0 — Publicidade de uma SESSÃO, não de uma tela (VELOCIDADE 9, 23-set).
//
// O PROBLEMA, medido no relatório do dono (build 28, iPhone, Lisboa): num
// percurso de 20 segundos, 7 dos 22 pedidos eram publicidade — quatro
// `GET /api/ads?pagina=…` (498, 539, 578, 323 ms) e três `POST /api/ads/evento`
// (255, 264, 542 ms). Trabalho de servidor: 0 a 20 ms. Era tudo distância, paga
// outra vez em cada tela, por uma faixa de 100 px.
//
// As campanhas não mudam a meio de uma sessão (a rotação entre elegíveis é por
// minuto, no servidor). Então:
//
//   · os slots das cinco páginas vêm JUNTOS — dentro do /api/inicio (quem abre
//     no Início não paga pedido nenhum) ou de um `GET /api/ads/sessao` para
//     quem entra por outra porta;
//   · as impressões e os cliques ficam numa fila e saem em LOTE, quando a tela
//     já não está à espera de nada — nunca no caminho da pintura.
import { apiFetch } from './api';

// Quanto tempo se serve a mesma resposta sem voltar a perguntar. O servidor
// manda o seu valor (`validadeMs`); isto é a rede de segurança.
const VALIDADE_OMISSAO_MS = 4 * 60 * 1000;
// A fila de eventos espera este tanto de sossego antes de sair. Medido na
// bancada: com 4 s o lote saía a meio da tela SEGUINTE (a pessoa troca de aba
// mais depressa do que isso) e voltava a haver dois pedidos em vez de um. Com
// 10 s, um percurso normal manda UM lote — ou nenhum, porque o despejo ao sair
// da frente chega primeiro.
const ESPERA_DA_FILA_MS = 10000;
const MAX_NA_FILA = 20;

let paginas = null;      // { inicio: ad|null, resenha: ad|null, ... }
let validoAte = 0;
let aCarregar = null;    // promessa em voo (evita duas idas à rede)
const ouvintes = new Set();

function avisar() {
  for (const fn of ouvintes) {
    try { fn(); } catch { /* um ouvinte partido não pode derrubar os outros */ }
  }
}

function valido() {
  return paginas !== null && Date.now() < validoAte;
}

/**
 * Guarda o que veio de fora (o /api/inicio traz `ads` desde a Velocidade 9).
 * É o caminho normal: quem abre o app no Início nunca pede anúncios.
 */
export function semearAds(ads) {
  if (!ads || !ads.paginas) return;
  paginas = ads.paginas;
  validoAte = Date.now() + (Number(ads.validadeMs) || VALIDADE_OMISSAO_MS);
  avisar();
}

/** O anúncio desta página, já em mãos (ou null). Não pede nada. */
export function lerAd(pagina) {
  return valido() ? (paginas[pagina] ?? null) : null;
}

/** Já se sabe o que mostrar nesta página? (false = ainda não há resposta) */
export function adsProntos() {
  return valido();
}

/**
 * Garante os anúncios da sessão. Só vai à rede se não houver nada válido em
 * mãos — e uma vez só, mesmo com cinco telas a perguntar ao mesmo tempo.
 */
export function garantirAds() {
  if (valido()) return Promise.resolve(paginas);
  if (aCarregar) return aCarregar;
  aCarregar = apiFetch('/api/ads/sessao')
    .then((r) => {
      semearAds(r);
      return paginas;
    })
    .catch(() => {
      // Sem anúncios não se estraga tela nenhuma: fica `null` e o AdCard não
      // renderiza. Tenta-se outra vez na próxima tela, não em ciclo.
      validoAte = Date.now() + 30000;
      paginas = paginas || {};
      avisar();
      return paginas;
    })
    .finally(() => { aCarregar = null; });
  return aCarregar;
}

/** Avisa quando os anúncios mudarem (chegada, ou validade renovada). */
export function assinarAds(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

// ─── Fila de eventos ─────────────────────────────────────────────────────────
const fila = [];
let temporizador = null;
let ligada = false;

function enviar({ comKeepalive = false } = {}) {
  if (temporizador != null) { clearTimeout(temporizador); temporizador = null; }
  if (!fila.length) return;
  const eventos = fila.splice(0, MAX_NA_FILA);
  // `keepalive` é o que deixa o pedido sobreviver ao app ir para segundo plano
  // (sendBeacon não serve: não leva o cabeçalho de sessão, e um corpo JSON
  // obrigaria a um preflight que o beacon não sabe esperar).
  apiFetch('/api/ads/eventos', {
    method: 'POST',
    body: JSON.stringify({ eventos }),
    ...(comKeepalive ? { keepalive: true } : {}),
  }).catch(() => { /* contagem agregada: um lote perdido não é um erro de tela */ });
}

function ligarDespejo() {
  if (ligada || typeof document === 'undefined') return;
  ligada = true;
  // Ao sair da frente (trocar de app, bloquear a tela) manda-se já o que houver.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') enviar({ comKeepalive: true });
  });
  window.addEventListener('pagehide', () => enviar({ comKeepalive: true }));
}

/**
 * Regista uma impressão ou um clique. Não vai à rede agora: entra na fila e
 * sai daqui a `ESPERA_DA_FILA_MS` de sossego, ou quando o app sair da frente.
 */
export function registarEventoAd(id, tipo) {
  if (!id) return;
  ligarDespejo();
  fila.push({ id, tipo: tipo === 'cli' ? 'cli' : 'imp' });
  // Um clique é intenção — costuma abrir outra app, e aí o lote tem de ir já.
  if (tipo === 'cli' || fila.length >= MAX_NA_FILA) { enviar({ comKeepalive: true }); return; }
  if (temporizador != null) clearTimeout(temporizador);
  temporizador = setTimeout(() => enviar(), ESPERA_DA_FILA_MS);
}
