// ═══════════════════════════════════════════════════════════════════════════════
// SOM SELADO — módulo isolado do som do sorteio (transplante da bancada v8.19).
// LEI: alterações VISUAIS NUNCA tocam neste módulo. As animações CHAMAM a API abaixo
// e jamais mexem nos players de áudio diretamente. Exclusão mútua por AÇÃO (sem portão
// de estado frágil que se possa "prender" — a causa das 2 regressões na bancada).
// Ficheiros reais em public/sons/ (Pixabay Content License — ver docs/licencas.md).
// API mínima: ligado(get) · toggle · autoTeste · iniciar · girar/girarLento/pararGiro
//   · toque · cartaoVeu/cartaoVeuSai · vitoria · vitoriaTocando · silenciar · stamps
// ═══════════════════════════════════════════════════════════════════════════════
const KIT = {
  trilha:  { src: '/sons/trilha-chiptune.mp3',   vol: 0.16, loop: true  },
  giro:    { src: '/sons/slot-machine.mp3',       vol: 0.45, loop: true  },
  hud:     { src: '/sons/Hud%20UI.MP3',           vol: 0.28, loop: false },
  veu:     { src: '/sons/sorteio-finalizado.mp3', vol: 0.55, loop: false },
  vitoria: { src: '/sons/Victory.MP3',            vol: 0.55, loop: false },
};
const els = {}, falhou = {};
let ligado = false;
try { ligado = localStorage.getItem('futty_sorteio_som') === '1'; } catch { /* SSR/priv */ }
let ts = { trilhaStart: 0, trilhaStop: 0, vitoriaStart: 0, vitoriaEnd: 0 };

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
function play(k) { const a = el(k); if (!a) return null; try { const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch { /* ignore */ } return a; }
function stop(k) { const a = els[k]; if (a) { try { a.pause(); a.currentTime = 0; } catch { /* ignore */ } } }
function fade(k, ms) {
  const a = els[k]; if (!a || a.paused) return;
  const v0 = KIT[k].vol, t0 = Date.now();
  const iv = setInterval(() => {
    const t = (Date.now() - t0) / ms;
    if (t >= 1) { a.pause(); a.volume = v0; clearInterval(iv); }
    else a.volume = v0 * (1 - t);
  }, 50);
}

const SomSorteio = {
  get ligado() { return ligado; },
  toggle(v) {
    ligado = (v === undefined) ? !ligado : !!v;
    try { localStorage.setItem('futty_sorteio_som', ligado ? '1' : '0'); } catch { /* ignore */ }
    if (!ligado) this.silenciar();
    return ligado;
  },
  // ARRANQUE: a trilha (cama) entra em loop, baixa. Idempotente. Limpa restos de festa.
  iniciar() {
    if (!ligado) return;
    stop('vitoria'); stop('veu');
    const a = el('trilha'); if (!a) return;
    try {
      a.volume = KIT.trilha.vol;
      if (a.paused) { a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => {}); }
      ts.trilhaStart = Date.now();
    } catch { /* ignore */ }
  },
  girar() {
    if (!ligado) return;
    const a = el('giro'); if (!a) return;
    try { a.playbackRate = 0.85; a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => {}); setTimeout(() => { try { a.playbackRate = 1; } catch { /* ignore */ } }, 320); } catch { /* ignore */ }
  },
  girarLento() { const a = els.giro; if (a && !a.paused) { try { a.playbackRate = 0.72; } catch { /* ignore */ } } },
  pararGiro() { stop('giro'); },
  // TOQUES de interface (multi-shot): cada um é um Audio novo.
  toque(vol) {
    if (!ligado || falhou.hud) return;
    try { const a = new Audio(KIT.hud.src); a.volume = vol || KIT.hud.vol; a.addEventListener('error', () => { falhou.hud = true; }); const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch { /* ignore */ }
  },
  // O CARTÃO: o baque do véu (curto). v8.20 — TOCA (a revelação); não é cortado.
  cartaoVeu() { if (!ligado) return; play('veu'); },
  cartaoVeuSai(ms) { fade('veu', ms || 150); },
  // A VITÓRIA (balanço antigo): mata a trilha (fade) e, ~260ms depois, entra a Victory.
  // Exclusão mútua por AÇÃO DIRETA — sem portão. Devolve o gap (ms).
  vitoria() {
    if (!ligado) return 0;
    const a = els.trilha;
    if (a && !a.paused) fade('trilha', 200);
    ts.trilhaStop = Date.now();
    const GAP = 260;
    setTimeout(() => {
      const v = el('vitoria'); if (!v) return;
      try {
        v.volume = KIT.vitoria.vol; v.currentTime = 0;
        v.onended = () => { ts.vitoriaEnd = Date.now(); };
        const p = v.play(); if (p && p.catch) p.catch(() => {});
        ts.vitoriaStart = Date.now();
      } catch { /* ignore */ }
    }, GAP);
    return GAP;
  },
  vitoriaTocando() { const v = els.vitoria; return !!(v && !v.paused && !v.ended); },
  silenciar() { ['trilha', 'giro', 'veu', 'vitoria'].forEach(stop); },
  stamps() { return { ...ts }; },
  resetStamps() { ts = { trilhaStart: 0, trilhaStop: 0, vitoriaStart: 0, vitoriaEnd: 0 }; },
  // AUTO-TESTE: confirma que os 5 ficheiros carregam. Loga "SOM OK 5/5".
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
