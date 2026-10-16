// Futty v2.0 — a confirmação do cadastro por e-mail. O e-mail ("Confirm sign up" do Supabase) traz um botão para
// https://futtyapp.com.br/c/confirmar?token_hash=…&type=signup (ou /auth/confirmar): no celular com o app o sistema abre o APP nesse link
// (o mesmo caminho do link do convite); sem o app, abre o site. Nos dois a página pages/ConfirmarEmail.jsx troca o token_hash pela sessão
// (supabase.auth.verifyOtp), sem senha de novo. Puro e sem rede: as telas chamam o Supabase e usam isto para ler o link e dizer o que houve.

// "Email OTP Expiration" do painel do Supabase (Authentication → Sign In / Providers → Email): vale para o link também. O Supabase responde a
// mesma coisa para link vencido e link já usado ("Email link is invalid or has expired"): é a hora do último envio, guardada no aparelho, que
// separa as duas frases. Se o painel mudar, muda aqui (só muda a frase; quem decide se o link vale é o Supabase).
export const VALIDADE_DO_LINK_MS = 60 * 60 * 1000;
// O Supabase só manda outro e-mail para o mesmo endereço depois de 60 s; antes disso o "Reenviar e-mail" responderia erro.
export const ESPERA_PARA_REENVIAR_S = 60;
// Só o link do cadastro. Os outros tipos do Supabase (recuperar senha, trocar e-mail) têm caminho próprio e não passam por esta página.
const TIPOS_DO_LINK = ['signup'];

/** { tokenHash, tipo } do link do e-mail (a query de /c/confirmar ou /auth/confirmar), ou null se falta ou não tem a cara de um. */
export function lerLinkDeConfirmacao(search) {
  try {
    const q = new URLSearchParams(search || '');
    const tokenHash = (q.get('token_hash') || '').trim();
    const tipo = (q.get('type') || '').trim();
    if (!/^[A-Za-z0-9_-]{8,200}$/.test(tokenHash) || !TIPOS_DO_LINK.includes(tipo)) return null;
    return { tokenHash, tipo };
  } catch {
    return null;
  }
}

const muitasTentativas = (error) => error?.status === 429 || /rate_limit/.test(String(error?.code || ''));
const semConexao = (error) => error?.name === 'AuthRetryableFetchError' || error?.status === 0;

/**
 * O link recusado: o que dizer e o que oferecer.
 * @param {{ code?: string, status?: number, message?: string, name?: string }} error o erro do supabase.auth.verifyOtp
 * @param {{ msDesdeOEnvio?: number|null, temSessao?: boolean }} contexto
 *   msDesdeOEnvio = tempo desde o último e-mail mandado a partir DESTE aparelho (null se não se sabe: outro aparelho, outro navegador);
 *   temSessao = este aparelho já está com a conta aberta (a pessoa tocou de novo num link que já usou aqui).
 * @returns {{ tipo: 'conexao'|'espera'|'usado'|'vencido'|'usado-ou-trocado'|'usado-ou-vencido'|'falhou', titulo: string, frase: string }}
 */
export function explicarLinkRecusado(error, { msDesdeOEnvio = null, temSessao = false } = {}) {
  if (semConexao(error)) return { tipo: 'conexao', titulo: 'Sem conexão', frase: 'Sem conexão agora. Confira a internet e tente de novo.' };
  if (muitasTentativas(error)) return { tipo: 'espera', titulo: 'Muitas tentativas', frase: 'Espere um minuto e tente de novo.' };
  const recusado = error?.code === 'otp_expired' || error?.status === 403 || /expired|invalid/i.test(String(error?.message || ''));
  if (!recusado) return { tipo: 'falhou', titulo: 'Não deu para confirmar', frase: 'Não deu para confirmar agora. Tente de novo.' };
  if (temSessao) {
    return { tipo: 'usado', titulo: 'Link já usado', frase: 'Esse link já foi usado: seu e-mail já está confirmado.' };
  }
  if (Number.isFinite(msDesdeOEnvio)) {
    if (msDesdeOEnvio > VALIDADE_DO_LINK_MS) {
      return { tipo: 'vencido', titulo: 'Link vencido', frase: 'Esse link valia por 1 hora. Peça outro e toque em "Confirmar e entrar" no e-mail novo.' };
    }
    // Dentro da hora e recusado: ou já confirmou (em outro aparelho, outro navegador), ou pediu outro e-mail e este link foi trocado pelo novo.
    return {
      tipo: 'usado-ou-trocado',
      titulo: 'Link já usado',
      frase: 'Esse link já foi usado ou foi trocado por um mais novo. Se você já confirmou, é só entrar. Se pediu outro e-mail, use o mais recente.',
    };
  }
  return {
    tipo: 'usado-ou-vencido',
    titulo: 'Esse link não vale mais',
    frase: 'Esse link já foi usado ou passou de 1 hora. Se você já confirmou, é só entrar. Se não, entre com e-mail e senha que mandamos outro.',
  };
}

/** A frase para o "Reenviar e-mail" que não foi (null se foi). */
export function mensagemDoReenvio(error) {
  if (!error) return null;
  if (muitasTentativas(error)) return 'Espere um minuto para pedir outro e-mail.';
  if (semConexao(error)) return 'Sem conexão agora. Confira a internet e tente de novo.';
  return 'Não deu para reenviar agora. Tente de novo em um minuto.';
}

/** O Entrar com senha numa conta que ainda não tocou no link do e-mail. */
export function contaSemConfirmar(error) {
  return error?.code === 'email_not_confirmed' || /email not confirmed/i.test(String(error?.message || ''));
}

/**
 * Cadastro com um e-mail que JÁ tem conta confirmada: o Supabase não conta isso a ninguém (para não revelar quem tem conta), devolve um
 * usuário de mentira sem identidades e não manda e-mail. Sem isto a pessoa ficaria esperando um e-mail que nunca chega.
 */
export function emailJaTemConta(user) {
  return !!user && Array.isArray(user.identities) && user.identities.length === 0;
}

// "Abrir o e-mail": no app, o app de e-mail do aparelho (o iPhone abre esquemas como message:// pelo sistema; o Android abre o endereço
// https pelo app que o reclamar, ou pelo navegador); no site, a caixa de entrada do provedor numa aba nova. Do domínio do e-mail sai o
// provedor; provedor desconhecido no Android e no site = sem botão (melhor nenhum que um que abre a coisa errada).
const PROVEDORES = [
  { dominios: ['gmail.com', 'googlemail.com'], ios: ['googlegmail://', 'message://'], web: 'https://mail.google.com/mail/' },
  { dominios: ['hotmail.com', 'hotmail.com.br', 'outlook.com', 'outlook.com.br', 'live.com', 'msn.com'], ios: ['ms-outlook://', 'message://'], web: 'https://outlook.live.com/mail/' },
  { dominios: ['yahoo.com', 'yahoo.com.br', 'ymail.com'], ios: ['ymail://', 'message://'], web: 'https://mail.yahoo.com/' },
  { dominios: ['icloud.com', 'me.com', 'mac.com'], ios: ['message://'], web: 'https://www.icloud.com/mail' },
  { dominios: ['uol.com.br', 'bol.com.br'], ios: ['message://'], web: 'https://email.uol.com.br/' },
];

/**
 * Para onde vai o "Abrir o e-mail", em ordem de tentativa (o 1º que abrir algo ganha), ou [] (sem botão).
 * @param {string} email
 * @param {'ios'|'android'|'web'} plataforma
 */
export function caixaDeEntrada(email, plataforma) {
  const dominio = String(email || '').trim().toLowerCase().split('@')[1] || '';
  const provedor = PROVEDORES.find((p) => p.dominios.includes(dominio));
  // No iPhone o Mail do sistema sempre existe (e lê Gmail, Outlook, o domínio da empresa…): é o último recurso de todos.
  if (plataforma === 'ios') return provedor ? provedor.ios : ['message://'];
  return provedor ? [provedor.web] : [];
}
