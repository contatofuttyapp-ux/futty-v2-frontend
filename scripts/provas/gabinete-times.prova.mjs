// Prova no navegador (Rodada 29Y): a aba Times do Gabinete ordenável (src/utils/ordenarTimes.js), num Chromium, com o motor de mentira.
//   · padrão: Nome A–Z em ordem de dicionário PT-BR ("Éden" junto do E, "gajos" junto do G, sem diferença de maiúscula);
//   · o seletor "Ordenar por" e os títulos andam juntos: o segundo clique no título inverte, com ▲/▼ e aria-sort na coluna ativa;
//   · a escolha fica lembrada: recarregar a página e voltar à aba Times mantém o critério;
//   · suspender e excluir um time não desfazem a ordem escolhida;
//   · a página não ganha rolagem lateral no celular (390 e 360 px); a tabela rola dentro do cartão.
// Com FUTTY_PROVA_PRINTS=<pasta> grava o print da ordenação por membros (para olhar).
export const nome = 'Gabinete · aba Times: ordenação (padrão A–Z, seletor, títulos, lembrada, suspender e excluir)';

const TIMES_INICIAIS = [
  { id: 't-gajos', slug: 'gajos-fc', nome: 'gajos', nr_membros: 12, created_at: '2026-03-05T12:00:00Z', suspensa: false },
  { id: 't-eden', slug: 'eden', nome: 'Éden', nr_membros: 3, created_at: '2026-01-10T12:00:00Z', suspensa: true },
  { id: 't-abacaxi', slug: 'abacaxi-fc', nome: 'Abacaxi FC', nr_membros: 25, created_at: '2026-06-01T12:00:00Z', suspensa: false },
  { id: 't-zebra', slug: 'zebra-sul', nome: 'Zebra do Sul', nr_membros: 12, created_at: '2025-12-20T12:00:00Z', suspensa: false },
  { id: 't-gaviao', slug: 'gaviaes', nome: 'Gaviões', nr_membros: 0, created_at: '2026-02-14T12:00:00Z', suspensa: false },
  { id: 't-edna', slug: 'edna', nome: 'Edna', nr_membros: 25, created_at: '2026-04-02T12:00:00Z', suspensa: false },
];

const A_Z = ['Abacaxi FC', 'Éden', 'Edna', 'gajos', 'Gaviões', 'Zebra do Sul'];
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// O motor de mentira: a lista guarda o que o suspender e o excluir mudam, como o banco faria.
function motor() {
  let times = TIMES_INICIAIS.map((t) => ({ ...t }));
  return {
    responder(metodo, caminho, corpo) {
      if (metodo === 'GET' && caminho === '/api/super/teams') return { teams: times.map((t) => ({ ...t })) };
      const suspender = caminho.match(/^\/api\/super\/teams\/([^/]+)\/suspender$/);
      if (metodo === 'PATCH' && suspender) {
        const suspensa = JSON.parse(corpo || '{}').suspensa === true;
        times = times.map((t) => (t.id === suspender[1] ? { ...t, suspensa } : t));
        return { id: suspender[1], suspensa };
      }
      const apagar = caminho.match(/^\/api\/super\/teams\/([^/]+)$/);
      if (metodo === 'DELETE' && apagar) {
        times = times.filter((t) => t.id !== apagar[1]);
        return { ok: true };
      }
      return {};
    },
  };
}

// /api/** vem do motor de mentira; o Vite da prova passa; qualquer outra coisa (Supabase, fontes externas) recebe {} e nada sai.
function rotear(mentira, base) {
  const origem = new URL(base).host;
  return (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.pathname.startsWith('/api/')) {
      const resposta = mentira.responder(req.method(), u.pathname, req.postData());
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resposta) });
    }
    if (u.host === origem) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  };
}

async function abrirTimes(page, base) {
  await page.goto(`${base}/scripts/provas/gabinete-times.html`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Times', exact: true }).click();
  await page.locator('table tbody tr').first().waitFor({ timeout: 15000 });
}

const nomesNaTabela = (page) => page.locator('table tbody tr td:first-child').allInnerTexts();

// A tela atualiza depois do clique (a lista vem de novo do motor): espera a ordem esperada aparecer; devolve a última lida.
async function ordemAteFicar(page, esperada, ms = 5000) {
  const fim = Date.now() + ms;
  let atual = [];
  while (Date.now() < fim) {
    atual = await nomesNaTabela(page);
    if (igual(atual, esperada)) return atual;
    await page.waitForTimeout(50);
  }
  return atual;
}

// O título da coluna: o aria-sort e o texto (com a seta ▲/▼ quando a coluna é a ativa). textContent, não innerText:
// o título é CAIXA-ALTA por CSS (text-transform), e o innerText devolve a caixa que se VÊ, não a que está escrita.
async function titulo(page, rotulo) {
  const th = page.locator('th', { has: page.locator('button', { hasText: rotulo }) }).first();
  return { aria: await th.getAttribute('aria-sort'), texto: ((await th.textContent()) || '').replace(/\s+/g, ' ').trim() };
}
const clicarTitulo = (page, rotulo) => page.locator('th button', { hasText: rotulo }).click();
const escolher = (page, chave) => page.locator('label select').selectOption(chave);
const valorDoSeletor = (page) => page.locator('label select').inputValue();
const linhaDe = (page, nomeExato) => page.locator('tbody tr', { has: page.locator('td', { hasText: new RegExp(`^${nomeExato}$`) }) });

async function imagem(page, arquivo) {
  if (process.env.FUTTY_PROVA_PRINTS) await page.screenshot({ path: `${process.env.FUTTY_PROVA_PRINTS}/${arquivo}.png` });
}

export async function rodar({ navegador, base, t }) {
  const erros = [];
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => erros.push(e.message));
  // Confirmação do suspender (confirm) e do excluir (prompt, que pede "APAGAR"): a prova responde como uma pessoa faria.
  page.on('dialog', async (d) => (d.type() === 'prompt' ? d.accept('APAGAR') : d.accept()));
  await page.route('**/*', rotear(motor(), base));
  await abrirTimes(page, base);

  // ── padrão ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const padrao = await ordemAteFicar(page, A_Z);
  t('padrão: Nome A–Z em ordem de dicionário PT-BR (sem diferença de maiúscula nem de acento)', igual(padrao, A_Z), padrao.join(' | '));
  t('o total ao lado do seletor: "6 times"', (await page.getByText('6 times', { exact: true }).count()) === 1);
  const titNome = await titulo(page, 'Nome');
  t('o seletor começa em "Nome (A–Z)"; o título Nome leva ▲ e aria-sort ascending',
    (await valorDoSeletor(page)) === 'nome_az' && igual(titNome, { aria: 'ascending', texto: 'Nome ▲' }), JSON.stringify(titNome));
  const opcoes = await page.locator('label select option').allInnerTexts();
  t('o seletor tem os oito critérios: os sete pedidos + "Ativos primeiro" (o inverso de Suspensos primeiro)',
    igual(opcoes, ['Nome (A–Z)', 'Nome (Z–A)', 'Mais membros', 'Menos membros', 'Mais novos', 'Mais antigos', 'Suspensos primeiro', 'Ativos primeiro']), opcoes.join(' | '));

  // ── seletor: Mais membros (empate pelo nome, nas duas direções) ──────────────────────────────────────────────────────────────────
  await escolher(page, 'mais_membros');
  const porMembros = await ordemAteFicar(page, ['Abacaxi FC', 'Edna', 'gajos', 'Zebra do Sul', 'Éden', 'Gaviões']);
  t('"Mais membros": 25 e 25 desempatam por nome (Abacaxi FC, Edna); 12 e 12 (gajos, Zebra do Sul)', igual(porMembros, ['Abacaxi FC', 'Edna', 'gajos', 'Zebra do Sul', 'Éden', 'Gaviões']), porMembros.join(' | '));
  t('...o título Membros leva ▼ e aria-sort descending, e o seletor acompanha', igual(await titulo(page, 'Membros'), { aria: 'descending', texto: 'Membros ▼' }) && (await valorDoSeletor(page)) === 'mais_membros');
  await imagem(page, 'gabinete-times-mais-membros');

  // ── títulos: o primeiro clique vale o critério da coluna; o segundo inverte ──────────────────────────────────────────────────────
  await clicarTitulo(page, 'Membros');
  const menosMembros = await ordemAteFicar(page, ['Gaviões', 'Éden', 'gajos', 'Zebra do Sul', 'Abacaxi FC', 'Edna']);
  t('segundo clique em Membros inverte: "Menos membros" (▲) e o seletor acompanha', igual(menosMembros, ['Gaviões', 'Éden', 'gajos', 'Zebra do Sul', 'Abacaxi FC', 'Edna'])
    && igual(await titulo(page, 'Membros'), { aria: 'ascending', texto: 'Membros ▲' }) && (await valorDoSeletor(page)) === 'menos_membros', menosMembros.join(' | '));

  await clicarTitulo(page, 'Criado');
  const porCriado = await ordemAteFicar(page, ['Abacaxi FC', 'Edna', 'gajos', 'Gaviões', 'Éden', 'Zebra do Sul']);
  t('primeiro clique em Criado: "Mais novos" (▼) pela data de criação', igual(porCriado, ['Abacaxi FC', 'Edna', 'gajos', 'Gaviões', 'Éden', 'Zebra do Sul'])
    && igual(await titulo(page, 'Criado'), { aria: 'descending', texto: 'Criado ▼' }) && (await valorDoSeletor(page)) === 'mais_novos', porCriado.join(' | '));

  await clicarTitulo(page, 'Nome');
  t('primeiro clique em Nome, vindo de outra coluna: volta a A–Z', igual(await ordemAteFicar(page, A_Z), A_Z) && (await valorDoSeletor(page)) === 'nome_az');
  await clicarTitulo(page, 'Nome');
  const zA = await ordemAteFicar(page, [...A_Z].reverse());
  t('segundo clique em Nome: Z–A (▼), a inversa exata', igual(zA, [...A_Z].reverse()) && igual(await titulo(page, 'Nome'), { aria: 'descending', texto: 'Nome ▼' }), zA.join(' | '));

  await clicarTitulo(page, 'Estado');
  const suspensosPrimeiro = ['Éden', 'Abacaxi FC', 'Edna', 'gajos', 'Gaviões', 'Zebra do Sul'];
  t('primeiro clique em Estado: "Suspensos primeiro" (▼), com Éden no topo e o resto por nome',
    igual(await ordemAteFicar(page, suspensosPrimeiro), suspensosPrimeiro) && (await valorDoSeletor(page)) === 'suspensos_primeiro');

  // ── lembrada: recarregar a página e voltar à aba Times ──────────────────────────────────────────────────────────────────────────
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Times', exact: true }).click();
  await page.locator('table tbody tr').first().waitFor({ timeout: 15000 });
  t('a escolha fica lembrada: depois de recarregar e voltar à aba Times, segue "Suspensos primeiro"',
    (await valorDoSeletor(page)) === 'suspensos_primeiro' && igual(await ordemAteFicar(page, suspensosPrimeiro), suspensosPrimeiro));

  // ── suspender e excluir não desfazem a ordem ────────────────────────────────────────────────────────────────────────────────────
  await linhaDe(page, 'Edna').getByRole('button', { name: 'Suspender' }).click();
  await page.locator('[data-msg]', { hasText: 'Time suspenso' }).waitFor({ timeout: 8000 });
  const aposSuspender = ['Éden', 'Edna', 'Abacaxi FC', 'gajos', 'Gaviões', 'Zebra do Sul'];
  t('suspender "Edna": a ordem "Suspensos primeiro" continua e reordena pelo novo estado (Éden e Edna no topo)',
    igual(await ordemAteFicar(page, aposSuspender), aposSuspender) && (await valorDoSeletor(page)) === 'suspensos_primeiro');

  await linhaDe(page, 'gajos').getByRole('button', { name: 'Excluir' }).click();
  await page.getByText('5 times', { exact: true }).waitFor({ timeout: 8000 });
  const aposExcluir = ['Éden', 'Edna', 'Abacaxi FC', 'Gaviões', 'Zebra do Sul'];
  t('excluir "gajos": a lista segue em "Suspensos primeiro" e o total vira "5 times"',
    igual(await ordemAteFicar(page, aposExcluir), aposExcluir) && (await valorDoSeletor(page)) === 'suspensos_primeiro');

  // ── celular: a página não ganha rolagem lateral ─────────────────────────────────────────────────────────────────────────────────
  await ctx.close();
  for (const largura of [390, 360]) {
    const ctxM = await navegador.newContext({ viewport: { width: largura, height: 800 } });
    const pm = await ctxM.newPage();
    pm.on('pageerror', (e) => erros.push(e.message));
    await pm.route('**/*', rotear(motor(), base));
    await abrirTimes(pm, base);
    const larguraPagina = await pm.evaluate(() => document.documentElement.scrollWidth);
    t(`em ${largura} px a página não ganha rolagem lateral (a tabela rola dentro do cartão)`, larguraPagina <= largura, String(larguraPagina));
    await ctxM.close();
  }

  t('sem erro de script na aba Times', erros.length === 0, erros.join(' | '));
}
