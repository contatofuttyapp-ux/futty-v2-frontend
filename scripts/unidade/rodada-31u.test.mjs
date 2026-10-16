// Futty v2.0 — Rodada 31U: "Validando convite…" nunca fica preso (src/utils/validarConvite.js) e as peças do convite que atravessa a
// instalação estão ligadas onde devem (página do convite, Onboarding, Início, Gabinete).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { comPrazo, validarConvite, valeTentarDeNovo } from '../../src/utils/validarConvite.js';

const nunca = () => new Promise(() => {});
const dormir = () => Promise.resolve();
const ler = (arq) => readFileSync(new URL(`../../${arq}`, import.meta.url), 'utf8');

test('comPrazo: a promessa que nunca volta vira erro PRAZO no tempo dado', async () => {
  await assert.rejects(comPrazo(nunca(), 20), (e) => e.code === 'PRAZO');
  assert.equal(await comPrazo(Promise.resolve(7), 20), 7);
});

test('1ª tentativa (com sessão) pendurada: a 2ª sai sozinha, sem a sessão, e a página abre', async () => {
  const r = await validarConvite({ comSessao: nunca, semSessao: async () => ({ valido: true }), prazoMs: 20, dormir });
  assert.deepEqual(r, { dados: { valido: true }, semSessao: true });
});

test('a 1ª responde: a 2ª nem sai', async () => {
  let segunda = 0;
  const r = await validarConvite({ comSessao: async () => ({ valido: true, jaMembro: false }), semSessao: async () => { segunda += 1; return {}; }, prazoMs: 20, dormir });
  assert.equal(r.semSessao, false);
  assert.equal(segunda, 0);
});

test('as duas falham (rede, prazo): erro CONVITE_TRAVADO — a tela mostra "Tentar de novo"', async () => {
  const semRede = async () => { const e = new Error('Sem internet agora. Tente de novo.'); e.code = 'SEM_REDE'; throw e; };
  await assert.rejects(validarConvite({ comSessao: semRede, semSessao: nunca, prazoMs: 20, dormir }), (e) => e.code === 'CONVITE_TRAVADO');
});

test('resposta 4xx do motor não se repete (é a resposta); 5xx, 408 e 429 sim', async () => {
  const e404 = Object.assign(new Error('não achei'), { status: 404 });
  let segunda = 0;
  await assert.rejects(validarConvite({ comSessao: async () => { throw e404; }, semSessao: async () => { segunda += 1; }, prazoMs: 20, dormir }), (e) => e.status === 404);
  assert.equal(segunda, 0);
  assert.equal(valeTentarDeNovo({ status: 503 }), true);
  assert.equal(valeTentarDeNovo({ status: 429 }), true);
  assert.equal(valeTentarDeNovo({ status: 401 }), false);
  assert.equal(valeTentarDeNovo({ code: 'PRAZO' }), true);
});

test('as peças estão ligadas: o convite avisa o motor e tem "Tentar de novo"; Onboarding e Início perguntam; o Gabinete tem a aba', () => {
  const convite = ler('src/pages/Convite.jsx');
  assert.match(convite, /avisarConviteAberto\(token, lojaDoCelular\)/);
  assert.match(convite, /validarConvite\(\{ comSessao: \(\) => apiFetch\(caminho\), semSessao: \(\) => apiFetchPublico\(caminho\) \}\)/);
  assert.match(convite, /data-tentar-de-novo/);
  assert.match(ler('src/pages/Onboarding.jsx'), /convitesNoMotor\(\)/);
  assert.match(ler('src/pages/Inicio.jsx'), /\{onboardingCompleto === true && <ConviteDoMotor \/>\}\s*\n\s*<CartaoConviteColado \/>/);
  const gabinete = ler('src/pages/Gabinete.jsx');
  assert.match(gabinete, /\{ k: 'sem-time', label: 'Contas sem time' \}/);
  assert.match(gabinete, /aba === 'sem-time' && <ContasSemTime/);
});
