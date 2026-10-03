// Futty v2.0 — Rodada 29I (achado 103): as rotas em português de Portugal viraram PT-BR.
//
// O usuário via "equipa" na barra de endereço e NO LINK QUE COPIA PARA O GRUPO, numa interface que fala "time" em todo lugar. Agora: /time/<slug>,
// /criar-time, ?tab=time. As rotas antigas CONTINUAM valendo e redirecionam (link já enviado no WhatsApp não quebra) — o redirecionamento de
// verdade, no app, é provado no navegador (npm run provar:navegador, "Rotas"). Aqui: as contas, e a guarda de que nenhuma rota/texto PT-PT volta.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { caminhoNovoDeEquipa, abaDoAdmin } from '../../src/lib/rotasAntigas.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

test('caminhoNovoDeEquipa: /equipa/… vira /time/…, /criar-equipa vira /criar-time; o resto fica como está', () => {
  assert.equal(caminhoNovoDeEquipa('/equipa/missa-de-quinta-ogqq6'), '/time/missa-de-quinta-ogqq6');
  assert.equal(caminhoNovoDeEquipa('/equipa/missa/ranking'), '/time/missa/ranking');
  assert.equal(caminhoNovoDeEquipa('/equipa/missa/jogo/9f1c/sorteio'), '/time/missa/jogo/9f1c/sorteio');
  assert.equal(caminhoNovoDeEquipa('/equipa/missa/jogador/5b1c'), '/time/missa/jogador/5b1c');
  assert.equal(caminhoNovoDeEquipa('/equipa'), '/time');
  assert.equal(caminhoNovoDeEquipa('/equipa/'), '/time/');
  assert.equal(caminhoNovoDeEquipa('/criar-equipa'), '/criar-time');
  // o que não é o endereço antigo não se mexe
  assert.equal(caminhoNovoDeEquipa('/time/missa'), '/time/missa');
  assert.equal(caminhoNovoDeEquipa('/criar-time'), '/criar-time');
  assert.equal(caminhoNovoDeEquipa('/equipamento/x'), '/equipamento/x', '"/equipa" só vale como segmento inteiro');
  assert.equal(caminhoNovoDeEquipa('/admin/equipa'), '/admin/equipa');
  assert.equal(caminhoNovoDeEquipa('/convite/abc'), '/convite/abc');
  assert.equal(caminhoNovoDeEquipa(undefined), '');
});

test('abaDoAdmin: ?tab=equipa (o nome antigo) é a mesma aba que ?tab=time; sem aba, o dashboard', () => {
  assert.equal(abaDoAdmin('equipa'), 'time');
  assert.equal(abaDoAdmin('time'), 'time');
  assert.equal(abaDoAdmin('membros'), 'membros');
  assert.equal(abaDoAdmin(null), 'dashboard');
  assert.equal(abaDoAdmin(''), 'dashboard');
});

function arquivosDe(dir) {
  const saida = [];
  for (const nome of fs.readdirSync(dir)) {
    const caminho = path.join(dir, nome);
    if (fs.statSync(caminho).isDirectory()) saida.push(...arquivosDe(caminho));
    else if (/\.jsx?$/.test(nome)) saida.push(caminho);
  }
  return saida;
}

// Onde "/equipa" ainda aparece DE PROPÓSITO: o redirecionamento, os links já enviados, a telemetria que esconde o slug do endereço antigo.
const PERMITIDOS = new Set(['src/App.jsx', 'src/lib/rotasAntigas.js', 'src/lib/linkDoSite.js', 'src/lib/telemetria.js']);

test('nenhuma rota /equipa, /criar-equipa nem ?tab=equipa no app além do redirecionamento e dos endereços antigos que ainda chegam', () => {
  const achados = [];
  for (const arquivo of arquivosDe(path.join(RAIZ, 'src'))) {
    const rel = path.relative(RAIZ, arquivo).replaceAll('\\', '/');
    ler(rel).split('\n').forEach((linha, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(linha)) return; // comentário
      if (/\/api\/[a-z/]*equipas/.test(linha)) return; // o motor ainda tem /api/equipas/…: é caminho de API, nunca aparece na barra de endereço
      if (/(['"`]|\\)\/equipa(\b|\\)|\/criar-equipa|tab=equipa/.test(linha) && !PERMITIDOS.has(rel)) achados.push(`${rel}:${i + 1}: ${linha.trim().slice(0, 100)}`);
    });
  }
  assert.deepEqual(achados, [], `rota em PT-PT voltou:\n${achados.join('\n')}`);
});

test('as rotas do app são as novas: /time/:slug…, /criar-time (e as antigas redirecionam)', () => {
  const app = ler('src/App.jsx');
  for (const rota of ['/criar-time', '/time/:slug', '/time/:slug/jogos', '/time/:slug/ranking', '/time/:slug/campeonato', '/time/:slug/campeonato/:id', '/time/:slug/jogador/:userId', '/time/:slug/jogo/novo', '/time/:slug/jogo/:id/sorteio', '/time/:slug/jogo/:id']) {
    assert.ok(app.includes(`['${rota}',`), `falta a rota ${rota}`);
  }
  assert.ok(!/\['\/equipa/.test(app) && !/\['\/criar-equipa/.test(app), 'as rotas privadas não usam mais o endereço antigo');
  assert.match(app, /<Route path="\/equipa\/\*" element=\{<RedirecionaEquipa \/>\} \/>/, '/equipa/* redireciona');
  assert.match(app, /<Route path="\/equipa" element=\{<RedirecionaEquipa \/>\} \/>/, '/equipa redireciona');
  assert.match(app, /<Route path="\/criar-equipa" element=\{<Navigate to="\/criar-time" replace \/>\} \/>/, '/criar-equipa redireciona');
  assert.match(app, /caminhoNovoDeEquipa\(pathname\)\}\$\{search\}\$\{hash\}/, 'o redirecionamento leva a query e o #');
});

test('o painel do admin usa ?tab=time (e aceita o nome antigo)', () => {
  const painel = ler('src/pages/AdminPanel.jsx');
  assert.match(painel, /\{ k: 'time', icon: Settings, label: 'Time' \}/);
  assert.match(painel, /tab === 'time'/);
  assert.match(painel, /abaDoAdmin\(searchParams\.get\('tab'\)\)/);
});

test('o link universal: /time/ abre o app (iOS AASA, Android intent-filter, parser) e o /equipa/ antigo também', () => {
  const aasa = JSON.parse(ler('public/.well-known/apple-app-site-association'));
  const caminhos = aasa.applinks.details[0].components.map((c) => c['/']);
  assert.ok(caminhos.includes('/time/*'));
  assert.ok(caminhos.includes('/equipa/*'), 'link já enviado continua abrindo o app');
  const manifesto = ler('android/app/src/main/AndroidManifest.xml');
  assert.match(manifesto, /android:pathPrefix="\/time"/);
  assert.match(manifesto, /android:pathPrefix="\/equipa"/);
});

test('as telas navegam para /time (nenhum link interno com o endereço antigo)', () => {
  for (const arquivo of ['src/pages/Inicio.jsx', 'src/pages/Jogo.jsx', 'src/pages/Ranking.jsx', 'src/pages/Equipa.jsx', 'src/pages/Explorar.jsx', 'src/pages/MeuPerfil.jsx', 'src/components/BottomNav.jsx', 'src/components/Layout.jsx', 'src/components/RouteTitle.jsx']) {
    const texto = ler(arquivo);
    assert.doesNotMatch(texto, /['"`]\/equipa\//, `${arquivo} ainda manda para /equipa/`);
    assert.doesNotMatch(texto, /criar-equipa/, `${arquivo} ainda manda para /criar-equipa`);
  }
  assert.match(ler('src/components/BottomNav.jsx'), /\^\\\/time\\\/\(\[\^\/\]\+\)/);
  assert.match(ler('src/components/Layout.jsx'), /\^\\\/time\\\/\[\^\/\]\+\\\/jogo\\\//);
});
