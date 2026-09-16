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
  // VELOCIDADE 8 (16-set) — o supabase-js passa a ter chunk PRÓPRIO. Sem esta
  // linha ele era enfiado no chunk partilhado que o rolldown batizava de
  // "futtyMonograma": 201 KB com o nome dos 700 bytes dos caminhos do F. O nome
  // mentia e mandava consertar a coisa errada. Agora o arquivo diz o que é.
  if (p.includes('/@supabase/')) return 'vendor-supabase'
  // VELOCIDADE 8 — o react SOBE para aqui, à frente do framer-motion. Ficava em
  // último e o rolldown enfiava o `react/cjs/react-jsx-runtime` no chunk do
  // motion; a partir daí TODOS os 54 chunks que escrevem JSX importavam o
  // vendor-motion, e era isso — não um import nosso — que punha o framer no
  // modulepreload do arranque. (@sentry continua acima: o caminho
  // .../@sentry/react/ também contém "react".)
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
  // O framer-motion JÁ NÃO TEM GRUPO PRÓPRIO (Velocidade 8). Um grupo do
  // manualChunks é um chunk FORÇADO: existe e é importado por quem precisa dele,
  // e o rolldown encostava-lhe o embrulho CJS do `react/jsx-runtime` (o
  // `require` preguiçoso, que não passa por esta função e por isso nenhuma regra
  // daqui o alcança). Resultado: 55 chunks importavam "vendor-motion" só para
  // escrever JSX, e ele ia no modulepreload do arranque. Sem o grupo, o
  // framer-motion segue o caminho natural — só o OnboardingModal o alcança, e
  // esse está em lazy (ver pages/Equipa.jsx): vira uma folha que só desce quando
  // o modal abre.
  if (p.includes('/lucide-react/')) return 'vendor-icons'
  if (p.includes('/recharts/') || p.includes('/d3-') || p.includes('/victory-vendor/')) return 'vendor-charts'
  if (p.includes('/lottie-react/') || p.includes('/lottie-web/')) return 'vendor-lottie'
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
