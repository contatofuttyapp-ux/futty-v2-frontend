# FUTTY — Constituição (frontend)

App de futebol amador. React + Vite. Este repo (`FUTTY-V2/frontend`) é o CANÓNICO;
o clone antigo `FUT/FUTTY/frontend` é só arqueologia (medições da V1) — nunca editar.

## O processo (inegociável)
1. **Mockup-first**: páginas/looks novos nascem na bancada (harness servido em
   `localhost:8791`, painel `censo.html`), NUNCA direto no app.
2. **Look do utilizador**: nada se aplica ao app sem aprovação visual dele; nada se
   COMMITA sem o look final. Trabalho aplicado fica na working tree à espera.
3. **Selo**: commit só após aprovação, mensagens em pt, coordenado com o backend
   quando a vaga toca os dois. Páginas seladas e primitivas partilhadas (F, Topbar,
   avatar-frame, .cta-gold) só se tocam com ordem explícita.
4. **Prova**: toda a entrega se prova no 5173 (screenshots); telegramas curtos.

## O cânone visual
- Material: VIDRO — véu `rgba(255,255,255,0.03)` sobre base transparente; a aurora
  (dourado #d4a017 + roxo #8b5cf6, blobs screen .32 sobre #050810) atravessa.
- Formas: chanfros 45° (`clip-path` octogonal), `.hud-corners`/`.hud-corners-s`.
- Tipografia: Rajdhani para títulos/labels/números; régua medida nas páginas seladas.
- CTAs: `.cta-gold` (âmbar escuro + borda dourada + glint 9s) para a acção primária;
  `.btn--outline` roxo para secundária. NUNCA amarelo chapado.
- Chips: `.chip`/`.chip--active` (activo dourado); GR veste o roxo da casa.
- Avatar: moldura V1 (`.avatar-frame` + cantos L dourados). Escudo: `EscudoEquipa`.
- F metálico: forma original (F_CONTORNO/F_ESQUELETO em `utils/futtyMonograma.js`) +
  pele ouro amostrada da referência — zero branco no metal/glow.
- **Ícones = lucide/Icon da casa (`/icons/*.svg`); emoji SÓ como conteúdo (reações).**
- **LEI DO F:** logo = **SÓ o asset oficial transparente** (`FuttyLogo`/`FuttyLoader` SVG,
  ou `futty-logo-flat.png` RGBA; estático onde não cabe animação). O F de **fundo preto
  sólido** (`futty-logo-metallic.png`, RGB) está **BANIDO** em qualquer estado novo.
- **LEI DA SILHUETA:** placeholder de PESSOA sem foto = **SÓ a silhueta-casa angulosa**
  (`SilhuetaJogador` — cabeça octógono 45° + ombros em rectas com cortes 45°, `currentColor`
  veste a cor do contexto; no sorteio inline como data-uri com o mesmo traço). **Círculos
  genéricos / bustos redondos BANIDOS** — um asset banido morre em TODO o lado, não caso a
  caso. (EscudoEquipa/iniciais de EQUIPA são outra coisa e mantêm-se.)
- Loading: `LoadingFutty`/`FuttyLoader` (o F pinta-se); `.page-reveal` na entrada.
- **Vitrine (herói): glow SELADO** — transplante byte-a-byte do harness variante A
  (palco 330×470, glow 300×344 blur46 `respiraA` no PRÓPRIO glow, cutout 250×284 sem
  drop-shadow). Ref: `docs/looks/vitrine-glow-aprovado.png`. Nunca reescalar "para o
  app"; alterações requerem NOVA aprovação visual.

## Figurinha — fundos do cromo
- Catálogo: Estádio · Épico · **Aura** (glow SELADO da vitrine replicado no canvas —
  base escura + aura dourada elíptica atrás do jogador; valores copiados de
  `.perfil-glow`, nunca reescala o palco selado) · Neutro.
- **GOLDEN = 1º fundo PREMIUM** (instalado, à espera do look de selo): chapa foil única
  (`golden-plate.jpg`, edição da ref Panini) + poeira de diamante "mina encantada" (v5) —
  glints minúsculos com micro-flash de cruz, **atrás do avatar**. Ordem no catálogo:
  Estádio → Aura → Épico → Neutro → **Golden**. **Gate no backend** (`FUNDOS_PREMIUM`,
  planos `['pro','elite']`; super-admin passa) — o cadeado no frontend é só o desejo a
  vender, a verdade é servidor. Preview animado; download leva o pico estático.
- **LEI DO BRILHO DO CROMO:** todo o brilho/vida de um fundo vive **SEMPRE na camada do
  fundo, ATRÁS do avatar** — nada cintila à frente do jogador. Sem varrimento de vidro
  sobre a cara, sem sparkles/cruzes por cima. "Joia na penumbra": glints bokeh, facetas
  de luz ou pulso do próprio gradiente, todos por trás; `reduced-motion` → estático.

## Regras de produto vivas
- **RANKING = onde a escolha do jogador aparece** (fundo + kit da Figurinha = a
  identidade dele). **SORTEIO = palco de evento**; visual próprio (potencial gatilho de
  aposta/suspense) é conversa **FUTURA**, só por ordem expressa do utilizador e com custo
  discutido. **Ambos selados/aprovados — não mexer em nenhum sem ordem.**
- Posição (GL/DEF/MEI/ATA) = decisão do PRÓPRIO jogador (hub da equipa); admin corrige.
- Post nasce/vive na equipa (team_id); alcance global nunca.
- v1 sem upload de vídeo (link embed YouTube/TikTok/IG); partilha = LINK + imagem 9:16.
- Flag `teams.mostrar_gols` (admin) esconde gols/artilharia (radar 5↔3).
- Onboarding dia-1 pede SÓ o que o dia-1 usa (foto quase-obrigatória, nome, GR opcional).

## Conector Supabase (ferramentas)
- **ATIVO em READ-ONLY** (por desenho — segurança). Leituras SQL diretas: SIM.
- DDL/escrita: DESLIGADO. Liga-se por ordem expressa do utilizador editando o
  `.mcp.json` (remover `--read-only`) para corrida pontual, depois volta a fechar.
- Migrações continuam **"DDL à mão"** no Supabase até essa ordem. A `039` = vaga OPCIONAL.

## Segurança — média (tijolo 1)
- **Buckets `avatars` e `resenha` são PRIVADOS.** Os URLs de média são **assinados
  na fronteira da API** (middleware `mediaUrls`, validade 1h); o frontend renderiza
  sem mudança (`urlAsset` passa URLs http tal-qual). Páginas públicas `/api/p/`
  **despublicam** os avatares → silhueta (privacidade; sem expiração).
- **Tradeoff conhecido:** um URL assinado deixado no DOM > 1h sem refetch expira
  (imagem parte até re-render). Fix robusto sem expiração = **proxy de imagem**
  (candidato ao tijolo 2). Não commitar "solução" sem essa ordem.
- **Filtro NSFWJS** corre em TODOS os uploads de imagem (avatar/onboarding/resenha);
  explícito → 403; falha aberta em avaria. **Apagar post apaga o ficheiro no Storage.**

## Higiene (limpeza futura, NUNCA automática)
- `teams` tem 2 "Teste 1" duplicados de 3 jun (`teste-1-ktbig`, `teste-1-0a2ej`) —
  limpar na vaga de higiene pré-lançamento, só com ordem expressa. Nunca apagar sozinho.

## Specs e bancada
SPECs (papel) e mockups vivem no scratchpad da sessão (servidos em 8791):
SPEC-SORTEIO / SPEC-EQUIPAS / SPEC-CAMPEONATOS / SPEC-SEGURANCA / SPEC-REDE-SOCIAL /
SPEC-GABINETE (Gabinete do Dono, `/gabinete` super-admin — última peça da Segurança).
Dev: frontend 5173 (+5174 conta de teste), backend 3001, bancada 8791.
