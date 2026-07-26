# SPEC-JOGO-RETROATIVO — o admin carrega histórico (jogo com data passada)

> Pergunta do utilizador (26 jul 2026). **ZERO implementação** — só verificação + registo.
> Fase: implementa-se **JUNTO com o jogo manual** (é a MESMA peça de composição) — a vaga
> seguinte. Cross-ref **SPEC-JOGO-MANUAL** (o `ComporTimes` extraído é o pré-requisito comum).

## 0. O que existe HOJE (verificado no código real)
- **(a) Data passada — JÁ ACEITE.** `POST /api/games` grava `data: new Date(data).toISOString()`
  **sem validar futuro** (`routes/games.js`); o input do `NovoJogo.jsx` (`type="date"`) **não
  tem `min`**. Ou seja: criar um jogo com data de ontem já funciona hoje, sem código novo.
- **(b) Resultado — NÃO exige sorteio nem presenças.** `PATCH /api/games/:id/resultado` só pede
  `role === 'admin'`; aceita nível/placar/vencedor sem `sorteio_realizado` nem confirmados. **MAS**
  os **golos por jogador** mapeiam o time (A/B) a partir de `times_resultado.times` — sem times
  definidos, o golo não sabe a que time pertence. Logo, para lançar golos-por-jogador é preciso
  ter os **times definidos** (via sorteio OU composição manual).
- **(c) Presenças — SÓ o próprio se confirma.** `POST /api/games/:id/confirmar` grava sempre
  `user_id: req.user.id`; **o admin NÃO consegue marcar presença por outros** (nem aqui nem no
  RSVP, que também é self-service). **Este é o buraco central do retroativo:** um jogo de ontem
  não vai ter toda a gente a abrir a app para confirmar.
- **(d) Ranking — AGNÓSTICO À DATA.** `routes/ranking.js` agrega stats de `team_members`
  (gols/vitórias/artilharia/destaques) + votos + presença confirmada; **não filtra pela `data`
  do jogo** (o corte de presença é por `created_at` do `game_players`, não pela data do jogo).
  Um jogo com data passada, com presenças + resultado, **conta normalmente** para o ranking.

**Resumo:** data passada e contagem no ranking **já dão hoje**; falta (i) o admin **marcar quem
jogou** sem esperar confirmações, e (ii) **definir os times à mão** (a peça do jogo manual).

## 1. Fluxo enxuto (o que a vaga entrega)
1. **Criar jogo com data passada** (só admin) — o mesmo criar-jogo; input de data sem `min`
   (ou com aviso "jogo já aconteceu?"). Marca-se **`historico = true`**.
2. **Escolher quem jogou** — **checklist dos membros da equipa** (+ toggle GR por jogador),
   marcada PELO ADMIN, **sem esperar confirmações**. Novo caminho de escrita: o admin grava
   `game_players.confirmado` por `user_id` escolhido (endpoint admin, distinto do self-confirm).
   **Convidados sem app** entram como **nome solto** (mesma via do sorteio — SPEC-SORTEIO §11).
3. **Definir os times à mão** — **REUSA `ComporTimes`** (o componente extraído do passo-4 do
   Campeonato — ver SPEC-JOGO-MANUAL §2); grava em `times_resultado` na mesma forma que o
   sorteio produz, **sem passar pelo endpoint de sorteio**. Identidade = paleta SELADA
   OURO/ROXO/PRATA/BRONZE (`MARCA_TIME`), zero kit.
4. **Lançar resultado + golos** — `PATCH /api/games/:id/resultado` (já existe); com os times
   definidos, os golos-por-jogador mapeiam A/B corretamente.
5. **Conta para o ranking** — automático (o ranking é agnóstico à data; §0-d).

## 2. A marca "histórico" (para não encenar o que já passou)
- **`historico = true`** (flag no jogo): **NÃO dispara notificações** (nem "sorteio realizado"
  nem RSVP), **NÃO abre a cerimónia/cassino** (não há suspense a encenar — o jogo já foi),
  **NÃO pede confirmações**. É carregamento de dados, silencioso.
- O jogo histórico aparece no passado da equipa (lista/ranking) como qualquer outro; distingue-se
  só por não ter tido cerimónia nem notificações.

## 3. O que falta construir (delta face ao que já existe)
- **Endpoint admin de presença por terceiros** (marcar `game_players.confirmado` por `user_id`
  escolhido) — hoje só existe o self-confirm. É o núcleo do retroativo.
- **Flag `historico`** no jogo (silencia notificações/cerimónia) — DDL mínima OU derivável de
  "data < hoje no momento da criação" (decidir na vaga; preferir flag explícita).
- **`ComporTimes` extraído** (partilhado com o jogo manual) — pré-requisito comum.
- **UI do criar-jogo:** ramo "jogo já aconteceu" → checklist de presenças + composição + resultado.

## 4. Fase
- **JUNTO com o jogo manual** (mesma peça `ComporTimes`, mesma escrita direta em `times_resultado`).
  O retroativo = jogo manual + (presença por admin) + (flag histórico). Não antes do jogo manual;
  não antes do sorteio estar fechado. **SÓ por ordem expressa do utilizador.**
