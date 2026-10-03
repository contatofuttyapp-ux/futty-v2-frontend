// Entra no app LOCAL com o Google, À MÃO, e guarda a sessão para o capturar-telas.mjs usar.
//
//   node scripts/entrar-google.mjs [--url http://localhost:5173] [--espera-min 60] [--saida <arquivo.json>]
//
// Abre o Chrome (ou o Edge) VISÍVEL, num perfil novo e descartável, já na tela de login do servidor local. A pessoa toca em "Entrar
// com Google" e entra. Este script não digita nada: só espera a sessão do Supabase aparecer no localStorage do app, salva o
// storageState (só a sessão) em scripts/capturas/telas-390.storage.json — pasta no .gitignore — e encerra sozinho, apagando o
// navegador e o perfil (que guarda o login do Google). Sem timeout curto: espera até --espera-min (padrão 60).
//
// Por que o Chrome é aberto sem o Playwright no comando: o Google recusa login em navegador lançado por automação. Aqui o Chrome sobe
// normal, só com a porta de depuração aberta; o Playwright se conecta depois, apenas para ler o localStorage.
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opcao = (nome, omissao) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : omissao;
};

const BASE = opcao('url', 'http://localhost:5173').replace(/\/+$/, '');
const ORIGEM = new URL(BASE).origin;
const SAIDA = opcao('saida', path.join(RAIZ, 'scripts', 'capturas', 'telas-390.storage.json'));
const ESPERA_MIN = Number(opcao('espera-min', '60')) || 60;
const SEM_JANELA = args.includes('--sem-janela'); // só para testar o próprio script sem abrir janela
const PORTA_FIXA = Number(opcao('porta', '0')) || 0;
const PRODUCAO = /(^|\.)run\.app$|(^|\.)futtyapp\.com\.br$|(^|\.)futty\.pages\.dev$/i;

const NAVEGADORES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const fatal = (msg) => { console.error(`\nERRO: ${msg}`); process.exit(2); };

if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(BASE).hostname)) {
  fatal(`--url ${BASE} não é local. O login de teste é só contra localhost (regra da casa, 25-set).`);
}

async function status(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(4000) })).status;
  } catch {
    return null;
  }
}

const portaLivre = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.on('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

function sessaoValida(valor) {
  try {
    const j = JSON.parse(valor);
    return !!(j.access_token && j.refresh_token && j.user);
  } catch {
    return false;
  }
}

async function procurarSessao(contexto) {
  for (const pagina of contexto.pages()) {
    let url;
    try { url = new URL(pagina.url()); } catch { continue; }
    if (PRODUCAO.test(url.hostname)) return { producao: url.host };
    if (url.origin !== ORIGEM) continue;
    const itens = await pagina.evaluate(() =>
      Object.keys(localStorage)
        .filter((k) => /^sb-.+-auth-token$/.test(k))
        .map((name) => ({ name, value: localStorage.getItem(name) })),
    ).catch(() => []);
    const boas = itens.filter((i) => sessaoValida(i.value));
    if (boas.length) return { itens: boas };
  }
  return null;
}

async function main() {
  if ((await status(BASE)) === null) fatal(`o frontend não responde em ${BASE}. Suba com: cd FUTTY-V2\\frontend ; npm run dev   (ou LIGAR-FUTTY.bat)`);
  const exe = NAVEGADORES.find((c) => c && fs.existsSync(c));
  if (!exe) fatal('não achei o Chrome nem o Edge instalados.');
  const porta = PORTA_FIXA || await portaLivre();
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'futty-login-'));

  let fechou = false;
  let browser = null;
  let limpo = false;
  const filho = spawn(exe, [
    `--remote-debugging-port=${porta}`,
    `--user-data-dir=${perfil}`,
    '--disable-blink-features=AutomationControlled',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=520,900',
    ...(SEM_JANELA ? ['--headless=new'] : []),
    `${BASE}/login`,
  ], { stdio: 'ignore' });
  filho.on('exit', () => { fechou = true; });
  filho.on('error', (e) => { fechou = true; console.error(`não consegui abrir ${exe}: ${e.message}`); });

  async function limpar() {
    if (limpo) return;
    limpo = true;
    try { await browser?.close(); } catch { /* já desconectado */ }
    if (!fechou) {
      try { execFileSync('taskkill', ['/PID', String(filho.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* já saiu */ }
    }
    for (let i = 0; i < 8; i++) {
      try { fs.rmSync(perfil, { recursive: true, force: true }); } catch { /* o Chrome ainda solta os arquivos */ }
      if (!fs.existsSync(perfil)) return;
      await espera(1000);
    }
    console.warn(`aviso: não consegui apagar ${perfil} (tem o login do Google deste navegador); apague essa pasta à mão.`);
  }
  process.on('SIGINT', async () => { await limpar(); process.exit(130); });

  try {
    for (let i = 0; i < 80 && (await status(`http://127.0.0.1:${porta}/json/version`)) !== 200; i++) {
      if (fechou) throw new Error('o navegador fechou antes de ficar pronto');
      await espera(500);
    }
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${porta}`);
    const contexto = browser.contexts()[0];
    if (!contexto) throw new Error('não achei a janela do navegador para acompanhar');

    console.log(`Abri ${path.basename(exe)} em ${BASE}/login. Entre com o Google nele; eu espero até ${ESPERA_MIN} min.`);
    const inicio = Date.now();
    let ultimoAviso = inicio;
    let achada = null;
    while (Date.now() - inicio < ESPERA_MIN * 60000) {
      if (fechou) throw new Error('a janela foi fechada antes de a sessão aparecer');
      const r = await procurarSessao(contexto).catch(() => null);
      if (r?.producao) {
        throw new Error(`o retorno do Google foi para ${r.producao} (produção), não para ${ORIGEM}: ${ORIGEM} não está nas Redirect URLs do Supabase (Authentication → URL Configuration). Não completo esse login.`);
      }
      if (r?.itens) { achada = r.itens; break; }
      if (Date.now() - ultimoAviso >= 60000) {
        console.log(`  ainda esperando… (${Math.round((Date.now() - inicio) / 60000)} min)`);
        ultimoAviso = Date.now();
      }
      await espera(1000);
    }
    if (!achada) throw new Error(`passaram ${ESPERA_MIN} min sem a sessão aparecer`);

    await espera(2500); // deixa o app terminar de gravar o token
    const itens = (await procurarSessao(contexto).catch(() => null))?.itens || achada;
    fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
    fs.writeFileSync(SAIDA, JSON.stringify({ cookies: [], origins: [{ origin: ORIGEM, localStorage: itens }] }, null, 2));
    const s = JSON.parse(itens[0].value);
    const minutos = Math.max(0, Math.round((s.expires_at * 1000 - Date.now()) / 60000));
    console.log(`\nSessão de ${s.user?.email || '(conta sem e-mail)'} salva em ${SAIDA}`);
    console.log(`(token válido por ~${minutos} min; o capturar-telas.mjs renova e regrava sozinho a cada execução)`);
  } finally {
    await limpar();
  }
}

main().then(() => process.exit(0), (erro) => {
  console.error(`\nERRO: ${erro.message}`);
  process.exit(1);
});
