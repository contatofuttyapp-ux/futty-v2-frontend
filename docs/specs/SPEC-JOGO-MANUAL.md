# SPEC-JOGO-MANUAL — jogo avulso com times definidos à mão

> Pergunta do utilizador (25 jul 2026). **ZERO implementação** — só verificação + registo.
> Fase: **DEPOIS do transplante do sorteio** (o sorteio fecha o look primeiro).

## 0. O que existe HOJE (verificado no código real)
- **Não há caminho manual antes do sorteio.** `NovoJogo.jsx` só recolhe data/hora/local +
  `jogadores_por_time` e faz POST `/api/games` (sem times); o texto diz "o nº de times é
  calculado automaticamente no sorteio". Na `Jogo.jsx`, os times vêm SEMPRE de
  `times_resultado`, produzido por `POST /api/games/:id/sortear`. **O sorteio é a ÚNICA via.**
- **Único "manual" hoje = pós-sorteio:** `components/TimesEditor.jsx` ("editor manual dos
  times pós-sorteio") — edita um resultado JÁ sorteado (`PATCH /api/games/:id/times`), precisa
  do resultado semeado pelo sorteio; **não compõe times do zero**.
- **Composição manual do campeonato NÃO é componente reutilizável:** vive INLINE no `Wizard`
  de `pages/Campeonato.jsx` (passo 4 "Montar à mão" — seletor de time + chips do plantel +
  pool de jogadores a atribuir). Estado local (`atrib`, `timeSel`, `nomes`, `convidados`),
  sem props, acoplado ao wizard; submete `criar('manual')` → `/api/equipas/:slug/campeonatos`
  com `plantel`. **Para reusar num jogo avulso, tem de ser EXTRAÍDO primeiro** para um
  componente próprio (props-driven). O único helper extraído é `MiniAvatar`.

## 1. Requisito (o jogo avulso com times à mão)
- **(a) Toggle "definir times à mão" no criar-jogo (só ADMIN):** alternativa ao sorteio. Ao
  ligar, abre a composição manual → **REUSA o componente de composição do campeonato**
  (pré-requisito técnico: extrair o passo-4 de `Campeonato.jsx` para um componente
  props-driven partilhado — `ComporTimes`/`TeamComposer` — consumido por campeonato E por
  jogo avulso). Guarda direto em `times_resultado` (mesma forma que o sorteio produz), sem
  passar pelo endpoint de sorteio.
- **(b) Identidade dos times = a paleta SELADA:** OURO / ROXO / PRATA / BRONZE (moldura + cor
  da casa, via `MARCA_TIME`). **Zero gerações de kit**; o time herda só a cor/medalha.
- **(c) Jogo manual DISPENSA a cerimónia** (times já definidos → não há suspense a encenar).
  **Opção FUTURA registada — "revelar com a máquina":** mesmo sendo manual, o admin PODE
  encenar o reveal no cassino (a máquina nova) como espetáculo — decisão do utilizador quando
  chegar a vez; custo/escopo a discutir então.
- **(d) Uniforme personalizado por time = consome o futuro "Kit da Equipa"** (pós-Segurança,
  premium). Cross-ref **SPEC-UNIFORMES** — o jogo manual NÃO gera kit; quando o Kit da Equipa
  existir, cada time manual pode vestir o kit premium da equipa em vez da medalha.
- **(e) Fase:** **DEPOIS do transplante do sorteio** (app ↔ /p/). Não antes.

## 2. Pré-requisito técnico (quando implementar)
1. Extrair o passo-4 "Montar à mão" de `Campeonato.jsx` → componente `ComporTimes` (props:
   pool de jogadores, nº de times, atribuição inicial, callback de submit). Campeonato passa
   a consumir o componente extraído (sem regressão do wizard).
2. `NovoJogo.jsx`: toggle admin "definir à mão" → renderiza `ComporTimes` → guarda
   `times_resultado` (paleta selada), sem `/sortear`.
3. `Jogo.jsx`: aceitar times de origem manual (badge "à mão") a par dos sorteados; `TimesEditor`
   continua a funcionar por cima (é o mesmo shape).
