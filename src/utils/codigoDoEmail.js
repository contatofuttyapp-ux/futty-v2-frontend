// Futty v2.0 — o código de 6 números do e-mail de confirmação do cadastro. Quem cria conta por e-mail recebe o código ({{ .Token }} no
// modelo "Confirm sign up" do Supabase) e digita no app: a sessão abre ali mesmo, sem sair para o navegador e sem pedir a senha de novo.
// Puro e sem rede: a tela (components/ConfirmarCodigo.jsx) chama o Supabase e usa isto para limpar o que foi digitado e dizer o que houve.

export const TAMANHO_DO_CODIGO = 6;
// "Email OTP Expiration" do painel do Supabase (Authentication → Sign In / Providers → Email). O Supabase responde a mesma coisa para
// código errado e código vencido ("Token has expired or is invalid"): é a hora do último envio, guardada no aparelho, que separa as duas
// frases. Se o painel mudar, muda aqui (só muda a frase; quem decide se o código vale é o Supabase).
export const VALIDADE_DO_CODIGO_MS = 60 * 60 * 1000;
// O Supabase só manda outro e-mail para o mesmo endereço depois de 60 s; antes disso o "Reenviar código" responderia erro.
export const ESPERA_PARA_REENVIAR_S = 60;

/** Só os números, no máximo 6: aceita o código colado com espaço ou traço ("123 456", "123-456"). */
export function limparCodigo(texto) {
  return String(texto ?? '').replace(/\D/g, '').slice(0, TAMANHO_DO_CODIGO);
}

const muitasTentativas = (error) => error?.status === 429 || /rate_limit/.test(String(error?.code || ''));
const semConexao = (error) => error?.name === 'AuthRetryableFetchError' || error?.status === 0;

/**
 * A frase para o código recusado. `msDesdeOEnvio` = tempo desde o último e-mail mandado a partir deste aparelho (null se não se sabe).
 * @param {{ code?: string, status?: number, message?: string, name?: string }} error o erro do supabase.auth.verifyOtp
 */
export function mensagemDoCodigo(error, msDesdeOEnvio = null) {
  if (muitasTentativas(error)) return 'Muitas tentativas. Espere um minuto e tente de novo.';
  if (semConexao(error)) return 'Sem conexão agora. Confira a internet e tente de novo.';
  const recusado = error?.code === 'otp_expired' || error?.status === 403 || /expired|invalid/i.test(String(error?.message || ''));
  if (recusado) {
    if (Number.isFinite(msDesdeOEnvio) && msDesdeOEnvio > VALIDADE_DO_CODIGO_MS) {
      return 'Esse código venceu. Toque em "Reenviar código" para receber um novo.';
    }
    return 'Código errado. Confira os 6 números do e-mail mais recente.';
  }
  return 'Não deu para confirmar agora. Tente de novo.';
}

/** A frase para o "Reenviar código" que não foi (null se foi). */
export function mensagemDoReenvio(error) {
  if (!error) return null;
  if (muitasTentativas(error)) return 'Espere um minuto para pedir outro código.';
  if (semConexao(error)) return 'Sem conexão agora. Confira a internet e tente de novo.';
  return 'Não deu para reenviar agora. Tente de novo em um minuto.';
}

/** O Entrar com senha numa conta que ainda não digitou o código. */
export function contaSemConfirmar(error) {
  return error?.code === 'email_not_confirmed' || /email not confirmed/i.test(String(error?.message || ''));
}

/**
 * Cadastro com um e-mail que JÁ tem conta confirmada: o Supabase não conta isso a ninguém (para não revelar quem tem conta), devolve um
 * usuário de mentira sem identidades e não manda e-mail. Sem isto a pessoa ficaria esperando um código que nunca chega.
 */
export function emailJaTemConta(user) {
  return !!user && Array.isArray(user.identities) && user.identities.length === 0;
}
