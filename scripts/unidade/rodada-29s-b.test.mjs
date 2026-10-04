// Futty v2.0 — Rodada 29S, bloco B: o Jogo passado em passo a passo (achados 153 e 154). As contas, a sequência de pedidos (com e sem times), a retomada sem
// duplicar o jogo e os textos aqui; o que só um navegador confirma (o Voltar do sistema recuando um passo, a barra de 4 passos em 360 e 390 px, a página
// inteira de verdade) fica em scripts/provas/rodada-29s-b.prova.mjs (npm run provar:navegador).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HORA_PADRAO, PASSOS, RESULTADO_VAZIO, TEXTOS, atribuicaoLimpa, executarPlano, instanteDoJogoPassado, jaAconteceu, jogadoresDoResultado,
  membrosQueJogam, planoDoJogoPassado, poolDoJogoPassado, presencasParaGravar, resultadoDoPassado, resumoDoJogoPassado,
} from '../../src/utils/jogoPassado.js';
import {
  PREMIOS_VAZIOS, corpoDosPremios, corpoDoResultadoDoJogo, nivelDoPassado, placarEfetivo, somaDeGolsPorTime, temGols, temPremio,
} from '../../src/utils/resultadoDoJogo.js';
import { corpoDosTimes, nomesDosTimes } from '../../src/utils/timesAMao.js';
import { caminhoDoJogoPassado } from '../../src/utils/novoJogo.js';
import {
  CONVIDADO_BOTAO, CONVIDADO_CAMPO_PASSADO, CONVIDADO_LINHA_PASSADO, CONVIDADO_TITULO_PASSADO,
} from '../../src/utils/convidadoSemApp.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const SP = 'America/Sao_Paulo';

// ── o cenário: Várzea FC, 4 jogaram (um é goleiro), um convidado sem app, dois times ──────────────────────────────────────────────────────
const MEMBROS = [
  { id: 'U1', nome: 'Ana', avatar_url: null, joga: true },
  { id: 'U2', nome: 'Beto', avatar_url: 'https://x/b.png', joga: true },
  { id: 'U3', nome: 'Caio', avatar_url: null, joga: true },
  { id: 'U4', nome: 'Duda', avatar_url: null, joga: true },
  { id: 'U5', nome: 'Edu', avatar_url: null, joga: false }, // só organiza o time
];
const PRESENTES = { U1: { jogou: true, gr: true }, U2: { jogou: true }, U3: { jogou: true }, U4: { jogou: false } };
const CONVIDADOS = [{ id: 1, nome: 'Zé da Esquina' }];

function cenario() {
  const pool = poolDoJogoPassado(membrosQueJogam(MEMBROS), PRESENTES, CONVIDADOS);
  const nomes = nomesDosTimes(2);
  const atrib = [['u:U1', 'g:1'], ['u:U2', 'u:U3']];
  return { pool, nomes, atrib };
}

/** O motor de mentira: guarda cada pedido; `falhaEm` faz o pedido daquele passo falhar UMA vez. */
function motorDeMentira({ falhaEm = null } = {}) {
  const chamadas = [];
  let jaFalhou = false;
  async function chamar(caminho, { method, body }) {
    const corpo = JSON.parse(body);
    if (falhaEm && !jaFalhou && caminho.includes(falhaEm)) { jaFalhou = true; throw new Error('Não deu para completar agora. Tente de novo.'); }
    chamadas.push({ metodo: method, caminho, corpo });
    return caminho === '/api/games' ? { game: { id: 'G9' } } : { ok: true };
  }
  return { chamadas, chamar };
}

function planoCompleto({ comTimes = true, editor = RESULTADO_VAZIO, premios = PREMIOS_VAZIOS, nTimes = 2 } = {}) {
  const { pool, nomes, atrib } = cenario();
  const jogadores = jogadoresDoResultado(nomes, atrib, pool);
  return planoDoJogoPassado({
    slug: 'varzea-fc',
    iso: '2026-10-01T23:00:00.000Z',
    local: ' Society Madalena ',
    jogadores: presencasParaGravar(membrosQueJogam(MEMBROS), PRESENTES),
    times: comTimes ? corpoDosTimes(nomes, atrib, pool) : null,
    resultado: resultadoDoPassado({ nTimes, usaTimes: comTimes, editor, premios, jogadores }),
  });
}

// ── os 4 passos, tudo no passado ──────────────────────────────────────────────────────────────────────────────────────────────────────────
test('a barra tem 4 passos: Quando foi · Quem jogou · Times · Como terminou', () => {
  assert.deepEqual(PASSOS, ['Quando foi', 'Quem jogou', 'Times', 'Como terminou']);
  const tela = ler('src/pages/JogoPassado.jsx');
  assert.match(tela, /<BarraDePassos passo=\{passo\} \/>/);
  assert.match(tela, /PASSOS\.map\(\(nome, i\) =>/, 'a barra sai de PASSOS, uma fonte só');
});

test('os textos são todos NO PASSADO: o jogo já rolou (nada de "vai jogar", "vão sair", "Monte os times", "Quem vai…")', () => {
  assert.equal(TEXTOS.quando, 'Quando foi o jogo?');
  assert.equal(TEXTOS.quemJogou, 'Quem jogou?');
  assert.equal(TEXTOS.times, 'Como ficaram os times?');
  assert.equal(TEXTOS.terminou, 'Como terminou?');
  assert.equal(TEXTOS.ajudaDosTimes, 'Toque num time e depois em quem jogou nele.');
  assert.equal(TEXTOS.salvar, 'Salvar jogo');
  assert.equal(TEXTOS.tentarDeNovo, 'Tentar de novo');
  assert.equal(CONVIDADO_TITULO_PASSADO, 'Alguém sem o app jogou?');
  assert.equal(CONVIDADO_LINHA_PASSADO, 'Escreva o nome: entra no jogo, mas não conta no ranking.');
  assert.equal(CONVIDADO_CAMPO_PASSADO, 'Nome de quem jogou');
  assert.equal(CONVIDADO_BOTAO, 'Adicionar');
  const todos = [...Object.values(TEXTOS), CONVIDADO_TITULO_PASSADO, CONVIDADO_LINHA_PASSADO, CONVIDADO_CAMPO_PASSADO, ...PASSOS];
  for (const texto of todos) {
    assert.doesNotMatch(texto, /\bvai (jogar|ser|sair|acontecer)|\bvão (jogar|sair)|\bMonte os times|\bQuem vai\b|5º A vs 5º B|Quem sobra não joga/i, texto);
    assert.doesNotMatch(texto, /—|–| - |por favor|usuário/i, `${texto} (a voz da casa)`);
    assert.doesNotMatch(texto, /\b(equipa|ecrã|ficheiro|telemóvel|golo|guarda-redes)\b/i, `${texto} (português do Brasil)`);
  }
  // O Jogo passado não usa o título do ComporTimes ("Monte os times"): escreve o seu, no passado.
  assert.match(semComentarios(ler('src/pages/JogoPassado.jsx')), /titulo=\{TEXTOS\.tituloDosTimes\}/);
  assert.equal(TEXTOS.tituloDosTimes, 'Quem jogou em cada time');
});

test('o texto de quem não conta no ranking diz o que acontece, sem prometer o que o motor não faz', () => {
  assert.match(CONVIDADO_LINHA_PASSADO, /não conta no ranking/);
  const tela = semComentarios(ler('src/pages/JogoPassado.jsx'));
  assert.doesNotMatch(tela, /Já aconteceu|Jogo histórico|cadastre um jogo/, 'os textos do modo antigo saíram');
});

// ── 1 · Quando foi ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test('1 · Quando foi: a hora é opcional e já nasce em 20:00; a data vai até hoje, no relógio do time; datas e horas SÓ pela dataHora.js', () => {
  assert.equal(HORA_PADRAO, '20:00');
  const fonte = ler('src/pages/JogoPassado.jsx');
  const tela = semComentarios(fonte);
  assert.match(tela, /const \[hora, setHora\] = useState\(HORA_PADRAO\);/);
  assert.match(tela, /max=\{diaDeCalendario\(new Date\(\), fuso\)\}/, 'até hoje, no fuso do time');
  assert.match(tela, /Hora do jogo <span className="muted" style=\{\{ fontSize: 11 \}\}>\(opcional\)<\/span>/);
  assert.match(tela, /<Calendar size=\{15\}/);
  assert.match(tela, /<Clock size=\{15\}/);
  assert.match(tela, /<MapPin size=\{15\}/);
  assert.match(fonte, /from '\.\.\/utils\/dataHora';/);
  assert.doesNotMatch(tela, /toLocale|Intl\.|new Date\([^)]+\)\.get|getHours|getTimezoneOffset/, 'nenhuma data formatada por conta própria');
  assert.doesNotMatch(tela, /\bfuso\b[^=<>{}]*<|>[^<>{}]*\bfuso\b/i, 'a tela nunca diz "fuso"');
});

test('1 · o instante do jogo é o do RELÓGIO DO TIME (20:00 de São Paulo = 23:00Z); sem hora vale 12:00; "já aconteceu" só até agora', () => {
  assert.equal(instanteDoJogoPassado({ data: '2026-10-01', hora: '20:00', fuso: SP }), '2026-10-01T23:00:00.000Z');
  assert.equal(instanteDoJogoPassado({ data: '2026-10-01', hora: '', fuso: SP }), '2026-10-01T15:00:00.000Z', 'hora opcional: 12:00 do relógio do time');
  assert.equal(instanteDoJogoPassado({ data: '', hora: '20:00', fuso: SP }), null);
  const agora = Date.parse('2026-10-04T18:00:00Z');
  assert.equal(jaAconteceu('2026-10-01T23:00:00.000Z', agora), true);
  assert.equal(jaAconteceu('2026-10-04T18:00:00.000Z', agora), true, 'agora conta como já aconteceu');
  assert.equal(jaAconteceu('2026-10-04T23:00:00.000Z', agora), false, 'hoje, mas a hora ainda não chegou');
  assert.equal(jaAconteceu(null, agora), false);
});

// ── 2 · Quem jogou ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test('2 · Quem jogou: só quem joga no time (quem só organiza fica fora); convidado sem app entra nos times, mas não tem presença', () => {
  assert.deepEqual(membrosQueJogam(MEMBROS).map((m) => m.id), ['U1', 'U2', 'U3', 'U4'], 'Edu só organiza o time');
  const { pool } = cenario();
  assert.deepEqual(pool.map((p) => p.key), ['u:U1', 'u:U2', 'u:U3', 'g:1'], 'Duda não jogou; o convidado vem depois, com chave estável');
  assert.deepEqual(pool.find((p) => p.key === 'g:1'), { key: 'g:1', user_id: null, nome: 'Zé da Esquina', avatar_url: null, convidado: true });
  // As presenças: só membros, com o selo GOL; o convidado não vai.
  assert.deepEqual(presencasParaGravar(membrosQueJogam(MEMBROS), PRESENTES), [{ user_id: 'U1', goleiro: true }, { user_id: 'U2', goleiro: false }, { user_id: 'U3', goleiro: false }]);
});

test('2 · tirar um convidado da lista não troca a chave dos outros; quem deixou de jogar sai dos times', () => {
  const dois = poolDoJogoPassado(MEMBROS, PRESENTES, [{ id: 1, nome: 'Zé' }, { id: 2, nome: 'Léo' }]);
  const sem = poolDoJogoPassado(MEMBROS, PRESENTES, [{ id: 2, nome: 'Léo' }]);
  assert.equal(dois.find((p) => p.nome === 'Léo').key, sem.find((p) => p.nome === 'Léo').key, 'a chave de "Léo" não mudou');
  // a pessoa voltou ao passo 2 e desmarcou o Caio: ele some do plantel
  const { pool } = cenario();
  const semCaio = pool.filter((p) => p.key !== 'u:U3');
  assert.deepEqual(atribuicaoLimpa([['u:U1', 'g:1'], ['u:U2', 'u:U3']], semCaio), [['u:U1', 'g:1'], ['u:U2']]);
  // Sempre uma lista por time, mesmo antes de a pessoa tocar em alguém (a tela lê atribLimpa[i] sem checar).
  assert.deepEqual(atribuicaoLimpa([], pool, 3), [[], [], []]);
  assert.deepEqual(atribuicaoLimpa([['u:U1']], pool, 2), [['u:U1'], []]);
});

test('2 · o selo GOL e a lista de quem jogou ficam na tela; "Continuar" só com alguém marcado', () => {
  const tela = semComentarios(ler('src/pages/JogoPassado.jsx'));
  assert.match(tela, /<input type="checkbox" checked=\{!!st\.gr\} onChange=\{\(\) => marcar\(m\.id, \{ gr: !st\.gr \}\)\} style=\{\{ accentColor: '#8b5cf6' \}\} \/> GOL/, 'GOL veste o roxo da casa');
  assert.match(tela, /disabled=\{jogaram === 0\} data-continuar onClick=\{\(\) => irParaPasso\(3\)\}/);
  assert.match(tela, /Marque pelo menos 1 jogador\./);
});

// ── 3 · Times ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test('3 · Times: 2, 3 ou 4 times com os nomes da casa, no ComporTimes (ajuda no passado, sem "(opcional)" e sem o exemplo do campeonato); "Pular" leva ao passo 4 sem times', () => {
  const tela = semComentarios(ler('src/pages/JogoPassado.jsx'));
  assert.match(tela, /\[2, 3, 4\]\.map/);
  assert.match(tela, /const nomes = nomesDosTimes\(nTimes\);/);
  assert.match(tela, /<ComporTimes nomes=\{nomes\} pool=\{pool\} atrib=\{atribLimpa\} onChangeAtrib=\{setAtrib\} ajuda=\{TEXTOS\.ajudaDosTimes\} opcional=\{false\} titulo=\{TEXTOS\.tituloDosTimes\} semJogadores=\{TEXTOS\.semJogadoresNosTimes\} \/>/);
  assert.match(tela, /data-pular onClick=\{\(\) => \{ setUsaTimes\(false\); irParaPasso\(4\); \}\}>\{TEXTOS\.pular\}/, '"Pular" leva ao passo 4 sem times');
  assert.match(tela, /disabled=\{!podeContinuarTimes\} data-continuar onClick=\{\(\) => \{ setUsaTimes\(true\); irParaPasso\(4\); \}\}/, '"Continuar" só com 1 jogador em cada time');
  const compor = ler('src/components/ComporTimes.jsx');
  assert.match(compor, /titulo = 'Monte os times'/, 'o Campeonato e o Jogo seguem com o título de hoje');
  assert.match(compor, /\{titulo \? <div className="section-title" data-titulo-dos-times/);
});

test('"Pular" no passo 3 salva SEM times: só o jogo e as presenças (e o que o time conta, se houver)', () => {
  const plano = planoCompleto({ comTimes: false });
  assert.deepEqual(plano.map((p) => p.id), ['jogo', 'presencas']);
  // Sem times, "quem ganhou" nem existe: mesmo que a pessoa tenha preenchido antes de voltar e pular, nada de resultado nem de campeão.
  const comResto = planoCompleto({ comTimes: false, editor: { vencedor: 'A', placarA: '3', placarB: '1', golsMap: { U1: 2 } }, premios: { ...PREMIOS_VAZIOS, campeaoIdx: 1 } });
  assert.deepEqual(comResto.map((p) => p.id), ['jogo', 'presencas']);
  // Mas artilheiro e destaque continuam valendo sem times.
  const comPremio = planoCompleto({ comTimes: false, premios: { ...PREMIOS_VAZIOS, temArt: true, artId: 'U2', artGols: 3, temDest: true, destId: 'U1', destTitulo: ' Paredão ' } });
  assert.deepEqual(comPremio.map((p) => p.id), ['jogo', 'presencas', 'premios']);
  assert.deepEqual(comPremio[2].corpo, { artilheiro_user_id: 'U2', artilheiro_gols: 3, destaque_user_id: 'U1', destaque_titulo: 'Paredão' });
});

// ── 4 · Como terminou ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test('4 · o nível do resultado vem do que foi preenchido: sem vencedor 0 · só o vencedor 1 · com placar 2 · com gols 3', () => {
  const { pool, nomes, atrib } = cenario();
  const jogadores = jogadoresDoResultado(nomes, atrib, pool);
  assert.deepEqual(jogadores.map((j) => [j.user_id, j.time, j.timeIndex]), [['U1', 'Time Ouro', 0], ['U2', 'Time Roxo', 1], ['U3', 'Time Roxo', 1]], 'o convidado não tem conta, não tem gol');
  assert.equal(nivelDoPassado(RESULTADO_VAZIO, jogadores), 0);
  assert.equal(nivelDoPassado({ ...RESULTADO_VAZIO, golsMap: { U1: 2 } }, jogadores), 0, 'gols sem quem ganhou não gravam nada');
  assert.equal(nivelDoPassado({ ...RESULTADO_VAZIO, vencedor: 'empate' }, jogadores), 1);
  assert.equal(nivelDoPassado({ ...RESULTADO_VAZIO, vencedor: 'A', placarA: '2', placarB: '1' }, jogadores), 2);
  assert.equal(nivelDoPassado({ ...RESULTADO_VAZIO, vencedor: 'A', golsMap: { U1: 1 } }, jogadores), 3);
  assert.equal(nivelDoPassado({ ...RESULTADO_VAZIO, vencedor: 'A', golsMap: { U1: 0 } }, jogadores), 1, 'gol zerado não conta');
});

test('4 · o placar é opcional: enquanto a pessoa não mexe, mostra a soma dos gols que ela registrou (e vazio sem gols) — o mostrado é o enviado', () => {
  const { pool, nomes, atrib } = cenario();
  const jogadores = jogadoresDoResultado(nomes, atrib, pool);
  assert.deepEqual(somaDeGolsPorTime({ U1: 2, U2: 1, U3: 3 }, jogadores), [2, 4]);
  assert.equal(temGols({}), false);
  assert.deepEqual(placarEfetivo({ placarA: null, placarB: null, golsMap: {} }, jogadores), { a: '', b: '' });
  assert.deepEqual(placarEfetivo({ placarA: null, placarB: null, golsMap: { U1: 2, U2: 1, U3: 3 } }, jogadores), { a: '2', b: '4' });
  assert.deepEqual(placarEfetivo({ placarA: '5', placarB: null, golsMap: { U1: 2 } }, jogadores), { a: '5', b: '0' }, 'o que ela digitou ganha da soma');
  const corpo = resultadoDoPassado({ nTimes: 2, usaTimes: true, editor: { vencedor: 'B', placarA: null, placarB: null, golsMap: { U1: 1, U2: 2, U3: 1 } }, premios: PREMIOS_VAZIOS, jogadores }).jogo;
  assert.equal(corpo.nivel, 3);
  assert.equal(corpo.placar_a, 1);
  assert.equal(corpo.placar_b, 3, 'o que a tela mostrou é o que foi gravado');
  assert.deepEqual(corpo.gols, [{ user_id: 'U1', gols: 1 }, { user_id: 'U2', gols: 2 }, { user_id: 'U3', gols: 1 }]);
});

test('4 · o vencedor vai para os DOIS campos que dizem isso: time_vencedor (resultado do jogo) e campeao_time_index (resultado do feed), para contar igual a qualquer outro jogo', () => {
  const { pool, nomes, atrib } = cenario();
  const jogadores = jogadoresDoResultado(nomes, atrib, pool);
  const de = (vencedor, extra = {}) => resultadoDoPassado({ nTimes: 2, usaTimes: true, editor: { ...RESULTADO_VAZIO, vencedor }, premios: { ...PREMIOS_VAZIOS, ...extra }, jogadores });
  assert.deepEqual(de('A'), { jogo: { nivel: 1, time_vencedor: 'A' }, feed: { campeao_time_index: 0 } });
  assert.deepEqual(de('B'), { jogo: { nivel: 1, time_vencedor: 'B' }, feed: { campeao_time_index: 1 } });
  // Empate: não há campeão; sem prêmio, o pedido do feed nem sai (e ninguém é avisado).
  assert.deepEqual(de('empate'), { jogo: { nivel: 1, time_vencedor: 'empate' }, feed: null });
  assert.deepEqual(de('empate', { temArt: true, artId: 'U2', artGols: 2 }).feed, { artilheiro_user_id: 'U2', artilheiro_gols: 2 }, 'empate com artilheiro: sem campeão, com o prêmio');
  // Sem resposta à pergunta: nada a gravar.
  assert.deepEqual(resultadoDoPassado({ nTimes: 2, usaTimes: true, editor: RESULTADO_VAZIO, premios: PREMIOS_VAZIOS, jogadores }), { jogo: null, feed: null });
});

test('4 · com 3 ou 4 times: tocar no campeão (só campeao_time_index); sem resultado do jogo, porque o motor só entende A, B ou empate', () => {
  const doCampeao = (nTimes, campeaoIdx) => resultadoDoPassado({ nTimes, usaTimes: true, editor: { ...RESULTADO_VAZIO, vencedor: 'A' }, premios: { ...PREMIOS_VAZIOS, campeaoIdx }, jogadores: [] });
  assert.deepEqual(doCampeao(3, 2), { jogo: null, feed: { campeao_time_index: 2 } });
  assert.deepEqual(doCampeao(4, 3), { jogo: null, feed: { campeao_time_index: 3 } });
  assert.deepEqual(doCampeao(4, null), { jogo: null, feed: null }, 'sem toque no campeão, nada a gravar');
  // A pessoa voltou e trocou 4 times por 3: um campeão que não existe mais não vai.
  assert.deepEqual(doCampeao(3, 3), { jogo: null, feed: null });
  // E com 2 times o campeão vem de "quem ganhou", não do toque que sobrou de antes.
  assert.deepEqual(doCampeao(2, 3).feed, { campeao_time_index: 0 });
});

test('4 · "Gols de cada um" só com 2 times (o motor mapeia só A e B) e só se o time conta gols; artilheiro só se conta gols também', () => {
  const tela = semComentarios(ler('src/pages/JogoPassado.jsx'));
  assert.match(tela, /const jogadoresDosGols = usaTimes && nTimes === 2 \? jogadoresDoResultado\(nomes, atribLimpa, pool\) : \[\];/);
  assert.match(tela, /gols: team\?\.mostrar_gols !== false,/);
  assert.match(tela, /artilheiro: team\?\.mostrar_gols !== false && team\?\.mostrar_artilheiro !== false,/);
  assert.match(tela, /destaque: team\?\.mostrar_destaque !== false,/);
  assert.match(tela, /<ResultadoEditor modo="devolver" nomeA=\{nomes\[0\]\} nomeB=\{nomes\[1\]\} jogadores=\{jogadoresDosGols\} comGols=\{flags\.gols\} inicial=\{editor\} aoMudar=\{setEditor\} \/>/);
  assert.match(tela, /<ResultadoModal modo="devolver" times=\{timesDoJogo\} confirmados=\{quemJogouComConta\} comCampeao=\{comCampeao\} premios=\{\{ artilheiro: flags\.artilheiro, destaque: flags\.destaque \}\} valor=\{premios\} aoMudar=\{setPremios\} \/>/);
  assert.match(tela, /usaTimes && nTimes === 2 \? \(/, 'com 2 times: "Quem ganhou?"; com 3 ou 4 a pergunta é o campeão (ResultadoModal)');
});

test('os dois editores têm o modo "devolver" (sem copiar código): o Jogo e Ajustes continuam salvando como sempre', () => {
  const editor = ler('src/components/ResultadoEditor.jsx');
  assert.match(editor, /modo = 'salvar', inicial = null, aoMudar = null, comGols = true/);
  assert.match(editor, /if \(devolver\) aoMudar\?\.\(novo\);/);
  assert.match(editor, /import \{ corpoDoResultadoDoJogo, placarEfetivo \} from '\.\.\/utils\/resultadoDoJogo';/, 'o corpo do PATCH é de uma função só');
  assert.match(editor, /apiFetch\(`\/api\/games\/\$\{gameId\}\/resultado`, \{ method: 'PATCH'/, 'o modo salvar segue gravando no resultado do Jogo');
  // O Jogo usa o editor sem `modo`: o de sempre.
  assert.doesNotMatch(semComentarios(ler('src/pages/Jogo.jsx')), /modo="devolver"/);
  const modal = ler('src/components/ResultadoModal.jsx');
  assert.match(modal, /modo = 'salvar'/);
  assert.match(modal, /import \{ corpoDosPremios, PREMIOS_VAZIOS \} from '\.\.\/utils\/resultadoDoJogo';/);
  assert.match(modal, /apiFetch\(`\/api\/feed\/games\/\$\{jogo\.id\}\/resultado`, \{ method: 'PATCH', body: JSON\.stringify\(corpoDosPremios\(valor\)\) \}\)/);
  // Em `devolver` o modal não faz pedido nenhum (o jogo ainda nem existe), não tem foto nem rodada de cerveja.
  assert.match(modal, /if \(devolver\) return undefined;/, 'nenhum GET do jogo no modo devolver');
  assert.match(modal, /\{!devolver \? <UploadComCrop onUpload=\{\(url\) => set\(\{ campeaoFoto: url \}\)\}/, 'sem foto do campeão');
  assert.match(modal, /\{!devolver \? \(\s*<Seccao titulo="Rodada de cerveja"/, 'sem rodada de cerveja');
  assert.match(modal, /devolver \? ARTILHEIRO\.titulo : 'Artilheiro'/);
  assert.match(modal, /devolver \? DESTAQUE\.titulo : 'Destaque'/);
});

test('o ResultadoModal saiu do AdminPanel para components/ e o AdminPanel o usa como sempre (mesmas props)', () => {
  const painel = ler('src/pages/AdminPanel.jsx');
  assert.match(painel, /import ResultadoModal from '\.\.\/components\/ResultadoModal';/);
  assert.doesNotMatch(painel, /function ResultadoModal|function Seccao|function SelectJogador/, 'a definição saiu do AdminPanel');
  assert.match(painel, /<ResultadoModal jogo=\{lancar\} fuso=\{fuso\} cidade=\{team\?\.cidade\} premios=\{\{ artilheiro: team\?\.mostrar_artilheiro !== false, destaque: team\?\.mostrar_destaque !== false \}\} onClose=\{\(\) => setLancar\(null\)\} onSaved=\{onResultado\} showToast=\{showToast\} \/>/);
  assert.match(painel, /import \{ inputStyle, lbl, secLbl \} from '\.\.\/components\/camposDoAdmin';/);
});

test('o corpo do PATCH do feed é o MESMO que o modal de Ajustes sempre mandou (o que se desliga vai como null, para apagar o prêmio)', () => {
  const v = { ...PREMIOS_VAZIOS, campeaoIdx: 1, campeaoFoto: 'https://x/c.webp', temArt: true, artId: 'U2', artGols: '0', temDest: true, destId: 'U3', destTitulo: '  ', temRodada: false, rodadaId: 'U1' };
  assert.deepEqual(corpoDosPremios(v), {
    campeao_time_index: 1, campeao_foto_url: 'https://x/c.webp',
    artilheiro_user_id: 'U2', artilheiro_gols: 1, // gols < 1 sobe para 1
    destaque_user_id: 'U3', destaque_titulo: null, // só espaços: sem título
    rodada_user_id: null,
  });
  // Em jogo novo, só o que existe.
  assert.deepEqual(corpoDosPremios(v, { soPreenchidos: true }), { campeao_time_index: 1, campeao_foto_url: 'https://x/c.webp', artilheiro_user_id: 'U2', artilheiro_gols: 1, destaque_user_id: 'U3' });
  assert.equal(temPremio({}), false);
  assert.equal(temPremio({ campeao_time_index: 0 }), true, 'campeão 0 (Time Ouro) é campeão');
  assert.equal(temPremio({ artilheiro_user_id: 'U2' }), true);
  // O corpo do resultado do Jogo: nível 3 manda placar e a lista de gols; níveis 1 e 2 não.
  assert.deepEqual(corpoDoResultadoDoJogo({ nivel: 1, vencedor: 'A', placarA: 9, placarB: 9, golsMap: { U1: 4 } }, [{ user_id: 'U1' }]), { nivel: 1, time_vencedor: 'A' });
  assert.deepEqual(corpoDoResultadoDoJogo({ nivel: 2, vencedor: 'empate', placarA: '2', placarB: '2', golsMap: {} }, []), { nivel: 2, time_vencedor: 'empate', placar_a: 2, placar_b: 2 });
  assert.deepEqual(corpoDoResultadoDoJogo({ nivel: 3, vencedor: 'B', placarA: '-1', placarB: 'x', golsMap: { U1: 2 } }, [{ user_id: 'U1' }, { user_id: 'U2' }]), { nivel: 3, time_vencedor: 'B', placar_a: 0, placar_b: 0, gols: [{ user_id: 'U1', gols: 2 }, { user_id: 'U2', gols: 0 }] });
});

// ── 154 · o jogo só é gravado no fim ──────────────────────────────────────────────────────────────────────────────────────────────────────
test('154 · NADA é gravado antes do "Salvar jogo": a página só chama o motor dentro de salvar(), e o plano sozinho não faz pedido', async () => {
  const tela = semComentarios(ler('src/pages/JogoPassado.jsx'));
  assert.doesNotMatch(tela, /apiFetch\(/, 'nenhuma chamada direta ao motor na tela');
  assert.equal((tela.match(/, apiFetch\)/g) || []).length, 1, 'o apiFetch só é entregue ao plano, uma vez');
  assert.match(tela, /import \{ apiFetch \} from '\.\.\/lib\/api';/);
  const corpoDeSalvar = tela.slice(tela.indexOf('async function salvar()'), tela.indexOf('if (!team) {'));
  assert.match(corpoDeSalvar, /await executarPlano\(plano, progresso\.current, apiFetch\)/, 'o único pedido ao motor mora dentro de salvar()');
  for (const fn of ['irParaPasso', 'continuarDoPasso1', 'alternarJogou', 'adicionarConvidado']) {
    const i = tela.indexOf(`function ${fn}(`);
    assert.ok(i > 0, fn);
    assert.doesNotMatch(tela.slice(i, tela.indexOf('\n  }\n', i)), /apiFetch|executarPlano|fetch\(/, `${fn} não grava nada`);
  }
  // Montar o plano é conta, não pedido: nenhum motor foi chamado.
  const { chamadas } = motorDeMentira();
  planoCompleto();
  assert.equal(chamadas.length, 0);
  // O modo antigo, que gravava o jogo no primeiro passo ("Continuar → montar"), saiu.
  assert.doesNotMatch(semComentarios(ler('src/pages/NovoJogo.jsx')), /Continuar → montar|passado=1/);
});

test('154 · "Salvar jogo" grava em sequência, COM times: jogo (histórico) → presenças → times à mão → resultado do jogo → resultado do feed', async () => {
  const { chamadas, chamar } = motorDeMentira();
  const editor = { vencedor: 'B', placarA: '1', placarB: '3', golsMap: { U1: 1, U2: 2, U3: 1 } };
  const premios = { ...PREMIOS_VAZIOS, temDest: true, destId: 'U2', destTitulo: 'Paredão' };
  const plano = planoCompleto({ editor, premios });
  const id = await executarPlano(plano, { gameId: null, feitos: [] }, chamar);
  assert.equal(id, 'G9');
  assert.deepEqual(chamadas.map((c) => `${c.metodo} ${c.caminho}`), [
    'POST /api/games',
    'POST /api/games/G9/presencas',
    'POST /api/games/G9/times-manuais',
    'PATCH /api/games/G9/resultado',
    'PATCH /api/feed/games/G9/resultado',
  ]);
  // 1) o jogo: histórico (não avisa ninguém), no instante do relógio do time, com o padrão do time (nenhum jogadores_por_time)
  assert.deepEqual(chamadas[0].corpo, { team_slug: 'varzea-fc', data: '2026-10-01T23:00:00.000Z', local: 'Society Madalena', historico: true });
  // 2) as presenças: só membros, com GOL
  assert.deepEqual(chamadas[1].corpo, { jogadores: [{ user_id: 'U1', goleiro: true }, { user_id: 'U2', goleiro: false }, { user_id: 'U3', goleiro: false }] });
  // 3) os times: o mesmo corpo do "Montar à mão" do Jogo; o convidado só com o nome
  assert.deepEqual(chamadas[2].corpo, { times: [
    { nome: 'Time Ouro', jogadores: [{ user_id: 'U1', nome: 'Ana', avatar_url: null, convidado: false }, { user_id: null, nome: 'Zé da Esquina', avatar_url: null, convidado: true }] },
    { nome: 'Time Roxo', jogadores: [{ user_id: 'U2', nome: 'Beto', avatar_url: 'https://x/b.png', convidado: false }, { user_id: 'U3', nome: 'Caio', avatar_url: null, convidado: false }] },
  ] });
  // 4) quem ganhou nos dois campos: time_vencedor aqui, campeao_time_index no feed
  assert.deepEqual(chamadas[3].corpo, { nivel: 3, time_vencedor: 'B', placar_a: 1, placar_b: 3, gols: [{ user_id: 'U1', gols: 1 }, { user_id: 'U2', gols: 2 }, { user_id: 'U3', gols: 1 }] });
  assert.deepEqual(chamadas[4].corpo, { campeao_time_index: 1, destaque_user_id: 'U2', destaque_titulo: 'Paredão' });
});

test('154 · SEM times: só o jogo e as presenças; sem resultado nenhum nem o pedido do feed (quem ganhou nem existe)', async () => {
  const { chamadas, chamar } = motorDeMentira();
  await executarPlano(planoCompleto({ comTimes: false }), { gameId: null, feitos: [] }, chamar);
  assert.deepEqual(chamadas.map((c) => `${c.metodo} ${c.caminho}`), ['POST /api/games', 'POST /api/games/G9/presencas']);
  assert.equal(chamadas[0].corpo.historico, true);
});

test('154 · sem resultado preenchido (2 times, ninguém escolheu quem ganhou): jogo, presenças e times — e nenhum aviso ao time', async () => {
  const { chamadas, chamar } = motorDeMentira();
  await executarPlano(planoCompleto(), { gameId: null, feitos: [] }, chamar);
  assert.deepEqual(chamadas.map((c) => c.caminho), ['/api/games', '/api/games/G9/presencas', '/api/games/G9/times-manuais']);
  assert.ok(!chamadas.some((c) => c.caminho.startsWith('/api/feed/')), 'o aviso "Resultado registrado!" só sai com campeão ou prêmio');
});

test('154 · se um pedido falha no meio, "Tentar de novo" continua de onde parou, sem criar OUTRO jogo e sem repetir o que já foi gravado', async () => {
  const editor = { vencedor: 'A', placarA: null, placarB: null, golsMap: {} };
  const plano = planoCompleto({ editor });
  const motor = motorDeMentira({ falhaEm: '/times-manuais' });
  const progresso = { gameId: null, feitos: [] };
  await assert.rejects(() => executarPlano(plano, progresso, motor.chamar), /Tente de novo/);
  assert.equal(progresso.gameId, 'G9', 'o jogo já existe');
  assert.deepEqual(progresso.feitos, ['jogo', 'presencas'], 'o que deu certo ficou anotado; o que falhou não');
  assert.deepEqual(motor.chamadas.map((c) => c.caminho), ['/api/games', '/api/games/G9/presencas']);
  // Tentar de novo: o MESMO progresso. Nenhum POST /api/games, nenhuma presença repetida.
  const id = await executarPlano(plano, progresso, motor.chamar);
  assert.equal(id, 'G9');
  assert.deepEqual(motor.chamadas.map((c) => `${c.metodo} ${c.caminho}`), [
    'POST /api/games',
    'POST /api/games/G9/presencas',
    'POST /api/games/G9/times-manuais',
    'PATCH /api/games/G9/resultado',
    'PATCH /api/feed/games/G9/resultado',
  ], 'cada pedido saiu UMA vez só');
  assert.equal(motor.chamadas.filter((c) => c.caminho === '/api/games').length, 1, 'um jogo só');
  assert.equal(progresso.feitos.length, 5);
});

test('154 · a falha no PRIMEIRO pedido não cria jogo nenhum; a falha no último deixa tudo salvo e só o aviso por mandar', async () => {
  const plano = planoCompleto({ editor: { vencedor: 'A', placarA: null, placarB: null, golsMap: {} } });
  const primeiro = motorDeMentira({ falhaEm: '/api/games' });
  const p1 = { gameId: null, feitos: [] };
  await assert.rejects(() => executarPlano(plano, p1, primeiro.chamar));
  assert.deepEqual(p1, { gameId: null, feitos: [] }, 'nada foi gravado');
  const ultimo = motorDeMentira({ falhaEm: '/api/feed/' });
  const p2 = { gameId: null, feitos: [] };
  await assert.rejects(() => executarPlano(plano, p2, ultimo.chamar));
  assert.deepEqual(p2.feitos, ['jogo', 'presencas', 'times', 'resultado']);
  await executarPlano(plano, p2, ultimo.chamar);
  assert.deepEqual(ultimo.chamadas.map((c) => c.caminho).slice(-1), ['/api/feed/games/G9/resultado'], 'só o que faltava');
});

test('154 · o "avançar" do navegador não leva a gravar um jogo com um passo desfeito: "Salvar jogo" fica apagado e a linha diz o que falta e onde', () => {
  const tela = semComentarios(ler('src/pages/JogoPassado.jsx'));
  assert.match(tela, /const pendencia = !iso \? TEXTOS\.faltaQuando : !jaAconteceu\(iso\) \? `\$\{TEXTOS\.naoAconteceu\} Volte ao primeiro passo\.` : jogaram === 0 \? TEXTOS\.faltaQuemJogou : usaTimes && !podeContinuarTimes \? TEXTOS\.faltaTimes : '';/);
  assert.match(tela, /disabled=\{salvando \|\| !!pendencia\} data-salvar-jogo/);
  assert.match(tela, /\{pendencia \? <Falta>\{pendencia\}<\/Falta> : null\}/);
  assert.equal(TEXTOS.faltaTimes, 'Tem time sem jogador. Volte ao passo Times.');
  assert.equal(TEXTOS.faltaQuemJogou, 'Ninguém foi marcado. Volte ao passo Quem jogou.');
});

test('154 · a tela guarda o progresso entre as tentativas, mostra o aviso no passo 4 e, com o jogo já criado, não deixa voltar a passos que já foram gravados', () => {
  const tela = semComentarios(ler('src/pages/JogoPassado.jsx'));
  assert.match(tela, /const progresso = useRef\(\{ gameId: null, feitos: \[\] \}\);/);
  assert.match(tela, /setJogoCriado\(!!progresso\.current\.gameId\);/);
  assert.match(tela, /const passo = jogoCriado \? 4 :/, 'com o jogo criado a tela é sempre o passo 4');
  assert.match(tela, /\{!jogoCriado \? <Cta sec disabled=\{salvando\} onClick=\{\(\) => navigate\(-1\)\}>← voltar<\/Cta> : null\}/);
  assert.match(tela, /data-erro-ao-salvar/);
  assert.match(tela, /'O jogo já foi criado e o que deu certo ficou salvo\.' : 'Nada foi salvo ainda\.'/);
  assert.match(tela, /\{salvando \? TEXTOS\.salvando : tentandoDeNovo \? TEXTOS\.tentarDeNovo : TEXTOS\.salvar\}/);
  // O que sai do motor é o texto da casa (apiFetch): a tela não escreve código de erro.
  assert.match(tela, /setErroAoSalvar\(e\.message \|\| 'Não deu para salvar o jogo agora\.'\)/);
  // No sucesso, vai para o jogo salvo e o Voltar dele não volta ao passo 4.
  assert.match(tela, /navigate\(`\/time\/\$\{slug\}\/jogo\/\$\{gameId\}`, \{ replace: true \}\)/);
});

// ── 80 · cada passo é uma entrada do histórico ────────────────────────────────────────────────────────────────────────────────────────────
test('cada passo é UMA entrada do histórico (como no Criar time, achado 80): o Voltar do sistema e o chevron recuam um passo', () => {
  const tela = semComentarios(ler('src/pages/JogoPassado.jsx'));
  assert.match(tela, /const passoDoEndereco = Number\(location\.state\?\.passo\) \|\| 1;/);
  assert.match(tela, /function irParaPasso\(n\) \{\s*navigate\(location\.pathname, \{ state: \{ passo: n \} \}\);\s*\}/, 'empurra uma entrada nova (sem replace)');
  assert.doesNotMatch(tela.slice(tela.indexOf('function irParaPasso('), tela.indexOf('function irParaPasso(') + 160), /replace/);
  assert.match(tela, /passoDoEndereco >= 2 && !data \? 1/, 'o formulário não sobrevive a um recarregar: sem data, o passo 1');
  assert.match(tela, /<Topbar hud="JOGO PASSADO" back="voltar" backFallback=\{`\/time\/\$\{slug\}\/jogo\/novo`\} \/>/, 'o chevron do topo é o Voltar do histórico');
  assert.equal((tela.match(/onClick=\{\(\) => navigate\(-1\)\}>← voltar/g) || []).length, 3, '"← voltar" nos passos 2, 3 e 4 faz o mesmo que o Voltar do sistema');
  // A rota própria, aberta pelo "Jogo passado →" do Novo jogo.
  assert.equal(caminhoDoJogoPassado('varzea-fc'), '/time/varzea-fc/jogo/passado');
  assert.match(ler('src/App.jsx'), /\['\/time\/:slug\/jogo\/passado', JogoPassado\]/);
  assert.match(ler('src/App.jsx'), /const JogoPassado = lazyComRetry\(\(\) => import\('\.\/pages\/JogoPassado'\)\);/, 'carrega só para quem abre (arranque leve)');
  // O título da aba do navegador: "Jogo passado" vem ANTES de jogo/:id, que o engoliria como "Jogo".
  const titulos = ler('src/components/RouteTitle.jsx');
  assert.match(titulos, /\['\/time\/:slug\/jogo\/passado', 'Jogo passado'\]/);
  assert.ok(titulos.indexOf("'/time/:slug/jogo/passado'") < titulos.indexOf("'/time/:slug/jogo/:id'"), 'a rota específica vem antes da genérica');
  // Sem a barra de baixo, como nas outras telas de jogo (o padrão /time/:slug/jogo/ já cobre).
  assert.match(ler('src/components/Layout.jsx'), /\/\^\\\/time\\\/\[\^\/\]\+\\\/jogo\\\/\//);
});

test('o resumo do passo 4 e o resto das datas: dia por extenso e hora pela dataHora.js, no relógio do time', () => {
  assert.equal(resumoDoJogoPassado({ iso: '2026-10-01T23:00:00.000Z', comHora: true, fuso: SP, jogaram: 9, nTimes: 2 }), 'Quinta, 1 de out. · 20:00 · 9 jogaram · 2 times');
  assert.equal(resumoDoJogoPassado({ iso: '2026-10-01T15:00:00.000Z', comHora: false, fuso: SP, jogaram: 1, nTimes: 0 }), 'Quinta, 1 de out. · 1 jogou', 'sem hora e sem times, a linha não inventa nada');
});

test('29S-B · tudo em português do Brasil: nenhuma palavra de Portugal nos textos novos', () => {
  for (const arq of ['src/pages/JogoPassado.jsx', 'src/utils/jogoPassado.js', 'src/utils/resultadoDoJogo.js', 'src/components/ResultadoModal.jsx']) {
    const texto = semComentarios(ler(arq));
    for (const l of texto.split('\n')) {
      assert.doesNotMatch(l, /((?<!=)>|')[^<>'{}]*\b(equipa|ecrã|ficheiro|telemóvel|perde-se|guarda-redes|golo)\b[^<>'{}]*(<|')/i, `${arq}: ${l.trim().slice(0, 90)}`);
    }
  }
});

test('o Marcar jogo não perdeu nada: "Jogo passado →" é o único caminho para o passado, e um link antigo (?passado=1) abre o Marcar jogo', () => {
  const novo = ler('src/pages/NovoJogo.jsx');
  assert.match(novo, /Esse jogo já aconteceu\?\{' '\}\s*<Link to=\{caminhoDoJogoPassado\(slug\)\}/);
  assert.doesNotMatch(semComentarios(novo), /useSearchParams|searchParams|passado=1/, 'a página não lê mais ?passado=1: abre sempre o Marcar jogo');
});
