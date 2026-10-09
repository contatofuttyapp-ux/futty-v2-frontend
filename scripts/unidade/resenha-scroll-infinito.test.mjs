// Futty v2.0 — Rodada 30E (item 4, aprovado pelo dono): a Resenha rola sem precisar tocar em "Ver mais
// antigos". Um sentinela de 1px no fim da lista chama o MESMO verMais() de sempre quando entra na tela
// (IntersectionObserver); nada muda no motor (a mesma página de 20, o mesmo cursor `proximo`). O botão
// continua existindo, só que como RESERVA: escondido enquanto o automático funciona, visível só se ele
// falhar — "Carregando…" enquanto o pedido está no ar, do jeito de sempre.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

test('30E-4 · o sentinela observa e chama o MESMO verMais() de sempre, sem recriar a busca', () => {
  const feed = ler('src/pages/Feed.jsx');
  assert.match(feed, /const sentinelaRef = useRef\(null\);/);
  assert.match(feed, /new IntersectionObserver\(\(entradas\) => \{\s*if \(entradas\[0\]\?\.isIntersecting\) verMais\(\);/);
  assert.match(feed, /<div ref=\{sentinelaRef\} aria-hidden="true" style=\{\{ height: 1 \}\} \/>/);
  // Nada muda no motor: a mesma função, a mesma rota com o mesmo cursor.
  assert.equal((feed.match(/async function verMais\(\)/g) || []).length, 1, 'uma função só — o sentinela não duplica a busca');
  assert.match(feed, /apiFetch\(`\/api\/feed\?limite=\$\{PAGINA_FEED\}&antes=\$\{encodeURIComponent\(proximo\)\}`\)/);
});

test('30E-4 · o botão "Ver mais antigos" é reserva: só aparece se o automático falhar', () => {
  const feed = ler('src/pages/Feed.jsx');
  assert.match(feed, /const \[erroCarregarMais, setErroCarregarMais\] = useState\(false\);/);
  // A falha do carregamento automático liga a reserva — e só ela, não o `erro` geral da página.
  assert.match(feed, /setErro\(err\.message \|\| 'Não deu para carregar mais\. Tente de novo\.'\);\s*setErroCarregarMais\(true\);/);
  // Tentar de novo (reserva) limpa o próprio erro antes de ir ao motor.
  assert.match(feed, /setErro\(''\);\s*setErroCarregarMais\(false\);/);
  assert.match(feed, /\) : erroCarregarMais \? \(\s*<button type="button" className="btn btn--purple-outline hud-corners"[\s\S]{0,80}onClick=\{verMais\}>\s*Ver mais antigos/);
});

test('30E-4 · enquanto carrega (automático ou pela reserva) mostra "Carregando…", com aria-live', () => {
  const feed = ler('src/pages/Feed.jsx');
  assert.match(feed, /\{carregandoMais \? \(\s*<p role="status" aria-live="polite" className="muted"[\s\S]{0,60}>Carregando…<\/p>/);
});

test('30E-4 · o efeito só observa enquanto há mais páginas e nenhuma falha pendente (para de martelar o motor sozinho depois de errar)', () => {
  const feed = ler('src/pages/Feed.jsx');
  assert.match(feed, /if \(!el \|\| !proximo \|\| erroCarregarMais \|\| typeof IntersectionObserver === 'undefined'\) return undefined;/);
  assert.match(feed, /\}, \[proximo, erroCarregarMais\]\);/);
});
