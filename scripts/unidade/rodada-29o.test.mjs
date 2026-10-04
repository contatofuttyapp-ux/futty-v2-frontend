// Futty v2.0 — Rodada 29O: "Criar time sem jargão" e a frase da landing. As regras de ligar/desligar são provadas nas funções puras
// (golsEPremios.js); os textos e a estrutura da tela são travados lendo o código, como os outros testes de tela da casa.
// A prova no navegador do passo 2 está em scripts/provas/criar-time.prova.mjs.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTILHEIRO, DESTAQUE, GOLS, alternarArtilheiro, alternarGols } from '../../src/components/golsEPremios.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

test('29O · os títulos e as frases de gols e prêmios são os aprovados pelo dono', () => {
  assert.deepEqual(GOLS, { titulo: 'Gols de cada um', apoio: 'Registra quantos gols cada jogador marcou.' });
  assert.deepEqual(ARTILHEIRO, { titulo: 'Artilheiro do dia', apoio: 'Quem fez mais gols no jogo ganha o troféu.' });
  assert.deepEqual(DESTAQUE, { titulo: 'Destaque do dia', apoio: 'O jogador que fez a diferença em campo, escolhido por você.' });
});

test('29O · ligar o artilheiro liga os gols junto; desligar os gols desliga o artilheiro; religar os gols não religa o artilheiro', () => {
  assert.deepEqual(alternarArtilheiro(false, true), { mostrarGols: true, mostrarArtilheiro: true }, 'artilheiro com gols apagados acende os dois');
  assert.deepEqual(alternarArtilheiro(true, false), { mostrarGols: true, mostrarArtilheiro: false }, 'desligar o artilheiro não mexe nos gols');
  assert.deepEqual(alternarGols(true, false), { mostrarGols: false, mostrarArtilheiro: false }, 'desligar os gols leva o artilheiro');
  assert.deepEqual(alternarGols(false, true), { mostrarGols: true, mostrarArtilheiro: false }, 'religar os gols não religa o artilheiro');
  assert.deepEqual(alternarGols(true, true), { mostrarGols: true, mostrarArtilheiro: true }, 'religar os gols mantém o artilheiro que já estava ligado');
});

test('29O · nenhum toque deixa o artilheiro ligado sem os gols', () => {
  for (const estadoGols of [false, true]) {
    for (const estadoArtilheiro of [false, true]) {
      for (const ligar of [false, true]) {
        const porGols = alternarGols(estadoArtilheiro, ligar);
        const porArtilheiro = alternarArtilheiro(estadoGols, ligar);
        assert.ok(!(porGols.mostrarArtilheiro && !porGols.mostrarGols), JSON.stringify({ estadoArtilheiro, ligar, porGols }));
        assert.ok(!(porArtilheiro.mostrarArtilheiro && !porArtilheiro.mostrarGols), JSON.stringify({ estadoGols, ligar, porArtilheiro }));
      }
    }
  }
});

test('29O · o time criado sem tocar em nada nasce com os três desligados (o corpo do POST manda os três false)', () => {
  const criar = ler('src/pages/CriarEquipa.jsx');
  assert.match(criar, /const \[mostrarGols, setMostrarGols\] = useState\(false\);/);
  assert.match(criar, /const \[mostrarArtilheiro, setMostrarArtilheiro\] = useState\(false\);/);
  assert.match(criar, /const \[mostrarDestaque, setMostrarDestaque\] = useState\(false\);/);
  assert.match(criar, /if \(!mostrarGols\) bodyCriar\.mostrar_gols = false;/);
  assert.match(criar, /if \(!mostrarArtilheiro \|\| !mostrarGols\) bodyCriar\.mostrar_artilheiro = false;/);
  assert.match(criar, /if \(!mostrarDestaque\) bodyCriar\.mostrar_destaque = false;/);
});

test('29O · o passo 2 não tem título nem texto de apoio na tela: título só para leitor de tela, e dois cartões', () => {
  const criar = ler('src/pages/CriarEquipa.jsx');
  const passo2 = criar.slice(criar.indexOf('{passo === 2 && ('), criar.indexOf('{passo === 3 && ('));
  assert.match(criar, /const SO_LEITOR = \{ position: 'absolute'/);
  assert.match(passo2, /<h1 style=\{SO_LEITOR\}>Passo 2 de 3<\/h1>/);
  assert.match(passo2, /<EscolhaPapel joga=\{joga\} aoTrocar=\{setJoga\} semTexto \/>/, 'o Criar time esconde o texto do papel');
  assert.match(passo2, /Você também joga\?/);
  assert.match(passo2, /O que contar nos jogos\?/);
  assert.match(passo2, /\{ chave: 'gols', Icone: Target, \.\.\.GOLS/);
  assert.match(passo2, /\{ chave: 'artilheiro', Icone: Trophy, \.\.\.ARTILHEIRO/);
  assert.match(passo2, /\{ chave: 'destaque', Icone: Star, \.\.\.DESTAQUE/);
  assert.match(criar, /import \{ Star, Target, Trophy \} from 'lucide-react';/);
  assert.doesNotMatch(passo2, /style=\{\{ marginBottom: 14 \}\}>/, 'nenhum subtítulo de tela abaixo do título');
});

test('29O · o passo 2 não usa o jargão antigo: sem "radar", "eixos", "MVP", "Como funciona" nem o painel de admin', () => {
  const criar = ler('src/pages/CriarEquipa.jsx');
  for (const velho of ['Como funciona o seu time?', 'radar', 'eixos', 'MVP', 'MiniRadar', 'Você joga na linha', 'painel de admin', 'Precisa dos gols ligados']) {
    assert.ok(!criar.toLowerCase().includes(velho.toLowerCase()), `saiu do Criar time: ${velho}`);
  }
});

test('29O · o papel: "Sim, eu jogo" / "Não, só organizo" nos dois lugares; o Criar time não mostra o texto dos chips', () => {
  const escolha = ler('src/components/EscolhaLinhaGol.jsx');
  assert.match(escolha, /Sim, eu jogo/);
  assert.match(escolha, /Não, só organizo/);
  assert.doesNotMatch(escolha, />\s*Eu jogo\s*</);
  assert.doesNotMatch(escolha, />\s*Só organizo o time\s*</);
  assert.match(escolha, /\{semTexto \? null : <p className="texto-apoio"/, 'o texto de apoio some só quando pedido');
  const painel = ler('src/pages/AdminPanel.jsx');
  assert.match(painel, /<span style=\{lbl\}>Você também joga\?<\/span>/);
  assert.match(painel, /<EscolhaPapel joga=\{joga\} ocupado=\{jogaOcupado\} aoTrocar=\{guardarJoga\} \/>/, 'o texto de apoio continua nos Ajustes');
});

test('29O · os Ajustes usam as mesmas frases do passo 2 e a mesma regra do artilheiro; sai o jargão antigo', () => {
  const painel = ler('src/pages/AdminPanel.jsx');
  for (const velho of ['Gols visíveis', 'Gols escondidos', '>Meu papel<', 'Precisa dos gols ligados', 'painel de admin']) {
    assert.ok(!painel.includes(velho), `saiu dos Ajustes: ${velho}`);
  }
  assert.match(painel, /<Interruptor ligado=\{mostrarGols\} aoTrocar=\{guardarMostrarGols\} rotulo=\{GOLS\.titulo\} apoio=\{GOLS\.apoio\} \/>/);
  assert.match(painel, /<Interruptor ligado=\{mostrarArtilheiro\} aoTrocar=\{guardarArtilheiro\} rotulo=\{ARTILHEIRO\.titulo\} apoio=\{ARTILHEIRO\.apoio\} \/>/);
  assert.match(painel, /<Interruptor ligado=\{mostrarDestaque\} aoTrocar=\{guardarDestaque\} rotulo=\{DESTAQUE\.titulo\} apoio=\{DESTAQUE\.apoio\} \/>/);
  assert.match(painel, /async function guardarArtilheiro\(v\)/);
  assert.match(painel, /JSON\.stringify\(\{ mostrar_artilheiro: v, \.\.\.\(ligaGolsJunto \? \{ mostrar_gols: true \} : \{\}\) \}\)/, 'ligar o artilheiro manda os gols no mesmo pedido');
});

test('29O · a landing tem o nome e o que o app faz, logo abaixo do slogan', () => {
  const landing = ler('src/pages/LandingPage.jsx');
  assert.match(landing, /O seu time\.<br \/>A sua figurinha\./);
  assert.match(landing, /Futty: sorteio justo, ranking e figurinha de colecionador para o futebol do seu time\./);
});
