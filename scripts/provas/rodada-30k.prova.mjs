// Prova no navegador da Rodada 30K (campeonato "Todos contra todos + final"): o que só um Chromium de verdade confirma, com as MESMAS fontes e o
// MESMO CSS do app, a 390 e a 360 px.
//   · criar: o seletor mostra os 3 formatos (cada um com a sua linha); "Todos contra todos + final" não perde o lugar com 3 times e some com 2;
//     o ✕ do passo dos times para no terceiro neste formato;
//   · o campeonato novo: "Fase de grupos" (tabela zerada + 6 jogos) e "Final" como vaga, sem nomes;
//   · lançar: o placar entra pela tela, a tabela muda, a final nasce com os nomes no último jogo; final empatada é recusada; o campeão aparece com pódio;
//   · empate na tabela: a pergunta ao admin ("Empate na tabela: quem vai para a final?"), o toque que decide, e o que o jogador vê (sem botões);
//   · corrigir um jogo da fase de grupos com a final criada: avisa e refaz a final; com o campeão feito, os jogos ficam travados com a explicação;
//   · página pública: "Fase de grupos" e "Final";
//   · a escolha do formato a partir do sorteio de um jogo (Página do Jogo): os 3 formatos, "Criar campeonato" só depois de escolher.
// O motor é de mentira (/api/** respondido por page.route), mas a regra é a DE VERDADE: o mesmo backend/utils/campeonatoStore.js (_campeonato-motor.mjs).
// Nada sai para a rede.
import { readFileSync } from 'node:fs';
import { medir } from '../medir-estreito.mjs';
import { carregarStore, criarMotor, rotear } from './_campeonato-motor.mjs';

const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const SESSAO = JSON.stringify({
  access_token: 'prova', refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
  user: { id: 'U1', aud: 'authenticated', email: 'prova@futty.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
});

export const nome = 'Rodada 30K (campeonato "Todos contra todos + final": criar, lançar, empate, correção, pública, a partir do sorteio)';

const captura = (arquivo) => new URL(`../capturas/${arquivo}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SLUG = 'domingueira-fc';
const NOMES = ['Rafael', 'Bruno', 'Carlos', 'Diego', 'Eduardo', 'Felipe', 'Gustavo', 'Henrique'];
const MEMBROS = NOMES.map((n, i) => ({ id: `U${i + 1}`, nome: n }));
const DEFEITOS_QUE_REPROVAM = ['rola-para-o-lado', 'passa-da-janela', 'contêiner-corta', 'numero-com-ponto'];

async function abrirCena(navegador, base, motor, caminho, { largura = 390, altura = 900 } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: largura, height: altura }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  await ctx.addInitScript(({ chave, sessao, cam }) => {
    try { localStorage.setItem('futty_cookies', 'aceite'); localStorage.setItem(chave, sessao); } catch { /* sem storage */ }
    window.__caminho = cam;
  }, { chave: `sb-${REF}-auth-token`, sessao: SESSAO, cam: caminho });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.route('**/*', rotear(motor, base));
  await page.goto(`${base}/scripts/provas/rodada-30k.html`, { waitUntil: 'domcontentloaded' });
  return { page, ctx, erros };
}

const semErrosReais = (erros) => erros.filter((e) => !/favicon|Failed to load resource/.test(e));
const texto = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const lerTabela = (page) => page.locator('.camp-tab__r').evaluateAll((linhas) => linhas.map((l) => ({
  pos: Number(l.querySelector('.pos').textContent), nome: l.querySelector('.nm span:nth-child(2)').textContent.trim(), pts: Number(l.querySelector('.p').textContent), empate: l.classList.contains('camp-tab__r--empate'),
})));
const defeitos = async (page, largura) => (await page.evaluate(medir, largura)).filter((a) => DEFEITOS_QUE_REPROVAM.includes(a.tipo));
// A página entra com um fade (.page-reveal): a foto espera ele acabar, senão sai esmaecida.
const foto = async (page, opcoes) => { await page.waitForTimeout(900); return page.screenshot(opcoes); };
const resumo = (lista) => lista.map((d) => `${d.tipo}: ${d.detalhe}`).join(' | ');
// Cada selo do topo (formato · estado · times) é UM retângulo, inteiro dentro da janela — um selo em linha que quebra no meio
// ("4" numa linha, "times" cortado na outra) a régua geral não vê.
const selosQuebrados = (page, largura) => page.locator('.camp-chip').evaluateAll((els, w) => els
  .filter((e) => e.getClientRects().length !== 1 || e.getBoundingClientRect().right > w || e.getBoundingClientRect().left < 0)
  .map((e) => `"${e.textContent.trim()}" (${e.getClientRects().length} partes, até ${Math.round(e.getBoundingClientRect().right)} px)`), largura);

/** 4 times na fase de grupos: 5 dos 6 jogos lançados (Ouro 7 · Prata 4 · Roxo 4 · Bronze 1), falta Prata × Bronze. */
function campeonatoAteOUltimoJogo(motor, nomeDoCamp = 'Copa da Resenha') {
  const camp = motor.criarDireto({ nome: nomeDoCamp, formato: 'pontos_final', nomes: ['Time Ouro', 'Time Roxo', 'Time Prata', 'Time Bronze'] });
  motor.jogar(camp, 'Time Ouro', 'Time Roxo', 2, 0);
  motor.jogar(camp, 'Time Ouro', 'Time Prata', 1, 1);
  motor.jogar(camp, 'Time Ouro', 'Time Bronze', 3, 0);
  motor.jogar(camp, 'Time Roxo', 'Time Prata', 2, 1);
  motor.jogar(camp, 'Time Roxo', 'Time Bronze', 0, 0);
  return camp;
}

export async function rodar({ navegador, base, t }) {
  const store = carregarStore();
  if (!store) {
    t('o backend não está ao lado (FUTTY-V2/backend): a prova do campeonato foi pulada', true);
    return;
  }

  for (const largura of [390, 360]) {
    // ─── Criar: o seletor, o mínimo de 3 times e o campeonato recém-criado ───────────────────────────────────────────────
    {
      const motor = criarMotor({ store, membros: MEMBROS });
      const { page, ctx, erros } = await abrirCena(navegador, base, motor, `/time/${SLUG}/campeonato`, { largura });
      await page.getByText('Ainda sem campeonatos').waitFor({ timeout: 25000 });
      t(`${largura}px · lista vazia: o admin é convidado a criar nos 3 formatos`, (await texto(page)).includes('pontos corridos, todos contra todos + final ou mata-mata'));
      await page.getByRole('button', { name: /Criar campeonato/ }).click();
      await page.locator('input.input--hud').fill('Copa da Resenha');
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.locator('[data-seletor-de-formato]').waitFor();

      const opcoes = await page.locator('[data-formato]').evaluateAll((els) => els.map((e) => ({ id: e.dataset.formato, titulo: e.querySelector('.camp-fopt__t').textContent, linha: e.querySelector('.camp-fopt__d').textContent, on: e.classList.contains('on') })));
      t(`${largura}px · o seletor mostra os 3 formatos, nesta ordem`, JSON.stringify(opcoes.map((o) => o.titulo)) === JSON.stringify(['Pontos corridos', 'Todos contra todos + final', 'Mata-mata']), JSON.stringify(opcoes.map((o) => o.titulo)));
      t(`${largura}px · cada formato traz a sua linha com a conta de jogos (4 times: 6 jogos + final / 6 jogos / 3 jogos)`, opcoes[1].linha.endsWith('Com 4 times: 6 jogos + final.') && opcoes[0].linha.endsWith('Com 4 times: 6 jogos.') && opcoes[2].linha.endsWith('Com 4 times: 3 jogos.'), JSON.stringify(opcoes.map((o) => o.linha)));
      t(`${largura}px · a frase "Por enquanto só pontos corridos e mata-mata" saiu`, !(await texto(page)).includes('Por enquanto'));
      await page.locator('[data-formato="pontos_final"]').click();
      t(`${largura}px · tocar em "Todos contra todos + final" o seleciona (só ele)`, (await page.locator('[data-formato].on').evaluateAll((els) => els.map((e) => e.dataset.formato))).join() === 'pontos_final');
      t(`${largura}px · o seletor cabe, sem rolar para o lado nem cortar`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
      await foto(page, { path: captura(`30k-formato-${largura}.png`), fullPage: true });

      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.locator('.camp-slot').first().waitFor();
      t(`${largura}px · passo dos times, "Todos contra todos + final": com 4 times há ✕ em cada um`, (await page.locator('button[aria-label="Remover"]').count()) === 4);
      await page.locator('button[aria-label="Remover"]').first().click();
      t(`${largura}px · com 3 times o ✕ some (o formato não existe com 2)`, (await page.locator('.camp-slot').count()) === 3 && (await page.locator('button[aria-label="Remover"]').count()) === 0);
      await page.getByRole('button', { name: '＋ Time' }).click();
      const campos = page.locator('.camp-slot input');
      for (const [i, n] of ['Time Ouro', 'Time Roxo', 'Time Prata', 'Time Bronze'].entries()) await campos.nth(i).fill(n);
      await page.getByRole('button', { name: /Montar à mão/ }).click();
      t(`${largura}px · resumo antes de criar: o chip diz "Todos contra todos + final"`, (await texto(page)).toLowerCase().includes('todos contra todos + final'));
      await page.getByRole('button', { name: 'Criar campeonato' }).click();
      await page.locator('.camp-final').waitFor({ timeout: 25000 });
      await page.waitForTimeout(500);

      const dados = [...motor.camps.values()][0];
      t(`${largura}px · o motor recebeu o formato certo (pontos_final) e 4 times`, dados?.formato === 'pontos_final' && dados.times.length === 4, JSON.stringify(motor.pedidos.filter((p) => p.metodo === 'POST').map((p) => p.corpo?.formato)));
      const corpo = await texto(page);
      t(`${largura}px · o campeonato novo: "Fase de grupos", "Jogos da fase de grupos" e "Final"`, ['Fase de grupos', 'Jogos da fase de grupos', 'Final'].every((s) => corpo.includes(s)));
      const tab = await lerTabela(page);
      t(`${largura}px · tabela zerada com os 4 times`, tab.length === 4 && tab.every((l) => l.pts === 0), JSON.stringify(tab));
      t(`${largura}px · 6 jogos de grupo`, (await page.locator('[data-jogo]').count()) === 6);
      t(`${largura}px · a final é só vaga, sem nomes de time, com "1º" e "2º"`, (await page.locator('.camp-final[data-final="vaga"]').count()) === 1 && (await page.locator('.camp-final').innerText()).replace(/\s+/g, ' ').includes('1º') && !/Time (Ouro|Roxo|Prata|Bronze)/.test(await page.locator('.camp-final').innerText()), await page.locator('.camp-final').innerText());
      t(`${largura}px · chip do formato completo no topo da página`, (await page.locator('.camp-chip').first().innerText()).toLowerCase() === 'todos contra todos + final');
      t(`${largura}px · o campeonato novo cabe, sem rolar para o lado`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
      t(`${largura}px · os selos do topo (formato, estado, times) aparecem inteiros`, (await selosQuebrados(page, largura)).length === 0, (await selosQuebrados(page, largura)).join(' | '));
      await foto(page, { path: captura(`30k-recem-criado-${largura}.png`), fullPage: true });
      t(`${largura}px · sem erro de script (criar)`, semErrosReais(erros).length === 0, semErrosReais(erros).join(' | '));
      await ctx.close();
    }

    // ─── Criar com 2 times: "Todos contra todos + final" não aparece ─────────────────────────────────────────────────────
    {
      const motor = criarMotor({ store, membros: MEMBROS });
      const { page, ctx } = await abrirCena(navegador, base, motor, `/time/${SLUG}/campeonato`, { largura });
      await page.getByRole('button', { name: /Criar campeonato/ }).click();
      await page.locator('input.input--hud').fill('Duelo');
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.getByRole('button', { name: 'Continuar' }).click(); // formato padrão: pontos corridos
      await page.locator('.camp-slot').first().waitFor();
      t(`${largura}px · "Pontos corridos" aceita descer a 2 times`, true);
      await page.locator('button[aria-label="Remover"]').first().click();
      await page.locator('button[aria-label="Remover"]').first().click();
      t(`${largura}px · com 2 times o ✕ some`, (await page.locator('.camp-slot').count()) === 2 && (await page.locator('button[aria-label="Remover"]').count()) === 0);
      await page.locator('main').getByRole('button', { name: 'Voltar' }).click();
      await page.locator('[data-seletor-de-formato]').waitFor();
      const ids = await page.locator('[data-formato]').evaluateAll((els) => els.map((e) => e.dataset.formato));
      t(`${largura}px · com 2 times o seletor tem só pontos corridos e mata-mata`, ids.join() === 'pontos,mata', ids.join());
      await ctx.close();
    }

    // ─── Lançar: placar pela tela, tabela, final automática, final empatada, campeão e pódio ─────────────────────────────────
    {
      const motor = criarMotor({ store, membros: MEMBROS });
      const camp = campeonatoAteOUltimoJogo(motor);
      const { page, ctx, erros } = await abrirCena(navegador, base, motor, `/time/${SLUG}/campeonato/${camp.id}`, { largura });
      await page.locator('.camp-final').waitFor({ timeout: 25000 });
      let tab = await lerTabela(page);
      t(`${largura}px · a tabela no meio (5 jogos, com um empate): Ouro 7 pts na frente`, tab[0].nome === 'Time Ouro' && tab[0].pts === 7 && tab.map((l) => l.pts).join() === '7,4,1,1', JSON.stringify(tab));
      t(`${largura}px · com 5 de 6 jogos a final segue vaga`, (await page.locator('.camp-final[data-final="vaga"]').count()) === 1);
      t(`${largura}px · os jogos já lançados mostram o "Corrigir" e o que falta tem os campos do placar`, (await page.locator('[data-corrigir]').count()) === 5 && (await page.locator('[data-editor-de-resultado]').count()) === 1);
      await foto(page, { path: captura(`30k-tabela-no-meio-${largura}.png`), fullPage: true });

      // O último jogo (Prata × Bronze 1×0) pela tela: o editor do jogo que falta.
      const faltante = page.locator('[data-jogo]', { has: page.locator('[data-editor-de-resultado]') });
      const nomesDoJogo = (await faltante.innerText()).replace(/\s+/g, ' ');
      t(`${largura}px · o jogo que falta é Prata × Bronze`, /Time Prata/.test(nomesDoJogo) && /Time Bronze/.test(nomesDoJogo), nomesDoJogo);
      const prataEhA = nomesDoJogo.indexOf('Time Prata') < nomesDoJogo.indexOf('Time Bronze');
      await faltante.locator('input').nth(0).fill(prataEhA ? '1' : '0');
      await faltante.locator('input').nth(1).fill(prataEhA ? '0' : '1');
      await faltante.getByRole('button', { name: 'Salvar' }).click();
      await page.locator('.camp-final[data-final="aberta"]').waitFor({ timeout: 10000 });
      tab = await lerTabela(page);
      t(`${largura}px · o último jogo lançado: tabela final da fase 1 Ouro, Prata, Roxo, Bronze`, tab.map((l) => l.nome).join() === 'Time Ouro,Time Prata,Time Roxo,Time Bronze', JSON.stringify(tab));
      const final = await page.locator('.camp-final').innerText();
      t(`${largura}px · a final nasce sozinha com o 1º e o 2º: Ouro e Prata`, /Time Ouro/.test(final) && /Time Prata/.test(final) && !/Time Roxo/.test(final), final);
      t(`${largura}px · fim da fase de grupos não coroa ninguém (sem "Temos campeão!", sem celebração)`, (await page.locator('.camp-cel').count()) === 0);
      await foto(page, { path: captura(`30k-final-criada-${largura}.png`), fullPage: true });

      // Final empatada: recusada, com a frase.
      const editorFinal = page.locator('.camp-final [data-editor-de-resultado]');
      await editorFinal.locator('input').nth(0).fill('2');
      await editorFinal.locator('input').nth(1).fill('2');
      await editorFinal.getByRole('button', { name: 'Salvar' }).click();
      await page.getByText(/Na final não há empate/).waitFor({ timeout: 10000 });
      t(`${largura}px · final empatada: o placar é recusado com a frase da casa`, (await page.locator('.camp-final[data-final="aberta"]').count()) === 1 && motor.camps.get(camp.id).estado === 'em_curso');
      await foto(page, { path: captura(`30k-final-empatada-${largura}.png`), fullPage: false });

      // Final decidida: campeão e pódio.
      const ouroEhA = (await page.locator('.camp-final__t').first().innerText()).includes('Time Ouro');
      await editorFinal.locator('input').nth(0).fill(ouroEhA ? '3' : '2');
      await editorFinal.locator('input').nth(1).fill(ouroEhA ? '2' : '3');
      await editorFinal.getByRole('button', { name: 'Salvar' }).click();
      await page.locator('.camp-cel').waitFor({ timeout: 10000 });
      await page.waitForTimeout(400);
      t(`${largura}px · o campeão aparece (Time Ouro) e o campeonato termina`, (await page.locator('.camp-cel__n').innerText()).trim() === 'Time Ouro' && motor.camps.get(camp.id).estado === 'terminado');
      const podio = await page.locator('.camp-podio__col').evaluateAll((cols) => cols.map((c) => c.querySelector('.camp-podio__crest').innerText.replace(/\s+/g, ' ').trim() + ' · ' + c.querySelector('.camp-podio__step').textContent.trim()));
      t(`${largura}px · pódio: 1º Ouro (campeão), 2º Prata (perdeu a final), 3º Roxo (3º da tabela)`, podio.join(' | ') === 'Time Prata · 2º | Time Ouro · 1º | Time Roxo · 3º', podio.join(' | '));
      t(`${largura}px · terminado: os jogos da fase de grupos ficam travados, com a explicação (sem "Corrigir")`, (await page.locator('[data-corrigir]').count()) === 0 && (await page.locator('[data-grupos-travados]').count()) === 1);
      t(`${largura}px · terminado: a página cabe, sem rolar para o lado`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
      await foto(page, { path: captura(`30k-campeao-${largura}.png`), fullPage: true });
      t(`${largura}px · sem erro de script (lançar)`, semErrosReais(erros).length === 0, semErrosReais(erros).join(' | '));
      await ctx.close();
    }

    // ─── Empate na tabela: a pergunta ao admin e o que o jogador vê ──────────────────────────────────────────────────────
    for (const papel of ['admin', 'member']) {
      const motor = criarMotor({ store, papel, membros: MEMBROS });
      const camp = motor.criarDireto({ nome: 'Copa da Resenha', formato: 'pontos_final', nomes: ['Time Ouro', 'Time Roxo', 'Time Prata'] });
      motor.jogar(camp, 'Time Ouro', 'Time Roxo', 1, 0);
      motor.jogar(camp, 'Time Ouro', 'Time Prata', 1, 0);
      motor.jogar(camp, 'Time Roxo', 'Time Prata', 0, 0);
      const { page, ctx, erros } = await abrirCena(navegador, base, motor, `/time/${SLUG}/campeonato/${camp.id}`, { largura });
      await page.locator('.camp-final').waitFor({ timeout: 25000 });
      const caixa = page.locator('[data-empate-na-tabela]');
      t(`${largura}px · ${papel}: aparece "Empate na tabela: quem vai para a final?"`, (await caixa.innerText()).includes('Empate na tabela: quem vai para a final?'));
      const tab = await lerTabela(page);
      t(`${largura}px · ${papel}: Roxo e Prata dividem o 2º lugar (marcados), Ouro em 1º; nada de ordem alfabética`, tab.map((l) => `${l.pos}${l.nome}${l.empate ? '*' : ''}`).join() === '1Time Ouro,2Time Roxo*,2Time Prata*', JSON.stringify(tab));
      t(`${largura}px · ${papel}: a final segue vaga ("Espera o empate")`, (await page.locator('.camp-final[data-final="vaga"]').count()) === 1 && (await page.locator('.camp-final').innerText()).includes('Espera o empate'));
      const botoes = await caixa.locator('button').count();
      if (papel === 'admin') {
        t(`${largura}px · admin: um botão para cada time do empate (Roxo e Prata)`, botoes === 2, String(botoes));
        t(`${largura}px · a pergunta cabe, sem rolar para o lado nem cortar`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
        await foto(page, { path: captura(`30k-empate-admin-${largura}.png`), fullPage: true });
        await caixa.locator('button', { hasText: 'Time Prata' }).click();
        await page.locator('.camp-final[data-final="aberta"]').waitFor({ timeout: 10000 });
        const final = await page.locator('.camp-final').innerText();
        t(`${largura}px · admin: tocar no Prata leva Ouro × Prata à final; a pergunta some`, /Time Ouro/.test(final) && /Time Prata/.test(final) && (await page.locator('[data-empate-na-tabela]').count()) === 0, final);
        t(`${largura}px · admin: a escolha foi UM pedido ao motor, com o time tocado`, JSON.stringify(motor.pedidos.filter((p) => p.pathname.endsWith('/desempate')).map((p) => p.corpo)) === JSON.stringify([{ time_id: camp.times.find((x) => x.nome === 'Time Prata').id }]));
      } else {
        t(`${largura}px · jogador: vê o aviso e os dois times, mas nenhum botão de decidir`, botoes === 0 && (await caixa.innerText()).includes('O admin do time decide'), String(botoes));
        await foto(page, { path: captura(`30k-empate-jogador-${largura}.png`), fullPage: true });
      }
      t(`${largura}px · ${papel}: sem erro de script (empate)`, semErrosReais(erros).length === 0, semErrosReais(erros).join(' | '));
      await ctx.close();
    }

    // ─── Corrigir um jogo da fase de grupos com a final criada ───────────────────────────────────────────────────────────
    {
      const motor = criarMotor({ store, membros: MEMBROS });
      const camp = campeonatoAteOUltimoJogo(motor);
      motor.jogar(camp, 'Time Prata', 'Time Bronze', 1, 0); // final criada: Ouro × Prata
      const { page, ctx, erros } = await abrirCena(navegador, base, motor, `/time/${SLUG}/campeonato/${camp.id}`, { largura });
      await page.locator('.camp-final[data-final="aberta"]').waitFor({ timeout: 25000 });
      const cartao = page.locator('[data-jogo]', { hasText: 'Time Ouro' }).filter({ hasText: 'Time Bronze' });
      await cartao.locator('[data-corrigir]').click();
      const editor = cartao.locator('[data-editor-de-resultado]');
      const antes = await editor.locator('input').evaluateAll((els) => els.map((e) => e.value));
      t(`${largura}px · "Corrigir" abre o editor já com o placar de antes (3 × 0)`, antes.join('×') === '3×0' || antes.join('×') === '0×3', antes.join('×'));
      const ouroEhA = (await cartao.innerText()).indexOf('Time Ouro') < (await cartao.innerText()).indexOf('Time Bronze');
      // Ouro × Bronze 3×0 vira 0×3: o Bronze vai para a frente e a final muda.
      await editor.locator('input').nth(0).fill(ouroEhA ? '0' : '3');
      await editor.locator('input').nth(1).fill(ouroEhA ? '3' : '0');
      await foto(page, { path: captura(`30k-corrigir-editor-${largura}.png`), fullPage: false });
      await editor.getByRole('button', { name: 'Corrigir' }).click();
      await page.locator('[data-aviso-da-final]').waitFor({ timeout: 10000 });
      const aviso = await page.locator('[data-aviso-da-final]').innerText();
      t(`${largura}px · corrigir que muda o 1º/2º: o aviso diz a final nova ("A tabela mudou: a final agora é Time Bronze × Time Prata")`, /A tabela mudou: a final agora é/.test(aviso) && /Time Bronze/.test(aviso) && /Time Prata/.test(aviso), aviso);
      const final = await page.locator('.camp-final').innerText();
      t(`${largura}px · e a final da tela já é a nova (Bronze e Prata; o Ouro saiu)`, /Time Bronze/.test(final) && /Time Prata/.test(final) && !/Time Ouro/.test(final), final);
      t(`${largura}px · o aviso fica na tela até a pessoa dispensar`, (await page.locator('[data-aviso-da-final]').count()) === 1);
      await foto(page, { path: captura(`30k-corrigir-aviso-${largura}.png`), fullPage: true });
      await page.locator('[data-aviso-da-final] button').click();
      t(`${largura}px · "Entendi" dispensa o aviso`, (await page.locator('[data-aviso-da-final]').count()) === 0);
      t(`${largura}px · o editor fechou depois de corrigir`, (await page.locator('[data-editor-de-resultado]').count()) === 1, 'só o da final deve sobrar');
      t(`${largura}px · sem erro de script (corrigir)`, semErrosReais(erros).length === 0, semErrosReais(erros).join(' | '));
      await ctx.close();
    }

    // ─── Página pública: as duas fases ───────────────────────────────────────────────────────────────────────────────────
    for (const fim of [false, true]) {
      const motor = criarMotor({ store, papel: 'member', membros: MEMBROS });
      const camp = campeonatoAteOUltimoJogo(motor);
      motor.jogar(camp, 'Time Prata', 'Time Bronze', 1, 0);
      if (fim) store.aplicarResultado(camp, camp.confrontos.find((c) => c.fase === 'final').id, camp.confrontos.find((c) => c.fase === 'final').time_a_id === camp.times[0].id ? 3 : 1, camp.confrontos.find((c) => c.fase === 'final').time_a_id === camp.times[0].id ? 1 : 3);
      const { page, ctx, erros } = await abrirCena(navegador, base, motor, `/p/campeonato/${SLUG}/${camp.id}`, { largura });
      await page.locator('.camp-final').waitFor({ timeout: 25000 });
      const corpo = await texto(page);
      const rotulo = fim ? 'terminado' : 'em andamento';
      t(`${largura}px · página pública (${rotulo}): "Fase de grupos" e "Final" + o chip do formato`, corpo.includes('Fase de grupos') && corpo.includes('Final') && corpo.toLowerCase().includes('todos contra todos + final'));
      t(`${largura}px · página pública (${rotulo}): a final ${fim ? 'jogada, com o placar' : 'criada, com Ouro × Prata'}`, fim ? (await page.locator('.camp-final[data-final="jogada"]').count()) === 1 : (await page.locator('.camp-final[data-final="aberta"]').count()) === 1);
      t(`${largura}px · página pública (${rotulo}): sem campos de placar nem "Corrigir" (é só leitura)`, (await page.locator('[data-editor-de-resultado]').count()) === 0 && (await page.locator('[data-corrigir]').count()) === 0);
      t(`${largura}px · página pública (${rotulo}): cabe, sem rolar para o lado`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
      await foto(page, { path: captura(`30k-publica-${fim ? 'campeao' : 'andamento'}-${largura}.png`), fullPage: true });
      t(`${largura}px · sem erro de script (pública ${rotulo})`, semErrosReais(erros).length === 0, semErrosReais(erros).join(' | '));
      await ctx.close();
    }

    // ─── A partir do sorteio de um jogo: os 3 formatos, "Criar campeonato" só depois de escolher ────────────────────────────
    {
      const times = [
        { nome: 'Time A', jogadores: [{ user_id: 'U1', nome: 'Rafael', avatar_url: null, rating: 3 }, { user_id: 'U2', nome: 'Bruno', avatar_url: null, rating: 3 }] },
        { nome: 'Time B', jogadores: [{ user_id: 'U3', nome: 'Carlos', avatar_url: null, rating: 3 }, { user_id: 'U4', nome: 'Diego', avatar_url: null, rating: 3 }] },
        { nome: 'Time C', jogadores: [{ user_id: 'U5', nome: 'Eduardo', avatar_url: null, rating: 3 }, { user_id: 'U6', nome: 'Felipe', avatar_url: null, rating: 3 }] },
        { nome: 'Time D', jogadores: [{ user_id: 'U7', nome: 'Gustavo', avatar_url: null, rating: 3 }, { user_id: 'U8', nome: 'Henrique', avatar_url: null, rating: 3 }] },
      ];
      const game = {
        id: 'g18', data: new Date(Date.now() + 7 * 86400000).toISOString(), local: 'Quadra do Zé', status: 'drawn', num_times: 4, jogadores_por_time: 2, max_jogadores: null, sorteio_realizado: true,
        times_resultado: { seed: 7, num_times: 4, times, reservas: [] }, historico: false, cancelado: false, resultado_nivel: 0, time_vencedor: null, placar_a: null, placar_b: null, campeao_time_index: null,
        campeao_foto_url: null, artilheiro_user_id: null, artilheiro_gols: null, destaque_user_id: null, destaque_titulo: null, rodada_user_id: null, rodada_foto_url: null,
      };
      // O motor do campeonato responde o time e, aqui, também a Página do Jogo (/api/games/g18): o campeonato nasce pela tela.
      const timeDaPagina = { ...criarMotor({ store }).team, mostrar_artilheiro: true, mostrar_destaque: true };
      const jogo = {
        id: 'g18',
        times_resultado: game.times_resultado,
        resposta: {
          team: timeDaPagina, game, players: times.flatMap((x) => x.jogadores).map((j) => ({ ...j, confirmado: true, goleiro: false, cabeca_chave: false })),
          gols: [], meuEstado: { confirmado: true, goleiro: false, cabeca_chave: false }, jaVotei: false,
        },
      };
      const motorComJogo = criarMotor({ store, membros: MEMBROS, jogo });
      Object.assign(motorComJogo.team, { mostrar_artilheiro: true, mostrar_destaque: true });
      const { page, ctx, erros } = await abrirCena(navegador, base, motorComJogo, `/time/${SLUG}/jogo/g18`, { largura });
      await page.getByRole('button', { name: 'Criar campeonato com estes times' }).waitFor({ timeout: 25000 });
      await page.getByRole('button', { name: 'Criar campeonato com estes times' }).click();
      await page.locator('[data-seletor-de-formato]').waitFor();
      const ids = await page.locator('[data-formato]').evaluateAll((els) => els.map((e) => e.dataset.formato));
      t(`${largura}px · do sorteio: os 3 formatos aparecem (4 times)`, ids.join() === 'pontos,pontos_final,mata', ids.join());
      const linhas = await page.locator('[data-formato] .camp-fopt__d').allInnerTexts();
      t(`${largura}px · do sorteio: cada linha fecha com a conta de jogos de 4 times`, linhas[1].endsWith('Com 4 times: 6 jogos + final.') && linhas[0].endsWith('Com 4 times: 6 jogos.') && linhas[2].endsWith('Com 4 times: 3 jogos.'), JSON.stringify(linhas));
      t(`${largura}px · do sorteio: nada é criado só por abrir a escolha`, motorComJogo.camps.size === 0 && !motorComJogo.pedidos.some((p) => p.metodo === 'POST' && p.pathname.includes('/campeonatos')), JSON.stringify(motorComJogo.pedidos.filter((p) => p.metodo === 'POST')));
      await page.locator('[data-formato="pontos_final"]').click();
      t(`${largura}px · do sorteio: "Todos contra todos + final" selecionado`, (await page.locator('[data-formato].on').getAttribute('data-formato')) === 'pontos_final');
      t(`${largura}px · do sorteio: a escolha cabe, sem rolar para o lado nem cortar`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
      await page.locator('[data-seletor-de-formato]').scrollIntoViewIfNeeded();
      await foto(page, { path: captura(`30k-do-sorteio-${largura}.png`), fullPage: true });
      await page.locator('[data-criar-campeonato]').click();
      await page.locator('.camp-final').waitFor({ timeout: 25000 });
      const criado = [...motorComJogo.camps.values()][0];
      const corpoDoPedido = motorComJogo.pedidos.find((p) => p.pathname.endsWith('/de-sorteio'))?.corpo;
      t(`${largura}px · do sorteio: "Criar campeonato" manda o jogo e o formato escolhido`, corpoDoPedido?.formato === 'pontos_final' && corpoDoPedido?.game_id === 'g18', JSON.stringify(corpoDoPedido));
      t(`${largura}px · do sorteio: nasce o campeonato com os 4 times e os jogadores, e a tela abre nele`, criado?.formato === 'pontos_final' && criado.times.length === 4 && criado.times[0].jogadores.length === 2 && (await page.locator('[data-jogo]').count()) === 6);
      t(`${largura}px · sem erro de script (do sorteio)`, semErrosReais(erros).length === 0, semErrosReais(erros).join(' | '));
      await ctx.close();
    }
  }
}
