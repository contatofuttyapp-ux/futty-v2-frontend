// Prova no navegador da Rodada 30L (o campeonato nasce do sorteio do jogo; sai o "sortear direto"): o que só um Chromium de verdade confirma, com as
// MESMAS fontes e o MESMO CSS do app, a 390 e a 360 px.
//   · "Criar campeonato" (a página dos campeonatos): abre a escolha "De onde vêm os times?" com os dois caminhos;
//   · "Pelo sorteio de um jogo": lista só os jogos sorteados recentes, não cancelados e que ainda não viraram campeonato; escolhido o jogo, vêm os 3
//     formatos (os que cabem pelo nº de times) e o "Criar campeonato"; o jogo usado some da lista;
//   · sem nenhum jogo sorteado: a frase "Marque um jogo, deixe o pessoal confirmar e sorteie…" e o botão "Novo jogo";
//   · "Montar os times à mão": o passo a passo manual de sempre, sem o "Sortear pela cerimônia" (e também aberto direto, com ?novo=manual);
//   · Painel → Jogos → "Criar campeonato": a mesma escolha, no lugar do formulário antigo de 2 times;
//   · o resultado do sorteio, na Página do Jogo: "Criar campeonato com estes times" a partir de 2 times (2 formatos) e com 4 (3 formatos).
// O motor é de mentira (/api/** respondido por page.route), mas a regra é a DE VERDADE: o mesmo backend/utils/campeonatoStore.js, inclusive a lista de
// jogos elegíveis (_campeonato-motor.mjs). Nada sai para a rede.
import { readFileSync } from 'node:fs';
import { medir } from '../medir-estreito.mjs';
import { carregarStore, criarMotor, rotear } from './_campeonato-motor.mjs';

const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const SESSAO = JSON.stringify({
  access_token: 'prova', refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
  user: { id: 'U1', aud: 'authenticated', email: 'prova@futty.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
});

export const nome = 'Rodada 30L (o campeonato nasce do sorteio do jogo: a escolha "Criar campeonato", o Painel, o resultado do sorteio)';

const captura = (arquivo) => new URL(`../capturas/${arquivo}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SLUG = 'domingueira-fc';
const DIA = 86400000;
const NOMES = ['Rafael', 'Bruno', 'Carlos', 'Diego', 'Eduardo', 'Felipe', 'Gustavo', 'Henrique', 'João', 'Lucas', 'Gabriel', 'Mateus', 'Leonardo', 'Marcelo', 'Rodrigo', 'Thiago', 'André', 'Fernando', 'Ricardo', 'Pedro'];
const MEMBROS = NOMES.map((n, i) => ({ id: `U${i + 1}`, nome: n }));
const DEFEITOS_QUE_REPROVAM = ['rola-para-o-lado', 'passa-da-janela', 'contêiner-corta', 'numero-com-ponto'];
const FRASE_SEM_JOGO = 'Marque um jogo, deixe o pessoal confirmar e sorteie. No resultado do sorteio aparece Criar campeonato.';

/** Um sorteio de `n` times de `porTime` jogadores, a partir do jogador `deslocamento` (outro sorteio = outra gente). */
const sorteioDe = (n, porTime = 5, deslocamento = 0) => ({
  seed: 1, num_times: n, reservas: [],
  times: Array.from({ length: n }, (_, i) => ({
    nome: `Time ${String.fromCharCode(65 + i)}`,
    jogadores: Array.from({ length: porTime }, (_, k) => { const x = deslocamento + i * porTime + k; return { user_id: `U${(x % 20) + 1}`, nome: NOMES[x % 20], avatar_url: null, rating: 3 }; }),
  })),
});
const jogoDe = (id, dias, extra = {}) => ({
  id, data: new Date(Date.now() + dias * DIA).toISOString(), local: `Quadra ${id.toUpperCase()}`, status: 'agendado', cancelado: false, sorteio_realizado: true,
  times_resultado: sorteioDe(4, 5), ...extra,
});

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
  await page.goto(`${base}/scripts/provas/rodada-30l.html`, { waitUntil: 'domcontentloaded' });
  return { page, ctx, erros };
}

const semErrosReais = (erros) => erros.filter((e) => !/favicon|Failed to load resource/.test(e));
const texto = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const defeitos = async (page, largura) => (await page.evaluate(medir, largura)).filter((a) => DEFEITOS_QUE_REPROVAM.includes(a.tipo));
const resumo = (lista) => lista.map((d) => `${d.tipo}: ${d.detalhe}`).join(' | ');
// A página entra com um fade (.page-reveal): a foto espera ele acabar, senão sai esmaecida.
const foto = async (page, arquivo, opcoes = { fullPage: true }) => { await page.waitForTimeout(900); return page.screenshot({ path: captura(arquivo), ...opcoes }); };
// Só o que mexe em campeonato (a Página do Jogo também pede, por conta própria, o link curto do sorteio).
const posts = (motor) => motor.pedidos.filter((p) => p.metodo === 'POST' && p.pathname.includes('/campeonatos'));

/** O motor do campeonato, mais o que o Painel e a Página do Jogo pedem: a lista de jogos do time e o jogo (/api/games/:id). */
function motorDaProva(store, jogos, { papel = 'admin' } = {}) {
  const motor = criarMotor({ store, papel, membros: MEMBROS, jogos: () => jogos });
  motor.team.mostrar_artilheiro = true;
  motor.team.mostrar_destaque = true;
  const responderDoMotor = motor.responder;
  motor.responder = (pathname, metodo, corpo) => {
    if (metodo === 'GET' && pathname === `/api/teams/${SLUG}/games`) {
      return { status: 200, json: { team: { ...motor.team }, games: jogos.map((g) => ({ id: g.id, local: g.local, data: g.data, status: g.status, num_times: g.times_resultado?.num_times || 2, jogadores_por_time: 5, sorteio_realizado: g.sorteio_realizado, resultado_nivel: 0, campeao_time_index: null, time_vencedor: null, cancelado: g.cancelado, motivo_cancelamento: null, max_jogadores: null, rsvp_aberto: false, rsvp_fechado: false, confirmados: 20 })) } };
    }
    if (metodo === 'GET' && pathname === `/api/equipas/${SLUG}/campeonato`) return { status: 200, json: { campeonato: null } }; // o painel antigo (2 times): nenhum
    const g = jogos.find((x) => metodo === 'GET' && pathname === `/api/games/${x.id}`);
    if (g) {
      const jogadores = (g.times_resultado?.times || []).flatMap((t) => t.jogadores);
      return { status: 200, json: { team: { ...motor.team }, game: { ...g, jogadores_por_time: 5, num_times: g.times_resultado?.num_times, historico: false, resultado_nivel: 0, time_vencedor: null, placar_a: null, placar_b: null, campeao_time_index: null }, players: jogadores.map((j) => ({ ...j, confirmado: true, goleiro: false, cabeca_chave: false })), gols: [], meuEstado: { confirmado: true, goleiro: false, cabeca_chave: false }, jaVotei: false } };
    }
    return responderDoMotor(pathname, metodo, corpo);
  };
  return motor;
}

export async function rodar({ navegador, base, t }) {
  const store = carregarStore();
  if (!store) {
    t('o backend não está ao lado (FUTTY-V2/backend): a prova do campeonato foi pulada', true);
    return;
  }

  for (const largura of [390, 360]) {
    // ─── A escolha, a lista dos jogos sorteados, o formato e o jogo que sai da lista ───────────────────────────────────────
    {
      const jogos = [
        jogoDe('bom1', 2), // 4 times de 5, daqui a 2 dias
        jogoDe('bom2', -3, { times_resultado: sorteioDe(2, 7, 8) }), // 2 times de 7, há 3 dias
        jogoDe('cancelado', 1, { cancelado: true, status: 'cancelado' }),
        jogoDe('sem-sorteio', 1, { sorteio_realizado: false, times_resultado: null }),
        jogoDe('antigo', -40),
        jogoDe('usado', -1, { times_resultado: sorteioDe(4, 5, 4) }),
      ];
      const motor = motorDaProva(store, jogos);
      // O sorteio "usado" já virou campeonato (com a origem gravada): não pode ser oferecido de novo.
      motor.criarDireto({ nome: 'Copa do sábado', formato: 'pontos', nomes: ['Ouro', 'Roxo', 'Prata', 'Bronze'], plantel: jogos[5].times_resultado.times.map((x) => x.jogadores), origem: { game_id: 'usado', assinatura: store.assinaturaDosTimes(jogos[5].times_resultado.times) } });
      const { page, ctx, erros } = await abrirCena(navegador, base, motor, `/time/${SLUG}/campeonato`, { largura });
      await page.getByRole('button', { name: /Criar campeonato/ }).waitFor({ timeout: 25000 });
      await page.getByRole('button', { name: /Criar campeonato/ }).click();
      await page.locator('[data-criar-campeonato-escolha][data-etapa="escolha"]').waitFor();
      const opcoes = await page.locator('[data-caminho]').evaluateAll((els) => els.map((e) => ({ id: e.dataset.caminho, titulo: e.querySelector('.camp-fopt__t').textContent })));
      t(`${largura}px · "Criar campeonato" abre a escolha com os dois caminhos, nesta ordem`, JSON.stringify(opcoes.map((o) => o.titulo)) === JSON.stringify(['Pelo sorteio de um jogo', 'Montar os times à mão']), JSON.stringify(opcoes));
      t(`${largura}px · a escolha pergunta "De onde vêm os times?" e não oferece o "sortear direto"`, (await texto(page)).includes('De onde vêm os times?') && !/sortear pela cerimônia|Sortear direto/i.test(await texto(page)));
      t(`${largura}px · a escolha cabe, sem rolar para o lado nem cortar`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
      await foto(page, `30l-escolha-${largura}.png`);

      await page.locator('[data-caminho="sorteio"]').click();
      await page.locator('[data-jogo-sorteado]').first().waitFor({ timeout: 10000 });
      const listados = await page.locator('[data-jogo-sorteado]').evaluateAll((els) => els.map((e) => ({ id: e.dataset.jogoSorteado, texto: e.innerText.replace(/\s+/g, ' ') })));
      t(`${largura}px · a lista traz só os jogos elegíveis (sorteado, recente, não cancelado, sem campeonato): bom1 e bom2`, listados.map((j) => j.id).join() === 'bom1,bom2', JSON.stringify(listados));
      t(`${largura}px · cada jogo mostra quando, onde e o tamanho do sorteio ("4 times de 5", "2 times de 7")`, /4 times de 5/.test(listados[0].texto) && /Quadra BOM1/.test(listados[0].texto) && /2 times de 7/.test(listados[1].texto) && /\d{2}:\d{2}/.test(listados[0].texto), JSON.stringify(listados));
      t(`${largura}px · a lista cabe, sem rolar para o lado nem cortar`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
      await foto(page, `30l-jogos-sorteados-${largura}.png`);

      await page.locator('[data-jogo-sorteado="bom1"]').click();
      await page.locator('[data-seletor-de-formato]').waitFor();
      const formatos = await page.locator('[data-formato]').evaluateAll((els) => els.map((e) => e.dataset.formato));
      t(`${largura}px · escolhido o jogo de 4 times, vêm os 3 formatos (com "Todos contra todos + final")`, formatos.join() === 'pontos,pontos_final,mata', formatos.join());
      t(`${largura}px · a tela diz de qual jogo e que os times entram preenchidos`, /4 times de 5/.test(await page.locator('[data-jogo-escolhido]').innerText()) && /entram já preenchidos/.test(await page.locator('[data-jogo-escolhido]').innerText()));
      await page.locator('[data-formato="pontos_final"]').click();
      t(`${largura}px · o seletor de formatos cabe, sem rolar para o lado nem cortar`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
      await foto(page, `30l-formato-do-sorteio-${largura}.png`);
      t(`${largura}px · nada é criado só por escolher o jogo e o formato`, posts(motor).length === 0 && motor.camps.size === 1);
      await page.locator('[data-criar-campeonato]').click();
      await page.locator('.camp-final').waitFor({ timeout: 25000 });
      const corpo = posts(motor)[0];
      t(`${largura}px · "Criar campeonato" manda o jogo e o formato escolhidos (de-sorteio)`, corpo?.pathname.endsWith('/de-sorteio') && corpo.corpo.game_id === 'bom1' && corpo.corpo.formato === 'pontos_final', JSON.stringify(corpo));
      const criado = [...motor.camps.values()].find((c) => c.origem_game_id === 'bom1');
      t(`${largura}px · nasce o campeonato com os 4 times do sorteio e a tela abre nele`, criado?.formato === 'pontos_final' && criado.times.length === 4 && criado.times[0].jogadores.length === 5 && (await page.locator('[data-jogo]').count()) === 6);
      t(`${largura}px · sem erro de script (escolha pelo sorteio)`, semErrosReais(erros).length === 0, semErrosReais(erros).join(' | '));
      await ctx.close();

      // Abre a escolha de novo (a página recarrega, o motor lembra): o jogo que acabou de virar campeonato não é mais oferecido.
      const de_novo = await abrirCena(navegador, base, motor, `/time/${SLUG}/campeonato`, { largura });
      await de_novo.page.getByRole('button', { name: /Criar campeonato/ }).click();
      await de_novo.page.locator('[data-caminho="sorteio"]').click();
      await de_novo.page.locator('[data-jogo-sorteado]').first().waitFor({ timeout: 10000 });
      const restam = await de_novo.page.locator('[data-jogo-sorteado]').evaluateAll((els) => els.map((e) => e.dataset.jogoSorteado));
      t(`${largura}px · o jogo que virou campeonato sai da lista (só sobra o bom2)`, restam.join() === 'bom2', restam.join());
      // Escolhendo o de 2 times: só pontos corridos e mata-mata.
      await de_novo.page.locator('[data-jogo-sorteado="bom2"]').click();
      const dois = await de_novo.page.locator('[data-formato]').evaluateAll((els) => els.map((e) => e.dataset.formato));
      t(`${largura}px · o jogo de 2 times oferece só pontos corridos e mata-mata`, dois.join() === 'pontos,mata', dois.join());
      await de_novo.page.locator('[data-seletor-de-formato] + div button', { hasText: 'Cancelar' }).click();
      await de_novo.page.locator('[data-jogo-sorteado]').first().waitFor({ timeout: 10000 });
      t(`${largura}px · "Cancelar" no formato volta para a lista dos jogos`, (await de_novo.page.locator('[data-jogo-sorteado]').count()) === 1);
      await de_novo.ctx.close();
    }

    // ─── Sem nenhum jogo sorteado: a frase e o "Novo jogo" ──────────────────────────────────────────────────────────────────
    {
      const motor = motorDaProva(store, [jogoDe('so-marcado', 2, { sorteio_realizado: false, times_resultado: null }), jogoDe('cancelado', 1, { cancelado: true, status: 'cancelado' })]);
      const { page, ctx, erros } = await abrirCena(navegador, base, motor, `/time/${SLUG}/campeonato`, { largura });
      await page.getByRole('button', { name: /Criar campeonato/ }).click();
      await page.locator('[data-caminho="sorteio"]').click();
      await page.locator('[data-sem-jogo-sorteado]').waitFor({ timeout: 10000 });
      t(`${largura}px · sem jogo sorteado: a frase "Marque um jogo, deixe o pessoal confirmar e sorteie…"`, (await page.locator('[data-sem-jogo-sorteado]').innerText()).includes(FRASE_SEM_JOGO), await page.locator('[data-sem-jogo-sorteado]').innerText());
      t(`${largura}px · e o botão "Novo jogo"`, (await page.locator('[data-sem-jogo-sorteado] button', { hasText: 'Novo jogo' }).count()) === 1);
      t(`${largura}px · sem lista de jogos nem formato (nada para escolher)`, (await page.locator('[data-jogo-sorteado]').count()) === 0 && (await page.locator('[data-seletor-de-formato]').count()) === 0);
      t(`${largura}px · a tela sem jogo cabe, sem rolar para o lado nem cortar`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
      await foto(page, `30l-sem-jogo-${largura}.png`);
      await page.locator('[data-sem-jogo-sorteado] button', { hasText: 'Novo jogo' }).click();
      await page.locator('[data-novo-jogo]').waitFor({ timeout: 10000 });
      t(`${largura}px · "Novo jogo" leva a marcar um jogo (/jogo/novo)`, true);
      t(`${largura}px · sem erro de script (sem jogo sorteado)`, semErrosReais(erros).length === 0, semErrosReais(erros).join(' | '));
      await ctx.close();
    }

    // ─── Montar os times à mão: o manual de sempre, sem o "sortear" ────────────────────────────────────────────────────────
    {
      const motor = motorDaProva(store, []);
      const { page, ctx, erros } = await abrirCena(navegador, base, motor, `/time/${SLUG}/campeonato`, { largura });
      await page.getByRole('button', { name: /Criar campeonato/ }).click();
      await page.locator('[data-caminho="a-mao"]').click();
      await page.locator('input.input--hud').fill('Copa da Resenha');
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.getByRole('button', { name: 'Continuar' }).click(); // formato padrão: pontos corridos
      await page.locator('.camp-slot').first().waitFor();
      const passo3 = await texto(page);
      t(`${largura}px · o passo dos times não tem mais "Sortear pela cerimônia" nem "crie direto"`, !/Sortear pela cerimônia|crie direto/.test(passo3));
      t(`${largura}px · e o convidado sem app não "entra no sorteio": entra na lista para ser colocado num time`, passo3.includes('a pessoa entra na lista e você a coloca em um time') && !passo3.includes('entra no sorteio'));
      t(`${largura}px · o caminho seguinte é um só, "Montar à mão →"`, (await page.getByRole('button', { name: /Montar à mão/ }).count()) === 1);
      const campos = page.locator('.camp-slot input');
      for (const [i, n] of ['Ouro', 'Roxo', 'Prata', 'Bronze'].entries()) await campos.nth(i).fill(n);
      t(`${largura}px · o passo dos times cabe, sem rolar para o lado nem cortar`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
      await foto(page, `30l-a-mao-times-${largura}.png`);
      await page.getByRole('button', { name: /Montar à mão/ }).click();
      await page.getByRole('button', { name: 'Criar campeonato' }).click();
      await page.locator('[data-jogo]').first().waitFor({ timeout: 25000 });
      const corpo = posts(motor)[0];
      t(`${largura}px · o manual cria como sempre: POST de /campeonatos com modo "manual" e os 4 nomes`, corpo?.pathname.endsWith('/campeonatos') && corpo.corpo.modo === 'manual' && corpo.corpo.nomes.join() === 'Ouro,Roxo,Prata,Bronze', JSON.stringify(corpo));
      t(`${largura}px · e nenhum pedido manda "sorteio"`, !motor.pedidos.some((p) => p.corpo?.modo === 'sorteio'));
      t(`${largura}px · sem erro de script (manual)`, semErrosReais(erros).length === 0, semErrosReais(erros).join(' | '));
      await ctx.close();

      // O Painel abre o manual direto: ?novo=manual
      const direto = await abrirCena(navegador, base, motorDaProva(store, []), `/time/${SLUG}/campeonato?novo=manual`, { largura });
      await direto.page.locator('input.input--hud').waitFor({ timeout: 25000 });
      t(`${largura}px · /campeonato?novo=manual abre direto no passo a passo à mão (primeiro passo: o nome)`, (await texto(direto.page)).includes('NOVO CAMPEONATO'));
      await direto.ctx.close();
    }

    // ─── Painel → Jogos → "Criar campeonato" ────────────────────────────────────────────────────────────────────────────────
    {
      const motor = motorDaProva(store, [jogoDe('bom1', 2)]);
      const { page, ctx, erros } = await abrirCena(navegador, base, motor, '/painel-jogos', { largura });
      await page.locator('[data-jogos-admin]').waitFor({ timeout: 25000 });
      await page.getByRole('button', { name: 'Criar campeonato' }).click();
      await page.locator('[data-painel-criar-campeonato] [data-caminho]').first().waitFor({ timeout: 10000 });
      const painel = await page.locator('[data-painel-criar-campeonato]').innerText();
      t(`${largura}px · Painel → Jogos: "Criar campeonato" abre a escolha (os dois caminhos)`, /Pelo sorteio de um jogo/.test(painel) && /Montar os times à mão/.test(painel));
      t(`${largura}px · e o formulário antigo (nome, nº de jornadas, Time A × Time B) não existe mais`, !/Nº de jornadas|Nome do Time A/.test(await texto(page)));
      t(`${largura}px · a escolha do Painel cabe, sem rolar para o lado nem cortar`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
      await foto(page, `30l-painel-${largura}.png`);
      await page.locator('[data-painel-criar-campeonato] [data-caminho="sorteio"]').click();
      await page.locator('[data-painel-criar-campeonato] [data-jogo-sorteado]').first().waitFor({ timeout: 10000 });
      t(`${largura}px · Painel: "Pelo sorteio de um jogo" lista o jogo sorteado`, (await page.locator('[data-painel-criar-campeonato] [data-jogo-sorteado]').count()) === 1);
      await foto(page, `30l-painel-jogos-${largura}.png`);
      await page.locator('[data-painel-criar-campeonato]').getByRole('button', { name: 'Voltar' }).click();
      await page.locator('[data-painel-criar-campeonato] [data-caminho="a-mao"]').click();
      await page.locator('input.input--hud').waitFor({ timeout: 25000 });
      t(`${largura}px · Painel: "Montar os times à mão" leva ao passo a passo manual`, (await texto(page)).includes('NOVO CAMPEONATO'));
      t(`${largura}px · sem erro de script (Painel)`, semErrosReais(erros).length === 0, semErrosReais(erros).join(' | '));
      await ctx.close();
    }

    // ─── O resultado do sorteio, na Página do Jogo: "Criar campeonato" a partir de 2 times ─────────────────────────────────
    for (const [n, esperados] of [[2, 'pontos,mata'], [4, 'pontos,pontos_final,mata']]) {
      const jogos = [jogoDe(`g${n}`, 3, { times_resultado: sorteioDe(n, 5), num_times: n })];
      const motor = motorDaProva(store, jogos);
      const { page, ctx, erros } = await abrirCena(navegador, base, motor, `/time/${SLUG}/jogo/g${n}`, { largura });
      await page.getByRole('button', { name: 'Criar campeonato com estes times' }).waitFor({ timeout: 25000 });
      t(`${largura}px · resultado do sorteio de ${n} times: o botão "Criar campeonato com estes times" aparece`, true);
      await page.getByRole('button', { name: 'Criar campeonato com estes times' }).click();
      await page.locator('[data-seletor-de-formato]').waitFor();
      const ids = await page.locator('[data-formato]').evaluateAll((els) => els.map((e) => e.dataset.formato));
      t(`${largura}px · ${n} times: os formatos que cabem são ${esperados}`, ids.join() === esperados, ids.join());
      t(`${largura}px · ${n} times: o seletor cabe, sem rolar para o lado nem cortar`, (await defeitos(page, largura)).length === 0, resumo(await defeitos(page, largura)));
      await page.locator('[data-seletor-de-formato]').scrollIntoViewIfNeeded();
      await foto(page, `30l-jogo-${n}-times-${largura}.png`);
      await page.locator('[data-criar-campeonato]').click();
      await page.locator('[data-jogo]').first().waitFor({ timeout: 25000 });
      const corpo = posts(motor)[0];
      t(`${largura}px · ${n} times: "Criar campeonato" manda o jogo (de-sorteio) e abre o campeonato`, corpo?.pathname.endsWith('/de-sorteio') && corpo.corpo.game_id === `g${n}`, JSON.stringify(corpo));
      t(`${largura}px · sem erro de script (jogo de ${n} times)`, semErrosReais(erros).length === 0, semErrosReais(erros).join(' | '));
      await ctx.close();
    }
  }
}
