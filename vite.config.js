import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// RODADA 28 — a versão do SITE para a telemetria anônima de velocidade ("p50/p95 por versão" no
// Gabinete): o commit do build. Na Cloudflare vem do ambiente dela; fora dela, do git; sem git, 'local'.
// No app da loja quem manda é a versão do pacote (App.getInfo), não esta.
function versaoWeb() {
  if (process.env.CF_PAGES_COMMIT_SHA) return process.env.CF_PAGES_COMMIT_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'local'
  } catch {
    return 'local'
  }
}

// RODADA 29H (item 37) — versão da mídia de public/ que pode ser trocada. O _headers serve public/onboarding/* com
// "immutable, max-age=1 ano" e o NOME do arquivo não muda quando a arte muda: quem já tinha visto o busto antigo continuava
// vendo (o dono viu isto na 29E2/29E3). A regra: mídia de public/ que possa ser trocada leva ?v=<hash do conteúdo> na URL, e o
// hash sai do próprio arquivo a cada build — trocou a imagem, mudou a URL, nada a lembrar. O Cloudflare Pages guarda por URL
// completa (com a query) e o _headers casa pelo caminho, então o cache longo continua valendo para cada versão.
// Hoje só o onboarding (utils/miniSorteio.js lê __VERSOES_ONBOARDING__); outra pasta que passe a trocar ganha a sua linha aqui.
function versoesDaPasta(pasta) {
  const dir = new URL(`./public/${pasta}/`, import.meta.url)
  const versoes = {}
  for (const nome of readdirSync(dir)) {
    versoes[nome.replace(/\.[^.]+$/, '')] = createHash('sha1').update(readFileSync(new URL(nome, dir))).digest('hex').slice(0, 8)
  }
  return versoes
}

// RODADA 29H (item 4) — o caminho FRIO da página 1 do onboarding. O Register/Login aquecem o chunk e as 8 figurinhas (lib/
// preaquecerOnboarding.js), mas quem chega ao /onboarding pelo link do e-mail de confirmação, ou voltando do Google, abre o site do zero:
// o index.js é lido e executado, o roteador resolve a rota, SÓ ENTÃO o chunk do Onboarding é pedido, e só quando ele renderiza saem as 8
// imagens — uma fila de quatro idas. Este plugin emite um arquivo pequeno (/preload-onboarding.js, fora do bundle e sem hash no nome) que o
// index.html carrega com `async`: se o caminho é /onboarding, ele já pede, em paralelo com o index.js, o chunk do Onboarding e o que ele
// importa (modulepreload), o CSS dele (preload as=style) e as 8 imagens versionadas (preload as=image). Em qualquer outro caminho e no app
// da loja (Capacitor.isNativePlatform(): o objeto Capacitor também existe na web, então não basta ele existir) não faz nada. Arquivo externo, e não um <script> inline, para a CSP (hoje Report-Only, depois de verdade)
// nunca precisar abrir uma exceção. Só roda no build (no dev não há chunks); o nome do arquivo é fixo, o conteúdo muda a cada build, e o
// _headers não lhe dá cache longo.
function preloadDoOnboardingNoFrio() {
  const caminho = (p) => String(p || '').replace(/\\/g, '/')
  return {
    name: 'futty-preload-onboarding',
    apply: 'build',
    enforce: 'post', // depois do plugin do HTML: o que o index.html já carrega (index, vendor-react…) não se repete aqui
    generateBundle(_opcoes, bundle) {
      const entrada = Object.values(bundle).find((c) => c.type === 'chunk' && caminho(c.facadeModuleId).endsWith('/src/pages/Onboarding.jsx'))
      if (!entrada) return
      const js = []
      const css = []
      const vistos = new Set()
      const andar = (nome) => {
        if (vistos.has(nome)) return
        vistos.add(nome)
        const c = bundle[nome]
        if (!c || c.type !== 'chunk') return
        js.push(nome)
        for (const k of c.viteMetadata?.importedCss || []) css.push(k)
        for (const i of c.imports || []) andar(i)
      }
      andar(entrada.fileName)
      const imagens = Object.entries(versoesDaPasta('onboarding')).map(([id, v]) => `/onboarding/${id}.webp?v=${v}`)
      const html = String(bundle['index.html']?.source || '')
      const novo = (f) => !html.includes(`/${f}`)
      const lista = [
        ...js.filter(novo).map((f) => ['modulepreload', `/${f}`, '']),
        ...css.filter(novo).map((f) => ['preload', `/${f}`, 'style']),
        ...imagens.map((u) => ['preload', u, 'image']),
      ]
      const codigo = `(function(){var p=location.pathname;var C=window.Capacitor;if(p.indexOf('/onboarding')!==0||(C&&C.isNativePlatform&&C.isNativePlatform()))return;${JSON.stringify(lista)}.forEach(function(x){var l=document.createElement('link');l.rel=x[0];l.href=x[1];if(x[2])l.as=x[2];if(x[0]==='modulepreload'||x[2]==='style')l.crossOrigin='';document.head.appendChild(l)})})();\n`
      this.emitFile({ type: 'asset', fileName: 'preload-onboarding.js', source: codigo })
    },
    transformIndexHtml: () => [{ tag: 'script', attrs: { async: '', src: '/preload-onboarding.js' }, injectTo: 'head' }],
  }
}

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
  // VELOCIDADE 8 — o react fica à frente dos demais grupos: o rolldown enfiava o
  // `react/cjs/react-jsx-runtime` no último grupo declarado, e todo chunk que
  // escreve JSX passava a importar esse grupo. (@sentry continua acima: o caminho
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
  // O framer-motion saiu do projeto (Rodada 29B, parte 0): nenhuma tela o usa,
  // a transição de página é CSS. Não recriar um grupo "vendor-motion" aqui — um
  // grupo do manualChunks é um chunk forçado e, na Velocidade 8, arrastou 55
  // chunks (e o modulepreload do arranque) só por causa do `react/jsx-runtime`.
  // Rodada 29B (D.1): NÃO há grupo "vendor-icons". Ele existia para o lucide ter chunk
  // próprio, mas o grupo arrastava o núcleo CJS do React (react/cjs/react.production.js)
  // para dentro de si — e, como o arranque importa o React, o chunk inteiro (16 KiB:
  // núcleo do React + a base do lucide + ~28 ícones de telas lazy) ia no modulepreload
  // do index.html. Nenhum módulo do arranque usa o lucide (a barra de baixo usa
  // components/Icon.jsx, SVG de /public/icons). Sem o grupo, o núcleo do React volta
  // ao vendor-react e cada ícone cai no chunk da tela que o usa: −8,5 KiB no arranque.
  // Não recriar o grupo; se um módulo do arranque passar a importar lucide-react, o
  // verificar-dist acusa no peso do arranque.
  if (p.includes('/recharts/') || p.includes('/d3-') || p.includes('/victory-vendor/')) return 'vendor-charts'
  if (p.includes('/lottie-react/') || p.includes('/lottie-web/')) return 'vendor-lottie'
  return undefined
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), preconectar(loadEnv(mode, process.cwd(), 'VITE_')), preloadDoOnboardingNoFrio()],
  define: { __VERSAO_WEB__: JSON.stringify(versaoWeb()), __VERSOES_ONBOARDING__: JSON.stringify(versoesDaPasta('onboarding')) },
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
