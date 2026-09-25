// Futty v2.0 — Cache local por utilizador (13-set, "Velocidade 3": "mostrar na
// hora, atualizar por trás"). Guarda a ÚLTIMA resposta boa de cada pedido em
// localStorage — ao montar, os contextos/telas mostram esse dado IMEDIATAMENTE
// (sem LoadingFutty) e disparam o pedido normal por trás; quando a resposta
// fresca chega, substitui o estado e regrava o cache. Motor em São Paulo, quem
// está longe (Lisboa) sente ~240ms mesmo com tudo já otimizado — isto tira essa
// espera da frente do olho em toda navegação depois da 1ª.
//
// userId é passado explicitamente pelo chamador (não adivinhado daqui via
// supabase.auth.getSession() — isso corria em paralelo com a MESMA subscrição
// que o AuthContext já mantém, e a 1ª leitura ficaria numa corrida com o
// getSession() inicial). Os contextos/hooks que usam isto já têm o userId à
// mão (useAuth()/useSessao()), por isso passá-lo é mais simples e sem corrida.
//
// Nunca global: celular compartilhado não pode mostrar o perfil da conta
// anterior — a chave leva o userId, e limparCacheLocal() (chamada no signOut
// do AuthContext) apaga tudo.
export const PREFIXO = 'futty_cache_v1:';
const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export function chaveCompleta(userId, chave) {
  return `${PREFIXO}${userId}:${chave}`;
}

/**
 * Lê o cache de `chave` para `userId`. `null` se não houver sessão, não
 * existir, estiver corrompido, ou tiver mais de 7 dias (e apaga a entrada
 * vencida). Nunca lança — quota cheia/modo privado tratam-se como "sem cache".
 */
export function lerCache(userId, chave) {
  return lerCacheComIdade(userId, chave)?.dados ?? null;
}

/**
 * Como lerCache, mas diz também QUANDO foi gravado. A Velocidade 6B (15-set)
 * precisa disto: se o pré-aquecimento acabou de passar por esta chave, a tela
 * pinta do cache e NÃO repete o pedido — ver `frescoMs` em useApiComCache.
 * Devolve `{ dados, idadeMs }` ou null.
 */
export function lerCacheComIdade(userId, chave) {
  if (!userId) return null;
  try {
    const bruto = localStorage.getItem(chaveCompleta(userId, chave));
    if (!bruto) return null;
    const { em, dados } = JSON.parse(bruto);
    if (!em || Date.now() - em > VALIDADE_MS) {
      localStorage.removeItem(chaveCompleta(userId, chave));
      return null;
    }
    if (dados == null) return null;
    return { dados, idadeMs: Date.now() - em };
  } catch {
    return null;
  }
}

/**
 * Grava `dados` no cache de `chave` para `userId`. Silencioso se falhar (quota
 * cheia, modo privado, localStorage indisponível) — cache é só otimização,
 * nunca uma dependência.
 */
export function gravarCache(userId, chave, dados) {
  if (!userId) return;
  try {
    localStorage.setItem(chaveCompleta(userId, chave), JSON.stringify({ em: Date.now(), dados }));
  } catch {
    /* quota cheia / modo privado — segue sem cache */
  }
}

/**
 * Apaga TODO o cache local (todas as chaves, todos os utilizadores) — chamada
 * no signOut (AuthContext): um celular compartilhado nunca pode mostrar o
 * perfil de quem saiu para a próxima conta que entrar.
 */
export function limparCacheLocal() {
  try {
    const chaves = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIXO)) chaves.push(k);
    }
    chaves.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* localStorage indisponível — nada a limpar */
  }
}
