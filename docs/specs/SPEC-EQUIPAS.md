# SPEC — EQUIPAS v2 (papel; zero código — o sorteio continua à frente)

Estado: **especificação**. Nada aqui está implementado nem prometido para já.
Referências vivas: flag `teams.mostrar_gols` (migration 037, já em produção no selo #16),
`EscudoEquipa` (iniciais + chanfro 45° + cor da equipa, suporta `logo_url`),
SPEC-SEGURANCA.md (moderação), fase de Segurança (gating).

---

## (a) CRIAÇÃO — wizard visual em passos

Substitui o formulário único de `/criar-equipa` por um wizard de 4 passos, cada um
com preview ao vivo (o que escolhes aparece a formar-se no ecrã).

### Passo 1 — Identidade: nome + cor
- Input do nome (o slug nasce daqui, como hoje).
- Selector de cor da equipa (paleta actual: verde/azul/vermelho/preto).
- Preview: o `EscudoEquipa` (iniciais) ganha a cor escolhida em tempo real.

### Passo 2 — Escudo
- **Já:** escudo por iniciais (`EscudoEquipa` — é o fallback canónico, custo zero).
- **Gated:** upload de logo real (`logo_url`) fica **atrás da moderação**
  (fase de Segurança; mesma fila de revisão da SPEC-SEGURANCA). Até lá o botão
  existe mas leva ao aviso "disponível em breve" — não aceita ficheiros.
- Preview: escudo grande no palco, com a cor do passo 1.

### Passo 3 — "Como funciona a tua equipa" (toggles com preview)
Cada toggle mostra um mini-preview do efeito no ecrã real (mock de ranking/vitrine):
- **Mostrar gols** → flag `mostrar_gols` (037, já existe no BD + gating no ranking
  + radar 5↔3 na vitrine). Preview: tile Gols aparece/some.
- **Artilheiro do dia** → toggle novo (coluna a criar quando se implementar;
  mesmo padrão da 037: boolean not null default true). Preview: troféu artilheiro
  aparece/some no pós-jogo.
- **Destaque do dia** → idem (boolean, default true). Preview: troféu destaque.
- Copy do passo: "Podes mudar isto a qualquer momento no painel de admin."
  (o AdminPanel já tem a secção — o toggle mostrar_gols vive lá.)

### Passo 4 — Convites
- **Link partilhável** (o fluxo `/convite/:token` já existe — reutilizar).
- **WhatsApp**: botão `wa.me`/share com mensagem pré-feita
  ("Entra na minha equipa {nome} no Futty: {link}").
- Preview: contador "0 convidados" que o wizard não bloqueia — podes saltar.

### Notas de implementação (para quando chegar a vez)
- O wizard é frontend puro sobre os endpoints existentes (POST /api/teams + PATCH);
  os toggles novos exigem 2 colunas novas (migrations 03x) no padrão da 037.
- Cânone visual: vidro + hud-corners + chips 45°; `.page-reveal`; F único.
- A página `/criar-equipa` está na fila de migração (era antiga) — o wizard É a
  migração dela.

---

## (b) DESCOBERTA — equipas perto de ti

**Fase: Segurança** (não antes). Princípios inegociáveis:

1. **Opt-in explícito** da equipa (admin liga "aparecer na descoberta").
   Default = OFF. Nada é publicado sem acção do admin.
2. **Só localização aproximada DA EQUIPA, nunca de pessoas.**
   - A equipa declara um ponto (ex.: o campo onde joga / bairro), guardado
     com precisão reduzida (arredondar a ~1km; nunca guardar a morada exacta).
   - Zero geolocalização de membros; zero histórico de posições; o browser do
     utilizador só é consultado (com permissão) para ORDENAR resultados — a
     posição do utilizador nunca sai do dispositivo para o BD.
3. **Query por distância no Postgres:** coluna `geo` (point/earthdistance ou
   PostGIS se já disponível no Supabase) + índice; endpoint
   `GET /api/teams/perto?lat&lng&raio` devolve equipas opt-in ordenadas por
   distância aproximada, com contagem de membros e escudo — nunca moradas.
4. **UI:** entra na página `/explorar` (fluxo já existente, por migrar):
   "Equipas perto de ti" + pedido de permissão do browser no momento do uso
   (nunca no arranque). Sem mapa na v1 — lista ordenada chega.

---

## Fila de migração — registo

- **`/equipa/:slug` (detalhe da equipa, design antigo)** — registado na fila
  (censo: "Era antiga"). Evidência do utilizador: a foto enviada mostra o
  detalhe com badges-pill, avatares redondos, zero marcadores do cânone.
  Nota extra: o wizard (a) e o hub `/equipa/:slug` devem selar-se na mesma
  família visual (identidade → hub).

## POSIÇÃO DO JOGADOR (regra de produto — medida 2026-07-19)
**Hoje são DOIS campos** em `team_members`:
- `posicao` (GL/DEF/MEI/ATA) — o PRÓPRIO jogador define no hub da equipa
  (`PATCH /api/equipas/:slug/membros/posicao`); admin também mexe no AdminPanel.
  Alimenta as FILAS do CampoSorteio.
- `categoria` ('GR'|'linha') — SÓ o admin (AdminPanel → PATCH categoria).
  Alimenta o chip GR do ranking/vitrine. (E `goleiro` é flag POR JOGO no sorteio.)

**REGRA:** posição = DECISÃO DO PRÓPRIO JOGADOR, por equipa (self-service no hub);
admin pode corrigir (override no AdminPanel). GR alimenta: sorteio (GR na baliza,
1 por time quando possível — SPEC-SORTEIO) + chip GR do ranking/vitrine.

**Unificação proposta (custo S):** `categoria='GR'` passa a DERIVAR de `posicao='GL'`
(migração de dados 1x + trocar 2 leituras no ranking; o campo categoria morre).

## COR DESPROMOVIDA (decisão 2026-07-19)
Medido: `teams.cor` é puramente cosmética — borda/glow do EscudoEquipa e frames
(`colorOf`/teamColors) em 6 ficheiros; o backend POST cai para 'verde' por default.
**Decisão:** o passo da cor MORRE no wizard — passo 1 = só nome + preview do
escudo-iniciais (cor automática da casa); "mudar cor" fica escondida nas definições
(AdminPanel), não no fluxo de criação. **O caminho é o logo real (gated na moderação,
fase Segurança); a cor é apenas o fallback.**

## ONBOARDING DIA-1 (regra 2026-07-19)
O onboarding pede SÓ o que o dia-1 usa: (1) boas-vindas, (2) a FOTO
(quase-obrigatória, v2), (3) identidade = nome de jogador + "és guarda-redes?"
(GL/linha, opcional — alimenta team_members.posicao quando entrar numa equipa).
NADA de equipa no onboarding: entra-se/cria-se equipa no Início.
Hoje (medido): registo = email+senha+nascimento → /home directo; nome_jogador só
no Perfil; posição só no hub — o dia-1 chega vazio. O v3 fecha esse buraco.

## SAIR DA EQUIPA (regra 2026-07-19; medição + decisão)
**Medido:** a remoção pelo admin é HARD DELETE de `team_members` (a flag `ativo` da
029 existe mas o DELETE não a usa); a história (jogos/gols/votos) referencia
users/teams directamente → o passado FICA, o removido sai do ranking e do futuro.
Auto-remoção está PROIBIDA no endpoint ("Não te podes remover a ti próprio") →
hoje ninguém consegue sair sozinho; o único admin também não (nem há passagem de cargo).

**REGRA:** o jogador pode SAIR sozinho — botão discreto no FIM do hub (acção
destrutiva não compete com o resto) + confirmação "vais sair de {equipa}".
História preservada (idêntico à remoção pelo admin: passado fica, sai do ranking
e do futuro). O ÚLTIMO admin não sai sem passar o cargo; se estiver SOZINHO na
equipa → arquivar a equipa (coluna de arquivo = vaga futura; até lá o backend
recusa com mensagem clara). Regresso = novo pedido de entrada (sem privilégios).

## CAPACIDADE NO /confirmar — VAGA FUTURA (registada 2026-07-26, P2-10)
**Medido:** dois sistemas de presença convivem desconexos. (a) O **RSVP/espera**
(`rsvp_respostas` + `rsvp_espera`, endpoints `/api/jogos/:id/rsvp*`) tem capacidade
real: `POST .../rsvp/responder` respeita `max_jogadores` e empurra o excedente para
a **lista de espera** (`rsvp_espera.posicao`), com promoção automática ao libertar
vaga. (b) O **`/confirmar`** do Jogo (`POST /api/games/:id/confirmar`) NÃO passa por
capacidade nenhuma — confirma sempre, ignora `max_jogadores` e a fila.
**P2-10 (feito):** a página do Jogo passou a MOSTRAR (só leitura) a posição de espera
via `GET /api/jogos/:id/rsvp` (`minha_posicao_espera`) no bloco "A tua presença".
**VAGA FUTURA — "capacidade no confirmar":** unificar os dois caminhos — o `/confirmar`
do Jogo passar a respeitar `max_jogadores` e a alimentar/consumir `rsvp_espera` (ou
redirecionar para o fluxo RSVP). Decisão de arquitetura backend; **só por ordem
expressa** (toca lógica de capacidade e promoção — risco de duplicar contagens).

## RANKING VAZIO — IDEIA FUTURA (registada 2026-07-26, P3-18; SEM prioridade)
O Ranking está **SELADO** (ordem do utilizador). O P3-18 melhorou só o ramo genuíno
`ranking.length === 0` (vazio digno + CTA "Criar o 1º jogo" para admin). Observação:
hoje uma equipa **sem jogos** NÃO mostra lista vazia — mostra os **membros** com
"— · por votar" (informativo, é o estado normal). Alargar o vazio-digno a esse estado
("ainda sem jogos") tocaria o **display selado** do Ranking → **ideia futura, sem
prioridade, só por ordem expressa.** Até lá, a lista "por votar" fica como está.

## COLUNAS VESTIGIAIS — team_members.gols/vitorias/artilharia/destaque (26 jul 2026)
**RANKING VIVO** passou a calcular os 4 eixos **da fonte** (`gols_jogadores` + `times_resultado`
× `time_vencedor` + `games.artilheiro/destaque_user_id`), via `utils/agregados.js`, usado pelo
ranking, pelo `/api/me` e pela lista do AdminPanel (uma só verdade). As colunas
`team_members.gols / artilharia / vitorias / destaque` **deixaram de ser lidas em todo o app** —
são **VESTIGIAIS** (seed de testes, nunca alimentadas). **Candidatas a `DROP` na vaga de higiene
pré-lançamento — nunca automático, só por ordem expressa** (ver bloco Higiene do CLAUDE.md).
