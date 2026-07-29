# SPEC — Sorteio no cânone (campo-palco + slot de cromos)

> Documento de direcção. Fora do repo (scratchpad). Material = **VIDRO** (véu 3% sobre base transparente, a aurora atravessa). Pendente único: **o verde do campo-palco carece do OK do utilizador.**

## 1. Palco fixo — o CAMPO-PALCO
- Campo de futebol nocturno em **perspectiva leve** (3D suave, `perspective(~680px) rotateX(~38deg)`).
- Relvado **escuro**, família do fundo "estádio" da Figurinha — **NADA de verde-TV**. Gradiente `#0e2415 → #060d08`.
- Linhas do campo subtis: branco baixo-alpha (~0.10) ou dourado ténue. Meio-campo + círculo.
- **Vidro** por cima (véu translúcido) + **aurora viva** por trás. Vinheta escura em baixo para legibilidade.
- **Fixo e independente do nº de jogadores** — é o pano de fundo do módulo inteiro.

## 2. Dados reais (não inventar táctica)
- O **split** (backend `utils/sorteio.js`) só conhece: **GR (goleiro)**, **cabeça-de-chave** (seed), **rating**. Sem posições tácticas.
- As **FILAS** vêm da **posição declarada** por jogador (GOL/DEF/MEI/ATA, preferência do team-member) + **formações por tamanho** (presets do `CampoSorteio`): 4→GL1/DEF1/ATA2 · 5→GL1/DEF2/ATA2 · 6→GL1/DEF2/MEI2/ATA1 · 7→GL1/DEF2/MEI2/ATA2 · 8→GL1/DEF2/MEI3/ATA2 · outros→genérico (GL1 + espalha).
- Filas **equilibradas visualmente**, não táctica. **GR sempre na baliza (base).**

## 3. Cromo
- **Sempre EM PÉ** (2:3 é identidade). Se a escala apertar → **compacto** = cara V1 + placa do nome (como a referência). **NUNCA deitado.**
- Ao travar: **pop** + **glow da cor da equipa** + fica a **FLUTUAR** (delays desfasados, reduced-motion desliga).
- GR: trava com o **chip roxo**, momento próprio.

## 4. Sequência fundida (o fluxo)
1. **Countdown-herói** sobre o campo vazio (Rajdhani dourado, palco próprio, glow pulsante).
2. **Slot de cromos** em 1º plano — rolos (coluna por equipa) girando cromos desfocados.
3. **Trava** um jogador de cada vez → o cromo **VOA** do rolo para a sua posição no campo e fica a flutuar.
4. Campo **enche ao vivo**, travas **alternadas entre equipas** (drama de draft).
5. **Explosão final** nas cores das equipas (confetti).
6. **Frame final = escalação completa** no campo.

## 5. Formações + banco
- Presets por tamanho (secção 2). Sobra (acima do tamanho do time) → **BANCO**: faixa fixa na base do campo, mini-cromos, ordenada por rating, "próximo a entrar".
- Nomes **truncam com elegância**.

## 6. Multi-equipas — carrossel
- **Um campo por equipa**, em **carrossel 1/N** (o "1/2" da referência) — setas + pontos + índice.
- **Aguenta 6-10 equipas** (1 campo visível de cada vez, não espreme). Substitui a **pilha longa** do `DrawnTeams` no ecrã de resultado.

## 7. Organizador (página de config)
- **Opções REAIS hoje:** marcar **GR / cabeça-de-chave** por jogador + **jogadores por time (4–8)** + sortear (+ countdown do jogo).
- **Toggles PROPOSTOS (não existem no código):** mostrar notas · categorias · banco · contagem · som. Entram como opções na linguagem da casa, em vidro.

## 8. Som (ficha — implementação futura)
- Camadas: **ambiente** (loop leve) · **ticks** a acelerar no girar · **thunk** por trava · **rugido** final na explosão.
- **Unlock por gesto** (o toque no "SORTEAR" liberta o áudio — política dos browsers).
- **Toggle mute persistente** (localStorage). Respeitar silêncio do SO / reduced-motion.
- **Orçamento ~300KB** total (sprite de áudio comprimido, um ficheiro).

## 9. Partilha — SIMPLIFICADA (decisão final do utilizador)
**VÍDEO MORRE (nem spike).** Partilhar é igual em TODAS as plataformas:
- **LINK** — replay EXACTO da animação (semente persistida, §10) na versão pública
  sem app (`/p/:slug/:gameId` evoluída: animação + marca + CTA "cria o teu grupo").
- **IMAGEM** — cartão estático **9:16 no cânone**, um por equipa.
(Nada de MediaRecorder/mp4/canvas-recording — riscado, incluindo o spike.)


## 10. REQUISITO NOVO (vaga de implementação)
- **Persistir a SEMENTE do sorteio** (seed do `Math.random` OU a ordem de picks) junto do `times_resultado`, para **replay EXACTO** da animação. Hoje o resultado é persistido mas a sequência não é reproduzível.

---
_Campo-palco: **APROVADO** pelo utilizador (2026-07-18). Nenhum pendente de decisão em aberto — a spec segue para vaga de implementação._

## 11. REQUISITO NOVO — CONVIDADOS SEM APP (entra no mockup v2)
- O organizador adiciona jogadores **só por nome** ("+ Convidado") na config do sorteio.
- **Cromo genérico:** iniciais na moldura V1, **sem nota** — nada de foto nem conta.
- Entram nos **rolos** e nas **equipas** exactamente como os outros (contam para vagas/formações).
- **ZERO impacto** no ranking e na BD de `users`: vivem apenas no sorteio (payload do jogo
  / `times_resultado`), nunca criam linha de utilizador nem recebem votos.
- Mockup slot v2 mostra 1-2 cromos-convidado no meio dos reais (validação visual).

## 12. REGRAS v6 (mockup do snake/animação)
- **SÓ JOGADORES DA EQUIPA:** os rolos usam APENAS membros da equipa do sorteio
  (nunca fotos/nomes de outras equipas). O "ruído" do giro é feito com os próprios
  membros + símbolos de casino.
- **SÍMBOLOS DE CASINO nos rolos:** assets do utilizador (pasta `sorteio-assets/`:
  `bola-ficha.png`, `carta-fut.png`, `chuteira.png` — nomes claros, fáceis de trocar),
  intercalados entre jogadores ENQUANTO GIRA; o rolo trava SEMPRE num jogador,
  nunca num símbolo.
- **CORES DOS TIMES = PALETA DA CASA** (morre "azul/verde da V1"): OURO #d4a017 ·
  ROXO #8b5cf6 · PRATA #aab4c8 · BRONZE #c2652e (variações canónicas escolhidas).
- **Fecho:** jackpot dourado celebra O SORTEIO (nunca nomeia vencedor individual).

## 13. FLUXO REAL (o botão "SORTEAR" do mockup v6 é SÓ de teste)
**Medido na V1:** o sorteio vivia no card do PRÓXIMO JOGO (Home/Jogos): antes da hora,
`CountdownSorteio` (janela `horas_antes_para_sortear`, default 24h, máx 168h); o ADMIN
sorteava na página própria "Sortear · Times" (selecção de confirmados + POST, área admin);
depois de `sorteio_realizado`, TODOS viam o botão no card que abria o `SorteioOverlay`
(animação slot) — cada toque reabria a animação (replay ilimitado, com sons de celebração),
sempre sobre o resultado persistido (a SEQUÊNCIA não era reproduzível — Math.random).

**Regras v2 (registadas):**
- (a) **SÓ O ADMIN sorteia** — uma vez; gera e persiste o resultado (+ a SEMENTE, §10).
- (b) **TODOS os membros têm "Ver sorteio"** — cada toque REPRODUZ a animação completa;
  replay ilimitado, MESMO resultado e MESMA sequência (semente persistida → replay exacto).
- (c) **Ponto de entrada = o JOGO/início com countdown** até à hora do sorteio;
  na hora, "Ver sorteio" acende (como na V1).
- (d) **A página do sorteio É a página da animação** — chega-se pelo fluxo
  (jogo → countdown → Ver sorteio), nunca por botão avulso.

## 14. TECTOS FORMAIS (medidos no playground a 390px, 2026-07-19)
- **Times: mín 2 · máx 4.**
- **Jogadores por sorteio: mín 3 · máx 28** (testado 24=6/time qw80px e 28=7/time
  qw76px — ambos dignos; 28 fecha em 4×7, e 7 rolos é o cap histórico da V1;
  acima disso os rolos (<40px) esmagam as caras).
- A implementação real VALIDA estes limites (frontend e backend).

## 9. Vaga CASSINO — decisões seladas (23 jul 2026)
- **CORES DE TIME DA CASA (SELADO):** **TIME OURO** (#d4a017) vs **TIME ROXO** (#8b5cf6)
  como padrão; 3º = **PRATA** (#aab4c8), 4º = **BRONZE** (#c2652e) — os metais dos selos.
  Preto rejeitado (some no fundo escuro); branco = prata. A identidade do time veste o
  **PALCO** (anel + rótulo "TIME OURO/ROXO" + moldura/placa do cartão tintadas) —
  **pele e camisa NUNCA levam tinte**.
- **Tinte de camisa: MORTO.** Aprovado no caso-lab (Chavo dark-gold), reprovado no
  canvas final — não generaliza nos avatares variados (metal escuro tinge; bandas de cor
  colidem). Código arquivado na bancada `sorteio-cassino.html` (função `tintar`, não corre).
- **Uniforme-por-time REAL** (todos vestem o kit do time via geração): feature **FUTURA
  premium/evento**, custo por geração (~$0.04/jogador/sorteio), conversa própria por
  ordem expressa. O **3º kit desse dia = White Gold** (roadmap).
- Máquina atual (luzes + escolha animada) **fica**; cassino v3 acrescenta: carta-verso
  do F com flip, alavanca v2 (haste cromada + esfera dourada com F + recuo físico),
  fichas, marquee, luzes exageradas (chase rápido no arranque/revelação; reduced-motion calmo).
- **v6 (23 jul):** revelação SIMULTÂNEA (o time gira e trava junto, cascata ~130ms — nunca
  um a um) · símbolos do giro = avatares V1 da casa + F/troféu/7/♦ · base = régua de luzes
  (listas/tray mortos) · times EMPILHADOS mobile-first (lado-a-lado só desktop largo) ·
  alavanca curta com punho-F · **confete/moedas do fim: FICA por agora — o utilizador
  reserva o direito de trocar mais tarde.**
- **v8 (23 jul):** letreiro SELADO = **"O SORTEIO"** (ronda 1). Confete/moedas MORREM →
  final **"you win" anos-90**: 1s suspense escuro → molduras piscam randómicas + alavanca
  + cabeçalhos alternados → crescendo (tudo acende, 2-3 pulsos) → fade → "TIMES DEFINIDOS".
  **Som v1** (1º som do app): Web Audio sintetizado (jingle fliperama ~1.5s + tick por rolo
  + clunk da alavanca), **opt-in** (off por defeito, preferência lembrada). Fundo ANIMADO
  atrás de tudo (hierarquia de movimento): cortina de veludo / raios rotativos / bokeh —
  à escolha do utilizador. Alavanca v6: punho-F fica; pé retrô de fliperama (metal escovado,
  parafusos, placa PUXE). Escala provada: 2×11, 3 times, 4 times na máquina única.
- **v8.2/v8.3 (23 jul):** fundo SELADO = **raios rotativos** (outras opções mortas). Final
  anos-90 = **só a 1ª metade** (escuro → caos feliz → corte SECO em "TIMES DEFINIDOS";
  crescendo morto; ≈ metade da duração). **Foco da revelação:** no fim, o palco inteiro
  (raios+máquina+marquee) desfoca (~9-11px) e escurece ~30% sob véu (entra suave 400ms
  no caos; FICA); os cartões dos times permanecem nítidos e protagonistas. **Baralho:**
  página `baralho-simbolos.html` — V1 (17 mascotes) + F/troféu/bola/assets + 8 SVGs novos
  da casa (apito·chuteira·luva·cartões·taça·bandeirola·camisa10·estrela), escolha por
  checkbox → lista de ids p/ selar. Símbolos IA extra: orçar (~$0.04/img fal), nunca sem ordem.
- **v8.5 (23 jul):** letreiro = "O SORTEIO" sozinho; o **F renasce na QUINA ESQUERDA**,
  GRANDE, construído de LÂMPADAS amarelas (fachada), acendimento próprio subtil, antes da
  régua de luzes. **Desfoque corrigido:** raios rotativos NÍTIDOS (o sol continua); quem
  desfoca na revelação é a MÁQUINA atrás dos cartões. **SOM (decisão):** banco de som =
  Web Audio sintetizado no código (zero assets, zero royalties, sabor retrô); upgrade
  futuro possível para samples CC0 (freesound) — **só por ordem**.
- **v8.6 RESGATE (23 jul):** a v8.5 desfocou o alvo errado — restaurado o estado amado:
  lâmpadas todas + máquina NÍTIDA o sorteio inteiro + raios SEMPRE visíveis a girar.
  Ficam da v8.5: letreiro "O SORTEIO" limpo + F de lâmpadas na quina esquerda. O desfoque
  certo = véu LOCAL (backdrop-blur) SÓ no retângulo do título "TIMES DEFINIDOS"; entra
  suave, sai quando assenta. A/B na bancada prova o resgate.
- **BANNER (decisão selada):** a página do sorteio SEMPRE tem banner — componente
  `BannerAd` reutilizável (chanfro 45°, filete fino, rótulo "PUBLICIDADE"), **300×250
  ABAIXO da máquina** (o 320×50 fixo flutuaria sobre o palco — reprovado), no in-app E
  na /p/. v1 = house ads (Storage JSON rotativo; fallback = promover planos). **LEI DE
  MENORES (fundadora, fail-closed):** classificação por banner (livre/18+); menor OU
  idade desconhecida/anónimo (/p/) só recebe "livre"; 18+ nunca serve menor/anónimo, sem
  exceção; sem classificação = 18+. **INTERRUPTOR DO DONO:** toggle por página no
  Gabinete, Storage, default DESLIGADO — o slot existe sempre, mostrar é decisão do dono.
  **MEDIÇÃO:** render=impressão, toque=clique (endpoint nosso, agregação diária Storage
  JSON, zero cookies/scripts externos; menor/anónimo nem gera impressão de 18+). Rede
  externa (AdSense etc.) = decisão FUTURA à parte (consent UE + scripts). **PNG
  partilhado fica LIMPO (sem banner)**; "patrocinador no cartão" = ideia futura.
- **BARALHO OFICIAL v9 (23 jul, decisão):** SÓ estes símbolos nos rolos — 5 personagens
  gerados (fal, 1 tentativa cada, 5/5 OK): Jacaré·Onça·Tigre (dark-gold) + ET·Astronauta
  (dark-purple), estilo V1, busto, recorte birefnet; + cartas da casa desenhadas (custo
  zero): CARTA-F dourada + roxa (F oficial), CARTA-TROFÉU, FICHA-CARTA (experimento).
  Símbolos antigos removidos. Aprovação em `baralho-oficial.html`.
- **v8.7 (24 jul, sete veredictos):** F da quina = path REAL do FuttyLogo em ~64 lâmpadas
  (linha dupla do letterform) · som do giro = tec-tec contínuo de roleta (abranda com os
  rolos; ticks por cima) · final = FANFARRA de vitória (~2s; jingle arcade morto) ·
  caos-feliz com o brilho da v8.0 (a luz volta a MEIO do caos — nuance perdida no corte,
  reposta; duração curta) · véu TOTAL só no instante "TIMES DEFINIDOS" (tudo desfoca+
  escurece atrás; sai ao assentar) · BannerAd herda a FAIXA do Início (AdCard variant
  native; o componente já prevê variant 'banner' 72px p/ sorteio). **Baralho v9.1:**
  cartas da casa com anatomia de baralho REAL (poker 5:7, moldura dupla, índices, losangos,
  monocromia total; F roxo = recolor do asset oficial) + ficha-carta 3D (experimento);
  bichos SELADOS intocados.
- **v8.8–v8.10 (24 jul):** F de lâmpadas da quina MORTO (logo só no punho) · letreiro
  final = **"SORTEIO"** · MÚSICA de cassino: lounge sintetizado em loop sem costura
  (walking bass + acordes suaves + vassoura swing), baixo sob os efeitos, entra no 🔊,
  cala na revelação, volta depois — honesto: sabor synth; plano B samples CC0 só por
  ordem · **véu v8.9 sem furos**: no instante do título TUDO atrás apaga/desfoca
  (molduras incluídas, micro-lâmpadas apagam); só o cartão-título vive; reacende suave.
  Final: aguarda a direção do utilizador. **Baralho v9.2:** carta-F DOURADA GERADA
  (foil golden-plate + F preto forma exata; 1 tentativa) — SVGs mortas; roxa fica p/
  depois; troféu/ficha mortos por agora. Bichos com FUNDOS VARIADOS locais
  (jacaré/dourado · onça/épico · tigre/preto · ET/aura · astronauta/dourado).
- **v9.3 (24 jul):** LEI NOVA — **a logo NUNCA é gerada por IA**. Fábrica híbrida das
  cartas: fal gera SÓ o material (foil + moldura em relevo, símbolos PROIBIDOS no prompt;
  2 gens: dourado + roxo #8b5cf6) → o F oficial (asset do app) carimba-se LOCALMENTE ao
  centro com relevo (sombra+highlight, sharp). Régua: "podia estar na Figurinha". A carta
  gerada com logo (v9.2) morreu. Bichos: ET+Astronauta fundo roxo aura (aprovado);
  Jacaré/Onça/Tigre de volta ao fundo original v9.
- **FINAL SELADO (24 jul): C · NEON LOCK-IN** (escolhido no menu de 5 celebrações; menu
  morto). Véu total (tudo apagado, molduras incluídas) + título → cartões TRAVAM um a um
  em cascata ~80ms (borda acende de uma vez, clique seco, sem fade, time a time) → 
  **fanfarra DEPOIS da última trava** → estado firme. Glow pulsante MORTO. Som: **clack**
  sintetizado por trava (neon a ligar), dentro do 🔊. **Baralho v9.4:** prompts que
  CONVERSAM com o app (chapa + kit + screenshot da máquina como refs) → as 4 cartas
  vieram com chanfro 45°, filete duplo e marquee sozinhas: dourada+roxa (F carimbado
  local, variantes preto/dourado na roxa) + Carta-Troféu e Carta-Bola (geradas — não são
  a logo). Bichos de ouro = aura DOURADA (tratamento do ET na cor certa).
- **v9.5 (24 jul):** Carta-F = variações de CASAMENTO locais sobre as chapas aprovadas
  (custo zero): A relevo forte · B contorno dourado · C piano black (specular) · D vazado
  (stencil) — dourada 4× + roxa 6× (F preto + F dourado onde cabe); escolha por letra em
  `cartas-f.html`. **FINAL + BRINDE:** depois da cascata e da fanfarra, 1.5-2s de
  sobremesa — micro-lâmpadas dos TIMES piscam aleatórias (caos-feliz curto) + brilho
  suave a respirar; véu mantém-se; assenta firme.
- **KIT DE SOM REAL (24 jul):** 6 ficheiros Pixabay em public/sons/ (mapa do dono):
  trilha-chiptune=cama em loop · slot-machine=giro (corte seco na trava) · Hud UI=toques
  (interface + micro-doses do brinde) · sorteio-finalizado=véu/travas · Victory=festa
  (fade-out elegante). Sintetizados MORTOS → só fallback se ficheiro faltar. 🔊 opt-in
  lembrado; cama pausa no véu e volta no final. Registo: docs/licencas.md (Pixabay
  Content License, comercial, sem atribuição; README da pasta anexado). ffmpeg
  indisponível → edição toda em runtime (ganhos/fades/trims). **Anéis do APP alinhados
  ao selado:** MARCA_TIME = OURO/ROXO/PRATA/BRONZE (azul/vermelho morto) nas duas vistas
  + /p/ (tinte das silhuetas incluído); rótulos "Time Ouro/Roxo/…" na cerimónia.
- **v8.11 (24 jul):** REGRESSÃO do véu corrigida (causa: o lock-in v9.5 trocou o blur do
  gruposWrap por dim por-cartão) → **LEI escrita no código: VÉU TOTAL SELADO (v8.9)** —
  o momento do cartão final volta como fase própria após o brinde (tudo apaga, molduras
  incluídas, só o cartão nítido; 1.5s). MISTURA: cama chiptune ↓ 16%; **Victory toca até
  ao FIM e depois SILÊNCIO** (trilha nunca volta; só novo puxão). RAIOS: presença subida
  (alphas ~2×, opacity .75, giro 44s horário). **CARTAS SELADAS:** dourada = C (F piano
  black) · roxa = C² (F dourado especular); outras variantes mortas (grelha cumprida);
  troféu DESCEU 7% (cirurgia local, remendo invisível); bola aprovada.
- **v8.12 DEFINITIVO (24 jul):** VÉU = **ESTADO EXCLUSIVO** (lei no código, 3ª ordem):
  UMA classe na raiz esconde tudo em bloco (.palco no véu; gruposWrap INVISÍVEL; só o
  cartão, centrado V+H — impossível uma camada escapar). Sequência: CARTÃO → lock-ins
  (vista normal, locks ficam acesos) → Victory→fim→SILÊNCIO. Raios 33s (+25% sobre os
  44s vistos). Prova de sequência: `sequencia-veu.html` (7 frames). Regressão de
  percurso corrigida (a inserção do fimtxt falhara em silêncio → div reposto).

- **v8.13–v8.19 (25 jul) — afinações do look + resgates:**
  - **Véu CERTO (v8.15):** binário (OFF ou TOTAL) MAS o tratamento é o aprovado da v8.12 —
    desfoque + brightness .35/.4 (o palco SENTE-SE); o overlay preto rgba(2,3,8,.55) da
    v8.14b ("breu demais") MORREU. **Painel do título = o ORIGINAL** (vidro rgba(5,8,16,.45)
    + backdrop-blur + filete dourado .35 + chanfro 45°); a placa opaca da v8.14 reprovada.
  - **Victory = BALANÇO ANTIGO (v8.15):** a Victory sobe NO MOMENTO do cartão (não depois
    dos lock-ins); os lock-ins acendem como VISUAL silencioso sobre a festa. Exclusão mútua
    mantida; gap corte-da-trilha → 1ª nota ≈ **260ms**.
  - **Alavanca (v8.18):** o punho redondo MORREU → **quadrado chanfrado 45%** (o clip dos
    cartões da casa), **filete duplo dourado**, F ao centro, glow pulsante (drop-shadow segue
    a forma), + **cascata de chevrons ∨∨∨** por baixo (puxar o F = repetir). Zero haste/vareta.
  - **Partilha v2 (v8.15):** "Baixar PNG" (.cta-gold âmbar + glint) + "Compartilhar link"
    (ghost, filete dourado), chanfro 45°, Rajdhani, ícones lucide — lado a lado no estado
    final E no preview mobile (acima do banner). Mobile aprovado (banner ✓, botões ✓).
  - **Raios:** ×2 (33s→16.5s) aplicado; o 2º ×2 (→8.25s) foi **REVOGADO** — fica **16.5s**.
  - **Molduras VIVAS na Victory (v8.17):** enquanto a Victory toca, cada moldura sorteada
    respira (bob dessinc + escala 1↔1.03 + micro-lâmpadas festivas); ao SILÊNCIO, assenta ao
    estado firme. Linguagem = a respiração da casa (o campeão). reduced-motion → estático.
  - **Cartão BONITO (v8.19):** o texto "TIMES SORTEADOS" usa o **ouro do letreiro SELADO**
    (gradiente fff7d8→f5d060→c8940f + duplo glow ouro/roxo) + entrada em cascata por letra;
    o flicker chapado (segB) morreu. Painel/véu intocados.
  - **SOM SELADO — módulo `somSorteio.js` (v8.19, blindagem):** TODO o som isolado num
    módulo com API mínima (`iniciar/girar/pararGiro/toque/cartaoVeu/vitoria/vitoriaTocando/
    silenciar/autoTeste`). As animações CHAMAM a API; **NUNCA** tocam nos players (lei-comentário
    no topo do ficheiro). **Causa das 2 regressões das músicas:** o flag partilhado `musicaAtiva`
    era um PORTÃO que, se preso em 'victory' (play() bloqueada pelo autoplay no auto-run, sem
    gesto), silenciava trilha E Victory para sempre; o patch da 1ª tratou sintomas, uma afinação
    voltou a prendê-lo (2ª). O módulo NÃO tem portão — a exclusão é por AÇÃO (vitoria() pára a
    trilha e toca a Victory). **Auto-teste no arranque** loga `SOM OK 5/5` (regressão futura grita
    sozinha). Prova de timestamps: trilha start→stop→Victory (gap 260ms)→fim→silêncio.

## 15. PARTILHA & TRANSPLANTE — o /p/ recebe a MÁQUINA NOVA
- **"Compartilhar link" → `/p/:slug/:gameId`** (a cerimónia ANIMADA pública, sem app, com
  **silhuetas** — privacidade selada; despublicar avatares nas páginas públicas). O botão de
  partilha do sorteio aponta a ESTE link; o **PNG** (cartaz 9:16) é a imagem estática que
  acompanha a partilha (`cartaz-sorteio.html` = template: letreiro + times nas molduras
  ouro/roxo + micro-lâmpadas no pico + raios/véu + marca FUTTY; SEM alavanca/botões/banner).
- **TRANSPLANTE (registado):** o `/p/` público recebe **a máquina NOVA do cassino**
  (`sorteio-cassino.html` v8.x: raios selados + máquina + letreiro + véu/cartão + molduras +
  som selado) na vaga de transplante — a mesma cerimónia do in-app, com silhuetas em vez de
  avatares. Fase: quando o sorteio fechar o look e entrar o transplante app↔/p/.

- **v8.22 (25 jul):** corrente de luz da alavanca **REVOGADA** (a Joia selada volta: glow
  pulsante + chevrons ∨∨, nada mais) · cartão "TIMES SORTEADOS" **numa linha SEMPRE**
  (fit-to-width: o JS reduz o font até caber no interior — como a placa de nome do cromo;
  posição/moldura aprovadas ficam) · **X de saída** no canto sup-direito (chanfro 45°,
  discreto opacity .55→1, FORA do véu, sempre visível; sai para a página do jogo) ·
  **placa FUTTY** proposta: plaquinha metálica de fabricante na base da máquina (metal
  escovado, Rajdhani pequena) · botões v3 em grelha de escolha (`botoes-partilha.html`,
  3 nomes × 3 estilos no contexto mobile).
- **LEI (v8.22): página do sorteio = IMERSIVA, SEM Topbar; identidade = F na alavanca +
  placa FUTTY + X de saída.** Não adicionar chrome do app à página sem ordem expressa.

- **v8.25 — baralho final (transplante, 29 jul, ordem do dono):** as 2 cartas-F antigas
  (dourada C / roxa C especular) **morreram** dos rolos e dos assets. **Baralho oficial
  selado, 9 símbolos**: 5 bichos v9 (jacaré/ET/onça/tigre/astronauta, intocados) + **troféu
  ouro** e **bola ouro** (`v94-trofeu-c.png`/`v94-bola.png`, os já selados, sem retoque) +
  **777 seta ↗ ouro** (`777-seta-ouro.png` — três 7s desenhados à mão no traço do F, fundidos
  no palco dourado, diagonal em voo/decolagem: 1º baixo/pequeno → 3º alto/grande) + **F-roxa
  média** (`f-roxa-media.png` — o F oficial fundido no palco roxo aprovado, intensidade
  média). A **HÍBRIDA** (palco ouro + F em ametista, intensidade intensa) ficou **aprovada
  mas arquivada** — não entra no baralho por esta correção do dono, guardada pra servir
  noutro lugar do app no futuro. `roxa-no-ouro` (777 preenchida com material roxo) também
  fica de fora desta vaga — só entra se o dono pedir "roxa" explicitamente.
- **v8.24 — cartaz + baralho:** o giro passou a usar **SÓ o baralho oficial selado** (5 bichos
  v9 + 4 cartas F-ouro/F-roxa/troféu/bola); morreram os símbolos antigos (gladiador, ninja,
  "7", "♦", F chapado, troféu-SVG). **Cartaz do sorteio = modelo ÚNICO "Máquina"** (`cartaz.html`):
  fundo aurora da casa (roxo-profundo + dourado, desfocado), molduras COMPLETAS e limpas
  (chanfro + filete duplo + placa de nome; SEM micro-lâmpadas), cabeçalho SORTEIO compacto +
  data/equipa, avatares protagonistas, FUTTY discreto; escala provada em 2 times / 2 times +
  RESERVA / 3 times (ouro·roxo·prata). O **"Guardar" entrega ESTE** (sem seletor). O modelo
  **"Campo"** (escalação sobre campo HUD) fica **registado como ideia FUTURA, sem prioridade**.

- **v8.24-v4 (cartaz):** título **"ESCALAÇÃO"** (3×, tratamento dourado; pelada+data
  inalterados) · fundo **mais escuro + mais desfocado** (aurora recuada, quase noturno) ·
  **última linha ímpar CENTRADA** (3 em cima, 2 centrados — nunca à esquerda) · 5 escalas
  provadas: 2t · 2t+res · 3t · 3t+res · 4t.
- **SORTEIO CONGELADO (a pedido do utilizador):** a integração da alavanca na máquina
  (v8.23 A/B) foi **DESCARTADA** — a **Joia LATERAL selada FICA**. **ZERO toques na máquina
  do sorteio até nova ordem expressa.**

- **v8.25 — link vivo + raios + centragem:**
  - **O LINK /p/ (investigação):** o `/p/:slug/:gameId` (`SorteioPublico.jsx`) JÁ corre a
    animação — mas via o componente APLICADO `CerimoniaSorteio.jsx` (slot v8), **não a
    máquina NOVA da bancada** (Joia/véu re-escopado/som selado). O `/p/` mostra **avatares
    reais** hoje (silhueta só como fallback sem-foto) — a **LEI da privacidade** (públicas =
    silhuetas) ainda **não está aplicada** ali. Além disso, o "Compartilhar" da bancada copia
    um link **mock**. **REGISTADO:** o `/p/` recebe **a máquina nova NO TRANSPLANTE**, e nesse
    momento **entra a silhueta obrigatória** (privacidade). Simulação para aprovação já:
    `sorteio-cassino.html#p` (modo público — máquina nova + silhuetas + CTA "Cria o teu grupo").
  - **RAIOS +75% de grossura** (beam 14°→24.5°; contraste/velocidade 16.5s mantidos).
  - **CENTRAGEM (mobile 390px):** o desequilíbrio era a **gaveta do scrollbar** de ~15px do
    `#device` (reservada no browser desktop) a comer o espaço à direita. Fix: esconder a barra
    (telemóvel real usa overlay). Cotas (borda-luzes-esq → ponta-alavanca): **ANTES esq 12 /
    dir 25 (desvio 13 à direita) → DEPOIS esq 19 / dir 17 (centrado)**. Conjunto = 318px.

## MODO CAMPO — REMOVIDO (registado 28 jul 2026, ordem do dono)
O toggle "Lista | Campo" na página do Jogo (e o componente `CampoSorteio.jsx`) era o
**protótipo de cartaz abortado** de uma fase antiga do sorteio — sobreviveu no app depois
de o resto ter mudado para a máquina v8.25 selada. **Removido**: fica SÓ a vista oficial
(`DrawnTeams`, a lista). **Modelos alternativos de cartaz (campo etc.) = FUTUROS**,
desenhados pelo Fable quando o dono pedir — não é para reintroduzir sem essa ordem.
