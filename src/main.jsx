import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'

// Marca de versão do bundle — permite confirmar na consola que o tab serve o
// código novo (stale check). Bump manual quando importa distinguir uma sessão.
const FUTTY_BUILD = 'resenha-embed-inline-v3';
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
