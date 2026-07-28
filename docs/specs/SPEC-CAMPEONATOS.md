# SPEC — CAMPEONATOS (completa; zero código)

**Implementação: DEPOIS do sorteio real** — dependência directa da máquina aprovada
(slot v8): a cerimónia de sorteio de times/grupos é a mesma família.

## Medição (estado de hoje)
- **Página `/equipa/:slug/campeonato` (design antigo, 130 lin):** mostra o campeonato
  ACTIVO da equipa — classificação + jornadas; admin "regista jornada N de M" e pode
  TERMINAR (`POST /api/campeonato/:id/terminar`). Vazio: "Este time ainda não tem campeonato".
- **BD:** `campeonatos` + `campeonato_jornadas` (migração 026) — modelo de jornadas
  interno à equipa. **V1: não tinha campeonatos** (zero referências no código antigo).

## Decisões (produto)
1. **Criado pelo admin, dentro da equipa** (team_id — alcance da casa; global nunca).
2. **Times próprios do campeonato** — não são os times do ranking:
   - formados por **sorteio pela máquina aprovada** (slot v8, mesma cerimónia) **OU manual**;
   - plantel = **membros da equipa + convidados sem app** (SPEC-SORTEIO §11/§12:
     só nome, cromo genérico/silhueta, zero impacto em `users`).
3. **Formatos v1 = pontos corridos e mata-mata.** Grupos (fase de grupos → mata-mata) = v2.
4. **Rodadas geram JOGOS** (reutiliza o rito do jogo: presença/resultado);
   **admin lança resultados**; **tabela (pontos corridos) / bracket (mata-mata)
   actualizam automaticamente**.
5. **Ranking da equipa INTOCADO** — nota/votos/artilharia do ranking vivem fora;
   o campeonato tem a sua própria contabilidade (a flag mostrar_gols não interfere).
6. **Campeão = celebração da casa** (jackpot/celebração aprovada, cores da casa)
   + **partilha LINK + IMAGEM 9:16** (mesma regra da SPEC-SORTEIO §9 — vídeo morto).
7. **Auto-post na Resenha = backlog** (não entra na v1).

## Dados (evolução da 026, a auditar na vaga)
- `campeonatos`: + formato ('pontos'|'mata'), estado, campeao_time (do próprio campeonato).
- Nova: `campeonato_times` (id, campeonato_id, nome, cor-da-casa, jogadores JSONB —
  membros por user_id + convidados por nome).
- `campeonato_jornadas`/`confrontos`: liga jogos ↔ rodadas; resultado por confronto.
- Convidados/times avulsos NUNCA entram em `users`/`teams`.

## Dois fluxos oficiais de montagem (Vaga 11C)
- **ESCOLA** (manual, times prontos, admin total): o admin nomeia os times e —
  OPCIONAL — atribui jogadores à mão (membros + convidados, toca para colocar no
  time selecionado; contador por time; quem sobra NÃO joga, não é reserva). Times
  só com nome continuam válidos ("5º A vs 5º B", sem detalhar quem). Serve escolas/
  turmas onde os times já existem.
- **AMIGOS** (cerimónia sorteia tudo): "Sortear pela cerimónia" — a máquina do
  sorteio (slot v8, semeada) distribui membros + convidados pelos N times e revela
  com a animação. Serve a pelada onde se quer equilíbrio e surpresa.
- Em qualquer fluxo os **convidados sem app** entram só por nome (cromo genérico/
  silhueta), zero impacto em users/ranking.

## Pódio + faixa de campeão (Vaga 11C)
- **PÓDIO** (campeonato terminado, 3+ times): celebração inclui 1º OURO / 2º PRATA
  / 3º BRONZE — **um só time por degrau**. Pontos = top-3 da tabela final. Mata =
  campeão / vice (perdedor da final) / **3º = o semifinalista derrotado com melhor
  campanha** (saldo de gols do torneio; desempate golos marcados; último critério
  determinístico pela ordem/seed dos times). Degraus
  no cânone (2·1·3, 1º maior + glow), escudo por cima. **Cartão 9:16 do PÓDIO** ao
  lado do cartão do campeão (mesma via de imagem da SPEC-SORTEIO §9).
- **SELOS DE HONRA na figurinha** (a fita diagonal foi ABANDONADA; referência: badge
  de manga da Copa 2026): a honra passa a um **selo** — primitiva única, retrato 3:4
  vertical, escudo chanfrado do cânone, **troféu da casa** ao centro, faixa com o
  nome da honra, **base metálica por tier** (OURO/PRATA/BRONZE, a pele metálica do F
  como material). Pequeno no cromo (~16% da largura), legível. Mockup: selos-honra.html.
  - **Variantes**: (a) Campeonato/pódio — 1º ouro "CAMPEÃO", 2º prata "VICE", 3º
    bronze "3º LUGAR" (nome do torneio elipsado, nunca corta); (b) **ARTILHEIRO** do
    campeonato (ouro, ícone bola+troféu) — **v2**: os resultados do campeonato hoje
    só guardam placar por confronto, não golos por jogador; entra quando esse dado
    existir; (c) **Ranking** da equipa — 1º/2º/3º ouro/prata/bronze "RANKING".
  - **IMPLEMENTADO (Vaga 11C, sem commit)**: forma A (postal denteado) + varrimento
    de vidro; backend `GET /api/me/selos` e `/api/equipas/:slug/jogador/:id/selos`
    (lê Storage dos campeonatos + `buildRanking`, sem DDL); desenhados no canvas do
    cromo (máx 2, canto sup. direito, download/partilha levam-nos); olhinho na
    Figurinha (persiste em localStorage); vitrine mostra todos (ativos+históricos).
  - **No cromo**: canto superior direito, contido no frame, **máx 2 visíveis**
    (prioridade campeonato > artilheiro > ranking); o resto vive só na vitrine.
  - **Prazos**: selos de **campeonato/artilheiro = 30 dias** no cromo → depois
    conquista na vitrine. Selos de **RANKING = vivos** (posição atual, sem prazo;
    saem se a posição cair).
  - **Olhinho**: o jogador pode **ocultar** qualquer selo do seu cromo (toggle na
    Figurinha) — a honra continua na vitrine.
  Antes disto (histórico), a hipótese era uma fita dourada diagonal: jogadores com
  `user_id` no time campeão ganhavam "CAMPEÃO · {nome}" no cromo — por
  **30 dias** a partir do fim (`terminado_em`). Desenhada no canvas (aparece no
  download/partilha). Depois dos 30 dias: **sai do cromo** e fica **conquista na
  vitrine** ("Campeão: {nome}", troféu). Backend: `GET /api/me/faixas` lê do Storage
  dos campeonatos (sem DDL); `ativa` até 30 dias, `dias_restantes`. **Convidados
  (sem user_id) aparecem no pódio mas NUNCA levam faixa** (não têm cromo).

## Fotos de convidados (futuro, PÓS-Segurança)
- Hoje e até à Segurança: **convidado = nome + silhueta** (sem foto), zero impacto
  em users/ranking.
- Futuro (gated, pós-Segurança): permitir **foto do convidado** com:
  - **termo 1-clique** — "declaro ter autorização da pessoa para usar esta foto; a
    responsabilidade é minha" (aceite + timestamp guardados, como o termo dos
    uniformes);
  - **remoção em 1 toque** — pela própria pessoa (se reclamar) ou pelo admin;
  - **âmbito restrito** — a foto vive SÓ no contexto do campeonato (não entra no
    perfil/cromo/ranking; o convidado continua sem conta).
- Racional: privacidade de quem não escolheu estar no app — só entra com
  autorização declarada e sai a qualquer momento.

## UI (cânone, quando chegar a vez)
- A página actual migra na transversal (lote 5) e torna-se a casa disto:
  header do campeonato → tabela/bracket (vidro 45°) → rodadas → registo de resultado
  (admin) → celebração do campeão.

## CAMPEONATO A PARTIR DE TIMES SORTEADOS (spec registada 27 jul 2026 — vaga de funcionalidade, não design)
**Pergunta:** dá para criar um campeonato reusando os times que saíram de um sorteio?

**Estado HOJE (medido no código):**
- (a) **Não há caminho de reuso.** O `times_resultado` de um sorteio é usado no Jogo/Sorteio/
  Admin (mostrar/editar/partilhar), mas **nunca** alimenta a criação de campeonato. Não existe
  botão nem endpoint "criar campeonato com os times deste sorteio".
- (b) **A porta de times pré-formados JÁ EXISTE, mas é preenchida à mão.** O `POST
  /api/equipas/:slug/campeonatos` no modo `manual` aceita `plantel[i]` (jogadores por time);
  o wizard (`Campeonato.jsx` + `ComporTimes`) envia esse `plantel` — mas composto **à mão** pelo
  admin, não importado de um sorteio.
- (c) **Estruturas COMPATÍVEIS (não idênticas).** Sorteio: `times[i] = [{user_id, nome, rating,
  goleiro, cabeca_chave, avatar_url, convidado}]`. Campeonato: `{id, nome, cor, jogadores:
  [{user_id, nome, avatar_url, convidado}]}`. O jogador do campeonato é um **subconjunto** do do
  sorteio (larga rating/goleiro/cabeça). As **cores do campeonato já são a paleta selada**
  (`ouro #d4a017 · roxo #8b5cf6 · prata #aab4c8 · bronze #c2652e`, por índice) — a mesma identidade
  do sorteio. Logo, **não é preciso formato novo**: um adaptador pequeno mapeia time-de-sorteio → plantel.

**FLUXO A CONSTRUIR — "Criar campeonato com os times deste sorteio":**
1. Num Jogo com **3+ times sorteados** (`times_resultado.numTimes >= 3`), um botão **"Criar
   campeonato com estes times"** (admin) leva ao wizard do campeonato **com os times JÁ PREENCHIDOS**:
   nomes + jogadores + cores ouro/roxo/prata/bronze (por índice, a paleta selada).
2. O admin **só escolhe o formato** (pontos corridos / mata-mata) e **confirma**. Nada de montar de raiz.
3. **Reuso:** o adaptador converte `times_resultado.times` → `nomes[]` (MARCA_TIME do sorteio) +
   `plantel[]` (map dos jogadores, largando os campos extra) → `POST …/campeonatos {modo:'manual',
   formato, nomes, plantel}`. Reaproveita `ComporTimes`/estrutura existente (times já preenchidos,
   editáveis antes de confirmar).
4. **Limites:** campeonato aceita **2–8 times** (`MIN_TIMES`/`MAX_TIMES`). Se o sorteio tiver >8,
   avisar/cortar. Botão só aparece com 3+ (com 2 é um jogo único, não um campeonato).
5. **Identidade = paleta selada** (não reescala nem inventa cores). Ranking da equipa intocado.

**Fase:** vaga de FUNCIONALIDADE (não design). Implementar quando o PT-BR e as vagas em curso
fecharem — ou antes, por ordem expressa. Não agora.

## CONFIG DE STATS POR CAMPEONATO (spec registada 28 jul 2026 — vaga futura)
Hoje o campeonato só regista **placar** (P/J/V/E/D/GP:GC/SG). Vaga futura: o admin liga/
desliga, **por campeonato**, os eixos extra — golos por jogador, artilharia, destaque —
**herdando o default da equipa** (a flag `teams.mostrar_gols` já existe; o campeonato ganha
o seu próprio toggle, começando igual ao da equipa mas podível de divergir — ex.: liga
artilharia só na final). Sem isto, o campeonato não tem "artilheiro do campeonato" nem
"melhor em campo" — só quem ganhou o confronto.

## CAMPEONATO HISTÓRICO / RETROATIVO (spec registada 28 jul 2026 — ordem expressa do dono, vaga futura)
Espelha o **Jogo manual/retroativo** (SPEC-JOGO-RETROATIVO): permitir lançar um campeonato
que já aconteceu **antes do Futty existir** — datas passadas, confrontos e resultados
digitados à mão, sem sorteio nem cerimónia. Serve para o **mural de campeões antigos**: uma
pelada que já teve 5 campeonatos ao longo dos anos consegue trazer essa história para o app,
não só o que nasce daqui para a frente. Reusa `store.criar()` no modo manual (já suporta
plantel à mão) — falta só a UI de "criar no passado" (datas retroativas, sem cerimónia) e o
selo de "histórico" (como o jogo manual/histórico já tem, silencioso). **Não implementar sem
ordem** — registado para quando a vaga for priorizada.
