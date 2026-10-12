// Futty v2.0 — Rodada 31A: "Associar jogador" (o convidado sem app de um jogo vira a conta de um membro do time). As contas e os textos puros
// de src/utils/associarJogador.js e as ligações da tela (o botão só para o admin, a janela, o aviso com o Desfazer). A regra em si é do motor
// (backend/tests/associar-jogador.test.js); o comportamento visual, a 390 e 360 px, está em scripts/provas/rodada-31a.prova.mjs.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  JANELA_DESFAZER_MS, associacoesDesfaziveis, fraseDaAssociacao, fraseDaConfirmacao, fraseDoDesfazer, fraseDoFeito, TEXTO_BOTAO_ASSOCIAR,
} from '../../src/utils/associarJogador.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

const AGORA = Date.parse('2026-10-14T12:00:00.000Z');
const ha = (horas) => new Date(AGORA - horas * 3600 * 1000).toISOString();
const assoc = (user_id, nome, convidado, horas, extra = {}) => ({ user_id, nome, convidado: { nome: convidado }, em: ha(horas), ...extra });

test('31A · o botão se chama "Associar jogador" e a confirmação diz o que entra na conta', () => {
  assert.equal(TEXTO_BOTAO_ASSOCIAR, 'Associar jogador');
  assert.equal(
    fraseDaConfirmacao('Beto', 'Betão'),
    'O Beto deste jogo passa a ser Betão. Gols, presença e títulos deste jogo entram na conta dele.',
  );
  assert.equal(fraseDoFeito('Beto', 'Betão'), 'Pronto: o Beto deste jogo agora é Betão.');
});

test('31A · o aviso do Desfazer só lista as associações de menos de 24 h e ainda não desfeitas, a mais nova primeiro', () => {
  const tr = {
    registro: {
      associacoes: [
        assoc('u1', 'Betão', 'Beto', 30), // passou do prazo
        assoc('u2', 'Caião', 'Caio', 5),
        assoc('u3', 'Zeca', 'Zequinha', 2, { desfeita_em: ha(1) }), // já desfeita
        assoc('u4', 'Dani', 'Daniel', 1),
        { user_id: 'u5', nome: 'Lixo', convidado: { nome: 'X' }, em: 'não é data' },
      ],
    },
  };
  assert.deepEqual(associacoesDesfaziveis(tr, AGORA).map((a) => a.user_id), ['u4', 'u2']);
  // no limite exato das 24 h ainda vale (a mesma conta do motor: <=)
  assert.equal(associacoesDesfaziveis({ registro: { associacoes: [assoc('u1', 'A', 'B', 24)] } }, AGORA).length, 1);
  assert.equal(JANELA_DESFAZER_MS, 24 * 3600 * 1000);
});

test('31A · sem registro, sem lista ou sem resultado: nenhum aviso (e nada quebra)', () => {
  assert.deepEqual(associacoesDesfaziveis(null, AGORA), []);
  assert.deepEqual(associacoesDesfaziveis({}, AGORA), []);
  assert.deepEqual(associacoesDesfaziveis({ registro: {} }, AGORA), []);
  assert.deepEqual(associacoesDesfaziveis({ registro: { associacoes: 'x' } }, AGORA), []);
});

test('31A · as frases do aviso e do Desfazer falam do convidado pelo nome', () => {
  const a = { user_id: 'u1', nome: 'Betão', convidado_nome: 'Beto', em: ha(1) };
  assert.equal(fraseDaAssociacao(a), 'Betão ocupa a vaga do Beto neste jogo.');
  assert.equal(fraseDoDesfazer(a), 'Desfazer? O Beto volta a ser convidado, com os gols e a presença de antes.');
});

test('31A · o botão só existe para o admin: DrawnTeams só o desenha com aoAssociar, e só para convidado sem conta', () => {
  const fonte = ler('src/components/DrawnTeams.jsx');
  // a condição do botão: tem o gancho do admin, é convidado e não tem conta
  assert.match(fonte, /const podeAssociar = !!aoAssociar && !!jogador\?\.convidado && !jogador\?\.user_id;/);
  // a página pública do sorteio não passa o gancho: ninguém de fora associa nada
  assert.ok(!/aoAssociar/.test(ler('src/pages/SorteioPublico.jsx')));
  // na tela do jogo o gancho só vai para o admin (e o aviso do Desfazer também)
  const jogo = ler('src/pages/Jogo.jsx');
  assert.match(jogo, /aoAssociar=\{isAdmin \? setAssociando : undefined\}/);
  assert.match(jogo, /\{isAdmin \? \(\s+<AssociacoesRecentes/);
});

test('31A · as chamadas da tela são as do motor: a lista, o associar e o desfazer', () => {
  const janela = ler('src/components/AssociarJogador.jsx');
  assert.ok(janela.includes('`/api/games/${gameId}/associar-jogador`'));
  assert.ok(janela.includes('`/api/games/${gameId}/associar-jogador/desfazer`'));
  assert.match(janela, /convidado_nome: convidado\.nome, user_id: escolhido\.user_id/);
  // quem não pode ser escolhido fica desabilitado, com o motivo que o motor mandou
  assert.match(janela, /disabled=\{!m\.disponivel\}/);
  assert.match(janela, /data-motivo/);
});

test('31A · o editor do resultado é refeito quando o elenco muda (o convidado que ganhou conta não pode ficar como convidado nos gols)', () => {
  const jogo = ler('src/pages/Jogo.jsx');
  assert.ok(jogo.includes("jogadoresResultado.map((j) => j.user_id || j.nome).join(',')"));
});
