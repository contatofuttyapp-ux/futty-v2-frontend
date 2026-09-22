// Futty v2.0 — A CERIMÓNIA DO SORTEIO (máquina v8.25, transplante byte-a-fiel da bancada).
// TRANSPLANTAR, NÃO REPRODUZIR: o CSS vive em styles/sorteio-maquina.css (scoped .smaq); a
// lógica imperativa da bancada corre num useEffect sobre o DOM do componente (refs scoped —
// instance-safe, sobrevive ao StrictMode). Dados REAIS: resultado.times/reservas/seed.
// CONTRATOS (lei): default export {resultado, autoStart, aoTerminar} · MARCA_TIME exportado ·
// avatar_url-falsy → SILHUETA (privacidade automática no /p/) · mulberry32(seed) = replay.
// A máquina: raios 24.5°, letreiro SORTEIO, Joia lateral (arrasto+tap), baralho oficial
// selado no giro, véu re-escopado ao interior + cartão fit-to-width, lock-in + molduras vivas
// na Victory, som selado (somSorteio.js, opt-in off), reserva neutro, X de saída, botões C3.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Share2 } from 'lucide-react';
import { urlAsset, urlImagem } from '../utils/avatar';
import { apiFetch } from '../lib/api';
import { gerarCartao916, gerarCartazEscalacao } from '../utils/sorteioCartao';
import { salvarOuCompartilhar } from '../utils/salvarImagem';
import SomSorteio from './somSorteio';
import '../styles/app.css';
import '../styles/sorteio-maquina.css';

// MARCAÇÃO DE TIME — DECISÃO SELADA (vaga cassino): os metais dos selos OURO/ROXO/PRATA/BRONZE.
// A cor veste o PALCO (anel + rótulo + tinte da silhueta), nunca a camisa.
// eslint-disable-next-line react-refresh/only-export-components -- constante partilhada com SorteioShow
export const MARCA_TIME = [
  { n: 'OURO', nome: 'Time Ouro', c: '#d4a017', g: 'rgba(212,160,23,.55)' },
  { n: 'ROXO', nome: 'Time Roxo', c: '#8b5cf6', g: 'rgba(139,92,246,.55)' },
  { n: 'PRATA', nome: 'Time Prata', c: '#aab4c8', g: 'rgba(170,180,200,.55)' },
  { n: 'BRONZE', nome: 'Time Bronze', c: '#c2652e', g: 'rgba(194,101,46,.55)' },
];
const marca = (i) => MARCA_TIME[i % MARCA_TIME.length];
// LEI: RESERVA nunca veste cor de time — cinza-aço apagado, "à espera, sem dono".
const RES_MARCA = { n: 'RESERVA', nome: 'Reserva', c: '#8a90a0', g: 'rgba(138,144,160,.32)' };
// Grelhas inteligentes: linhas por tamanho de time — nunca fila única.
const LINHAS = { 0: [], 1: [1], 2: [2], 3: [3], 4: [2, 2], 5: [3, 2], 6: [3, 3], 7: [4, 3], 8: [4, 4], 9: [3, 3, 3], 10: [4, 3, 3], 11: [4, 4, 3] };
const ASSET = '/sorteio-assets/';
// LEI v8.25 — SÓ O BARALHO OFICIAL SELADO gira nos rolos: 5 bichos v9 + 4 cartas
// da casa (baralho final, registado em SPEC-SORTEIO). As 2 cartas-F antigas
// (dourada C / roxa C especular) morreram — a HÍBRIDA (palco ouro + F ametista)
// ficou aprovada mas arquivada, não entra aqui (correção do dono).
// 13-set: .png → .webp (1024×1536 a 416×624 — o rolo é flex:0 1 78px, nunca passa
// de 78px de largura). 20 MB → 350 KB. E cada src passa por urlAsset(): na web
// não muda nada, no app nativo estes arquivos não viajam dentro do pacote, vêm
// da web. Estes <img> entram por innerHTML, sem onError: se um caminho aqui não
// bater com o arquivo, sai o ícone de imagem quebrada e ninguém avisa. Mexer
// nesta lista pede conferir public/.
const SIMB = [
  { t: 'av', src: urlAsset(`${ASSET}v9-jacare.webp`) }, { t: 'cd', src: urlAsset(`${ASSET}777-seta-ouro.webp`) },
  { t: 'av', src: urlAsset(`${ASSET}v9-et.webp`) }, { t: 'cd', src: urlAsset(`${ASSET}v94-trofeu-c.webp`) },
  { t: 'av', src: urlAsset(`${ASSET}v9-onca.webp`) }, { t: 'cd', src: urlAsset(`${ASSET}f-roxa-media.webp`) },
  { t: 'av', src: urlAsset(`${ASSET}v9-tigre.webp`) }, { t: 'cd', src: urlAsset(`${ASSET}v94-bola.webp`) },
  { t: 'av', src: urlAsset(`${ASSET}v9-astronauta.webp`) },
];
const MBPOS = [[20, 2], [80, 2], [2, 40], [97, 40], [2, 72], [97, 72]];
// RODADA 16B — os pontos de brilho do prêmio: [x%, y%, atraso s, tamanho px], em
// posições FIXAS do interior, ao redor das cartas. Dez, não mais: elegantes,
// nunca partículas a cair (a chuva de moedas foi reprovada pelo dono).
const GLINTS = [
  [7, 24, 0.15, 22], [93, 20, 0.35, 18], [50, 15, 0.60, 26], [12, 47, 0.85, 18],
  [88, 43, 1.05, 24], [5, 69, 1.30, 18], [95, 73, 1.50, 22], [30, 60, 1.70, 16],
  [72, 86, 1.85, 20], [24, 91, 1.95, 18],
];

// RODADA 12A — som ligado para QUEM SORTEIA.
//
// A lei da casa é "som é opt-in, desligado por omissão", e ela continua de pé
// para toda a gente que abre um resultado: pelo link, pela lista de jogos, por
// notificação. A excepção é uma só — quem acabou de tocar em "Sortear" pediu o
// espectáculo naquele segundo, e entregá-lo mudo é entregá-lo pela metade.
//
// Fica atrás desta constante porque é o dono que decide se a excepção existe:
// `false` devolve o app ao comportamento antigo sem tocar em mais nada. E nunca
// sobrepõe uma escolha já feita no aparelho (ver SomSorteio.ligarPorOmissao).
const SOM_PADRAO_QUEM_SORTEIA = true;

// O MESMO RNG do backend (utils/sorteio.js) — a seed partilhada é o contrato do replay.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// SILHUETA DA CASA (angular, 45°) — MESMA geometria do SilhuetaJogador (cabeça octógono +
// ombros em rectas com cortes 45°), aqui inline como data-uri (os rolos usam innerHTML).
// LEI: círculos genéricos BANIDOS; placeholder de pessoa = SÓ esta silhueta. Fundo escuro
// com o gradiente subtil da casa + brilho discreto do traço (a pele metálica apagada), tinte
// do time. Usada quando avatar_url é falsy (o /p/ despublica → privacidade automática).
const SIL_HEAD = '40,12 56,12 64,20 64,36 56,44 40,44 32,36 32,20';
const SIL_BODY = 'M14 92 L14 70 L24 58 L40 52 L56 52 L72 58 L82 70 L82 92 Z';
function silhuetaURI(cor) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 100'>`
    + `<defs><linearGradient id='sg' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#15131d'/><stop offset='1' stop-color='#0a0810'/></linearGradient></defs>`
    + `<rect width='96' height='100' fill='url(#sg)'/>`
    + `<g stroke='${cor}' stroke-linejoin='miter'>`
    + `<g stroke-opacity='0.34' stroke-width='5' fill='none'><polygon points='${SIL_HEAD}'/><path d='${SIL_BODY}'/></g>`
    + `<g stroke-width='2.4' stroke-opacity='0.72' fill='${cor}' fill-opacity='0.15'><polygon points='${SIL_HEAD}'/><path d='${SIL_BODY}'/></g>`
    + `</g></svg>`,
  )}`;
}
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// BannerAd do sorteio — agora SERVIDO a valer (/api/ads?pagina=sorteio): respeita o
// toggle do dono (default OFF) e o filtro etário fail-closed no servidor. Mantém o look
// selado da .faixaAd; conta impressão/clique. Sem campanha OU página OFF → não aparece.
function BannerSorteio() {
  const [ad, setAd] = useState(null);
  const [pronto, setPronto] = useState(false);
  const impRef = useRef(null);
  useEffect(() => {
    let vivo = true;
    apiFetch('/api/ads?pagina=sorteio').then((r) => { if (vivo) { setAd(r?.ad || null); setPronto(true); } }).catch(() => { if (vivo) setPronto(true); });
    return () => { vivo = false; };
  }, []);
  useEffect(() => {
    if (ad && ad.id && impRef.current !== ad.id) { impRef.current = ad.id; apiFetch('/api/ads/evento', { method: 'POST', body: JSON.stringify({ id: ad.id, tipo: 'imp' }) }).catch(() => {}); }
  }, [ad]);
  if (!pronto || !ad) return null;
  const clicar = () => { apiFetch('/api/ads/evento', { method: 'POST', body: JSON.stringify({ id: ad.id, tipo: 'cli' }) }).catch(() => {}); if (ad.link) window.open(ad.link, '_blank', 'noopener'); };
  return (
    <div className="faixaAd" role="button" tabIndex={0} onClick={clicar} style={{ cursor: 'pointer' }}>
      <span className="publab">Pub.</span>
      <img src={ad.imagem_url || '/futty-logo-flat.webp'} alt="" />
      <div className="col"><div className="adtit">{ad.texto}</div><div className="adsub">{ad.sub}</div></div>
      <span className="adcta">{ad.cta || 'Ver'}</span>
    </div>
  );
}

/**
 * `bannerInterno` (Rodada 12A): a página do sorteio passou a ter o seu próprio
 * slot IAB 320×100, servido pelo AdCard e só depois da cerimónia acabar — dois
 * anúncios na mesma tela seriam duas impressões pela mesma vista. Quem tem slot
 * próprio passa `false`; o /p/ e o Campeonato continuam com a faixa de sempre.
 */
export default function CerimoniaSorteio({ resultado, autoStart = true, aoTerminar, equipa, data, bannerInterno = true, euSorteei = false }) {
  const rootRef = useRef(null);
  // props estáveis para o efeito (que corre 1x); um re-sorteio remonta via key no consumidor.
  const cbRef = useRef(aoTerminar);
  useEffect(() => { cbRef.current = aoTerminar; });
  // RODADA 14B — compartilhar vive AQUI, logo abaixo do retângulo dos times, e é
  // o único lugar. Escondido enquanto a cerimónia corre (é o momento de olhar,
  // não de agir); sobe 5,1 s depois do jackpot, ou no fim se a pessoa saltou. A
  // alavanca esconde-o outra vez ao recomeçar.
  const [compartilharOn, setCompartilharOn] = useState(false);
  const [gerando, setGerando] = useState(false);
  const btnRef = useRef(null);
  // O toast da máquina nasce dentro do efeito; os botões (React) falam com ele por aqui.
  const toastRef = useRef(() => {});
  // RODADA 14B — a pílula-guia do rodapé (só quando o botão está fora da tela).
  // null = escondida; { base } = na tela, com `base` a dizer onde assenta: acima
  // da bottom-nav quando ela existe (Campeonato), ou null para a safe-area
  // (CSS) na página do sorteio, que não tem nav.
  const [pilula, setPilula] = useState(null);

  // Terminado o prêmio (o botão só entra depois dele), se o botão de compartilhar
  // não está na tela — sorteio grande, 18 jogadores — uma pílula no rodapé aponta
  // para ele. Some sozinha quando o botão entra em vista e não volta nesse
  // sorteio; a alavanca esconde o botão (compartilharOn=false esconde a pílula
  // no render) e este efeito rearma tudo para a corrida seguinte.
  useEffect(() => {
    const el = btnRef.current;
    if (!compartilharOn || !el || typeof IntersectionObserver === 'undefined') return undefined;
    let jaViu = false;
    const io = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting) { jaViu = true; setPilula(null); io.disconnect(); return; }
      if (jaViu) return;
      const nav = document.querySelector('.bottom-nav');
      setPilula({ base: nav ? Math.round(nav.getBoundingClientRect().height) + 10 : null });
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [compartilharOn]);
  function irAoBotao() {
    btnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const times = resultado?.times || [];
    const reservas = resultado?.reservas || [];
    const seed = Number.isInteger(resultado?.seed) ? resultado.seed : 1;
    if (!times.length) return undefined;

    let vivo = true;
    const timers = new Set();
    const clones = new Set();
    const sleep = (ms) => new Promise((r) => { const id = setTimeout(r, ms); timers.add(id); });
    const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const q = (sel) => root.querySelector(sel);
    const qa = (sel) => [...root.querySelectorAll(sel)];
    const maq = q('.maq');
    let aCorrer = false; let saltarFlag = false;

    // — visual de um jogador real: foto (urlAsset) ou silhueta da cor (privacidade).
    //   ti < 0 → RESERVA (silhueta cinza-aço).
    const vis = (j, ti) => ({
      nome: (j.convidado ? '· ' : '') + (j.nome || '?'),
      img: j.avatar_url ? urlImagem(urlAsset(j.avatar_url), 128, { quadrado: true }) : silhuetaURI(ti < 0 ? RES_MARCA.c : marca(ti).c),
    });

    // — moldura de um jogador (innerHTML; corre dentro de .smaq → estilos aplicam).
    //   res=true → RESERVA: cinza-aço + micro-lâmpadas apagadas (LEI: nunca cor de time).
    function mmoldHTML(j, ti, res) {
      const k = res ? RES_MARCA : marca(ti);
      const mbs = MBPOS.map(([x, y], i) => `<span class="mb" style="--i:${i};left:${x}%;top:${y}%"></span>`).join('');
      const v = vis(j, res ? -1 : ti);
      return `<div class="mmold${res ? ' res' : ''}" style="--tc:${k.c};--tg:${k.g}"><div class="fr"><img src="${esc(v.img)}"></div>${mbs}<span class="nm">${esc(v.nome)}</span></div>`;
    }
    function encher(slotEl, j, ti, res) { slotEl.classList.add('cheio'); slotEl.innerHTML = mmoldHTML(j, ti, res); }
    function voar(rolo, j, ti, slotEl) {
      const a = rolo.getBoundingClientRect(); const b = slotEl.getBoundingClientRect();
      const cl = document.createElement('div');
      cl.style.cssText = `position:fixed;z-index:99;left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px;pointer-events:none`;
      cl.innerHTML = mmoldHTML(j, ti);
      root.appendChild(cl); clones.add(cl);
      const dx = b.left - a.left; const dy = b.top - a.top; const s = b.width / a.width;
      const an = cl.animate(
        [{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${dx}px,${dy}px) scale(${s})` }],
        { duration: reduzido ? 1 : 420, easing: 'cubic-bezier(.4,.1,.3,1)' },
      );
      return Promise.race([an.finished.catch(() => {}), sleep(reduzido ? 10 : 500)]).then(() => { cl.remove(); clones.delete(cl); if (vivo) encher(slotEl, j, ti); });
    }

    // — grelhas dos times (a partir dos dados reais)
    function montarGrupos() {
      q('.grupos').innerHTML = times.map((t, gi) => {
        const k = marca(gi); const linhas = LINHAS[Math.min(t.jogadores.length, 11)] || [t.jogadores.length];
        let n = 0; let rows = '';
        for (const c of linhas) rows += `<div class="srow">${Array.from({ length: c }, () => `<div class="slot" data-g="${gi}" data-i="${n++}"></div>`).join('')}</div>`;
        return `<div class="grupo" data-gi="${gi}" style="--tc:${k.c};--tg:${k.g}"><div class="ghead">${esc(k.nome)}</div>${rows}</div>`;
      }).join('');
      q('.resv').classList.toggle('on', reservas.length > 0);
      q('.rrow').innerHTML = reservas.map((j, i) => `<div class="rslot" data-r="${i}"><span class="badge">${esc(j.posicao || i + 1)}</span><div class="slot" style="width:100%;height:100%"></div></div>`).join('');
    }

    // — strip do baralho (seed → determinístico p/ replay)
    function stripHTML(off) {
      let cels = '';
      for (let i = 0; i < 6; i += 1) {
        const s = SIMB[(off + i * 3) % SIMB.length];
        cels += `<div class="scel"><img class="${s.t === 'cd' ? 'cd' : 'av'}" src="${s.src}"></div>`;
      }
      return cels + cels;
    }

    // — uma vaga de rolos: gira o baralho, revela os jogadores reais, voa p/ as slots do time
    async function vagaRolos(ti, jogs, offset) {
      const rolosEl = q('.rolos'); const flash = q('.flashfx'); const n = jogs.length;
      rolosEl.innerHTML = jogs.map((_, r) => {
        const off = Math.floor(mulberry32(seed + ti * 100 + offset + r + 1)() * SIMB.length);
        return `<div class="rolo" style="--sd:${(0.34 + r * 0.03).toFixed(2)}s"><div class="strip">${stripHTML(off)}</div><div class="rev" data-r="${r}"></div></div>`;
      }).join('');
      const rolos = [...rolosEl.children];
      maq.classList.add('giroOn'); maq.classList.remove('accel', 'burst');
      SomSorteio.girar();
      if (saltarFlag || !vivo) { SomSorteio.pararGiro(); return; }
      await sleep(1200); if (!vivo) return;
      maq.classList.remove('giroOn'); maq.classList.add('accel');
      rolos.forEach((r) => r.classList.add('slow'));
      SomSorteio.girarLento();
      if (saltarFlag || !vivo) { SomSorteio.pararGiro(); return; }
      await sleep(600); if (!vivo) return;
      SomSorteio.pararGiro();
      maq.classList.remove('accel'); maq.classList.add('burst');
      flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on');
      for (let r = 0; r < n; r += 1) {
        const v = vis(jogs[r], ti); rolos[r].classList.add('stop');
        const rev = rolos[r].querySelector('.rev');
        rev.innerHTML = `<img src="${esc(v.img)}"><span class="nm">${esc(v.nome)}</span>`;
        rev.classList.add('on'); SomSorteio.revelar();
        if (!saltarFlag) await sleep(130);
      }
      if (!saltarFlag) await sleep(430);
      if (!vivo) return;
      const voos = [];
      for (let r = 0; r < n; r += 1) {
        const slotEl = q(`.slot[data-g="${ti}"][data-i="${offset + r}"]`);
        if (slotEl) voos.push(voar(rolos[r], jogs[r], ti, slotEl));
        if (!saltarFlag) await sleep(85);
      }
      await Promise.all(voos);
      maq.classList.remove('burst'); rolosEl.innerHTML = '';
    }
    async function girarTime(ti) {
      const jogs = times[ti].jogadores; const k = marca(ti);
      const quem = q('.quem'); quem.textContent = `Girando · ${k.nome}`;
      quem.style.setProperty('--qc', k.c); quem.style.setProperty('--qg', k.g);
      const vagas = jogs.length > 7 ? [Math.ceil(jogs.length / 2), jogs.length - Math.ceil(jogs.length / 2)] : [jogs.length];
      let off = 0;
      for (const nv of vagas) {
        if (saltarFlag || !vivo) return;
        await vagaRolos(ti, jogs.slice(off, off + nv), off); off += nv;
        if (vagas.length > 1 && !saltarFlag) await sleep(200);
      }
    }

    // — RODADA 14B: o flash de tela inteira. Vai para o body (não para o root):
    //   dentro do [data-page] um ancestral com transform/filter prenderia o
    //   `fixed` à página. Entra no `clones` para o cleanup o apanhar.
    function flashTela() {
      const f = document.createElement('div'); f.className = 'smaqx-flash';
      document.body.appendChild(f); clones.add(f);
      const id = setTimeout(() => { f.remove(); clones.delete(f); }, 400); timers.add(id);
    }
    // — RODADA 14B: O PRÊMIO. Corre UMA vez, no instante em que "TIMES SORTEADOS"
    //   acende — o mesmo instante do jackpot.mp3. Marquise em sequência, título,
    //   varreduras de brilho, pulsos de glow e pontos de brilho são o estado
    //   .premio (só CSS); aos 3 s vira .premioCalmo, o brilho suave que fica.
    //   Nada disto roda enquanto a cerimónia ainda sorteia.
    //   RODADA 16B: a chuva de moedas (canvas-confetti) e os raios a girar atrás
    //   dos avatares saíram — reprovados pelo dono no aparelho. Esta tela não
    //   importa mais a biblioteca de confete.
    function premioAbrir() {
      maq.classList.remove('premioCalmo'); maq.classList.add('premio');
      flashTela();
      const idCalmo = setTimeout(() => { if (vivo) { maq.classList.remove('premio'); maq.classList.add('premioCalmo'); } }, 3000);
      timers.add(idCalmo);
      // O botão de compartilhar sobe 1,5 s depois de o jackpot acabar (3,6 s):
      // primeiro a pessoa OLHA para o prêmio, depois é convidada a mandá-lo.
      const idBotao = setTimeout(() => { if (vivo) setCompartilharOn(true); }, 5100);
      timers.add(idBotao);
    }

    // — o final: cartão (véu no interior) + lock-in + molduras vivas
    async function finalLockIn() {
      const quem = q('.quem'); quem.textContent = '';
      maq.classList.remove('giroOn', 'accel', 'burst', 'dim');
      const ft = q('.fimtxt');
      const letras = 'TIMES SORTEADOS'.split('').map((ch, i) => (ch === ' ' ? '<span style="display:inline-block;width:11px"></span>' : `<span class="seg" style="--sd:${(i * 0.07).toFixed(2)}s">${ch}</span>`)).join('');
      const lampas = [[9, 0], [50, 0], [91, 0], [100, 50], [91, 100], [50, 100], [9, 100], [0, 50]]
        .map(([x, y], i) => `<span class="fimlamp" style="left:${x}%;top:${y}%;--l:${i}"></span>`).join('');
      ft.innerHTML = `<span class="fimcaixa">${lampas}${letras}</span>`;
      { // FIT-TO-WIDTH: nunca quebra em 2 linhas
        const caixa = ft.querySelector('.fimcaixa'); const alvo = q('.interior').clientWidth - 24;
        let fs = 26; caixa.style.setProperty('--fs', `${fs}px`);
        while (caixa.offsetWidth > alvo && fs > 13) { fs -= 1; caixa.style.setProperty('--fs', `${fs}px`); }
      }
      q('.palcoStage').classList.add('veuTotal'); ft.classList.add('on');
      // O time inteiro acabou de aparecer: o jackpot (Rodada 14A) e o prêmio
      // (Rodada 14B) nascem no mesmo instante — é o segundo de "ganhei".
      SomSorteio.fecharTime();
      premioAbrir();
      await sleep(1700); if (!vivo) return;
      ft.classList.remove('on'); q('.palcoStage').classList.remove('veuTotal');
      await sleep(200); ft.innerHTML = ''; await sleep(220); if (!vivo) return;
      const molds = qa('.grupos .mmold');
      for (const m of molds) { m.classList.add('lock'); await sleep(70); if (!vivo) return; }
      molds.forEach((m, i) => {
        m.style.setProperty('--vr', `${(2.3 + ((i * 29) % 4) * 0.28).toFixed(2)}s`);
        m.style.setProperty('--vg', `${(1.2 + ((i * 17) % 3) * 0.32).toFixed(2)}s`);
        m.style.setProperty('--vd', `${(((i * 53) % 9) * 0.10).toFixed(2)}s`);
        m.style.setProperty('--bd', `${(0.42 + ((i * 37) % 5) * 0.09).toFixed(2)}s`);
        m.style.setProperty('--bdl', `${(((i * 53) % 9) * 0.06).toFixed(2)}s`);
        m.classList.add('vivo');
      });
      // Rodada 12C: sem a Victory, a festa das molduras deixa de esperar por
      // música nenhuma — dura o mesmo com o som ligado ou desligado.
      await sleep(4000);
      molds.forEach((m) => m.classList.remove('vivo'));
    }

    function preencherTudo() {
      q('.rolos').innerHTML = ''; q('.quem').textContent = '';
      maq.classList.remove('giroOn', 'accel', 'burst', 'dim', 'pulseall');
      times.forEach((t, gi) => t.jogadores.forEach((j, i) => {
        const s = q(`.slot[data-g="${gi}"][data-i="${i}"]`);
        if (s && !s.classList.contains('cheio')) encher(s, j, gi);
      }));
      reservas.forEach((j, r) => { const s = q(`.rslot[data-r="${r}"] .slot`); if (s) encher(s, j, 0, true); });
    }
    async function corpo() {
      const lv = q('.lever'); lv.classList.remove('pull'); void lv.offsetWidth; lv.classList.add('pull');
      q('.palcoStage').classList.remove('veuTotal'); montarGrupos(); q('.fimtxt').classList.remove('on');
      // Rodada 14B: a alavanca repete a cerimónia — o prêmio da corrida anterior
      // apaga-se antes de os rolos voltarem a girar.
      maq.classList.remove('premio', 'premioCalmo');
      // Movimento reduzido: sem cerimónia, e do prêmio só o flash e o brilho suave.
      if (reduzido) { preencherTudo(); flashTela(); maq.classList.add('premioCalmo'); return; }
      q('.saltar').classList.add('on');
      for (let t = 0; t < times.length; t += 1) {
        await girarTime(t); if (saltarFlag) { preencherTudo(); return; } if (!vivo) return;
        if (t < times.length - 1) await sleep(220);
      }
      for (let r = 0; r < reservas.length; r += 1) { const s = q(`.rslot[data-r="${r}"] .slot`); if (s) encher(s, reservas[r], 0, true); await sleep(180); }
      if (saltarFlag) { preencherTudo(); return; }
      await finalLockIn();
    }
    async function cerimonia() {
      if (aCorrer || !vivo) return;
      aCorrer = true; saltarFlag = false;
      q('.lever').classList.add('girando'); setCompartilharOn(false);
      try { await corpo(); } finally {
        aCorrer = false; q('.saltar')?.classList.remove('on');
        // Quem saltou (ou pediu movimento reduzido) não passa pelo prêmio: o
        // botão entra aqui, no fim, sem esperar os 5,1 s.
        q('.lever').classList.remove('girando'); if (vivo) setCompartilharOn(true);
        if (vivo) cbRef.current?.();
      }
    }

    // ── réguas de luzes + marquee da fachada ──
    q('.luzes1').innerHTML = Array.from({ length: 22 }, (_, i) => `<span class="luz" style="--i:${i}"></span>`).join('');
    q('.luzes2').innerHTML = Array.from({ length: 22 }, (_, i) => `<span class="luz" style="--i:${21 - i}"></span>`).join('');
    q('.base1').innerHTML = Array.from({ length: 22 }, (_, i) => `<span class="luz" style="--i:${i}"></span>`).join('');
    q('.base2').innerHTML = Array.from({ length: 22 }, (_, i) => `<span class="luz" style="--i:${21 - i};--lc:#a78bfa;--lg:rgba(139,92,246,.75)"></span>`).join('');
    const idFrame = setTimeout(() => {
      if (!vivo) return;
      const W = maq.offsetWidth; const H = maq.offsetHeight; const passo = 27; let k = 0; let d = '';
      for (let x = 8; x < W - 6; x += passo) d += `<span class="mq" style="--i:${k++};left:${x}px;top:-4px"></span>`;
      for (let y = 8; y < H - 6; y += passo) d += `<span class="mq" style="--i:${k++};right:-4px;top:${y}px"></span>`;
      for (let x = W - 14; x > 6; x -= passo) d += `<span class="mq" style="--i:${k++};left:${x}px;bottom:-4px"></span>`;
      for (let y = H - 14; y > 6; y -= passo) d += `<span class="mq" style="--i:${k++};left:-4px;top:${y}px"></span>`;
      maq.insertAdjacentHTML('beforeend', d);
    }, 80); timers.add(idFrame);

    // ── som (opt-in, lembrado) ──
    // Rodada 12A: antes de pintar o botão, quem sorteou ganha o som ligado — só
    // se nunca escolheu nada neste aparelho. O `ligouPorOmissao` fica guardado
    // para o cleanup o desfazer: senão o som ficava ligado para o resto da
    // sessão e vazava para as telas que têm de nascer mudas.
    const ligouPorOmissao = euSorteei && SOM_PADRAO_QUEM_SORTEIA && !SomSorteio.escolhido;
    if (ligouPorOmissao) SomSorteio.ligarPorOmissao();
    const somBtn = q('.somBtn');
    const pintarSom = () => { somBtn.classList.toggle('on', SomSorteio.ligado); somBtn.title = SomSorteio.ligado ? 'Som ligado' : 'Som desligado (clique p/ ligar)'; };
    // Ao LIGAR, um toque do efeito de revelação serve de prova de que há som
    // (a pessoa acabou de escolher ouvir; sem retorno nenhum parece quebrado).
    const onSom = () => { const on = SomSorteio.toggle(); if (on) SomSorteio.revelar(); pintarSom(); };
    somBtn.addEventListener('click', onSom); pintarSom();
    // 13-set: o autoTeste dá load() nos 5 sons para logar "SOM OK 5/5" — 43 KB
    // baixados ao abrir a cerimônia, inclusive com o som desligado, que é o
    // padrão. Fica só em desenvolvimento; em produção os sons entram um a um,
    // no primeiro uso (as rodas do somSorteio.js nascem preguiçosas).
    if (import.meta.env.DEV) SomSorteio.autoTeste();

    // ── ALAVANCA: arrasto (mola) + tap + teclado ──
    const lever = q('.lever'); const grip = lever.querySelector('.l6-grip');
    const MAX = 46; const LIMIAR = 0.60; const easeOut = (t) => 1 - Math.pow(1 - t, 2.2);
    let arrasto = false; let y0 = 0; let prog = 0; let pid = null; let movido = 0;
    const setProg = (p) => {
      prog = Math.max(0, Math.min(1, p));
      grip.style.transform = `translateX(-50%) translateY(${(MAX * easeOut(prog)).toFixed(1)}px)`;
      lever.style.setProperty('--drag', prog.toFixed(3));
      lever.classList.toggle('arrastando', prog > 0.02); lever.classList.toggle('armado', prog >= LIMIAR);
    };
    const repor = () => { grip.style.transform = ''; lever.style.setProperty('--drag', '0'); lever.classList.remove('arrastando', 'armado'); prog = 0; };
    const disparar = () => { repor(); if (!aCorrer) cerimonia(); };
    const voltaElastica = () => { lever.classList.add('voltando'); repor(); const id = setTimeout(() => lever.classList.remove('voltando'), 360); timers.add(id); };
    const onDown = (e) => { if (aCorrer) return; arrasto = true; movido = 0; y0 = e.clientY; pid = e.pointerId; lever.classList.remove('voltando'); try { lever.setPointerCapture(pid); } catch { /* */ } e.preventDefault(); };
    const onMove = (e) => { if (!arrasto) return; const dy = e.clientY - y0; movido = Math.max(movido, Math.abs(dy)); if (!reduzido && dy > 0) setProg(dy / MAX); e.preventDefault(); };
    const onUp = () => { if (!arrasto) return; arrasto = false; try { lever.releasePointerCapture(pid); } catch { /* */ } if (reduzido || movido < 6) { disparar(); return; } if (prog >= LIMIAR) disparar(); else voltaElastica(); };
    const onKey = (e) => { if ((e.key === 'Enter' || e.key === ' ') && !aCorrer) { e.preventDefault(); cerimonia(); } };
    lever.addEventListener('pointerdown', onDown); lever.addEventListener('pointermove', onMove);
    lever.addEventListener('pointerup', onUp); lever.addEventListener('pointercancel', onUp);
    lever.addEventListener('keydown', onKey);
    const saltarBtn = q('.saltar button'); const onSaltar = () => { saltarFlag = true; }; saltarBtn.addEventListener('click', onSaltar);

    // ── X de saída (volta à página do jogo) ──
    const sairX = q('.sairX'); const onSair = () => { if (window.history.length > 1) window.history.back(); }; sairX.addEventListener('click', onSair);

    // ── o toast da máquina (os botões de compartilhar, em React, chegam-lhe pelo toastRef) ──
    let toastT = null;
    const mostrarToast = (msg) => { const el = q('.toast'); el.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>${esc(msg)}`; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 1900); timers.add(toastT); };
    toastRef.current = mostrarToast;

    // ── arranque ──
    montarGrupos();
    if (autoStart) { const id = setTimeout(() => { if (vivo) cerimonia(); }, reduzido ? 0 : 700); timers.add(id); }

    // ── cleanup (StrictMode / desmontagem): pára tudo, limpa clones e listeners ──
    return () => {
      vivo = true; vivo = false;
      timers.forEach((id) => clearTimeout(id)); clones.forEach((c) => c.remove());
      // Rodada 12A: o som que esta cerimónia ligou sozinha morre com ela. Se a
      // pessoa tocou no botão pelo caminho, a escolha dela fica (o
      // desfazerOmissao não mexe em quem já escolheu).
      if (ligouPorOmissao) SomSorteio.desfazerOmissao();
      SomSorteio.silenciar();
      somBtn.removeEventListener('click', onSom);
      lever.removeEventListener('pointerdown', onDown); lever.removeEventListener('pointermove', onMove);
      lever.removeEventListener('pointerup', onUp); lever.removeEventListener('pointercancel', onUp);
      lever.removeEventListener('keydown', onKey);
      saltarBtn.removeEventListener('click', onSaltar); sairX.removeEventListener('click', onSair);
      toastRef.current = () => {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a cerimónia monta 1x; re-sorteio remonta via key
  }, []);

  // Rodada 8A: na web baixa; no app abre a folha de compartilhar (o <a download>
  // não faz nada no WebView). A folha já é o retorno; fechada sem escolher nada,
  // não se diz "salvo".
  async function compartilharTimes() {
    if (gerando) return;
    setGerando(true);
    try {
      const { entrega } = await gerarCartazEscalacao(resultado, { equipa, data });
      if (entrega === 'baixou') toastRef.current('Imagem dos times salva');
    } catch (e) {
      toastRef.current(e?.message || 'Não deu para gerar a imagem');
    } finally { setGerando(false); }
  }
  async function compartilharTime(ti) {
    if (gerando) return;
    setGerando(true);
    try {
      const { blob, nome } = await gerarCartao916(resultado, ti, equipa);
      const entrega = await salvarOuCompartilhar(blob, nome, { titulo: 'Cartão do sorteio' });
      if (entrega === 'baixou') toastRef.current('Cartão 9:16 salvo');
    } catch (e) {
      toastRef.current(e?.message || 'Não deu para gerar o cartão');
    } finally { setGerando(false); }
  }

  if (!resultado?.times?.length) {
    return <div style={{ padding: 24, textAlign: 'center', color: '#8a8a98' }}>Sem resultado para mostrar.</div>;
  }
  const times = resultado.times;

  return (
    <div className="smaq" ref={rootRef}>
      <div className="palcoStage">
        <button type="button" className="sairX" title="Sair para a página do jogo" aria-label="Sair do sorteio">
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div className="fx raios" />
        <div className="palco"><div className="maqbox">
          <div className="maq clip8">
            <div className="somBtn" role="button" tabIndex={0} aria-label="Ligar ou desligar o som" title="Som (desligado por padrão)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" stroke="none" />
                <g className="waves"><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 6a9 9 0 0 1 0 12" /></g>
              </svg>
            </div>
            <div className="topo"><div className="topocol">
              <div className="luzes luzes1" />
              <div className="luzes roxa luzes2" />
              <div className="letreiro"><span>Sorteio</span></div>
            </div></div>
            <div className="interior">
              <div className="interiorConteudo">
                <div className="janela">
                  <span className="quem" />
                  <div className="rolos" />
                  <div className="flashfx" />
                </div>
                <div className="gruposWrap">
                  <div className="grupos" />
                  <div className="resv"><div className="rhead">Reserva · ordem do banco</div><div className="rrow" /></div>
                </div>
              </div>
              {/* Rodada 16B — a luz do prêmio, por cima do bloco dos times e por
                  baixo do título: 3 varreduras de brilho na diagonal e 10 pontos
                  de brilho em cruz, em posições fixas. Só CSS (transform/opacity),
                  e o estado natural dos dois é invisível — sem .premio não se vê. */}
              <div className="premioShine" aria-hidden="true"><i /><i /><i /></div>
              <div className="premioGlints" aria-hidden="true">
                {GLINTS.map(([x, y, d, s], i) => (
                  <i key={i} style={{ '--x': `${x}%`, '--y': `${y}%`, '--d': `${d}s`, '--s': `${s}px` }} />
                ))}
              </div>
              <div className="fimtxt" />
            </div>
            <div className="baseluz"><div className="fila base1" /><div className="fila base2" /></div>
            <span className="placaFutty">Futty</span>
            <div className="maqveu" />
            {/* Rodada 16B — o glow dourado das bordas do retângulo: pulsa 3 vezes com
                o jackpot e assenta no brilho suave. Por dentro, porque o clip-path
                da .maq cortaria qualquer sombra por fora. */}
            <div className="premioGlow" aria-hidden="true" />
          </div>
          <div className="lever6 lever" title="Puxar o F = repetir a cerimônia">
            <div className="l6-grip"><div className="l6-knob"><img src="/futty-logo-flat.webp" alt="F" /></div></div>
            <span className="setas"><i /><i /><i /></span>
          </div>
        </div></div>
      </div>
      {/* RODADA 14B — UM caminho para compartilhar, logo abaixo do retângulo dos
          times: a imagem dos dois times na receita do "Ver sorteio" (.cta-gold +
          glow + pulso), e por baixo uma linha discreta com o 9:16 de cada time. */}
      <div className={`compartilhar${compartilharOn ? ' on' : ''}`}>
        {/* O pulso forte é de quem acabou de sortear. Quem abre o resultado depois
            vê o estado final: o botão no lugar só com o glow (item 4 da 14B). */}
        <div className={`cta-gold-glow${euSorteei ? ' pulse-glow' : ''}`} style={{ display: 'flex' }}>
          <button ref={btnRef} type="button" className={`btn hud-corners cta-gold compartilhar__btn${euSorteei ? ' pulse-active' : ''}`} style={{ flex: 1 }} disabled={gerando} onClick={compartilharTimes}>
            <Share2 size={17} /> {gerando ? 'Gerando…' : 'Compartilhar os times'}
          </button>
        </div>
        <div className="compartilhar__times">
          {times.map((t, ti) => (
            <button key={ti} type="button" className="btn btn--sm btn--outline hud-corners-s compartilhar__time" style={{ color: marca(ti).c, borderColor: marca(ti).c }} disabled={gerando} onClick={() => compartilharTime(ti)}>
              9:16 · {t.nome}
            </button>
          ))}
        </div>
      </div>
      {/* A pílula vai por portal ao body: dentro do [data-page] um ancestral com
          transform/filter prenderia o `fixed` à página. */}
      {pilula && compartilharOn ? createPortal(
        <div className="smaqx-pilula" style={pilula.base != null ? { bottom: pilula.base } : undefined}>
          <button type="button" className="btn hud-corners-s cta-gold smaqx-pilula__btn" onClick={irAoBotao} aria-label="Rolar até o botão de compartilhar os times">
            <Share2 size={16} /> ↓ Compartilhar os times
          </button>
        </div>,
        document.body,
      ) : null}
      {/* BannerAd — servido a valer (/api/ads?pagina=sorteio); toggle do dono + menores
          fail-closed no servidor. Sem campanha/OFF → não aparece. */}
      {bannerInterno ? <BannerSorteio /> : null}
      <div className="saltar"><button type="button">» concluir já</button></div>
      <div className="toast" />
    </div>
  );
}
