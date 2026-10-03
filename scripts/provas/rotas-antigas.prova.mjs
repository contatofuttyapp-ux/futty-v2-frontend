// Prova no navegador (Rodada 29I, achado 103): o APP de verdade — as rotas em português de Portugal (/equipa/…, /criar-equipa) continuam valendo e
// levam para as novas (/time/…, /criar-time), com a query e o # de quem chegou (link já enviado no WhatsApp). Sem sessão: quem manda no que
// aparece depois é o login, e ele guarda de onde a pessoa veio (state.from) — é isso que se lê.
export const nome = 'Rotas: /equipa e /criar-equipa redirecionam para /time e /criar-time';

export async function rodar({ navegador, base, t }) {
  const casos = [
    ['/equipa/missa-de-quinta-ogqq6', '/time/missa-de-quinta-ogqq6', ''],
    ['/equipa/missa-de-quinta-ogqq6/ranking', '/time/missa-de-quinta-ogqq6/ranking', ''],
    ['/equipa/missa-de-quinta-ogqq6/jogo/abc/sorteio?x=1#topo', '/time/missa-de-quinta-ogqq6/jogo/abc/sorteio', '?x=1'],
    ['/equipa/missa-de-quinta-ogqq6?entrou=1', '/time/missa-de-quinta-ogqq6', '?entrou=1'],
    ['/equipa/missa-de-quinta-ogqq6/jogador/5b1c2d3e', '/time/missa-de-quinta-ogqq6/jogador/5b1c2d3e', ''],
    ['/criar-equipa', '/criar-time', ''],
    ['/time/missa-de-quinta-ogqq6/ranking', '/time/missa-de-quinta-ogqq6/ranking', ''], // o endereço novo segue como está
    ['/criar-time', '/criar-time', ''],
  ];
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 800 } });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  // o app tenta falar com o Supabase e o motor: tudo de mentira, nada sai da máquina
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    return u.hostname === '127.0.0.1' || u.hostname === 'localhost' ? route.continue() : route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  for (const [de, pathNovo, search] of casos) {
    await page.goto(`${base}${de}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.location.pathname === '/login', null, { timeout: 15000 }).catch(() => {});
    const de2 = await page.evaluate(() => window.history.state?.usr?.from || null);
    t(`${de.split('#')[0]} → ${pathNovo}${search}`, !!de2 && de2.pathname === pathNovo && (de2.search || '') === search, JSON.stringify(de2));
  }
  t('o app carrega sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
  await ctx.close();
}
