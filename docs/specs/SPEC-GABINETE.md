# SPEC — Gabinete do Dono (`/gabinete`)

> Papel, não código. Rota **super-admin exclusiva**. Última peça da fase Segurança
> (ordem em SPEC-SEGURANCA v2). **Mockup antes de código.**

## O que é
- Uma **rota nova `/gabinete`** (super-admin), separada do `/super` operacional atual.
- Não é uma tabela de gestão — é uma **linha do tempo scrollável no cânone** (vidro,
  aurora, 45°, Rajdhani) que conta a história do produto ao dono, de relance.
- **Princípio herdado da Segurança:** o dono é **cego ao conteúdo**. Aqui tudo é
  **agregado** — zero posts, zero fotos, zero denúncias abertas. Só números e gráficos.

## Secções (scroll de cima a baixo)
1. **Crescimento** — users / equipas / campeonatos **por semana** (gráficos de linha/barras).
2. **Receita** — **Stripe**: MRR, nº de assinantes (por plano), entradas do período.
3. **Operação** — **(v2, NOVO)** a única secção que **administra**, não só lê. Ver abaixo.
4. **Vida** — atividade: posts, sorteios, jogos (volume por período).
5. **Segurança (AGREGADA)** — denúncias **por categoria**, **% auto-resolvida** pela IA,
   **tempo médio** de resolução. **Zero conteúdo** (cego por desenho).
6. **Marcos** — campeões coroados, equipas novas, outros eventos de destaque.

## Secção OPERAÇÃO (v2) — Finanças & Operação da casa
> Pedido do dono: **administração completa** do custo/saúde do negócio, não só leitura.
> Continua **cega ao conteúdo** (só dinheiro/infra, zero PII). Dados editáveis vivem em
> **Storage JSON** (mesmo padrão dos campeonatos) — DDL nenhum. 4 blocos:

- **(a) Custos fixos da casa** — lista VIVA das assinaturas que o app paga (Railway ~$5/mês,
  Supabase free hoje, Vercel free, fal.ai por uso, domínio anual, Anthropic API por uso —
  triagem de denúncias). Cada custo: **valor · ciclo · próxima renovação · estado**.
  **EDITÁVEL à mão** pelo dono (adicionar / editar / remover; formulário simples → Storage JSON).
- **(b) Burn & Margem** — total mensal de custos **vs** MRR (Stripe) → **margem líquida + runway
  visual**: "o app paga-se?" num relance. (Depende do Stripe para o lado da receita; sem
  Stripe, mostra só o burn e fica "receita por ligar".)
- **(c) Registos & prazos** — o **domínio** (registrar, data de renovação, **dias restantes**,
  **alerta <30d**) + campos livres para outros registos com prazo (marca, licenças futuras).
  Editável como (a).

### MARCA & REGISTOS (estratégia SELADA pelo utilizador — 26 jul 2026)

**BRASIL (INPI, início do mês) — o pedido-base:** logo (**o F**) + nome **FUTTY**.
- **UMA classe por agora: 9 (software DESCARREGÁVEL)** — decisão do utilizador. O Futty vai
  ser **descarregado da App Store e Play Store** (não é só web) → a **9 é a classe correta**
  do produto real.
- **42 (SaaS) deixa de ser prioritária** — **futura e opcional** (só se o lado web-assinatura
  merecer proteção própria mais tarde).
- **Classes FUTURAS — só quando forem reais** (nunca antes: **caducidade por não-uso em 5
  anos**): **35** (venda de espaço publicitário), **25** (vestuário/camisetas), **41** (eventos
  desportivos).
- **ANTES DE TUDO: busca de anterioridade GRÁTIS** (Busca Marcas INPI) para **Futty / Futti /
  Futy** nas classes **9 / 41** (e 42 se um dia entrar). Sem colisão → deposita.

**INTERNACIONAL — a janela de prioridade (Convenção de Paris):** o depósito no INPI abre
**6 MESES** para depositar no estrangeiro **mantendo a data brasileira**. Duas vias:
- **EUIPO** (marca da UE — cobre os **27 de uma vez**; prioridade por ser **Portugal**).
- **Protocolo de Madrid** (pedido único à **OMPI**, vários países; mais barato que
  país-a-país; entra assim que o INPI **publicar na RPI**).
- **RISCO A REGISTAR — "ataque central":** o pedido Madrid **depende do pedido-base
  brasileiro por 5 ANOS** — se o **INPI recusar**, os internacionais **caem juntos**.

**O GABINETE MOSTRA (bloco "Marca & Registos", na secção Operação):**
- **Estado por pedido:** país · classe · nº de protocolo · data de depósito · estado.
- **Janela de 6 meses (Paris):** contagem decrescente + **alerta a 60 / 30 dias**.
- **Datas de renovação (10 anos)** por marca concedida, com dias restantes/alerta.
- **Contas das lojas:** custo **anual Apple (~$99/ano)** + custo **único Google (~$25)** →
  entram no **burn mensal** (o anual rateado; ver (a) Custos).
- **Estado da política de privacidade:** **por publicar / publicada + data** (obrigatória para
  as lojas — ligada ao que falta formalizar na **LGPD**).
- **Custos** de cada pedido/renovação **entram no burn mensal** (linha em (a) Custos).
- **Todos os campos editáveis à mão pelo dono** (como (a)/(c) — o Gabinete não deposita nada,
  só regista e avisa).

### VAGA FUTURA — "APP NAS LOJAS" (pós-Segurança; registada 26 jul 2026)
Empacotar o **web app** para App Store + Play Store **sem reescrever nada**: **TWA** (Android)
e **Capacitor / WebView** (iOS). Requisitos a preparar (não antes da Segurança fechar):
- **Contas developer:** Apple **~$99/ano**, Google **~$25 única** (já refletidas no bloco acima).
- **POLÍTICA DE PRIVACIDADE PUBLICADA** — **obrigatória** nas duas lojas; liga ao que falta
  **formalizar na LGPD** (ver estado no bloco acima).
- **Classificação etária** (age rating) declarada em cada loja.
- **Conteúdo gerado por utilizador (UGC):** as lojas exigem filtro + denúncia + moderação — a
  **fase Segurança** (NSFWJS, denúncias, moderação, bloqueio) **já as cobre**.
- **Fase:** só **DEPOIS da Segurança**; só por ordem expressa. Sem custo até então.
- **(d) Cobertura de venda** — onde o Stripe **vende** e onde **não** (países/moedas suportados
  vs bloqueados — "onde o mundo não nos compra"). Por agora **informativo**: dados à mão +
  o que o Stripe expõe.

> **Lei mantida:** Operação é a exceção "administra" ao Gabinete-que-só-lê, mas continua
> cega ao conteúdo — mexe em **dinheiro e infra**, nunca em utilizadores/posts.

## Base de medição — o que o Super ATUAL já dá (ponto de partida)
Rota `/super` (guard super-admin), 3 tabs:
- **Utilizadores:** lista paginada; mudar plano (free/pro/elite); suspender/reativar.
- **Equipas:** nome, slug, nº de membros, data de criação; apagar.
- **Stats** (`GET /api/super/stats`): **6 cartões planos** — `total_users`, `total_teams`,
  `users_pro`, `users_elite`, `users_hoje`, `teams_hoje`.

### O que já existe vs. o que o Gabinete precisa
| Gabinete quer | Super hoje tem | Falta |
|---|---|---|
| Crescimento semanal (série temporal + gráficos) | totais + "hoje" (números soltos) | agregação por semana; componente de gráfico no cânone |
| Campeonatos por semana | — (nada de campeonatos no Super) | métrica nova |
| Receita (MRR, assinantes, entradas) | plano por user (pro/elite) | **integração Stripe** + agregados de receita |
| Vida (posts/sorteios/jogos) | — | métricas de volume por período |
| Segurança agregada | — | vem da fase Denúncias+Triagem (categorias, %, tempo) |
| Marcos (campeões/equipas novas) | equipas (lista), sem campeões | feed de marcos |
| **Look** | cartões #111/#222 (fora do cânone) | **redesenho no cânone** (vidro/aurora/45°/Rajdhani) |

> Resumo: o Super atual cobre **utilizadores + equipas + 6 totais**. O Gabinete é uma
> **camada nova de leitura** (série temporal, receita, vida, segurança agregada, marcos)
> no cânone — não substitui o `/super` operacional; senta-se ao lado dele.

## Dependências
- **Segurança agregada** só existe depois da peça Denúncias+Triagem estar de pé.
- **Receita** depende do Stripe estar ligado (fase própria).
- Construir **por último** na fase Segurança (ver ordem na SPEC-SEGURANCA v2).

## SPEC v3 — PUBLICIDADE como linha de negócio (23 jul 2026)
> Ordem do dono: controlo TOTAL — financeiro, tempo, gráficos, tendências. Nova SECÇÃO
> própria **"Publicidade"**, entre **Receita** e **Operação**. Implementa-se na Fase B.

- **Medição no motor** (arquitetura BannerAd, backend nosso): cada render = IMPRESSÃO,
  cada toque = CLIQUE → endpoint leve, **agregação diária em Storage JSON**; zero cookies
  extra, zero scripts externos. Respeita a **lei de menores** selada: impressões de
  menores/anónimos **nem existem** para banners 18+ (nunca renderizam).
- **Campanhas com dinheiro** — campos por banner/campanha: anunciante · valor acordado ·
  modelo (fixo mensal / por período) · datas início-fim · estado (ativa/pausada/terminada).
  Classificação etária por banner (livre/18+; default 18+ = fail-closed). Geridas no Gabinete.
- **Painel de Publicidade**: (a) receita de ads do período + tendência (linha);
  (b) por campanha: impressões · cliques · CTR · dias restantes · valor; (c) por página:
  onde os olhos estão (sorteio vs /p/ vs futuras); (d) comparativo ads vs assinaturas
  (empilhado); (e) alertas: campanha a expirar <7d · banner sem cliques.
- **Toggles por página** (sorteio in-app · /p/ · futuras) vivem aqui; default DESLIGADO.
- Estado vazio digno: "sem campanhas ativas".
