// Futty v2.0 — o motor FALSO da prova da Rodada 32G (scripts/provas/rodada-32g.prova.mjs): o motor de VERDADE (server.js, todas as rotas) por cima de
// um banco, um Storage e um Auth de MENTIRA, em memória (backend/tests/_appFalsa.js). O .env do backend aponta para o único banco (o de produção):
// aqui ele nunca é lido, a rede de fora está fechada e o servidor só escuta em 127.0.0.1.
//
// Duas coisas a mais que os outros motores falsos:
//   · um RELÓGIO que a prova move ("relogio <iso>\n"): o Date do processo anda junto, então o mês da mensalidade (o do relógio do time), o
//     "mês fechado" e a hora do lembrete do vencimento seguem o relógio da prova, sem mexer no código do motor;
//   · os PUSH não saem (não há VAPID): o enviarNotificacao é trocado por um gravador, e "estado\n" devolve tudo o que teria saído.
//
// O mundo: a Missa de Quinta (nasceu em junho) com o Chavo (admin), a Bia (admin), a Ana, o Beto (desligou os avisos de jogos), o Caio e o
// Duda; e a Várzea do Chavo, sem jogo nenhum (o "Traga seu histórico" no ranking e na Resenha vazios).
'use strict';

// O relógio vem ANTES de qualquer módulo do motor: todo `new Date()` e `Date.now()` dali para frente passa por aqui.
const DateReal = Date;
let deslocamento = 0;
class DateDaProva extends DateReal {
  constructor(...a) {
    if (a.length === 0) super(DateReal.now() + deslocamento);
    else super(...a);
  }
  static now() { return DateReal.now() + deslocamento; }
}
global.Date = DateDaProva;
const moverRelogio = (iso) => { deslocamento = new DateReal(iso).getTime() - DateReal.now(); };
moverRelogio(process.env.R32G_RELOGIO || '2026-10-20T15:00:00-03:00');

const path = require('node:path');

const TESTES_DO_MOTOR = path.resolve(__dirname, '..', '..', '..', 'backend', 'tests');
const { subirApp, usuario } = require(path.join(TESTES_DO_MOTOR, '_appFalsa.js'));
const { uuid } = require(path.join(TESTES_DO_MOTOR, '_mundoDeSeguranca.js'));

const fala = (...a) => process.stderr.write(`${a.join(' ')}\n`);

(async () => {
  const app = await subirApp();
  process.env.INTERNO_SEGREDO = 'segredo-da-prova-32g'; // a rota do agendador (sem Cloud Tasks configurado, basta o segredo)
  const pushes = [];
  require(path.join(TESTES_DO_MOTOR, '..', 'routes', 'push.js')).enviarNotificacao = async (ids, payload, opcoes = {}) => {
    pushes.push({ ids: [...ids], titulo: payload.title, corpo: payload.body, url: payload.url, categoria: opcoes.categoria || null });
  };
  const N = 532;
  const PESSOAS = {
    adm: ['Chavo', 'Pedro Borges', 'chavo@exemplo.test'],
    bia: ['Bia', 'Beatriz Lima', 'bia@exemplo.test'],
    ana: ['Ana', 'Ana Souza', 'ana@exemplo.test'],
    beto: ['Beto', 'Roberto Alves', 'beto@exemplo.test'],
    caio: ['Caio', 'Caio Mendes', 'caio@exemplo.test'],
    duda: ['Duda', 'Eduarda Reis', 'duda@exemplo.test'],
  };
  const ids = Object.fromEntries(Object.keys(PESSOAS).map((k, i) => [k, uuid(`d${String(i + 1).padStart(2, '0')}`, N)]));
  const U = Object.fromEntries(Object.entries(PESSOAS).map(([k, [apelido, nome, email]]) => [k, { ...usuario(ids[k], apelido), nome, nome_jogador: apelido, email, birthdate: '1990-01-01' }]));
  U.beto.notificacoes = { jogos: false };
  app.reiniciar({ tabelas: {}, usuarios: Object.values(U), superAdmins: [] });
  app.criarBucketsDoProjeto();
  for (const u of Object.values(U)) {
    const { data } = await app.cliente.auth.getUser(app.token(u.id));
    data.user.user_metadata.onboarding_completo = true;
    data.user.email = u.email;
  }

  const chamar = async (quem, metodo, rota, corpo) => {
    const r = await app.pedir(metodo, rota, { token: app.token(U[quem].id), corpo });
    const ok = r.status < 400;
    fala(`${ok ? 'ok  ' : 'ERRO'} ${r.status} ${quem.padEnd(5)} ${metodo.padEnd(6)} ${rota}${ok ? '' : ` — ${String(r.json?.error || r.texto).slice(0, 160)}`}`);
    if (!ok) throw new Error(`${metodo} ${rota} → ${r.status}`);
    return r;
  };
  const conviteDe = async (quem, slug) => {
    const conv = await chamar(quem, 'POST', `/api/teams/${slug}/convite`, {});
    return conv.json?.token || conv.json?.convite?.token;
  };

  const missa = (await chamar('adm', 'POST', '/api/teams', { nome: 'Missa de Quinta', publica: false, cor: 'roxo' })).json.team;
  const linhaMissa = app.tabelas.teams.find((t) => t.id === missa.id);
  linhaMissa.created_at = '2026-06-04T22:00:00Z'; // nasceu em junho: as setas voltam até lá
  for (const k of ['bia', 'ana', 'beto', 'caio', 'duda']) await chamar(k, 'POST', `/api/convite/${await conviteDe('adm', missa.slug)}/aceitar`, {});
  app.tabelas.team_members.find((m) => m.team_id === missa.id && m.user_id === U.bia.id).role = 'admin';
  const varzea = (await chamar('adm', 'POST', '/api/teams', { nome: 'Várzea do Chavo', publica: false, cor: 'verde' })).json.team;

  const saida = {
    pronto: true,
    base: app.base,
    segredo: process.env.INTERNO_SEGREDO,
    tokens: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, app.token(u.id)])),
    pessoas: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, { id: u.id, apelido: u.nome_jogador, nome: u.nome, email: u.email }])),
    missa: { id: missa.id, slug: missa.slug }, varzea: { id: varzea.id, slug: varzea.slug },
  };
  process.stdout.write(`${JSON.stringify(saida)}\n`);

  // "estado\n" → {"estado": …} (o que só o banco sabe e os push que teriam saído); "relogio <iso>\n" → {"relogio": iso}; "fim\n" → {"rede": …}.
  process.stdin.setEncoding('utf8');
  let buffer = '';
  process.stdin.on('data', (d) => {
    buffer += String(d);
    let i;
    while ((i = buffer.indexOf('\n')) >= 0) {
      const linha = buffer.slice(0, i).trim();
      buffer = buffer.slice(i + 1);
      if (linha === 'estado') {
        const estado = {
          pagamentos: (app.tabelas.mensalidade_pagamentos || []).map((p) => ({ user_id: p.user_id, mes: p.mes, status: p.status, marcado_por: p.marcado_por })),
          config: app.tabelas.team_mensalidade || [],
          lembretes: app.tabelas.mensalidade_lembretes || [],
          interesse: (app.tabelas.historico_interesse || []).map((x) => ({ origem: x.origem, team_id: x.team_id })),
          pushes,
          agora: new Date().toISOString(),
        };
        process.stdout.write(`${JSON.stringify({ estado })}\n`);
      } else if (linha.startsWith('relogio ')) {
        moverRelogio(linha.slice(8));
        process.stdout.write(`${JSON.stringify({ relogio: new Date().toISOString() })}\n`);
      } else if (linha === 'fim') {
        process.stdout.write(`${JSON.stringify({ rede: app.tentativasDeRede })}\n`, () => process.exit(0));
      }
    }
  });
  process.stdin.on('end', () => process.exit(0));
})().catch((e) => { process.stderr.write(`[motor-32g] ${e.stack || e.message}\n`); process.exit(1); });
