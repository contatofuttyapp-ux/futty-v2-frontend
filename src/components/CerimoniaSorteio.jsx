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
import { urlAsset, urlImagem } from '../utils/avatar';
import { apiFetch } from '../lib/api';
import { gerarCartazEscalacao } from '../utils/sorteioCartao';
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

export default function CerimoniaSorteio({ resultado, autoStart = true, aoTerminar, equipa, data }) {
  const rootRef = useRef(null);
  // props estáveis para o efeito (que corre 1x); um re-sorteio remonta via key no consumidor.
  const cbRef = useRef(aoTerminar);
  useEffect(() => { cbRef.current = aoTerminar; });
  // info do cartaz (equipa/data) — lida no clique do "Guardar", sempre a mais recente.
  const infoRef = useRef({ equipa, data });
  useEffect(() => { infoRef.current = { equipa, data }; });

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
      img: j.avatar_url ? urlImagem(urlAsset(j.avatar_url), 128) : silhuetaURI(ti < 0 ? RES_MARCA.c : marca(ti).c),
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
        rev.classList.add('on'); SomSorteio.toque(0.22);
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

    // — o final: cartão (véu no interior) + Victory + lock-in + molduras vivas
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
      SomSorteio.cartaoVeu(); SomSorteio.vitoria();
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
      const t0 = Date.now();
      if (SomSorteio.ligado) { await sleep(320); while (vivo && SomSorteio.vitoriaTocando() && Date.now() - t0 < 30000) await sleep(120); } else { await sleep(4000); }
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
      SomSorteio.toque(0.32); SomSorteio.iniciar();
      q('.palcoStage').classList.remove('veuTotal'); montarGrupos(); q('.fimtxt').classList.remove('on');
      if (reduzido) { preencherTudo(); return; }
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
      q('.lever').classList.add('girando'); q('.partilha').classList.remove('on');
      try { await corpo(); } finally {
        aCorrer = false; q('.saltar')?.classList.remove('on');
        q('.lever').classList.remove('girando'); q('.partilha').classList.add('on');
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
    const somBtn = q('.somBtn');
    const pintarSom = () => { somBtn.classList.toggle('on', SomSorteio.ligado); somBtn.title = SomSorteio.ligado ? 'Som ligado' : 'Som desligado (clique p/ ligar)'; };
    const onSom = () => { const on = SomSorteio.toggle(); if (on) { SomSorteio.toque(0.2); SomSorteio.iniciar(); } pintarSom(); };
    somBtn.addEventListener('click', onSom); pintarSom();
    // 13-set: o autoTeste dá load() nos 5 sons para logar "SOM OK 5/5" — 2 MB
    // baixados ao abrir a cerimônia, inclusive com o som desligado, que é o
    // padrão. Fica só em desenvolvimento; em produção os sons entram um a um,
    // no primeiro uso (o el() do somSorteio.js já é preguiçoso).
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
    const sairX = q('.sairX'); const onSair = () => { SomSorteio.toque(0.2); if (window.history.length > 1) window.history.back(); }; sairX.addEventListener('click', onSair);

    // ── botões C3: Guardar (cartaz) + Compartilhar (link /p/) ──
    let toastT = null;
    const mostrarToast = (msg) => { const el = q('.toast'); el.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>${esc(msg)}`; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 1900); timers.add(toastT); };
    // link /p/ a partir do URL do jogo (/equipa/:slug/jogo/:id/... → /p/:slug/:id)
    const m = window.location.pathname.match(/\/equipa\/([^/]+)\/jogo\/([^/]+)/);
    const linkP = m ? `${window.location.origin}/p/${m[1]}/${m[2]}` : `${window.location.origin}${window.location.pathname}`;
    let aGuardar = false;
    const onGuardar = async () => {
      if (aGuardar) return;
      aGuardar = true; SomSorteio.toque(0.24); mostrarToast('Gerando o cartaz…');
      try {
        await gerarCartazEscalacao(resultado, { equipa: infoRef.current.equipa, data: infoRef.current.data });
        mostrarToast('Cartaz salvo');
      } catch {
        mostrarToast('Não deu para gerar o cartaz');
      } finally { aGuardar = false; }
    };
    const onComp = async () => {
      SomSorteio.toque(0.24);
      try { await navigator.clipboard.writeText(linkP); } catch {
        const t = document.createElement('textarea'); t.value = linkP; document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); } catch { /* */ } t.remove();
      }
      mostrarToast('Link copiado');
    };
    const bg = q('.btGuardar'); const bc = q('.btComp');
    bg.addEventListener('click', onGuardar); bc.addEventListener('click', onComp);

    // ── arranque ──
    montarGrupos();
    if (autoStart) { const id = setTimeout(() => { if (vivo) cerimonia(); }, reduzido ? 0 : 700); timers.add(id); }

    // ── cleanup (StrictMode / desmontagem): pára tudo, limpa clones e listeners ──
    return () => {
      vivo = true; vivo = false;
      timers.forEach((id) => clearTimeout(id)); clones.forEach((c) => c.remove());
      SomSorteio.silenciar();
      somBtn.removeEventListener('click', onSom);
      lever.removeEventListener('pointerdown', onDown); lever.removeEventListener('pointermove', onMove);
      lever.removeEventListener('pointerup', onUp); lever.removeEventListener('pointercancel', onUp);
      lever.removeEventListener('keydown', onKey);
      saltarBtn.removeEventListener('click', onSaltar); sairX.removeEventListener('click', onSair);
      bg.removeEventListener('click', onGuardar); bc.removeEventListener('click', onComp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a cerimónia monta 1x; re-sorteio remonta via key
  }, []);

  if (!resultado?.times?.length) {
    return <div style={{ padding: 24, textAlign: 'center', color: '#8a8a98' }}>Sem resultado para mostrar.</div>;
  }

  return (
    <div className="smaq" ref={rootRef}>
      <div className="palcoStage">
        <button type="button" className="sairX" title="Sair para a página do jogo" aria-label="Sair do sorteio">
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div className="fx raios" />
        <div className="palco"><div className="maqbox">
          <div className="maq clip8">
            <div className="somBtn" title="Som (desligado por padrão)">
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
              <div className="fimtxt" />
            </div>
            <div className="baseluz"><div className="fila base1" /><div className="fila base2" /></div>
            <span className="placaFutty">Futty</span>
            <div className="maqveu" />
          </div>
          <div className="lever6 lever" title="Puxar o F = repetir a cerimônia">
            <div className="l6-grip"><div className="l6-knob"><img src="/futty-logo-flat.webp" alt="F" /></div></div>
            <span className="setas"><i /><i /><i /></span>
          </div>
        </div></div>
      </div>
      <div className="partilha">
        <button type="button" className="pbtn btGuardar" title="Salvar a imagem 9:16 (cartaz)"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>Salvar</button>
        <button type="button" className="pbtn btComp" title="Compartilhar o link da cerimônia (/p/)"><svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" /></svg>Compartilhar</button>
      </div>
      {/* BannerAd — servido a valer (/api/ads?pagina=sorteio); toggle do dono + menores
          fail-closed no servidor. Sem campanha/OFF → não aparece. */}
      <BannerSorteio />
      <div className="saltar"><button type="button">» concluir já</button></div>
      <div className="toast" />
    </div>
  );
}
