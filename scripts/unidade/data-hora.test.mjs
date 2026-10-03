// Futty v2.0 — Rodada 29I (achado 83): a hora do jogo é a hora do campo (src/utils/dataHora.js).
//
// Medido pela Freaky contra o motor, não é dado de teste: o jogo gravado como 2026-10-08T23:00Z é quinta 20:00 em São Paulo e o app
// mostrava "sexta, 09/10, 00:00" para quem estava em Lisboa — mudava a hora E o dia da semana, porque formatava com o relógio do
// aparelho. Aqui trava-se que o resultado NÃO depende do TZ do processo: os mesmos cálculos rodam em processos filhos com TZ
// diferentes (Lisboa, São Paulo, UTC, Auckland) e têm de devolver exatamente o mesmo. O teste também roda inteiro sob
// `TZ=Europe/Lisbon npm test` e `TZ=America/Sao_Paulo npm test`, com o mesmo resultado.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  TZ_PADRAO, fusoOuPadrao, formatarData, formatarHora, formatarDataHora, diaDaSemana, diaDoMes, mesCurto, diaDeCalendario, ehHoje,
  instanteNoCampo, camposNoCampo, rabichoDoFuso, cidadeDoRabicho,
} from '../../src/utils/dataHora.js';
import { dataCurta } from '../../src/utils/convite.js';

const SP = 'America/Sao_Paulo';
const JOGO = '2026-10-08T23:00:00Z'; // quinta, 20:00 em São Paulo; sexta, 00:00 em Lisboa

test('o jogo de 2026-10-08T23:00Z com fuso America/Sao_Paulo é "quinta" e "20:00"', () => {
  assert.equal(diaDaSemana(JOGO, SP), 'quinta');
  assert.equal(formatarHora(JOGO, SP), '20:00');
  assert.equal(formatarData(JOGO, SP), 'qui., 8 de out.');
  assert.equal(formatarDataHora(JOGO, SP, { olhando: SP }), 'qui., 8 de out. · 20:00');
  assert.equal(formatarData(JOGO, SP, 'numerica'), '08/10/2026');
  assert.equal(formatarData(JOGO, SP, 'diaMes'), '08/10');
  assert.equal(diaDoMes(JOGO, SP), 8);
  assert.equal(mesCurto(JOGO, SP), 'out');
});

test('o mesmo instante no relógio de Lisboa é sexta 00:00 — era o que o app mostrava para o jogador de Lisboa', () => {
  assert.equal(diaDaSemana(JOGO, 'Europe/Lisbon'), 'sexta');
  assert.equal(formatarHora(JOGO, 'Europe/Lisbon'), '00:00');
  assert.equal(formatarDataHora(JOGO, 'Europe/Lisbon', { olhando: 'Europe/Lisbon' }), 'sex., 9 de out. · 00:00');
});

test('o rabicho (dono, 3-out): só quem está noutro relógio vê "· horário de <cidade do time>"; no mesmo relógio, nada', () => {
  assert.equal(formatarDataHora(JOGO, SP, { olhando: SP }), 'qui., 8 de out. · 20:00');
  assert.equal(formatarDataHora(JOGO, SP, { olhando: 'Europe/Lisbon' }), 'qui., 8 de out. · 20:00 · horário de São Paulo');
  assert.equal(formatarDataHora(JOGO, SP, { olhando: 'Europe/Lisbon', cidade: 'Campinas - SP' }), 'qui., 8 de out. · 20:00 · horário de Campinas');
  assert.equal(formatarDataHora(JOGO, 'Europe/Lisbon', { olhando: SP, cidade: 'Lisboa' }), 'sex., 9 de out. · 00:00 · horário de Lisboa');
  // Mesmo relógio com outro nome (Salvador e São Paulo, UTC-3 os dois): sem rabicho.
  assert.equal(rabichoDoFuso(JOGO, SP, { olhando: 'America/Bahia' }), '');
  assert.equal(rabichoDoFuso(JOGO, 'America/Manaus', { olhando: SP }), 'horário de Manaus');
  // Nunca o identificador IANA na tela.
  assert.equal(cidadeDoRabicho('America/Sao_Paulo'), 'São Paulo');
  assert.equal(cidadeDoRabicho('Atlantic/Azores'), 'Açores');
  assert.equal(cidadeDoRabicho('Europe/Madrid'), 'Madrid');
  assert.equal(cidadeDoRabicho(SP, 'Brasília, DF'), 'Brasília');
  for (const r of [rabichoDoFuso(JOGO, SP, { olhando: 'Asia/Tokyo' }), rabichoDoFuso(JOGO, 'Europe/Lisbon', { olhando: SP })]) {
    assert.doesNotMatch(r, /[/_]|fuso|Brasília/i, r);
  }
});

test('os outros dois jogos medidos na varredura (terça 21h e sábado 09h) também ficam no campo', () => {
  assert.equal(diaDaSemana('2026-10-14T00:00:00Z', SP), 'terça');
  assert.equal(formatarHora('2026-10-14T00:00:00Z', SP), '21:00');
  assert.equal(diaDaSemana('2026-10-10T12:00:00Z', SP), 'sábado');
  assert.equal(formatarHora('2026-10-10T12:00:00Z', SP), '09:00');
});

test('sem fuso (ou fuso que o navegador não conhece) vale o padrão — nunca o relógio do aparelho', () => {
  assert.equal(TZ_PADRAO, 'America/Sao_Paulo');
  assert.equal(fusoOuPadrao(undefined), TZ_PADRAO);
  assert.equal(fusoOuPadrao(''), TZ_PADRAO);
  assert.equal(fusoOuPadrao('Marte/Olympus'), TZ_PADRAO);
  assert.equal(fusoOuPadrao('Europe/Lisbon'), 'Europe/Lisbon');
  assert.equal(formatarHora(JOGO), '20:00');
  assert.equal(formatarHora(JOGO, null), '20:00');
  assert.equal(diaDaSemana(JOGO, 'Marte/Olympus'), 'quinta');
});

test('data ausente ou quebrada devolve texto vazio (nunca "Invalid Date" na tela)', () => {
  for (const ruim of [null, undefined, '', 'ontem à noite']) {
    assert.equal(formatarData(ruim, SP), '', String(ruim));
    assert.equal(formatarHora(ruim, SP), '', String(ruim));
    assert.equal(formatarDataHora(ruim, SP), '', String(ruim));
    assert.equal(diaDaSemana(ruim, SP), '', String(ruim));
    assert.equal(diaDoMes(ruim, SP), null, String(ruim));
    assert.equal(ehHoje(ruim, SP), false, String(ruim));
  }
});

test('"hoje" é o dia do campo: 23h de quinta em São Paulo já é sexta em UTC e ainda é hoje no campo', () => {
  const agora = new Date('2026-10-08T15:00:00Z'); // quinta, 12h em São Paulo
  assert.equal(ehHoje('2026-10-09T02:30:00Z', SP, agora), true); // quinta 23h30 no campo
  assert.equal(ehHoje('2026-10-09T02:30:00Z', 'UTC', agora), false); // em UTC já é sexta
  assert.equal(ehHoje('2026-10-09T03:00:00Z', SP, agora), false); // sexta 00h no campo
  assert.equal(diaDeCalendario('2026-10-09T02:30:00Z', SP), '2026-10-08');
});

test('escrever hora no relógio do campo: "quinta 20:00" digitado em qualquer lugar é 23:00Z; ida e volta fecham', () => {
  assert.equal(instanteNoCampo('2026-10-08', '20:00', SP), '2026-10-08T23:00:00.000Z');
  assert.equal(instanteNoCampo('2026-10-08', '20:00', 'Europe/Lisbon'), '2026-10-08T19:00:00.000Z');
  assert.equal(instanteNoCampo('2026-01-08', '20:00', 'Europe/Lisbon'), '2026-01-08T20:00:00.000Z');
  assert.equal(instanteNoCampo('2026-10-08', '9:05', 'America/Manaus'), '2026-10-08T13:05:00.000Z');
  assert.deepEqual(camposNoCampo(JOGO, SP), { data: '2026-10-08', hora: '20:00' });
  assert.deepEqual(camposNoCampo(JOGO, 'Europe/Lisbon'), { data: '2026-10-09', hora: '00:00' });
  for (const fuso of [SP, 'Europe/Lisbon', 'America/Manaus', 'Atlantic/Azores']) {
    const { data, hora } = camposNoCampo(instanteNoCampo('2026-03-28', '01:30', fuso), fuso);
    assert.deepEqual([data, hora], ['2026-03-28', '01:30'], fuso);
  }
  assert.equal(instanteNoCampo('2026-02-31', '20:00', SP), null);
  assert.equal(instanteNoCampo('2026-10-08', '25:00', SP), null);
  assert.equal(instanteNoCampo('lixo', '20:00', SP), null);
  assert.deepEqual(camposNoCampo('lixo', SP), { data: '', hora: '' });
});

test('a página do convite lê o próximo jogo no relógio do campo (fuso do time), não no do aparelho', () => {
  const agora = new Date('2026-10-01T15:00:00Z');
  assert.equal(dataCurta(JOGO, { agora, fuso: SP }), 'qui, 8 out');
  assert.equal(dataCurta(JOGO, { agora, fuso: 'Europe/Lisbon' }), 'sex, 9 out');
  assert.equal(dataCurta(JOGO, { agora }), 'qui, 8 out', 'sem fuso: o padrão, não o relógio do aparelho');
});

// ─── Não depende do TZ do processo ─────────────────────────────────────────────────────────────────────────────────────

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const FUSOS_DE_PROCESSO = ['Europe/Lisbon', 'America/Sao_Paulo', 'UTC', 'Pacific/Auckland', 'Asia/Tokyo'];

test('o resultado é IDÊNTICO com o processo em Lisboa, São Paulo, UTC, Auckland e Tóquio', () => {
  const script = `
    import { formatarData, formatarHora, formatarDataHora, diaDaSemana, ehHoje, instanteNoCampo, camposNoCampo } from ${JSON.stringify(new URL('../../src/utils/dataHora.js', import.meta.url).href)};
    const SP = 'America/Sao_Paulo';
    const J = '2026-10-08T23:00:00Z';
    console.log(JSON.stringify([
      diaDaSemana(J, SP), formatarHora(J, SP), formatarData(J, SP), formatarDataHora(J, SP, { olhando: SP }),
      diaDaSemana(J, 'Europe/Lisbon'), formatarHora(J, 'Europe/Lisbon'),
      ehHoje('2026-10-09T02:30:00Z', SP, new Date('2026-10-08T15:00:00Z')),
      instanteNoCampo('2026-10-08', '20:00', SP), camposNoCampo(J, SP), formatarData(J, undefined, 'comAno'),
    ]));
  `;
  const respostas = FUSOS_DE_PROCESSO.map((tz) => {
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ: tz }, encoding: 'utf8', cwd: RAIZ });
    assert.equal(r.status, 0, `TZ=${tz}: ${r.stderr}`);
    return r.stdout.trim();
  });
  const [primeira, ...demais] = respostas;
  demais.forEach((r, i) => assert.equal(r, primeira, `TZ=${FUSOS_DE_PROCESSO[i + 1]} deu diferente de TZ=${FUSOS_DE_PROCESSO[0]}`));
  const [dia, hora] = JSON.parse(primeira);
  assert.equal(dia, 'quinta');
  assert.equal(hora, '20:00');
});

// ─── Ninguém volta a formatar com o relógio do aparelho ────────────────────────────────────────────────────────────────

const ler = (rel) => fs.readFileSync(`${RAIZ}${rel}`, 'utf8');

test('as telas de jogo, presença, sorteio, resultado e Resenha não formatam data com o relógio do aparelho', () => {
  // Cada uma passa pelo utilitário. O que sobra de toLocale*/Intl.DateTimeFormat sem timeZone fica só onde o relógio de quem olha vale
  // de propósito (Gabinete, Diagnóstico, Planos, o texto do "há 5 h"), com o comentário dizendo por quê.
  const telas = [
    'src/components/RSVPCard.jsx', 'src/pages/Feed.jsx', 'src/pages/Inicio.jsx', 'src/pages/JogadorPerfil.jsx', 'src/pages/Jogo.jsx',
    'src/pages/Jogos.jsx', 'src/pages/SorteioShow.jsx', 'src/pages/AdminPanel.jsx', 'src/utils/format.js', 'src/utils/convite.js',
  ];
  for (const arquivo of telas) {
    const texto = ler(arquivo);
    assert.doesNotMatch(texto, /toLocale(Date|Time)?String\(/, `${arquivo} formata data com o relógio do aparelho (toLocale…)`);
    const intl = [...texto.matchAll(/Intl\.DateTimeFormat\([^)]*\)/g)].map((m) => m[0]);
    for (const uso of intl) assert.match(uso, /timeZone/, `${arquivo}: ${uso} sem timeZone`);
    assert.doesNotMatch(texto, /new Date\([^)]*\)\.get(Hours|Minutes|Day|Date|Month|FullYear)\(/, `${arquivo} lê o relógio do aparelho (getHours…)`);
  }
});

test('o Gabinete e o Diagnóstico seguem no relógio de quem olha — e dizem por quê', () => {
  for (const arquivo of ['src/pages/gabinete/AviseMe.jsx', 'src/pages/gabinete/Brilhantes.jsx', 'src/pages/gabinete/PessoasTimes.jsx', 'src/pages/Diagnostico.jsx']) {
    assert.match(ler(arquivo), /relógio de quem (está olhando|olha)/, `${arquivo}: falta o comentário que explica por que o fuso é o de quem olha`);
  }
});
