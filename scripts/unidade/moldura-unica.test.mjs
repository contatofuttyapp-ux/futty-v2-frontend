// Futty v2.0 — Rodada 29H-B (itens 54 e 55): o enquadramento único e a lei do espelho. Puro: sem navegador, sem rede.
//
//   · recorteDaMolduraUnica: o quadrado tracejado é o quadrado do TOPO do 2:3, da largura do card — a mesma janela que o motor corta
//     sem recorte (recortePadrao), em qualquer resolução que o CropModal devolva;
//   · a miniatura ao vivo (estiloDaJanela com esse recorte): o arquivo 2:3 inteiro, 150% de altura, encostado no topo;
//   · NUNCA ESPELHAR (regra do dono): nenhum arquivo do app vira uma imagem (scaleX(-1), scale(-1, …), rotateY(180deg), flip) e a
//     normalização da foto honra a orientação da câmera ('from-image', como foi tirada).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { estiloDaJanela, janelaDoRecorte, recorteDaMolduraUnica, recortePadrao } from '../../src/lib/enquadroAvatar.js';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');

test('o quadrado tracejado = o quadrado do topo do 2:3 (a mesma janela que o motor corta sem recorte)', () => {
  for (const [w, h] of [[400, 600], [1067, 1600], [2, 3], [1066, 1599]]) {
    assert.deepEqual(recorteDaMolduraUnica(w, h), recortePadrao(w, h), `${w}×${h}`);
    const j = janelaDoRecorte(w, h, recorteDaMolduraUnica(w, h));
    assert.equal(j.left, 0, `${w}×${h}: encostado à esquerda`);
    assert.equal(j.top, 0, `${w}×${h}: encostado ao topo`);
    assert.equal(j.lado, Math.min(w, h), `${w}×${h}: da largura do card`);
  }
  assert.deepEqual(recorteDaMolduraUnica(400, 600), { x: 0.5, y: 0.333, escala: 1 });
});

test('a miniatura ao vivo: o 2:3 inteiro a 150% de altura, encostado no topo (o que a moldura do onboarding e o cropper mostram)', () => {
  const estilo = estiloDaJanela(2, 3, recorteDaMolduraUnica(2, 3));
  assert.equal(estilo.width, '100%');
  assert.equal(estilo.height, '150%');
  assert.equal(estilo.left, '0%');
  assert.equal(estilo.top, '0%');
});

function arquivosDe(dir) {
  const saida = [];
  for (const nome of readdirSync(dir)) {
    const p = path.join(dir, nome);
    if (statSync(p).isDirectory()) saida.push(...arquivosDe(p));
    else if (/\.(jsx?|css)$/.test(nome)) saida.push(p);
  }
  return saida;
}

test('lei do espelho (item 54): nenhum arquivo do app vira uma imagem — nem no CSS, nem no canvas, nem por EXIF', () => {
  const proibidos = [/scaleX\(\s*-1/i, /scale\(\s*-1\s*,/i, /rotateY\(\s*180/i, /imageOrientation\s*:\s*['"]flip/i, /\.flip\b|flipHorizontal|espelhar\(/i, /\bscale\(-1\)/];
  // Fora da conta: comentários (/* */ e //) e o giro da ESTRELA do ranking na barra de baixo (@keyframes starFlipY — um ícone SVG,
  // não uma foto). Tudo o mais que vire uma imagem é culpado.
  const semComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
  const semIcones = (t) => t.replace(/@keyframes\s+starFlipY\s*\{[^}]*\}[^}]*\}/g, '');
  const culpados = [];
  for (const arquivo of arquivosDe(SRC)) {
    const texto = semIcones(semComentarios(readFileSync(arquivo, 'utf8')));
    for (const re of proibidos) if (re.test(texto)) culpados.push(`${path.relative(SRC, arquivo)}: ${re}`);
  }
  assert.deepEqual(culpados, [], 'o app nunca espelha uma foto');
  const normalizar = readFileSync(path.join(SRC, 'utils', 'normalizarFoto.js'), 'utf8');
  assert.match(normalizar, /imageOrientation:\s*'from-image'/, 'a orientação da câmera é honrada: a foto aparece como foi tirada');
  const cropper = readFileSync(path.join(SRC, 'components', 'CropModal.jsx'), 'utf8');
  assert.match(cropper, /ctx\.drawImage\(img, area\.x, area\.y, area\.width, area\.height, 0, 0, w, h\)/, 'o recorte só desloca e escala');
});
