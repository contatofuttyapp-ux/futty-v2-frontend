// Futty v2.0 — Contexto do perfil (/api/me), fonte única partilhada por toda a app.
// Achado 3/23 (roteiro 10-set): cada página que precisava do utilizador chamava o
// seu próprio useApi('/api/me') — Início, Equipa, Perfil (2x!), Planos, os guards —
// cada navegação repetia o mesmo pedido. Agora carrega UMA vez por sessão (login) e
// todos os consumidores partilham o mesmo estado.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
import { lerCache, gravarCache } from '../lib/cacheLocal';
import { urlAsset, urlImagem } from '../utils/avatar';

const CACHE_CHAVE = 'me';
// Quanto se espera pela hidratação vinda do /api/inicio antes de pedir /api/me
// por conta própria (Velocidade 6B). De Lisboa o /api/inicio responde em ~900 ms;
// 3 s é folga suficiente sem deixar a tela presa se ele nunca vier.
const ESPERA_HIDRATACAO_MS = 3000;

const PerfilContext = createContext(null);

// RODADA 27 — quem alinha os caches guardados com um perfil confirmado (lib/cacheCard.js) só faz falta
// QUANDO o card muda, então mora fora do arranque (o teto de 320 KiB do verificar-dist é de JS que o WebKit
// compila antes da 1ª tela) e se REGISTRA aqui ao carregar — junto das telas em que o card muda (Figurinha,
// Início, Perfil; ver lib/alinharCard.js). Import dinâmico custava ~1 KiB de cola de pré-carga no arranque.
// Sem registro (nenhuma dessas telas abriu) não há o que alinhar: nada mudou.
let alinhador = null;
// eslint-disable-next-line react-refresh/only-export-components
export function registrarAlinhador(fn) {
  alinhador = fn;
}
// Perfis que vieram do CACHE e o servidor ainda não confirmou (o objeto em si é a marca — sem estado à parte).
const deCacheSet = new WeakSet();

/**
 * VELOCIDADE 9 (23-set) — põe a foto do cromo a caminho assim que se sabe qual
 * é, sem esperar pela tela.
 *
 * O relatório do build 28 trouxe `cromo · avatar:decodificar 458 ms` como a
 * fase mais cara de compor o cromo do Início — e a maior parte disso é a ida a
 * São Paulo, não a descodificação: o pedido da imagem só partia quando a
 * composição chegava à linha do avatar, bem depois do arranque. Aqui ele parte
 * com o perfil (incluindo o do cache local, antes de qualquer rede).
 *
 * É de propósito um `new Image()` e não o `carregarImagem` do
 * utils/figurinhaCanvas: importar o canvas aqui punha um módulo grande no
 * chunk do arranque, para poupar um decode de 512 px. O que interessa — os
 * bytes — fica no cache do browser, e a composição encontra-os lá.
 */
function adiantarFotoDoCromo(user) {
  const origem = user?.avatar_url || user?.foto_url;
  if (!origem || typeof Image === 'undefined') return;
  try {
    // Mesma URL que utils/figurinhaCanvas pede (512 px pelo proxy) — se for
    // outra, o adiantamento não serve para nada.
    const img = new Image();
    img.decoding = 'async';
    img.src = urlImagem(urlAsset(origem), 512);
  } catch { /* adiantamento: falhar aqui não pode estragar o arranque */ }
}

export function PerfilProvider({ children }) {
  const { session } = useAuth();
  const userId = session?.user?.id || null;

  const [perfil, setPerfil] = useState(null);
  const [erro, setErro] = useState(null);
  const [erroCode, setErroCode] = useState(null);
  // deCache (14-set, bug do onboarding em loop): true enquanto o `perfil` em
  // exibição veio do cache local e o /api/me fresco ainda não respondeu. Gates
  // (onboarding, conta suspensa, super-admin) NUNCA decidem redirecionar/
  // bloquear com deCache=true — só depois do dado fresco chegar. Mostrar
  // conteúdo normal a partir do cache continua igual (é o ponto da
  // "Velocidade 3"); é só a DECISÃO de navegação/bloqueio que espera o fresco.
  const [deCache, setDeCache] = useState(false);
  // userId para o qual perfil/erro já refletem uma resposta (ou null = nenhuma
  // sessão). carregando é DERIVADO daqui — o mesmo truque do useApi (loadedPath),
  // que evita qualquer setState síncrono no corpo do efeito (lint
  // react-hooks/set-state-in-effect).
  const [carregadoParaId, setCarregadoParaId] = useState(undefined);
  const carregando = !!userId && carregadoParaId !== userId;

  // Guarda contra corrida: se o userId mudar (logout/troca de conta) enquanto um
  // pedido anterior ainda está no ar, a resposta tardia não pisa o estado actual.
  const userIdRef = useRef(userId);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // RODADA 27 — o perfil em exibição AGORA (não o que o último render viu). Duas coisas dependem disto:
  // saber se o rosto mudou quando chega um perfil confirmado (lib/cacheCard.js) e a guarda de hidratar() —
  // o cache nunca pisa um dado confirmado (deCacheSet diz se o que está em exibição veio do cache).
  const perfilRef = useRef(null);

  // Um perfil CONFIRMADO pelo servidor (ou por uma ação da própria pessoa, que vale o mesmo) chegou:
  // grava o cache `me` e alinha os outros caches com ele (foto nova no Início, no Ranking, no Feed...).
  // Sem isto o Início hidratava o perfil a partir do `me` VELHO que guardava dentro do próprio cache,
  // e pintava o cromo antigo até o /api/inicio responder (medido: 3,9 s).
  // `doInicio`: o `me` veio DENTRO do /api/inicio, que o InicioContext grava por conta própria.
  const aceitarPerfilFresco = useCallback((id, data, doInicio) => {
    const anterior = perfilRef.current;
    perfilRef.current = data;
    gravarCache(id, CACHE_CHAVE, data);
    alinhador?.(id, data, anterior, doInicio);
  }, []);

  // O perfil, a ausência de erro e a origem (cache ou servidor) andam sempre juntos — quatro sítios
  // repetiam as mesmas cinco linhas (e cada uma custa bytes no arranque, que tem teto).
  const mostrarPerfil = useCallback((id, data, doCache) => {
    setPerfil(data);
    setErro(null);
    setErroCode(null);
    setCarregadoParaId(id);
    setDeCache(doCache);
  }, []);

  // Carga inicial ao autenticar (login/arranque com sessão); limpa ao sair. Chave =
  // user.id, não o access_token — o token renova-se (~1h) sem precisar recarregar.
  useEffect(() => {
    let ativo = true;
    if (!userId) {
      Promise.resolve().then(() => {
        if (!ativo) return;
        perfilRef.current = null;
        setPerfil(null);
        setErro(null);
        setErroCode(null);
        setCarregadoParaId(null);
        setDeCache(false);
      });
      return () => {
        ativo = false;
      };
    }
    // Cache local (13-set, "Velocidade 3", stale-while-revalidate): mostra o
    // último /api/me bom na hora (sem LoadingFutty) enquanto o pedido de
    // verdade corre por trás — motor em São Paulo, quem está longe sente
    // ~240ms mesmo já com tudo centralizado num pedido só por sessão.
    const doCache = lerCache(userId, CACHE_CHAVE);
    if (doCache) {
      // VELOCIDADE 9: a foto do cromo começa a ser baixada AQUI — no arranque,
      // a partir do cache, antes de qualquer resposta do motor. Era a fase mais
      // cara de compor o cromo do Início (458 ms no relatório do build 28), e
      // quase toda ela era a ida a São Paulo a começar tarde. Ver
      // `adiantarFotoDoCromo`.
      adiantarFotoDoCromo(doCache?.user);
      Promise.resolve().then(() => {
        if (!ativo) return;
        perfilRef.current = doCache;
        deCacheSet.add(doCache);
        mostrarPerfil(userId, doCache, true);
      });
    }

    // VELOCIDADE 6B (15-set): a abrir DIRETO no Início, o /api/inicio já traz o
    // `me` dentro do payload agregado e hidrata este contexto (hidratarPerfil).
    // Pedir /api/me aqui era um segundo pedido para a mesma coisa, a competir
    // com o /api/inicio logo no arranque — o pior momento possível.
    //
    // Este provider vive ACIMA do BrowserRouter (ver App.jsx), por isso não há
    // useLocation: lê-se o pathname do arranque, que é o que interessa (o efeito
    // só corre uma vez por sessão). E, como nada garante que a hidratação venha
    // — o /api/inicio pode falhar ou ficar pendurado —, arma-se um prazo: se
    // ninguém hidratar a tempo, pede-se /api/me na mesma.
    const rota = typeof window !== 'undefined' ? window.location.pathname : '';
    if (rota === '/' || rota === '/home') {
      const prazo = setTimeout(() => {
        if (!ativo || userIdRef.current !== userId) return;
        // Se já hidratou, `carregadoParaId` é o userId e não há nada a fazer.
        setCarregadoParaId((atual) => {
          if (atual === userId) return atual;
          apiFetch('/api/me')
            .then((data) => {
              if (!ativo || userIdRef.current !== userId) return;
              aceitarPerfilFresco(userId, data);
              mostrarPerfil(userId, data, false);
            })
            .catch(() => {});
          return atual;
        });
      }, ESPERA_HIDRATACAO_MS);
      return () => { ativo = false; clearTimeout(prazo); };
    }

    apiFetch('/api/me')
      .then((data) => {
        if (!ativo) return;
        aceitarPerfilFresco(userId, data);
        mostrarPerfil(userId, data, false); // dado fresco chegou — gates já podem decidir
      })
      .catch((e) => {
        if (!ativo) return;
        if (doCache) {
          // Já mostrando o cache — mantém, sem risco a tela com erro. deCache
          // continua true (o que está em exibição ainda não foi confirmado
          // pelo fresco) — gates continuam à espera.
          console.warn('[PerfilContext] /api/me falhou, mantendo cache:', e.message);
          return;
        }
        setPerfil(null);
        setErro(e.message || 'Não foi possível carregar o perfil.');
        setErroCode(e.code || null);
        setCarregadoParaId(userId);
        setDeCache(false);
      });
    return () => {
      ativo = false;
    };
  }, [userId, aceitarPerfilFresco, mostrarPerfil]);

  // recarregar() exposto ao contexto — para consumidores chamarem a partir de
  // handlers (após guardar dados, trocar avatar, gerar avatar IA, etc.), nunca a
  // partir de um efeito. Silencioso: não risca `carregando` (revalidação em fundo).
  const carregar = useCallback(async () => {
    const idDoPedido = userId;
    if (!idDoPedido) return null;
    try {
      const data = await apiFetch('/api/me');
      if (userIdRef.current !== idDoPedido) return null; // ficou obsoleto
      aceitarPerfilFresco(idDoPedido, data);
      setPerfil(data);
      setErro(null);
      setErroCode(null);
      setDeCache(false); // recarga explícita É o dado fresco
      return data;
    } catch (e) {
      if (userIdRef.current !== idDoPedido) return null;
      setErro(e.message || 'Não foi possível carregar o perfil.');
      setErroCode(e.code || null);
      return null;
    }
  }, [userId, aceitarPerfilFresco]);

  // Hidratação externa (11-set): o InicioContext já traz `me` dentro do payload
  // agregado de /api/inicio — em vez de disparar um /api/me próprio, ele chama
  // isto para preencher o mesmo estado que o efeito acima preencheria. Silencioso
  // como `carregar`: não risca nada que um consumidor já esteja a mostrar.
  //
  // userIdRef.current em vez do `userId` da closure (14-set, "Velocidade 3",
  // mesmo motivo do fix em SessaoContext): quem chama isto (InicioContext)
  // guarda a referência que recebeu de usePerfil() no seu próprio efeito — se
  // essa referência vier de um render anterior (userId ainda nulo), o guard
  // abaixo bloquearia a hidratação mesmo com a chamada em si já acontecendo
  // depois da sessão resolver. Ref é sempre o userId ATUAL; deps [] mantém a
  // identidade estável.
  //
  // opts.deCache (14-set): o InicioContext hidrata TANTO do seu próprio cache
  // local (payload /api/inicio da última visita) QUANTO do /api/inicio fresco
  // — se aqui tratássemos as duas chamadas como "dado fresco", a hidratação a
  // partir do cache do Início reabriria o MESMO bug do onboarding em loop por
  // uma porta diferente. `deCache: true` marca explicitamente uma hidratação
  // que ainda não foi confirmada pelo servidor nesta carga.
  //
  // RODADA 27 — duas regras novas:
  //   · o cache NUNCA pisa um dado confirmado. O Início hidratava o perfil com o `me` do próprio
  //     cache toda vez que montava; quem acabara de trocar a foto na Figurinha via o cromo ANTIGO
  //     voltar por ~2 s (o perfil confirmado, com a foto nova, era trocado pelo velho);
  //   · `opts.doInicio`: o `me` veio dentro do /api/inicio, que o InicioContext grava sozinho.
  const hidratar = useCallback((data, opts = {}) => {
    if (!data || !userIdRef.current || (opts.deCache && perfilRef.current && !deCacheSet.has(perfilRef.current))) return;
    adiantarFotoDoCromo(data?.user); // Velocidade 9 — ver a nota na carga inicial
    if (opts.deCache) {
      perfilRef.current = data;
      deCacheSet.add(data);
    } else {
      // Só regrava o cache do PerfilContext com dado CONFIRMADO fresco — uma
      // hidratação deCache:true (cache do Início) não pode sobrescrever um
      // cache de `me` que já esteja mais actualizado do que ela própria.
      aceitarPerfilFresco(userIdRef.current, data, opts.doInicio);
    }
    mostrarPerfil(userIdRef.current, data, !!opts.deCache);
  }, [aceitarPerfilFresco, mostrarPerfil]);

  const value = {
    perfil,
    carregando,
    deCache,
    erro,
    // Conta suspensa (requireAuth do backend) — o AuthGuard usa isto para mostrar
    // o ecrã próprio em vez do app. `&& !deCache` (14-set): decisão de gate
    // nunca a partir de cache — erroCode só é preenchido pelo /api/me fresco
    // (a exibição do cache limpa erroCode), mas o guard fica explícito mesmo
    // assim, como invariante, não como dependência de como o resto do efeito
    // está escrito hoje.
    suspenso: erroCode === 'CONTA_SUSPENSA' && !deCache,
    recarregar: carregar,
    hidratar,
  };

  return <PerfilContext.Provider value={value}>{children}</PerfilContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePerfil() {
  const ctx = useContext(PerfilContext);
  if (!ctx) {
    throw new Error('usePerfil tem de ser usado dentro de <PerfilProvider>');
  }
  return ctx;
}
