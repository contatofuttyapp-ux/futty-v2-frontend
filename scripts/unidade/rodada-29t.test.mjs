// Futty v2.0 — Rodada 29T, bloco A: o Início que mostra o jogo (achado 168) e os pequenos (achados 158 a 167). As contas e os textos aqui; o que só
// um navegador confirma (a fila de avisos na tela de verdade, "Ver todos", o nome que nunca corta, o escudo que cai nas iniciais, a primeira
// tela de 390×844 no estado pesado) fica em scripts/provas/rodada-29t.prova.mjs (npm run provar:navegador).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jogosQuePedemResposta, proximoAviso } from '../../src/utils/avisosDoInicio.js';
import { initials } from '../../src/utils/teamColors.js';
import { TITULO_SEM_LOCAL, depoisDePedirEntrada, tituloDoRadar } from '../../src/utils/radar.js';
import { cidadeDoRabicho, formatarDataHora, rabichoDoFuso } from '../../src/utils/dataHora.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const SP = 'America/Sao_Paulo';
const LISBOA = 'Europe/Lisbon';

const jogo = (id, resto = {}) => ({ id, team_id: 'T1', status: 'scheduled', date: '2026-10-08T23:00:00Z', user_status: null, eu_jogo: true, ausente_proximo: false, cancelado: false, ...resto });

// ── B · a fila dos avisos do topo ─────────────────────────────────────────────────────────────────────────────────────────────────────
test('168 · o jogo que pede resposta: marcado, sem Vou / Não vou e de time em que a pessoa joga', () => {
  const pedem = jogosQuePedemResposta([
    jogo('a'),
    jogo('respondido', { user_status: 'going' }),
    jogo('recusado', { user_status: 'not_going' }),
    jogo('so-organizo', { eu_jogo: false }),
    jogo('sorteado', { status: 'drawn' }),
    jogo('encerrado', { status: 'finished' }),
    jogo('cancelado', { cancelado: true }),
  ]);
  assert.deepEqual(pedem.map((g) => g.id), ['a']);
});

test('168 · nunca pede resposta de time em que a pessoa só organiza (eu_jogo === false)', () => {
  assert.deepEqual(jogosQuePedemResposta([jogo('x', { eu_jogo: false })]), []);
  // O motor antigo não mandava `eu_jogo`: ausente = joga (como o card do jogo, que só esconde os botões com `=== false`).
  const velho = jogo('y');
  delete velho.eu_jogo;
  assert.deepEqual(jogosQuePedemResposta([velho]).map((g) => g.id), ['y']);
});

test('168 · o mais próximo primeiro, e o jogo sem data vai para o fim da fila', () => {
  const pedem = jogosQuePedemResposta([
    jogo('sem-data', { date: null }),
    jogo('longe', { date: '2026-11-20T23:00:00Z', team_id: 'T2' }),
    jogo('perto', { date: '2026-10-09T23:00:00Z', team_id: 'T3' }),
  ]);
  assert.deepEqual(pedem.map((g) => g.id), ['perto', 'longe', 'sem-data']);
});

test('168 · quem já avisou que não vai ao próximo jogo do time não é cobrado desse jogo (mas do seguinte, sim)', () => {
  const pedem = jogosQuePedemResposta([
    jogo('proximo', { date: '2026-10-09T23:00:00Z', ausente_proximo: true }),
    jogo('seguinte', { date: '2026-10-16T23:00:00Z', ausente_proximo: true }),
    jogo('outro-time', { team_id: 'T2', date: '2026-10-10T23:00:00Z' }),
  ]);
  assert.deepEqual(pedem.map((g) => g.id), ['outro-time', 'seguinte']);
});

test('168 · a ordem da fila: jogo sem resposta → pedido pendente → ativar notificações', () => {
  const g = [jogo('a')];
  const p = [{ id: 'p1' }];
  assert.equal(proximoAviso({ jogos: g, pedidos: p, notificacoes: true }).tipo, 'jogo');
  assert.equal(proximoAviso({ jogos: [], pedidos: p, notificacoes: true }).tipo, 'pedido');
  assert.equal(proximoAviso({ jogos: [], pedidos: [], notificacoes: true }).tipo, 'notificacoes');
  assert.equal(proximoAviso({ jogos: [], pedidos: [], notificacoes: false }), null, 'fila vazia: nenhum aviso');
  assert.equal(proximoAviso(), null);
});

test('168 · UM aviso por vez: o resultado é um só, com o item e a contagem dos que esperam do mesmo tipo ("+N")', () => {
  const dois = proximoAviso({ jogos: [jogo('a'), jogo('b'), jogo('c')], pedidos: [{ id: 'p1' }, { id: 'p2' }], notificacoes: true });
  assert.equal(dois.tipo, 'jogo');
  assert.equal(dois.item.id, 'a', 'o mais próximo');
  assert.equal(dois.mais, 2, '"+2": os outros dois jogos');
  const pedidos = proximoAviso({ jogos: [], pedidos: [{ id: 'p1' }, { id: 'p2' }], notificacoes: true });
  assert.deepEqual([pedidos.tipo, pedidos.item.id, pedidos.mais], ['pedido', 'p1', 1]);
  assert.equal(proximoAviso({ jogos: [], pedidos: [], notificacoes: true }).mais, 0);
});

test('168 · respondeu → entra o próximo da fila (jogo → outro jogo → pedido → notificações)', () => {
  const jogos = [jogo('a', { date: '2026-10-09T23:00:00Z' }), jogo('b', { date: '2026-10-10T23:00:00Z', team_id: 'T2' })];
  const pedidos = [{ id: 'p1' }];
  const fila = () => proximoAviso({ jogos: jogosQuePedemResposta(jogos), pedidos, notificacoes: true });
  assert.equal(fila().item.id, 'a');
  jogos[0].user_status = 'going'; // "Vou" no aviso
  assert.deepEqual([fila().tipo, fila().item.id, fila().mais], ['jogo', 'b', 0]);
  jogos[1].user_status = 'not_going'; // "Não vou" no seguinte
  assert.equal(fila().tipo, 'pedido');
  pedidos.length = 0; // cancelou o pedido
  assert.equal(fila().tipo, 'notificacoes');
});

test('168 · o Início usa a fila: um slot só no topo, o aviso do jogo chama a MESMA função dos cards e o pedido segue com "Cancelar"', () => {
  const inicio = semComentarios(ler('src/pages/Inicio.jsx'));
  assert.match(inicio, /import \{ LEMBRETES_SEM_PRAZO, jogosQuePedemResposta, proximoAviso \} from '\.\.\/utils\/avisosDoInicio';/); // 29T-C: + a lista dos lembretes sem prazo
  // 29T-B: a mesma fila, agora com todos os avisos do topo (a ordem em si é travada em rodada-29t-b.test.mjs).
  assert.match(inicio, /const aviso = proximoAviso\(\{\s*jogos: jogosQuePedemResposta\(jogosParaAviso\),\s*pedidos: pedidosPendentes,[\s\S]*?notificacoes: pushEstado === 'suportado' && !pushBannerFechado,\s*\}\);/);
  // O aviso do jogo: os botões chamam responderDoAviso → onPresence, a função que os cards dos Próximos jogos também usam.
  assert.match(inicio, /<AvisoDeJogo game=\{aviso\.item\} team=\{timeDoJogo\(aviso\.item\.team_id\)\} mais=\{aviso\.mais\} busy=\{busyId === aviso\.item\.id\} onPresence=\{responderDoAviso\} \/>/);
  assert.match(inicio, /async function responderDoAviso\(gameId, going\) \{\s*const fim = await onPresence\(gameId, going\);/);
  assert.match(inicio, /<GameCard\s+key=\{item\.game\.id\}[\s\S]*?onPresence=\{onPresence\}/, 'o card do jogo chama a mesma onPresence');
  // onPresence: o RSVP aberto responde pelo RSVP; senão, a chamada de sempre do card.
  assert.match(inicio, /if \(rsvpValeParaOJogo\(gameId\)\) return responderRsvp\(gameId, going \? 'confirmado' : 'recusado'\);/);
  assert.match(inicio, /apiFetch\(`\/api\/games\/\$\{gameId\}\/confirmar`/);
  // Um slot só: cada tipo de aviso da fila sai de `aviso?.tipo`, e os dois blocos antigos (banner direto, mapa de pedidos) não existem mais.
  assert.match(inicio, /aviso\?\.tipo === 'jogo'/);
  assert.match(inicio, /aviso\?\.tipo === 'pedido'/);
  assert.match(inicio, /aviso\?\.tipo === 'notificacoes'/);
  assert.doesNotMatch(inicio, /pedidosPendentes\.map\(/, 'não são mais vários pedidos empilhados');
  assert.doesNotMatch(inicio, /\{pushEstado === 'suportado' && !pushBannerFechado \? \(/, 'o banner de notificações só aparece pela fila');
  assert.match(inicio, /cancelarPedidoPendente\(aviso\.item\)/);
  assert.match(inicio, /Pedido pendente na \{aviso\.item\.team\?\.nome\}/, 'o pedido do dono adorou: o mesmo texto');
  assert.match(inicio, /onClick=\{fecharPushBanner\}/, 'as notificações continuam fechando');
});

test('168 · o aviso do jogo: escudo, dia e hora pela dataHora.js (com a cidade do time), a pergunta "Você vai?" e Vou / Não vou', () => {
  const aviso = semComentarios(ler('src/components/AvisoDeJogo.jsx'));
  assert.match(aviso, /import \{ formatarDataHora \} from '\.\.\/utils\/dataHora';/);
  assert.match(aviso, /formatarDataHora\(game\.date, game\.fuso, \{ cidade: team\?\.cidade \}\)/);
  assert.match(aviso, /<EscudoEquipa /);
  assert.match(aviso, />Você vai\?</);
  assert.match(aviso, /onClick=\{\(\) => onPresence\(game\.id, true\)\}[\s\S]*?Vou\s*<\/button>/);
  assert.match(aviso, /onClick=\{\(\) => onPresence\(game\.id, false\)\}[\s\S]*?Não vou\s*<\/button>/);
  assert.match(aviso, /minHeight: 44/, 'alvo de toque de 44 px');
  assert.match(aviso, /\+\{mais\}/, 'o "+N" discreto');
  assert.doesNotMatch(aviso, /formatDateTime|toLocale/, 'nenhuma tela formata data por conta própria (lei da hora do jogo)');
});

test('168 · "Seus times" mostra até 2 linhas; com mais, "Ver todos (N)" abre o resto no lugar e "Ver menos" fecha', () => {
  const card = ler('src/components/CardSeuTime.jsx');
  assert.match(card, /export const TIMES_VISIVEIS = 2;/);
  // 29T-B: a lista fechada tem 2 linhas OU todos os times com pendência (e eles vêm primeiro); a conta em si é travada em rodada-29t-b.test.mjs.
  assert.match(card, /const visiveis = quantosTimesMostrar\(seuTime, TIMES_VISIVEIS\);/);
  assert.match(card, /const mostrados = verTodos \? seuTime : seuTime\.slice\(0, visiveis\);/);
  assert.match(card, /\{mostrados\.map\(\(time, i\) => \{/);
  assert.match(card, /\{verTodos \? 'Ver menos' : `Ver todos \(\$\{seuTime\.length\}\)`\}/);
  assert.match(card, /\{sobram > 0 \? \(/, 'com 2 times ou menos o botão nem existe');
  assert.match(card, /<span style=\{ROTULO\}>Seus times<\/span>/, 'o rótulo do card não mudou');
});

// ── C · achado 158: as iniciais do escudo pulam do/da/de/dos/das/e ────────────────────────────────────────────────────────────────────
test('158 · iniciais do escudo: "Racha do Guará" → RG, "Pelada do Bandeirante" → PB (e os outros do álbum)', () => {
  assert.equal(initials('Racha do Guará'), 'RG');
  assert.equal(initials('Pelada do Bandeirante'), 'PB');
  assert.equal(initials('Racha da Candanga'), 'RC');
  assert.equal(initials('Rachão do Riacho'), 'RR');
  assert.equal(initials('Racha da Asa Norte'), 'RA', 'da pula; as duas primeiras palavras que sobram');
  assert.equal(initials('Boleiros do Cruzeiro'), 'BC');
  assert.equal(initials('Os Pica'), 'OP', '"Os" não está na lista de ligações');
});

test('158 · as ligações são do/da/de/dos/das/e, em qualquer caixa; o resto do nome segue igual', () => {
  assert.equal(initials('Amigos dos Amigos'), 'AA');
  assert.equal(initials('Times das Estrelas'), 'TE');
  assert.equal(initials('Pedro e Paulo FC'), 'PP');
  assert.equal(initials('Missa de Quinta'), 'MQ');
  assert.equal(initials('RACHA DO GUARÁ'), 'RG');
  assert.equal(initials('Domingueira FC'), 'DF');
  assert.equal(initials('Domingueira'), 'D', 'uma palavra só: uma letra, como sempre');
  assert.equal(initials('  Racha   do   Guará  '), 'RG');
});

test('158 · nome só de ligações ainda dá letras, e nome vazio dá vazio (a tela põe o "?")', () => {
  assert.equal(initials('De E'), 'DE');
  assert.equal(initials('do'), 'D');
  assert.equal(initials(''), '');
  assert.equal(initials(undefined), '');
  assert.equal(initials(null), '');
});

test('158 · em todo lugar que faz iniciais de time: o escudo e o passo 1 do Criar time usam a MESMA função', () => {
  assert.match(ler('src/components/EscudoEquipa.jsx'), /import \{ initials \} from '\.\.\/utils\/teamColors';/);
  const criar = ler('src/pages/CriarEquipa.jsx');
  assert.match(criar, /import \{ initials \} from '\.\.\/utils\/teamColors';/);
  assert.match(criar, /\{initials\(nome\) \|\| '\?'\}/);
  assert.doesNotMatch(criar, /const iniciais = /, 'a conta própria do Criar time saiu (era a que dava RD)');
});

// ── D · achado 159: entrar num time aberto comemora ───────────────────────────────────────────────────────────────────────────────────
test('159 · entrou num time aberto: "Você entrou!", a contagem sobe 1 e deixa de ser "já era membro"', () => {
  const lista = [
    { slug: 'candanga', membro_count: 12, ja_membro: false, pedido_pendente: false },
    { slug: 'outro', membro_count: 5, ja_membro: false, pedido_pendente: false },
  ];
  const depois = depoisDePedirEntrada(lista, 'candanga', true);
  assert.equal(depois[0].membro_count, 13);
  assert.equal(depois[0].entrou_agora, true);
  assert.equal(depois[0].ja_membro, true);
  assert.equal(depois[0].pedido_pendente, false);
  assert.deepEqual(depois[1], lista[1], 'os outros times não mexem');
  assert.equal(lista[0].membro_count, 12, 'a lista de antes não é alterada');
});

test('159 · pediu entrada (time com aprovação): fica pendente, sem comemorar e sem mexer na contagem', () => {
  const depois = depoisDePedirEntrada([{ slug: 'bandeirante', membro_count: 8, ja_membro: false }], 'bandeirante', false);
  assert.equal(depois[0].pedido_pendente, true);
  assert.equal(depois[0].membro_count, 8);
  assert.ok(!depois[0].entrou_agora);
  assert.equal(depois[0].ja_membro, false);
});

test('159 · "Você já é membro" só para quem já era antes de abrir a tela; quem acabou de entrar vê "Você entrou!" e o link "Ver o time"', () => {
  const tela = ler('src/pages/Explorar.jsx');
  // 29T-B: o que fica à direita do time (card e pop-up) é um componente só, AcaoDoTime; a ordem dos estados é a mesma.
  assert.match(tela, /if \(equipa\.entrou_agora\) \{/);
  assert.match(tela, />Você entrou!<\/span>/);
  assert.match(tela, /Ver o time\s*<\/Link>/);
  assert.match(tela, /to=\{`\/time\/\$\{equipa\.slug\}`\} state=\{\{ primeiraEntrada: true \}\}/, 'abre as boas-vindas do time, como o aceite do pedido');
  assert.ok(tela.indexOf('if (equipa.entrou_agora) {') < tela.indexOf('if (equipa.ja_membro) {'), 'o "entrou agora" vem antes do "já é membro"');
  assert.match(tela, />Você já é membro</, 'quem já era membro continua vendo a frase');
  assert.match(tela, /setEquipas\(\(cur\) => depoisDePedirEntrada\(cur, equipa\.slug, entrou\)\);/);
});

// ── E · achado 160: o escudo nunca fica vazio ─────────────────────────────────────────────────────────────────────────────────────────
test('160 · o logo que não carrega cai nas iniciais: onError guarda o endereço quebrado, e o fundo volta a ser o do escudo', () => {
  const escudo = semComentarios(ler('src/components/EscudoEquipa.jsx'));
  assert.match(escudo, /const \[logoQuebrado, setLogoQuebrado\] = useState\(null\);/);
  assert.match(escudo, /const src = srcDoLogo && logoQuebrado !== srcDoLogo \? srcDoLogo : null;/, 'logo novo (outro endereço) volta a ser tentado');
  assert.match(escudo, /onError=\{\(\) => setLogoQuebrado\(src\)\}/);
  assert.match(escudo, /background: src \? '#0c0c10' : fundo/, 'sem o logo, o fundo do escudo escolhido (não o preto do logo)');
});

// ── F · achado 161: o título da lista do Radar ────────────────────────────────────────────────────────────────────────────────────────
test('161 · título do Radar: sem localização nem cidade, "Peladas abertas a novos jogadores"', () => {
  assert.equal(TITULO_SEM_LOCAL, 'Peladas abertas a novos jogadores');
  assert.equal(tituloDoRadar(), 'Peladas abertas a novos jogadores');
  assert.equal(tituloDoRadar({ origem: null, cidade: 'Brasília, DF' }), 'Peladas abertas a novos jogadores', 'cidade digitada e não escolhida não conta');
});

test('161 · "Perto de você" só com a localização ligada; com cidade escolhida, "Em <cidade>"', () => {
  assert.equal(tituloDoRadar({ origem: 'localizacao' }), 'Perto de você');
  assert.equal(tituloDoRadar({ origem: 'localizacao', cidade: 'Brasília, DF' }), 'Perto de você');
  assert.equal(tituloDoRadar({ origem: 'cidade', cidade: 'Brasília, DF' }), 'Em Brasília, DF');
  assert.equal(tituloDoRadar({ origem: 'cidade', cidade: '  Lisboa ' }), 'Em Lisboa');
  assert.equal(tituloDoRadar({ origem: 'cidade', cidade: '' }), 'Peladas abertas a novos jogadores', 'cidade vazia não vira "Em "');
});

test('161 · o Radar liga o título à origem da posição: o botão da localização, a cidade da lista e a cidade livre', () => {
  const tela = semComentarios(ler('src/pages/Explorar.jsx'));
  assert.match(tela, /setOrigemPos\('localizacao'\);/);
  assert.equal((tela.match(/setOrigemPos\('cidade'\);/g) || []).length, 2, 'cidade da lista e cidade geocodificada');
  assert.match(tela, /setCidadeDaPos\(texto\);/);
  assert.match(tela, /setCidadeDaPos\(cidade\);/);
  assert.doesNotMatch(tela, /Times perto de você/);
});

// ── G · achado 162 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test('162 · "Esperando a aprovação do admin" — e nenhum "À espera" de aprovação em lugar nenhum do app', () => {
  assert.match(ler('src/pages/Inicio.jsx'), /Esperando a aprovação do admin\. Avisamos você aqui quando decidir\./);
  const achados = [];
  const varrer = (dir) => {
    for (const nome of fs.readdirSync(path.join(RAIZ, dir))) {
      const rel = `${dir}/${nome}`;
      if (fs.statSync(path.join(RAIZ, rel)).isDirectory()) varrer(rel);
      else if (/\.(jsx?|html)$/.test(nome) && /[àÀ] espera de aprova|[àÀ] espera da aprova/i.test(ler(rel))) achados.push(rel);
    }
  };
  varrer('src');
  assert.deepEqual(achados, []);
});

// ── H · achado 163 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test('163 · a frase "Você só organiza este time, então não entra na lista de presença…" sai de cima dos Próximos jogos; fica a linha do card', () => {
  const inicio = ler('src/pages/Inicio.jsx');
  assert.doesNotMatch(inicio, /então não entra na lista de presença/);
  assert.match(inicio, /Você só organiza este time\./, 'a linha de dentro do card do jogo');
  assert.equal((inicio.match(/Você só organiza este time\./g) || []).length, 1, 'uma vez só');
});

// ── I · achado 165 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test('165 · o rabicho com a cidade do time: "horário de Brasília" para um time de Brasília visto de Lisboa', () => {
  assert.equal(rabichoDoFuso('2026-10-08T23:00:00Z', SP, { cidade: 'Brasília - DF', olhando: LISBOA }), 'horário de Brasília');
  assert.equal(formatarDataHora('2026-10-08T23:00:00Z', SP, { cidade: 'Brasília, DF', olhando: LISBOA }), 'qui., 8 de out. · 20:00 · horário de Brasília');
  assert.equal(cidadeDoRabicho(SP, 'Brasília, DF'), 'Brasília');
  // Sem a cidade do time, o rabicho cai na cidade do fuso (o "horário de São Paulo" que o dono estranhou).
  assert.equal(rabichoDoFuso('2026-10-08T23:00:00Z', SP, { olhando: LISBOA }), 'horário de São Paulo');
  // Quem está no mesmo relógio não vê rabicho nenhum, com ou sem cidade.
  assert.equal(rabichoDoFuso('2026-10-08T23:00:00Z', SP, { cidade: 'Brasília', olhando: SP }), '');
});

test('165 · em todo lugar que mostra o rabicho a cidade do time vai junto (nenhuma chamada sem `cidade`)', () => {
  const sem = [];
  const varrer = (dir) => {
    for (const nome of fs.readdirSync(path.join(RAIZ, dir))) {
      const rel = `${dir}/${nome}`;
      if (fs.statSync(path.join(RAIZ, rel)).isDirectory()) { varrer(rel); continue; }
      if (!/\.jsx$/.test(nome)) continue;
      ler(rel).split('\n').forEach((linha, i) => {
        if (/^\s*(\/\/|\*|\{\/\*)/.test(linha) || /^import /.test(linha)) return;
        if (/\b(formatDateTime|formatarDataHora|rabichoDoFuso|fmtPrazoAdmin|formatarPrazo)\(/.test(linha) && !/cidade/.test(linha) && !/^(const|function) /.test(linha.trim())) sem.push(`${rel}:${i + 1}`);
      });
    }
  };
  varrer('src');
  assert.deepEqual(sem, [], 'chamadas que mostram a hora do jogo sem a cidade do time');
  // Os três que faltavam: o card do jogo do Início, o prazo do RSVPCard e o painel do time (jogos, cancelar, resultado, prazo da presença).
  assert.match(ler('src/pages/Inicio.jsx'), /formatDateTime\(game\.date, game\.fuso, \{ cidade \}\)/);
  assert.match(ler('src/components/RSVPCard.jsx'), /formatarDataHora\(iso, fuso, \{ cidade \}\)/);
  assert.match(ler('src/pages/AdminPanel.jsx'), /fmtPrazoAdmin = \(iso, fuso, cidade\) => formatarDataHora\(iso, fuso, \{ cidade \}\)/);
  assert.match(ler('src/pages/AdminPanel.jsx'), /<RSVPAdmin gameId=\{g\.id\} slug=\{slug\} cidade=\{team\?\.cidade\}/);
});

// ── J · achado 166 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test('166 · Criar time, passo 1: o Continuar está lá desde o começo, apagado (não-permitido), e acende com nome e cidade', () => {
  const criar = ler('src/pages/CriarEquipa.jsx');
  assert.match(criar, /<Cta cheio disabled=\{!podeContinuar\} data-continuar-passo-1 onClick=\{\(\) => irParaPasso\(2\)\}>Continuar<\/Cta>/);
  assert.match(criar, /const podeContinuar = !!nome\.trim\(\) && cidadeOk;/);
  assert.match(criar, /cursor: rest\.disabled \? 'not-allowed' : 'pointer'/, 'apagado não parece clicável');
  assert.match(criar, /opacity: rest\.disabled \? 0\.5 : 1/);
});

// ── K · achado 167 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test('167 · o bairro não exemplifica "Pinheiros": o placeholder é "Onde vocês jogam"', () => {
  assert.match(ler('src/components/CampoBairro.jsx'), /placeholder = 'Onde vocês jogam'/);
  const achados = [];
  const varrer = (dir) => {
    for (const nome of fs.readdirSync(path.join(RAIZ, dir))) {
      const rel = `${dir}/${nome}`;
      if (fs.statSync(path.join(RAIZ, rel)).isDirectory()) varrer(rel);
      else if (/\.jsx?$/.test(nome) && /Pinheiros/.test(ler(rel))) achados.push(rel);
    }
  };
  varrer('src');
  assert.deepEqual(achados, [], 'nenhum "Pinheiros" nas telas');
});

test('167 · os exemplos dos campos têm um formato só: "Ex.: …" (nunca "Ex: …" nem "ex.: …" em minúscula)', () => {
  const ruins = [];
  const varrer = (dir) => {
    for (const nome of fs.readdirSync(path.join(RAIZ, dir))) {
      const rel = `${dir}/${nome}`;
      if (fs.statSync(path.join(RAIZ, rel)).isDirectory()) { varrer(rel); continue; }
      if (!/\.jsx?$/.test(nome) || rel.includes('Gabinete')) continue; // o Gabinete é só da equipe
      ler(rel).split('\n').forEach((linha, i) => {
        for (const m of linha.matchAll(/placeholder(?:Texto)?\s*=\s*(?:\{\s*)?(["'`])((?:(?!\1).)*)\1/g)) {
          if (/\bex\.?\s*:/i.test(m[2]) && !/^Ex\.: /.test(m[2])) ruins.push(`${rel}:${i + 1} "${m[2]}"`);
        }
      });
    }
  };
  varrer('src');
  assert.deepEqual(ruins, []);
  assert.match(ler('src/components/CampoCidade.jsx'), /placeholder = 'Ex\.: Brasília'/);
  assert.match(ler('src/components/CampoCidadeLazy.jsx'), /placeholder = 'Ex\.: Brasília'/);
  assert.match(ler('src/pages/CriarEquipa.jsx'), /placeholder="Ex\.: Domingueira FC"/);
});

// ── L · achado 164 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test('164 · o nome no Início nunca corta: a letra desce até caber (o piso de 28 px saiu), como o nome da figurinha', () => {
  const inicio = semComentarios(ler('src/pages/Inicio.jsx'));
  const nome = inicio.slice(inicio.indexOf('function NomeCromo'), inicio.indexOf('// ----- Card de jogo'));
  assert.doesNotMatch(nome, /f > 28/, 'o piso de 28 px era o que cortava "Chavo, el matad…"');
  assert.match(inicio, /const PISO_NOME = 9;/, 'só uma defesa teórica');
  assert.match(nome, /f = Math\.max\(PISO_NOME, Math\.floor\(\(f \* el\.clientWidth\) \/ el\.scrollWidth\)\);/, 'primeiro o palpite proporcional');
  assert.match(nome, /while \(el\.scrollWidth > el\.clientWidth && f > PISO_NOME\)/, 'depois o ajuste fino até caber');
  assert.match(nome, /new ResizeObserver\(ajustar\)/, 'em qualquer largura: reajusta quando a coluna muda');
  assert.match(nome, /document\.fonts\.ready\.then\(ajustar\)/, 'e quando a Rajdhani termina de carregar');
});
