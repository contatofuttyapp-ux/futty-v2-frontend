// Prova no navegador da Rodada 29S, bloco B (o Jogo passado em passo a passo): o que só um Chromium de verdade confirma, com as MESMAS fontes e o MESMO CSS do app.
//   · os quatro passos (Quando foi · Quem jogou · Times · Como terminou), tudo no passado; cada passo é UMA entrada do histórico: o Voltar do sistema e o chevron
//     do topo recuam um passo, e o que a pessoa preencheu fica;
//   · NADA é gravado antes do "Salvar jogo"; ao salvar, a sequência: jogo (histórico) → presenças → times à mão → resultado → resultado do feed;
//   · "Pular" salva sem times; 3 ou 4 times: tocar no campeão; o time que não conta gols não vê "Gols de cada um";
//   · se um pedido falha no meio, "Tentar de novo" continua de onde parou, sem criar outro jogo;
//   · a barra de 4 passos e cada passo cabem em 360 e 390 px.
// O motor é de mentira (/api/** respondido por page.route) e a sessão também (chave do Supabase no localStorage): nada sai para a rede.
import { readFileSync } from 'node:fs';

export const nome = 'Rodada 29S-B (Jogo passado: quatro passos no passado, gravado só no fim, retomada, Voltar do sistema)';

const DIA = 86400000;
const SP = 'America/Sao_Paulo';

const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const SESSAO = JSON.stringify({
  access_token: 'prova', refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
  user: { id: 'U1', aud: 'authenticated', email: 'prova@futty.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
});

const NOMES = ['Ana', 'Beto', 'Caio', 'Duda'];

// O motor de mentira. `falhaUmaVezEm`: o primeiro pedido que passa por esse caminho volta 500 (a prova de "Tentar de novo").
function criarMotor({ flags = {}, falhaUmaVezEm = null } = {}) {
  const chamadas = [];
  let jaFalhou = false;
  const team = { id: 'T2', slug: 'varzea-fc', nome: 'Várzea FC', cidade: 'Brasília - DF', fuso: SP, cor: 'azul', escudo_cor2: 'ouro', escudo_padrao: 'faixa', role: 'admin', joga: true, jogadores_por_time: 5, mostrar_gols: true, modo_visibilidade: 'privado', logo_url: null, ...flags };
  const members = [
    ...NOMES.map((n, i) => ({ id: `U${i + 10}`, nome: n, role: 'member', joga: true, goleiro: false, avatar_url: null })),
    { id: 'U20', nome: 'Edu', role: 'admin', joga: false, goleiro: false, avatar_url: null }, // só organiza o time: não entra no jogo
  ];
  return {
    chamadas,
    resposta(pathname, metodo, corpo) {
      if (metodo === 'GET') return pathname === '/api/teams/varzea-fc' ? { status: 200, corpo: { team, members } } : { status: 200, corpo: {} };
      chamadas.push({ metodo, caminho: pathname, corpo });
      if (falhaUmaVezEm && !jaFalhou && pathname.endsWith(falhaUmaVezEm)) { jaFalhou = true; return { status: 500, corpo: { error: 'Não deu para completar agora. Tente de novo.' } }; }
      if (metodo === 'POST' && pathname === '/api/games') return { status: 201, corpo: { game: { id: 'G9' } } };
      return { status: 200, corpo: { ok: true } };
    },
  };
}

function criarRoteador(base, motor) {
  const origem = new URL(base).host;
  return (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.pathname.startsWith('/api/')) {
      const bruto = req.postData();
      const { status, corpo } = motor.resposta(u.pathname, req.method(), bruto ? JSON.parse(bruto) : null);
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(corpo) });
    }
    if (u.host === origem) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  };
}

async function abrir(navegador, base, { largura = 390, altura = 844, motor = criarMotor() } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: largura, height: altura }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: SP });
  await ctx.addInitScript(({ chave, sessao }) => {
    try { localStorage.setItem('futty_cookies', 'aceite'); localStorage.setItem(chave, sessao); } catch { /* sem storage */ }
  }, { chave: `sb-${REF}-auth-token`, sessao: SESSAO });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.route('**/*', criarRoteador(base, motor));
  await page.goto(`${base}/scripts/provas/rodada-29s-b.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-casa]').waitFor({ timeout: 20000 });
  // A entrada nasce como o roteador a faria (com `idx`): o chevron do topo só recua se há uma entrada interna antes dele.
  await page.evaluate(() => { window.history.pushState({ usr: null, key: 'prova', idx: 1 }, '', '/time/varzea-fc/jogo/passado'); window.dispatchEvent(new PopStateEvent('popstate')); });
  await page.locator('[data-barra-de-passos]').waitFor({ timeout: 25000 });
  await page.evaluate(() => document.fonts.ready.then(() => true));
  return { ctx, page, erros, motor };
}

const proxima = (dias) => new Date(Date.now() + dias * DIA).toLocaleDateString('sv-SE', { timeZone: SP }); // AAAA-MM-DD no relógio do time
const passoDaTela = (page) => page.locator('[data-jogo-passado-passo]').getAttribute('data-jogo-passado-passo');
const passoDoHistorico = (page) => page.evaluate(() => window.history.state?.usr?.passo ?? null);
const texto = (page) => page.locator('body').innerText();
const horaNoCampo = (iso) => new Date(iso).toLocaleTimeString('sv-SE', { timeZone: SP, hour: '2-digit', minute: '2-digit' });
async function esperarPasso(page, n) {
  await page.waitForFunction((x) => document.querySelector('[data-jogo-passado-passo]')?.getAttribute('data-jogo-passado-passo') === String(x), n, { timeout: 8000 });
}
// FUTTY_PROVA_PRINTS=<pasta>: guarda uma imagem de cada estado importante (para a Freaky olhar). Sem a variável, nada é gravado.
async function imagem(page, nomeDoArquivo) {
  if (process.env.FUTTY_PROVA_PRINTS) await page.screenshot({ path: `${process.env.FUTTY_PROVA_PRINTS}/${nomeDoArquivo}.png` });
}

// Os passos 1 e 2 já preenchidos: uma data passada (3 dias atrás, 20:00) e Ana (no gol), Beto e Caio marcados, mais um convidado sem app.
async function ateOPasso2(page, { local = 'Society Madalena' } = {}) {
  await page.locator('#data').fill(proxima(-3));
  await page.locator('#local').fill(local);
  await page.locator('[data-continuar]').click();
  await esperarPasso(page, 2);
}
const marcar = (page, nomeDoMembro) => page.locator('[data-quem-jogou] label', { hasText: nomeDoMembro }).first().locator('input[type="checkbox"]').check();
async function marcarOsQueJogaram(page, { convidado = true } = {}) {
  await marcar(page, 'Ana');
  await page.locator('[data-quem-jogou] .check-inline input').first().check(); // o GOL da Ana (a única linha com GOL por enquanto)
  await marcar(page, 'Beto');
  await marcar(page, 'Caio');
  if (convidado) {
    await page.getByPlaceholder('Nome de quem jogou').fill('Zé da Esquina');
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
  }
}
const chip = (page, regex) => page.locator('button.camp-chip', { hasText: regex });
async function montarOsTimes(page) {
  await chip(page, /^Time Ouro/).click();
  await chip(page, /Ana/).click();
  await chip(page, /Zé da Esquina/).click();
  await chip(page, /^Time Roxo/).click();
  await chip(page, /Beto/).click();
  await chip(page, /Caio/).click();
}

export async function rodar({ navegador, base, t }) {
  // ── o fluxo inteiro, com 2 times: passo a passo, Voltar do sistema, nada gravado antes do fim, sequência ao salvar ─────────────────────
  {
    const { ctx, page, erros, motor } = await abrir(navegador, base);

    // Passo 1 · Quando foi
    const itens = await page.locator('[data-barra-de-passos] li').allInnerTexts();
    t('a barra tem os 4 passos, na ordem: Quando foi · Quem jogou · Times · Como terminou', itens.map((s) => s.trim()).join('|') === 'Quando foi|Quem jogou|Times|Como terminou', itens.join('|'));
    t('o passo atual é o 1 ("Quando foi o jogo?"), marcado como passo atual para o leitor de tela', (await page.locator('[data-barra-de-passos] [aria-current="step"]').getAttribute('data-passo')) === '1' && /Quando foi o jogo\?/.test(await page.locator('[data-titulo-do-passo]').innerText()));
    t('a hora é opcional e já nasce em 20:00; o local também é opcional', (await page.locator('#hora').inputValue()) === '20:00' && /\(opcional\)/.test(await page.locator('label[for="hora"]').innerText()) && /\(opcional\)/.test(await page.locator('label[for="local"]').innerText()));
    t('Data · Hora do jogo · Local com os ícones do lucide e letra de 18 px', (await page.locator('label[for="data"] svg, label[for="hora"] svg, label[for="local"] svg').count()) === 3 && (await page.locator('#data').evaluate((el) => getComputedStyle(el).fontSize)) === '18px');
    t('a data só vai até hoje, no relógio do time', (await page.locator('#data').getAttribute('max')) === proxima(0));
    t('"Continuar" começa apagado: sem data não há para onde ir', await page.locator('[data-continuar]').isDisabled());

    // Uma data de amanhã (digitada à mão) não vale: o jogo passado já aconteceu.
    await page.locator('#data').fill(proxima(1));
    await page.locator('[data-continuar]').click();
    t('uma data que ainda não chegou não passa: "Esse jogo ainda não aconteceu. Confira a data e a hora." e o passo segue o 1', /Esse jogo ainda não aconteceu\. Confira a data e a hora\./.test(await texto(page)) && (await passoDaTela(page)) === '1');
    t('...e nada foi gravado', motor.chamadas.length === 0);

    await page.locator('#data').fill(proxima(-3));
    await page.locator('#local').fill('Society Madalena');
    await page.locator('[data-continuar]').click();
    await esperarPasso(page, 2);
    t('"Continuar" empurra uma entrada nova do histórico (passo 2), como no Criar time', (await passoDoHistorico(page)) === 2);

    // Passo 2 · Quem jogou
    const corpo2 = await texto(page);
    t('"Quem jogou?": os membros que jogam (quem só organiza o time, o Edu, não aparece)', /Quem jogou\?/.test(corpo2) && (await page.locator('[data-quem-jogou] label').filter({ hasText: /^(Ana|Beto|Caio|Duda)$/ }).count()) === 4 && !/Edu/.test(await page.locator('[data-quem-jogou]').innerText()));
    t('o convidado sem app, no passado: "Alguém sem o app jogou?", "Escreva o nome: entra no jogo, mas não conta no ranking.", campo "Nome de quem jogou" e "Adicionar"',
      (await page.locator('[data-convidado-titulo]').innerText()) === 'Alguém sem o app jogou?' && (await page.locator('[data-convidado-linha]').innerText()) === 'Escreva o nome: entra no jogo, mas não conta no ranking.' && (await page.getByPlaceholder('Nome de quem jogou').count()) === 1 && (await page.getByRole('button', { name: 'Adicionar', exact: true }).count()) === 1);
    t('"Continuar" apagado até marcar alguém, com "Marque pelo menos 1 jogador."', await page.locator('[data-continuar]').isDisabled() && /Marque pelo menos 1 jogador\./.test(corpo2));
    t('só quem jogou ganha o selo GOL', (await page.locator('[data-quem-jogou] .check-inline').count()) === 0);
    await marcarOsQueJogaram(page);
    t('marcar alguém liga o selo GOL na linha dele; o convidado entra como chip', (await page.locator('[data-quem-jogou] .check-inline').count()) === 3 && (await page.locator('.chips-row .chip', { hasText: 'Zé da Esquina' }).count()) === 1);
    await imagem(page, 'jogo-passado-quem-jogou');
    await page.locator('[data-continuar]').click();
    await esperarPasso(page, 3);

    // Passo 3 · Times
    const corpo3 = await texto(page);
    t('"Como ficaram os times?" com 2, 3 ou 4 times, o título "Quem jogou em cada time" e a ajuda no passado', /Como ficaram os times\?/.test(corpo3) && (await page.locator('.chips-row .chip').allInnerTexts()).join() === '2,3,4' && (await page.locator('[data-titulo-dos-times]').innerText()) === 'Quem jogou em cada time' && (await page.locator('[data-ajuda-dos-times]').innerText()) === 'Toque num time e depois em quem jogou nele.');
    t('...sem "Monte os times", sem "(opcional)" e sem o exemplo "5º A vs 5º B" (aqui não é texto de campeonato de escola)', !/Monte os times|\(opcional\)|5º A vs 5º B|Quem sobra não joga/.test(corpo3));
    t('quem pode estar nos times: os 3 marcados e o convidado ("conv."), ninguém mais', await (async () => { const d = (await page.locator('button.camp-chip').allInnerTexts()).join(' ').toLowerCase(); return ['ana', 'beto', 'caio', 'zé da esquina'].every((n) => d.includes(n)) && !d.includes('duda') && !d.includes('edu'); })());
    t('"Continuar" apagado até cada time ter 1 jogador ("Cada time precisa de pelo menos 1 jogador."); "Pular" está lá', await page.locator('[data-continuar]').isDisabled() && /Cada time precisa de pelo menos 1 jogador\./.test(corpo3) && (await page.locator('[data-pular]').count()) === 1);
    await montarOsTimes(page);
    t('com 1 jogador em cada time, "Continuar" acende', await page.locator('[data-continuar]').isEnabled());

    // O Voltar do sistema recua UM passo e o que foi preenchido fica.
    await page.goBack();
    await esperarPasso(page, 2);
    t('o Voltar do sistema recua um passo: do 3 para o 2', (await passoDaTela(page)) === '2');
    t('...e o que foi marcado ficou (Ana, Beto, Caio, o GOL e o convidado)', await (async () => {
      const marcados = await page.locator('[data-quem-jogou] input[type="checkbox"]:checked').count();
      return marcados === 4 && (await page.locator('.chips-row .chip', { hasText: 'Zé da Esquina' }).count()) === 1; // 3 "jogou" + 1 GOL
    })());
    await page.goForward();
    await esperarPasso(page, 3);
    t('avançar de novo traz o passo 3 com os times como foram montados', (await chip(page, /Ana/).count()) >= 1 && (await page.locator('button.camp-chip', { hasText: /^Time Ouro · 2/ }).count()) === 1);
    // O chevron do topo faz o mesmo que o Voltar do sistema.
    await page.getByRole('button', { name: 'Voltar' }).first().click();
    await esperarPasso(page, 2);
    t('o chevron do topo também recua um passo', (await passoDaTela(page)) === '2');
    await page.goForward();
    await esperarPasso(page, 3);
    t('nada foi gravado até aqui, três passos depois', motor.chamadas.length === 0, JSON.stringify(motor.chamadas));

    await page.locator('[data-continuar]').click();
    await esperarPasso(page, 4);

    // Passo 4 · Como terminou
    const corpo4 = await texto(page);
    t('"Como terminou?" com o resumo no passado (dia por extenso, hora, quantos jogaram, quantos times)', /Como terminou\?/.test(corpo4) && /^(Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo), \d{1,2} de [a-zç]{3}\. · 20:00 · 4 jogaram · 2 times$/.test((await page.locator('[data-resumo]').innerText()).trim()), await page.locator('[data-resumo]').innerText());
    t('UMA pergunta para quem ganhou: "Quem ganhou?" com Time Ouro · Empate · Time Roxo', /Quem ganhou\?/.test(corpo4) && (await page.locator('[data-vencedor]').allInnerTexts()).join('|').toLowerCase() === 'time ouro|empate|time roxo');
    t('o placar e os gols de cada um só aparecem depois de responder', (await page.locator('[data-placar]').count()) === 0 && (await page.locator('[data-gols-de-cada-um]').count()) === 0);
    t('o que o time conta: "Artilheiro do dia" e "Destaque do dia"; nada de foto nem de rodada de cerveja', /Artilheiro do dia/i.test(corpo4) && /Destaque do dia/i.test(corpo4) && !/Rodada de cerveja|Foto d/.test(corpo4));
    await page.locator('[data-vencedor="B"]').click();
    t('responder abre o placar (opcional, vazio) e "Gols de cada um" só com quem tem conta (o convidado não)', (await page.locator('[data-placar]').count()) === 2 && (await page.locator('[data-placar="a"]').inputValue()) === '' && (await page.locator('[data-gols-de-cada-um]').innerText()).toLowerCase() === 'gols de cada um' && (await page.locator('[data-resultado-editor] [aria-label="Mais"]').count()) === 3);
    // Beto +2, Caio +1: o placar mostra a soma enquanto a pessoa não mexe nele.
    const mais = page.locator('[data-resultado-editor] [aria-label="Mais"]');
    await mais.nth(1).click(); await mais.nth(1).click(); await mais.nth(2).click();
    t('os gols do Beto (2) e do Caio (1) viram o placar 0 × 3 (do Time Roxo), que a pessoa ainda pode mudar', (await page.locator('[data-placar="a"]').inputValue()) === '0' && (await page.locator('[data-placar="b"]').inputValue()) === '3');
    await page.locator('label', { hasText: 'Destaque do dia' }).locator('input[type="checkbox"]').check();
    await page.locator('select').selectOption({ label: 'Beto' });
    await imagem(page, 'jogo-passado-como-terminou');
    t('o botão é "Salvar jogo" e, ainda assim, nada foi gravado', /Salvar jogo/i.test(await page.locator('[data-salvar-jogo]').innerText()) && motor.chamadas.length === 0, JSON.stringify(motor.chamadas));

    // SALVAR: a sequência.
    await page.locator('[data-salvar-jogo]').click();
    await page.locator('[data-jogo-salvo]').waitFor({ timeout: 10000 });
    const seq = motor.chamadas.map((c) => `${c.metodo} ${c.caminho}`);
    t('"Salvar jogo" grava em sequência: jogo → presenças → times à mão → resultado do jogo → resultado do feed', seq.join(' > ') === 'POST /api/games > POST /api/games/G9/presencas > POST /api/games/G9/times-manuais > PATCH /api/games/G9/resultado > PATCH /api/feed/games/G9/resultado', seq.join(' > '));
    const [jogo, presencas, times, resultado, feed] = motor.chamadas.map((c) => c.corpo);
    t('o jogo é histórico (não avisa ninguém), às 20:00 do relógio do time, com o local, e sem jogadores_por_time (vale o padrão do time)', jogo.historico === true && jogo.team_slug === 'varzea-fc' && jogo.local === 'Society Madalena' && horaNoCampo(jogo.data) === '20:00' && !('jogadores_por_time' in jogo), JSON.stringify(jogo));
    t('as presenças: só quem tem conta, com o selo GOL da Ana', JSON.stringify(presencas.jogadores) === JSON.stringify([{ user_id: 'U10', goleiro: true }, { user_id: 'U11', goleiro: false }, { user_id: 'U12', goleiro: false }]), JSON.stringify(presencas));
    t('os times à mão: Time Ouro (Ana + o convidado só com o nome) e Time Roxo (Beto e Caio)', times.times.length === 2 && times.times[0].nome === 'Time Ouro' && times.times[0].jogadores.map((j) => j.nome).join() === 'Ana,Zé da Esquina' && times.times[0].jogadores[1].user_id === null && times.times[0].jogadores[1].convidado === true && times.times[1].jogadores.map((j) => j.user_id).join() === 'U11,U12', JSON.stringify(times));
    t('quem ganhou vai para os DOIS campos: time_vencedor "B" no resultado do jogo (com placar 0 × 3 e os gols) e campeao_time_index 1 no do feed', resultado.nivel === 3 && resultado.time_vencedor === 'B' && resultado.placar_a === 0 && resultado.placar_b === 3 && resultado.gols.find((g) => g.user_id === 'U11').gols === 2 && feed.campeao_time_index === 1 && feed.destaque_user_id === 'U11', JSON.stringify([resultado, feed]));
    t('depois de salvar, vai para o jogo (/time/varzea-fc/jogo/G9)', (await page.locator('[data-jogo-salvo]').getAttribute('data-caminho')) === '/time/varzea-fc/jogo/G9');
    t('o Jogo passado roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ── recarregar no meio: o formulário não sobrevive, então volta ao passo 1 (como no Criar time) ────────────────────────────────────────
  {
    const { ctx, page, motor } = await abrir(navegador, base);
    await ateOPasso2(page);
    await marcar(page, 'Ana');
    await page.locator('[data-continuar]').click();
    await esperarPasso(page, 3);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-barra-de-passos]').waitFor({ timeout: 25000 });
    t('recarregar no passo 3 volta ao passo 1 (o formulário não sobrevive; a entrada do histórico sim)', (await passoDaTela(page)) === '1' && (await page.locator('#data').inputValue()) === '');
    t('...e nada foi gravado', motor.chamadas.length === 0);
    await ctx.close();
  }

  // ── "Pular": salva sem times; só o que o time conta aparece no passo 4 ────────────────────────────────────────────────────────────────
  {
    const { ctx, page, motor } = await abrir(navegador, base);
    await ateOPasso2(page);
    await marcarOsQueJogaram(page, { convidado: false });
    await page.locator('[data-continuar]').click();
    await esperarPasso(page, 3);
    await page.locator('[data-pular]').click();
    await esperarPasso(page, 4);
    const corpo = await texto(page);
    t('"Pular" leva ao passo 4 SEM times: "Quem ganhou?" nem aparece; sobram "Artilheiro do dia" e "Destaque do dia"', !/Quem ganhou\?|Quem foi o campeão\?/.test(corpo) && /Artilheiro do dia/i.test(corpo) && /Destaque do dia/i.test(corpo) && !/ times$/.test((await page.locator('[data-resumo]').innerText()).trim()));
    await page.locator('label', { hasText: 'Artilheiro do dia' }).locator('input[type="checkbox"]').check();
    await page.locator('select').selectOption({ label: 'Caio' });
    await page.locator('[data-salvar-jogo]').click();
    await page.locator('[data-jogo-salvo]').waitFor({ timeout: 10000 });
    const seq = motor.chamadas.map((c) => `${c.metodo} ${c.caminho}`);
    t('salvar sem times grava só o jogo, as presenças e o prêmio (artilheiro): nada de times nem de resultado do jogo', seq.join(' > ') === 'POST /api/games > POST /api/games/G9/presencas > PATCH /api/feed/games/G9/resultado' && motor.chamadas[2].corpo.artilheiro_user_id === 'U12' && motor.chamadas[2].corpo.artilheiro_gols === 1 && !('campeao_time_index' in motor.chamadas[2].corpo), seq.join(' > '));
    await ctx.close();
  }

  // ── 3 times: tocar no campeão; o motor só recebe campeao_time_index ───────────────────────────────────────────────────────────────────────
  {
    const { ctx, page, motor } = await abrir(navegador, base);
    await ateOPasso2(page);
    await marcarOsQueJogaram(page, { convidado: false });
    await page.locator('[data-continuar]').click();
    await esperarPasso(page, 3);
    await page.locator('.chips-row .chip', { hasText: /^3$/ }).click();
    await chip(page, /^Time Ouro/).click(); await chip(page, /Ana/).click();
    await chip(page, /^Time Roxo/).click(); await chip(page, /Beto/).click();
    await chip(page, /^Time Prata/).click(); await chip(page, /Caio/).click();
    await page.locator('[data-continuar]').click();
    await esperarPasso(page, 4);
    t('com 3 times a pergunta é "Quem foi o campeão?" (tocar no time) — sem "Quem ganhou?", sem placar e sem lista de gols', /Quem foi o campeão\?/i.test(await texto(page)) && !/Quem ganhou\?/.test(await texto(page)) && (await page.locator('[data-campeao-time]').count()) === 3 && (await page.locator('[data-placar], [data-gols-de-cada-um]').count()) === 0);
    await page.locator('[data-campeao-time="2"]').click();
    t('o campeão marcado fica marcado; tocar de novo desfaz', (await page.locator('[data-campeao-time="2"]').getAttribute('aria-pressed')) === 'true');
    await page.locator('[data-salvar-jogo]').click();
    await page.locator('[data-jogo-salvo]').waitFor({ timeout: 10000 });
    const seq = motor.chamadas.map((c) => `${c.metodo} ${c.caminho}`);
    t('salvar com 3 times: jogo → presenças → times → resultado do feed (campeao_time_index 2); o resultado do jogo nem sai (só entende A, B ou empate)', seq.join(' > ') === 'POST /api/games > POST /api/games/G9/presencas > POST /api/games/G9/times-manuais > PATCH /api/feed/games/G9/resultado' && motor.chamadas[3].corpo.campeao_time_index === 2 && motor.chamadas[2].corpo.times.length === 3, seq.join(' > '));
    await ctx.close();
  }

  // ── o time que não conta gols e não conta destaque: o passo 4 não oferece nada disso ──────────────────────────────────────────────────────
  {
    const { ctx, page } = await abrir(navegador, base, { motor: criarMotor({ flags: { mostrar_gols: false, mostrar_destaque: false } }) });
    await ateOPasso2(page);
    await marcarOsQueJogaram(page);
    await page.locator('[data-continuar]').click();
    await esperarPasso(page, 3);
    await montarOsTimes(page);
    await page.locator('[data-continuar]').click();
    await esperarPasso(page, 4);
    await page.locator('[data-vencedor="A"]').click();
    const corpo = await texto(page);
    t('time sem gols e sem destaque: "Quem ganhou?" e o placar, mas nada de "Gols de cada um", "Artilheiro do dia" nem "Destaque do dia"', /Quem ganhou\?/.test(corpo) && (await page.locator('[data-placar]').count()) === 2 && !/Gols de cada um|Artilheiro do dia|Destaque do dia/i.test(corpo));
    await ctx.close();
  }

  // ── uma chamada falha no meio: "Tentar de novo" continua de onde parou, sem criar outro jogo ──────────────────────────────────────────────
  {
    const { ctx, page, motor } = await abrir(navegador, base, { motor: criarMotor({ falhaUmaVezEm: '/presencas' }) });
    await ateOPasso2(page);
    await marcarOsQueJogaram(page, { convidado: false });
    await page.locator('[data-continuar]').click();
    await esperarPasso(page, 3);
    await page.locator('[data-pular]').click();
    await esperarPasso(page, 4);
    await page.locator('[data-salvar-jogo]').click();
    await page.locator('[data-erro-ao-salvar]').waitFor({ timeout: 10000 });
    const aviso = await page.locator('[data-erro-ao-salvar]').innerText();
    t('o pedido das presenças falha: a pessoa FICA no passo 4, com o aviso ("O jogo já foi criado e o que deu certo ficou salvo. Toque em Tentar de novo.")', (await passoDaTela(page)) === '4' && /Não deu para completar agora\. Tente de novo\./.test(aviso) && /O jogo já foi criado e o que deu certo ficou salvo\./.test(aviso) && /Tentar de novo/.test(aviso), aviso);
    t('o botão vira "Tentar de novo" e o "← voltar" some (o jogo já existe: não dá para mudar quem jogou por aqui)', /Tentar de novo/i.test(await page.locator('[data-salvar-jogo]').innerText()) && (await page.getByRole('button', { name: '← voltar' }).count()) === 0);
    t('...até o Voltar do sistema fica no passo 4', await (async () => { await page.goBack(); await page.waitForTimeout(300); return (await passoDaTela(page)) === '4'; })());
    t('até aqui: só o jogo foi criado (uma vez)', motor.chamadas.filter((c) => c.caminho === '/api/games').length === 1 && motor.chamadas.length === 2, JSON.stringify(motor.chamadas.map((c) => c.caminho)));
    await page.locator('[data-salvar-jogo]').click();
    await page.locator('[data-jogo-salvo]').waitFor({ timeout: 10000 });
    const seq = motor.chamadas.map((c) => `${c.metodo} ${c.caminho}`);
    t('"Tentar de novo" continua de onde parou: nenhum jogo novo; só as presenças que faltavam', motor.chamadas.filter((c) => c.metodo === 'POST' && c.caminho === '/api/games').length === 1 && seq.slice(-1)[0] === 'POST /api/games/G9/presencas' && seq.length === 3, seq.join(' > '));
    await ctx.close();
  }

  // ── "avançar" do navegador com um passo desfeito: nada é gravado até a pendência ser resolvida ───────────────────────────────────────────
  {
    const { ctx, page, motor } = await abrir(navegador, base);
    await ateOPasso2(page);
    await marcarOsQueJogaram(page);
    await page.locator('[data-continuar]').click();
    await esperarPasso(page, 3);
    await montarOsTimes(page);
    await page.locator('[data-continuar]').click();
    await esperarPasso(page, 4);
    t('com tudo em ordem, nenhuma pendência aparece no passo 4 e o "Salvar jogo" está aceso', (await page.locator('[data-falta]').count()) === 0 && (await page.locator('[data-salvar-jogo]').isEnabled()));
    await page.goBack();
    await page.goBack();
    await esperarPasso(page, 2);
    await page.locator('[data-quem-jogou] label', { hasText: 'Beto' }).first().locator('input[type="checkbox"]').uncheck();
    await page.locator('[data-quem-jogou] label', { hasText: 'Caio' }).first().locator('input[type="checkbox"]').uncheck();
    await page.goForward();
    await page.goForward();
    await esperarPasso(page, 4);
    t('voltar dois passos, desmarcar quem jogava no Time Roxo e "avançar" do navegador até o passo 4: "Salvar jogo" apagado e a linha "Tem time sem jogador. Volte ao passo Times."', (await page.locator('[data-salvar-jogo]').isDisabled()) && /Tem time sem jogador\. Volte ao passo Times\./.test(await page.locator('[data-falta]').innerText()));
    t('...e nada foi gravado', motor.chamadas.length === 0);
    await ctx.close();
  }

  // ── a barra e cada passo cabem em 360 e 390 px (o celular menor que a casa mede) ───────────────────────────────────────────────────────────
  for (const largura of [360, 390]) {
    const { ctx, page } = await abrir(navegador, base, { largura, altura: 800 });
    const folgas = [];
    const medir = async (rotulo) => {
      const m = await page.evaluate(() => ({
        largura: document.documentElement.scrollWidth,
        cortados: [...document.querySelectorAll('[data-barra-de-passos] li > div:last-child')].filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent),
        fora: [...document.querySelectorAll('main button, main input, main select')].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1).length,
      }));
      folgas.push(`${rotulo}: largura ${m.largura}${m.cortados.length ? ` · rótulos cortados: ${m.cortados.join(', ')}` : ''}${m.fora ? ` · ${m.fora} controle(s) fora da tela` : ''}`);
      return m.largura <= largura && !m.cortados.length && !m.fora;
    };
    let ok = await medir('passo 1');
    await ateOPasso2(page);
    ok = (await medir('passo 2')) && ok;
    await marcarOsQueJogaram(page);
    await page.locator('[data-continuar]').click();
    await esperarPasso(page, 3);
    await montarOsTimes(page);
    ok = (await medir('passo 3')) && ok;
    await page.locator('[data-continuar]').click();
    await esperarPasso(page, 4);
    await page.locator('[data-vencedor="A"]').click();
    ok = (await medir('passo 4')) && ok;
    t(`em ${largura} px a barra de 4 passos mostra os rótulos inteiros e nenhum passo vaza para o lado`, ok, folgas.join(' | '));
    await ctx.close();
  }
}
