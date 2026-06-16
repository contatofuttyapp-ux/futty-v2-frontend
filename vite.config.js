import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Agrupa as bibliotecas grandes em chunks de vendor próprios: o chunk principal
// (app) fica pequeno e o browser reaproveita os vendors em cache entre deploys.
// O bundler do Vite 8 (rolldown) só aceita manualChunks na forma de FUNÇÃO (a
// forma objeto dá "Expected Function: received Object"), por isso mapeamos pelo
// caminho em node_modules. Além de react/motion/icons (pedido original),
// separamos também sentry, recharts e lottie — sem isso o chunk principal
// passava de 360kB (lottie-web entra eager via LoadingScreen). @stripe/stripe-js
// não está no frontend (o checkout é feito no backend), por isso não há chunk
// para ele. O @supabase/supabase-js já é separado automaticamente pelo Vite.
function manualChunks(id) {
  const p = id.replace(/\\/g, '/')
  if (!p.includes('/node_modules/')) return undefined
  // @sentry tem de vir antes do react (o caminho .../@sentry/react/ contém "react").
  if (p.includes('/@sentry/') || p.includes('/@sentry-internal/')) return 'vendor-sentry'
  if (p.includes('/framer-motion/')) return 'vendor-motion'
  if (p.includes('/lucide-react/')) return 'vendor-icons'
  if (p.includes('/recharts/') || p.includes('/d3-') || p.includes('/victory-vendor/')) return 'vendor-charts'
  if (p.includes('/lottie-react/') || p.includes('/lottie-web/')) return 'vendor-lottie'
  if (
    p.includes('/react-router-dom/') ||
    p.includes('/react-router/') ||
    p.includes('/@remix-run/') ||
    p.includes('/react-dom/') ||
    p.includes('/scheduler/') ||
    /\/react\//.test(p)
  ) {
    return 'vendor-react'
  }
  return undefined
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: { manualChunks },
    },
  },
})
