// Futty v2.0 — O relatório da caixa-preta (Rodada 28).
//
// lib/diagnostico.js COLETA (chamadas, navegações, travadas...) e mora no arranque do app; este arquivo
// MONTA o que a tela de Diagnóstico mostra e o relatório envia. Separados porque montar só interessa a
// quem abre essa tela (o super-admin, pelo Gabinete) e à bancada do iPhone simulado — o resto das
// pessoas nunca precisou destes bytes antes da 1ª tela, e o arranque tem teto de 320 KiB.
import { Capacitor } from '@capacitor/core';
import { estadoDaCaixaPreta, lerFasesCromo } from './diagnostico';

export { limparDiagnostico } from './diagnostico';

function aparelho(infoApp) {
  const c = typeof navigator !== 'undefined' ? navigator.connection : null;
  return {
    plataforma: Capacitor.getPlatform(),
    nativo: Capacitor.isNativePlatform(),
    appVersao: infoApp?.version || null,
    appBuild: infoApp?.build || null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    idioma: typeof navigator !== 'undefined' ? navigator.language : null,
    // Só o Chrome/Android costuma ter isto; no iOS vem vazio e tudo bem.
    ligacao: c ? { tipo: c.effectiveType || null, descidaMbps: c.downlink ?? null, rttMs: c.rtt ?? null, poupanca: !!c.saveData } : null,
    ecra: typeof window !== 'undefined' ? { largura: window.innerWidth, altura: window.innerHeight, dpr: window.devicePixelRatio } : null,
  };
}

function estatistica(valores) {
  const v = valores.filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (!v.length) return null;
  const soma = v.reduce((a, b) => a + b, 0);
  return { n: v.length, media: Math.round(soma / v.length), pior: Math.max(...v) };
}

/** O que dizer sobre o pré-aquecimento no relatório (Fluidez 2: "adiado" não é "não existe"). */
function lerPreaquecimento({ preaquecimento, preaquecimentoEspera, ultimoGesto }) {
  if (preaquecimento) return preaquecimento;
  if (preaquecimentoEspera == null) return null;
  const desdeOGesto = ultimoGesto === -Infinity ? null : Math.round(performance.now() - ultimoGesto);
  return {
    estado: 'adiado (toques)',
    esperaMs: preaquecimentoEspera,
    desdeOUltimoGestoMs: desdeOGesto,
    // Quando vai correr, se a pessoa não voltar a tocar. Em ms desde a abertura,
    // como as outras marcas do arranque.
    previstoEmMs: ultimoGesto === -Infinity ? null : Math.round(ultimoGesto + preaquecimentoEspera),
  };
}

/**
 * Tudo o que a tela de Diagnóstico mostra e o relatório envia.
 *
 * Velocidade 9: a bancada do iPhone simulado (scripts/ver-iphone.mjs) lê os MESMOS números pelo
 * `window.__futtyDiagnostico` (lib/diagnostico.js), em vez de raspar texto da tela. Só leitura, só
 * medições — nada de sessão nem de dados de pessoa que já não estivesse no relatório.
 */
export function lerDiagnostico() {
  const s = estadoDaCaixaPreta();
  const { chamadas, navegacoes, falhas, imagens, travadas } = s;
  return {
    versaoRelatorio: 1,
    em: new Date().toISOString(),
    aparelho: aparelho(s.infoApp),
    resumo: {
      total: estatistica(chamadas.map((c) => c.ms)),
      motor: estatistica(chamadas.map((c) => c.motorMs)),
      rede: estatistica(chamadas.map((c) => c.redeMs)),
      pintura: estatistica(navegacoes.map((n) => n.msPintura)),
      // Quantas telas pintaram sem esperar pela rede.
      pinturasDoCache: navegacoes.filter((n) => n.doCache).length,
      navegacoes: navegacoes.length,
      falhas: falhas.length,
      // Velocidade 6B: "imagens: n, média ms, % do cache".
      imagens: imagens.length
        ? {
          n: imagens.length,
          mediaMs: Math.round(imagens.reduce((a, i) => a + i.ms, 0) / imagens.length),
          pctDoCache: Math.round((imagens.filter((i) => i.doCache).length / imagens.length) * 100),
          bytes: imagens.reduce((a, i) => a + i.bytes, 0),
        }
        : null,
      // Velocidade 7B + Rodada 12A: { aparelho, maiorViewport, maiorRolavel,
      // maiorTransbordo, rota, orientacao, em }. O que conta é o maiorTransbordo
      // (quanto passou da tela NA ORIENTAÇÃO da altura): acima de zero, alguma
      // coisa rebentou a largura em campo.
      largura: s.largura,
      // Rodada 12A: quantas vezes o aparelho virou. Sem isto, uma largura de
      // paisagem no relatório não se distingue de um card que rebentou a tela.
      orientacao: { ...s.orientacao },
      // Velocidade 8 + Rodada 12A: quantos quadros passaram do tempo, em que
      // fase do app e com que TAREFA a correr (ver tarefaEmCurso).
      travadas: {
        leves: travadas.leves,
        graves: travadas.graves,
        pior: travadas.pior,
        porFase: { ...travadas.porFase },
        piores: [...travadas.piores],
      },
      // Rodada 12A: tempo com o app noutra coisa. NÃO entra nas travadas — o
      // requestAnimationFrame para em segundo plano e o intervalo de volta
      // aparecia como o pior engasgo de todos (96 s no build 21).
      segundoPlano: { ...s.segundoPlano },
      // Velocidade 8: compilação = HTML + download + execução de tudo o que está
      // no modulepreload; React = 1º commit da árvore; Início = 1ª pintura do /home.
      arranque: { ...s.arranque },
      // Fluidez 2: quanto cada fase do canvas custou, por cenário.
      cromo: lerFasesCromo(),
    },
    preaquecimento: lerPreaquecimento(s),
    chamadas: [...chamadas],
    navegacoes: [...navegacoes],
    falhas: [...falhas],
  };
}
