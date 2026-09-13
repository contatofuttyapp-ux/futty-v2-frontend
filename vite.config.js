import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// VELOCIDADE 5 (14-set) — abrir uma ligação nova (DNS + TCP + TLS) até São Paulo
// custa uma ida e volta inteira, e até aqui essas três ligações só começavam no
// instante em que o JS já montado pedia a primeira coisa. O preconnect manda o
// browser fazer esse trabalho enquanto ainda lê o <head>, em paralelo com o
// download dos chunks: quando o primeiro pedido sai, o cano já está quente.
//
// As URLs só existem no .env do build (mudam entre local, dev e produção), por
// isso são injectadas aqui e não escritas à mão no index.html.
//
// crossorigin: o Supabase e o motor são falados por fetch() cross-origin, e a
// ligação anónima é a que serve; a mídia entra por <img src> sem crossOrigin e
// precisa da ligação normal. Marcar errado aqui aquece o cano que não vai ser
// usado.
//
// Há UM index.html só para o site e para o app da loja (o build:native apenas
// tira mídia do dist/), portanto os três vão sempre. No site o do motor sobra —
// lá o /api é relativo, servido pela função da Cloudflare — e é uma ligação
// ociosa que o browser fecha sozinho; no app da loja é justamente a que paga.
function preconectar(env) {
  const destinos = [
    { url: env.VITE_SUPABASE_URL, cors: true },
    { url: env.VITE_API_URL, cors: true },
    { url: env.VITE_ASSETS_URL, cors: false },
  ]
  const vistos = new Set()
  const tags = []
  for (const { url, cors } of destinos) {
    let origem
    try {
      origem = new URL(url).origin
    } catch {
      continue // vazia ou relativa — não há ligação a aquecer
    }
    const chave = `${origem}|${cors}`
    if (vistos.has(chave)) continue
    vistos.add(chave)
    tags.push({
      tag: 'link',
      attrs: { rel: 'preconnect', href: origem, ...(cors ? { crossorigin: '' } : {}) },
      injectTo: 'head',
    })
  }
  return {
    name: 'futty-preconnect',
    transformIndexHtml: () => tags,
  }
}

// Agrupa as bibliotecas grandes em chunks de vendor próprios: o chunk principal
// (app) fica pequeno e o browser reaproveita os vendors em cache entre deploys.
// O bundler do Vite 8 (rolldown) só aceita manualChunks na forma de FUNÇÃO (a
// forma objeto dá "Expected Function: received Object"), por isso mapeamos pelo
// caminho em node_modules. Além de react/motion/icons (pedido original),
// separamos também sentry, recharts e lottie — sem isso o chunk principal
// passava de 360kB. @stripe/stripe-js
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
export default defineConfig(({ mode }) => ({
  plugins: [react(), preconectar(loadEnv(mode, process.cwd(), 'VITE_'))],
  // host:true = escuta em 0.0.0.0 (além de localhost) — inofensivo pro uso normal
  // (localhost continua a funcionar igual); é o que deixa o telemóvel na mesma
  // wifi alcançar o dev server pelo IP da máquina (vaga do celular).
  server: { host: true },
  // VELOCIDADE 4 — em produção o /api vive na MESMA origem das telas, servido
  // pela função da Cloudflare (functions/api/[[path]].js). O `vite preview`
  // serve a build de produção mas não corre essa função, e sem isto o /api
  // relativo batia num 404: a build de produção ficava impossível de testar
  // localmente. Este proxy faz aqui o que a função faz lá.
  preview: {
    proxy: {
      '/api': {
        target: process.env.VITE_PREVIEW_API || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: { manualChunks },
    },
  },
}))
