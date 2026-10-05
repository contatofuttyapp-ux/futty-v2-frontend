// Prova no navegador da Rodada 29Z: números em PT-BR e o app inteiro no celular estreito (360 px).
//   · NÚMEROS — o achado dos prints das lojas: "77.9 pontos" no Ranking e "9.10" no Início. Cada tela principal (Ranking, Início, Meu perfil,
//     vitrine do jogador, Elenco do admin, Gabinete → Dinheiro) é montada com números CHEIOS de casa decimal e o texto visível (mais
//     aria-label, title e placeholder) não pode ter nenhum "\d.\d": brasileiro escreve 77,9 e 9,1. A régua é a mesma da varredura.
//   · RANKING SEM RETICÊNCIAS — "77,9 pontos · nota 9,1" ao lado do botão "Alterar": em 360 e em 390 px os pontos e a nota aparecem inteiros
//     (em duas linhas se não couberem numa), sem texto aparado por reticências e sem rolar para o lado.
//   · CELULAR ESTREITO (item 3e) — em 360 × 780: o Novo jogo não corta mais (o cartão tem a coluna certa e data e hora empilham quando não
//     cabem lado a lado), o Radar não põe reticências no nome do time (quebra em duas linhas), o Perfil não espreme o nome do time em 16 px.
//     E as telas principais, todas, sem rolar para o lado nem cortar campo, botão ou nome — com nome de time de 48 letras.
// O motor é de mentira (/api/** respondido por page.route) e a sessão também (chave do Supabase plantada no localStorage): nada sai para a rede.
import { readFileSync } from 'node:fs';
import { medir } from '../medir-estreito.mjs';

export const nome = 'Rodada 29Z (números em PT-BR, Ranking sem reticências, celular de 360 px)';

const SP = 'America/Sao_Paulo';
const DIA = 86400000;
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const SESSAO = JSON.stringify({
  access_token: 'prova', refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
  user: { id: 'U1', aud: 'authenticated', email: 'prova@futty.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
});

const NOME_LONGO = 'Associação Esportiva Pelada do Núcleo Bandeirante'; // 48 letras: o pior caso que a tela precisa aguentar
const TIMES = [
  { id: 'T1', slug: 'missa', nome: NOME_LONGO, cidade: 'Brasília - DF', fuso: SP, cor: 'vinho', escudo_cor2: 'ouro', escudo_padrao: 'faixa', role: 'admin', joga: true, jogadores_por_time: 5 },
  { id: 'T2', slug: 'racha-asa-norte', nome: 'Racha da Asa Norte', cidade: 'Brasília - DF', fuso: SP, cor: 'azul', escudo_cor2: 'ouro', escudo_padrao: 'solido', role: 'membro', joga: true },
  { id: 'T3', slug: 'society-lago-sul', nome: 'Society Lago Sul', cidade: 'Brasília - DF', fuso: SP, cor: 'verde', escudo_cor2: 'ouro', escudo_padrao: 'aro', role: 'membro', joga: true },
];
const SEM = { pedidos: 0, presenca: null, resultado: null, denuncias: 0, total: 0 };
const seuTime = () => TIMES.map((t) => ({ team_id: t.id, slug: t.slug, nome: t.nome, fuso: SP, pendencias: SEM }));
const jogo = (id, time, dias) => ({
  id, name: `Campo ${id}`, date: new Date(Date.now() + dias * DIA).toISOString(), location: 'Society do Guará II', confirmed_count: 5, status: 'scheduled', cancelado: false,
  user_status: null, team_id: time.id, team_name: time.nome, team_slug: time.slug, fuso: SP, ausente_proximo: false, eu_jogo: true,
});

const INICIO = {
  me: {
    user: { id: 'U1', nome: 'Bruninho', nome_jogador: 'Bruninho', onboarding_completo: true, birthdate: '1990-01-01', foto_url: null, avatar_url: null, plano: 'free', fundo_figurinha: 'estadio', email: 'prova@futty.test' },
    stats: { nota: 9.1, jogos: 7, gols: 4 },
  },
  teams: { teams: TIMES },
  convites: { games: [jogo('g1', TIMES[0], 2)] },
  pedidos: { pedidos: [] },
  votacoes_pendentes: { pendentes: [] },
  denuncias_desfechos: { total: 0 },
  votacao_status: null,
  campeonato: null,
  rsvp: null,
  seu_time: seuTime(),
  ad: { ad: null },
  ads: null,
  brilhante: { fonte: null, team_id: null, kit_id: null, creditos: 0, restantes: 0, loja_pronta: false },
  pedidos_brilhante: [],
};

// O Radar: nomes curtos, médios e o de 48 letras; "Racha da Asa Norte" pede aprovação (o botão "PEDIR ENTRADA" é o mais largo).
const RADAR = [
  { id: 'E1', slug: 'racha-da-asa-norte', nome: 'Racha da Asa Norte', cidade: 'Brasília, DF', bairro: 'Asa Norte', descricao: 'Sábado 16h no campo da 410 Norte. Nível médio, todo mundo joga.', membro_count: 3, modo_visibilidade: 'publico_aprovacao', ja_membro: false, pedido_pendente: false },
  { id: 'E2', slug: 'pelada-do-bandeirante', nome: 'Pelada do Bandeirante', cidade: 'Brasília, DF', bairro: 'Núcleo Bandeirante', membro_count: 15, modo_visibilidade: 'publico_aprovacao', ja_membro: false, pedido_pendente: false },
  { id: 'E3', slug: 'longo', nome: NOME_LONGO, cidade: 'Brasília, DF', bairro: 'Núcleo Bandeirante', membro_count: 21, modo_visibilidade: 'publico_aberto', ja_membro: false, pedido_pendente: false },
  { id: 'E4', slug: 'fut-park-way', nome: 'Fut de Domingo Park Way', cidade: 'Brasília, DF', bairro: 'Park Way', membro_count: 9, modo_visibilidade: 'publico_aberto', ja_membro: false, pedido_pendente: false },
];

// O Ranking: pontos e nota CHEIOS de casa decimal, o top-3 (letras maiores, o pior caso), o goleiro, quem já votei (4.5 estrelas) e quem não.
const RANKING = [
  { posicao: 1, user_id: 'U1', nome: 'Bruninho', nome_jogador: 'Bruninho', avatar_url: null, categoria: 'JG', score: 77.9, nota: 9.1, minha_nota: null, sou_eu: true },
  { posicao: 2, user_id: 'U2', nome: 'Cabeção', nome_jogador: 'Cabeção', avatar_url: null, categoria: 'GR', score: 71.84, nota: 7.8, minha_nota: 4.5, sou_eu: false },
  { posicao: 3, user_id: 'U3', nome: 'Dudu', nome_jogador: 'Dudu', avatar_url: null, categoria: 'JG', score: 70.65, nota: 10, minha_nota: 5, sou_eu: false },
  { posicao: 4, user_id: 'U4', nome: 'Tiãozinho', nome_jogador: 'Tiãozinho', avatar_url: null, categoria: 'JG', score: 63.6, nota: 9.4, minha_nota: 4.5, sou_eu: false },
  { posicao: 5, user_id: 'U5', nome: 'Fabinho', nome_jogador: 'Fabinho', avatar_url: null, categoria: 'JG', score: 61.4, nota: null, minha_nota: null, sou_eu: false },
  { posicao: 6, user_id: 'U6', nome: 'Paulinho Gaúcho', nome_jogador: 'Paulinho Gaúcho', avatar_url: null, categoria: 'JG', score: 100, nota: 6.5, minha_nota: null, sou_eu: false },
];

const JOGADOR = {
  jogador: { id: 'U2', nome: 'Cabeção', nome_jogador: 'Cabeção', avatar_url: null, categoria: 'GR', nota: 9.1, posicao: 2, total_com_nota: 12 },
  team: { mostrar_gols: true },
  radar: [{ k: 'Ataque', v: 72 }, { k: 'Defesa', v: 64 }, { k: 'Presença', v: 91 }],
  conquistas: { jogos_total: 7, vitorias_total: 4, gols_total: 9 },
  historico: [],
  evolucao: [{ nota: 8.4 }, { nota: 8.7 }, { nota: 9.1 }],
  equipas_partilhadas: [],
};

const GABINETE_RESUMO = {
  visao_geral: {
    usuarios_novos_hoje: 3, usuarios_novos_7d: 21, jogos_criados_7d: 14, figurinhas_hoje: { qtd: 4, custo_usd: 0.45 }, figurinhas_mes: { qtd: 61, custo_usd: 6.83 }, denuncias_abertas: 0,
    ia: { freeze: false, motivo: null }, servidor: { versao: '1.0.0', uptime_s: 86400 },
  },
  precisa_de_voce: [],
  dinheiro: {
    ia_mes: { gasto_usd: 6.8312, gasto_hoje_usd: 0.4481, teto_diario_usd: 50, freeze: false },
    receita_mes: 123.456, compras_mes: 11, por_produto: { minha: 8, pacote: 2, manto: 1 }, reembolsadas_mes: 0, concessoes_mes: 0, sandbox_mes: 2,
  },
};
const GABINETE_OPERACAO = {
  custos_fixos: [{ id: 'c1', nome: 'Supabase Pro', valor: 22.5, moeda: 'EUR', periodicidade: 'mês', proxima_data: '2026-11-01', pago: true, nota: '' }],
  registros: [], acessos: [], seguranca_manual: { testes_permissao: {}, npm_audit: {}, ultima_auditoria: {} }, cobertura: { vende: [], bloqueado: [] }, cambio_usd_eur: 0.86,
};

const ESTATISTICAS = { stats: { total_jogos: 7, total_membros: 12, media_confirmacoes: 13.14 } };
const MEMBROS = {
  membros: [
    { user_id: 'U2', nome: 'Cabeção', nome_jogador: 'Cabeção', role: 'membro', nota_media: 8.35, presencas_recentes: [], taxa_presenca: '86%', pode_postar: true, ativo: true },
    { user_id: 'U3', nome: 'Dudu', nome_jogador: 'Dudu', role: 'admin', nota_media: 9.1, presencas_recentes: [], taxa_presenca: '90%', pode_postar: true, ativo: true },
  ],
};

// O motor de mentira.
function criarRoteador(base) {
  const origem = new URL(base).host;
  const responder = (route, corpo) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpo) });
  return (route) => {
    const req = route.request();
    const u = new URL(req.url());
    const p = u.pathname;
    if (p.startsWith('/api/')) {
      if (req.method() !== 'GET') return responder(route, { ok: true });
      if (p === '/api/inicio') return responder(route, INICIO);
      if (p === '/api/me') return responder(route, INICIO.me);
      if (p === '/api/teams') return responder(route, { teams: TIMES });
      if (p === '/api/teams/explorar') return responder(route, { teams: RADAR });
      if (/^\/api\/teams\/[^/]+\/ranking$/.test(p)) return responder(route, { team: TIMES[0], ranking: RANKING });
      if (/^\/api\/teams\/[^/]+\/jogador\/[^/]+$/.test(p)) return responder(route, JOGADOR);
      if (/\/selos$/.test(p)) return responder(route, { selos: [] });
      if (/^\/api\/teams\/[^/]+\/stats$/.test(p)) return responder(route, ESTATISTICAS);
      if (/^\/api\/teams\/[^/]+\/membros$/.test(p)) return responder(route, MEMBROS);
      if (/^\/api\/(teams|equipas)\/[^/]+$/.test(p)) { const t = TIMES.find((x) => p.endsWith(`/${x.slug}`)) || TIMES[0]; return responder(route, { team: t, members: [{ id: 'U1', nome: 'Bruninho', goleiro: false }] }); }
      if (p === '/api/super/gabinete/resumo') return responder(route, GABINETE_RESUMO);
      if (p === '/api/super/gabinete/operacao') return responder(route, GABINETE_OPERACAO);
      if (p === '/api/super/gabinete/publicidade') return responder(route, { campanhas: [], alertas: [] });
      return responder(route, {});
    }
    if (u.host === origem) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  };
}

async function abrir(navegador, base, caminho, { largura = 360, altura = 780 } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: largura, height: altura }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: SP, reducedMotion: 'reduce' });
  await ctx.addInitScript(({ chave, sessao }) => {
    try {
      localStorage.setItem('futty_cookies', 'aceite'); localStorage.setItem('futty_tour_done', '1'); localStorage.setItem(chave, sessao);
      sessionStorage.setItem('futty_push_dismiss', '1'); sessionStorage.setItem('futty_votacao_dismiss', '1');
    } catch { /* sem storage */ }
    try { Object.defineProperty(window.Notification, 'permission', { get: () => 'denied', configurable: true }); } catch { /* sem Notification */ }
  }, { chave: `sb-${REF}-auth-token`, sessao: SESSAO });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.route('**/*', criarRoteador(base));
  await page.goto(`${base}/scripts/provas/rodada-29z.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-casa]').waitFor({ timeout: 20000 });
  await page.evaluate((c) => { window.history.pushState({}, '', c); window.dispatchEvent(new PopStateEvent('popstate')); }, caminho);
  return { ctx, page, erros };
}
const assentar = async (page) => { await page.evaluate(() => document.fonts.ready.then(() => true)); await page.waitForTimeout(500); };
// FUTTY_PROVA_PRINTS=<pasta>: guarda uma imagem de cada tela (para a Freaky olhar). Sem a variável, nada é gravado.
async function imagem(page, arquivo) { if (process.env.FUTTY_PROVA_PRINTS) await page.screenshot({ path: `${process.env.FUTTY_PROVA_PRINTS}/${arquivo}.png`, fullPage: true }); }
const defeitos = (achados, tipos) => achados.filter((a) => tipos.includes(a.tipo)).map((a) => `${a.tipo}: ${a.detalhe}`);
const SEM_ROLAGEM_NEM_CORTE = ['rola-para-o-lado', 'reticencias', 'contêiner-corta', 'passa-da-janela', 'cortado-pelo-cartao'];

export async function rodar({ navegador, base, t }) {
  // ── os números, tela por tela ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, page, erros } = await abrir(navegador, base, '/time/missa/ranking');
    await page.locator('.rank-list .rank-row').first().waitFor({ timeout: 25000 });
    await assentar(page);
    const corpo = await page.locator('.rank-list').innerText();
    t('Ranking: "77,9 pontos" e "nota 9,1" (era "77.9" e "9.1")', /77,9\s*pontos/.test(corpo) && /nota\s*9,1/.test(corpo), corpo.slice(0, 200));
    t('Ranking: os pontos têm uma casa e vírgula em todas as linhas (71,8 · 70,7 · 63,6 · 100,0), a nota 10 sai "10,0"', /71,8\s*pontos/.test(corpo) && /70,7\s*pontos/.test(corpo) && /63,6\s*pontos/.test(corpo) && /100,0\s*pontos/.test(corpo) && /nota\s*10,0/.test(corpo), corpo);
    t('Ranking: nenhum número com ponto decimal no texto da tela', defeitos(await page.evaluate(medir, 360), ['numero-com-ponto']).length === 0, defeitos(await page.evaluate(medir, 360), ['numero-com-ponto']).join(' | '));
    await imagem(page, 'ranking-360');
    t('Ranking: sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }
  {
    // Largo (tablet, janela do navegador): o "você deu / por votar" aparece, e com vírgula (4,5, não 4.5).
    const { ctx, page } = await abrir(navegador, base, '/time/missa/ranking', { largura: 700, altura: 900 });
    await page.locator('.rank-list .rank-row').first().waitFor({ timeout: 25000 });
    await assentar(page);
    const corpo = await page.locator('.rank-list').innerText();
    t('Ranking largo: "★ você deu 4,5" com vírgula (e "você deu 5" sem casa quando fecha redondo)', /você deu 4,5/.test(corpo) && /você deu 5(?![,\d])/.test(corpo) && !/você deu 4\.5/.test(corpo), corpo);
    t('Ranking largo: o aria-label da meia-estrela diz "4,5 estrelas" quando o voto abre', await (async () => { await page.getByRole('button', { name: 'Alterar' }).first().click(); return page.getByRole('button', { name: '0,5 estrelas' }).first().waitFor({ timeout: 5000 }).then(() => true, () => false); })());
    await ctx.close();
  }
  {
    const { ctx, page, erros } = await abrir(navegador, base, '/home');
    await page.locator('.app-main').first().waitFor({ timeout: 25000 });
    await page.getByText('9,1').first().waitFor({ timeout: 15000 }).catch(() => {});
    await assentar(page);
    const corpo = await page.locator('body').innerText();
    t('Início: a nota sai "9,1" (era "9.10")', /9,1/.test(corpo) && !/9\.10?/.test(corpo), corpo.slice(0, 300));
    t('Início: nenhum número com ponto decimal no texto', defeitos(await page.evaluate(medir, 360), ['numero-com-ponto']).length === 0, defeitos(await page.evaluate(medir, 360), ['numero-com-ponto']).join(' | '));
    t('Início: sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page } = await abrir(navegador, base, '/perfil');
    await page.getByText('Meus times', { exact: false }).first().waitFor({ timeout: 25000 });
    await assentar(page);
    const corpo = await page.locator('body').innerText();
    t('Meu perfil: a nota sai "9,1"', /9,1/.test(corpo) && !/9\.10?/.test(corpo), corpo.slice(0, 300));
    t('Meu perfil: nenhum número com ponto decimal no texto', defeitos(await page.evaluate(medir, 360), ['numero-com-ponto']).length === 0, defeitos(await page.evaluate(medir, 360), ['numero-com-ponto']).join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page } = await abrir(navegador, base, '/time/missa/jogador/U2');
    await page.getByText('Cabeção').first().waitFor({ timeout: 25000 });
    await assentar(page);
    const corpo = await page.locator('body').innerText();
    t('Vitrine do jogador: "9,1" no anel e "9,1 / 10" na média recebida', /9,1/.test(corpo) && /9,1 \/ 10/.test(corpo), corpo.slice(0, 400));
    t('Vitrine do jogador: nenhum número com ponto decimal no texto', defeitos(await page.evaluate(medir, 360), ['numero-com-ponto']).length === 0, defeitos(await page.evaluate(medir, 360), ['numero-com-ponto']).join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page } = await abrir(navegador, base, '/elenco');
    await page.locator('[data-tres-numeros]').waitFor({ timeout: 25000 });
    await page.locator('[data-membro]').first().waitFor({ timeout: 15000 });
    await assentar(page);
    const corpo = await page.locator('body').innerText();
    t('Elenco do admin: a média de confirmados sai "13,1" e a nota do membro "★ 8,4" / "★ 9,1"', /13,1/.test(corpo) && /★ 8,4/.test(corpo) && /★ 9,1/.test(corpo), corpo.slice(0, 400));
    t('Elenco do admin: nenhum número com ponto decimal no texto', defeitos(await page.evaluate(medir, 360), ['numero-com-ponto']).length === 0, defeitos(await page.evaluate(medir, 360), ['numero-com-ponto']).join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page } = await abrir(navegador, base, '/gabinete?aba=dinheiro');
    await page.getByText('Gerações do mês').waitFor({ timeout: 25000 });
    await assentar(page);
    const corpo = await page.locator('body').innerText();
    t('Gabinete → Dinheiro: dólar e euro com vírgula ("US$6,83", "≈ €5,87", "US$50,00", "€106,17")', /US\$6,83/.test(corpo) && /≈ €5,87/.test(corpo) && /≈ €106,17/.test(corpo) && /US\$50,00/.test(corpo) && /US\$123,46/.test(corpo), corpo.slice(0, 600));
    const achados = (await page.evaluate(medir, 360)).filter((a) => a.tipo === 'numero-com-ponto');
    t('Gabinete → Dinheiro: nenhum número com ponto decimal no texto', achados.length === 0, achados.map((a) => a.detalhe).join(' | '));
    await ctx.close();
  }

  // ── o Ranking sem reticências, em 360 e em 390 ────────────────────────────────────────────────────────────────────────────────────────
  for (const largura of [360, 390]) {
    const { ctx, page } = await abrir(navegador, base, '/time/missa/ranking', { largura, altura: largura === 360 ? 780 : 844 });
    await page.locator('.rank-list .rank-row').first().waitFor({ timeout: 25000 });
    await assentar(page);
    const linhas = await page.evaluate(() => [...document.querySelectorAll('.rank-row')].map((row) => {
      const caixa = row.querySelector('.rank-votes').getBoundingClientRect();
      const grupos = [...row.querySelectorAll('.rank-votes__grupo')].map((g) => g.getBoundingClientRect());
      const filhos = [...row.querySelectorAll('.rank-votes__grupo > *')].map((s) => s.getBoundingClientRect());
      const botao = row.querySelector('.rank-actions').getBoundingClientRect();
      const votos = row.querySelector('.rank-votes');
      return {
        textos: [...row.querySelectorAll('.rank-votes__grupo')].map((g) => g.innerText.replace(/\s+/g, ' ').trim()),
        cabe: grupos.every((g) => g.left >= caixa.left - 0.5 && g.right <= caixa.right + 0.5) && filhos.every((s) => s.right <= caixa.right + 0.5),
        passaDoBotao: grupos.some((g) => g.right > botao.left + 0.5),
        linhas: new Set(grupos.map((g) => Math.round(g.top))).size,
        cortado: votos.scrollWidth > votos.clientWidth + 1,
        reticencias: getComputedStyle(votos).textOverflow === 'ellipsis',
        fonteDosPontos: row.querySelector('[data-pontos]') ? parseFloat(getComputedStyle(row.querySelector('[data-pontos]')).fontSize) : 0,
      };
    }));
    const ruins = linhas.filter((l) => !l.cabe || l.passaDoBotao || l.cortado || l.reticencias);
    t(`Ranking ${largura} px: os pontos e a nota de TODAS as ${linhas.length} linhas aparecem inteiros, sem passar do botão, sem corte e sem reticências`, ruins.length === 0, JSON.stringify(ruins));
    t(`Ranking ${largura} px: o texto de cada linha é completo ("77,9 pontos" + "nota 9,1")`, linhas[0].textos.join(' | ') === '77,9 pontos | nota 9,1', JSON.stringify(linhas[0].textos));
    t(`Ranking ${largura} px: quando os dois grupos não cabem na mesma linha, a nota desce para a segunda (nunca fica ponto solto)`, linhas.every((l) => l.linhas === 1 || l.linhas === 2), JSON.stringify(linhas.map((l) => l.linhas)));
    const achados = await page.evaluate(medir, largura);
    t(`Ranking ${largura} px: não rola para o lado nem corta campo, botão ou nome`, defeitos(achados, SEM_ROLAGEM_NEM_CORTE).length === 0, defeitos(achados, SEM_ROLAGEM_NEM_CORTE).join(' | '));
    await imagem(page, `ranking-${largura}`);
    await ctx.close();
  }

  // ── o celular estreito: o Novo jogo, o Radar, o Perfil, e as telas principais, todas em 360 × 780 ──────────────────────────────────────
  {
    const { ctx, page } = await abrir(navegador, base, '/time/missa/jogo/novo');
    await page.locator('[data-ingresso]').waitFor({ timeout: 25000 });
    await page.locator('#local').fill('Society do Guará II, quadra 12, ao lado da padaria do seu Zé');
    await assentar(page);
    const caixa = await page.evaluate(() => {
      const cartao = document.querySelector('form').getBoundingClientRect();
      const campos = ['data', 'hora', 'local'].map((id) => { const r = document.getElementById(id).getBoundingClientRect(); return { id, esq: r.left, dir: r.right }; });
      const botao = document.querySelector('form button[type="submit"]').getBoundingClientRect();
      return { cartao: { esq: cartao.left, dir: cartao.right }, campos, botao: { esq: botao.left, dir: botao.right }, larguraDoDoc: document.documentElement.scrollWidth };
    });
    const dentro = (c) => c.esq >= caixa.cartao.esq && c.dir <= caixa.cartao.dir;
    t('Novo jogo 360 px: os campos Data, Hora e Local e o botão "Criar jogo" ficam DENTRO do cartão (antes passavam 17 px)', caixa.campos.every(dentro) && dentro(caixa.botao), JSON.stringify(caixa));
    t('Novo jogo 360 px: a página não rola para o lado', caixa.larguraDoDoc <= 360, String(caixa.larguraDoDoc));
    const campoData = await page.locator('#data').boundingBox();
    t('Novo jogo 360 px: a data tem largura para o "12/10/2026" inteiro (≥ 146 px: a 133 px a primeira letra some)', campoData.width >= 146, String(campoData.width));
    const achados = await page.evaluate(medir, 360);
    t('Novo jogo 360 px: nenhum campo, botão ou nome cortado, e o nome do time de 48 letras e o local longo quebram em vez de reticências', defeitos(achados, SEM_ROLAGEM_NEM_CORTE).length === 0, defeitos(achados, SEM_ROLAGEM_NEM_CORTE).join(' | '));
    await imagem(page, 'novo-jogo-360');
    await ctx.close();
  }
  {
    // A 390 (a régua da casa) a data e a hora seguem LADO A LADO — o look aprovado não muda onde cabia.
    const { ctx, page } = await abrir(navegador, base, '/time/missa/jogo/novo', { largura: 390, altura: 844 });
    await page.locator('[data-ingresso]').waitFor({ timeout: 25000 });
    await assentar(page);
    const [d, h] = await Promise.all([page.locator('#data').boundingBox(), page.locator('#hora').boundingBox()]);
    t('Novo jogo 390 px: data e hora continuam lado a lado (mesma linha)', Math.abs(d.y - h.y) < 2 && d.x < h.x, JSON.stringify({ d, h }));
    const achados = await page.evaluate(medir, 390);
    t('Novo jogo 390 px: nada cortado', defeitos(achados, SEM_ROLAGEM_NEM_CORTE).length === 0, defeitos(achados, SEM_ROLAGEM_NEM_CORTE).join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page } = await abrir(navegador, base, '/explorar');
    await page.locator('[data-card-do-time]').first().waitFor({ timeout: 25000 });
    await assentar(page);
    const nomes = await page.evaluate(() => [...document.querySelectorAll('[data-nome-do-time]')].map((el) => ({
      texto: el.innerText.trim(), cortado: el.scrollWidth > el.clientWidth + 1, reticencias: getComputedStyle(el).textOverflow === 'ellipsis', linhas: Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)),
    })));
    t('Radar 360 px: "Racha da Asa Norte" aparece inteiro (sem reticências), como os outros nomes, até o de 48 letras', nomes.length === RADAR.length && nomes.every((n) => !n.cortado && !n.reticencias) && nomes.some((n) => n.texto === 'Racha da Asa Norte'), JSON.stringify(nomes));
    t('Radar 360 px: "Racha da Asa Norte" quebra em duas linhas ao lado do botão', nomes.find((n) => n.texto === 'Racha da Asa Norte').linhas >= 2, JSON.stringify(nomes.find((n) => n.texto === 'Racha da Asa Norte')));
    const achados = await page.evaluate(medir, 360);
    t('Radar 360 px: sem rolagem para o lado e sem nome, campo ou botão cortado', defeitos(achados, SEM_ROLAGEM_NEM_CORTE).length === 0, defeitos(achados, SEM_ROLAGEM_NEM_CORTE).join(' | '));
    await imagem(page, 'radar-360');
    await ctx.close();
  }
  {
    const { ctx, page } = await abrir(navegador, base, '/perfil');
    await page.locator('[data-meu-time]').first().waitFor({ timeout: 25000 });
    await assentar(page);
    const nomes = await page.evaluate(() => [...document.querySelectorAll('[data-meu-time] [data-nome-do-time]')].map((el) => ({ texto: el.innerText.trim(), largura: Math.round(el.getBoundingClientRect().width), cortado: el.scrollWidth > el.clientWidth + 1 })));
    t('Perfil 360 px: os 3 nomes de time aparecem inteiros e com largura de leitura (≥ 90 px), nenhum espremido em 16 px', nomes.length === 3 && nomes.every((n) => !n.cortado && n.largura >= 90), JSON.stringify(nomes));
    const achados = await page.evaluate(medir, 360);
    t('Perfil 360 px: sem rolagem para o lado e sem nome, campo ou botão cortado', defeitos(achados, SEM_ROLAGEM_NEM_CORTE).length === 0, defeitos(achados, SEM_ROLAGEM_NEM_CORTE).join(' | '));
    await imagem(page, 'perfil-360');
    await ctx.close();
  }
  {
    const { ctx, page } = await abrir(navegador, base, '/home');
    await page.locator('[data-aviso="jogo"]').waitFor({ timeout: 25000 });
    await assentar(page);
    const nomes = await page.evaluate(() => [...document.querySelectorAll('[data-nome-do-time]')].map((el) => ({ texto: el.innerText.trim(), cortado: el.scrollWidth > el.clientWidth + 1, reticencias: getComputedStyle(el).textOverflow === 'ellipsis' })));
    t('Início 360 px: o nome do time de 48 letras (no aviso do jogo e em "Seus times") quebra, nunca vira "…"', nomes.length >= 2 && nomes.every((n) => !n.cortado && !n.reticencias), JSON.stringify(nomes));
    const achados = await page.evaluate(medir, 360);
    t('Início 360 px: sem rolagem para o lado e sem nome, campo ou botão cortado', defeitos(achados, SEM_ROLAGEM_NEM_CORTE).length === 0, defeitos(achados, SEM_ROLAGEM_NEM_CORTE).join(' | '));
    await imagem(page, 'inicio-360');
    await ctx.close();
  }
  {
    // A varredura das outras telas principais em 360 × 780 (vitrine, Gabinete, Elenco): nenhuma rola para o lado.
    for (const [rotulo, caminho, espera] of [['Vitrine do jogador', '/time/missa/jogador/U2', 'Cabeção'], ['Elenco do admin', '/elenco', '[data-tres-numeros]']]) {
      const { ctx, page } = await abrir(navegador, base, caminho);
      await (espera.startsWith('[') ? page.locator(espera) : page.getByText(espera).first()).waitFor({ timeout: 25000 });
      await assentar(page);
      const achados = await page.evaluate(medir, 360);
      t(`${rotulo} 360 px: sem rolagem para o lado e sem nome, campo ou botão cortado`, defeitos(achados, ['rola-para-o-lado', 'contêiner-corta', 'passa-da-janela', 'cortado-pelo-cartao']).length === 0, defeitos(achados, ['rola-para-o-lado', 'contêiner-corta', 'passa-da-janela', 'cortado-pelo-cartao']).join(' | '));
      await ctx.close();
    }
  }
}
