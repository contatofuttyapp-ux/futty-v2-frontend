// Futty v2.0 — Rodada 29H-B: as cenas do visual e do som, no WebKit do iPhone, em servidor LOCAL (CLAUDE.md, 25-set) com as contas de
// prova do backend (scripts/_bench/prova-rodada29b.js) e TODA escrita interceptada (nada chega ao banco). Roda pelo ver-iphone.mjs:
//   node scripts/ver-iphone.mjs --url http://localhost:5233 --cenas rodada29hb --etiqueta r29hb
//
//   A · mini sorteio com os tempos novos (item 40): 1ª trava ~1,9 s depois de girar, um rolo a cada ~0,75 s (o ciclo inteiro é da cena rodada29e2);
//   B · enquadramento único no onboarding (item 55): o CropModal 2:3 com o quadrado tracejado dourado e a miniatura ao vivo ("É assim que
//       você aparece no app"); "Confirmar" sobe a foto e grava o quadrado como miniatura (PUT /api/me/avatar/enquadro {0.5, 0.333, 1});
//       a página 2 mostra o card 2:3 com o tracejado e a miniatura ao lado;
//   C · selfie NUNCA espelhada (item 54): uma foto com uma marca à ESQUERDA sobe à esquerda (o JPEG que o app mandou, lido do próprio
//       FormData do fetch — o WebKit não entrega corpos multipart ao route), aparece à esquerda no cropper e à esquerda na moldura — e
//       nenhuma imagem do app leva transform de espelho;
//   D · Figurinha: "Trocar foto" abre o mesmo enquadramento único; o botão "Enquadrar" (o editor à parte) não existe mais;
//   E · aura (item 56): no desenho real do fundo (desenharFundoAura), a aura chega à BORDA do card (dobro do tamanho) e o centro está
//       menos cheio (−25% de opacidade); no card inteiro a borda lateral é dourada;
//   F · som (item 61): o 4º efeito existe no site (200, audio/mpeg, ≤ 0,8 s medido pelo WebKit), os 6 arquivos servidos são BYTE A BYTE
//       os de public/sons (SHA-256), os 5 de sempre têm o MD5 selado de 16A, e o prepararNoGesto abre as rodas de todos os efeitos
//       (8 <audio>) — inclusive a alavanca — sem ligar o som de ninguém.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// Os cinco de sempre (16A), selados — os mesmos MD5 que scripts/gerar-sons.mjs confere a cada geração.
const ASSINATURAS = {
  'tique-1': 'b17ecfcd958ecd2dff4b54fd77d1847d',
  'tique-2': '655a349ac7633f5150e50face398368e',
  'tique-3': '0d5bca1fcd34cff2f4d6ac9ff24b425d',
  clac: 'b06c5105d9d17b9355c436f3aff5ce41',
  jackpot: '7c4e3e14b78151f521df24e375bf74bf',
};

export async function cenaRodada29hb(navegador, { BASE, PASTA, RAIZ, novoContexto, travarEscritas, espera }) {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(BASE)) {
    throw new Error(`rodada29hb só roda contra servidor LOCAL (CLAUDE.md, 25-set), e o --url é ${BASE}`);
  }
  const pasta = path.join(PASTA, 'rodada-29h');
  mkdirSync(pasta, { recursive: true });
  const fx = JSON.parse(readFileSync(path.join(PASTA, 'sessao-rodada29b.json'), 'utf8'));
  const erros = [];
  const verificacoes = [];
  const capturas = [];
  const verificar = (nome, ok, detalhe = '') => verificacoes.push({ nome, ok: !!ok, detalhe });
  const capturar = async (pagina, nome) => {
    const arq = path.join(pasta, `r29hb-${nome}.png`);
    await pagina.screenshot({ path: arq });
    capturas.push(path.relative(RAIZ, arq));
  };
  const bloco = async (rotulo, fn) => {
    try { await fn(); } catch (e) { erros.push(`${rotulo}: ${e.message.split('\n')[0]}`); verificar(`bloco ${rotulo} terminou sem exceção`, false, e.message.split('\n')[0]); }
  };
  const aceitarCookies = (pagina) => pagina.locator('button', { hasText: /^Aceitar$/ }).click({ timeout: 2500 }).catch(() => {});
  const texto = (pagina) => pagina.locator('body').innerText().catch(() => '');
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const escritaDe = (escritas, metodo, rota) => escritas.filter((e) => e.metodo === metodo && e.rota === rota);

  // O WebKit não entrega ao route o corpo multipart de um fetch com FormData: o JPEG que o app manda é lido no próprio fetch, dentro
  // da página (window.__uploadB64), e é ELE que /__prova/avatar.jpg devolve — a moldura mostra exatamente o que subiu.
  const capturarUpload = () => {
    const original = window.fetch;
    window.fetch = function (entrada, opcoes) {
      try {
        const url = typeof entrada === 'string' ? entrada : entrada?.url;
        const corpo = opcoes?.body;
        if (corpo instanceof FormData && /\/api\/me\/avatar(\?|$)/.test(String(url || ''))) {
          const arquivo = corpo.get('avatar');
          if (arquivo instanceof Blob) { const r = new FileReader(); r.onload = () => { window.__uploadB64 = r.result; }; r.readAsDataURL(arquivo); }
        }
      } catch { /* nada */ }
      return original.apply(this, arguments);
    };
  };
  let paginaAtual = null;
  const servido = { jpeg: false }; // /__prova/avatar.jpg devolveu o JPEG que subiu (e não a foto de prova de reserva)
  const abrir = async (sessao, rotulo, rota, { inicial = null, antes = null, respostas = () => null } = {}) => {
    const contexto = await novoContexto(navegador, sessao, { amostrar: false, extra: { timezoneId: 'America/Sao_Paulo' } });
    await contexto.addInitScript(capturarUpload);
    if (inicial) await contexto.addInitScript(inicial);
    const escritas = await travarEscritas(contexto, respostas);
    if (antes) await antes(contexto);
    const pagina = await contexto.newPage();
    paginaAtual = pagina;
    pagina.on('pageerror', (e) => erros.push(`${rotulo}: ${e.message}`));
    await pagina.goto(`${BASE}${rota}`, { waitUntil: 'domcontentloaded' });
    await aceitarCookies(pagina);
    return { contexto, pagina, escritas };
  };
  const uploadDaPagina = async (pagina) => {
    for (let i = 0; i < 20; i += 1) {
      const b64 = await pagina.evaluate(() => window.__uploadB64 || null).catch(() => null);
      if (b64) return Buffer.from(b64.split(',')[1], 'base64');
      await espera(100);
    }
    return null;
  };

  // A foto de prova: 600×900 (2:3) azul-escuro com uma MARCA vermelha no canto superior ESQUERDO e um rosto esquemático no meio.
  // É o que prova o espelho: se alguém virar a imagem, a marca passa para a direita.
  const FOTO = await sharp({ create: { width: 600, height: 900, channels: 3, background: '#1f2a44' } })
    .composite([
      { input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect x="30" y="30" width="150" height="150" fill="#ff2d2d"/><circle cx="300" cy="330" r="130" fill="#e8c9a0"/><rect x="200" y="470" width="200" height="430" fill="#333a55"/></svg>'), left: 0, top: 0 },
    ]).png().toBuffer();
  const ladoDaMarca = async (imagem) => {
    // média do canal vermelho nas duas pontas do topo (20% de largura, 20% de altura): a marca é um bloco vermelho puro
    const { width, height } = await sharp(imagem).metadata();
    const w = Math.round(width * 0.2), h = Math.round(height * 0.2);
    // (sharp: stats() mede a imagem decodificada, ignorando o extract na mesma cadeia — por isso o recorte vai para um buffer antes)
    const stat = async (left) => (await sharp(await sharp(imagem).extract({ left, top: 0, width: w, height: h }).png().toBuffer()).stats()).channels[0].mean;
    const esq = await stat(0), dir = await stat(width - w);
    return { largura: width, altura: height, esq: Math.round(esq), dir: Math.round(dir), lado: esq > dir + 60 ? 'esquerda' : dir > esq + 60 ? 'direita' : 'nenhum' };
  };
  // Lê, DENTRO da página, de que lado está a marca numa <img> (desenha-a num canvas e compara as duas pontas do topo).
  const marcaNaImagem = (seletor) => new Promise((res) => {
    const img = document.querySelector(seletor);
    if (!img) return res({ lado: 'sem-img' });
    const medir = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0);
        const w = Math.round(c.width * 0.2), h = Math.round(c.height * 0.2);
        const media = (left) => { const d = x.getImageData(left, 0, w, h).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i]; return s / (d.length / 4); };
        const esq = media(0), dir = media(c.width - w);
        res({ esq: Math.round(esq), dir: Math.round(dir), lado: esq > dir + 60 ? 'esquerda' : dir > esq + 60 ? 'direita' : 'nenhum', transform: getComputedStyle(img).transform, naturalWidth: img.naturalWidth });
      } catch (e) { res({ lado: 'erro', erro: e.message }); }
    };
    if (img.complete && img.naturalWidth) medir(); else img.addEventListener('load', medir, { once: true });
  });
  // O POST /api/me/avatar de prova responde como o motor; /__prova/avatar.jpg devolve o JPEG que o app acabou de mandar.
  const rotasDoUpload = async (contexto) => {
    await contexto.route('**/api/me/avatar', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      const url = `${BASE}/__prova/avatar.jpg`;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ avatar_url: url, foto_url: url, foto_original_url: null, figurinha_ativa: false }) });
    });
    await contexto.route('**/__prova/avatar.jpg*', async (route) => {
      const jpeg = paginaAtual ? await uploadDaPagina(paginaAtual) : null;
      servido.jpeg = !!jpeg;
      return route.fulfill({ status: 200, contentType: jpeg ? 'image/jpeg' : 'image/png', body: jpeg || FOTO, headers: { 'access-control-allow-origin': '*', 'cache-control': 'no-store' } });
    });
  };
  const lerCropper = (pagina) => pagina.evaluate(() => {
    const modal = document.querySelector('[data-crop-modal]');
    const area = document.querySelector('.crop-area--miniatura');
    const dep = area ? getComputedStyle(area, '::after') : null;
    const previa = document.querySelector('[data-miniatura-ao-vivo] img');
    const legenda = document.querySelector('[data-miniatura-legenda]')?.innerText || '';
    const media = document.querySelector('.reactEasyCrop_Image');
    return {
      modal: modal?.dataset.cropModal || null,
      grade: area ? area.classList.contains('reactEasyCrop_CropAreaGrid') : null,
      tracejado: dep ? { estilo: dep.borderTopStyle, cor: dep.borderTopColor, largura: parseFloat(dep.width), altura: parseFloat(dep.height), areaLargura: area.clientWidth } : null,
      previa: !!previa, legenda, mediaTransform: media ? getComputedStyle(media).transform : null,
      chips: [...document.querySelectorAll('[data-crop-modal] button')].map((b) => b.innerText.trim()),
    };
  });
  const tracejadoOk = (t) => !!t && t.estilo === 'dashed' && t.cor === 'rgb(212, 160, 23)' && Math.abs(t.largura - t.areaLargura) <= 2 && Math.abs(t.altura - t.largura) <= 2;

  // ───────────────────────────────── A · o mini sorteio com os tempos novos ─────────────────────────────────
  await bloco('A', async () => {
    const { contexto, pagina } = await abrir(fx.novato, 'A-tempos', '/onboarding');
    await pagina.locator('.msq .maq').waitFor({ timeout: 30000 });
    const tempos = await pagina.evaluate(() => import('/src/utils/miniSorteio.js').then((m) => ({ ...m.TEMPOS, ciclo: m.CICLO_MS })));
    verificar('A · TEMPOS: giro inicial 400 ms (era 800), passo 750 (era 500), desaceleração 1500 (era 1000), pulso 800 e segura 2500 iguais; ciclo 10.650', tempos.giroMs === 400 && tempos.passoMs === 750 && tempos.desaceleraMs === 1500 && tempos.pulsoMs === 800 && tempos.seguraMs === 2500 && tempos.ciclo === 10650, JSON.stringify(tempos));
    // mede as três primeiras travas do PRÓXIMO ciclo. O ciclo novo começa quando data-ciclo muda (a fase já estava em 'girando'
    // desde o respiro, 600 ms antes — contar dali daria a 1ª trava 600 ms "atrasada").
    const medido = await pagina.evaluate(() => new Promise((res) => {
      const m = document.querySelector('.msq');
      const rolos = [...m.querySelectorAll('.rolo')];
      const cicloBase = m.dataset.ciclo;
      let girando = null;
      const stops = [];
      let ultimo = rolos.map((r) => r.classList.contains('stop'));
      const obs = new MutationObserver(() => {
        const t = performance.now();
        if (girando == null && m.dataset.ciclo !== cicloBase) girando = t;
        const agora = rolos.map((r) => r.classList.contains('stop'));
        agora.forEach((v, i) => { if (v && !ultimo[i] && girando != null) stops.push(Math.round(t - girando)); });
        ultimo = agora;
        if (stops.length >= 3) { obs.disconnect(); res({ ok: true, stops }); }
      });
      obs.observe(m, { attributes: true, subtree: true, attributeFilter: ['class', 'data-ciclo'] });
      setTimeout(() => { obs.disconnect(); res({ ok: false, stops }); }, 26000);
    }));
    const [s0, s1, s2] = medido.stops;
    verificar('A · na página: o 1º rolo trava ~1,9 s depois de girar (0,4 + 1,5) e os seguintes a cada ~0,75 s', medido.ok && s0 >= 1600 && s0 <= 2400 && s1 - s0 >= 600 && s1 - s0 <= 950 && s2 - s1 >= 600 && s2 - s1 <= 950, JSON.stringify(medido.stops));
    verificar('A · o .slow (desaceleração) dura 1,5 s no CSS', (await pagina.evaluate(() => { const r = document.querySelector('.msq .rolo'); r.classList.add('slow'); const d = getComputedStyle(r.querySelector('.strip')).animationDuration; r.classList.remove('slow'); return d; })) === '1.5s');
    await contexto.close();
  });

  // ───────────────────────────────── B + C · enquadramento único no onboarding e a foto sem espelho ─────────────────────────────────
  await bloco('BC', async () => {
    const { contexto, pagina, escritas } = await abrir(fx.novato, 'BC-onboarding', '/onboarding', { antes: rotasDoUpload });
    await pagina.getByRole('button', { name: /^Começar$/ }).tap({ timeout: 30000 });
    await pagina.getByText(/SUA FIGURINHA/).first().waitFor({ timeout: 15000 });
    await pagina.locator('input[type="file"]:not([capture])').setInputFiles({ name: 'selfie.png', mimeType: 'image/png', buffer: FOTO });
    await pagina.locator('[data-crop-modal="miniatura"]').waitFor({ timeout: 20000 });
    await pagina.locator('.reactEasyCrop_Image').waitFor({ timeout: 15000 });
    await espera(600);
    const c = await lerCropper(pagina);
    verificar('B · ao escolher a foto abre o enquadramento único: a moldura 2:3 com o quadrado tracejado DOURADO do topo, da largura do card (sem a grade do cropper)', c.modal === 'miniatura' && c.grade === false && tracejadoOk(c.tracejado), JSON.stringify({ grade: c.grade, tracejado: c.tracejado }));
    verificar('B · a miniatura ao vivo ao lado, na moldura real do app, com "É assim que você aparece no app"', c.previa && /É assim que você aparece no app/.test(c.legenda) && /tracejado/.test(c.legenda), norm(c.legenda).slice(0, 120));
    verificar('B · uma proporção só (2:3): nenhum seletor de proporção', !c.chips.some((t) => /^(1:1|4:3|16:9)$/.test(t)), c.chips.join('|'));
    const noCropper = await pagina.evaluate(marcaNaImagem, '.reactEasyCrop_Image');
    verificar('C · no cropper a marca está à ESQUERDA, como na foto (nenhum transform de espelho)', noCropper.lado === 'esquerda' && !/\(-/.test(noCropper.transform || ''), JSON.stringify(noCropper));
    await capturar(pagina, 'B1-enquadramento-unico');
    // aproxima: a miniatura ao vivo tem de acompanhar (a posição da prévia muda junto com o card)
    const antes = await pagina.locator('[data-miniatura-ao-vivo] img').evaluate((i) => i.style.left + '|' + i.style.top + '|' + i.style.width);
    await pagina.locator('input[type="range"]').fill('1.6');
    await espera(400);
    const depois = await pagina.locator('[data-miniatura-ao-vivo] img').evaluate((i) => i.style.left + '|' + i.style.top + '|' + i.style.width);
    verificar('B · aproximar muda o card E a miniatura de uma vez (a prévia acompanha o zoom)', antes !== depois, `${antes} → ${depois}`);
    // de volta ao zoom 1: o que sobe é a foto inteira (600×900), com a marca no canto — é ela que prova o espelho
    await pagina.locator('input[type="range"]').fill('1');
    await espera(400);
    await pagina.getByRole('button', { name: 'Confirmar' }).tap();
    await pagina.locator('[data-moldura-unica]').waitFor({ timeout: 30000 });
    await espera(800);
    const jpeg = await uploadDaPagina(pagina);
    const put = escritaDe(escritas, 'PUT', '/api/me/avatar/enquadro')[0];
    let recorte = null;
    try { recorte = JSON.parse(put?.corpo || 'null'); } catch { /* nada */ }
    verificar('B · "Confirmar" sobe a foto (POST /api/me/avatar, um JPEG 2:3) e grava o quadrado como miniatura: PUT /api/me/avatar/enquadro {x 0,5 · y 0,333 · escala 1}', !!jpeg && recorte && recorte.x === 0.5 && recorte.y === 0.333 && recorte.escala === 1, JSON.stringify({ jpeg: jpeg?.length, recorte }));
    const m2 = await pagina.evaluate(() => {
      const mold = document.querySelector('.moldura-unica');
      const dep = mold ? getComputedStyle(mold, '::after') : null;
      const r = mold?.getBoundingClientRect();
      return { estilo: dep?.borderTopStyle, cor: dep?.borderTopColor, proporcao: r ? Math.round((r.height / r.width) * 100) / 100 : null, previa: !!document.querySelector('[data-moldura-unica] [data-miniatura-ao-vivo] img'), texto: document.querySelector('[data-moldura-unica]')?.innerText || '' };
    });
    verificar('B · a página 2 mostra o card 2:3 com o tracejado por cima e a miniatura ao lado ("É assim que você aparece no app")', m2.estilo === 'dashed' && m2.cor === 'rgb(212, 160, 23)' && m2.proporcao === 1.5 && m2.previa && /É assim que você aparece no app/.test(m2.texto), JSON.stringify(m2));
    await capturar(pagina, 'B2-pagina-2-com-tracejado');
    const enviado = jpeg ? await ladoDaMarca(jpeg) : { lado: 'sem-jpeg' };
    const naMoldura = await pagina.evaluate(marcaNaImagem, '.moldura-unica img');
    const naPrevia = await pagina.evaluate(marcaNaImagem, '[data-moldura-unica] [data-miniatura-ao-vivo] img');
    const semEspelho = await pagina.evaluate(() => [...document.querySelectorAll('img')].every((i) => !/\(-/.test(getComputedStyle(i).transform)));
    verificar('C · a foto que o app MANDOU (o JPEG do FormData, decodificado aqui) é 2:3 e tem a marca à esquerda: nada foi espelhado no recorte', enviado.lado === 'esquerda' && enviado.largura > 0 && Math.abs(enviado.altura / enviado.largura - 1.5) < 0.02, JSON.stringify(enviado));
    verificar('C · na moldura 2:3 e na miniatura (o JPEG que subiu, servido de volta) a marca continua à esquerda, e nenhuma <img> da página leva transform negativo', naMoldura.lado === 'esquerda' && naPrevia.lado === 'esquerda' && semEspelho && naMoldura.naturalWidth === enviado.largura && servido.jpeg, JSON.stringify({ naMoldura, naPrevia, semEspelho, servido }));
    await contexto.close();
  });

  // ───────────────────────────────── D · Figurinha: "Trocar foto" é o mesmo enquadramento; "Enquadrar" saiu ─────────────────────────────────
  await bloco('D', async () => {
    const { contexto, pagina, escritas } = await abrir(fx.minha, 'D-figurinha', '/figurinha', { antes: rotasDoUpload });
    await pagina.getByRole('button', { name: /Compartilhar/ }).first().waitFor({ timeout: 40000 });
    verificar('D · a Figurinha não tem mais o botão "Enquadrar" (o editor da miniatura à parte saiu)', (await pagina.getByRole('button', { name: /^Enquadrar$/ }).count()) === 0 && !/Sua miniatura no app/.test(await texto(pagina)));
    await pagina.getByRole('button', { name: /Trocar foto/ }).first().tap({ timeout: 15000 });
    await pagina.getByRole('button', { name: /Escolher outra foto/ }).waitFor({ timeout: 15000 });
    await pagina.locator('input[type="file"]').first().setInputFiles({ name: 'selfie.png', mimeType: 'image/png', buffer: FOTO });
    await pagina.locator('[data-crop-modal="miniatura"]').waitFor({ timeout: 20000 });
    await pagina.locator('.reactEasyCrop_Image').waitFor({ timeout: 15000 });
    await espera(500);
    const c = await lerCropper(pagina);
    verificar('D · "Escolher outra foto" abre o MESMO enquadramento único (tracejado dourado + miniatura ao vivo)', c.modal === 'miniatura' && tracejadoOk(c.tracejado) && c.previa && /É assim que você aparece no app/.test(c.legenda), JSON.stringify(c.tracejado));
    await capturar(pagina, 'D1-figurinha-trocar-foto');
    await pagina.getByRole('button', { name: 'Confirmar' }).tap();
    await espera(1500);
    const jpeg = await uploadDaPagina(pagina);
    const put = escritaDe(escritas, 'PUT', '/api/me/avatar/enquadro')[0];
    verificar('D · depois de subir, o quadrado tracejado é gravado como miniatura (PUT /api/me/avatar/enquadro)', !!jpeg && /"x":0\.5/.test(put?.corpo || '') && /"escala":1/.test(put?.corpo || ''), put?.corpo || '(sem PUT)');
    await contexto.close();
  });

  // ───────────────────────────────── E · a aura no dobro do tamanho, −25% de opacidade ─────────────────────────────────
  await bloco('E', async () => {
    const { contexto, pagina } = await abrir(fx.minha, 'E-aura', '/login');
    const r = await pagina.evaluate(async () => {
      const m = await import('/src/utils/figurinhaCanvas.js');
      // 1) o fundo sozinho, pelo desenho real (o mesmo que o card usa)
      const c = document.createElement('canvas'); c.width = 400; c.height = 600;
      const x = c.getContext('2d');
      m.desenharFundoAura(x, 400, 600, false);
      const px = (fx, fy) => { const d = x.getImageData(Math.round(fx * 400), Math.round(fy * 600), 1, 1).data; return [d[0], d[1], d[2]]; };
      // 2) o card inteiro (um avatar transparente de verdade: 1×1 com alpha 0)
      const vazio = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      const blob = await m.gerarFigurinhaCanvas({ jogador: { id: 'aura', nome_jogador: 'AURA' }, fotoOverride: vazio, fundo: 'aura', corFrame: 'dourado', larguraExibida: null });
      const bmp = await createImageBitmap(blob);
      const cc = document.createElement('canvas'); cc.width = bmp.width; cc.height = bmp.height;
      const xx = cc.getContext('2d'); xx.drawImage(bmp, 0, 0);
      const pxCard = (fx, fy) => { const d = xx.getImageData(Math.round(fx * cc.width), Math.round(fy * cc.height), 1, 1).data; return [d[0], d[1], d[2]]; };
      return { escala: m.AURA_ESCALA, opacidade: m.AURA_OPACIDADE, centro: px(0.5, 0.44), borda: px(0.05, 0.44), topo: px(0.5, 0.05), cardBorda: pxCard(0.05, 0.44), cardTopo: pxCard(0.5, 0.10) };
    });
    const dourado = ([R, , B]) => R >= 40 && R - B >= 25;
    verificar('E · AURA_ESCALA = 2 e AURA_OPACIDADE = 0,75 (dobro do tamanho, −25% de opacidade)', r.escala === 2 && r.opacidade === 0.75, JSON.stringify({ escala: r.escala, opacidade: r.opacidade }));
    verificar('E · a aura chega às bordas do card (a 5% da esquerda e a 5% do topo o fundo é dourado; antes a elipse acabava ali, R ≈ 20)', dourado(r.borda) && dourado(r.topo), JSON.stringify({ borda: r.borda, topo: r.topo }));
    verificar('E · o centro está menos cheio (R entre 110 e 160; com a opacidade de antes dava ~180)', r.centro[0] >= 110 && r.centro[0] <= 160 && r.centro[0] - r.centro[2] >= 60, JSON.stringify({ centro: r.centro }));
    verificar('E · no card inteiro (pipeline real) a borda lateral e o topo saem dourados', dourado(r.cardBorda) && dourado(r.cardTopo), JSON.stringify({ cardBorda: r.cardBorda, cardTopo: r.cardTopo }));
    await contexto.close();
  });

  // ───────────────────────────────── F · som: o 4º efeito e o destrave no gesto ─────────────────────────────────
  await bloco('F', async () => {
    const { contexto, pagina } = await abrir(fx.minha, 'F-som', '/login', {
      inicial: () => {
        window.__audios = [];
        const A = window.Audio;
        window.Audio = function (...a) { const el = new A(...a); window.__audios.push(el); return el; };
      },
    });
    const NOMES = ['tique-1', 'tique-2', 'tique-3', 'clac', 'jackpot', 'alavanca'];
    const som = await pagina.evaluate(async (nomes) => {
      const m = await import('/src/components/somSorteio.js');
      const S = m.default;
      const antesLigado = S.ligado, antesEscolhido = S.escolhido;
      S.prepararNoGesto();
      const rodas = window.__audios.map((a) => new URL(a.src).pathname);
      const arquivos = {};
      for (const nome of nomes) {
        const r = await fetch(`/sons/${nome}.mp3`, { cache: 'no-store' });
        const buf = await r.arrayBuffer();
        const sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map((b) => b.toString(16).padStart(2, '0')).join('');
        const dur = await new Promise((res) => { const a = new Audio(`/sons/${nome}.mp3`); a.addEventListener('loadedmetadata', () => res(a.duration), { once: true }); a.addEventListener('error', () => res(-1), { once: true }); setTimeout(() => res(-2), 4000); });
        arquivos[nome] = { status: r.status, tipo: r.headers.get('content-type'), bytes: buf.byteLength, sha, dur: Math.round(dur * 1000) / 1000 };
      }
      return { antesLigado, antesEscolhido, depoisLigado: S.ligado, depoisEscolhido: S.escolhido, rodas, arquivos, puxar: typeof S.puxar === 'function' };
    }, NOMES);
    verificar('F · prepararNoGesto abre as rodas de todos os efeitos de uma vez (3 tiques + 3 clacs + jackpot + alavanca = 8 <audio>) e não liga nem grava o som de ninguém', som.rodas.length === 8 && som.rodas.filter((p) => /alavanca\.mp3$/.test(p)).length === 1 && som.rodas.filter((p) => /tique-/.test(p)).length === 3 && som.depoisLigado === som.antesLigado && som.depoisEscolhido === som.antesEscolhido, JSON.stringify(som.rodas));
    const a = som.arquivos.alavanca;
    verificar('F · o 4º efeito existe no site: /sons/alavanca.mp3 200, audio/mpeg, ≤ 0,8 s como o próprio WebKit mede, ≤ 40 KB; SomSorteio.puxar existe', a.status === 200 && /mpeg/.test(a.tipo || '') && a.dur > 0.5 && a.dur <= 0.8 && a.bytes <= 40960 && som.puxar, JSON.stringify(a));
    // os bytes que o site serve são os de public/sons (o que o app nativo embarca): SHA-256 igual nos 6; os 5 de sempre com o MD5 de 16A
    const disco = Object.fromEntries(NOMES.map((n) => { const b = readFileSync(path.join(RAIZ, 'public', 'sons', `${n}.mp3`)); return [n, { sha: createHash('sha256').update(b).digest('hex'), md5: createHash('md5').update(b).digest('hex'), bytes: b.length }]; }));
    const iguais = NOMES.filter((n) => som.arquivos[n].status === 200 && som.arquivos[n].sha === disco[n].sha);
    const selados = Object.entries(ASSINATURAS).filter(([n, md5]) => disco[n].md5 === md5);
    verificar('F · o site serve BYTE A BYTE os 6 arquivos de public/sons (os mesmos que o app nativo embarca) — SHA-256 igual', iguais.length === 6, `iguais: ${iguais.join(', ')}`);
    verificar('F · os 5 efeitos de sempre (tique ×3, clac, jackpot) têm o MD5 selado de 16A: nada mudou neles', selados.length === 5, JSON.stringify(Object.fromEntries(NOMES.map((n) => [n, disco[n].bytes]))));
    await contexto.close();
  });

  verificar('sem erro de JS nas páginas', erros.length === 0, erros.join(' | '));
  return { verificacoes, capturas, erros, pasta };
}
