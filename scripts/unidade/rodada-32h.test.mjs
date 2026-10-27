// Futty v2.0 — Rodada 32H: o jogo nasce chamando, o sorteio tem hora marcada (a lista fecha nela), o "Vou / Não vou" trava, o Início
// mostra UM cartão por jogo, o Ranking não solta confete e o Convidar mostra a validade do link. As contas e os textos aqui; o que só o
// navegador confirma (com o motor de verdade) fica em scripts/provas/rodada-32h.prova.mjs.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UMA_HORA_MS, contagemDoSorteio, respostaDoJogo, textoDaListaFechada, textoDoSorteio } from '../../src/utils/chamada.js';
import { diaCurtoComData } from '../../src/utils/dataHora.js';
import { validadeDoConvite } from '../../src/utils/convite.js';
import { lerPagina } from './_fonteDaPagina.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const SP = 'America/Sao_Paulo';
const JOGO = '2026-10-29T23:00:00Z'; // qui. 29/10 às 20:00 em São Paulo
const MIN = 60 * 1000;

test('B · "Sorteio às 19:00" no dia do jogo; "Sorteio: qua. 28/10 às 20:00" noutro dia — no relógio do time', () => {
  assert.equal(textoDoSorteio('2026-10-29T22:00:00Z', JOGO, SP), 'Sorteio às 19:00');
  assert.equal(textoDoSorteio('2026-10-28T23:00:00Z', JOGO, SP), 'Sorteio: qua. 28/10 às 20:00');
  assert.equal(diaCurtoComData(JOGO, SP), 'qui. 29/10');
  assert.equal(textoDoSorteio(null, JOGO, SP), '');
  assert.equal(UMA_HORA_MS, 3600000, 'o padrão do motor: 1 hora antes do jogo');
});

test('B · a contagem regressiva: dias, "1 dia e Xh", "2h 15min", "35min" — e nada quando a hora passou (a lista fechou)', () => {
  const sorteio = Date.parse('2026-10-29T22:00:00Z');
  assert.equal(contagemDoSorteio(sorteio, sorteio - (2 * 60 + 15) * MIN), 'Sorteio em 2h 15min');
  assert.equal(contagemDoSorteio(sorteio, sorteio - 35 * MIN), 'Sorteio em 35min');
  assert.equal(contagemDoSorteio(sorteio, sorteio - 3 * 60 * MIN), 'Sorteio em 3h');
  assert.equal(contagemDoSorteio(sorteio, sorteio - (24 + 4) * 60 * MIN), 'Sorteio em 1 dia e 4h');
  assert.equal(contagemDoSorteio(sorteio, sorteio - 3 * 24 * 60 * MIN), 'Sorteio em 3 dias');
  assert.equal(contagemDoSorteio(sorteio, sorteio - 20 * 1000), 'Sorteio em 1min', 'os últimos segundos ainda contam um minuto');
  assert.equal(contagemDoSorteio(sorteio, sorteio), null);
  assert.equal(contagemDoSorteio(sorteio, sorteio + MIN), null);
});

test('B · depois do sorteio: "Lista fechada · 8 confirmados" (e "1 confirmado")', () => {
  assert.equal(textoDaListaFechada(8), 'Lista fechada · 8 confirmados');
  assert.equal(textoDaListaFechada(1), 'Lista fechada · 1 confirmado');
  assert.equal(textoDaListaFechada(undefined), 'Lista fechada · 0 confirmados');
});

test('C · a resposta de quem olha vem do jogo; o "Vou / Não vou" trava nela e só "Trocar resposta" reabre', () => {
  assert.equal(respostaDoJogo({ user_status: 'going' }), 'confirmado');
  assert.equal(respostaDoJogo({ user_status: 'not_going' }), 'recusado');
  assert.equal(respostaDoJogo({}), null);
  const comp = semComentarios(ler('src/components/RespostaDoJogo.jsx'));
  assert.match(comp, /'Você está confirmado'/);
  assert.match(comp, /'Você não vai nesse jogo'/);
  assert.match(comp, /<Check size=\{16\}/, 'o check é o do lucide, não um caractere');
  assert.match(comp, />Trocar resposta</);
  assert.match(comp, /if \(resposta && !trocando\)/, 'respondeu: os botões somem até tocar em "Trocar resposta"');
  assert.match(comp, /\{aberta \? <button type="button" data-trocar-resposta/, 'lista fechada: nem "Trocar resposta"');
});

test('D · o Início tem UM cartão por jogo: sem cartão de presença à parte, sem aviso "Você vai?" no topo, sem "Avisar que não vou"', () => {
  const inicio = semComentarios(lerPagina('Inicio'));
  assert.doesNotMatch(inicio, /RSVPCard|AvisoDeJogo|ConfirmarAusencia|Avisar que não vou|Confirme presença/);
  assert.equal((inicio.match(/<RespostaDoJogo/g) || []).length, 1, 'a resposta mora no cartão do jogo');
  for (const arquivo of ['src/components/RSVPCard.jsx', 'src/components/AvisoDeJogo.jsx', 'src/pages/inicio/ConfirmarAusencia.jsx']) {
    assert.ok(!fs.existsSync(path.join(RAIZ, arquivo)), `${arquivo} saiu`);
  }
});

test('A/B · a palavra "prazo" não aparece em tela nenhuma; "Abrir presença" e "Fechar presença" também não', () => {
  // O que a pessoa LÊ: texto de JSX (>…<) e frases entre aspas (com espaço — 'prazo' sozinho é marca interna de código, não texto).
  const PALAVRA = /\b(prazo|Abrir presença|Fechar presença)\b/i;
  const visivel = { test: (linha) => [...linha.matchAll(/(?<!=)>([^<>{}]+)<|(['"`])([^'"`]*)\2/g)].some((m) => {
    const texto = m[1] ?? m[3];
    return PALAVRA.test(texto) && (m[1] != null || /\s/.test(texto.trim()));
  }) };
  const achados = [];
  const varrer = (dir) => {
    for (const nome of fs.readdirSync(path.join(RAIZ, dir))) {
      const rel = `${dir}/${nome}`;
      if (fs.statSync(path.join(RAIZ, rel)).isDirectory()) { varrer(rel); continue; }
      if (!/\.(jsx|js)$/.test(nome) || rel.includes('/gabinete/') || /Gabinete\.jsx$/.test(rel)) continue; // o Gabinete é do super-admin, não do jogador
      semComentarios(ler(rel)).split('\n').forEach((linha, i) => {
        if (visivel.test(linha)) achados.push(`${rel}:${i + 1}: ${linha.trim().slice(0, 80)}`);
      });
    }
  };
  varrer('src');
  assert.deepEqual(achados, []);
});

test('B · Novo jogo: o sorteio nasce "1 hora antes do jogo" (o admin muda) e quem é chamado nasce "Todo o elenco"', () => {
  const novo = semComentarios(ler('src/pages/NovoJogo.jsx'));
  assert.match(novo, /· 1 hora antes do jogo/);
  assert.match(novo, /data-mudar-sorteio/);
  assert.match(novo, /\.\.\.\(sorteioIso \? \{ sorteio_em: sorteioIso \} : \{\}\)/, 'sem mexer, vai sem a hora (o motor põe 1 h antes)');
  assert.match(novo, />Todo o elenco</);
  assert.match(novo, /\.\.\.\(escolhidos && elenco \? \{ chamados: \[\.\.\.escolhidos\] \} : \{\}\)/, 'sem escolher, o elenco inteiro (também quem entrar depois)');
});

test('F · "Editar jogo" fecha com o X e com Esc, e tem a hora do sorteio', () => {
  const painel = semComentarios(lerPagina('AdminPanel'));
  assert.match(painel, /aria-label="Fechar" data-fechar-editar-jogo/);
  assert.match(painel, /<X size=\{20\} aria-hidden="true" \/>/);
  assert.match(painel, /e\.key === 'Escape' && !saving\) onClose\(\)/);
  assert.match(painel, /sorteio_date: sorteioMexido\.data, sorteio_time: sorteioMexido\.hora/);
});

test('F · o Ranking não solta confete (nem ao abrir, nem no pódio)', () => {
  const ranking = ler('src/pages/Ranking.jsx');
  assert.doesNotMatch(semComentarios(ranking), /useConfetti|celebrar[A-Z]|confetti/i);
  assert.ok(!fs.existsSync(path.join(RAIZ, 'src/utils/podioCelebrado.js')), 'a memória do pódio celebrado saiu junto');
});

test('F · Convidar: "Vale até 26/11 (30 dias)"; vencido → null (a tela diz "Vencido" e esconde Copiar e WhatsApp)', () => {
  const agora = Date.parse('2026-10-27T15:00:00Z');
  const em30 = new Date(agora + 30 * 24 * 3600 * 1000).toISOString();
  assert.equal(validadeDoConvite(em30, { agora, fuso: SP }), 'Vale até 26/11 (30 dias)');
  assert.equal(validadeDoConvite(new Date(agora + 3600 * 1000).toISOString(), { agora, fuso: SP }), 'Vale até 27/10 (1 dia)', 'menos de um dia ainda é "1 dia", nunca "0 dias"');
  assert.equal(validadeDoConvite(new Date(agora + 30 * 24 * 3600 * 1000 + 10 * 60 * 1000).toISOString(), { agora, fuso: SP }), 'Vale até 26/11 (30 dias)', 'o aparelho uns minutos atrás do motor: continua 30 dias');
  assert.equal(validadeDoConvite(new Date(agora - 1000).toISOString(), { agora, fuso: SP }), null);
  assert.equal(validadeDoConvite(null, { agora }), null);
  const equipa = semComentarios(ler('src/pages/Equipa.jsx'));
  assert.match(equipa, /\/convite\/atual/, 'o link ATUAL, não um novo a cada toque');
  assert.match(equipa, /data-convite-vencido/);
  assert.match(equipa, /\{conviteVencido \? \(\s*<p className="texto-apoio"[\s\S]*?\) : \(\s*<>[\s\S]*?Copiar[\s\S]*?Mandar no WhatsApp[\s\S]*?<\/>\s*\)\}/, 'vencido: sem Copiar e sem WhatsApp');
  assert.match(equipa, />\s*\{generating \? 'Gerando…' : 'Gerar link novo'\}/);
});
