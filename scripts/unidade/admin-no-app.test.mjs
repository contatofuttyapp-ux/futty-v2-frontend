// Futty v2.0 — Rodada 29I, bloco 3 (dono): ADMIN NÃO É UM LUGAR, é um conjunto de botões a mais nas telas que já existem.
//
// O que se trava aqui (o gesto, a aba e o toque de verdade são provados no navegador: npm run provar:navegador, "Página do time"):
//   · o card "Seu time" do Início: uma linha por pendência, com destino, e o "Tudo tranquilo" quando não há nenhuma; o "Sortear" vai
//     ao próximo jogo do time;
//   · a página do time tem as abas Jogos · Elenco · Ajustes (Ajustes só para o admin, com o selo ADMIN), "Voltar" pelo histórico;
//   · o Perfil não tem mais "Painel de administração"; tem "Meus times" (cada um leva ao time) e as Notificações por tipo;
//   · os textos: "AÇÕES DEFINITIVAS" (nome do dono; na 29R a única ação dela virou o cartão "Nova temporada de notas" e a seção saiu),
//     "Nova temporada de notas" (era "Pedir para votar de novo") zera as notas, item 69 (admin ≠ posição), e a hora do jogo nunca é
//     "fuso"/"hora do campo"/"horário de Brasília" na tela.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { linhasDePendencia, destinoDoSortear } from '../../src/utils/seuTime.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
// O código sem os comentários (as linhas // e os blocos /* */): os comentários contam a história do que saiu, a tela não.
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const SP = 'America/Sao_Paulo';

test('card "Seu time": uma linha por pendência, na ordem, cada uma levando ao lugar onde se resolve', () => {
  const linhas = linhasDePendencia({
    slug: 'missa',
    fuso: SP,
    pendencias: { pedidos: 2, presenca: { game_id: 'g2', data: '2026-10-08T23:00:00Z' }, resultado: { game_id: 'g1', data: '2026-10-01T23:00:00Z' }, denuncias: 1 },
  });
  assert.deepEqual(linhas, [
    { chave: 'pedidos', para: '/time/missa?aba=elenco', texto: '2 pedidos de entrada' },
    { chave: 'presenca', para: '/time/missa?aba=jogos&abrir-presenca=g2', texto: 'Quinta, 8 de out.: presença ainda não aberta' }, // 29L, achado 128; 29R, achado 147: leva ao jogo
    { chave: 'resultado', para: '/time/missa?aba=jogos', texto: 'Resultado de qui., 1 de out. por lançar' },
    { chave: 'denuncias', para: '/time/missa?aba=ajustes#denuncias', texto: '1 denúncia para ver' },
  ]);
  assert.deepEqual(linhasDePendencia({ slug: 'missa', fuso: SP, pendencias: { pedidos: 0, presenca: null, resultado: null, denuncias: 0 } }), []);
  assert.deepEqual(linhasDePendencia({ slug: 'missa' }), [], 'sem pendências (resposta antiga): nada');
  assert.equal(linhasDePendencia({ slug: 'm', pendencias: { pedidos: 1 } })[0].texto, '1 pedido de entrada');
});

test('card "Seu time": sempre aparece para o admin; sem pendência, "Tudo tranquilo por aqui." e os 4 atalhos com nome', () => {
  const card = ler('src/components/CardSeuTime.jsx');
  assert.match(card, /Tudo tranquilo por aqui\./);
  for (const atalho of ['Novo jogo', 'Sortear', 'Convidar', 'Ajustes']) assert.match(card, new RegExp(`rotulo="${atalho}"`), atalho);
  assert.match(card, /\?aba=elenco&convidar=1/, 'o Convidar abre o convite na aba Elenco');
});

test('"Sortear" vai ao próximo jogo do time (é lá que se sorteia); sem jogo marcado, ao Novo jogo', () => {
  const games = [
    { id: 'outro-time', team_id: 'T2', status: 'scheduled', date: '2026-10-05T23:00:00Z' },
    { id: 'depois', team_id: 'T1', status: 'scheduled', date: '2026-10-15T23:00:00Z' },
    { id: 'antes', team_id: 'T1', status: 'scheduled', date: '2026-10-08T23:00:00Z' },
    { id: 'acabou', team_id: 'T1', status: 'finished', date: '2026-10-01T23:00:00Z' },
  ];
  assert.equal(destinoDoSortear('missa', 'T1', games), '/time/missa/jogo/antes');
  assert.equal(destinoDoSortear('missa', 'T3', games), '/time/missa/jogo/novo');
  assert.equal(destinoDoSortear('missa', 'T1', []), '/time/missa/jogo/novo');
});

test('a página do time: abas Jogos · Elenco · Ajustes no estilo da Figurinha; Ajustes só para o admin, com o selo ADMIN', () => {
  const equipa = ler('src/pages/Equipa.jsx');
  assert.match(equipa, /\[\['jogos', 'Jogos'\], \['elenco', 'Elenco'\], \.\.\.\(ehAdmin \? \[\['ajustes', 'Ajustes'\]\] : \[\]\)\]/);
  assert.match(equipa, /data-selo-admin/);
  assert.match(equipa, /className="hud-corners-s aba-time"/);
  assert.match(equipa, /background: on \? 'rgba\(139,92,246,0\.2\)' : 'transparent'/, 'as mesmas medidas das abas da Figurinha');
  assert.match(equipa, /\{ replace: true \}/, 'trocar de aba não empilha histórico');
  assert.match(equipa, /<Topbar hud="TIME" back="voltar" backFallback="\/home" \/>/, '"Voltar" volta para onde a pessoa estava');
  // O que é só do admin vem em lazy: o jogador não baixa.
  for (const parte of ['JogosDoAdmin', 'ElencoDoAdmin', 'AjustesDoTime']) assert.match(equipa, new RegExp(`const ${parte} = lazyComRetry\\(`));
});

test('"Voltar" nas telas do time volta pelo histórico (nunca para o time por padrão)', () => {
  for (const [arquivo, hud] of [['src/pages/Jogo.jsx', 'JOGO'], ['src/pages/Jogos.jsx', 'JOGOS'], ['src/pages/NovoJogo.jsx', 'NOVO JOGO']]) {
    assert.match(ler(arquivo), new RegExp(`<Topbar hud="${hud}" back="voltar"`), arquivo);
  }
  assert.match(ler('src/pages/NovoJogo.jsx'), /navigate\(`\/time\/\$\{slug\}\/jogo\/\$\{game\.id\}`, \{ replace: true \}\)/, 'o formulário não fica no histórico');
});

test('Perfil: sai "Painel de administração"; fica "Meus times" (cada um leva ao time) e entra Notificações por tipo', () => {
  const perfil = ler('src/pages/MeuPerfil.jsx');
  assert.doesNotMatch(semComentarios(perfil), /Painel de administração|\/admin\//);
  assert.match(perfil, /<SecLabel>Meus times<\/SecLabel>/);
  assert.match(perfil, /<SecLabel>Notificações<\/SecLabel>/);
  assert.match(perfil, /<PreferenciasNotificacoes /);
  assert.match(perfil, /navigate\('\/gabinete'\)/, 'o Gabinete (super-admin) continua no Perfil');
  const prefs = ler('src/components/PreferenciasNotificacoes.jsx');
  for (const rotulo of ['Jogos e presença', 'Pedidos de entrada', 'Figurinha pronta', 'Resenha']) assert.match(prefs, new RegExp(`rotulo: '${rotulo}'`), rotulo);
  assert.match(prefs, /soAdmin: true/, 'Pedidos de entrada só para quem administra');
});

test('Ajustes: "Nova temporada de notas" (nunca "Zona de perigo") zera as notas, com confirmação; "Ações definitivas" não existe mais', () => {
  const painel = ler('src/pages/AdminPanel.jsx');
  // 29R (achado 150): a única ação de "Ações definitivas" saiu para o cartão próprio; a seção, vazia, saiu junto.
  assert.doesNotMatch(semComentarios(painel), /Ações definitivas|Zona de perigo/);
  assert.match(painel, /pedir-revotacao`, \{ method: 'POST', body: JSON\.stringify\(\{ zerar: true \}\) \}/, 'a chamada ao motor não mudou');
  assert.match(painel, /<ConfirmModal\s+texto="Começar uma nova temporada\? As notas de todo mundo voltam a zero\. Não dá para desfazer\."/);
  assert.match(painel, /confirmarLabel="Zerar e começar"/);
  assert.match(painel, /showToast\('Nova temporada aberta\. O time foi avisado para dar as notas\.'\)/);
  for (const secao of ['O time', 'Notificações do admin', 'Avisar o time', 'Denúncias', 'Notas do time']) assert.match(painel, new RegExp(`titulo="${secao}"`), secao);
  // O cartão vem DEPOIS das Denúncias (é o último dos Ajustes), com o texto de apoio da decisão do dono.
  assert.ok(painel.indexOf('titulo="Denúncias"') < painel.indexOf('titulo="Notas do time"'), 'o cartão fica no fim dos Ajustes');
  assert.match(painel, /Zera as notas e o time avalia todo mundo de novo, do zero\./);
});

test('150 · a temporada de notas: o botão é o dourado da casa (cta-gold, ícone Star), nunca vermelho; só a confirmação é vermelha', () => {
  const painel = ler('src/pages/AdminPanel.jsx');
  const componente = painel.match(/function PedirVotarDeNovo\([\s\S]*?\r?\n\}\r?\n/)?.[0] || '';
  const botao = componente.split(/\r?\n/).find((l) => l.includes('data-pedir-votar-de-novo')) || ''; // a tag de abertura do botão, numa linha só
  assert.match(botao, /className="btn hud-corners-s cta-gold"/, 'o dourado da casa');
  assert.doesNotMatch(botao, /danger|fda4af|239,\s*68,\s*68|#f87171|ef4444/i, 'o botão não tem vermelho nenhum');
  assert.match(componente, /<Star size=\{18\}/, 'ícone Star do lucide');
  assert.match(componente, /\{busy \? 'Abrindo…' : 'Nova temporada de notas'\}/, 'o rótulo');
  assert.match(painel, /import \{[^}]*\bStar\b[^}]*\} from 'lucide-react'/);
  // O cartão não tem borda vermelha (era o que dizia "perigo" antes de a pessoa tocar).
  assert.doesNotMatch(semComentarios(componente), /borderColor/);
  // A confirmação segue vermelha: `perigo` no ConfirmModal, que pinta o botão de confirmar com --danger.
  assert.match(componente, /<ConfirmModal[\s\S]*?\bperigo\b[\s\S]*?\/>/);
  assert.match(painel, /style=\{\{ width: '100%', \.\.\.\(perigo \? \{ background: 'var\(--danger\)', color: '#fff' \} : \{\}\) \}\}/);
  // Nada do texto antigo.
  for (const antigo of ['Pedir para votar de novo', 'Zerar e pedir', 'Zerando…']) assert.ok(!semComentarios(painel).includes(antigo), antigo);
});

test('150 · o Início: o cartão de votação diz "Nova temporada de notas no <time>" e "Dê sua nota aos companheiros." (o resto não muda)', () => {
  const inicio = semComentarios(ler('src/pages/Inicio.jsx'));
  assert.match(inicio, /`Nova temporada de notas no \$\{votacaoTop\.nome\}`/);
  assert.match(inicio, /'Dê sua nota aos companheiros\.'/);
  assert.doesNotMatch(inicio, /pediu nova avaliação|companheiros do último jogo/);
  // O resto do cartão: o que vale sem pedido de revotação, o botão e o destino.
  assert.match(inicio, /'Você tem colegas para avaliar'/);
  assert.match(inicio, /plural\(votacaoTop\.faltam, 'Falta', 'Faltam'\)/);
  assert.match(inicio, /to=\{`\/time\/\$\{votacaoTop\.slug\}\/ranking`\}/);
});

test('147 · a linha "presença ainda não aberta" leva ao jogo certo (?abrir-presenca=<game_id>); o texto e as outras linhas não mudam', () => {
  const pend = (extra) => linhasDePendencia({ slug: 'missa', fuso: SP, pendencias: { presenca: { game_id: 'g-9', data: '2026-10-09T23:00:00Z' }, resultado: { game_id: 'g1', data: '2026-10-01T23:00:00Z' }, ...extra } });
  const [presenca, resultado] = pend();
  assert.equal(presenca.para, '/time/missa?aba=jogos&abrir-presenca=g-9');
  assert.equal(presenca.texto, 'Sexta, 9 de out.: presença ainda não aberta');
  assert.equal(resultado.para, '/time/missa?aba=jogos', 'o resultado por lançar continua só na aba Jogos');
  // O id vai codificado: nunca quebra o endereço.
  assert.equal(linhasDePendencia({ slug: 'm', fuso: SP, pendencias: { presenca: { game_id: 'a b&c', data: '2026-10-09T23:00:00Z' } } })[0].para, '/time/m?aba=jogos&abrir-presenca=a%20b%26c');
  // Resposta antiga do motor, sem game_id: a aba, como antes (nunca "abrir-presenca=undefined").
  assert.equal(linhasDePendencia({ slug: 'm', fuso: SP, pendencias: { presenca: { data: '2026-10-09T23:00:00Z' } } })[0].para, '/time/m?aba=jogos');
});

test('147 · a página do time lê ?abrir-presenca, entrega ao jogo e apaga do endereço sem empilhar histórico; trocar de aba também apaga', () => {
  const equipa = semComentarios(ler('src/pages/Equipa.jsx'));
  assert.match(equipa, /searchParams\.get\('abrir-presenca'\)/);
  assert.match(equipa, /<JogosDoAdmin [\s\S]*?abrirPresencaDe=\{abrirPresencaDe\} aoUsarAbrirPresenca=\{usouAbrirPresenca\}/);
  assert.match(equipa, /p\.delete\('abrir-presenca'\);\s*return p;\s*\}, \{ replace: true \}\)/, 'sai do endereço trocando a entrada do histórico: "Voltar" não reabre');
  const painel = semComentarios(ler('src/pages/AdminPanel.jsx'));
  assert.match(painel, /useState\(abrirInicial\)/, 'o "Abrir presença" do jogo certo já nasce aberto (o mesmo estado do botão)');
  assert.match(painel, /abrirInicial=\{!!abrirPresencaDe && String\(g\.id\) === String\(abrirPresencaDe\)\}/, 'só o jogo do parâmetro');
  assert.match(painel, /className=\{destaque === g\.id \? 'jogo-destaque' : undefined\}/, 'destaque curto no cartão');
  assert.match(ler('src/styles/app.css'), /\.jogo-destaque \{ animation: jogoDestaque 2\.4s/);
});

test('item 69: a tela diz que "admin" e "posição em campo" são coisas separadas', () => {
  const texto = ler('src/components/EscolhaLinhaGol.jsx');
  assert.match(texto, /TEXTO_ADMIN_E_POSICAO = 'Admin é quem organiza o time\. Não tem nada a ver com a posição em campo/);
  assert.match(ler('src/pages/AdminPanel.jsx'), /\{TEXTO_ADMIN_E_POSICAO\}/);
});

test('4b: a hora do jogo na tela é "Hora do jogo" ou "Hora" — nunca "fuso", "hora do campo" nem "horário de Brasília" como rótulo', () => {
  for (const arquivo of ['src/pages/NovoJogo.jsx', 'src/pages/AdminPanel.jsx', 'src/pages/Jogo.jsx', 'src/components/RSVPCard.jsx', 'src/utils/sorteioCartao.js']) {
    // Só o que a pessoa LÊ: texto de JSX (>…<) e textos entre aspas — não nomes de variável como team?.fuso.
    for (const l of semComentarios(ler(arquivo)).split('\n')) {
      assert.doesNotMatch(l, /((?<!=)>|')[^<>'{}]*(?<![.\w])(fuso|hora do campo|horário de Brasília)\b[^<>'{}]*(<|')/i, `${arquivo}: ${l.trim().slice(0, 90)}`);
    }
  }
  assert.match(ler('src/pages/NovoJogo.jsx'), /Hora do jogo/);
});

test('item 68: o "Novo jogo" já vem com o padrão do time, dobrado — "Padrão do time: N · mudar só neste jogo"', () => {
  const novo = ler('src/pages/NovoJogo.jsx');
  assert.match(novo, /Padrão do time: <b>\{padraoDoTime\}<\/b>/);
  assert.match(novo, /mudar só neste jogo/);
  assert.match(novo, /\.\.\.\(porTime != null \? \{ jogadores_por_time: Number\(porTime\) \} : \{\}\)/, 'sem número, o motor usa o padrão do time');
});

test('item 65: o cartão do Planos chama "Pacote do time" (a seção em volta é "Figurinhas do time")', async () => {
  const { produtosDaTela } = await import('../../src/lib/planos.js');
  const loja = { pacote: { priceString: 'R$ 49,90', preco: 49.9, moeda: 'BRL' } };
  const nomes = [produtosDaTela(true, loja), produtosDaTela(false)].flat().filter((p) => p.id === 'pacote').map((p) => p.nome);
  assert.equal(nomes.length, 2, 'o cartão do pacote, com a loja e sem ela');
  for (const nome of nomes) assert.equal(nome, 'Pacote do time');
  assert.match(ler('src/pages/Planos.jsx'), />Figurinhas do time<\/h2>/);
});
