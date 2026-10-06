// Futty v2.0 — Rodada 29L: o que a varredura visual em 390 px achou (achados 125 a 142). As contas e os textos aqui; o que só um navegador
// confirma (a faixa que esmaece, o card "Seus times", a altura real da faixa de cookies, as abas em 320–390 px, o contraste medido no
// DOM) fica em scripts/provas/rodada-29l.prova.mjs (npm run provar:navegador).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { estadoDaFaixa, passoDaSeta } from '../../src/utils/faixaRolavel.js';
import { arredondarMedia, contar, formatarMedia, plural } from '../../src/utils/plural.js';
import { haQuantoTempo } from '../../src/utils/haQuantoTempo.js';
import { comTentativa } from '../../src/utils/comTentativa.js';
import { dataComDiaPorExtenso } from '../../src/utils/dataHora.js';
import { linhasDePendencia, resumoDoTime } from '../../src/utils/seuTime.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const SP = 'America/Sao_Paulo';

// ── A2 / C14 · achados 130 e 138: a faixa que rola avisa que rola ───────────────────────────────────────────────────────────────────
test('130/138 · faixa: no começo só há mais à direita; no meio, dos dois lados; no fim, só à esquerda', () => {
  const m = (scrollLeft) => estadoDaFaixa({ scrollLeft, clientWidth: 300, scrollWidth: 600 });
  assert.deepEqual(m(0), { esquerda: false, direita: true });
  assert.deepEqual(m(120), { esquerda: true, direita: true });
  assert.deepEqual(m(300), { esquerda: true, direita: false });
});

test('130/138 · faixa que cabe inteira (ou ainda sem medida) não avisa nada', () => {
  assert.deepEqual(estadoDaFaixa({ scrollLeft: 0, clientWidth: 300, scrollWidth: 300 }), { esquerda: false, direita: false });
  assert.deepEqual(estadoDaFaixa({ scrollLeft: 0, clientWidth: 300, scrollWidth: 303 }), { esquerda: false, direita: false }, 'até 4 px de folga não conta');
  assert.deepEqual(estadoDaFaixa({}), { esquerda: false, direita: false });
  assert.deepEqual(estadoDaFaixa({ scrollLeft: 0, clientWidth: 0, scrollWidth: 800 }), { esquerda: false, direita: false }, 'trilho escondido (largura 0)');
});

test('130 · a seta rola quase uma página e nunca passa das pontas', () => {
  const base = { clientWidth: 300, scrollWidth: 900 };
  assert.equal(passoDaSeta({ ...base, sentido: 1, scrollLeft: 0 }), 240);
  assert.equal(passoDaSeta({ ...base, sentido: 1, scrollLeft: 500 }), 600, 'trava no fim: scrollWidth − clientWidth');
  assert.equal(passoDaSeta({ ...base, sentido: -1, scrollLeft: 100 }), 0, 'trava no começo');
});

test('130/138 · o CSS esmaece a borda por onde ainda há conteúdo (máscara) e a seta tem área de toque de 44 px', () => {
  const css = ler('src/styles/app.css');
  assert.match(css, /\[data-mais-dir="1"\]\s*\{[^}]*mask-image: linear-gradient\(to right, #000 calc\(100% - 40px\), transparent 100%\)/);
  assert.match(css, /\[data-mais-esq="1"\]\s*\{[^}]*mask-image: linear-gradient\(to right, transparent 0, #000 40px\)/);
  assert.match(css, /\[data-mais-esq="1"\]\[data-mais-dir="1"\]\s*\{[^}]*transparent 0, #000 40px, #000 calc\(100% - 40px\), transparent 100%/);
  assert.match(css, /\.faixa-rolavel__seta::before \{ content: ''; position: absolute; inset: -8px; \}/, '28 px de caixa interna + 8 + 8 = 44 px de toque');
});

test('130/138 · os quatro trilhos usam o aviso: fundos e uniformes da Figurinha, uniforme do time, abas do Gabinete, chips do Início', () => {
  const fig = ler('src/pages/Figurinha.jsx');
  assert.match(fig, /<FaixaRolavel className="fig-seletor-grade"[^>]*data-grade="fundos"/, 'a faixa dos fundos (onde ficam os 3 da figurinha paga)');
  assert.match(fig, /<FaixaRolavel className="fig-seletor-grade"[^>]*data-grade="uniformes"/);
  assert.match(ler('src/components/EscolherUniformeTime.jsx'), /<FaixaRolavel className="fig-seletor-grade"/);
  assert.match(ler('src/pages/Gabinete.jsx'), /<nav className="gab2-side" ref=\{montarFaixaDeAbas\}/);
  assert.match(ler('src/pages/Inicio.jsx'), /<div className="chips-row" ref=\{montarFaixaDeChips\}/);
});

// ── A1 · achado 127: um time, o card de sempre; dois ou mais, "Seus times" ──────────────────────────────────────────────────────────
test('127 · o que a linha do time mostra fechada: nada, o texto da pendência, ou a contagem', () => {
  const base = { slug: 'missa', fuso: SP };
  assert.equal(resumoDoTime({ ...base, pendencias: { pedidos: 0, presenca: null, resultado: null, denuncias: 0 } }), '', 'sem pendência a linha é só escudo e nome');
  assert.equal(resumoDoTime({ ...base, pendencias: { pedidos: 1 } }), '1 pedido de entrada');
  assert.equal(
    resumoDoTime({ ...base, pendencias: { presenca: { game_id: 'g', data: '2026-10-09T23:00:00Z' } } }),
    'Sexta, 9 de out.: presença ainda não aberta',
  );
  assert.equal(resumoDoTime({ ...base, pendencias: { pedidos: 2, denuncias: 1 } }), '2 pendências');
  assert.equal(resumoDoTime({ slug: 'x' }), '', 'resposta antiga do motor, sem pendências');
});

test('127 · CardSeuTime: 1 time é o card de sempre; 2+ viram UM card "Seus times", com os atalhos ao tocar na linha', () => {
  const card = ler('src/components/CardSeuTime.jsx');
  assert.match(card, /if \(seuTime\.length === 1\) \{[\s\S]*return <UmTime /, 'com um time só, o UmTime de antes');
  assert.match(card, /return <SeusTimes seuTime=\{seuTime\}/);
  assert.match(card, /<span style=\{ROTULO\}>Seus times<\/span>/);
  assert.match(card, /aria-expanded=\{aberta\}/, 'a linha é um botão que abre/fecha os atalhos');
  assert.match(card, /\{aberta \? \(/, 'os atalhos só existem na linha aberta');
  assert.match(card, /<span style=\{ROTULO\}>Seu time<\/span>/, 'o rótulo do card de um time só não mudou');
  // Os mesmos quatro atalhos, o mesmo "Tudo tranquilo", servidos pelas mesmas peças nos dois cards.
  assert.match(card, /<Atalhos base=\{`\/time\/\$\{time\.slug\}`\} time=\{time\} games=\{games\} \/>/);
});

// ── B8 · achado 128: o jogo sem presença aberta lê bem ──────────────────────────────────────────────────────────────────────────────
test('128 · "Sexta, 9 de out.: presença ainda não aberta" (e a data por extenso vem de dataHora.js)', () => {
  assert.equal(dataComDiaPorExtenso('2026-10-09T23:00:00Z', SP), 'Sexta, 9 de out.');
  assert.equal(dataComDiaPorExtenso('2026-10-10T12:00:00Z', SP), 'Sábado, 10 de out.');
  assert.equal(dataComDiaPorExtenso('2026-10-11T12:00:00Z', SP), 'Domingo, 11 de out.');
  assert.equal(dataComDiaPorExtenso('lixo', SP), '');
  // Dia do relógio do CAMPO, não do aparelho: 02:30 UTC de sábado ainda é sexta à noite em São Paulo.
  assert.equal(dataComDiaPorExtenso('2026-10-10T02:30:00Z', SP), 'Sexta, 9 de out.');
  const [linha] = linhasDePendencia({ slug: 'm', fuso: SP, pendencias: { presenca: { game_id: 'g', data: '2026-10-09T23:00:00Z' } } });
  assert.equal(linha.texto, 'Sexta, 9 de out.: presença ainda não aberta');
});

// ── B6 · achado 135: a única palavra de Portugal na tela ───────────────────────────────────────────────────────────────────────────
test('135 · "Ainda sem votos recebidos neste time" (nunca "nesta equipa")', () => {
  const perfil = semComentarios(ler('src/pages/JogadorPerfil.jsx'));
  assert.match(perfil, /Ainda sem votos recebidos neste time\. A nota aparece depois dos primeiros jogos\./);
  assert.doesNotMatch(perfil, /(?:>|')[^<>'{}]*\bequipa\b[^<>'{}]*(?:<|')/i, 'nenhum texto visível com "equipa" nesta tela');
});

// ── B7 · achado 136: concordância em todo contador ─────────────────────────────────────────────────────────────────────────────────
test('136 · contar/plural: 1 no singular, 0 e o resto no plural', () => {
  assert.equal(contar(1, 'jogo', 'jogos'), '1 jogo');
  assert.equal(contar(0, 'jogo', 'jogos'), '0 jogos');
  assert.equal(contar(2, 'membro', 'membros'), '2 membros');
  assert.equal(contar('1', 'gol', 'gols'), '1 gol', 'o número que vem do motor como texto também concorda');
  assert.equal(plural(1, 'Falta', 'Faltam'), 'Falta');
  assert.equal(plural(3, 'Falta', 'Faltam'), 'Faltam');
});

test('136 · a média de confirmados: "0" e não "0.0"; uma casa em vírgula quando não fecha; o plural segue o número mostrado', () => {
  assert.equal(formatarMedia(0), '0');
  assert.equal(formatarMedia(12), '12');
  assert.equal(formatarMedia(13.1), '13,1');
  assert.equal(formatarMedia(13.04), '13', 'arredonda para uma casa antes de decidir');
  assert.equal(formatarMedia(undefined), '0');
  assert.equal(plural(arredondarMedia(1.04), 'confirmado por jogo', 'confirmados por jogo'), 'confirmado por jogo', '1,04 mostra "1", então "1 confirmado"');
  assert.equal(plural(arredondarMedia(1.5), 'confirmado por jogo', 'confirmados por jogo'), 'confirmados por jogo');
});

test('136 · "há N meses": entre 56 e 59 dias é "há 1 mês" (era "há 1 meses"); a Resenha e os comentários usam a mesma função', () => {
  const agora = Date.parse('2026-10-03T12:00:00Z');
  const ha = (dias) => haQuantoTempo(new Date(agora - dias * 86400000).toISOString(), agora);
  assert.equal(ha(57), 'há 1 mês');
  assert.equal(ha(60), 'há 2 meses');
  assert.equal(ha(3), 'há 3 dias');
  assert.equal(ha(21), 'há 3 semanas');
  assert.equal(haQuantoTempo(new Date(agora - 5 * 60000).toISOString(), agora), 'há 5 min');
  assert.equal(haQuantoTempo('lixo', agora), '');
  for (const arquivo of ['src/pages/Feed.jsx', 'src/components/Comentarios.jsx']) {
    const fonte = ler(arquivo);
    assert.match(fonte, /import \{ haQuantoTempo \} from '\.\.\/utils\/haQuantoTempo'|import \{ haQuantoTempo \} from '\.\.\/utils\/haQuantoTempo';/, arquivo);
    assert.doesNotMatch(fonte, /function haQuantoTempo/, `${arquivo}: sem cópia própria`);
  }
});

test('136 · nenhum contador do app fica sem concordar: sem "(s)" e sem o rótulo fixo no plural ao lado de um número', () => {
  const alvos = ['src/pages/Gabinete.jsx', 'src/pages/gabinete/Brilhantes.jsx', 'src/pages/gabinete/PessoasTimes.jsx', 'src/pages/gabinete/Velocidade.jsx'];
  const improvisos = ['custo(s)', 'tabela(s)', 'policy(ies)', 'regra(s)', 'configurada(s)', 'crédito(s)', 'membro(s)'];
  for (const arquivo of alvos) {
    const fonte = semComentarios(ler(arquivo));
    for (const palavra of improvisos) assert.ok(!fonte.includes(palavra), `${arquivo}: "${palavra}" é fugir da concordância`);
  }
  const admin = ler('src/pages/AdminPanel.jsx');
  assert.match(admin, /label=\{plural\(stats\?\.total_jogos, 'jogo', 'jogos'\)\}/);
  assert.match(admin, /label=\{plural\(stats\?\.total_membros, 'membro', 'membros'\)\}/);
  assert.doesNotMatch(admin, /label="(jogos|membros)"/, 'a aba Elenco não mostra mais "1 JOGOS" nem "1 MEMBROS"');
  assert.match(ler('src/pages/Inicio.jsx'), /\{plural\(stats\?\.jogos \?\? 0, 'jogo', 'jogos'\)\}/);
  assert.match(ler('src/pages/Inicio.jsx'), /\{plural\(stats\?\.gols \?\? 0, 'gol', 'gols'\)\}/);
  assert.match(ler('src/pages/MeuPerfil.jsx'), /plural\(stats\.gols \?\? 0, 'gol', 'gols'\)/);
  assert.match(ler('src/pages/JogadorPerfil.jsx'), /plural\(conquistas\.jogos_total \?\? 0, 'Jogo', 'Jogos'\)/);
  assert.match(ler('src/pages/Inicio.jsx'), /plural\(votacaoTop\.faltam, 'Falta', 'Faltam'\)/, '"Falta 1", não "Faltam 1"');
});

// ── A4 · achado 139: "Excluir" só depois de cancelar ───────────────────────────────────────────────────────────────────────────────
test('139 · o jogo ativo tem Editar e Cancelar jogo; "Excluir" só aparece no jogo JÁ cancelado', () => {
  const painel = ler('src/pages/AdminPanel.jsx');
  const abre = painel.indexOf('data-jogo-cancelado');
  assert.ok(abre > 0, 'o cartão do jogo cancelado existe');
  const apagar = [...painel.matchAll(/setConfirmacao\(\{ tipo: 'apagar', jogo: g \}\)/g)].map((m) => m.index);
  assert.equal(apagar.length, 1, 'um único botão que apaga jogo');
  assert.ok(apagar[0] > abre, 'e ele mora depois (dentro) do cartão do cancelado');
  const ativo = painel.slice(painel.indexOf('onClick={() => setEditar(g)}'), painel.indexOf('<RSVPAdmin gameId={g.id}'));
  assert.match(ativo, />Cancelar jogo</);
  assert.doesNotMatch(ativo, /Excluir/, 'a linha de botões do jogo ativo não tem Excluir');
  // O motor só apaga jogo futuro SEM confirmados (409 nos outros): o botão só é oferecido quando ele aceita.
  assert.match(painel, /\{g\.confirmados === 0 \? \(\s*<div style=\{\{ marginTop: 10 \}\}>\s*<button[^>]*data-excluir-jogo/);
});

test('129 · as abas do time têm a largura do próprio texto, e o selo ADMIN vira ponto dourado em telas estreitas', () => {
  const equipa = semComentarios(ler('src/pages/Equipa.jsx'));
  assert.doesNotMatch(equipa.slice(equipa.indexOf('const ESTILO_ABA'), equipa.indexOf('function AbasDoTime')), /flex: 1|fontSize|letterSpacing/, 'largura e fonte moram na classe, não no estilo em linha');
  assert.match(equipa, /flex: `\$\{abas\.length\} 1 auto`/);
  const css = ler('src/styles/app.css');
  assert.match(css, /\.aba-time \{\s*flex: 1 1 auto;\s*min-width: 0;/);
  assert.match(css, /@media \(max-width: 380px\) \{\s*\.aba-time \{[^}]*\}\s*\.aba-time__selo \{ font-size: 0; width: 7px; height: 7px;/);
});

test('131 · os botões − e + da Figurinha têm 44 px de toque, sem mexer na altura que a linha ocupa na página', () => {
  const css = ler('src/styles/app.css');
  assert.match(css, /\.fig-zoom-btn \{[^}]*width: 44px;\s*height: 44px;/);
  const fig = ler('src/pages/Figurinha.jsx');
  // A linha cresceu de 26 para 44 e as margens negativas acompanham: 44 − 13 − 15 = 26 − 4 − 6 = 16 px.
  assert.match(fig, /height: 44, marginTop: -13, marginBottom: -15/);
  assert.equal(44 - 13 - 15, 26 - 4 - 6);
});

test('132 · "Gerar minha figurinha" numa linha só; nas telas estreitas o rótulo curto (VOZ §4) em vez de quebrar', () => {
  const fig = ler('src/pages/Figurinha.jsx');
  assert.equal([...fig.matchAll(/<RotuloGerar \/>/g)].length, 2, 'os dois botões de gerar (dourado e roxo)');
  assert.equal([...fig.matchAll(/fig-io-btn fig-gerar/g)].length, 2, 'os dois levam a classe da linha só');
  assert.match(ler('src/components/RotuloGerar.jsx'), /<span className="rotulo-gerar-longo">Gerar minha figurinha<\/span>\s*<span className="rotulo-gerar-curto">Gerar figurinha<\/span>/);
  const css = ler('src/styles/app.css');
  assert.match(css, /\.fig-gerar \{ white-space: nowrap; min-width: 0; padding-left: 12px; padding-right: 12px; \}/);
  assert.match(css, /@media \(max-width: 410px\) \{\s*\.rotulo-gerar-longo \{ display: none; \}\s*\.rotulo-gerar-curto \{ display: inline; \}/);
});

test('134 · "Baixar" volta ao lado de "Compartilhar" também no celular (decisão do dono, 3-out)', () => {
  const fig = semComentarios(ler('src/pages/Figurinha.jsx'));
  assert.doesNotMatch(fig, /soCompartilhar|telaDeToque/, 'a trava da 29H (item 58) saiu');
  assert.match(fig, /data-acao="baixar"[\s\S]*?onClick=\{baixar\}[\s\S]*?Baixar/);
  assert.match(fig, /onClick=\{partilhar\}[\s\S]*?Compartilhar/);
});

test('140 · "Criar jogos recorrentes" e "Criar campeonato": cada um numa linha, na largura do texto', () => {
  const painel = ler('src/pages/AdminPanel.jsx');
  const par = painel.slice(painel.indexOf("aria-pressed={painel === 'recorrentes'}") - 140, painel.indexOf('Criar campeonato</button>') + 30);
  assert.match(par, /display: 'flex', flexWrap: 'wrap', gap: 8/);
  assert.equal([...par.matchAll(/flex: '1 1 auto', whiteSpace: 'nowrap'/g)].length, 2);
});

test('133 · cabeçalho do Gabinete: título e links não quebram ao meio; sem largura, os links descem juntos', () => {
  const gab = ler('src/pages/Gabinete.jsx');
  assert.match(gab, /flexWrap: 'wrap', justifyContent: 'space-between'/);
  assert.match(gab, /<h1 style=\{\{[^}]*whiteSpace: 'nowrap' \}\}>Gabinete/);
  assert.match(gab, /<span data-links-do-gabinete style=\{\{[^}]*whiteSpace: 'nowrap' \}\}>/);
});

test('142 · na tela do jogo o atalho diz o que é: "Ranking do time", com o troféu', () => {
  const jogo = ler('src/pages/Jogo.jsx');
  assert.match(jogo, /data-ranking-do-time[^>]*>\s*<Trophy size=\{14\} aria-hidden="true" \/> Ranking do time\s*<\/Link>/);
});

test('125 · a faixa de cookies fica na altura EXATA da barra de navegação (uma variável só, conferida contra o CSS da barra)', () => {
  const css = ler('src/styles/app.css');
  const barra = css.match(/\.bottom-nav \{[^}]*\}/)[0];
  const aba = css.match(/\.bottom-nav__tab \{[^}]*\}/)[0];
  const respiroTopo = Number(barra.match(/padding: (\d+)px 0;/)[1]);
  const borda = Number(barra.match(/border-top: (\d+)px/)[1]);
  const base = Number(barra.match(/padding-bottom: max\((\d+)px, env\(safe-area-inset-bottom\)\)/)[1]);
  const alturaDaAba = Number(aba.match(/height: (\d+)px/)[1]);
  const variavel = css.match(/--altura-barra-nav: calc\((\d+)px \+ max\((\d+)px, env\(safe-area-inset-bottom, 0px\)\)\);/);
  assert.ok(variavel, 'a variável existe');
  assert.equal(Number(variavel[1]), respiroTopo + alturaDaAba + borda, '8 + 54 + 1 = 63: o que a barra tem acima da base');
  assert.equal(Number(variavel[2]), base, 'e a mesma base mínima da barra');
  assert.equal(respiroTopo + alturaDaAba + borda + base, 75, 'a barra mede 75 px no celular sem barra de gesto');
  const faixa = semComentarios(ler('src/components/CookieBanner.jsx'));
  assert.match(faixa, /bottom: navVisivel \? 'var\(--altura-barra-nav\)'/);
  assert.doesNotMatch(faixa, /58px/, 'os 58 px "de cabeça" não voltam');
});

test('126 · o 404 de quem não tem sessão leva à landing e ao cadastro (o Explorar exige conta)', () => {
  const erro = ler('src/components/ErrorPage.jsx');
  assert.match(erro, /window\.location\.href = semSessao \? '\/' : '\/home'/);
  assert.match(erro, /href=\{semSessao \? '\/register' : '\/explorar'\}/);
  assert.match(erro, /\{semSessao \? 'Ou crie sua conta' : 'Ou descubra times perto de você'\}/);
  const app = ler('src/App.jsx');
  assert.match(app, /<ErrorPage titulo="Página não encontrada" mensagem="Esta página não existe\." semSessao=\{!session\} \/>/);
  assert.match(app, /<Route path="\*" element=\{<PaginaNaoEncontrada \/>\} \/>/);
});

// ── A5 · achado 141: a foto que falha ────────────────────────────────────────────────────────────────────────────────────────────────
test('141 · foto que falha: o endereço da nova tentativa ganha ?r=N (ou &r=N), a primeira fica intacta', () => {
  assert.equal(comTentativa('/api/media/abc', 0), '/api/media/abc');
  assert.equal(comTentativa('/api/media/abc', 2), '/api/media/abc?r=2');
  assert.equal(comTentativa('/api/media/abc?w=512', 1), '/api/media/abc?w=512&r=1');
});

test('141 · as três fotos de post da Resenha passam pelo ImagemDoPost; a linha de erro fala na voz da casa', () => {
  const feed = semComentarios(ler('src/pages/Feed.jsx'));
  assert.equal([...feed.matchAll(/<ImagemDoPost\b/g)].length, 3, 'foto do jogo, mídia única e carrossel');
  assert.doesNotMatch(feed, /<img src=\{urlImagem\((foto|assetUrl\(media\[0\]\.url\)|url), 512\)\}/, 'nenhuma foto de post fora do componente');
  const comp = ler('src/components/ImagemDoPost.jsx');
  assert.match(comp, /Não deu para carregar a foto\. Toque para tentar de novo\./);
  assert.match(comp, /onError=\{\(\) => setFalhou\(true\)\}/);
  assert.match(comp, /minHeight: 56/, 'a linha de erro é compacta (nada de 400 px de buraco)');
});

// ── A3 · achado 137: contraste ───────────────────────────────────────────────────────────────────────────────────────────────────────
function luminancia(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contraste = (a, b) => { const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

test('137 · o texto secundário do Início passa de 4,5:1 (WCAG AA) sobre o card de jogo', () => {
  const tokens = ler('src/index.css');
  const dim = tokens.match(/--text-dim:\s*(#[0-9a-fA-F]{6})/)[1];
  const fundoDoCard = '#0d0d12'; // o final do gradiente do .gcard
  assert.ok(contraste(dim, fundoDoCard) >= 4.5, `--text-dim ${dim} sobre ${fundoDoCard}: ${contraste(dim, fundoDoCard).toFixed(2)}:1`);
  assert.ok(contraste('#333333', fundoDoCard) < 2, 'o cinza antigo (#333) estava em ~1,6:1: a régua pega o defeito');

  const css = ler('src/styles/app.css');
  assert.match(css.match(/\.gcard__meta \{[^}]*\}/)[0], /color: var\(--text-dim\);/, '"12 confirmados" usa o cinza claro');
  const rsvp = semComentarios(ler('src/components/RSVPCard.jsx'));
  assert.doesNotMatch(rsvp, /color: 'var\(--label-color\)'/, '"até …", "Mudar resposta" e "Sair da lista" não usam mais o branco a 40% (~3,7:1)');
});
