// Prova no navegador da Rodada 30L, parte 2 (acabamentos, pênaltis, o campeonato no Início e o post do campeão na Resenha): o que só um Chromium de
// verdade confirma, com as MESMAS fontes e o MESMO CSS do app, a 390 e a 360 px.
//   · antes do sorteio: a linha "20 confirmados → 4 times de 5" muda com o número marcado e diz a regra real (reservas, máximo de 4 times);
//     num jogo já sorteado o número usado fica marcado;
//   · do sorteio ao campeonato: o nome vem preenchido ("Campeonato Domingueira FC") e é editável; a data só aparece como subtítulo;
//     a tabela nasce zerada, sem marca de líder nem de "vai para a final", com as colunas P J V E D GP:GC SG;
//   · os 6 jogos pela tela: ao salvar o último, o aviso "Final definida: …" e a rolagem suave até a final (sem rolar se a pessoa tocar em outra coisa);
//   · a final empatada pergunta quem venceu nos pênaltis (nada é gravado antes), mostra "2 × 2 (pên.: Time Ouro)" e o "Temos campeão!" sobe para o topo
//     sem cobrir os botões de compartilhar; o mata-mata e a página pública mostram os pênaltis do mesmo jeito;
//   · o Início de todo membro: o card do campeonato em andamento, com a final definida, com o campeão ("Você é campeão!" só para o time dele) e sem card
//     depois de 7 dias; o toque abre o campeonato;
//   · a Resenha: o post do campeão, com o time, o pódio, a final (e os pênaltis), reações e comentários; tocar abre o campeonato.
// O motor é de mentira (/api/** respondido por page.route), mas a regra é a DE VERDADE: o mesmo sorteio e o mesmo backend/utils/campeonatoStore.js
// (_mundo-do-dia-18.mjs). Nada sai para a rede.
import { readFileSync } from 'node:fs';
import { medir } from '../medir-estreito.mjs';
import { carregarStore, criarMotor, rotear } from './_campeonato-motor.mjs';
import { criarMundo, ID_DO_JOGO, SLUG } from './_mundo-do-dia-18.mjs';

const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const sessaoDe = (euId) => JSON.stringify({
  access_token: 'prova', refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
  user: { id: euId, aud: 'authenticated', email: 'prova@futty.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
});

export const nome = 'Rodada 30L · parte 2 (nome, colunas, final definida, pênaltis, card no Início, post do campeão na Resenha)';

const captura = (arquivo) => new URL(`../capturas/${arquivo}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const DEFEITOS_QUE_REPROVAM = ['rola-para-o-lado', 'passa-da-janela', 'contêiner-corta', 'numero-com-ponto'];
const DIA = 86400000;

// Os 6 jogos da fase de grupos, na ordem em que o roteiro os lança: um empate (Prata × Bronze, Ouro × Prata) e a vaga da final decidida só no último.
const JOGOS = [
  ['Time Ouro', 'Time Roxo', 2, 0],
  ['Time Prata', 'Time Bronze', 1, 1],
  ['Time Ouro', 'Time Prata', 1, 1],
  ['Time Roxo', 'Time Bronze', 2, 1],
  ['Time Ouro', 'Time Bronze', 3, 1],
  ['Time Prata', 'Time Roxo', 2, 0],
];

async function abrirCena(navegador, base, motor, caminho, { largura = 390, altura = 900, euId = 'U1' } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: largura, height: altura }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  await ctx.addInitScript(({ chave, sessao }) => {
    try { localStorage.setItem('futty_cookies', 'aceite'); localStorage.setItem(chave, sessao); } catch { /* sem storage */ }
  }, { chave: `sb-${REF}-auth-token`, sessao: sessaoDe(euId) });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.route('**/*', rotear(motor, base));
  await page.goto(`${base}/scripts/provas/rodada-30l2.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-casa]').waitFor({ timeout: 25000 });
  await page.evaluate((c) => { window.history.pushState({}, '', c); window.dispatchEvent(new PopStateEvent('popstate')); }, caminho);
  return { page, ctx, erros };
}

const semErrosReais = (erros) => erros.filter((e) => !/favicon|Failed to load resource/.test(e));
const texto = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const defeitos = async (page, largura) => (await page.evaluate(medir, largura)).filter((a) => DEFEITOS_QUE_REPROVAM.includes(a.tipo));
const resumo = (lista) => lista.map((d) => `${d.tipo}: ${d.detalhe}`).join(' | ');
// A página entra com um fade (.page-reveal): a foto espera ele acabar, senão sai esmaecida.
const foto = async (page, arquivo, opcoes = { fullPage: true }) => { await page.waitForTimeout(900); return page.screenshot({ path: captura(arquivo), ...opcoes }); };
const lerTabela = (page) => page.locator('.camp-tab__r').evaluateAll((linhas) => linhas.map((l) => ({
  pos: Number(l.querySelector('.pos').textContent), nome: l.querySelector('.nm span:nth-child(2)').textContent.trim(), pts: Number(l.querySelector('.p').textContent),
  marcas: l.className.split(' ').filter((c) => /--(lider|final|empate)$/.test(c)).map((c) => c.split('--')[1]),
})));

/** Um mundo do dia 18 já sorteado (4 times de 5), com o campeonato "Todos contra todos + final" criado pela MESMA rota da tela e `n` jogos lançados. */
function mundoComCampeonato(store, base, { n = 0, formato = 'pontos_final', papel = 'admin', euId = 'U1' } = {}) {
  // Quem monta o cenário é o admin (só ele sorteia e cria); depois o mundo passa a ser visto por quem a prova quer.
  const mundo = criarMundo({ base });
  mundo.responder(`/api/games/${ID_DO_JOGO}/sortear`, 'POST', { jogadoresPorTime: 5 });
  const criado = mundo.responder(`/api/equipas/${SLUG}/campeonatos/de-sorteio`, 'POST', { game_id: ID_DO_JOGO, formato, nome: 'Copa da Domingueira' });
  const camp = mundo.campeonatos.camps.get(criado.json.campeonato.id);
  JOGOS.slice(0, n).forEach(([x, y, gx, gy]) => mundo.campeonatos.jogar(camp, x, y, gx, gy));
  mundo.verComo(euId, papel);
  return { mundo, camp, store };
}

/** Lança X × Y pela tela (digita os gols no cartão do jogo e toca em Salvar). */
async function lancarPelaTela(page, x, y, gx, gy) {
  const jogo = page.locator('[data-jogo]', { hasText: x }).filter({ hasText: y });
  const corpo = (await jogo.innerText()).replace(/\s+/g, ' ');
  const xEhA = corpo.indexOf(x) < corpo.indexOf(y);
  await jogo.locator('input').nth(0).fill(String(xEhA ? gx : gy));
  await jogo.locator('input').nth(1).fill(String(xEhA ? gy : gx));
  await jogo.getByRole('button', { name: 'Salvar' }).click();
  await jogo.locator('[data-corrigir]').waitFor({ timeout: 10000 });
}

/** Os retângulos do aviso do topo e dos botões de compartilhar do campeão, com a linha de compartilhar no meio da tela (onde o aviso do meio os cobria). */
const caixasDoAvisoEDosBotoes = (page) => page.evaluate(() => {
  const linha = document.querySelector('.camp-cel__row');
  linha?.scrollIntoView({ block: 'center' });
  const aviso = document.querySelector('.futty-toast');
  const r = (e) => { const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right }; };
  return { aviso: aviso ? r(aviso) : null, topo: !!aviso?.classList.contains('futty-toast--topo'), botoes: [...document.querySelectorAll('.camp-cel__row button')].map(r), altura: window.innerHeight };
});
const seCruzam = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

export async function rodar({ navegador, base, t }) {
  const store = carregarStore();
  if (!store) {
    t('o backend não está ao lado (FUTTY-V2/backend): a prova do campeonato foi pulada', true);
    return;
  }

  for (const largura of [390, 360]) {
    // ─── Antes do sorteio: a linha da conta; depois dele: o número usado fica marcado ───────────────────────────────────────
    {
      const mundo = criarMundo({ base });
      const { page, ctx, erros } = await abrirCena(navegador, base, mundo, `/time/${SLUG}/jogo/${ID_DO_JOGO}`, { largura });
      const linha = page.locator('[data-resumo-do-sorteio]');
      await linha.waitFor({ timeout: 25000 });
      const marcados = () => page.locator('.chips-row button[aria-pressed="true"]').allInnerTexts();
      t(`${largura}px · antes do sorteio: "Jogadores por time" abre no 5 e a linha diz "20 confirmados → 4 times de 5"`, (await marcados()).join() === '5' && (await linha.innerText()).trim() === '20 confirmados → 4 times de 5', `${await marcados()} | ${await linha.innerText()}`);
      await page.locator('.chips-row button', { hasText: /^6$/ }).click();
      t(`${largura}px · com 6: "20 confirmados → 3 times de 6, 2 ficam de reserva" (o resto vai para o banco, não para um time maior)`, (await linha.innerText()).trim() === '20 confirmados → 3 times de 6, 2 ficam de reserva', await linha.innerText());
      await page.locator('.chips-row button', { hasText: /^8$/ }).click();
      t(`${largura}px · com 8: "20 confirmados → 2 times de 8, 4 ficam de reserva"`, (await linha.innerText()).trim() === '20 confirmados → 2 times de 8, 4 ficam de reserva', await linha.innerText());
      await page.locator('.chips-row button', { hasText: /^4$/ }).click();
      const quatro = (await linha.innerText()).trim();
      t(`${largura}px · com 4 por time dariam 5 times e o sorteio só faz 4: a linha diz isso e o que ajustar`, /dariam 5 times, e o máximo é 4: aumente os jogadores por time/.test(quatro), quatro);
      await page.locator('.chips-row button', { hasText: /^5$/ }).click();
      t(`${largura}px · a tela de antes do sorteio cabe, sem rolar para o lado nem cortar`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
      await linha.scrollIntoViewIfNeeded();
      await foto(page, `30l2-conta-do-sorteio-${largura}.png`);
      t(`${largura}px · sem erro de script (conta do sorteio)`, semErrosReais(erros).length === 0, semErrosReais(erros).join(' | '));
      await ctx.close();

      // Jogo já sorteado com 6 por time: o 6 fica marcado (e não o 5 padrão), e a linha descreve o sorteio que saiu.
      const sorteado = criarMundo({ base });
      sorteado.responder(`/api/games/${ID_DO_JOGO}/sortear`, 'POST', { jogadoresPorTime: 6 });
      const cena = await abrirCena(navegador, base, sorteado, `/time/${SLUG}/jogo/${ID_DO_JOGO}`, { largura });
      await cena.page.locator('[data-resumo-do-sorteio]').waitFor({ timeout: 25000 });
      const marcadosDepois = await cena.page.locator('.chips-row button[aria-pressed="true"]').allInnerTexts();
      t(`${largura}px · jogo já sorteado com 6 por time: o 6 fica marcado`, marcadosDepois.join() === '6' && (await cena.page.locator('[data-resumo-do-sorteio]').innerText()).trim() === '20 confirmados → 3 times de 6, 2 ficam de reserva', `${marcadosDepois} | ${await cena.page.locator('[data-resumo-do-sorteio]').innerText()}`);
      await cena.ctx.close();
    }

    // ─── Do sorteio ao campeonato, pela tela: o nome, o subtítulo, a tabela zerada e as colunas ─────────────────────────────────
    {
      const mundo = criarMundo({ base });
      mundo.responder(`/api/games/${ID_DO_JOGO}/sortear`, 'POST', { jogadoresPorTime: 5 });
      const { page, ctx, erros } = await abrirCena(navegador, base, mundo, `/time/${SLUG}/jogo/${ID_DO_JOGO}`, { largura });
      await page.getByRole('button', { name: 'Criar campeonato com estes times' }).waitFor({ timeout: 25000 });
      await page.getByRole('button', { name: 'Criar campeonato com estes times' }).click();
      const campoNome = page.locator('[data-nome-do-campeonato]');
      await campoNome.waitFor();
      t(`${largura}px · o nome vem preenchido com "Campeonato Domingueira FC"`, (await campoNome.inputValue()) === 'Campeonato Domingueira FC', await campoNome.inputValue());
      t(`${largura}px · e a data do jogo não entra no nome`, !/\d{1,2} de/.test(await campoNome.inputValue()));
      await campoNome.fill('Copa da Domingueira');
      await page.locator('[data-formato="pontos_final"]').click();
      t(`${largura}px · o nome editável e o seletor de formatos cabem, sem rolar para o lado nem cortar`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
      await page.locator('[data-campeonato-do-sorteio]').scrollIntoViewIfNeeded();
      await foto(page, `30l2-nome-do-campeonato-${largura}.png`);
      await page.locator('[data-criar-campeonato]').click();
      await page.locator('.camp-final').waitFor({ timeout: 25000 });
      const corpoDoPedido = mundo.pedidos.find((p) => p.pathname.endsWith('/de-sorteio'))?.corpo;
      t(`${largura}px · "Criar campeonato" manda o nome que a pessoa escreveu`, corpoDoPedido?.nome === 'Copa da Domingueira' && corpoDoPedido?.formato === 'pontos_final', JSON.stringify(corpoDoPedido));
      t(`${largura}px · o título da página é o nome escolhido`, (await page.locator('.camp-title').innerText()).trim() === 'Copa da Domingueira');
      const sub = (await page.locator('[data-subtitulo-do-sorteio]').innerText()).trim();
      t(`${largura}px · a data do jogo aparece só como subtítulo ("Do sorteio de …18…")`, /^Do sorteio de .*18/.test(sub), sub);

      let tabela = await lerTabela(page);
      t(`${largura}px · tabela zerada: 4 times com 0 ponto e NENHUMA marca (nem líder, nem "vai para a final")`, tabela.length === 4 && tabela.every((l) => l.pts === 0 && l.marcas.length === 0), JSON.stringify(tabela));
      const cabecalho = (await page.locator('.camp-tab__hd span').allInnerTexts()).map((s) => s.trim());
      t(`${largura}px · colunas da tabela: TIME P J V E D GP:GC SG (a derrota logo depois do empate)`, cabecalho.filter(Boolean).join(' ') === 'TIME P J V E D GP:GC SG', cabecalho.join('|'));
      const celulas = await page.locator('.camp-tab__r').first().evaluate((l) => l.children.length);
      t(`${largura}px · cada linha da tabela tem uma célula por coluna (9)`, celulas === cabecalho.length && celulas === 9, `${celulas} células, ${cabecalho.length} colunas`);
      t(`${largura}px · a página recém-criada cabe, sem rolar para o lado nem cortar`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
      await foto(page, `30l2-tabela-zerada-${largura}.png`);

      // A marca de líder só chega com o primeiro jogo lançado (e a das duas vagas da final junto com ela).
      const [x, y, gx, gy] = JOGOS[0];
      await lancarPelaTela(page, x, y, gx, gy);
      tabela = await lerTabela(page);
      t(`${largura}px · depois do 1º jogo o Ouro lidera (3 pontos), mas nada está garantido: a tabela continua sem marca (a prova da 30M cobre a regra inteira)`, tabela[0].nome === 'Time Ouro' && tabela[0].pts === 3 && tabela.every((l) => l.marcas.length === 0), JSON.stringify(tabela));
      t(`${largura}px · sem erro de script (do sorteio ao campeonato)`, semErrosReais(erros).length === 0, semErrosReais(erros).join(' | '));
      await ctx.close();
    }

    // ─── O último jogo da fase de grupos: "Final definida" + a rolagem até a final (e a pessoa que mexe antes) ────────────────────
    for (const pessoaMexe of [false, true]) {
      const { mundo, camp } = mundoComCampeonato(store, base, { n: 5 });
      // Janela mais baixa (700): a final precisa estar fora da vista para a rolagem ter o que provar.
      const { page, ctx, erros } = await abrirCena(navegador, base, mundo, `/time/${SLUG}/campeonato/${camp.id}`, { largura, altura: 700 });
      await page.locator('.camp-final[data-final="vaga"]').waitFor({ timeout: 25000 });
      await page.waitForTimeout(900);
      const antes = await page.locator('.camp-final').evaluate((e) => ({ top: e.getBoundingClientRect().top, altura: window.innerHeight }));
      t(`${largura}px · ${pessoaMexe ? 'pessoa mexe' : 'rolagem'}: antes do último jogo a final está abaixo da dobra (o teste da rolagem vale)`, antes.top > antes.altura, JSON.stringify(antes));
      const [x, y, gx, gy] = JOGOS[5];
      const jogo = page.locator('[data-jogo]', { hasText: x }).filter({ hasText: y });
      const corpo = (await jogo.innerText()).replace(/\s+/g, ' ');
      const xEhA = corpo.indexOf(x) < corpo.indexOf(y);
      await jogo.locator('input').nth(0).fill(String(xEhA ? gx : gy));
      await jogo.locator('input').nth(1).fill(String(xEhA ? gy : gx));
      await jogo.getByRole('button', { name: 'Salvar' }).click();
      await page.locator('[data-aviso-da-final]').waitFor({ timeout: 10000 });
      const aviso = (await page.locator('[data-aviso-da-final]').innerText()).replace(/\s+/g, ' ');
      t(`${largura}px · ${pessoaMexe ? 'pessoa mexe' : 'rolagem'}: ao salvar o último jogo o aviso diz "Final definida: Time Ouro × Time Prata"`, /Final definida: Time Ouro × Time Prata/.test(aviso), aviso);
      // O quadro "Final definida" fica no alto da página; quem acabou de salvar está na lista de jogos, lá embaixo: o aviso tem de estar na janela dele.
      const avisoNaJanela = await page.locator('.futty-toast--topo', { hasText: 'Final definida: Time Ouro × Time Prata' }).evaluateAll((els) => els.map((e) => { const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, altura: window.innerHeight }; }));
      t(`${largura}px · ${pessoaMexe ? 'pessoa mexe' : 'rolagem'}: o mesmo aviso aparece também no topo da janela, onde a pessoa está olhando`, avisoNaJanela.length === 1 && avisoNaJanela[0].top >= 0 && avisoNaJanela[0].bottom <= avisoNaJanela[0].altura, JSON.stringify(avisoNaJanela));
      const rolagemNoAviso = await page.evaluate(() => window.scrollY);
      if (pessoaMexe) {
        // A pessoa tocou em outra coisa nesse meio tempo: a tela não toma a rolagem dela.
        await page.waitForTimeout(150);
        await page.evaluate(() => window.dispatchEvent(new Event('pointerdown')));
      }
      await page.waitForTimeout(2200);
      const depois = await page.locator('.camp-final').evaluate((e) => ({ top: e.getBoundingClientRect().top, bottom: e.getBoundingClientRect().bottom, altura: window.innerHeight, rolagem: window.scrollY }));
      if (pessoaMexe) {
        t(`${largura}px · pessoa mexe: se ela tocou em outra coisa, a tela NÃO rola sozinha até a final`, depois.rolagem === rolagemNoAviso, `rolagem ${rolagemNoAviso} → ${depois.rolagem}`);
      } else {
        t(`${largura}px · rolagem: a tela rolou até a final, que agora está inteira na janela`, depois.rolagem > rolagemNoAviso && depois.top >= 0 && depois.bottom <= depois.altura, JSON.stringify({ rolagemNoAviso, ...depois }));
        t(`${largura}px · rolagem: o aviso fica na página até a pessoa dispensar (não some sozinho)`, (await page.locator('[data-aviso-da-final]').count()) === 1);
        const tabela = await lerTabela(page);
        t(`${largura}px · a tabela final da fase 1: Ouro 7, Prata 5, Roxo 3, Bronze 1`, tabela.map((l) => `${l.nome}:${l.pts}`).join() === 'Time Ouro:7,Time Prata:5,Time Roxo:3,Time Bronze:1', JSON.stringify(tabela));
        await foto(page, `30l2-final-definida-${largura}.png`, { fullPage: false });
        await page.evaluate(() => window.scrollTo(0, 0));
        await foto(page, `30l2-aviso-final-definida-${largura}.png`, { fullPage: false });
      }
      t(`${largura}px · sem erro de script (final definida, ${pessoaMexe ? 'pessoa mexe' : 'rolagem'})`, semErrosReais(erros).length === 0, semErrosReais(erros).join(' | '));
      await ctx.close();
    }

    // ─── A final empatada: pênaltis, "Temos campeão!" no topo e o "(pên.: …)" em todas as telas ─────────────────────────────────
    {
      const { mundo, camp } = mundoComCampeonato(store, base, { n: 6 });
      const { page, ctx, erros } = await abrirCena(navegador, base, mundo, `/time/${SLUG}/campeonato/${camp.id}`, { largura });
      await page.locator('.camp-final[data-final="aberta"]').waitFor({ timeout: 25000 });
      const editor = page.locator('.camp-final [data-editor-de-resultado]');
      await editor.locator('input').nth(0).fill('2');
      await editor.locator('input').nth(1).fill('2');
      await editor.getByRole('button', { name: 'Salvar' }).click();
      await page.locator('[data-pergunta-penaltis]').waitFor({ timeout: 10000 });
      const pergunta = (await page.locator('[data-pergunta-penaltis]').innerText()).replace(/\s+/g, ' ');
      t(`${largura}px · final empatada: a tela pergunta "Empatou. Quem venceu nos pênaltis?" com um botão por time`, pergunta.includes('Empatou. Quem venceu nos pênaltis?') && (await page.locator('[data-penaltis]').count()) === 2 && /Time Ouro/.test(pergunta) && /Time Prata/.test(pergunta), pergunta);
      t(`${largura}px · e nada é gravado enquanto a pessoa não responde`, camp.estado === 'em_curso' && !mundo.pedidos.some((p) => p.pathname.endsWith('/resultado') && p.corpo?.placar_a === 2 && p.corpo?.placar_b === 2));
      t(`${largura}px · a pergunta dos pênaltis cabe, sem rolar para o lado nem cortar`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
      await foto(page, `30l2-penaltis-pergunta-${largura}.png`, { fullPage: false });
      const ouro = camp.times.find((x) => x.nome === 'Time Ouro');
      await page.locator(`[data-penaltis="${ouro.id}"]`).click();
      await page.locator('.futty-toast--topo').waitFor({ timeout: 10000 });
      const caixas = await caixasDoAvisoEDosBotoes(page);
      t(`${largura}px · "Temos campeão!" aparece no TOPO da tela`, caixas.topo && caixas.aviso && caixas.aviso.top < caixas.altura / 3, JSON.stringify(caixas.aviso));
      t(`${largura}px · e não cobre os botões de compartilhar (Link, 9:16 campeão, 9:16 pódio), nem com eles no meio da tela`, caixas.botoes.length === 3 && caixas.botoes.every((b) => !seCruzam(b, caixas.aviso)), JSON.stringify(caixas));
      const pedido = mundo.pedidos.filter((p) => p.pathname.endsWith('/resultado')).pop()?.corpo;
      t(`${largura}px · a final grava o placar como digitado (2 × 2) e o vencedor dos pênaltis (Ouro)`, pedido?.placar_a === 2 && pedido?.placar_b === 2 && pedido?.penaltis_vencedor_id === ouro.id, JSON.stringify(pedido));
      await page.locator('[data-penaltis-da-final]').waitFor();
      await page.evaluate(() => window.scrollTo(0, 0));
      t(`${largura}px · a final mostra "2 × 2" e "(pên.: Time Ouro)"`, /2 × 2/.test(await page.locator('.camp-final').innerText()) && (await page.locator('[data-penaltis-da-final]').innerText()).trim() === '(pên.: Time Ouro)', await page.locator('.camp-final').innerText());
      const podio = await page.locator('.camp-podio__col').evaluateAll((cols) => cols.map((c) => `${c.querySelector('.camp-podio__crest').innerText.replace(/\s+/g, ' ').trim()} · ${c.querySelector('.camp-podio__step').textContent.trim()}`));
      t(`${largura}px · o pódio segue o vencedor dos pênaltis: 1º Ouro, 2º Prata, 3º Roxo`, podio.join(' | ') === 'Time Prata · 2º | Time Ouro · 1º | Time Roxo · 3º', podio.join(' | '));
      t(`${largura}px · o campeão terminado cabe, sem rolar para o lado nem cortar`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
      await foto(page, `30l2-campeao-penaltis-${largura}.png`);
      await page.locator('.camp-final').scrollIntoViewIfNeeded();
      await foto(page, `30l2-final-penaltis-${largura}.png`, { fullPage: false });
      t(`${largura}px · sem erro de script (pênaltis)`, semErrosReais(erros).length === 0, semErrosReais(erros).join(' | '));
      await ctx.close();

      // A página pública: o mesmo texto, sem botões.
      const publica = await abrirCena(navegador, base, mundo, `/p/campeonato/${SLUG}/${camp.id}`, { largura });
      await publica.page.locator('.camp-final').waitFor({ timeout: 25000 });
      t(`${largura}px · página pública: "2 × 2" e "(pên.: Time Ouro)" na final`, (await publica.page.locator('.camp-final').innerText()).includes('2 × 2') && (await publica.page.locator('[data-penaltis-da-final]').innerText()).trim() === '(pên.: Time Ouro)');
      const cabecalhoPublico = (await publica.page.locator('.camp-tab__hd span').allInnerTexts()).map((s) => s.trim()).filter(Boolean);
      t(`${largura}px · página pública: as mesmas colunas P J V E D GP:GC SG`, cabecalhoPublico.join(' ') === 'TIME P J V E D GP:GC SG', cabecalhoPublico.join(' '));
      t(`${largura}px · página pública: sem campos de placar e sem "Corrigir"`, (await publica.page.locator('[data-editor-de-resultado]').count()) === 0 && (await publica.page.locator('[data-corrigir-final]').count()) === 0);
      t(`${largura}px · página pública: cabe, sem rolar para o lado nem cortar`, (await defeitos(publica.page, largura)).length === 0, resumo(await defeitos(publica.page, largura)));
      await publica.page.locator('.camp-final').scrollIntoViewIfNeeded();
      await foto(publica.page, `30l2-publica-penaltis-${largura}.png`, { fullPage: false });
      await publica.ctx.close();

      // Corrigir a final depois do campeão: a pergunta volta (e o placar deixa de empatar, sem pênaltis).
      const correcao = await abrirCena(navegador, base, mundo, `/time/${SLUG}/campeonato/${camp.id}`, { largura });
      await correcao.page.locator('[data-corrigir-final]').waitFor({ timeout: 25000 });
      await correcao.page.locator('[data-corrigir-final]').click();
      const editorCorrecao = correcao.page.locator('.camp-final [data-editor-de-resultado]');
      t(`${largura}px · corrigir a final: o editor abre com o placar de antes (2 × 2)`, (await editorCorrecao.locator('input').evaluateAll((els) => els.map((e) => e.value))).join('×') === '2×2');
      await editorCorrecao.locator('input').nth(0).fill('3');
      await editorCorrecao.locator('input').nth(1).fill('2');
      await editorCorrecao.getByRole('button', { name: 'Corrigir' }).click();
      await correcao.page.locator('.futty-toast', { hasText: 'Final corrigida.' }).waitFor({ timeout: 10000 });
      t(`${largura}px · corrigir a final para 3 × 2: sem "(pên.: …)", o campeão segue o placar`, (await correcao.page.locator('[data-penaltis-da-final]').count()) === 0 && camp.campeao_time_id === ouro.id, `${camp.campeao_time_id}`);
      await correcao.ctx.close();
    }

    // ─── Mata-mata: o empate também pergunta os pênaltis, e o chaveamento mostra "(pên.: …)" ──────────────────────────────────
    {
      const motor = criarMotor({ store, membros: [] });
      const camp = motor.criarDireto({ nome: 'Copa do Mata', formato: 'mata', nomes: ['Time Ouro', 'Time Roxo', 'Time Prata', 'Time Bronze'] });
      const { page, ctx, erros } = await abrirCena(navegador, base, motor, `/time/domingueira-fc/campeonato/${camp.id}`, { largura });
      await page.locator('[data-confronto]').first().waitFor({ timeout: 25000 });
      const editorDaSemi = page.locator('[data-editor-de-resultado]').first();
      await editorDaSemi.locator('input').nth(0).fill('1');
      await editorDaSemi.locator('input').nth(1).fill('1');
      await editorDaSemi.getByRole('button', { name: 'Salvar' }).click();
      await page.locator('[data-pergunta-penaltis]').waitFor({ timeout: 10000 });
      t(`${largura}px · mata-mata: a semifinal empatada também pergunta quem venceu nos pênaltis`, (await page.locator('[data-penaltis]').count()) === 2);
      const primeiro = page.locator('[data-penaltis]').first();
      const nomeEscolhido = (await primeiro.innerText()).trim();
      await primeiro.click();
      await page.locator('[data-penaltis-do-jogo]').waitFor({ timeout: 10000 });
      t(`${largura}px · mata-mata: o chaveamento mostra "1 × 1" e "(pên.: ${nomeEscolhido})" e o time segue para a final`, (await page.locator('[data-penaltis-do-jogo]').innerText()).trim() === `(pên.: ${nomeEscolhido})` && camp.confrontos.some((c) => c.ronda === 2 && [c.time_a_id, c.time_b_id].includes(camp.times.find((x) => x.nome === nomeEscolhido).id)));
      t(`${largura}px · mata-mata: o chaveamento cabe, sem rolar para o lado nem cortar`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
      await foto(page, `30l2-mata-mata-penaltis-${largura}.png`);
      t(`${largura}px · sem erro de script (mata-mata)`, semErrosReais(erros).length === 0, semErrosReais(erros).join(' | '));
      await ctx.close();
    }

    // ─── O Início de todo membro: o card do campeonato em cada momento ─────────────────────────────────────────────────────────
    {
      const { mundo, camp } = mundoComCampeonato(store, base, { n: 0, papel: 'member', euId: 'U3' });
      mundo.verComo('U3', 'member');
      // Sem nenhum jogo lançado: o card existe (a fase e 0 de 6), mas sem os dois primeiros.
      let cena = await abrirCena(navegador, base, mundo, '/home', { largura, euId: 'U3' });
      await cena.page.locator('[data-card-campeonato]').waitFor({ timeout: 25000 });
      t(`${largura}px · Início (jogador): campeonato criado e nada lançado: "Fase de grupos · 0 de 6 jogos", sem os dois primeiros`, (await cena.page.locator('[data-linha-do-campeonato]').innerText()).trim() === 'Fase de grupos · 0 de 6 jogos' && (await cena.page.locator('[data-primeiros-do-campeonato]').count()) === 0, await cena.page.locator('[data-linha-do-campeonato]').innerText());
      await cena.ctx.close();

      JOGOS.slice(0, 3).forEach(([x, y, gx, gy]) => mundo.campeonatos.jogar(camp, x, y, gx, gy));
      cena = await abrirCena(navegador, base, mundo, '/home', { largura, euId: 'U3' });
      const card = cena.page.locator('[data-card-campeonato="andamento"]');
      await card.waitFor({ timeout: 25000 });
      const textoDoCard = (await card.innerText()).replace(/\s+/g, ' ');
      t(`${largura}px · Início (jogador), 3 jogos lançados: nome do campeonato + "Fase de grupos · 3 de 6 jogos"`, textoDoCard.includes('Copa da Domingueira') && textoDoCard.includes('Fase de grupos · 3 de 6 jogos'), textoDoCard);
      t(`${largura}px · e os dois primeiros da tabela (Ouro 4 pts, Prata 2 pts)`, /1º\s*Time Ouro\s*4 pts/.test(textoDoCard) && /2º\s*Time Prata\s*2 pts/.test(textoDoCard), textoDoCard);
      t(`${largura}px · o card do Início não tem botão de admin e leva ao campeonato (toque abre)`, (await card.locator('button').count()) === 0 && (await card.getAttribute('href')) === `/time/${SLUG}/campeonato/${camp.id}`, `${await card.getAttribute('href')}`);
      t(`${largura}px · o Início com o card cabe, sem rolar para o lado nem cortar`, (await defeitos(cena.page, largura)).length === 0, resumo(await defeitos(cena.page, largura)));
      await card.scrollIntoViewIfNeeded();
      await foto(cena.page, `30l2-inicio-andamento-${largura}.png`, { fullPage: false });
      await card.click();
      await cena.page.locator('.camp-title').waitFor({ timeout: 25000 });
      t(`${largura}px · tocar no card abre o campeonato (página de jogador: sem campos de placar nem "Corrigir")`, (await cena.page.locator('.camp-title').innerText()).trim() === 'Copa da Domingueira' && (await cena.page.locator('[data-editor-de-resultado]').count()) === 0 && (await cena.page.locator('[data-corrigir]').count()) === 0);
      t(`${largura}px · sem erro de script (Início, andamento)`, semErrosReais(cena.erros).length === 0, semErrosReais(cena.erros).join(' | '));
      await cena.ctx.close();

      // Fase de grupos acabada: o card diz a final.
      JOGOS.slice(3).forEach(([x, y, gx, gy]) => mundo.campeonatos.jogar(camp, x, y, gx, gy));
      cena = await abrirCena(navegador, base, mundo, '/home', { largura, euId: 'U3' });
      const cardFinal = cena.page.locator('[data-card-campeonato="final"]');
      await cardFinal.waitFor({ timeout: 25000 });
      t(`${largura}px · Início, final definida: "Final: Time Ouro × Time Prata"`, (await cena.page.locator('[data-linha-do-campeonato]').innerText()).trim() === 'Final: Time Ouro × Time Prata', await cena.page.locator('[data-linha-do-campeonato]').innerText());
      await cardFinal.scrollIntoViewIfNeeded();
      await foto(cena.page, `30l2-inicio-final-${largura}.png`, { fullPage: false });
      await cena.ctx.close();

      // O campeão: quem é do time campeão vê "Você é campeão!", quem é de outro time vê só o campeão.
      const final = camp.confrontos.find((c) => c.fase === 'final');
      store.aplicarResultado(camp, final.id, 2, 2, [], camp.times.find((x) => x.nome === 'Time Ouro').id);
      const doOuro = camp.times.find((x) => x.nome === 'Time Ouro').jogadores.find((j) => j.user_id).user_id;
      const doRoxo = camp.times.find((x) => x.nome === 'Time Roxo').jogadores.find((j) => j.user_id).user_id;
      for (const [quem, euId, ehCampeao] of [['do time campeão', doOuro, true], ['de outro time', doRoxo, false]]) {
        mundo.verComo(euId, 'member');
        cena = await abrirCena(navegador, base, mundo, '/home', { largura, euId });
        await cena.page.locator('[data-card-campeonato]').waitFor({ timeout: 25000 });
        const linha = (await cena.page.locator('[data-linha-do-campeonato]').innerText()).trim();
        const voce = await cena.page.locator('[data-voce-e-campeao]').count();
        t(`${largura}px · Início, jogador ${quem}: "Campeão: Time Ouro"${ehCampeao ? ' e "Você é campeão!"' : ' e nada de "Você é campeão!"'}`, linha === 'Campeão: Time Ouro' && (ehCampeao ? voce === 1 && (await cena.page.locator('[data-voce-e-campeao]').textContent()).trim() === 'Você é campeão!' : voce === 0), `${linha} | ${voce}`);
        t(`${largura}px · Início, jogador ${quem}: o card do campeão cabe, sem rolar para o lado nem cortar`, (await defeitos(cena.page, largura)).length === 0, resumo(await defeitos(cena.page, largura)));
        await cena.page.locator('[data-card-campeonato]').scrollIntoViewIfNeeded();
        await foto(cena.page, `30l2-inicio-campeao-${ehCampeao ? 'time-campeao' : 'outro-time'}-${largura}.png`, { fullPage: false });
        t(`${largura}px · sem erro de script (Início, ${quem})`, semErrosReais(cena.erros).length === 0, semErrosReais(cena.erros).join(' | '));
        await cena.ctx.close();
      }

      // Sete dias depois o card sai do Início.
      camp.terminado_em = new Date(Date.now() - 8 * DIA).toISOString();
      cena = await abrirCena(navegador, base, mundo, '/home', { largura, euId: doRoxo });
      await cena.page.locator('main').first().waitFor({ timeout: 25000 });
      await cena.page.waitForTimeout(1500);
      t(`${largura}px · Início: oito dias depois de terminar, o card do campeonato já saiu`, (await cena.page.locator('[data-card-campeonato]').count()) === 0);
      await cena.ctx.close();
    }

    // ─── A Resenha: o post do campeão ───────────────────────────────────────────────────────────────────────────────────────
    {
      const { mundo, camp } = mundoComCampeonato(store, base, { n: 6, papel: 'member', euId: 'U3' });
      mundo.verComo('U3', 'member');
      const final = camp.confrontos.find((c) => c.fase === 'final');
      store.aplicarResultado(camp, final.id, 2, 2, [], camp.times.find((x) => x.nome === 'Time Ouro').id);
      mundo.resenha.reacoes = { '👍': 5, '❤️': 2, '😂': 1 };
      mundo.resenha.minhaReacao = '👍';
      mundo.resenha.comentarios = [
        { nome: 'João', avatar_url: null, body: 'Que final! Os pênaltis me mataram.' },
        { nome: 'Rafael', avatar_url: null, body: 'Parabéns ao Ouro, mereceram.' },
      ];
      const { page, ctx, erros } = await abrirCena(navegador, base, mundo, '/feed', { largura, euId: 'U3' });
      const post = page.locator('[data-post-do-campeao]');
      await post.waitFor({ timeout: 25000 });
      await page.waitForTimeout(1200); // o post entra com um fade (anim-slide-in): o texto só conta depois dele
      t(`${largura}px · Resenha: UM post do campeonato, com o título "Time Ouro é campeão · Copa da Domingueira"`, (await post.count()) === 1 && (await page.locator('[data-titulo-do-post-campeao]').innerText()).replace(/\s+/g, ' ').trim() === 'Time Ouro é campeão · Copa da Domingueira', await page.locator('[data-titulo-do-post-campeao]').innerText());
      const nomesDoOuro = camp.times.find((x) => x.nome === 'Time Ouro').jogadores.map((j) => j.nome);
      const textoDoPost = (await post.innerText()).replace(/\s+/g, ' ');
      t(`${largura}px · o post traz os jogadores do time campeão (${nomesDoOuro.join(', ')})`, nomesDoOuro.every((n) => textoDoPost.includes(n)), textoDoPost);
      t(`${largura}px · o pódio (1º Ouro, 2º Prata, 3º Roxo) e a final com os pênaltis`, /1º\s*Time Ouro\s*2º\s*Time Prata\s*3º\s*Time Roxo/.test((await page.locator('[data-podio-do-post]').innerText()).replace(/\s+/g, ' ')) && (await page.locator('[data-final-do-post]').innerText()).trim() === 'Final: Time Ouro 2 × 2 Time Prata (pên.: Time Ouro)', await page.locator('[data-final-do-post]').innerText());
      t(`${largura}px · o time campeão "respira" como o cromo (bob + sway), como pede a regra da Resenha`, (await post.locator('.feed-cromo-bob .feed-cromo-sway [data-campeao-do-campeonato]').count()) === 1);
      t(`${largura}px · o título usa o troféu da casa (ícone), sem emoji na interface`, (await post.locator('svg').count()) > 0 && !/🏆/.test(textoDoPost));
      t(`${largura}px · tem reações (👍 5) e a prévia dos comentários, como os outros posts`, /👍\s*5/.test(textoDoPost) && textoDoPost.includes('Que final! Os pênaltis me mataram.') && /Comentar|Responder|Ver todos/.test(textoDoPost), textoDoPost);
      t(`${largura}px · a Resenha com o post cabe, sem rolar para o lado nem cortar`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
      await foto(page, `30l2-resenha-campeao-${largura}.png`, { fullPage: false });
      // O bloco do campeão respira (bob + sway) sem parar: o Playwright nunca o vê "estável", e uma pessoa toca nele em movimento do mesmo jeito.
      await page.locator('[data-titulo-do-post-campeao]').click({ force: true });
      await page.locator('.camp-title').waitFor({ timeout: 25000 });
      t(`${largura}px · tocar no post abre o campeonato`, (await page.locator('.camp-title').innerText()).trim() === 'Copa da Domingueira');
      t(`${largura}px · sem erro de script (Resenha)`, semErrosReais(erros).length === 0, semErrosReais(erros).join(' | '));
      await ctx.close();
    }
  }
}
