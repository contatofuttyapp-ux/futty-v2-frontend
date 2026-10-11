// Prova no navegador da Rodada 30M (os últimos ajustes do campeonato): o que só um Chromium de verdade confirma, com as MESMAS fontes e o MESMO
// CSS do app, a 390 e a 360 px.
//   · a barra dourada de "classificado" na tabela da fase de grupos: nenhuma antes do 1º jogo, depois do 1º, depois de um empate; só o Ouro quando
//     ele já é inalcançável (5 jogos); os dois finalistas no fim; empate idêntico na linha da final nunca marca só um; a legenda aparece junto;
//   · o pódio do campeão apoiado no chão e com respiro até os botões de compartilhar (time e pública);
//   · o "Próximo jogo: A × B" no topo da página do campeonato (time e pública) e no card do Início, sempre o primeiro jogo ainda sem placar na
//     ordem da lista; com a final definida o card segue com "Final: A × B"; some quando a final é lançada;
//   · o título do post do campeão na Resenha: "Time Ouro é campeão · Copa da Domingueira".
// O motor é de mentira (/api/** respondido por page.route), mas a regra é a DE VERDADE: o mesmo sorteio e o mesmo backend/utils/campeonatoStore.js
// (_mundo-do-dia-18.mjs). A bancada é a da parte 2 da 30L (rodada-30l2.html). Nada sai para a rede.
import { readFileSync } from 'node:fs';
import { medir } from '../medir-estreito.mjs';
import { carregarStore, rotear } from './_campeonato-motor.mjs';
import { criarMundo, ID_DO_JOGO, SLUG } from './_mundo-do-dia-18.mjs';

const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const sessaoDe = (euId) => JSON.stringify({
  access_token: 'prova', refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
  user: { id: euId, aud: 'authenticated', email: 'prova@futty.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
});

export const nome = 'Rodada 30M (marca de classificado, pódio com chão, próximo jogo, título do post do campeão)';

const captura = (arquivo) => new URL(`../capturas/${arquivo}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const DEFEITOS_QUE_REPROVAM = ['rola-para-o-lado', 'passa-da-janela', 'contêiner-corta', 'numero-com-ponto'];

// Os mesmos 6 jogos do roteiro do dia 18, na ordem em que a tela os lista.
const JOGOS = [
  ['Time Ouro', 'Time Bronze', 3, 1],
  ['Time Roxo', 'Time Prata', 1, 1],
  ['Time Ouro', 'Time Prata', 1, 1],
  ['Time Bronze', 'Time Roxo', 2, 1],
  ['Time Ouro', 'Time Roxo', 2, 0],
  ['Time Prata', 'Time Bronze', 2, 0],
];
// Quem está garantido na final depois de N jogos (a conta é do motor; aqui só o que a tela deve mostrar).
const CLASSIFICADOS = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: ['Time Ouro'], 6: ['Time Ouro', 'Time Prata'] };

async function abrirCena(navegador, base, motor, caminho, { largura = 390, altura = 900, euId = 'U3' } = {}) {
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
const defeitos = async (page, largura) => (await page.evaluate(medir, largura)).filter((a) => DEFEITOS_QUE_REPROVAM.includes(a.tipo));
const resumo = (lista) => lista.map((d) => `${d.tipo}: ${d.detalhe}`).join(' | ');
const foto = async (page, arquivo, opcoes = { fullPage: false }) => { await page.waitForTimeout(900); return page.screenshot({ path: captura(arquivo), ...opcoes }); };
const texto = (loc) => loc.evaluate((e) => e.innerText.replace(/\s+/g, ' ').trim());
const lerTabela = (page) => page.locator('.camp-tab__r').evaluateAll((linhas) => linhas.map((l) => ({
  nome: l.querySelector('.nm span:nth-child(2)').textContent.trim(), classificado: l.dataset.classificado === 'sim',
  barra: ['lider', 'final', 'empate'].filter((c) => l.classList.contains(`camp-tab__r--${c}`)),
})));

/** O mundo do dia 18 já sorteado, com o campeonato "Todos contra todos + final" criado pela rota da tela e `n` jogos lançados; visto por `euId`. */
function mundoComCampeonato(base, { n = 0, papel = 'member', euId = 'U3', final = false } = {}) {
  const mundo = criarMundo({ base });
  mundo.responder(`/api/games/${ID_DO_JOGO}/sortear`, 'POST', { jogadoresPorTime: 5 });
  const criado = mundo.responder(`/api/equipas/${SLUG}/campeonatos/de-sorteio`, 'POST', { game_id: ID_DO_JOGO, formato: 'pontos_final', nome: 'Copa da Domingueira' });
  const camp = mundo.campeonatos.camps.get(criado.json.campeonato.id);
  JOGOS.slice(0, n).forEach(([x, y, gx, gy]) => mundo.campeonatos.jogar(camp, x, y, gx, gy));
  if (final) {
    const decisao = camp.confrontos.find((c) => c.fase === 'final');
    const ouro = camp.times.find((t) => t.nome === 'Time Ouro');
    const r = mundo.responder(`/api/equipas/${SLUG}/campeonatos/${camp.id}/confrontos/${decisao.id}/resultado`, 'POST', { placar_a: 2, placar_b: 2, penaltis_vencedor_id: ouro.id });
    if (r.status !== 200) throw new Error(`a final não foi lançada: ${r.json?.error}`);
  }
  mundo.verComo(euId, papel);
  return { mundo, camp };
}

/** "Time A × Time B" do primeiro jogo ainda sem placar, lido da LISTA de jogos da tela (a ordem que a pessoa vê). */
const primeiroSemPlacarDaLista = async (page) => {
  const jogos = await page.locator('[data-jogo]').evaluateAll((els) => els.map((e) => ({ vs: /\bvs\b/i.test(e.innerText), nomes: [...e.querySelectorAll('span[style*="flex: 1"]')].map((s) => s.textContent.trim()) })));
  const j = jogos.find((x) => x.vs);
  return j ? `${j.nomes[0]} × ${j.nomes[1]}` : null;
};

export async function rodar({ navegador, base, t }) {
  const store = carregarStore();
  if (!store) {
    t('o backend não está ao lado (FUTTY-V2/backend): a prova do campeonato foi pulada', true);
    return;
  }

  for (const largura of [390, 360]) {
    // ─── A barra de "classificado": do jogo 0 ao 6 ──────────────────────────────────────────────────────────────────────────
    for (const n of [0, 1, 2, 3, 4, 5, 6]) {
      const { mundo, camp } = mundoComCampeonato(base, { n });
      const { page, ctx, erros } = await abrirCena(navegador, base, mundo, `/time/${SLUG}/campeonato/${camp.id}`, { largura });
      await page.locator('.camp-tab__r').first().waitFor({ timeout: 25000 });
      const tabela = await lerTabela(page);
      const marcados = tabela.filter((l) => l.classificado).map((l) => l.nome);
      const esperados = CLASSIFICADOS[n];
      t(`${largura}px · ${n} jogos: marcados ${esperados.length ? esperados.join(' e ') : 'ninguém'}`, JSON.stringify(marcados) === JSON.stringify(esperados), JSON.stringify(tabela));
      t(`${largura}px · ${n} jogos: a barra dourada só está nas linhas marcadas (nada marcado "por ser o 1º ou o 2º da lista")`, tabela.every((l) => (l.barra.some((b) => b === 'lider' || b === 'final')) === l.classificado), JSON.stringify(tabela));
      t(`${largura}px · ${n} jogos: a legenda da barra ${esperados.length ? 'aparece' : 'não aparece (não há barra)'}`, (await page.locator('[data-legenda-classificado]').count()) === (esperados.length ? 1 : 0));
      if (n === 6) {
        const final = camp.confrontos.find((c) => c.fase === 'final');
        const idsDaFinal = [final.time_a_id, final.time_b_id].sort();
        const idsMarcados = camp.times.filter((x) => marcados.includes(x.nome)).map((x) => x.id).sort();
        t(`${largura}px · fim da fase: os marcados são os mesmos dois times da final`, JSON.stringify(idsDaFinal) === JSON.stringify(idsMarcados));
      }
      t(`${largura}px · ${n} jogos: a tabela com a legenda cabe, sem rolar para o lado nem cortar`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
      if (n === 1 || n === 5 || n === 6) await foto(page, `30m-tabela-${n}-jogos-${largura}.png`);
      t(`${largura}px · sem erro de script (${n} jogos)`, semErrosReais(erros).length === 0, semErrosReais(erros).join(' | '));
      await ctx.close();
    }

    // Empate idêntico na linha da final: o time de cima é marcado, os dois empatados não (a escolha é do admin).
    {
      const mundo = criarMundo({ base });
      const camp = mundo.campeonatos.criarDireto({ nome: 'Copa da Resenha', formato: 'pontos_final', nomes: ['Time Ouro', 'Time Roxo', 'Time Prata'] });
      mundo.campeonatos.jogar(camp, 'Time Ouro', 'Time Roxo', 1, 0);
      mundo.campeonatos.jogar(camp, 'Time Ouro', 'Time Prata', 1, 0);
      mundo.campeonatos.jogar(camp, 'Time Roxo', 'Time Prata', 0, 0);
      mundo.verComo('U3', 'member');
      const { page, ctx } = await abrirCena(navegador, base, mundo, `/time/${SLUG}/campeonato/${camp.id}`, { largura });
      await page.locator('[data-empate-na-tabela]').waitFor({ timeout: 25000 });
      const tabela = await lerTabela(page);
      t(`${largura}px · empate idêntico na linha da final: só o Ouro é marcado; Roxo e Prata levam a marca do empate, nenhum dos dois a da final`, JSON.stringify(tabela.filter((l) => l.classificado).map((l) => l.nome)) === JSON.stringify(['Time Ouro']) && tabela.filter((l) => l.nome !== 'Time Ouro').every((l) => l.barra.join() === 'empate'), JSON.stringify(tabela));
      await ctx.close();
    }

    // ─── O pódio apoiado no chão, com respiro até os botões ──────────────────────────────────────────────────────────────────
    {
      const { mundo, camp } = mundoComCampeonato(base, { n: 6, final: true });
      for (const [onde, caminho] of [['time', `/time/${SLUG}/campeonato/${camp.id}`], ['pública', `/p/campeonato/${SLUG}/${camp.id}`]]) {
        const { page, ctx, erros } = await abrirCena(navegador, base, mundo, caminho, { largura });
        await page.locator('.camp-podio').waitFor({ timeout: 25000 });
        await page.waitForTimeout(1200);
        const medidas = await page.evaluate(() => {
          const pod = document.querySelector('.camp-podio');
          const linha = document.querySelector('.camp-cel__row');
          const p = pod.getBoundingClientRect();
          const chao = parseFloat(getComputedStyle(pod).borderBottomWidth);
          return {
            chao,
            respiro: linha.getBoundingClientRect().top - p.bottom,
            degraus: [...document.querySelectorAll('.camp-podio__step')].map((s) => Math.abs(s.getBoundingClientRect().bottom - (p.bottom - chao))),
            colunas: document.querySelectorAll('.camp-podio__col').length,
          };
        });
        t(`${largura}px · pódio (${onde}): os 3 degraus apoiam numa linha de chão de 2 px (nenhum termina solto)`, medidas.colunas === 3 && medidas.chao === 2 && medidas.degraus.every((d) => d <= 1), JSON.stringify(medidas));
        t(`${largura}px · pódio (${onde}): o chão e a linha dos botões Link / 9:16 têm pelo menos 20 px entre si (a margem é a mesma nas duas telas)`, medidas.respiro >= 20 && medidas.respiro <= 40, JSON.stringify(medidas));
        t(`${largura}px · pódio (${onde}): cabe, sem rolar para o lado nem cortar`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
        await page.locator('.camp-cel').screenshot({ path: captura(`30m-podio-${onde === 'time' ? 'time' : 'publica'}-${largura}.png`) });
        t(`${largura}px · sem erro de script (pódio, ${onde})`, semErrosReais(erros).length === 0, semErrosReais(erros).join(' | '));
        await ctx.close();
      }
    }

    // ─── O próximo jogo: topo da página (time e pública) e card do Início ───────────────────────────────────────────────────
    for (const n of [0, 3, 6]) {
      const { mundo, camp } = mundoComCampeonato(base, { n });
      const esperado = store.proximoJogo(camp);
      const frase = `Próximo jogo: ${esperado.a.nome} × ${esperado.b.nome}`;
      const { page, ctx, erros } = await abrirCena(navegador, base, mundo, `/time/${SLUG}/campeonato/${camp.id}`, { largura });
      await page.locator('[data-proximo-jogo]').waitFor({ timeout: 25000 });
      t(`${largura}px · ${n} jogos: o topo da página diz "${frase}"`, (await texto(page.locator('[data-proximo-jogo]'))) === frase, await texto(page.locator('[data-proximo-jogo]')));
      if (n < 6) {
        const daLista = await primeiroSemPlacarDaLista(page);
        t(`${largura}px · ${n} jogos: é o primeiro jogo sem placar da lista de jogos que a pessoa vê (${daLista})`, daLista === `${esperado.a.nome} × ${esperado.b.nome}` || daLista === `${esperado.b.nome} × ${esperado.a.nome}`, `${daLista} x ${frase}`);
      } else {
        t(`${largura}px · com a fase fechada o próximo jogo é a final (${frase}) e a final está na tela com os mesmos nomes`, /Time Ouro/.test(await texto(page.locator('.camp-final'))) && /Time Prata/.test(await texto(page.locator('.camp-final'))));
      }
      t(`${largura}px · ${n} jogos: o topo cabe, sem rolar para o lado nem cortar`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
      if (n === 3) await foto(page, `30m-topo-proximo-jogo-${largura}.png`);
      t(`${largura}px · sem erro de script (próximo jogo, ${n} jogos)`, semErrosReais(erros).length === 0, semErrosReais(erros).join(' | '));
      await ctx.close();

      const publica = await abrirCena(navegador, base, mundo, `/p/campeonato/${SLUG}/${camp.id}`, { largura });
      await publica.page.locator('[data-proximo-jogo]').waitFor({ timeout: 25000 });
      t(`${largura}px · ${n} jogos: a página pública diz o mesmo ("${frase}")`, (await texto(publica.page.locator('[data-proximo-jogo]'))) === frase);
      await publica.ctx.close();

      const inicio = await abrirCena(navegador, base, mundo, '/home', { largura });
      const card = inicio.page.locator('[data-card-campeonato]');
      await card.waitFor({ timeout: 25000 });
      if (n < 6) {
        t(`${largura}px · ${n} jogos: o card do Início tem "${frase}"`, (await texto(card.locator('[data-proximo-jogo]'))) === frase, await card.innerText());
        t(`${largura}px · ${n} jogos: o Início com o card cabe, sem rolar para o lado nem cortar`, (await defeitos(inicio.page, largura)).length === 0, resumo(await defeitos(inicio.page, largura)));
        if (n === 3) { await card.scrollIntoViewIfNeeded(); await foto(inicio.page, `30m-inicio-proximo-jogo-${largura}.png`); }
      } else {
        t(`${largura}px · com a final definida o card segue com "Final: Time Ouro × Time Prata" e não repete o próximo jogo`, (await texto(card.locator('[data-linha-do-campeonato]'))) === 'Final: Time Ouro × Time Prata' && (await card.locator('[data-proximo-jogo]').count()) === 0);
      }
      await inicio.ctx.close();
    }

    // Depois da final lançada o próximo jogo some (página do time, pública e card do Início) e a Resenha tem o título novo.
    {
      const { mundo, camp } = mundoComCampeonato(base, { n: 6, final: true });
      const { page, ctx } = await abrirCena(navegador, base, mundo, `/time/${SLUG}/campeonato/${camp.id}`, { largura });
      await page.locator('.camp-cel').waitFor({ timeout: 25000 });
      t(`${largura}px · final lançada: o próximo jogo some da página do time`, (await page.locator('[data-proximo-jogo]').count()) === 0);
      await ctx.close();
      const publica = await abrirCena(navegador, base, mundo, `/p/campeonato/${SLUG}/${camp.id}`, { largura });
      await publica.page.locator('.camp-cel').waitFor({ timeout: 25000 });
      t(`${largura}px · final lançada: e da página pública`, (await publica.page.locator('[data-proximo-jogo]').count()) === 0);
      await publica.ctx.close();
      const inicio = await abrirCena(navegador, base, mundo, '/home', { largura });
      await inicio.page.locator('[data-card-campeonato]').waitFor({ timeout: 25000 });
      t(`${largura}px · final lançada: e do card do Início ("Campeão: Time Ouro")`, (await inicio.page.locator('[data-proximo-jogo]').count()) === 0 && (await texto(inicio.page.locator('[data-linha-do-campeonato]'))) === 'Campeão: Time Ouro');
      await inicio.ctx.close();

      const resenha = await abrirCena(navegador, base, mundo, '/feed', { largura });
      const titulo = resenha.page.locator('[data-titulo-do-post-campeao]');
      await titulo.waitFor({ timeout: 25000 });
      await resenha.page.waitForTimeout(1200);
      t(`${largura}px · Resenha: o título do post é "Time Ouro é campeão · Copa da Domingueira" (sem "campeão do")`, (await texto(titulo)) === 'Time Ouro é campeão · Copa da Domingueira', await texto(titulo));
      t(`${largura}px · Resenha: o post com o título novo cabe, sem rolar para o lado nem cortar`, (await defeitos(resenha.page, largura)).length === 0, resumo(await defeitos(resenha.page, largura)));
      await foto(resenha.page, `30m-resenha-titulo-${largura}.png`);
      await resenha.ctx.close();
    }
  }
}
