// Futty v2.0 — a página 1 do onboarding abre devagar. O que ela espera é, na ordem: o chunk lazy do Onboarding
// (+ o CSS do mini sorteio), o /api/me do AuthGuard e as 8 figurinhas fictícias (WebP, ~24 KB, servidas do
// site). O cadastro e o login são o último lugar em que a pessoa passa antes dela, e ali ela gasta segundos
// digitando — por isso eles chamam isto ao montar: o chunk e as 8 imagens já vêm a caminho quando a pessoa
// toca em "Criar conta"/"Entrar". Em tempo ocioso, uma vez por carga da página, sem bloquear nada; falha em
// silêncio (é só um aquecimento: a página abre do mesmo jeito, só mais devagar). Módulo pequeno e sem React:
// só as telas lazy o importam. Quem vem de um convite (`convidado`) não vê o mini sorteio — a 1ª página dele
// são as boas-vindas do time: aquece o chunk delas em vez das 8 figurinhas.
import { urlAsset } from '../utils/avatar';
import { FIGURINHAS } from '../utils/miniSorteio';

let aquecido = false;
const retidas = []; // as <img> ficam vivas até a página usar as imagens (o navegador pode soltar o que ninguém segura)

/** Pede o chunk do Onboarding e as 8 imagens do mini sorteio (ou, para o convidado, o chunk das boas-vindas do time). Chamar quantas vezes quiser: só a primeira faz alguma coisa. */
export function preaquecerOnboarding({ convidado = false } = {}) {
  if (aquecido || typeof window === 'undefined') return;
  aquecido = true;
  const aquecer = () => {
    // O MESMO especificador do App.jsx: o bundler resolve para o mesmo chunk, então navegar depois já o encontra pronto.
    import('../pages/Onboarding').catch(() => { aquecido = false; });
    if (convidado) {
      import('../components/BoasVindas').catch(() => {});
      return;
    }
    for (const figurinha of FIGURINHAS) {
      const img = new Image();
      img.decoding = 'async';
      img.src = urlAsset(figurinha.arquivo);
      retidas.push(img);
    }
  };
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(aquecer, { timeout: 1500 });
  else setTimeout(aquecer, 300);
}
