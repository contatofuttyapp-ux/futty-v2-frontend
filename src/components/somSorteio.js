// ═══════════════════════════════════════════════════════════════════════════════
// SOM SELADO — módulo isolado do som do sorteio.
// LEI: alterações VISUAIS NUNCA tocam neste módulo. As animações CHAMAM a API abaixo
// e jamais mexem nos players de áudio diretamente.
//
// RODADA 12C (16-set) — O SORTEIO NÃO TEM MÚSICA (lei do dono, CLAUDE.md).
//
// Ficam DOIS efeitos, e só dois:
//   giro      — o tique da "slot machine" enquanto sorteia (em loop, pára no fim)
//   revelacao — o efeito de quando um time/jogador aparece
//
// Saíram três arquivos (1,84 MB fora do app, lei do app leve): a trilha de fundo
// (trilha-chiptune.mp3, 1,54 MB — era a música), a fanfarra do fim (Victory.MP3,
// 231 KB — também música) e o baque do véu (sorteio-finalizado.mp3, 28 KB — o
// efeito de revelação passou a ser um só, o mesmo do jogador e do time). Com eles
// saiu a API que os servia: iniciar/cartaoVeu/cartaoVeuSai/vitoria/vitoriaTocando
// e os stamps, que existiam para cronometrar a trilha contra a Victory.
//
// Os toques de interface (alavanca, sair, salvar, compartilhar) também saíram: a
// lei diz DOIS efeitos, e um clique de botão não é nem tique nem revelação.
//
// Ficheiros reais em public/sons/ (Pixabay Content License — ver docs/licencas.md).
// API: ligado(get) · escolhido(get) · toggle · ligarPorOmissao · desfazerOmissao
//   · girar/girarLento/pararGiro · revelar · silenciar · autoTeste
// ═══════════════════════════════════════════════════════════════════════════════
import { urlAsset } from '../utils/avatar';

// 13-set: os caminhos passam por urlAsset(). Na web não muda nada (mesma
// origem); no app nativo os sons não viajam dentro do pacote, vêm da web e
// ficam em cache. Aqui vão SEM o %20 de antes — o urlAsset faz o encodeURI,
// e codificar duas vezes daria "Hud%2520UI.MP3".
const CAMINHOS = {
  giro:      '/sons/slot-machine.mp3',
  revelacao: '/sons/Hud UI.MP3',
};
const KIT = {
  giro:      { src: urlAsset(CAMINHOS.giro),      vol: 0.45, loop: true  },
  revelacao: { src: urlAsset(CAMINHOS.revelacao), vol: 0.28, loop: false },
};
const CHAVE_SOM = 'futty_sorteio_som';
const els = {}, falhou = {};
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

function el(k) {
  if (falhou[k]) return null;
  if (!els[k]) {
    const K = KIT[k], a = new Audio(K.src);
    a.loop = !!K.loop; a.volume = K.vol;
    a.addEventListener('error', () => { falhou[k] = true; });
    els[k] = a;
  }
  return els[k];
}
function stop(k) { const a = els[k]; if (a) { try { a.pause(); a.currentTime = 0; } catch { /* ignore */ } } }

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
  // O TIQUE: entra com o rolo a girar, em loop, e pára quando ele pára.
  girar() {
    if (!ligado) return;
    const a = el('giro'); if (!a) return;
    try { a.playbackRate = 0.85; a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => {}); setTimeout(() => { try { a.playbackRate = 1; } catch { /* ignore */ } }, 320); } catch { /* ignore */ }
  },
  girarLento() { const a = els.giro; if (a && !a.paused) { try { a.playbackRate = 0.72; } catch { /* ignore */ } } },
  pararGiro() { stop('giro'); },
  /**
   * A REVELAÇÃO: um jogador saiu do rolo, ou o time inteiro acabou de aparecer.
   *
   * Multi-shot (um Audio novo por toque) porque numa vaga de rolos isto dispara
   * de 130 em 130 ms — um elemento só cortaria o anterior a cada revelação.
   */
  revelar(vol) {
    if (!ligado || falhou.revelacao) return;
    try {
      const a = new Audio(KIT.revelacao.src);
      a.volume = vol || KIT.revelacao.vol;
      a.addEventListener('error', () => { falhou.revelacao = true; });
      const p = a.play(); if (p && p.catch) p.catch(() => {});
    } catch { /* ignore */ }
  },
  silenciar() { Object.keys(KIT).forEach(stop); },
  // AUTO-TESTE: confirma que os ficheiros carregam. Loga "SOM OK 2/2".
  async autoTeste() {
    const ks = Object.keys(KIT); let ok = 0; const falhas = [];
    await Promise.all(ks.map((k) => new Promise((res) => {
      const a = new Audio(KIT[k].src); let done = false;
      const fin = (good) => { if (done) return; done = true; if (good) ok += 1; else falhas.push(KIT[k].src); res(); };
      a.addEventListener('canplaythrough', () => fin(true), { once: true });
      a.addEventListener('loadedmetadata', () => fin(true), { once: true });
      a.addEventListener('error', () => fin(false), { once: true });
      setTimeout(() => fin(a.readyState >= 1), 3500);
      try { a.load(); } catch { fin(false); }
    })));
    const msg = `SOM ${ok === ks.length ? 'OK' : 'FALHA'} ${ok}/${ks.length}` + (falhas.length ? (` — faltam: ${falhas.join(', ')}`) : '');
    console.log(msg);
    return { ok, total: ks.length, falhas, msg };
  },
};

export default SomSorteio;
