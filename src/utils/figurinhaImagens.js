// Futty v2.0 — A infraestrutura do desenho da figurinha: o cronômetro de fases, as imagens decodificadas UMA vez por sessão,
// o canvas auxiliar e o canvas → PNG. Usada pelos fundos (figurinhaFundos.js) e pelo card (figurinhaCanvas.js).

// ─── Cronómetro de fases ─────────────────────────────────────────────────
// Cada composição diz quanto custou cada passo. Sem isto, "o canvas leva 8,8 s"
// não aponta para conserto nenhum. Os números vão para a caixa-preta (lib/diagnostico)
// e aparecem na tela de Diagnóstico como "cromo: fases".
function cronometro() {
  let t = performance.now();
  const fases = [];
  return {
    fases,
    marca(fase) {
      const agora = performance.now();
      fases.push({ fase, ms: agora - t });
      t = agora;
    },
    // Um número medido POR DENTRO de uma fase (a maior fatia de um laço, por
    // exemplo). Não mexe no relógio: não é tempo que passou a mais, é tempo que
    // já está contado noutra fase, visto com mais pormenor.
    anotar(fase, ms) {
      fases.push({ fase, ms, detalhe: true });
    },
  };
}

// ─── Imagens decodificadas UMA vez por sessão (FLUIDEZ 2) ────────────────────
// Medido no WebKit: descodificar o avatar custa 78 ms e o stadium_bg 35 ms — e
// acontecia A CADA composição. O preview de 3 camadas da /figurinha constrói
// três cards em paralelo e descodificava o MESMO fundo três vezes.
//
// O cache guarda a PROMESSA, não a imagem: dois pedidos simultâneos do mesmo
// ficheiro (exactamente o caso das 3 camadas) partilham uma descodificação em
// vez de dispararem três. Morre com a aba, como deve.
const imagensEmCache = new Map();

function carregarImagem(src, crossOrigin) {
  if (!src) return Promise.resolve(null);
  const chave = `${crossOrigin ? 'x|' : '-|'}${src}`;
  const guardada = imagensEmCache.get(chave);
  if (guardada) return guardada;
  const promessa = new Promise((resolve) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (img.naturalWidth <= 0) return resolve(null);
      // decode() tira a descodificação do quadro em que a imagem é DESENHADA:
      // sem isto o primeiro drawImage paga-a inteira, dentro do desenho.
      if (typeof img.decode !== 'function') return resolve(img);
      img.decode().then(() => resolve(img), () => resolve(img));
    };
    img.onerror = () => {
      // Falha não fica em cache: uma imagem que falhou por rede tem de poder ser
      // tentada de novo na composição seguinte.
      imagensEmCache.delete(chave);
      resolve(null);
    };
    img.src = src;
  });
  imagensEmCache.set(chave, promessa);
  return promessa;
}

/** Canvas em memória do tamanho pedido. */
function canvasAuxiliar(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// ─── O que É caro no WebKit, medido (FLUIDEZ 2) ──────────────────────────────
// A primeira suspeita era o `ctx.filter = blur(...)`. Medido em micro-bancada,
// com a rasterização FORÇADA (`getImageData` a seguir a cada operação, senão o
// WebKit adia tudo e o cronómetro marca zero), é o contrário do que se pensava:
//
//   blur(1.2px) sobre 500×750 ............  1 ms
//   blur(56px)  sobre 364×439 ............  0 ms
//   drawImage ampliado 2× com suavização .. 22 ms
//   drawImage 1:1 .........................  1 ms
//
// O desfoque é acelerado; ampliar é que custa. O que custava os 725 ms que a
// fase `epico:blur` mostrava era o LAÇO DOS HEXÁGONOS — milhares de `stroke()`
// que o WebKit só rasteriza quando alguém lhe pede os pixéis, e a conta caía no
// primeiro passo que os pedia. Daí a fase cara mudar de sítio conforme o fundo.
//
// Conclusão que manda no resto deste ficheiro: o conserto não é tirar desfoques
// (isso mudava o desenho e não poupava nada) — é NÃO REFAZER trabalho. O padrão
// do Épico e o glow do Aura ficam em cache, as imagens descodificam uma vez, e o
// laço dos hexágonos respira entre linhas para não segurar a tela.

function canvasParaBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

export { canvasAuxiliar, canvasParaBlob, carregarImagem, cronometro };
