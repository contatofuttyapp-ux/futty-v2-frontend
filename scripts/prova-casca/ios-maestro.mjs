#!/usr/bin/env node
// Prova do app 2.0 no simulador iOS, no Mac do CI (.github/workflows/ios-simulador.yml). Faz o papel do servidor do site em localhost:8788
// (a prova nunca fala com a produção) e dirige a página pelo ios-robo.js em localhost:8799. A folha nativa não fecha sem um dedo: depois de
// fotografar, o app é fechado e reaberto, e o sorteio continua guardado no aparelho.
//
// O simctl é sempre assíncrono: no Mac do CI ele leva minutos, e uma chamada síncrona congelava os dois servidores, deixando o robô sem
// resposta.
//   node scripts/prova-casca/ios-maestro.mjs <udid> <pasta de saída>
import { execFile, execFileSync, spawn } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARTAZ, COMBO_VERDE_E_BRANCO, CONGELAR_REFLEXO, HORARIO_NA_TELA, JOGO_NA_TELA, KIT_DO_TIME, LEGENDA, LOCAL, PREENCHER_JOGO, RECURSOS_COM_VERSAO, SOLTAR_REFLEXO, SORTEAR, contaRolo, impressaoDe } from './_site-novo.mjs';

const [UDID, SAIDA] = process.argv.slice(2);
mkdirSync(SAIDA, { recursive: true });
const PACOTE = 'com.futty.app';
const ZIP_DO_BUNDLE = join(SAIDA, 'bundle-da-prova.zip');
const VERSAO_DA_PROVA = '2.0.1';
const LISTA =['Zanardini', 'Gustavo', 'Higor', 'Gustavo Villela', 'Miguel (g)', 'Erick Lopes', 'Gabriel Vasques', 'Motta', 'Kinho', 'Bruno', 'Caio', 'Diego'].join('\n');

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const simctl = (...a) => new Promise((resolve, reject) => {
  execFile('xcrun', ['simctl', ...a], { encoding: 'utf8', timeout: 300000 }, (erro, saida) => (erro ? reject(erro) : resolve(saida)));
});
// Uma captura que não sai não pode segurar a prova inteira.
const captura = (nome) => new Promise((resolve) => {
  execFile('xcrun', ['simctl', 'io', UDID, 'screenshot', join(SAIDA, `${nome}.png`)], { timeout: 180000 }, (erro) => {
    if (erro) console.log(`[captura ${nome}] não saiu: ${erro.message.slice(0, 90)}`);
    resolve();
  });
});

const resultados = [];
function confere(nome, ok, detalhe = '') {
  resultados.push({ nome, ok: !!ok, detalhe: String(detalhe) });
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome}${detalhe ? ` · ${detalhe}` : ''}`);
}

// ── O servidor do site, de mentira: só o que o Compartilhar e o link pedem ──
const links = new Map();
const pedidosDaApi = [];
const lerCorpo = (req) => new Promise((res) => { const p = []; req.on('data', (d) => p.push(d)); req.on('end', () => res(Buffer.concat(p))); });
const api = createServer(async (req, res) => {
  const corpo = await lerCorpo(req);
  pedidosDaApi.push(`${req.method} ${req.url}`);
  const json = (s, d) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(d)); };
  if (req.method === 'POST' && req.url === '/api/links') { const codigo = 'PROVA2'; links.set(codigo, JSON.parse(corpo.toString())); return json(201, { codigo }); }
  if (req.method === 'PUT' && req.url.startsWith('/api/logos')) return json(201, { chave: 'l-abcdefghijklmnopqrstuvwx.png' });
  if (req.method === 'POST' && req.url === '/api/evento') { res.writeHead(204); return res.end(); }
  return json(404, { erro: 'nao_achei' });
});
api.listen(8788, '127.0.0.1');

// ── O maestro: fila de comandos que o robô da página vem buscar ──
let proximoId = 0;
let perguntasDoRobo = 0;
const fila = [];
const esperando = new Map();
const maestro = createServer(async (req, res) => {
  const json = (d) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(d)); };
  if (req.url === '/bundle.zip') { res.writeHead(200, { 'content-type': 'application/zip' }); return res.end(readFileSync(ZIP_DO_BUNDLE)); }
  if (req.url === '/robo/comando') { perguntasDoRobo += 1; return json(fila.shift() || {}); }
  if (req.url === '/robo/resposta') {
    const d = JSON.parse((await lerCorpo(req)).toString());
    esperando.get(d.id)?.(d);
    esperando.delete(d.id);
    return json({});
  }
  return json({});
});
maestro.listen(8799, '127.0.0.1');

function js(codigo, ms = 90000) {
  return new Promise((resolve, reject) => {
    proximoId += 1;
    const id = proximoId;
    esperando.set(id, (d) => (d.ok ? resolve(d.valor) : reject(new Error(d.erro))));
    const comando = { id, codigo };
    fila.push(comando);
    // Comando vencido sai da fila: senão o robô lento gasta o tempo que tem respondendo o que ninguém espera mais.
    setTimeout(() => {
      if (!esperando.delete(id)) return;
      const i = fila.indexOf(comando);
      if (i >= 0) fila.splice(i, 1);
      reject(new Error(`sem resposta do robô: ${codigo.slice(0, 70)}`));
    }, ms);
  });
}
async function esperaJs(codigo, ms = 240000) {
  const fim = Date.now() + ms;
  for (;;) {
    const v = await js(`return (${codigo});`, Math.min(90000, ms)).catch(() => false);
    if (v) return v;
    if (Date.now() > fim) throw new Error(`prazo de ${ms} ms: ${codigo.slice(0, 70)}`);
    await espera(300);
  }
}
const clique = (sel) => esperaJs(`!!document.querySelector(${JSON.stringify(sel)})`).then(() => js(`document.querySelector(${JSON.stringify(sel)}).click();`));

async function abrirApp() {
  await simctl('terminate', UDID, PACOTE).catch(() => { /* não estava aberto */ });
  fila.length = 0;
  esperando.clear();
  const inicio = Date.now();
  // Sem esperar: o launch pode levar minutos para responder com o app já aberto, e quem diz que abriu é o robô.
  simctl('launch', UDID, PACOTE, '-AppleLanguages', '(pt-BR)', '-AppleLocale', 'pt_BR').catch((e) => console.log(`[launch] ${e.message.slice(0, 120)}`));
  return inicio;
}

async function colarLista() {
  await esperaJs(`!!document.querySelector('#lista')`, 300000);
  await js(`const n = document.querySelector('#lista'); n.focus();
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(n, ${JSON.stringify(LISTA)});
    n.dispatchEvent(new Event('input', { bubbles: true })); n.blur();`);
  await esperaJs(`!!document.querySelector('[data-sortear]:not([disabled])')`, 30000);
}

async function sortear() {
  await clique('[data-sortear]');
  await esperaJs(`!!document.querySelector('.saltar.on')`, 120000);
}

const QUADROS_POR_SEGUNDO = `return await new Promise((res) => { let n = 0; const t0 = performance.now(); const passo = () => { n += 1; const t = performance.now() - t0; if (t > 3000) res(Math.round(n / (t / 1000))); else requestAnimationFrame(passo); }; requestAnimationFrame(passo); });`;

// Com prazo folgado e dizendo por onde vai: lentidão do Mac e cerimônia parada são coisas diferentes, e só o andamento separa uma da outra.
async function esperarFimDaCerimonia(ms = 900000) {
  const fim = Date.now() + ms;
  let ultimo = Date.now();
  for (;;) {
    if (await js(`return !!document.querySelector('[data-baixar]');`).catch(() => false)) return;
    if (Date.now() > fim) throw new Error(`a cerimônia não acabou em ${ms} ms`);
    if (Date.now() - ultimo > 30000) {
      ultimo = Date.now();
      const onde = await js(`return { paradas: [...document.querySelectorAll('.gcont')].map((n) => n.textContent), cheios: document.querySelectorAll('.slot.cheio').length, quem: document.querySelector('.quem')?.textContent, pular: !!document.querySelector('.saltar.on') };`).catch((e) => e.message);
      // A página para de perguntar quando ela mesma parou; pergunta e não responde a tempo, é o caminho até ela que está lento.
      console.log(`[andamento] ${JSON.stringify(onde)} · perguntas do robô até agora: ${perguntasDoRobo}`);
    }
    await espera(1000);
  }
}

const ESPIAR_SOM = `window.__tocados = []; window.__vibracoes = [];
    const pedir = window.Capacitor.nativePromise;
    window.Capacitor.nativePromise = function (plugin, metodo) { if (plugin === 'Haptics') window.__vibracoes.push(metodo); return pedir.apply(this, arguments); };
    const comecar = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function () { window.__tocados.push('rolo.mp3'); return comecar.apply(this, arguments); };
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      const nome = (this.currentSrc || this.src).split('/').pop(); const mudo = this.muted;
      const p = play.apply(this, arguments);
      if (!mudo) p?.then?.(() => window.__tocados.push(nome), (e) => window.__tocados.push('RECUSADO ' + nome + ' ' + e.name));
      return p;
    };`;

const pngsDoCache = async () => {
  const dados = (await simctl('get_app_container', UDID, PACOTE, 'data')).trim();
  const pasta = join(dados, 'Library', 'Caches');
  return readdirSync(pasta).filter((n) => /\.png$/i.test(n)).map((n) => join(pasta, n));
};

async function abrirResultadoGuardado() {
  await abrirApp();
  await esperaJs(`!!document.querySelector('#lista')`, 300000);
  await js(`history.pushState(null, '', '/resultado'); window.dispatchEvent(new PopStateEvent('popstate'));`);
  await esperaJs(`!!document.querySelector('[data-copiar-link]')`, 60000);
}

try {
  // ── 1. Abertura ──
  const inicio = await abrirApp();
  await esperaJs(`!!document.querySelector('#lista')`, 300000);
  const msCampo = Date.now() - inicio;
  await espera(1500);
  await captura('1-inicio');
  const estado = await js(`
    const sonda = document.createElement('div'); sonda.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top,0px)';
    document.body.appendChild(sonda); const areaSegura = sonda.getBoundingClientRect().height; sonda.remove();
    const titulo = document.querySelector('h1, .titulo, [data-pagina="inicio"] h1');
    return {
    caminho: location.pathname, origem: location.origin, nativo: window.Capacitor.isNativePlatform(), plataforma: window.Capacitor.getPlatform(),
    seo: !!document.querySelector('.seo'), baixeOApp: !!document.querySelector('[data-baixe-o-app]'), ajuda: !!document.querySelector('[data-ajuda]'),
    senha: !!document.querySelector('input[type="password"]'), login: /entrar|criar conta|senha/i.test(document.body.innerText), idioma: document.documentElement.lang,
    areaSegura, topoDoTitulo: titulo ? titulo.getBoundingClientRect().top : null,
    fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null };`);
  confere('abre direto no início do sorteio', estado.caminho === '/' && estado.nativo && estado.plataforma === 'ios', JSON.stringify({ origem: estado.origem, idioma: estado.idioma }));
  confere('sem login', !estado.senha && !estado.login);
  confere('sem blocos de SEO nem "Baixe o app"; com Ajuda', !estado.seo && !estado.baixeOApp && estado.ajuda);
  confere('o título fica abaixo do relógio e da ilha', estado.areaSegura > 0 && estado.topoDoTitulo >= estado.areaSegura, `área segura ${estado.areaSegura} px, título em ${estado.topoDoTitulo} px`);
  console.log(`[tempo] até o campo pronto ${msCampo} ms · FCP do WebView ${estado.fcp} ms`);

  // ── 1b. O que o site trouxe de novo na tela inicial, e o som com ?v=2 servido de dentro do pacote ──
  const DIST_LOCAL = new URL('../../dist/', import.meta.url);
  const rec = await js(RECURSOS_COM_VERSAO, 60000);
  // No iOS o Capacitor responde mídia sem status (WebViewAssetHandler.swift, isMediaExtension): o fetch vê 0, e o site não olha o status. Quem prova são os bytes.
  confere('rolo.mp3?v=2 sai do pacote com os bytes do dist', rec.rolo.status === 0 && rec.rolo.impressao === impressaoDe(new URL('sons/rolo.mp3', DIST_LOCAL)) && rec.rolo.bytes > 80000, JSON.stringify(rec.rolo));
  confere('o Web Audio decodifica o rolo.mp3?v=2', typeof rec.duracao === 'number' && rec.duracao > 1, `${rec.duracao} s`);
  confere('o <audio> de reserva abre o rolo.mp3?v=2', typeof rec.reserva === 'number' && rec.reserva > 1, `${rec.reserva} s`);
  confere('estrela.svg?v=2 sai do pacote com os bytes do dist', rec.estrela.status === 200 && rec.estrela.impressao === impressaoDe(new URL('icones/estrela.svg', DIST_LOCAL)), JSON.stringify(rec.estrela));
  await colarLista();
  const legenda = await js(LEGENDA);
  confere('legenda com a linha do nível e a estrela nova', /Equilibrar por nível: 1 a 5 estrelas/.test(legenda.texto) && legenda.mascara.includes('estrela.svg?v=2') && legenda.interruptor, JSON.stringify(legenda));
  await js(`document.querySelector('[data-legenda]').scrollIntoView({ block: 'start' });`);
  await espera(800);
  await captura('1b-legenda-nivel-estrela');
  const sortearAceso = await js(SORTEAR);
  confere('SORTEAR de 64 px com o reflexo andando', sortearAceso.altura === 64 && sortearAceso.reflexo.includes('reflexo') && sortearAceso.traco.length > 0, JSON.stringify(sortearAceso));
  await js(`document.querySelector('[data-sortear]').scrollIntoView({ block: 'center' });`);
  await js(CONGELAR_REFLEXO);
  await espera(800);
  await captura('1c-sortear-reflexo');
  await js(SOLTAR_REFLEXO);
  const quadros = await js(QUADROS_POR_SEGUNDO, 60000);
  console.log(`[fôlego] início com o SORTEAR aceso: ${quadros} quadros/s`);
  await js(`localStorage.setItem('futty_prova_sem_luzes', '1'); window.__semLuzes();`);
  console.log(`[fôlego] luzes decorativas desligadas daqui em diante: ${await js(QUADROS_POR_SEGUNDO, 60000)} quadros/s`);

  // ── 2. Sorteio com som ──
  await js(ESPIAR_SOM);
  await sortear();
  await js(`const som = document.querySelector('.somBtn'); if (!som.classList.contains('on')) som.click();`);
  await espera(1800);
  await captura('2-cerimonia');
  await esperarFimDaCerimonia();
  await espera(800);
  await captura('3-resultado');
  const tocados = await js('return window.__tocados;');
  confere('cerimônia com som: rolo, clac e jackpot tocaram', ['rolo', 'clac', 'jackpot'].every((n) => tocados.some((x) => x.startsWith(n))) && !tocados.some((x) => x.startsWith('RECUSADO')), `${tocados.length} toques: ${[...new Set(tocados)].slice(0, 8).join(', ')}`);
  const vibracoes = await js('return window.__vibracoes;');
  const impactos = vibracoes.filter((v) => v === 'impact').length;
  const jackpots = vibracoes.filter((v) => v === 'notification').length;
  confere('vibração quando cada camisa para e uma só no jackpot', impactos === 10 && jackpots === 1, `impact ${impactos}, notification ${jackpots}`);
  const rolo = contaRolo(tocados);
  confere('o rolo tocou pelo Web Audio, sem cair na reserva', rolo.webAudio > 0 && rolo.reserva === 0, JSON.stringify(rolo));
  const recursos = await js(`return performance.getEntriesByType('resource').map((e) => e.name);`);

  // ── 2b. Folha "Editar pelada" e listras horizontais: a imagem do passo 3 sai com os dois ──
  await clique('[data-editar-jogo]');
  await esperaJs(`!!document.querySelector('#jogo-local')`);
  const tituloFolha = await js(PREENCHER_JOGO);
  await espera(800);
  await captura('3b-folha-editar-pelada');
  confere('a folha "Editar pelada" abre com local e horário', tituloFolha === 'Editar pelada', tituloFolha);
  await clique('[data-jogo-pronto]');
  await esperaJs(`!!document.querySelector('[data-jogo-local]')`, 15000);
  const jogoNaTela = await js(JOGO_NA_TELA);
  confere('local e horário aparecem na tela', jogoNaTela.local === LOCAL && jogoNaTela.horario === HORARIO_NA_TELA, JSON.stringify(jogoNaTela));
  await js(`window.scrollTo(0, 0);`);
  await espera(800);
  await captura('3c-tela-com-local-e-horario');
  await clique('[data-editar="0"]');
  await clique('[data-padrao-uniforme="listrasH"]');
  await clique(COMBO_VERDE_E_BRANCO);
  await espera(2500);
  await captura('3d-editar-listras-horizontais');
  await clique('[data-editar-pronto]');
  await esperaJs(`!document.querySelector('[data-folha]')`, 15000);
  await espera(2500);
  await js(`document.querySelector('[data-time="0"]').scrollIntoView({ block: 'start' });`);
  await espera(1000);
  await captura('3e-listras-horizontais-na-tela');
  const kit = await js(KIT_DO_TIME);
  confere('listras horizontais vestem o time', kit.padrao === 'listrasH' && kit.cor === 'verde' && kit.cor2 === 'branco', JSON.stringify(kit));
  await js(`window.scrollTo(0, 0);`);

  // ── 3. Baixar imagem: PNG na cache e folha do sistema ──
  await clique('[data-baixar]');
  await esperaJs(`!!document.querySelector('[data-folha]')`);
  await espera(500);
  await captura('4-escolha-da-imagem');
  await clique('[data-formato="todos916"]');
  await espera(12000);
  await captura('5-baixar-imagem-folha-nativa');
  const pngs = await pngsDoCache();
  const png = pngs[0] ? readFileSync(pngs[0]) : Buffer.alloc(0);
  if (png.length) writeFileSync(join(SAIDA, 'imagem-gerada.png'), png);
  confere('a imagem na folha é o PNG do sorteio', png.length > 0 && png.readUInt32BE(20) > png.readUInt32BE(16), pngs[0] ? `${pngs[0].split('/').pop()} ${png.readUInt32BE(16)}×${png.readUInt32BE(20)}, ${png.length} bytes` : 'sem arquivo');
  const cartazOnline = await js(CARTAZ);
  confere('cartaz-*.js veio de dentro do app', cartazOnline.urls.length > 0 && cartazOnline.urls.every((u) => u.startsWith(`${cartazOnline.origem}/assets/`)), cartazOnline.urls.join(' '));

  // ── 4. Compartilhar: o sorteio segue guardado; link pelo servidor da prova ──
  await abrirResultadoGuardado();
  await js(`document.querySelector('[data-folha]') && document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));`);
  await espera(400);
  // Espia o que a ponte manda para a folha. A prova de que o link é o público está aqui e na captura.
  await js(`window.__folha = []; const pedir = window.Capacitor.nativePromise;
    window.Capacitor.nativePromise = function (plugin, metodo, op) { if (plugin === 'Share') window.__folha.push(op); return pedir.apply(this, arguments); };`);
  await clique('[data-copiar-link]');
  await esperaJs(`window.__folha.length > 0`, 60000);
  await espera(8000);
  await captura('6-compartilhar-folha-nativa');
  const folha = await js('return window.__folha[0];');
  confere('o link na folha é o público, não o do WebView', /^https:\/\/futtyapp\.com\.br\/s\/PROVA2$/.test(folha.url || ''), folha.url);
  confere('o link foi criado pelo HTTP nativo', pedidosDaApi.includes('POST /api/links'), [...new Set(pedidosDaApi)].join(' · '));

  // ── 5. Copiar texto: leva o link público ──
  await abrirResultadoGuardado();
  await clique('[data-copiar-texto]');
  await espera(1500);
  const aviso = await js(`return document.querySelector('[data-toast]')?.textContent || document.querySelector('[data-folha] textarea')?.value || '';`);
  const colado = await simctl('pbpaste', UDID).catch((e) => `pbpaste falhou: ${e.message}`);
  confere('Copiar texto leva o link público', /futtyapp\.com\.br\/s\/PROVA2/.test(colado) && !/localhost/.test(colado), `aviso "${aviso.slice(0, 40)}" · ${colado.split('\n').filter((l) => /\/s\/|falhou/.test(l)).join(' ')}`);

  // ── 6. Sem rede: o pf do Mac corta tudo que não é local, e o servidor da prova sai do ar ──
  // O simulador não tem modo avião. O vigia devolve a rede sozinho: sem ela por muito tempo, o GitHub dá o Mac por perdido.
  await new Promise((r) => { api.close(r); api.closeAllConnections?.(); });
  execFileSync('sudo', ['sh', '-c', `echo 'block drop out quick on ! lo0 all' | pfctl -f - -E`], { stdio: 'ignore' });
  spawn('sudo', ['sh', '-c', 'sleep 300; pfctl -d'], { detached: true, stdio: 'ignore' }).unref();
  try {
    await abrirApp();
    await esperaJs(`!!document.querySelector('[data-sortear]:not([disabled])')`, 300000); // a lista segue no rascunho
    await sortear();
    await espera(1500);
    await js(`document.querySelector('.saltar.on button')?.click();`);
    await esperarFimDaCerimonia();
    await espera(600);
    await captura('8-sem-rede-resultado');
    confere('sem rede: colar, sortear e cerimônia funcionam', true);
    await clique('[data-baixar]');
    await clique('[data-formato="todos11"]');
    await espera(10000);
    await captura('9-sem-rede-imagem');
    const offline = await pngsDoCache();
    confere('sem rede: gerar imagem funciona', offline.some((f) => /quadrada/.test(f)), offline.map((f) => f.split('/').pop()).join(', '));
    const cartazOffline = await js(CARTAZ);
    confere('sem rede: cartaz-*.js abre de dentro do pacote', cartazOffline.urls.length > 0 && cartazOffline.urls.every((u) => u.startsWith(`${cartazOffline.origem}/assets/`)), cartazOffline.urls.join(' '));
    const quadrada = offline.find((f) => /quadrada/.test(f));
    if (quadrada) writeFileSync(join(SAIDA, 'imagem-gerada-sem-rede.png'), readFileSync(quadrada));
    await abrirResultadoGuardado();
    await clique('[data-copiar-link]');
    const avisoRede = await esperaJs(`document.querySelector('[data-toast]')?.textContent || ''`, 40000);
    await espera(300);
    const avisoFinal = await js(`return document.querySelector('[data-toast]')?.textContent || '';`);
    await captura('10-sem-rede-compartilhar');
    confere('sem rede: Compartilhar avisa e não trava', avisoFinal === 'Sem internet pra criar o link', `primeiro: "${avisoRede}" · ficou: "${avisoFinal}"`);
  } finally {
    execFileSync('sudo', ['pfctl', '-d'], { stdio: 'ignore' });
  }

  // ── Rede vista pelo WebView ──
  const recursosFinais = await js(`return performance.getEntriesByType('resource').map((e) => e.name);`).catch(() => []);
  const todos = [...recursos, ...recursosFinais];
  const deFora = todos.filter((u) => !/^(capacitor:\/\/localhost|data:|blob:)/.test(u));
  confere('o WebView não pediu nada fora do próprio app', deFora.length === 0, deFora.slice(0, 5).join(' '));
  writeFileSync(join(SAIDA, 'rede-webview.json'), JSON.stringify(todos, null, 1));

  // ── 7. O site rodando como bundle do Capgo: outra pasta, fora do app instalado. O servidor do Capgo na prova é o de mentira (ios-simulador.yml) ──
  // O app aqui já tem o dist novo de fábrica; o que se prova é a pasta do bundle, não a troca de versão, que o Android prova inteira.
  await new Promise((resolve, reject) => { execFile('zip', ['-qr', ZIP_DO_BUNDLE, '.'], { cwd: fileURLToPath(new URL('../../dist/', import.meta.url)) }, (e) => (e ? reject(e) : resolve())); });
  await abrirApp();
  await esperaJs(`!!document.querySelector('#lista')`, 300000);
  const baixado = await js(`return window.Capacitor.nativePromise('CapacitorUpdater', 'download', { url: 'http://localhost:8799/bundle.zip', version: ${JSON.stringify(VERSAO_DA_PROVA)} });`, 180000);
  // O set recarrega a tela: a resposta dele nunca volta, e quem diz que deu certo é a página nova.
  js(`return window.Capacitor.nativePromise('CapacitorUpdater', 'set', { id: ${JSON.stringify(baixado.id)} });`, 20000).catch(() => {});
  await espera(8000);
  fila.length = 0;
  esperando.clear();
  await esperaJs(`!!document.querySelector('[data-sortear]:not([disabled])')`, 300000);
  const noBundle = await js(`return window.Capacitor.nativePromise('CapacitorUpdater', 'current', {});`);
  confere('roda como bundle do Capgo', noBundle?.bundle?.version === VERSAO_DA_PROVA && noBundle?.bundle?.id !== 'builtin', JSON.stringify(noBundle?.bundle));
  const recBundle = await js(RECURSOS_COM_VERSAO, 60000);
  confere('no bundle: rolo.mp3?v=2 com os bytes certos', recBundle.rolo.status === 0 && recBundle.rolo.impressao === impressaoDe(new URL('sons/rolo.mp3', DIST_LOCAL)), JSON.stringify(recBundle.rolo));
  confere('no bundle: o Web Audio decodifica o rolo', typeof recBundle.duracao === 'number' && recBundle.duracao > 1, `${recBundle.duracao} s`);
  confere('no bundle: o <audio> de reserva abre o rolo', typeof recBundle.reserva === 'number' && recBundle.reserva > 1, `${recBundle.reserva} s`);
  confere('no bundle: estrela.svg?v=2 com os bytes certos', recBundle.estrela.status === 200 && recBundle.estrela.impressao === impressaoDe(new URL('icones/estrela.svg', DIST_LOCAL)), JSON.stringify(recBundle.estrela));
  await js(ESPIAR_SOM);
  await sortear();
  await js(`const som = document.querySelector('.somBtn'); if (!som.classList.contains('on')) som.click();`);
  await espera(1800);
  await captura('c3-cerimonia-no-bundle');
  await esperarFimDaCerimonia();
  await espera(2500);
  const tocadosBundle = await js('return window.__tocados;');
  const roloBundle = contaRolo(tocadosBundle);
  confere('no bundle: o rolo toca pelo Web Audio, com clac e jackpot', roloBundle.webAudio > 0 && roloBundle.reserva === 0 && tocadosBundle.some((x) => x.startsWith('clac')) && tocadosBundle.some((x) => x.startsWith('jackpot')) && !tocadosBundle.some((x) => x.startsWith('RECUSADO')), `${JSON.stringify(roloBundle)} · ${[...new Set(tocadosBundle)].slice(0, 6).join(', ')}`);
  await clique('[data-baixar]');
  await clique('[data-formato="todos916"]');
  await espera(12000);
  await captura('c4-imagem-no-bundle');
  const cartazBundle = await js(CARTAZ);
  const pngsBundle = await pngsDoCache();
  const storyBundle = pngsBundle.find((f) => /story/.test(f));
  if (storyBundle) writeFileSync(join(SAIDA, 'c4-imagem-do-bundle.png'), readFileSync(storyBundle));
  confere('no bundle: cartaz-*.js abre e a imagem sai', !!storyBundle && cartazBundle.urls.length > 0 && cartazBundle.urls.every((u) => u.startsWith(`${cartazBundle.origem}/assets/`)), cartazBundle.urls.join(' '));
  writeFileSync(join(SAIDA, 'resultado.json'), JSON.stringify({ resultados, tempos: { campoProntoMs: msCampo, fcpMs: estado.fcp }, estado }, null, 2));
} catch (e) {
  confere('a prova chegou ao fim', false, e.message);
  await captura('erro');
}
const falhas = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - falhas.length}/${resultados.length} conferidos`);
process.exit(falhas.length ? 1 : 0);
