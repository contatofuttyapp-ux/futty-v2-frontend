// Futty v2.0 — Rodada 31W: a nota numa régua só, de 0 a 10, em todo lugar (decisão do dono), e a página do jogo terminado sem ruído.
//   · o sorteio antigo (número de cada jogador em estrelas, sem a marca escala_nota) aparece × 2; o novo, como veio;
//   · o voto do Ranking é um número de 0 a 10 (onze botões), sem estrelas, e as telas avisam o motor com o cabeçalho X-Futty-Nota: 10;
//   · na página do jogo terminado, presença, confirmados e tudo do sorteio ficam de fora; o resultado, os times e o Avaliar ficam.
// A prova no navegador (rodada-31w) confere as telas de verdade.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { notaNoSorteio, sorteioNaReguaDe10 } from '../../src/utils/notaDoSorteio.js';
import { lerAppCss } from './_appCss.mjs';
import { lerPagina } from './_fonteDaPagina.mjs';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (p) => fs.readFileSync(`${raiz}${p}`, 'utf8');
const semComentarios = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

test('sorteio antigo (sem escala_nota) × 2; o novo (escala_nota: 10) como veio; o que não é número passa', () => {
  const antigo = { seed: 3, times: [{ nome: 'A', rating_medio: 3.25, jogadores: [{ user_id: 'u1', rating: 4.5 }, { user_id: null, convidado: true, nome: 'Zé', rating: 3 }] }], reservas: [{ posicao: 1, user_id: 'u2', rating: 2 }] };
  assert.equal(notaNoSorteio(4.5, antigo), 9);
  assert.equal(notaNoSorteio(3.25, antigo), 6.5);
  assert.equal(notaNoSorteio(undefined, antigo), undefined);
  const novo = { ...antigo, escala_nota: 10 };
  assert.equal(notaNoSorteio(4.5, novo), 4.5);
  const r = sorteioNaReguaDe10(antigo);
  assert.equal(r.escala_nota, 10);
  assert.equal(r.seed, 3, 'o resto do resultado fica');
  assert.deepEqual(r.times[0].jogadores.map((j) => j.rating), [9, 6]);
  assert.equal(r.times[0].rating_medio, 6.5);
  assert.equal(r.reservas[0].rating, 4);
  assert.equal(antigo.times[0].jogadores[0].rating, 4.5, 'o original não é mexido');
  assert.equal(sorteioNaReguaDe10(novo), novo, 'o novo volta igual');
  assert.equal(sorteioNaReguaDe10(null), null);
});

test('DrawnTeams e o editor dos times leem o resultado na régua de 10', () => {
  assert.match(ler('src/components/DrawnTeams.jsx'), /const resultado = sorteioNaReguaDe10\(guardado\);/);
  assert.match(ler('src/components/TimesEditor.jsx'), /const resultadoInicial = sorteioNaReguaDe10\(guardado\);/);
});

test('Ranking: o voto é um número de 0 a 10 — onze botões, nada de estrelas; "sem nota", "você deu 8", "falta seu voto"', () => {
  const tela = semComentarios(ler('src/pages/Ranking.jsx'));
  assert.doesNotMatch(tela, /MeiaEstrelas|estrelas|★|☆/, 'nenhuma estrela no voto nem na linha');
  assert.match(tela, /Array\.from\(\{ length: 11 \}, \(_, i\) => i\)/, 'as notas 0 a 10');
  assert.match(tela, /role="radiogroup" aria-label="Sua nota, de 0 a 10"/);
  assert.match(tela, /'Escolha de 0 a 10'|>Escolha de 0 a 10</);
  assert.match(tela, /você deu \{formatarNota\(p\.minha_nota\)\}/);
  assert.match(tela, /falta seu voto/);
  assert.match(tela, /\{SEM_NOTA\}/, 'quem ainda não tem 3 votos: "sem nota", não "—"');
  assert.match(tela, /modalNota == null/, 'o 0 é voto: só "nada escolhido" trava o Salvar');
  assert.match(lerAppCss(), /\.nota-botao\[aria-checked='true'\]/);
});

test('as telas avisam o motor que estão na régua de 10 (sem o aviso, ele trata como o app antigo, em estrelas)', () => {
  assert.match(ler('src/lib/api.js'), /headers\['X-Futty-Nota'\] = '10';/);
});

test('Painel: "nota 7" e "sem nota", nada de estrela; apagar notas diz apagar (o 0 agora é nota)', () => {
  const painel = lerPagina('AdminPanel');
  assert.match(painel, /m\.nota_media == null \? SEM_NOTA : `nota \$\{formatarNota\(m\.nota_media\)\}`/);
  assert.doesNotMatch(painel, /Zerar as notas|voltam a zero/);
});

test('jogo terminado: presença, confirmados e o sorteio ficam de fora; resultado, times, Associar e Avaliar ficam', () => {
  const jogo = semComentarios(ler('src/pages/Jogo.jsx'));
  assert.match(jogo, /const terminado = jogoTerminado\(game\);/);
  // Sua presença + Confirmados: um bloco só, fora quando terminou.
  assert.match(jogo, /\{terminado \? null : \(\s*<>\s*<SecLabel>Sua presença<\/SecLabel>[\s\S]*?<SecLabel>Confirmados · \{confirmados\.length\}<\/SecLabel>[\s\S]*?<\/>\s*\)\}\s*<SecLabel>Times<\/SecLabel>/);
  // Contagem do sorteio, jogadores por time, convidados, escolha dos times: o bloco seguinte, também fora.
  assert.match(jogo, /<SecLabel>Times<\/SecLabel>\s*\{terminado \? null : \(\s*<>[\s\S]*?Jogadores por time:[\s\S]*?CONVIDADO_TITULO[\s\S]*?<EscolhaDosTimes[\s\S]*?<\/>\s*\)\}/);
  assert.match(jogo, /!editando && !terminado && \(/, 'Ajustar times');
  assert.match(jogo, /confirmacao !== 'campeonato' && !terminado && \(/, 'Criar campeonato');
  assert.match(jogo, /!montando && !terminado && confirmacao !== 're-sorteio'/, 'Trocar os times: Sortear de novo · Montar à mão');
  // Ficam: os times (com o Associar do admin, sem o banco de reservas), o editor do resultado por um link discreto e o Avaliar.
  assert.match(jogo, /<DrawnTeams resultado=\{game\.times_resultado\} teamCor=\{team\?\.cor\} aoAssociar=\{isAdmin \? setAssociando : undefined\} semReservas=\{terminado\} \/>/);
  assert.match(ler('src/components/DrawnTeams.jsx'), /const reservas = semReservas \? \[\] : resultado\.reservas \|\| \[\];/, 'jogo terminado: sem "Banco de reservas" nem "Próximo a entrar"');
  assert.match(jogo, /data-corrigir-resultado/);
  assert.match(jogo, /\{resultadoDoJogo \? 'Corrigir o resultado' : 'Lançar o resultado'\}/);
  assert.match(jogo, /\(!terminado \|\| editandoResultado\)/);
  assert.match(jogo, /useState\(!!location\.state\?\.quemGanhou\)/, 'quem vem do "Lançar gols e prêmios" do Início chega com o editor aberto');
  assert.match(jogo, /Avaliar os jogadores/);
});
