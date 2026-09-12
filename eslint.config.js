import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // android/** e ios/** — bundle compilado do Capacitor (JS minificado de
  // libs de terceiros), não código do Futty. Sem isto o lint reporta ~280
  // erros de código que ninguém escreveu aqui (13-set, "Velocidade 3").
  globalIgnores(['dist', 'android', 'ios']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Service worker: corre em ServiceWorkerGlobalScope (self, caches, clients…).
    files: ['public/sw.js'],
    languageOptions: { globals: globals.serviceworker },
  },
])
