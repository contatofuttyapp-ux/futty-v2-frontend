// ═══════════════════════════════════════════════════════════════════════════════
// SOM SELADO — módulo isolado do som do sorteio.
// LEI: alterações VISUAIS NUNCA tocam neste módulo. As animações CHAMAM a API abaixo
// e jamais mexem nos players de áudio diretamente — volumes inclusive: quem pede
// um efeito não escolhe o quão alto ele sai.
//
// RODADA 14A (16-set) — OS SONS SÃO NOSSOS. Os três efeitos deixaram de ser
// arquivos de banco de sons e passaram a nascer em código: `scripts/gerar-sons.mjs`
// sintetiza onda a onda e o `ffmpeg-static` encoda. Direito autoral 100% nosso,
// receita e semente em SONS.md (raiz do frontend). Nada baixado, nada de IA de
// música — nem material "CC0", que continua sendo de terceiros.
//
// O SORTEIO NÃO TEM MÚSICA (lei do dono, CLAUDE.md). Ficam TRÊS efeitos:
//   tique   — o rolo passando um símbolo, em trem enquanto gira (3 variantes)
//   clac    — o rolo TRAVANDO: um jogador apareceu
//   jackpot — os times ficaram prontos: a máquina acabou de dar prêmio
//
// O tique mudou de natureza na 14A: era um MP3 longo em loop (slot-machine.mp3),
// agora é um trem de tiques curtos disparado por temporizador, alternando as 3
// variantes. É o que permite o rolo desacelerar de verdade — `girarLento` espaça
// os tiques em vez de arrastar o playbackRate de uma gravação.
//
// Fora do app (FORA-DO-APP, com linha no MANIFESTO): a trilha e a Victory, que
// eram música; e agora os três arquivos de banco que estes cinco substituem.
//
// API: ligado(get) · escolhido(get) · toggle · ligarPorOmissao · desfazerOmissao
//   · girar/girarLento/pararGiro · revelar · fecharTime · silenciar · autoTeste
// ═══════════════════════════════════════════════════════════════════════════════
import { urlAsset } from '../utils/avatar';

// Os caminhos passam por urlAsset(): na web é a mesma origem; no app nativo os
// sons não viajam dentro do pacote, vêm do site e ficam em cache.
const TIQUES = ['/sons/tique-1.mp3', '/sons/tique-2.mp3', '/sons/tique-3.mp3'];
const CAMINHOS = { clac: '/sons/clac.mp3', jackpot: '/sons/jackpot.mp3' };
// Volumes da lei (Rodada 14A). Vivem AQUI, não em quem chama.
const VOL = { tique: 0.5, clac: 0.7, jackpot: 1.0 };
// Espaçamento do trem de tiques. O rolo leva 0,34-0,50 s por volta de 6 símbolos
// (o --sd do CSS), ou seja ~60-80 ms por símbolo: 70 ms solto e 115 ms depois de
// desacelerar é o que soa como a mesma máquina perdendo força.
const PASSO_RAPIDO = 70;
const PASSO_LENTO = 115;

const CHAVE_SOM = 'futty_sorteio_som';
const falhou = {};
let ligado = false;
// RODADA 12A — "nunca escolheu" e "escolheu desligado" deixam de ser a mesma
// coisa. Os dois davam som desligado, mas só o primeiro pode ser sobreposto pelo
// padrão de quem toca em "Sortear": quem desligou à mão desligou, e o app não
// tem o direito de voltar a ligar sozinho.
let escolheu = false;
try {
  const guardado = localStorage.getItem(CHAVE_SOM);
  escolheu = guardado != null;
  ligado = guardado === '1';
} catch { /* SSR/priv */ }

/**
 * Cada efeito tem uma roda de players. Um elemento só não serve: o clac dispara
 * de 130 em 130 ms e dura 120, o tique de 70 em 70 e dura 60 — reaproveitar o
 * mesmo Audio cortaria o toque anterior. Com 3 na roda, cada um só volta a ser
 * usado depois de já ter acabado, e ninguém aloca Audio dentro do laço.
 */
function roda(chave, fontes, tamanho) {
  const els = [];
  for (let i = 0; i < tamanho; i += 1) {
    const a = new Audio(urlAsset(fontes[i % fontes.length]));
    a.preload = 'auto';
    a.addEventListener('error', () => { falhou[chave] = true; });
    els.push(a);
  }
  return els;
}

const rodas = {};
let volta = {};
function tocar(chave, fontes, tamanho, vol) {
  if (!ligado || falhou[chave]) return;
  try {
    if (!rodas[chave]) { rodas[chave] = roda(chave, fontes, tamanho); volta[chave] = 0; }
    const els = rodas[chave];
    const a = els[volta[chave] % els.length];
    volta[chave] += 1;
    a.volume = vol;
    a.currentTime = 0;
    const p = a.play(); if (p && p.catch) p.catch(() => {});
  } catch { /* ignore */ }
}

// ── o trem de tiques ──────────────────────────────────────────────────────────
let temporizador = null;
function trem(passo) {
  if (temporizador) clearInterval(temporizador);
  temporizador = setInterval(() => tocar('tique', TIQUES, 3, VOL.tique), passo);
}
function pararTrem() {
  if (temporizador) { clearInterval(temporizador); temporizador = null; }
}

const SomSorteio = {
  get ligado() { return ligado; },
  /** A pessoa já decidiu sobre o som neste aparelho? (Rodada 12A) */
  get escolhido() { return escolheu; },
  toggle(v) {
    ligado = (v === undefined) ? !ligado : !!v;
    escolheu = true;
    try { localStorage.setItem(CHAVE_SOM, ligado ? '1' : '0'); } catch { /* ignore */ }
    if (!ligado) this.silenciar();
    return ligado;
  },
  /**
   * Liga o som por omissão para quem acabou de tocar em "Sortear" (Rodada 12A).
   *
   * NÃO grava nada: o localStorage guarda a escolha da PESSOA, e um padrão
   * gravado vazava para as aberturas seguintes — inclusive as de quem só abre o
   * resultado pelo link, que tem de continuar em silêncio. Quem já escolheu
   * alguma coisa neste aparelho manda, ligado ou desligado.
   */
  ligarPorOmissao() {
    if (escolheu) return ligado;
    ligado = true;
    return true;
  },
  /**
   * Desfaz o `ligarPorOmissao` quando a cerimónia sai de cena sem ninguém ter
   * tocado no botão de som (Rodada 12A).
   *
   * Sem isto, `ligado` ficava verdadeiro para o resto da SESSÃO: quem sorteava
   * um jogo e a seguir abria o resultado de outro — ou a vista pública /p/ —
   * ouvia som numa tela que a lei manda entregar muda.
   */
  desfazerOmissao() {
    if (escolheu) return ligado;
    ligado = false;
    this.silenciar();
    return false;
  },
  // O TIQUE: entra com o rolo a girar e só pára quando ele pára.
  girar() {
    if (!ligado) return;
    tocar('tique', TIQUES, 3, VOL.tique);
    trem(PASSO_RAPIDO);
  },
  /** O rolo perdendo força: o mesmo tique, mais espaçado. */
  girarLento() {
    if (!ligado || !temporizador) return;
    trem(PASSO_LENTO);
  },
  pararGiro() { pararTrem(); },
  /** O CLAC: o rolo travou e um jogador apareceu. */
  revelar() { tocar('clac', [CAMINHOS.clac], 3, VOL.clac); },
  /** O JACKPOT: os times ficaram prontos. Um só por cerimônia. */
  fecharTime() { tocar('jackpot', [CAMINHOS.jackpot], 1, VOL.jackpot); },
  silenciar() {
    pararTrem();
    Object.values(rodas).forEach((els) => els.forEach((a) => {
      try { a.pause(); a.currentTime = 0; } catch { /* ignore */ }
    }));
  },
  // AUTO-TESTE: confirma que os ficheiros carregam. Loga "SOM OK 5/5".
  async autoTeste() {
    const fontes = [...TIQUES, CAMINHOS.clac, CAMINHOS.jackpot];
    let ok = 0; const falhas = [];
    await Promise.all(fontes.map((src) => new Promise((res) => {
      const a = new Audio(urlAsset(src)); let done = false;
      const fin = (good) => { if (done) return; done = true; if (good) ok += 1; else falhas.push(src); res(); };
      a.addEventListener('canplaythrough', () => fin(true), { once: true });
      a.addEventListener('loadedmetadata', () => fin(true), { once: true });
      a.addEventListener('error', () => fin(false), { once: true });
      setTimeout(() => fin(a.readyState >= 1), 3500);
      try { a.load(); } catch { fin(false); }
    })));
    const msg = `SOM ${ok === fontes.length ? 'OK' : 'FALHA'} ${ok}/${fontes.length}` + (falhas.length ? (` — faltam: ${falhas.join(', ')}`) : '');
    console.log(msg);
    return { ok, total: fontes.length, falhas, msg };
  },
};

export default SomSorteio;
