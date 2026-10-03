// Futty v2.0 — Rodada 29I, bloco 2: o que a pessoa lê e toca. O COMPORTAMENTO (Voltar do sistema, toque no card, salto do sorteio, redirecionamento)
// é provado num Chromium de verdade — `npm run provar:navegador`. Aqui travam-se os textos, os nomes e as decisões, lendo o código (o mesmo jeito
// dos outros testes de tela da casa), para nada voltar sem alguém ver.
//
//   77  "Escolha a cidade primeiro"      78  o artilheiro depende dos gols      79  3/3, não 3/4      81  nome do botão "Mostrar gols"
//   82  obrigatórios e "o que falta"     91  uniformes e fundos em português     75  "Algo deu errado" sem a linha técnica
//   76  rodapé legal na landing          93  Resenha: esqueleto e estado vazio   96  o time uma vez só no Ranking
//   101 "confirmados por jogo"
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KITS_FIGURINHA } from '../../src/utils/kitsFigurinha.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

test('91 · os uniformes têm nome em português, com a cara de marca (os ids internos continuam os do motor)', () => {
  const nomes = Object.fromEntries(KITS_FIGURINHA.map((k) => [k.id, k.nome]));
  assert.deepEqual(nomes, {
    'dark-gold': 'Ouro Escuro',
    'dark-purple': 'Roxo Escuro',
    'white-gold': 'Ouro e Branco',
    'elite-gold': 'Ouro Elite',
    'royal-purple': 'Roxo Real',
  });
  assert.equal(new Set(Object.values(nomes)).size, 5, 'cinco nomes diferentes');
  for (const nome of Object.values(nomes)) assert.doesNotMatch(nome, /Dark|Gold|White|Elite Gold|Royal|Purple/, nome);
});

test('91 · os fundos da figurinha também: nada de "Golden" nem "Royal" na tela', () => {
  const figurinha = ler('src/pages/Figurinha.jsx');
  assert.match(figurinha, /\{ k: 'golden', label: 'Dourado', premium: true \}/);
  assert.match(figurinha, /\{ k: 'royal', label: 'Real', premium: true \}/);
  const lista = figurinha.slice(figurinha.indexOf('const FUNDOS = ['), figurinha.indexOf('];', figurinha.indexOf('const FUNDOS = [')));
  const rotulos = [...lista.matchAll(/\{ k: '[a-z]+', label: '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(rotulos, ['Neutro', 'Épico', 'Estádio', 'Aura', 'Dourado', 'Real']);
  // o Gabinete lista o uniforme do pacote pelo nome em português, não por "dark-gold" capitalizado
  const gabinete = ler('src/pages/gabinete/Brilhantes.jsx');
  assert.match(gabinete, /KITS_FIGURINHA\.find/);
});

test('91 · nenhum nome de uniforme, fundo ou kit em inglês escrito para a tela (JSX e textos)', () => {
  const ingles = /['"`>][^'"`<>{}]*\b(Dark Gold|Dark Purple|White Gold|Elite Gold|Royal Purple|Golden|Royal)\b/;
  const achados = [];
  const andar = (dir) => {
    for (const nome of fs.readdirSync(dir)) {
      const caminho = path.join(dir, nome);
      if (fs.statSync(caminho).isDirectory()) andar(caminho);
      else if (/\.jsx?$/.test(nome)) {
        ler(path.relative(RAIZ, caminho)).split('\n').forEach((linha, i) => {
          if (/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(linha)) return;
          if (ingles.test(linha)) achados.push(`${path.relative(RAIZ, caminho)}:${i + 1}: ${linha.trim().slice(0, 90)}`);
        });
      }
    }
  };
  andar(path.join(RAIZ, 'src'));
  assert.deepEqual(achados, [], achados.join('\n'));
});

test('75 · a tela "Algo deu errado" não mostra a linha técnica — fica a frase da casa', () => {
  const boundary = ler('src/components/ErrorBoundary.jsx');
  const pagina = ler('src/components/ErrorPage.jsx');
  assert.doesNotMatch(boundary, /detalheTecnico/);
  assert.doesNotMatch(pagina, /detalheTecnico/);
  assert.match(pagina, /O servidor está descansando\. Tente de novo daqui a pouco\./);
  assert.match(boundary, /console\.error\('ErrorBoundary:'/, 'o erro continua no console');
  assert.match(boundary, /gravarUltimoErro\(/, '...e no Diagnóstico');
});

test('76 · a landing tem o rodapé legal: Termos de Uso, Privacidade e o aviso de 18+', () => {
  const landing = ler('src/pages/LandingPage.jsx');
  assert.match(landing, /data-rodape-legal/);
  assert.match(landing, /<Link to="\/termos"[^>]*>Termos de Uso<\/Link>/);
  assert.match(landing, /<Link to="\/privacidade"[^>]*>Privacidade<\/Link>/);
  assert.match(landing, /Para maiores de 18 anos\./);
});

test('77, 79, 81, 82 e 78 · a criação do time: "a cidade", 3/3, nome do botão, obrigatórios, e o artilheiro depende dos gols', () => {
  assert.match(ler('src/components/CampoBairro.jsx'), /'Escolha a cidade primeiro'/);
  const criar = ler('src/pages/CriarEquipa.jsx');
  assert.match(criar, /\[1, 2, 3\]\.map/, 'a barra tem três passos');
  assert.doesNotMatch(criar, /\[1, 2, 3, 4\]\.map/);
  assert.match(criar, /passo === 4 \? 'Pronto' : `\$\{passo\}\/3`/, '3/3, e a tela de convites diz "Pronto"');
  assert.doesNotMatch(criar, /\/4`/, 'nenhum "/4"');
  assert.match(criar, /rotulo="Mostrar gols"/, 'o botão de gols tem nome (achado 81)');
  assert.match(criar, /cursor: rest\.disabled \? 'not-allowed' : 'pointer'/, 'apagado = not-allowed (achado 82)');
  assert.match(criar, /Nome do time \(obrigatório\)/);
  assert.match(criar, /Cidade \(obrigatória em time aberto\)/);
  assert.match(criar, /Falta o nome do time\./);
  assert.match(criar, /Time aberto precisa de cidade\./);
  // achado 78: desligar os gols desliga o artilheiro; religar os gols NÃO religa; o artilheiro apagado diz por quê
  assert.match(criar, /if \(mostrarGols\) setMostrarArtilheiro\(false\); setMostrarGols\(!mostrarGols\)/);
  assert.match(criar, /disabled=\{!mostrarGols\}/);
  assert.match(criar, /'Precisa dos gols ligados\.'/);
  assert.match(criar, /if \(!mostrarArtilheiro \|\| !mostrarGols\) bodyCriar\.mostrar_artilheiro = false/, 'nunca manda gols off com artilheiro on');
  // achado 80: a pergunta antes de sair, com o texto aprovado
  assert.match(criar, /Sair da criação\? Você perde o que preencheu\./);
});

test('78 · o painel do admin (Ajustes) segue a mesma regra: gols off desliga o artilheiro junto, no mesmo pedido', () => {
  const painel = ler('src/pages/AdminPanel.jsx');
  assert.match(painel, /desligaArtilheiroJunto/);
  assert.match(painel, /mostrar_gols: v, \.\.\.\(desligaArtilheiroJunto \? \{ mostrar_artilheiro: false \} : \{\}\)/);
  assert.match(painel, /const apagado = p\.campo === 'mostrar_artilheiro' && !mostrarGols;/);
  assert.match(painel, /Precisa dos gols ligados\./);
  assert.match(painel, /aria-label="Mostrar gols"/);
});

test('101 · o número "por jogo" do painel diz do quê: confirmados por jogo', () => {
  const painel = ler('src/pages/AdminPanel.jsx');
  assert.match(painel, /label="confirmados por jogo"/);
  assert.doesNotMatch(painel, /label="por jogo"/);
});

test('96 · o Ranking diz o nome do time UMA vez: título quando há um time só, o chip ativo quando há vários', () => {
  const ranking = ler('src/pages/Ranking.jsx');
  assert.match(ranking, /\{equipaAtual && teams\.length <= 1 \? \(/);
  assert.match(ranking, /\{teams\.length > 1 \? \(/, 'os chips aparecem só com mais de um time');
});

test('93 · a Resenha tem esqueleto de carregamento e estado vazio de verdade', () => {
  const feed = ler('src/pages/Feed.jsx');
  assert.match(feed, /function ResenhaEsqueleto\(\)/);
  assert.match(feed, /\{loading \? \(\s*<ResenhaEsqueleto \/>/);
  assert.match(feed, /data-resenha-vazia/);
  assert.match(feed, /Ainda não tem resenha por aqui\./);
  assert.match(feed, /Seja o primeiro: o campo de cima é para isso\./);
  assert.match(feed, /Quando alguém postar ou um jogo for fechado, aparece aqui\./);
  const css = ler('src/styles/app.css');
  assert.match(css, /\.feed-esqueleto \{/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.feed-esqueleto::after \{ animation: none; \}/);
});

test('88, 89 e 90 · sorteio: "Ver sorteio" abre pelo roteador com "Abrindo…"; "concluir já" acorda as esperas; o 9:16 diz o que aconteceu', () => {
  const inicio = ler('src/pages/Inicio.jsx');
  assert.doesNotMatch(inicio, /window\.location\.assign/, 'recarregar o app inteiro era a demora do "Ver sorteio"');
  assert.match(inicio, /navigate\(`\/time\/\$\{game\.team_slug\}\/jogo\/\$\{game\.id\}\/sorteio`\)/);
  assert.match(inicio, /abrindo \? 'Abrindo…'/);
  const cerimonia = ler('src/components/CerimoniaSorteio.jsx');
  assert.match(cerimonia, /acordadores/);
  assert.match(cerimonia, /\[\.\.\.acordadores\]\.forEach\(\(acordar\) => acordar\(\)\)/);
  assert.match(cerimonia, /data-aviso-cartao/);
  assert.match(cerimonia, /Cartão do \$\{nomeDoTime\} salvo no seu aparelho\./);
});

test('84 · o card de jogo do Início tem um link de verdade para a tela do jogo (stretched link, sem botão dentro de <a>)', () => {
  const inicio = ler('src/pages/Inicio.jsx');
  assert.match(inicio, /<Link className="gcard__link" to=\{`\/time\/\$\{game\.team_slug\}\/jogo\/\$\{game\.id\}`\}/);
  const css = ler('src/styles/app.css');
  assert.match(css, /\.gcard__link::after \{ content: ''; position: absolute; inset: 0; z-index: 1; \}/);
  assert.match(css, /\.gcard button \{ position: relative; z-index: 2; \}/, 'os botões ficam por cima da camada do link');
});
