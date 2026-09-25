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

3. **Rate-limit** — `express-rate-limit` (`backend/middleware/limiters.js`, tetos
   num lugar só em `limitesPara`; desde o Hotfix 25, 25-set): toda a `/api` em DOIS
   baldes, cada pedido num só — **1500/15 min por IP** (chave `CF-Connecting-IP`;
   quem não tem sessão conhecida) e **600/15 min por sessão** (quem o motor já
   validou); **avatar 20/15 min por sessão** (`/api/me/avatar[/ai]`); **mídia
   2000/15 min por IP real** (`/api/media`, fora dos baldes gerais); telemetria
   anônima **300/15 min por IP** (`/api/telemetria`, Rodada 28, também fora). O
   store é **em memória por instância**: no Cloud Run, com mais de uma instância
   o teto efetivo multiplica-se — aceitável hoje (min-instances 1).
   → Se virar problema: store partilhado (Redis) ou regra de WAF na Cloudflare.

4. **Ficheiros estáticos do disco** — `server.js` serve `/uploads`,
   `/public/avatares`, `/public/logos`, `/public` via `express.static` (disco do
   backend). Serverless **não tem disco persistente**.
   → Confirmar que tudo o que é servido vive já no **Supabase Storage** (avatares
   IA e fotos já lá estão; auditar logos/uploads/avatares genéricos). O que
   sobrar migra para Storage ou para `frontend/public` (servido pela Vercel).
   Liga-se à decisão de backup de assets da fase Privacidade.

5. **Envs** — mover `SUPABASE_*`, `FAL_KEY`, `STRIPE_*`, `VAPID_*`, `FRONTEND_URL`,
   `CORS_ORIGINS` do Railway para as **Environment Variables da Vercel** (por
   ambiente: Production/Preview). A chave secreta do Supabase (`SUPABASE_SECRET_KEY`,
   `sb_secret_…`; a antiga era `SUPABASE_SERVICE_KEY`, Rodada 28) é só server-side.

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

## PAGAMENTOS — decisão final do dono (registada 28 jul 2026)
**Pagamentos = exclusivamente IAP Apple/Google (App Store / Play Store).** Decisão
final do dono; Stripe foi **removido** do código (checkout + webhook), não pausado —
não há intenção de voltar a ligá-lo. A comissão das lojas (15% small-business tier,
30% acima do limiar) é **aceite** como custo de fazer negócio nessas plataformas.

- **O que sai:** `routes/stripe.js` (checkout + webhook), montagem no `server.js`,
  dependência `stripe` no `package.json`, botão "Assinar" em `/planos`.
- **O que fica intocado:** o sistema de **Planos** (Free/Pro/Elite), a coluna
  `users.plan`, os gates premium (`FUNDOS_PREMIUM`, limites de avatar IA por plano) —
  é exactamente isso que o IAP vai vender. `/planos` mostra os 3 planos com um lugar
  digno "assinatura disponível no app das lojas (em breve)" em vez de botão morto.
- **Nota (lojas secundárias):** existe a alternativa de lojas Android secundárias
  (fora da Play Store, em alguns mercados) — **ignorada por decisão do dono**; as duas
  lojas principais (Apple + Google) cobrem o mercado-alvo.
- **Vaga futura "App nas lojas":** é onde o IAP real se liga (StoreKit/Billing,
  webhook de servidor→servidor de cada loja a atualizar `users.plan`), o Gabinete→
  Receita ganha números reais, e o botão de `/planos` passa a fazer algo.
