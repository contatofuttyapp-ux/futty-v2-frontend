// Futty v2.0 — Rodada 29Q: o "Radar de peladas" e o "Criar time" à vista no Início (dois cartões embaixo do "Seus times"), o convidado sem
// app explicado de um jeito básico (uma fonte de texto para Jogo, Novo jogo e Campeonato) e o link do convite PRONTO no passo 4 do Criar
// time. Telas só: travado lendo o código, como os outros testes de tela da casa. O que só um navegador confirma (cartões lado a lado,
// toque cheio, o link chegando sozinho) está nas provas scripts/provas/atalhos-inicio.prova.mjs e criar-time.prova.mjs.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONVIDADO_BOTAO, CONVIDADO_CAMPO, CONVIDADO_LINHA, CONVIDADO_LINHA_CAMPEONATO, CONVIDADO_TITULO,
  CONVIDADO_CAMPO_PASSADO, CONVIDADO_LINHA_PASSADO, CONVIDADO_TITULO_PASSADO,
} from '../../src/utils/convidadoSemApp.js';
import { lerAppCss } from './_appCss.mjs';
import { lerPagina, importaDe } from './_fonteDaPagina.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
// O código sem os comentários: os comentários contam a história (e citam o chip, o botão e os textos velhos), a tela não.
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

// ── 1 · Início ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test('29Q · os dois cartões do Início: o Radar leva a /explorar, o Criar time a /criar-time; o cartão inteiro é o link', () => {
  const cartoes = semComentarios(ler('src/components/AtalhosDoInicio.jsx'));
  assert.match(cartoes, /<Link\s+to=\{para\}\s+className="hud-corners"/, 'o cartão inteiro é um <Link> (área de toque cheia), no chanfro da casa');
  assert.match(cartoes, /<Cartao id="radar" para="\/explorar" Icone=\{Radar\} cor="#8b5cf6"[^>]*rotulo="Radar de peladas" chamada="Encontre uma pelada perto de você" \/>/);
  assert.match(cartoes, /<Cartao id="criar-time" para="\/criar-time" Icone=\{CirclePlus\} cor="#d4a017"[^>]*rotulo="Criar time" chamada="Organize o jogo da sua galera" \/>/);
  assert.match(cartoes, /fontFamily: RAJ/, 'Rajdhani');
  assert.match(cartoes, /gridTemplateColumns: 'repeat\(2, minmax\(0, 1fr\)\)'/, 'lado a lado');
  assert.doesNotMatch(cartoes, /[\u{1F300}-\u{1FAFF}☀-➿]/u, 'ícone é lucide, nunca emoji');
});

test('29Q · o Início põe os cartões DEPOIS do "Seus times" e ANTES dos chips (uma vez só); o estado sem time não muda', () => {
  const inicio = semComentarios(lerPagina('Inicio'));
  const em = (trecho) => {
    const i = inicio.indexOf(trecho);
    assert.ok(i >= 0, `Inicio.jsx não tem ${trecho}`);
    return i;
  };
  assert.ok(importaDe(inicio, ['AtalhosDoInicio'], 'components/AtalhosDoInicio'), 'o Início importa o AtalhosDoInicio');
  assert.equal(inicio.split('<AtalhosDoInicio />').length - 1, 1, 'um par de cartões só na página');
  const stats = em('className="inicio-stats"');
  const seus = em('<CardSeuTime ');
  const atalhos = em('<AtalhosDoInicio />');
  const chips = em('className="chips-row"');
  // O rótulo da lista de baixo, depois dos chips ('Próximos Jogos', ou 'Outros jogos' quando o começo da lista subiu para baixo do cromo).
  const proximos = inicio.indexOf('className="games-label">', chips);
  assert.ok(proximos > chips, 'a lista de jogos de baixo vem depois dos chips');
  assert.ok(stats < seus && seus < atalhos, 'avatar → nome → nota → Seus times → cartões (quem não administra: logo embaixo da nota)');
  // 32J: o próximo jogo (o do Vou / Não vou) sobe para logo depois da nota, antes do Seus times — na primeira tela mesmo com o Início cheio.
  const noTopo = em('data-proximo-jogo-no-topo');
  assert.ok(stats < noTopo && noTopo < seus, 'nota → próximo jogo → Seus times');
  assert.ok(atalhos < chips && chips < proximos, 'os cartões vêm antes dos chips, e os Próximos Jogos seguem depois');
  // Só aparecem para quem tem time: o Início vazio (EmptyState) continua com os seus três botões, sem os cartões.
  // O EmptyState mora em src/pages/inicio/GameCard.jsx (a Início foi dividida): é o fim daquele arquivo.
  const cards = semComentarios(ler('src/pages/inicio/GameCard.jsx'));
  const vazio = cards.slice(cards.indexOf('function EmptyState'));
  assert.doesNotMatch(vazio, /AtalhosDoInicio/, 'o estado sem time não muda');
  assert.match(vazio, /＋ Criar meu time/);
  assert.match(vazio, /<Link to="\/explorar" className="btn btn--purple hud-corners">\s*Radar de peladas/);
  const ramo = inicio.slice(inicio.indexOf(') : noTeams ? ('), atalhos);
  // (o `{}` é o comentário JSX que `semComentarios` esvaziou)
  // (o `</>` fecha o estado sem time, que desde a Rodada 31R leva também o cartão "Recebeu um convite?")
  assert.match(ramo, /<EmptyState \/>\s*(<\/>\s*)?\) : \(\s*<>\s*(\{\}\s*)?$/, 'os cartões abrem o ramo de quem tem time (depois do EmptyState)');
});

test('29Q · a fila de chips é só o filtro dos jogos: Todas + os times; saíram o "＋ Criar time" e o "Radar de peladas"', () => {
  const inicio = semComentarios(lerPagina('Inicio'));
  const inicioDaFila = inicio.indexOf('className="chips-row"');
  const fila = inicio.slice(inicioDaFila, inicio.indexOf('className="games-label">', inicioDaFila));
  assert.ok(fila.length > 200, 'achou a fila');
  assert.match(fila, /setSelectedTeam\('all'\)/);
  assert.match(fila, /teams\.map\(\(t\) => \(/);
  for (const velho of ['/criar-time', '/explorar', 'data-criar-time', 'chip--explore', '＋ Criar time', 'Radar de peladas', '<Radar']) {
    assert.ok(!fila.includes(velho), `a fila já não tem ${velho}`);
  }
  assert.doesNotMatch(semComentarios(lerAppCss().replace(/\/\*[\s\S]*?\*\//g, '')), /\.chip--explore/, 'o estilo do chip que sobrou sem uso saiu');
  // O "Criar time" do Perfil fica (é outra tela).
  assert.match(lerPagina('MeuPerfil'), /data-criar-time/);
});

// ── 2 · Convidado sem app ─────────────────────────────────────────────────────────────────────────────────────────────────────────
test('29Q · os textos do convidado sem app, uma fonte só (utils/convidadoSemApp.js)', () => {
  assert.equal(CONVIDADO_TITULO, 'Alguém sem o app vai jogar?');
  assert.equal(CONVIDADO_LINHA, 'Escreva o nome: a pessoa entra no sorteio, mas não conta no ranking.');
  assert.equal(CONVIDADO_LINHA_CAMPEONATO, 'Escreva o nome: a pessoa entra na lista e você a coloca em um time.');
  assert.equal(CONVIDADO_CAMPO, 'Nome de quem vai jogar');
  assert.equal(CONVIDADO_BOTAO, 'Adicionar');
  // A VOZ: sem travessão no meio da frase, sem "por favor", sem "usuário"; o botão tem 1 palavra, sem ponto.
  for (const texto of [CONVIDADO_TITULO, CONVIDADO_LINHA, CONVIDADO_LINHA_CAMPEONATO, CONVIDADO_CAMPO, CONVIDADO_BOTAO]) {
    assert.doesNotMatch(texto, /—|–| - |por favor|usuário/i, texto);
  }
  // O Campeonato não tem ranking: a linha dele não fala dele.
  assert.doesNotMatch(CONVIDADO_LINHA_CAMPEONATO, /ranking/);
  assert.match(CONVIDADO_LINHA, /não conta no ranking/);
});

// 29S-B: o Novo jogo não tem mais a caixa do convidado (o modo "Times à mão" foi para o Jogo e o "Já aconteceu" virou o passo a passo do Jogo
// passado, que tem a sua, no passado — conferida logo abaixo).
test('29Q · Jogo e Campeonato usam o MESMO texto do convidado (e nenhum escreve o seu)', () => {
  // A caixa do Jogo virou componente (32A: a lista guardada no jogo, com GOL e C); o Jogo só a monta.
  assert.match(semComentarios(ler('src/pages/Jogo.jsx')), /<ConvidadosDoJogo convidados=\{convidados\}/);
  assert.doesNotMatch(semComentarios(ler('src/pages/Jogo.jsx')), /CONVIDADO_/, 'o Jogo não escreve os textos do convidado');
  const lugares = [
    { arq: 'src/components/ConvidadosDoJogo.jsx', linha: 'CONVIDADO_LINHA' },
    { arq: 'src/pages/Campeonato.jsx', linha: 'CONVIDADO_LINHA_CAMPEONATO' },
  ];
  for (const { arq, linha } of lugares) {
    const fonte = ler(arq);
    const tela = semComentarios(fonte);
    assert.match(fonte, /from '\.\.\/utils\/convidadoSemApp';/, `${arq} importa o módulo dos textos`);
    assert.match(tela, /\{CONVIDADO_TITULO\}/, `${arq}: o título`);
    assert.match(tela, new RegExp(`\\{${linha}\\}`), `${arq}: a linha`);
    assert.match(tela, /placeholder=\{CONVIDADO_CAMPO\}/, `${arq}: o campo`);
    assert.match(tela, /\{CONVIDADO_BOTAO\}/, `${arq}: o botão`);
    assert.equal(tela.split('{CONVIDADO_TITULO}').length - 1, 1, `${arq}: uma caixa só`);
    for (const velho of ['Convidados sem app', 'Convidados <span', '(sem app, só nome)', '(só o nome', 'não entram no ranking', 'Nome do convidado', '+ Convidado', 'entram no sorteio)']) {
      assert.ok(!tela.includes(velho), `${arq} ainda escreve "${velho}"`);
    }
  }
  assert.doesNotMatch(semComentarios(ler('src/pages/Campeonato.jsx')), /CONVIDADO_LINHA\}/, 'o Campeonato usa a linha SEM ranking');
  // A regra não muda: só o nome (mais as marcas do sorteio, 32A), entra no sorteio. Nenhuma das três telas manda convidado para users.
  assert.match(semComentarios(ler('src/components/ConvidadosDoJogo.jsx')), /onMudar\(\[\.\.\.convidados, novoConvidado\(nome\)\]\)/);
});

test('29S-B · o Jogo passado usa o texto do convidado NO PASSADO, da mesma fonte (utils/convidadoSemApp.js); o Novo jogo não tem mais a caixa', () => {
  assert.equal(CONVIDADO_TITULO_PASSADO, 'Alguém sem o app jogou?');
  assert.equal(CONVIDADO_LINHA_PASSADO, 'Escreva o nome: entra no jogo, mas não conta no ranking.');
  assert.equal(CONVIDADO_CAMPO_PASSADO, 'Nome de quem jogou');
  for (const texto of [CONVIDADO_TITULO_PASSADO, CONVIDADO_LINHA_PASSADO, CONVIDADO_CAMPO_PASSADO]) {
    assert.doesNotMatch(texto, /—|–| - |por favor|usuário|vai jogar|vão jogar/i, texto);
  }
  const fonte = ler('src/pages/JogoPassado.jsx');
  const tela = semComentarios(fonte);
  assert.match(fonte, /from '\.\.\/utils\/convidadoSemApp';/);
  assert.match(tela, /\{CONVIDADO_TITULO_PASSADO\}/, 'o título');
  assert.match(tela, /\{CONVIDADO_LINHA_PASSADO\}/, 'a linha');
  assert.match(tela, /placeholder=\{CONVIDADO_CAMPO_PASSADO\}/, 'o campo');
  assert.match(tela, /\{CONVIDADO_BOTAO\}/, 'o botão (o mesmo "Adicionar")');
  assert.equal(tela.split('{CONVIDADO_TITULO_PASSADO}').length - 1, 1, 'uma caixa só');
  assert.doesNotMatch(semComentarios(ler('src/pages/NovoJogo.jsx')), /CONVIDADO_|convidado/i, 'o Marcar jogo não tem caixa de convidado (ela está no Jogo, quando os times vão ser formados)');
});

// ── 3 · Criar time, passo 4 ───────────────────────────────────────────────────────────────────────────────────────────────────────
test('29Q · passo 4 do Criar time: o link do convite é gerado sozinho, uma vez, na criação; o botão só volta se a geração falhar', () => {
  const criar = semComentarios(ler('src/pages/CriarEquipa.jsx'));
  // Uma chamada só ao motor, usada pela geração sozinha e pelo botão de reserva.
  assert.equal(criar.split('/convite`').length - 1, 1, 'a chamada de /convite existe uma vez só');
  // 31N: o nome do time vai junto (o link curto leva o nome do time na frente do código).
  assert.match(criar, /async function pedirConvite\(slug, nomeTime\) \{\s*const \{ token, codigo \} = await apiFetch\(`\/api\/teams\/\$\{slug\}\/convite`, \{ method: 'POST' \}\);/);
  // Gerada na criação do time (não num efeito que roda de novo): logo depois de o time existir, sem esperar a resposta.
  assert.match(criar, /setTeam\(t\);\s*pedirConvite\(t\.slug, t\.nome\)\.catch\(\(e\) => \{\s*setConviteFalhou\(true\);\s*setToast\(\{ tipo: 'error', mensagem: e\.message \}\);\s*\}\);/);
  assert.equal(criar.split('pedirConvite(').length - 1, 3, 'definida uma vez e chamada duas (a automática e a do botão de reserva)');
  assert.match(criar, /await pedirConvite\(team\.slug, team\.nome\);/, 'o botão de reserva usa a MESMA chamada');
  // O botão "Gerar link do convite" só existe no ramo da falha; com o link pronto some, e enquanto espera há uma linha de status.
  const passo4 = criar.slice(criar.indexOf('{passo === 4 && team && ('), criar.indexOf('</main>'));
  assert.match(passo4, /\{inviteLink \? \(/);
  assert.match(passo4, /\) : conviteFalhou \? \(\s*<Cta onClick=\{gerarConvite\} disabled=\{busy\}>\{busy \? 'Gerando…' : 'Gerar link do convite'\}<\/Cta>\s*\) : \(\s*<p [^>]*data-gerando-convite>Preparando o link do convite…<\/p>/);
  assert.equal(passo4.split('Gerar link do convite').length - 1, 1, 'o botão aparece num lugar só do passo 4');
  assert.match(criar, /const \[conviteFalhou, setConviteFalhou\] = useState\(false\);/);
});
