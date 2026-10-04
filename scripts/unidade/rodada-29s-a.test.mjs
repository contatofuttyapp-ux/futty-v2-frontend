// Futty v2.0 — Rodada 29S, bloco A: Marcar jogo (o Novo jogo de novo, achados 151 a 156) e os times no Jogo (Sortear ou Montar à mão). As contas e os
// textos aqui; o que só um navegador confirma (a página inteira, o ingresso que se preenche, o selo roxo, os dois cartões, o POST dos times) fica em
// scripts/provas/rodada-29s-a.prova.mjs (npm run provar:navegador).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HORA_PADRAO, caminhoDoJogoPassado, dadosDoIngresso, horaSugerida } from '../../src/utils/novoJogo.js';
import { corpoDosTimes, nomesDosTimes, podeSalvarTimes } from '../../src/utils/timesAMao.js';
import { NOMES_DAS_CORES } from '../../src/utils/nomeDoTime.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const SP = 'America/Sao_Paulo';
const LISBOA = 'Europe/Lisbon';

// ── 155 · a hora nasce em 20:00 ───────────────────────────────────────────────────────────────────────────────────────────────────────
test('155 · a hora do jogo nasce em 20:00 — nunca a hora do relógio (15:17, 15:19)', () => {
  assert.equal(HORA_PADRAO, '20:00');
  assert.equal(horaSugerida(null, { slug: 'missa', fuso: SP }), '20:00', 'sem cache');
  assert.equal(horaSugerida([], { slug: 'missa', fuso: SP }), '20:00');
  assert.equal(horaSugerida(undefined), '20:00');
});

test('155 · com os jogos do time em cache, a hora é a do ÚLTIMO jogo, lida no relógio do time', () => {
  const jogos = [
    { team_slug: 'missa', date: '2026-10-01T22:00:00Z' }, // 19:00 em São Paulo
    { team_slug: 'missa', date: '2026-10-15T23:30:00Z' }, // 20:30 em São Paulo — o último
    { team_slug: 'varzea', date: '2026-12-01T12:00:00Z' }, // de outro time: não conta
    { team_slug: 'missa', date: null },
    { team_slug: 'missa', date: 'lixo' },
  ];
  assert.equal(horaSugerida(jogos, { slug: 'missa', fuso: SP }), '20:30');
  // O mesmo instante, no relógio de Lisboa, seria outra hora: a hora segue o fuso do TIME, não o do aparelho.
  assert.equal(horaSugerida(jogos, { slug: 'missa', fuso: LISBOA }), '00:30');
  assert.equal(horaSugerida(jogos, { slug: 'outro-time', fuso: SP }), '20:00', 'time sem jogo em cache: 20:00');
});

test('155 · o Novo jogo não faz pedido novo para a hora: lê o cache do Início, uma vez, e deixa a pessoa mudar', () => {
  const tela = semComentarios(ler('src/pages/NovoJogo.jsx'));
  assert.match(tela, /import \{ caminhoDoJogoPassado, horaSugerida \} from '\.\.\/utils\/novoJogo';/);
  assert.match(tela, /useState\(\(\) => lerCache\(session\?\.user\?\.id, 'inicio'\)\?\.convites\?\.games \|\| null\)/, 'lido uma vez, sem pedido');
  assert.match(tela, /const hora = horaDigitada \?\? horaSugerida\(jogosEmCache, \{ slug, fuso: team\?\.fuso \}\);/, 'a sugestão vale até a pessoa digitar');
  assert.match(tela, /onChange=\{\(e\) => setHoraDigitada\(e\.target\.value\)\}/);
  assert.doesNotMatch(tela, /apiFetch\(`\/api\/teams\/\$\{slug\}\/games`/, 'nenhum pedido de jogos só para achar a hora');
});

// ── 151 · saem os três chips ──────────────────────────────────────────────────────────────────────────────────────────────────────────
test('151 · o Novo jogo abre direto no Marcar jogo: saem os chips Sortear / Times à mão / Já aconteceu e os textos de cada modo', () => {
  const tela = semComentarios(ler('src/pages/NovoJogo.jsx'));
  assert.doesNotMatch(tela, />Sortear</, 'sem o chip Sortear');
  assert.doesNotMatch(tela, />Times à mão</, 'sem o chip Times à mão');
  assert.doesNotMatch(tela, />Já aconteceu</, 'sem o chip Já aconteceu');
  assert.doesNotMatch(tela, /setModo|modo === 'manual'|'manual'/, 'o modo "Times à mão" saiu do Novo jogo (foi para o Jogo)');
  assert.doesNotMatch(tela, /Você define os times à mão|Agende um jogo\. Os times saem do sorteio/, 'os textos de cada modo saíram');
  // 29S-B: o modo antigo "Já aconteceu" (?passado=1) e a fase de montar saíram; o Marcar jogo é a única coisa que a página faz.
  assert.doesNotMatch(tela, /useSearchParams|params\.get|retro|Continuar → montar|setFase|ComporTimes/, 'sem o modo "Já aconteceu" nem a fase de montar');
  assert.match(tela, /\{loading \? 'Criando…' : 'Criar jogo'\}/, 'o botão dourado: Criar jogo');
  assert.match(tela, /historico: false,/, 'o jogo marcado é um jogo normal (avisa o time), não histórico');
  assert.match(tela, /navigate\(`\/time\/\$\{slug\}\/jogo\/\$\{game\.id\}`, \{ replace: true \}\)/, 'vai para o jogo, como hoje');
});

test('153 · "Jogo passado →": uma linha discreta embaixo do botão, num destino só — a rota própria do passo a passo (bloco B)', () => {
  assert.equal(caminhoDoJogoPassado('missa-de-quinta'), '/time/missa-de-quinta/jogo/passado');
  const tela = ler('src/pages/NovoJogo.jsx');
  assert.match(tela, /Esse jogo já aconteceu\?\{' '\}\s*<Link to=\{caminhoDoJogoPassado\(slug\)\}[^>]*>Jogo passado →<\/Link>/);
  assert.doesNotMatch(semComentarios(tela), /jogo\/passado|passado=1/, 'a URL do jogo passado mora só em utils/novoJogo.js');
  // Discreta: dentro de um <p> de 13 px, depois do formulário — não é um cartão nem um botão do peso do "Criar jogo".
  assert.ok(tela.indexOf('<p data-jogo-passado style') > tela.indexOf('</form>'), 'depois do formulário, embaixo do botão');
  assert.match(tela, /data-jogo-passado style=\{\{ textAlign: 'center', margin: '8px 0 0', fontSize: 13/);
});

// ── 155/156 · o ingresso ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
test('o ingresso mostra o que foi digitado, pela dataHora.js: dia por extenso, hora e (só em outro relógio) o rabicho com a cidade do time', () => {
  const igual = dadosDoIngresso({ data: '2026-10-15', hora: '20:00', fuso: SP, cidade: 'Brasília - DF', olhando: SP });
  assert.deepEqual(igual, { dia: 'Quinta, 15 de out.', hora: '20:00', rabicho: '' }, 'no relógio do time não há rabicho');
  const lisboa = dadosDoIngresso({ data: '2026-10-15', hora: '20:00', fuso: SP, cidade: 'Brasília - DF', olhando: LISBOA });
  assert.equal(lisboa.dia, 'Quinta, 15 de out.', 'o dia é o do relógio do TIME (20:00 de São Paulo ainda é quinta; em Lisboa já é sexta)');
  assert.equal(lisboa.hora, '20:00');
  assert.equal(lisboa.rabicho, 'horário de Brasília', 'a cidade do time, não "horário de São Paulo"');
  assert.deepEqual(dadosDoIngresso({ data: '2026-10-16', hora: '07:05', fuso: SP, olhando: SP }), { dia: 'Sexta, 16 de out.', hora: '07:05', rabicho: '' });
});

test('o ingresso vazio não inventa nada: sem data e sem hora, os textos vêm vazios (a tela mostra "Escolha o dia" e "--:--")', () => {
  assert.deepEqual(dadosDoIngresso({ data: '', hora: '', fuso: SP, olhando: SP }), { dia: '', hora: '', rabicho: '' });
  assert.equal(dadosDoIngresso({ data: '', hora: '20:00', fuso: SP, olhando: SP }).hora, '20:00', 'a hora aparece mesmo antes de escolher o dia');
  assert.equal(dadosDoIngresso({ data: '2026-10-15', hora: '', fuso: SP, olhando: SP }).dia, 'Quinta, 15 de out.');
  assert.equal(dadosDoIngresso().dia, '');
});

test('o ingresso é visual da casa, sem imagem nova, e nenhuma data é formatada por conta própria (lei da hora do jogo)', () => {
  const fonte = ler('src/components/IngressoDoJogo.jsx');
  const tela = semComentarios(fonte);
  assert.match(fonte, /import EscudoEquipa from '\.\/EscudoEquipa';/, 'o escudo é o EscudoEquipa');
  assert.match(tela, /const \{ dia, hora: horaNaTela, rabicho \} = dadosDoIngresso\(\{ data, hora, fuso: team\?\.fuso, cidade: team\?\.cidade \}\);/);
  assert.match(tela, /clipPath: CLIP/, 'chanfro de 45°');
  assert.match(tela, /RAJ = "'Rajdhani', sans-serif"/);
  assert.doesNotMatch(tela, /toLocale|Intl\.|new Date\(\)\.get|<img|url\(/, 'sem formatação própria de data e sem imagem');
  assert.match(ler('src/pages/NovoJogo.jsx'), /<IngressoDoJogo team=\{team\} data=\{data\} hora=\{hora\} local=\{local\} porTime=\{porTime\} \/>/, 'preenche enquanto a pessoa digita');
});

test('155 · os campos Data · Hora do jogo · Local têm ícones do lucide e letra maior; a hora diz "Hora do jogo" (nunca "fuso")', () => {
  const tela = ler('src/pages/NovoJogo.jsx');
  assert.match(tela, /import \{ Calendar, Clock, MapPin \} from 'lucide-react';/);
  for (const [icone, rotulo] of [['Calendar', 'Data'], ['Clock', 'Hora do jogo'], ['MapPin', 'Local']]) {
    assert.match(tela, new RegExp(`<${icone} size=\\{15\\} aria-hidden="true" /> ${rotulo}`), `${rotulo} com o ícone ${icone}`);
  }
  assert.match(tela, /const CAMPO_GRANDE = \{ fontFamily: RAJ, fontSize: 18, fontWeight: 600 \};/);
  assert.equal((tela.match(/style=\{CAMPO_GRANDE\}/g) || []).length, 3, 'os três campos usam a letra maior');
});

// ── 156 · "Só neste jogo" em roxo ─────────────────────────────────────────────────────────────────────────────────────────────────────
test('156 · "Só neste jogo": selo ROXO, o seletor em roxo e "voltar ao padrão (N)"; sem mudar, só "Padrão do time: N"', () => {
  const tela = ler('src/pages/NovoJogo.jsx');
  assert.match(tela, /const ROXO = '#8b5cf6';/);
  assert.match(tela, /porTime != null \? \(\s*<span data-selo-so-neste[^>]*color: ROXO_CLARO, border: `1px solid \$\{ROXO\}`/, 'o selo só existe com o número só deste jogo, em roxo');
  assert.match(tela, />Só neste jogo<\/span>/);
  assert.match(tela, /<NumberStepper value=\{porTime\} onChange=\{setPorTime\} min=\{2\} max=\{11\} cor=\{ROXO_CLARO\} \/>/);
  assert.match(tela, /onClick=\{\(\) => setPorTime\(null\)\}>voltar ao padrão \(\{padraoDoTime\}\)<\/button>/, 'volta ao padrão do time (o motor usa o dele)');
  assert.match(tela, /Padrão do time: <b>\{padraoDoTime\}<\/b>/);
  assert.match(tela, /onClick=\{\(\) => setPorTime\(padraoDoTime\)\}>mudar só neste jogo<\/button>/);
  assert.match(tela, /\.\.\.\(porTime != null \? \{ jogadores_por_time: Number\(porTime\) \} : \{\}\)/, 'sem número, o motor usa o padrão do time');
  // O ingresso também diz: "6 por time · só neste jogo", em roxo.
  assert.match(ler('src/components/IngressoDoJogo.jsx'), /\{porTime\} por time · só neste jogo/);
  // O seletor: com `cor`, pinta; sem `cor`, é o de sempre (o Campeonato e o Ajustes não mudam).
  const stepper = ler('src/components/NumberStepper.jsx');
  assert.match(stepper, /cor = null/);
  assert.match(stepper, /const btn = cor \? \{ \.\.\.BTN,/);
  assert.match(stepper, /color: cor \|\| '#fff'/);
});

// ── 152 · os times à mão saem do Novo jogo e vão para o Jogo ──────────────────────────────────────────────────────────────────────────
test('152 · os nomes da casa para 2, 3 e 4 times; "Salvar times" só com 1 jogador em cada', () => {
  assert.deepEqual(nomesDosTimes(2), ['Time Ouro', 'Time Roxo']);
  assert.deepEqual(nomesDosTimes(3), ['Time Ouro', 'Time Roxo', 'Time Prata']);
  assert.deepEqual(nomesDosTimes(4), ['Time Ouro', 'Time Roxo', 'Time Prata', 'Time Bronze']);
  assert.deepEqual(nomesDosTimes(4), NOMES_DAS_CORES, 'a mesma fonte do sorteio (um nome por time em todo lugar)');
  const nomes = nomesDosTimes(2);
  assert.equal(podeSalvarTimes(nomes, []), false);
  assert.equal(podeSalvarTimes(nomes, [['u:1']]), false, 'o segundo time está vazio');
  assert.equal(podeSalvarTimes(nomes, [['u:1'], []]), false);
  assert.equal(podeSalvarTimes(nomes, [['u:1'], ['g:0:Zé']]), true);
  assert.equal(podeSalvarTimes([], []), false);
});

test('152 · o corpo do POST /api/games/:id/times-manuais: membros com user_id, convidado sem app como { nome, convidado: true }', () => {
  const pool = [
    { key: 'u:A', user_id: 'A', nome: 'Ana', avatar_url: 'https://x/a.png', convidado: false },
    { key: 'u:B', user_id: 'B', nome: 'Beto', avatar_url: null, convidado: false },
    { key: 'g:0:Zé', user_id: null, nome: 'Zé', avatar_url: null, convidado: true },
  ];
  const corpo = corpoDosTimes(nomesDosTimes(2), [['u:A', 'g:0:Zé'], ['u:B', 'fantasma']], pool);
  assert.deepEqual(corpo, {
    times: [
      { nome: 'Time Ouro', jogadores: [{ user_id: 'A', nome: 'Ana', avatar_url: 'https://x/a.png', convidado: false }, { user_id: null, nome: 'Zé', avatar_url: null, convidado: true }] },
      { nome: 'Time Roxo', jogadores: [{ user_id: 'B', nome: 'Beto', avatar_url: null, convidado: false }] },
    ],
  }, 'uma chave que não está mais no pool (convidado removido) não vai no corpo');
});

test('152 · no Jogo, SEM times: "Como vão sair os times?" e dois cartões lado a lado — Sortear (dourado, Shuffle) e Montar à mão (roxo, Hand)', () => {
  const cartoes = semComentarios(ler('src/components/TimesDoJogo.jsx'));
  assert.match(cartoes, /export const PERGUNTA_DOS_TIMES = 'Como vão sair os times\?';/);
  assert.match(cartoes, /gridTemplateColumns: 'minmax\(0, 1fr\) minmax\(0, 1fr\)'/, 'lado a lado');
  assert.match(cartoes, /import \{ Hand, Shuffle \} from 'lucide-react';/);
  assert.match(cartoes, /<Shuffle size=\{22\}/);
  assert.match(cartoes, /<Hand size=\{22\}/);
  assert.match(cartoes, /O app sorteia com quem confirmou\./);
  assert.match(cartoes, /Você escolhe quem joga em cada time\./);
  assert.match(cartoes, /data-escolha="sortear" className=\{`btn hud-corners cta-gold \$\{pulsaSortear \? 'pulse-active' : ''\}`\}/, 'o Sortear é o dourado');
  assert.match(cartoes, /data-escolha="a-mao" className="btn btn--purple hud-corners"/, 'o Montar à mão é o roxo');
  // Só o Sortear pulsa — o Montar à mão NUNCA (duas coisas pulsando não destacam nenhuma).
  const aMao = cartoes.slice(cartoes.indexOf('data-escolha="a-mao"'), cartoes.indexOf('</button>', cartoes.indexOf('data-escolha="a-mao"')));
  assert.doesNotMatch(aMao, /pulse/, 'o Montar à mão não pulsa');
  assert.equal((cartoes.match(/pulse-glow/g) || []).length, 1, 'um pulso só, no Sortear');
});

test('152 · o Jogo mostra os dois cartões quando o admin não tem times ainda; o Sortear é o mesmo sortear() e pulsa com a regra de hoje (podeSortear)', () => {
  const jogo = semComentarios(ler('src/pages/Jogo.jsx'));
  assert.match(jogo, /import \{ EscolhaDosTimes, MontarTimesAMao \} from '\.\.\/components\/TimesDoJogo';/);
  assert.match(jogo, /isAdmin && montando \? \(\s*<MontarTimesAMao[\s\S]*?\) : isAdmin && !game\.sorteio_realizado \? \(\s*<EscolhaDosTimes pulsaSortear=\{podeSortear\} busy=\{busy\} onSortear=\{\(\) => sortear\(\)\} onMontar=\{\(\) => setMontando\(true\)\} \/>/);
  assert.match(jogo, /const podeSortear = !game\?\.sorteio_realizado && confirmados\.length >= porTimeEfectivo \* 2;/, 'a regra do pulso não mudou');
  // O sortear() é o de sempre: mesmo POST, mesmo corpo, mesma cerimônia.
  assert.match(jogo, /apiFetch\(`\/api\/games\/\$\{id\}\/sortear`, \{ method: 'POST', body: JSON\.stringify\(body\) \}\)/);
  assert.match(jogo, /navigate\(`\/time\/\$\{slug\}\/jogo\/\$\{id\}\/sorteio`, \{ state: \{ euSorteei: true \} \}\)/);
  assert.match(jogo, /SomSorteio\.prepararNoGesto\(\);/, 'o gesto do som continua síncrono no toque');
  assert.doesNotMatch(jogo, /Sortear times/, 'o botão "Sortear times" sozinho saiu: agora é o cartão "Sortear"');
});

test('152 · "Montar à mão" salva em POST /api/games/:id/times-manuais com quem confirmou + os convidados da tela, e recarrega o jogo', () => {
  const jogo = semComentarios(ler('src/pages/Jogo.jsx'));
  assert.match(jogo, /async function salvarTimes\(corpo\) \{[\s\S]*?apiFetch\(`\/api\/games\/\$\{id\}\/times-manuais`, \{ method: 'POST', body: JSON\.stringify\(corpo\) \}\);\s*await reload\(\);/);
  assert.match(jogo, /\.\.\.confirmados\.map\(\(p\) => \(\{ key: `u:\$\{p\.user_id\}`, user_id: p\.user_id,/, 'o pool: quem confirmou');
  assert.match(jogo, /\.\.\.convidados\.map\(\(c, i\) => \(\{ key: `g:\$\{i\}:\$\{c\}`, user_id: null, nome: c, avatar_url: null, convidado: true \}\)\)/, '+ os convidados sem app desta tela');
  const montar = semComentarios(ler('src/components/TimesDoJogo.jsx'));
  assert.match(montar, /\[2, 3, 4\]\.map/, '2, 3 ou 4 times');
  assert.match(montar, /const nomes = nomesDosTimes\(nTimes\);/, 'com os nomes da casa');
  assert.match(montar, /disabled=\{!pode \|\| salvando\} onClick=\{\(\) => onSalvar\(corpoDosTimes\(nomes, atrib, pool\)\)\}/, '"Salvar times" só com 1 jogador em cada time');
  assert.match(montar, /\{salvando \? 'Salvando…' : 'Salvar times'\}/);
  assert.match(montar, /Cada time precisa de pelo menos 1 jogador\./);
  assert.doesNotMatch(jogo, /\/presencas/, 'as presenças já estão marcadas: o Jogo não manda presenças antes');
});

test('152 · COM times: o "Ver sorteio" segue o destaque e embaixo, discreto, "Trocar os times: Sortear de novo · Montar à mão" — os dois pedem confirmação', () => {
  const jogo = semComentarios(ler('src/pages/Jogo.jsx'));
  assert.match(jogo, /game\.sorteio_realizado && game\.times_resultado\?\.seed != null && \(\s*<span className="cta-gold-glow pulse-glow"/, 'o Ver sorteio continua o destaque (só quando há sorteio com seed)');
  assert.match(jogo, /<span>Trocar os times:<\/span>/);
  assert.match(jogo, /data-trocar="sortear" style=\{LINK_DISCRETO\} onClick=\{\(\) => setConfirmacao\('re-sorteio'\)\}[^>]*>Sortear de novo<\/button>/);
  assert.match(jogo, /data-trocar="a-mao" style=\{LINK_DISCRETO\} onClick=\{\(\) => setConfirmacao\('refazer-a-mao'\)\}[^>]*>Montar à mão<\/button>/);
  assert.match(jogo, /minHeight: 44/, 'os links discretos têm 44 px de toque');
  // A confirmação inline, em PT-BR, com os textos da rodada.
  assert.match(jogo, /\{confirmacao === 're-sorteio' \? 'Sortear de novo\?' : 'Montar os times à mão\?'\}/);
  assert.match(jogo, /Os times de agora saem\.\{game\.times_resultado\?\.seed != null \? ' O replay do sorteio também\.' : ''\}/, 'o replay só entra na frase quando havia sorteio');
  assert.match(jogo, /'Sortear de novo'\}\s*<\/button>/);
  assert.match(jogo, /onClick=\{\(\) => \{ setConfirmacao\(null\); setMontando\(true\); \}\}[^>]*>\s*Montar à mão\s*<\/button>/, 'confirmar "Montar à mão" abre a composição; nada é trocado antes de "Salvar times"');
  assert.match(jogo, />\s*Manter\s*<\/button>/);
});

test('152 · o texto antigo da confirmação (português de Portugal) saiu: "Isto substitui o sorteio atual: perde-se…" e "Substituir sorteio"', () => {
  const jogo = ler('src/pages/Jogo.jsx');
  for (const velho of ['Isto substitui', 'perde-se', 'Substituir sorteio', 'Sortear novamente']) {
    assert.ok(!jogo.includes(velho), `Jogo.jsx ainda escreve "${velho}"`);
  }
  assert.ok(!ler('src/components/TimesDoJogo.jsx').includes('perde-se'));
});

test('152 · o ajuste dos times depois do sorteio (PATCH /times, modo editando) e o Resultado não mudaram', () => {
  const jogo = semComentarios(ler('src/pages/Jogo.jsx'));
  assert.match(jogo, /<TimesEditor\s+gameId=\{id\}/);
  assert.match(jogo, /\{isAdmin && game\.sorteio_realizado && !editando && \(\s*<button type="button" className="btn btn--sm btn--outline hud-corners-s" onClick=\{\(\) => setEditando\(true\)\}>\s*Ajustar times/);
  assert.match(jogo, /<ResultadoEditor\s+gameId=\{id\}/);
  assert.match(jogo, /Criar campeonato com estes times/);
});

// ── 153 · o texto de ajuda do ComporTimes vem de quem usa ─────────────────────────────────────────────────────────────────────────────
test('153 · ComporTimes: a ajuda vem por prop; o Campeonato mantém a de hoje; no Jogo e no jogo passado some o "ex.: 5º A vs 5º B"', () => {
  const comporFonte = semComentarios(ler('src/components/ComporTimes.jsx'));
  assert.doesNotMatch(comporFonte, /5º A vs 5º B|Quem sobra não joga/, 'o componente não escreve mais a ajuda do campeonato');
  assert.match(comporFonte, /ajuda = null, opcional = true/);
  assert.match(comporFonte, /\{ajuda \? <p className="muted" data-ajuda-dos-times/);
  const camp = ler('src/pages/Campeonato.jsx');
  assert.match(camp, /const AJUDA_DOS_TIMES = 'Toque em um jogador para colocá-lo no time selecionado\. Quem sobra não joga \(não é reserva\)\. Você pode deixar tudo vazio e criar times só com nome \(ex\.: 5º A vs 5º B\)\.';/, 'o texto de hoje, palavra por palavra');
  assert.match(camp, /<ComporTimes nomes=\{nomes\} pool=\{pool\} atrib=\{atrib\} onChangeAtrib=\{setAtrib\} ajuda=\{AJUDA_DOS_TIMES\} \/>/);
  assert.match(ler('src/components/TimesDoJogo.jsx'), /export const AJUDA_DO_JOGO = 'Toque num time e depois em quem vai jogar nele\.';/);
  assert.match(ler('src/components/TimesDoJogo.jsx'), /ajuda=\{AJUDA_DO_JOGO\} opcional=\{false\}/, 'no Jogo montar os times não é "(opcional)"');
  // 29S-B: a ajuda do jogo passado (que morava no modo antigo do Novo jogo) mora nos textos do passo a passo, no passado.
  assert.match(ler('src/utils/jogoPassado.js'), /ajudaDosTimes: 'Toque num time e depois em quem jogou nele\.'/, 'no jogo passado, no passado');
  assert.match(ler('src/pages/JogoPassado.jsx'), /ajuda=\{TEXTOS\.ajudaDosTimes\}/);
  for (const arq of ['src/pages/Jogo.jsx', 'src/pages/NovoJogo.jsx', 'src/pages/JogoPassado.jsx', 'src/utils/jogoPassado.js', 'src/components/TimesDoJogo.jsx']) {
    assert.ok(!semComentarios(ler(arq)).includes('5º A vs 5º B'), `${arq} ainda tem o exemplo do campeonato de escola`);
  }
});

test('29S-A · tudo em português do Brasil: nenhuma palavra de Portugal nos textos novos', () => {
  for (const arq of ['src/pages/NovoJogo.jsx', 'src/components/TimesDoJogo.jsx', 'src/components/IngressoDoJogo.jsx', 'src/utils/novoJogo.js', 'src/utils/timesAMao.js']) {
    const texto = semComentarios(ler(arq));
    for (const l of texto.split('\n')) {
      assert.doesNotMatch(l, /((?<!=)>|')[^<>'{}]*\b(equipa|ecrã|ficheiro|telemóvel|perde-se|guarda-redes|golo)\b[^<>'{}]*(<|')/i, `${arq}: ${l.trim().slice(0, 90)}`);
    }
  }
});
