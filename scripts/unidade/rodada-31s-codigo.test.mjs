// Futty v2.0 — o código de 6 números do e-mail de confirmação (src/utils/codigoDoEmail.js, src/lib/cadastroPendente.js).
//
// Três assuntos:
//   1. o que a pessoa digita ou cola vira só os 6 números ("123 456", "123-456", o e-mail inteiro colado);
//   2. o Supabase responde a MESMA coisa para código errado e vencido: a frase sai da hora do último envio — e as duas versões do
//      erro (a de hoje, `code`, e a antiga, `error_code` lida pelo supabase-js como `code` também; o status 403 e a frase em inglês);
//   3. as telas: o cadastro não mostra mais o "Conta criada!" do link, chama verifyOtp do tipo 'signup', e o link de reserva continua
//      com destino (emailRedirectTo) no cadastro e no reenvio.
//
// O caminho inteiro (cadastro → código → onboarding → time) é provado no navegador: npm run provar:navegador -- rodada-31s
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  TAMANHO_DO_CODIGO, VALIDADE_DO_CODIGO_MS, contaSemConfirmar, emailJaTemConta, limparCodigo, mensagemDoCodigo, mensagemDoReenvio,
} from '../../src/utils/codigoDoEmail.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(`${RAIZ}${rel}`, 'utf8');

test('o que se digita ou cola vira só os 6 números', () => {
  assert.equal(TAMANHO_DO_CODIGO, 6);
  assert.equal(limparCodigo('123456'), '123456');
  assert.equal(limparCodigo('123 456'), '123456');
  assert.equal(limparCodigo('123-456'), '123456');
  assert.equal(limparCodigo(' 12a3b4 '), '1234');
  assert.equal(limparCodigo('Seu código: 482913. Vale por 1 hora.'), '482913', 'o trecho do e-mail colado: o corte no 6º número deixa o "1 hora" de fora');
  assert.equal(limparCodigo('48291312'), '482913');
  assert.equal(limparCodigo(null), '');
  assert.equal(limparCodigo(undefined), '');
});

const ERRADO = 'Código errado. Confira os 6 números do e-mail mais recente.';
const VENCEU = 'Esse código venceu. Toque em "Reenviar código" para receber um novo.';

test('código recusado: errado se o e-mail é recente, vencido se passou da validade', () => {
  const recusa = { name: 'AuthApiError', status: 403, code: 'otp_expired', message: 'Token has expired or is invalid' };
  assert.equal(mensagemDoCodigo(recusa, 5 * 60000), ERRADO);
  assert.equal(mensagemDoCodigo(recusa, VALIDADE_DO_CODIGO_MS + 1000), VENCEU);
  assert.equal(mensagemDoCodigo(recusa, null), ERRADO, 'sem a hora do envio, a frase é a do código errado (a saída é a mesma: conferir ou reenviar)');
  // Formatos antigos do erro: só o status, só a frase.
  assert.equal(mensagemDoCodigo({ status: 403, message: 'x' }, 0), ERRADO);
  assert.equal(mensagemDoCodigo({ status: 400, message: 'Token has expired or is invalid' }, VALIDADE_DO_CODIGO_MS * 2), VENCEU);
});

test('muitas tentativas, sem conexão e o resto têm frase própria (nunca o inglês do Supabase)', () => {
  assert.equal(mensagemDoCodigo({ status: 429, code: 'over_request_rate_limit', message: 'Request rate limit reached' }, 0), 'Muitas tentativas. Espere um minuto e tente de novo.');
  assert.equal(mensagemDoCodigo({ name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' }, 0), 'Sem conexão agora. Confira a internet e tente de novo.');
  assert.equal(mensagemDoCodigo({ status: 500, message: 'Database error' }, 0), 'Não deu para confirmar agora. Tente de novo.');
  assert.equal(mensagemDoReenvio(null), null);
  assert.equal(mensagemDoReenvio({ status: 429, code: 'over_email_send_rate_limit', message: 'For security purposes, you can only request this after 41 seconds.' }), 'Espere um minuto para pedir outro código.');
  assert.equal(mensagemDoReenvio({ status: 500 }), 'Não deu para reenviar agora. Tente de novo em um minuto.');
  for (const frase of [ERRADO, VENCEU]) assert.doesNotMatch(frase, /—/, 'VOZ-FUTTY: nada de travessão no meio da frase');
});

test('Entrar com senha numa conta sem confirmar e cadastro com e-mail que já tem conta', () => {
  assert.equal(contaSemConfirmar({ status: 400, code: 'email_not_confirmed', message: 'Email not confirmed' }), true);
  assert.equal(contaSemConfirmar({ status: 400, message: 'Email not confirmed' }), true);
  assert.equal(contaSemConfirmar({ status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' }), false);
  assert.equal(emailJaTemConta({ id: 'x', identities: [] }), true);
  assert.equal(emailJaTemConta({ id: 'x', identities: [{ provider: 'email' }] }), false);
  assert.equal(emailJaTemConta({ id: 'x' }), false, 'sem a lista, não se presume nada');
  assert.equal(emailJaTemConta(null), false);
});

test('as telas: código no lugar do "Conta criada!", verifyOtp do tipo signup, link de reserva com destino', () => {
  const cadastro = ler('src/pages/Register.jsx');
  const entrar = ler('src/pages/Login.jsx');
  const tela = ler('src/components/ConfirmarCodigo.jsx');
  assert.doesNotMatch(cadastro, /Conta criada!/);
  assert.doesNotMatch(cadastro, /Já confirmei, entrar/);
  assert.match(cadastro, /<ConfirmarCodigo/);
  assert.match(entrar, /<ConfirmarCodigo/);
  assert.match(tela, /verifyOtp\(\{ email, token: valor, type: 'signup' \}\)/);
  assert.match(tela, /autoComplete="one-time-code"/);
  assert.match(tela, /inputMode="numeric"/);
  // O link continua a ter para onde ir: o dos e-mails antigos e o de reserva do e-mail novo.
  assert.match(cadastro, /emailRedirectTo: destinoDoLink\(\)/);
  assert.match(tela, /resend\(\{ type: 'signup', email, options: \{ emailRedirectTo: redirecionarPara \} \}\)/);
  assert.match(entrar, /contaSemConfirmar\(error\)/);
});
