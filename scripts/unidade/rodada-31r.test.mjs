// Rodada 31R — o convite não pode se perder na instalação. A página do convite deixa o link copiado ao mandar para a loja; o Início de quem
// não tem time tem onde colar ("Recebeu um convite?"). Aqui: a leitura do que foi colado (utils/linkColado.js) e as amarras nas telas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { conviteDoTextoColado, pareceConvite } from '../../src/utils/linkColado.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (p) => fs.readFileSync(`${RAIZ}${p}`, 'utf8');
const UUID = '372f8e0d-5618-460d-b0ad-548e84de9581';

test('o link curto, de qualquer jeito que chegue: com ou sem https e www, com o nome do time ou só o código, no meio da mensagem do grupo', () => {
  assert.equal(conviteDoTextoColado('https://futtyapp.com.br/c/missa-de-quinta-cqyvax9y'), 'cqyvax9y');
  assert.equal(conviteDoTextoColado('futtyapp.com.br/c/missa-de-quinta-cqyvax9y'), 'cqyvax9y');
  assert.equal(conviteDoTextoColado('https://www.futtyapp.com.br/c/CQYVAX9Y'), 'cqyvax9y');
  assert.equal(conviteDoTextoColado('  https://futtyapp.com.br/c/cqyvax9y  '), 'cqyvax9y');
  assert.equal(conviteDoTextoColado('Bora pro Missa de Quinta! Entra pelo link: https://futtyapp.com.br/c/missa-de-quinta-cqyvax9y.'), 'cqyvax9y');
  assert.equal(conviteDoTextoColado('https://futtyapp.com.br/c/missa-de-quinta-cqyvax9y?utm=zap'), 'cqyvax9y');
  // Nome de time com hífen e números: o código é o último pedaço.
  assert.equal(conviteDoTextoColado('https://futtyapp.com.br/c/missa-de-quinta-eq1dk-h7ne56sa'), 'h7ne56sa');
});

test('o link longo (/convite/<uuid>) e o código ou o uuid sozinhos', () => {
  assert.equal(conviteDoTextoColado(`https://futtyapp.com.br/convite/${UUID}`), UUID);
  assert.equal(conviteDoTextoColado(`futtyapp.com.br/convite/${UUID.toUpperCase()}`), UUID);
  assert.equal(conviteDoTextoColado('cqyvax9y'), 'cqyvax9y');
  assert.equal(conviteDoTextoColado(UUID), UUID);
});

test('o que não é convite do Futty não vira convite (o campo não se preenche sozinho com isso)', () => {
  for (const t of ['', '   ', null, undefined, 'oi', 'https://outrosite.com/c/missa-de-quinta-cqyvax9y', 'https://futtyapp.com.br/time/missa-de-quinta',
    'https://futtyapp.com.br/c/', 'https://futtyapp.com.br/convite/nao-e-uuid', 'senha123 do wifi', 'abc']) {
    assert.equal(conviteDoTextoColado(t), null, String(t));
    assert.equal(pareceConvite(t), false, String(t));
  }
  assert.equal(pareceConvite('https://futtyapp.com.br/c/cqyvax9y'), true);
});

test('Convite.jsx: "Baixar o Futty" copia o link do convite no próprio toque (endereço do site, não a origem do app) e diz isso', () => {
  const tela = ler('src/pages/Convite.jsx');
  assert.match(tela, /<a href=\{linkDaLojaComConvite\(lojaDoCelular, token\)\} className="btn cta-gold convite__cta" onClick=\{copiarLinkDoConvite\}>/);
  assert.match(tela, /navigator\.clipboard\.writeText\(`\$\{ORIGEM_DO_SITE\}\$\{pathname\}`\)/);
  assert.match(tela, /Link do convite copiado\. No app, é só colar no Início\./);
});

test('Início: o cartão "Recebeu um convite?" só no estado sem time, antes do Bem-vindo', () => {
  const inicio = ler('src/pages/Inicio.jsx');
  assert.match(inicio, /\) : noTeams \? \(\s*<>[\s\S]*?<CartaoConviteColado \/>\s*<EmptyState \/>\s*<\/>/);
  assert.equal(inicio.match(/<CartaoConviteColado/g).length, 1);
  const cartao = ler('src/components/CartaoConviteColado.jsx');
  assert.match(cartao, /Recebeu um convite\?/);
  assert.match(cartao, /Entrar no time/);
  // Ler sozinho só no app (no navegador o Chrome pediria permissão do nada); o "Colar" lê no toque.
  assert.match(cartao, /if \(!ehNativo\(\) \|\| !podeColar\) return undefined;/);
  assert.match(cartao, /apiFetch\(`\/api\/convite\/\$\{encodeURIComponent\(token\)\}\/aceitar`, \{ method: 'POST' \}\)/);
});
