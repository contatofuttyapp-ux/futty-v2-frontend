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
- Loading: `LoadingFutty`/`FuttyLoader` (o F pinta-se); `.page-reveal` na entrada.
- **Vitrine (herói): glow SELADO** — transplante byte-a-byte do harness variante A
  (palco 330×470, glow 300×344 blur46 `respiraA` no PRÓPRIO glow, cutout 250×284 sem
  drop-shadow). Ref: `docs/looks/vitrine-glow-aprovado.png`. Nunca reescalar "para o
  app"; alterações requerem NOVA aprovação visual.

## Regras de produto vivas
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

## Higiene (limpeza futura, NUNCA automática)
- `teams` tem 2 "Teste 1" duplicados de 3 jun (`teste-1-ktbig`, `teste-1-0a2ej`) —
  limpar na vaga de higiene pré-lançamento, só com ordem expressa. Nunca apagar sozinho.

## Specs e bancada
SPECs (papel) e mockups vivem no scratchpad da sessão (servidos em 8791):
SPEC-SORTEIO / SPEC-EQUIPAS / SPEC-CAMPEONATOS / SPEC-SEGURANCA / SPEC-REDE-SOCIAL.
Dev: frontend 5173 (+5174 conta de teste), backend 3001, bancada 8791.
