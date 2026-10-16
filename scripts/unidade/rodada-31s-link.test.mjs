// Futty v2.0 — o link do e-mail de confirmação do cadastro (src/utils/confirmacaoDoEmail.js, src/pages/ConfirmarEmail.jsx,
// src/components/EsperaDoEmail.jsx).
//
// Quatro assuntos:
//   1. o link: só /c/confirmar ou /auth/confirmar com token_hash e type=signup viram confirmação; o resto é "link incompleto";
//   2. o Supabase responde a MESMA coisa para link vencido e link já usado: a frase sai da sessão aberta no aparelho e da hora do último envio;
//   3. "Abrir o e-mail": o app de e-mail certo pelo domínio (iPhone com o Mail de reserva), a caixa do provedor no site e no Android;
//   4. as telas: a espera não tem mais código, o link verifica pelo token_hash, e a rota fixa /c/confirmar fica no roteador.
//
// O caminho inteiro (cadastro → link no app ou no navegador → onboarding → time) é provado no navegador: npm run provar:navegador -- rodada-31s
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  VALIDADE_DO_LINK_MS, caixaDeEntrada, contaSemConfirmar, emailJaTemConta, explicarLinkRecusado, lerLinkDeConfirmacao, mensagemDoReenvio,
} from '../../src/utils/confirmacaoDoEmail.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(`${RAIZ}${rel}`, 'utf8');
const HASH = 'a3f9c1e07b5d42e98f61c0d3b7a2e5f4c9d8b1a0e6f3c2d5b4a7e8f9';

test('o link do e-mail: token_hash + type=signup, nada mais', () => {
  assert.deepEqual(lerLinkDeConfirmacao(`?token_hash=${HASH}&type=signup`), { tokenHash: HASH, tipo: 'signup' });
  assert.deepEqual(lerLinkDeConfirmacao(`?type=signup&token_hash=pkce_${HASH}`), { tokenHash: `pkce_${HASH}`, tipo: 'signup' }, 'o do cadastro PKCE leva o prefixo');
  for (const q of ['', '?type=signup', `?token_hash=${HASH}`, `?token_hash=${HASH}&type=recovery`, `?token_hash=${HASH}&type=magiclink`,
    '?token_hash=abc&type=signup', `?token_hash=${HASH}%22%3E%3Cscript%3E&type=signup`, `?token_hash=${'a'.repeat(201)}&type=signup`, null, undefined]) {
    assert.equal(lerLinkDeConfirmacao(q), null, String(q));
  }
});

test('link recusado: já usado com a conta aberta; vencido ou trocado pela hora do envio; sem pista, as duas coisas', () => {
  const recusa = { name: 'AuthApiError', status: 403, code: 'otp_expired', message: 'Email link is invalid or has expired' };
  assert.equal(explicarLinkRecusado(recusa, { temSessao: true }).tipo, 'usado');
  assert.equal(explicarLinkRecusado(recusa, { temSessao: true, msDesdeOEnvio: VALIDADE_DO_LINK_MS * 3 }).tipo, 'usado', 'conta aberta ganha da hora');
  assert.equal(explicarLinkRecusado(recusa, { msDesdeOEnvio: VALIDADE_DO_LINK_MS + 1000 }).tipo, 'vencido');
  assert.equal(explicarLinkRecusado(recusa, { msDesdeOEnvio: 5 * 60000 }).tipo, 'usado-ou-trocado');
  assert.equal(explicarLinkRecusado(recusa, {}).tipo, 'usado-ou-vencido');
  // Formatos antigos do erro: só o status, só a frase.
  assert.equal(explicarLinkRecusado({ status: 403, message: 'x' }, { msDesdeOEnvio: VALIDADE_DO_LINK_MS * 2 }).tipo, 'vencido');
  assert.equal(explicarLinkRecusado({ status: 400, message: 'Token has expired or is invalid' }, {}).tipo, 'usado-ou-vencido');
  assert.match(explicarLinkRecusado(recusa, { msDesdeOEnvio: VALIDADE_DO_LINK_MS * 2 }).frase, /valia por 1 hora/);
  assert.match(explicarLinkRecusado(recusa, { temSessao: true }).frase, /já está confirmado/);
});

test('sem conexão, muitas tentativas e o resto têm frase própria (nunca o inglês do Supabase)', () => {
  assert.equal(explicarLinkRecusado({ name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' }).tipo, 'conexao');
  assert.equal(explicarLinkRecusado({ status: 429, code: 'over_request_rate_limit' }).tipo, 'espera');
  assert.equal(explicarLinkRecusado({ status: 500, message: 'Database error' }).tipo, 'falhou');
  assert.equal(mensagemDoReenvio(null), null);
  assert.equal(mensagemDoReenvio({ status: 429, code: 'over_email_send_rate_limit', message: 'For security purposes, you can only request this after 41 seconds.' }), 'Espere um minuto para pedir outro e-mail.');
  assert.equal(mensagemDoReenvio({ status: 500 }), 'Não deu para reenviar agora. Tente de novo em um minuto.');
  const todas = ['usado', 'vencido', 'usado-ou-trocado', 'usado-ou-vencido'].length;
  assert.equal(todas, 4);
  for (const ctx of [{ temSessao: true }, { msDesdeOEnvio: 1 }, { msDesdeOEnvio: VALIDADE_DO_LINK_MS * 2 }, {}]) {
    const { frase, titulo } = explicarLinkRecusado({ status: 403, code: 'otp_expired' }, ctx);
    assert.doesNotMatch(`${titulo} ${frase}`, /—|expired|invalid|token/i, 'VOZ-FUTTY: sem travessão, sem o inglês do Supabase');
  }
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

test('"Abrir o e-mail": o app do provedor no iPhone (o Mail de reserva), a caixa do provedor no site e no Android, nada se não se sabe', () => {
  assert.deepEqual(caixaDeEntrada('Ana@Gmail.com', 'ios'), ['googlegmail://', 'message://']);
  assert.deepEqual(caixaDeEntrada('ana@hotmail.com', 'ios'), ['ms-outlook://', 'message://']);
  assert.deepEqual(caixaDeEntrada('ana@empresa.com.br', 'ios'), ['message://'], 'no iPhone o Mail do sistema sempre existe');
  assert.deepEqual(caixaDeEntrada('ana@gmail.com', 'android'), ['https://mail.google.com/mail/']);
  assert.deepEqual(caixaDeEntrada('ana@outlook.com.br', 'web'), ['https://outlook.live.com/mail/']);
  assert.deepEqual(caixaDeEntrada('ana@empresa.com.br', 'android'), []);
  assert.deepEqual(caixaDeEntrada('ana@empresa.com.br', 'web'), []);
  assert.deepEqual(caixaDeEntrada('', 'web'), []);
});

test('as telas: espera sem código, o link verifica pelo token_hash, a rota fixa no roteador e o destino de reserva', () => {
  const cadastro = ler('src/pages/Register.jsx');
  const entrar = ler('src/pages/Login.jsx');
  const espera = ler('src/components/EsperaDoEmail.jsx');
  const pagina = ler('src/pages/ConfirmarEmail.jsx');
  const rotas = ler('src/App.jsx');
  assert.ok(!fs.existsSync(`${RAIZ}src/components/ConfirmarCodigo.jsx`), 'a tela do código saiu');
  assert.doesNotMatch(espera, /one-time-code|verifyOtp|Código/);
  assert.match(espera, /Mandamos um link para/);
  assert.match(espera, /Toque em Confirmar no e-mail\./);
  assert.match(cadastro, /<EsperaDoEmail/);
  assert.match(entrar, /<EsperaDoEmail/);
  assert.match(pagina, /verifyOtp\(\{ token_hash: link\.tokenHash, type: link\.tipo \}\)/);
  assert.match(pagina, /Volte ao app e toque em Entrar\./);
  assert.match(rotas, /<Route path="\/c\/confirmar" element={<ConfirmarEmailRoute \/>} \/>/);
  assert.match(rotas, /<Route path="\/auth\/confirmar" element={<ConfirmarEmailRoute \/>} \/>/);
  // A cada link a tela começa de novo (o link do e-mail novo chega com a tela do link recusado aberta).
  assert.match(rotas, /<ConfirmarEmail key={key} \/>/);
  // A senha da tela de espera é só da memória: nunca vai para o bilhete do aparelho.
  assert.match(ler('src/lib/cadastroPendente.js'), /const b = \{ email: String\(email\)\.trim\(\), em \};/);
  assert.doesNotMatch(ler('src/lib/cadastroPendente.js'), /password/i);
  // O link dos e-mails mandados antes continua a ter para onde ir.
  assert.match(cadastro, /emailRedirectTo: destinoDoLink\(\)/);
  assert.match(espera, /resend\(\{ type: 'signup', email, options: \{ emailRedirectTo: redirecionarPara \} \}\)/);
  assert.match(entrar, /contaSemConfirmar\(error\)/);
});
