// Futty v2.0 — Entrar com a Apple (13-set, iOS). Partilhado por
// LandingPage/Login/Register, irmão do lib/googleAuth.js.
//
// Por que existe: a App Store exige o Entrar com a Apple em qualquer app que
// ofereça login por outra rede social (Guideline 4.8) — o Futty tem o do Google.
// Só aparece no iOS nativo: na web e no Android o botão não é desenhado.
//
// Ao contrário do Google, aqui NÃO há Custom Tab nem deep link. O iOS mostra a
// folha nativa do sistema, devolve um identityToken (um JWT assinado pela Apple)
// e a sessão nasce de supabase.auth.signInWithIdToken, tudo dentro da app. Por
// isso o DeepLinkListener não participa deste fluxo.
import { Capacitor } from '@capacitor/core';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
// Velocidade 8: por obterSupabase(), como o googleAuth — o supabase-js não pode
// voltar ao modulepreload por um caminho de import estático qualquer.
import { obterSupabase } from './supabaseAsync';
import { apiFetch } from './api';

// O mesmo bundle id do projeto Xcode. No Supabase tem de estar em
// Auth → Providers → Apple → Authorized Client IDs (ver IOS.md).
const CLIENT_ID = 'com.futty.app';

/** O botão só existe no iOS nativo (nunca na web, nunca no Android). */
export function podeEntrarComApple() {
  return Capacitor.getPlatform() === 'ios';
}

function hex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// O nonce amarra este pedido a esta sessão: sem ele, um identityToken roubado
// podia ser reapresentado. São DOIS valores derivados de um só:
//   - à Apple vai o SHA-256, que ela copia para dentro do token;
//   - ao Supabase vai o original, que ele volta a fazer o hash e compara.
// Mandar o mesmo valor aos dois falha a verificação no Supabase.
function nonceCru() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return hex(bytes);
}

async function sha256(texto) {
  // Existe no WKWebView do Capacitor porque a origem é capacitor://localhost e
  // o host "localhost" conta como contexto seguro. Se um dia deixar de existir,
  // é melhor falhar aqui, alto, do que mandar um nonce errado e receber um erro
  // opaco do Supabase.
  if (!globalThis.crypto?.subtle) {
    throw new Error('Este aparelho não suporta o login da Apple com segurança.');
  }
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return hex(new Uint8Array(buf));
}

// O plugin rejeita com error.localizedDescription, sem código. Quando a pessoa
// fecha a folha, o erro da Apple é o ASAuthorizationError.canceled, cujo texto
// traz sempre o número 1001 — em qualquer idioma. É heurística, mas o preço de
// errar é só mostrar (ou esconder) uma mensagem.
function foiCancelado(e) {
  return /\b1001\b/.test(String(e?.message || ''));
}

// A Apple só manda o nome na PRIMEIRA autorização de cada Apple ID nesta app:
// da segunda vez em diante vem vazio, e não há como pedir de novo sem a pessoa
// remover a app de Ajustes → Apple ID → Início de sessão. Por isso guarda-se
// agora, e só se o perfil ainda não tiver nome — nunca por cima do que a pessoa
// escolheu. Falhar aqui não pode derrubar um login que já deu certo.
async function guardarNomeDaPrimeiraVez({ givenName, familyName }) {
  const proprio = [givenName, familyName].filter(Boolean).join(' ').trim();
  if (!proprio) return;
  try {
    const me = await apiFetch('/api/me');
    const patch = {};
    if (!me?.user?.nome_jogador) patch.nome_jogador = (givenName || proprio).trim().slice(0, 18);
    if (!me?.user?.nome) patch.nome = proprio.slice(0, 60);
    if (Object.keys(patch).length) await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify(patch) });
  } catch (e) {
    console.warn('[appleAuth] não deu para guardar o nome da Apple:', e.message);
  }
}

/**
 * Abre a folha do Entrar com a Apple e cria a sessão no Supabase.
 * Devolve { error } como o entrarComGoogle. Cancelar não é erro: volta
 * { error: null, cancelado: true } e a tela não mostra nada.
 */
export async function entrarComApple() {
  if (!podeEntrarComApple()) {
    return { error: new Error('O login da Apple só existe no app do iPhone.') };
  }
  try {
    const cru = nonceCru();
    const { response } = await SignInWithApple.authorize({
      clientId: CLIENT_ID,
      // No fluxo nativo a Apple não redireciona para lado nenhum: a resposta
      // volta pela própria chamada. O campo existe para o fluxo web, que o
      // Futty não usa (ver IOS.md).
      redirectURI: '',
      scopes: 'email name',
      nonce: await sha256(cru),
    });

    if (!response?.identityToken) {
      return { error: new Error('A Apple não devolveu o token de identidade.') };
    }

    const supabase = await obterSupabase();
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: response.identityToken,
      nonce: cru,
    });
    if (error) return { error };

    await guardarNomeDaPrimeiraVez(response);
    return { error: null };
  } catch (e) {
    if (foiCancelado(e)) return { error: null, cancelado: true };
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}
