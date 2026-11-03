#!/usr/bin/env node
// Monta o dist do app 2.0: o site do sorteio inteiro, mais a ponte nativa. Idempotente: apaga o dist velho a cada vez.
//
//   node scripts/empacotar-sorteio.mjs              constrói o `main` do site, atualiza sorteio-pacote/ e monta o dist
//   node scripts/empacotar-sorteio.mjs --do-pacote  só monta o dist a partir de sorteio-pacote/ (o ios.yml: o Mac do CI não tem o site)
//
// Para refazer depois que o site mudar: rode sem opção e commite sorteio-pacote/. É o que o ios.yml leva para o TestFlight.
//
// O site é construído numa cópia do `main` exportada com `git archive` para a pasta temporária. Nunca na pasta do site: lá
// costuma haver trabalho em andamento de outra rodada, e este script não escreve nem lê nada que não esteja commitado.
//
// Só para as provas, nunca para a loja (o que muda fica no dist, não em sorteio-pacote/):
//   --api <url>      a ponte fala com este servidor em vez de futtyapp.com.br
//   --robo <arquivo> entra no dist um script que dirige as telas no simulador
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../', import.meta.url));
const DIST = join(RAIZ, 'dist');
const PACOTE = join(RAIZ, 'sorteio-pacote');
const PONTE = join(RAIZ, 'public', 'ponte-nativa.js');
const ORIGEM = join(PACOTE, 'ORIGEM.json');
const SITE = process.env.SORTEIO_REPO || join(RAIZ, '..', '..', '..', 'SORTEIO', 'codigo');
const API_DA_LOJA = "var API = 'https://futtyapp.com.br';";

// Só servem ao site na internet: buscadores, cabeçalhos da Cloudflare, prévia de link e os exemplos do bloco de SEO, que dentro
// do app não aparece (Seo.jsx do site devolve null quando noApp()).
const SO_DA_WEB = ['_headers', '_routes.json', 'robots.txt', 'sitemap.xml', 'og.jpg', 'exemplos'];
// Nada do app antigo pode entrar: nem endereço do motor, nem Supabase, nem RevenueCat, nem chave.
const PROIBIDO = /supabase|futty-api|\.run\.app|revenuecat|sb_publishable|eyJ[A-Za-z0-9_-]{20,}/i;
const LIMITE_LEVE = 5 * 1048576; // regra do "App leve" (CLAUDE.md)

const args = process.argv.slice(2);
const opcao = (nome) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : null; };
const soDoPacote = args.includes('--do-pacote');
const apiDaProva = opcao('--api');
const roboDaProva = opcao('--robo');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const rodar = (cmd, argumentos, cwd) => execFileSync(cmd, argumentos, { cwd, stdio: 'inherit', shell: cmd === npm && process.platform === 'win32', env: { ...process.env, CF_ANALYTICS_TOKEN: '' } });
const mb = (b) => `${(b / 1048576).toFixed(2)} MB`;

function arquivosDe(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? arquivosDe(join(dir, e.name)) : [join(dir, e.name)]));
}
const tamanho = (dir) => arquivosDe(dir).reduce((t, f) => t + statSync(f).size, 0);

function falhar(msg) {
  console.error(`[empacotar] ${msg}`);
  process.exit(1);
}

function construirSite() {
  if (!existsSync(join(SITE, '.git'))) falhar(`não achei o repositório do site em ${SITE} (SORTEIO_REPO muda o caminho).`);
  const git = (...a) => execFileSync('git', ['-C', SITE, ...a], { encoding: 'utf8' }).trim();
  const commit = git('rev-parse', 'main');
  console.log(`[empacotar] site: main ${commit.slice(0, 7)} (${git('log', '-1', '--format=%s', 'main').slice(0, 70)})`);

  const copia = mkdtempSync(join(tmpdir(), 'futty-sorteio-'));
  try {
    execFileSync('git', ['-C', SITE, 'archive', '--format=tar', '-o', join(copia, 'site.tar'), 'main']);
    // Caminho relativo: o tar do Git Bash lê "C:\..." como um host remoto.
    execFileSync('tar', ['-xf', 'site.tar'], { cwd: copia, stdio: 'inherit' });
    rmSync(join(copia, 'site.tar'));
    rodar(npm, ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], copia);
    rodar(npm, ['run', 'build'], copia);

    rmSync(PACOTE, { recursive: true, force: true });
    cpSync(join(copia, 'dist'), PACOTE, { recursive: true });
    for (const item of SO_DA_WEB) rmSync(join(PACOTE, item), { recursive: true, force: true });
    const conteudo = createHash('sha256');
    for (const f of arquivosDe(PACOTE).sort()) conteudo.update(relative(PACOTE, f).replaceAll('\\', '/')).update(readFileSync(f));
    writeFileSync(ORIGEM, `${JSON.stringify({ repositorio: 'futty-sorteio', ramo: 'main', commit, sha256: conteudo.digest('hex') }, null, 2)}\n`);
  } finally {
    rmSync(copia, { recursive: true, force: true });
  }
}

function montarDist() {
  if (!existsSync(ORIGEM)) falhar('sorteio-pacote/ não existe. Rode sem --do-pacote numa máquina que tenha o site.');
  rmSync(DIST, { recursive: true, force: true });
  cpSync(PACOTE, DIST, { recursive: true });
  rmSync(join(DIST, 'ORIGEM.json'));

  let ponte = readFileSync(PONTE, 'utf8');
  if (apiDaProva) {
    if (!ponte.includes(API_DA_LOJA)) falhar('a linha da API mudou na ponte; ajuste API_DA_LOJA.');
    ponte = ponte.replace(API_DA_LOJA, `var API = '${apiDaProva}';`);
  }
  writeFileSync(join(DIST, 'ponte-nativa.js'), ponte);

  // Classe antes de módulo: a ponte roda inteira antes de o site começar. No HTML do build o módulo vem no <head>.
  let etiquetas = '<script src="/ponte-nativa.js"></script>';
  if (roboDaProva) {
    cpSync(roboDaProva, join(DIST, 'robo-prova.js'));
    etiquetas += '<script src="/robo-prova.js"></script>';
  }
  for (const f of arquivosDe(DIST).filter((x) => x.endsWith('.html'))) {
    const html = readFileSync(f, 'utf8');
    if (!html.includes('<script type="module"')) falhar(`${relative(DIST, f)}: não achei o script do site para pôr a ponte antes.`);
    writeFileSync(f, html.replace('<script type="module"', `${etiquetas}<script type="module"`));
  }
}

function conferir() {
  const { commit, sha256 } = JSON.parse(readFileSync(ORIGEM, 'utf8'));
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  if (!html.includes('src="/ponte-nativa.js"')) falhar('index.html sem a ponte.');
  const camisas = existsSync(join(DIST, 'camisas')) ? readdirSync(join(DIST, 'camisas')).filter((n) => n.endsWith('.webp')) : [];
  if (camisas.length < 12) falhar(`só ${camisas.length} camisas no dist.`);
  for (const f of arquivosDe(DIST).filter((x) => /\.(js|css|html|json)$/.test(x) && !x.endsWith('robo-prova.js'))) {
    const achado = PROIBIDO.exec(readFileSync(f, 'utf8'));
    if (achado) falhar(`${relative(DIST, f)} contém "${achado[0]}": isso é do app antigo.`);
  }
  const total = tamanho(DIST);
  console.log(`[empacotar] dist pronto: ${mb(total)}, ${camisas.length} camisas, site ${commit.slice(0, 7)}, pacote ${sha256.slice(0, 12)}${apiDaProva || roboDaProva ? ' (DIST DE PROVA, não vai para a loja)' : ''}`);
  if (total > LIMITE_LEVE) console.warn(`[empacotar] aviso: o dist passou de ${mb(LIMITE_LEVE)}, o teto do "App leve".`);
}

mkdirSync(dirname(DIST), { recursive: true });
if (!soDoPacote) construirSite();
montarDist();
conferir();
