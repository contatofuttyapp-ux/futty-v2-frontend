// Rodada 31P — confete e rodada de cerveja (decisões do dono): sem confete na figurinha pronta nem no compartilhar/baixar; a rodada de cerveja
// sai de todas as telas e deixa de ser enviada pelo app (as colunas ficam no banco e o motor não muda); o confete do Ranking (top 3) e o da
// tela de celebração do campeonato ficam.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESULTADO_VAZIO, corpoDosPremios, estadoDoJogo, temPremio } from '../../src/utils/resultadoDoJogo.js';
import { resultadoDoPassado } from '../../src/utils/jogoPassado.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
function arquivosDe(pasta) {
  return fs.readdirSync(path.join(RAIZ, pasta), { withFileTypes: true }).flatMap((e) => {
    const rel = `${pasta}/${e.name}`;
    if (e.isDirectory()) return arquivosDe(rel);
    return /\.(jsx?|mjs)$/.test(e.name) ? [rel] : [];
  });
}

test('a Figurinha não solta confete (nem na figurinha pronta, nem no compartilhar/baixar)', () => {
  const fig = ler('src/pages/Figurinha.jsx');
  assert.doesNotMatch(fig, /useConfetti|celebrar[A-Z]/);
});

test('useConfetti só guarda o que ainda tem uso: o top 3 (Ranking e o campeonato terminado do Início)', () => {
  const exportados = [...ler('src/hooks/useConfetti.js').matchAll(/export (?:async )?function (\w+)/g)].map((m) => m[1]);
  assert.deepEqual(exportados, ['celebrarTop3']);
  assert.match(ler('src/pages/Ranking.jsx'), /celebrarTop3\(eu\.posicao\)/, 'o confete do Ranking fica');
  assert.match(ler('src/components/CampeonatoVistas.jsx'), /Chuva de confete da celebração/, 'a celebração do campeonato fica');
});

test('o Início celebra o campeonato terminado pela régua do aparelho, não por um ref que morre a cada montagem', () => {
  const inicio = ler('src/pages/Inicio.jsx');
  assert.doesNotMatch(inicio, /celebrouCamp/);
  assert.match(inicio, /if \(!deveCelebrarCampeonato\(campeonato, userIdDoConfete\)\) return;\s*guardarCampeonatoCelebrado\(userIdDoConfete, campeonato\.id\);\s*celebrarTop3\(1\);/);
});

test('nenhuma tela fala de rodada de cerveja nem lê/manda rodada_user_id ou rodada_foto_url', () => {
  for (const arq of arquivosDe('src')) {
    const t = ler(arq);
    assert.doesNotMatch(t, /rodada_(user_id|foto_url|nome|avatar_url)|foi_rodada|temRodada|rodadaId|rodadaFoto|celebrarCerveja/, arq);
    assert.doesNotMatch(t, /cerveja/i, arq);
  }
});

test('o corpo dos prêmios nunca leva rodada — nem editando um jogo antigo que tem rodada gravada', () => {
  const antigo = { campeao_time_index: 0, time_vencedor: 'A', rodada_user_id: 'U9', rodada_foto_url: 'https://x/r.webp', artilheiro_user_id: 'U2', artilheiro_gols: 1 };
  const estado = estadoDoJogo(antigo, []);
  const corpo = corpoDosPremios(estado);
  assert.ok(!Object.keys(corpo).some((k) => k.startsWith('rodada')), JSON.stringify(corpo));
  assert.ok(!Object.keys(corpoDosPremios(estado, { soPreenchidos: true })).some((k) => k.startsWith('rodada')));
  assert.ok(!Object.keys(RESULTADO_VAZIO).some((k) => /rodada/i.test(k)));
  // Quem pagou a rodada não é mais prêmio: um corpo só com ela (de um app velho) não faz o pedido sair.
  assert.equal(temPremio({ rodada_user_id: 'U9' }), false);
  const passado = resultadoDoPassado({ nTimes: 2, usaTimes: true, estado: { ...RESULTADO_VAZIO, temArt: true, artId: 'U2' }, jogadores: [] });
  assert.ok(passado.feed && !Object.keys(passado.feed).some((k) => k.startsWith('rodada')));
});
