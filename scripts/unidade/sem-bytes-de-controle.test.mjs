// Futty v2.0 — nenhum byte de controle no código do app (o mesmo guarda do motor: backend/tests/sem-bytes-de-controle.test.js).
//
// Código editado pelo terminal (heredoc, `node -e`) perde as barras invertidas: o `\b` de uma regex vira o byte 0x08, que o editor não
// mostra, e a regex deixa de casar sem erro nenhum. No motor isso deixou a Resenha lendo todo time no fuso de São Paulo por onze dias.
// Este teste varre o código do app e reprova qualquer byte de controle que não seja tab, LF ou CR — apontando arquivo e linha.
// Ficam de fora as dependências, o build (dist/) e os projetos nativos (android/, ios/), que levam cópias do build.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const PASTAS_DE_FORA = new Set(['node_modules', '.git', 'dist', 'android', 'ios', 'coverage']);
const EXTENSOES = /\.(c|m)?jsx?$|\.tsx?$|\.json$|\.css$|\.html$/;
const CONTROLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

function arquivosDoCodigo(pasta) {
  const lista = [];
  for (const e of fs.readdirSync(pasta, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!PASTAS_DE_FORA.has(e.name)) lista.push(...arquivosDoCodigo(path.join(pasta, e.name)));
    } else if (EXTENSOES.test(e.name)) {
      lista.push(path.join(pasta, e.name));
    }
  }
  return lista;
}

test('o código do app não tem byte de controle (o \\b de uma regex que virou 0x08, por exemplo)', () => {
  const arquivos = arquivosDoCodigo(RAIZ);
  assert.ok(arquivos.some((a) => a.endsWith(path.join('src', 'pages', 'Convite.jsx'))), 'a varredura chega às telas');
  const achados = [];
  for (const arquivo of arquivos) {
    const texto = fs.readFileSync(arquivo, 'utf8');
    if (!CONTROLE.test(texto)) continue;
    texto.split('\n').forEach((linha, i) => {
      const m = CONTROLE.exec(linha.replace(/\r$/, ''));
      if (m) achados.push(`${path.relative(RAIZ, arquivo)}:${i + 1} (byte 0x${m[0].charCodeAt(0).toString(16).padStart(2, '0')})`);
    });
  }
  assert.deepEqual(achados, [], `byte de controle no código — reescreva a linha pelo editor, não pelo terminal:\n${achados.join('\n')}`);
});
