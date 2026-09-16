import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import { marcarArranque, observarImagens, vigiarLargura } from './lib/diagnostico'

// VELOCIDADE 8 (16-set) — PRIMEIRA LINHA DO CORPO, de propósito. Em ESM os
// imports acima já foram buscados, lidos e EXECUTADOS quando esta linha corre,
// por isso este performance.now() é o custo inteiro de pôr o app de pé antes de
// uma única linha nossa: HTML + download + parse + compilação de tudo o que
// está no modulepreload do index.html. É o número que explica o "a primeira vez
// trava muito até fluir" — na 1ª abertura depois de instalar/atualizar o WebKit
// compila tudo sem cache de bytecode. Também é aqui que o medidor de travadas
// liga, para não perder nenhum quadro do arranque.
marcarArranque(performance.now());

// Marca de versão do bundle — permite confirmar na consola que o tab serve o
// código novo (stale check). Bump manual quando importa distinguir uma sessão.
const FUTTY_BUILD = 'velocidade-8';
console.log(`[Futty] build: ${FUTTY_BUILD}`);

// Error tracking (só em produção; DSN via VITE_SENTRY_DSN).
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD,
  tracesSampleRate: 0.1, // 10% de traces
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
})

// Velocidade 6B: passa a contar quantas imagens do proxy vieram do cache do
// aparelho — é o número que diz se o ganho é real no celular de verdade.
observarImagens();
vigiarLargura();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Regista o service worker (PWA instalável + base para push). Falha em silêncio.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('SW error:', err))
  })
}
