// Futty v2.0 — Bancada do CANVAS da figurinha, no WebKit (FLUIDEZ 2, 16-set).
//
// A PERGUNTA: o relatório do build 20 (iPhone 15 Pro Max, instalação do zero)
// diz `/figurinha dados=8836 ms` e uma travada de 6402 ms na fase "outro" aos
// 82 s — o instante em que o cromo do Início compõe. "O canvas é lento" não é
// um dado: é preciso saber QUAL fase do canvas.
//
// Mede-se no WEBKIT (o motor do iPhone, e do WebView do app da loja) e não no
// Chrome, porque é exactamente aí que `ctx.filter` e `ctx.shadowBlur` caem em
// desenho por software. No Chrome estas fases custam quase nada e a medição não
// diria nada sobre o aparelho do Pedro.
//
// Corre contra o servidor de DESENVOLVIMENTO (vite), não contra o dist: assim a
// página pode `import('/src/utils/figurinhaCanvas.js')` e chamar cada função
// directamente, sem entrar login nenhum e sem acrescentar um grama ao pacote da
// loja. O que se mede é trabalho de RASTER (encher gradientes, desfocar, compor)
// — esse não muda entre dev e produção.
//
// Uso:
//   npx vite --port 5175          (noutra janela)
//   node scripts/medir-canvas.mjs
//   node scripts/medir-canvas.mjs --json depois.json --etiqueta depois
import { writeFileSync } from 'node:fs';
import { webkit } from 'playwright';

const args = process.argv.slice(2);
const opcao = (nome, omissao) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : omissao;
};

const BASE = opcao('url', 'http://localhost:5175');
const SAIDA = opcao('json', null);
const ETIQUETA = opcao('etiqueta', 'medição');
const VOLTAS = Number(opcao('voltas', '3'));

// O avatar de teste: um PNG 445×680 (o tamanho que a IA devolve, já com
// trim+extend) desenhado aqui mesmo, para a medição não depender da rede nem de
// nenhuma conta. O custo de DECODIFICAR é o que interessa e este tem o mesmo
// número de pixéis do real.
const AVATAR_FALSO = `
  const c = document.createElement('canvas');
  c.width = 445; c.height = 680;
  const x = c.getContext('2d');
  x.fillStyle = '#1b2433';
  x.beginPath(); x.moveTo(120, 680); x.lineTo(165, 300); x.lineTo(280, 300); x.lineTo(325, 680); x.closePath(); x.fill();
  x.fillStyle = '#e8c9a0';
  x.beginPath(); x.ellipse(222, 180, 95, 120, 0, 0, Math.PI * 2); x.fill();
  window.__avatarFalso = c.toDataURL('image/png');
`;

// Corre DENTRO da página: importa o módulo real e cronometra cada composição.
// Devolve as fases que o próprio módulo registou (window.__fasesCromo) mais o
// total medido de fora.
const MEDIR = async ({ voltas }) => {
  const mod = await import('/src/utils/figurinhaCanvas.js');
  // As fases saem da caixa-preta do app (lib/diagnostico), não de um atalho da
  // bancada: assim o que se mede é exactamente o que o Diagnóstico mostra ao
  // Pedro no aparelho.
  const diag = await import('/src/lib/diagnostico.js');
  const jogador = { id: 'bancada', nome_jogador: 'CHAVO, EL MATADOR', avatar_url: window.__avatarFalso };

  // Espera as fontes: medir a Rajdhani a carregar seria medir a rede.
  if (document.fonts?.ready) { try { await document.fonts.ready; } catch { /* segue */ } }

  // O nome de cada cenário é a MESMA chave que o lib/diagnostico regista
  // (`cromo|figurinha/<fundo>`), senão a bancada mede um e lê outro.
  // `fotoOverride` e não `jogador.avatar_url`: o segundo passa pelo urlAsset/
  // urlImagem, que o reescreve para o proxy /api/media — com um data: URL isso
  // falha a carregar e o card sai com as INICIAIS, não com o avatar. A medição
  // ficava a dizer que descodificar o avatar era barato porque não acontecia.
  const quadrado = (fundo) => ({ nome: `cromo/${fundo}`, opts: { jogador, fotoOverride: window.__avatarFalso, fundo, corFrame: 'dourado', avatarZoom: 1.1, formato: 'quadrado', fundoGlints: 'discreto' } });
  const card = (fundo) => ({ nome: `figurinha/${fundo}`, opts: { jogador, fotoOverride: window.__avatarFalso, fundo, corFrame: 'dourado' } });
  const cenarios = [
    // O cromo do Início: quadrado 600×600, glints discretos. 'gradiente' é o Épico.
    quadrado('estadio'), quadrado('gradiente'), quadrado('golden'), quadrado('aura'),
    // A figurinha do download: card 2:3 completo.
    card('estadio'), card('gradiente'), card('aura'), card('royal'), card('preto'),
  ];

  // A prova de que a tela não trava não pode sair das marcas de fase: o WebKit
  // adia a rasterização, por isso uma fase pode marcar 1 ms e a conta cair na
  // seguinte. Quem não se engana é o RELÓGIO DOS QUADROS — se um quadro demorou
  // 400 ms, a tela esteve 400 ms parada, seja lá qual for a fase que a segurou.
  // É a mesma leitura que o medidor de travadas do app faz no aparelho.
  const vigiarQuadros = () => {
    let maior = 0;
    let anterior = performance.now();
    let vivo = true;
    const laco = (agora) => {
      if (!vivo) return;
      maior = Math.max(maior, agora - anterior);
      anterior = agora;
      requestAnimationFrame(laco);
    };
    requestAnimationFrame(laco);
    return () => { vivo = false; return Math.round(maior); };
  };

  const saida = [];
  for (const c of cenarios) {
    const totais = [];
    const travadas = [];
    for (let v = 0; v < voltas; v += 1) {
      const parar = vigiarQuadros();
      const t0 = performance.now();
      await mod.gerarFigurinhaCanvas(c.opts);
      totais.push(performance.now() - t0);
      travadas.push(parar());
    }
    // O diagnóstico guarda a PIOR composição de cada cenário — é a que dói, com
    // os caches frios, e é a que interessa aqui.
    const reg = diag.lerFasesCromo()[c.nome] || null;
    const fases = reg ? reg.fases : [];
    // O que TRAVA a tela é o desenho síncrono. O `toBlob` é assíncrono (o WebKit
    // codifica o PNG fora da thread principal), por isso conta à parte: somá-lo
    // ao resto esconderia exactamente o número que interessa.
    const desenho = fases.filter((f) => f.fase !== 'toBlob');
    const piorDesenho = desenho.length ? desenho.reduce((a, f) => (f.ms > a.ms ? f : a)) : null;
    totais.sort((a, b) => a - b);
    saida.push({
      cenario: c.nome,
      // Mediana: uma volta azarada (recolha de lixo) não pode mandar no número.
      totalMs: Math.round(totais[Math.floor(totais.length / 2)]),
      desenhoMs: Math.round(desenho.reduce((a, f) => a + f.ms, 0)),
      toBlobMs: Math.round(fases.find((f) => f.fase === 'toBlob')?.ms ?? 0),
      // A 1ª volta é a FRIA (caches vazios) — é a que dói e a que tem de passar.
      travadaFriaMs: travadas[0],
      travadaPiorMs: Math.max(...travadas),
      piorFatiaMs: piorDesenho ? Math.round(piorDesenho.ms) : null,
      piorFase: piorDesenho ? piorDesenho.fase : null,
      fases,
    });
  }

  // O caminho das 3 CAMADAS (o preview do studio da /figurinha): três cards
  // construídos em paralelo. É o que o relatório apanhou com 8836 ms.
  const tCam = performance.now();
  await mod.gerarCamadasFigurinha({ jogador, fotoOverride: window.__avatarFalso, fundo: 'estadio', corFrame: 'dourado' });
  const camadasMs = Math.round(performance.now() - tCam);

  // O `toBlob` é a conta maior de TODOS os cenários. Vale saber quanto custa por
  // formato e por tamanho, para decidir a que resolução o cromo deve ser gerado.
  const codificar = async (lado, tipo) => {
    const c = document.createElement('canvas');
    c.width = lado; c.height = lado;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, lado, lado);
    g.addColorStop(0, '#2b3a55'); g.addColorStop(1, '#8b5cf6');
    x.fillStyle = g; x.fillRect(0, 0, lado, lado);
    const t = [];
    let real = tipo;
    for (let i = 0; i < 3; i += 1) {
      const t0 = performance.now();
      const b = await new Promise((r) => c.toBlob(r, tipo));
      t.push(performance.now() - t0);
      real = b?.type || '?';
    }
    t.sort((a, b) => a - b);
    return { lado, tipo, real, ms: Math.round(t[1]) };
  };
  const blobs = [];
  for (const lado of [600, 420, 300]) {
    for (const tipo of ['image/png', 'image/webp']) blobs.push(await codificar(lado, tipo));
  }

  return { cenarios: saida, camadasMs, blobs };
};

async function medir() {
  const navegador = await webkit.launch({ headless: true });
  // Viewport e DPR do iPhone 15 Pro Max — é o aparelho do relatório.
  const contexto = await navegador.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    // Memória: com o service worker vivo o Playwright não intercepta e o teste
    // podia tocar em produção. Aqui não se escreve nada, mas fica bloqueado na
    // mesma — é a regra da casa.
    serviceWorkers: 'block',
  });
  const pagina = await contexto.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));

  await pagina.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await pagina.evaluate(AVATAR_FALSO);
  const resultado = await pagina.evaluate(MEDIR, { voltas: VOLTAS });

  await navegador.close();
  if (erros.length) console.error('Erros na página:', erros.slice(0, 3));
  return resultado;
}

medir()
  .then(({ cenarios, camadasMs, blobs }) => {
    console.log(`\n=== CANVAS DA FIGURINHA no WEBKIT (${ETIQUETA}) ===`);
    console.log('(iPhone 15 Pro Max: 430×932 @ 3x. Mediana de', VOLTAS, 'voltas.)\n');
    console.log('(TRAVADA = maior quadro parado durante a composição. É a prova que conta.)\n');
    console.log('cenário               total   TRAVADA fria   TRAVADA pior');
    for (const c of cenarios) {
      console.log(
        `${c.cenario.padEnd(20)} ${String(c.totalMs).padStart(5)}ms ` +
        `${String(c.travadaFriaMs).padStart(11)}ms ${String(c.travadaPiorMs).padStart(13)}ms`
      );
    }
    console.log(`\n3 camadas (preview da /figurinha): ${camadasMs}ms`);
    console.log('\n--- custo do toBlob por tamanho e formato ---');
    for (const b of blobs || []) console.log(`  ${String(b.lado).padStart(4)}px ${b.tipo.padEnd(11)} → ${String(b.ms).padStart(4)}ms  (saiu ${b.real})`);

    for (const c of cenarios) {
      if (!c.fases.length) continue;
      console.log(`\n--- fases de ${c.cenario} (1ª volta, por custo) ---`);
      for (const f of [...c.fases].sort((a, b) => b.ms - a.ms)) {
        console.log(`  ${String(f.ms).padStart(5)}ms  ${f.fase}`);
      }
      console.log(`  ${String(c.fases.reduce((a, f) => a + f.ms, 0)).padStart(5)}ms  SOMA`);
    }
    console.log('');

    if (SAIDA) {
      writeFileSync(SAIDA, JSON.stringify({ etiqueta: ETIQUETA, cenarios, camadasMs }, null, 2));
      console.log(`(gravado em ${SAIDA})\n`);
    }
  })
  .catch((e) => {
    console.error('Falhou:', e.message);
    process.exit(1);
  });
