# SPEC — INFRA €0 (backlog; zero código agora)

**Objetivo:** zerar a mensalidade do Railway migrando o backend Express para
**funções serverless da Vercel** — a Vercel já serve o frontend, logo tudo passa
a uma origem e a um plano (grátis).

**Ordem:** DEPOIS da fase Segurança. Isto é registo/planeamento — sem código.

## Forma da migração
- `backend/server.js` deixa de ser um processo `node --watch` permanente e passa
  a um handler exportado (`api/[...].js` ou `api/index.js`) que a Vercel invoca
  por pedido. O router Express embrulha-se num handler serverless (o `app` continua
  a existir; muda quem o arranca). Funções são **efémeras e stateless** — nada de
  estado em memória entre pedidos, nada de "arranque" persistente.

## O que a migração TOCA (medido no código de hoje)

1. **Webhook do Stripe (raw body)** — `server.js:75` regista
   `POST /api/stripe/webhook` com `express.raw({type:'application/json'})` ANTES do
   `express.json`, porque a assinatura valida-se sobre o corpo cru.
   → Na Vercel, o body-parser default tem de ser **desligado** para essa função
   (`export const config = { api:{ bodyParser:false } }` ou função dedicada) e ler
   o Buffer cru. É o ponto mais frágil — testar a assinatura primeiro.

2. **`ensure*Bucket` no arranque → LAZY** — `server.js` corre no `app.listen`:
   `ensureAvatarsBucket()` e `ensureCampeonatosBucket()`. Serverless **não tem
   arranque único** (cada cold start correria isto). 
   → Mover para **lazy/idempotente na 1ª utilização** (garantir o bucket dentro do
   upload/store, com cache de "já garantido" por instância) OU um script de setup
   corrido uma vez à mão. Dois buckets hoje: `avatars`, `campeonatos`.

3. **Rate-limit** — `express-rate-limit` (`apiLimiter` 200/15min, `strictLimiter`
   20/15min em `/api/me/avatar`) usa **store em memória**. Entre instâncias
   serverless a contagem não é partilhada → limite deixa de valer.
   → Trocar por store partilhado (Upstash Redis / Vercel KV) OU rate-limit da
   própria Vercel (WAF/edge). Reavaliar limites com a fase Segurança.

4. **Ficheiros estáticos do disco** — `server.js` serve `/uploads`,
   `/public/avatares`, `/public/logos`, `/public` via `express.static` (disco do
   backend). Serverless **não tem disco persistente**.
   → Confirmar que tudo o que é servido vive já no **Supabase Storage** (avatares
   IA e fotos já lá estão; auditar logos/uploads/avatares genéricos). O que
   sobrar migra para Storage ou para `frontend/public` (servido pela Vercel).
   Liga-se à decisão de backup de assets da fase Privacidade.

5. **Envs** — mover `SUPABASE_*`, `FAL_KEY`, `STRIPE_*`, `VAPID_*`, `FRONTEND_URL`,
   `CORS_ORIGINS` do Railway para as **Environment Variables da Vercel** (por
   ambiente: Production/Preview). O `SUPABASE_SERVICE_KEY` é secreto — só server-side.

6. **CORS** — hoje `server.js:52-70` permite localhost + `.app.github.dev` +
   `CORS_ORIGINS`. Com frontend e backend na **mesma origem Vercel**, o grosso dos
   pedidos deixa de ser cross-origin → CORS **simplifica** (podia até cair para
   same-origin). Manter só se houver clientes noutras origens. `trust proxy` (`:79`)
   deixa de ser preciso — a Vercel trata do IP real.

## Riscos / notas
- **Cold starts**: primeira invocação após inatividade é mais lenta — aceitável
  para v1 (app amador).
- **Timeout das funções** (10s no plano grátis): a **geração de avatar IA**
  (`/api/me/avatar/ai`, fal.ai + 2 chamadas + retry) pode passar dos 10s.
  → Este endpoint é o candidato a NÃO migrar já / ir para background/queue, ou a
  exigir plano com timeout maior. **Medir o tempo real antes de decidir.**
- `node --watch`, health-check e `app.listen` deixam de fazer sentido — o entrypoint
  passa a ser o handler exportado.

## Ganho
- Railway €/mês → **€0** (dentro do free tier da Vercel), uma só plataforma,
  um só deploy. Sem alterar a lógica de negócio — só o invólucro de arranque.
