// Futty v2.0 — O texto de src/styles/app.css como o build o vê: o app.css é uma lista de @import (as seções vivem em
// src/styles/app/) e aqui cada @import é trocado pelo arquivo, na mesma ordem. Os testes que leem regras do CSS leem daqui.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ESTILOS = fileURLToPath(new URL('../../src/styles/', import.meta.url));

export function lerAppCss() {
  const indice = fs.readFileSync(path.join(ESTILOS, 'app.css'), 'utf8');
  return indice.replace(/^@import '\.\/(app\/[^']+)';\r?$/gm, (_, rel) => fs.readFileSync(path.join(ESTILOS, rel), 'utf8'));
}
