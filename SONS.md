# Sons do sorteio — receita e autoria

**Gerado por código, sem material de terceiros.**

Criados em **16 de setembro de 2026** (Rodada 14A) e reafinados em **17 de
setembro de 2026** (Rodada 16A, avaliação do dono no aparelho). Em **2 de outubro
de 2026** (Rodada 29H-B) entrou o sexto arquivo, a **alavanca** — os cinco de antes
não mudaram um bit (ver abaixo). Os seis efeitos
de `public/sons/` nascem inteiros em `scripts/gerar-sons.mjs`: síntese em Float32
(mono, 44,1 kHz) → WAV 16 bits → MP3 pelo `ffmpeg-static`. Nenhum arquivo
baixado, nenhuma biblioteca de áudio, nenhuma IA de música, nenhuma amostra de
terceiros — nem de bancos "CC0". O direito autoral é **100% nosso**.

O que a 16A mudou, e por quê (o dono ouviu o build 24 no iPhone):

- **Tique** — o lado mecânico estava bom, mas o digital quase não aparecia.
  Agora as duas camadas estão em pé de igualdade: o mesmo clique de máquina mais
  um tom de **tecla de videogame** a −6 dB dele.
- **Jackpot** — o trecho mais longo descia de tom no fim e soava a **derrota**.
  Lei nova do dono: **no jackpot nada desce — toda frase sobe ou fica.** O som
  foi rearranjado como uma escada e a geração agora **falha** se a linha descer
  (a prova está mais abaixo).
- **Clac** — intocado, e de propósito: como a semente não mudou e cada tique
  consome exatamente as mesmas 46 tiragens de antes, o `clac.mp3` sai **bit a
  bit igual** ao da 14A (MD5 `b06c5105d9d17b9355c436f3aff5ce41`).

O que a 29H-B acrescentou (decisão do dono, 2-out, 17h: "o som atual está
perfeito"; a lei de 16-set fica — sem música, sem v2 dos três):

- **Alavanca** — o 4º efeito, a slot machine MANUAL: a alavanca sendo puxada e a
  catraca mecânica engatando no instante em que o giro começa, em **720 ms**
  de som — 0,78 s como o Safari mede o MP3 (teto do dono: 0,8 s). Toca quando a cerimônia arranca (o mesmo instante do 1º
  tique). Duas variantes para o dono ouvir em `scripts/capturas/rodada-29h/`
  (`alavanca-v1.mp3` = a do app, `alavanca-v2.mp3` = "pesada"); a 1ª é a que
  está ligada em `public/sons/alavanca.mp3`.
- **Os cinco de sempre, selados por MD5.** A alavanca nasce DEPOIS deles na mesma
  semente, então nenhuma tiragem deles muda; e o gerador agora **falha** se o MD5
  de qualquer um dos cinco sair diferente do registrado (`ASSINATURAS` em
  `gerar-sons.mjs`): `tique-1` b17ecfcd…, `tique-2` 655a349a…, `tique-3`
  0d5bca1f…, `clac` b06c5105…, `jackpot` 7c4e3e14….

Para refazer os arquivos:

```
cd FUTTY-V2/frontend && node scripts/gerar-sons.mjs
```

A semente é fixa (`14021606`), então o script é reproduzível: rodar de novo
devolve exatamente os mesmos MP3. Isso é parte do registro — a receita abaixo
mais o script provam a origem de cada onda.

## O que existe

| Arquivo | Papel no sorteio | Duração | Tamanho | Taxa |
|---|---|---:|---:|---|
| `tique-1.mp3` | rolo girando (variante 1) | 60 ms | 1,6 KB | 96 kbps mono |
| `tique-2.mp3` | rolo girando (variante 2) | 60 ms | 1,6 KB | 96 kbps mono |
| `tique-3.mp3` | rolo girando (variante 3) | 60 ms | 1,6 KB | 96 kbps mono |
| `clac.mp3` | rolo travando, um jogador aparece | 120 ms | 2,2 KB | 96 kbps mono |
| `jackpot.mp3` | os times ficam prontos | 3,6 s | 35,8 KB | 80 kbps mono |
| `alavanca.mp3` | a alavanca puxada + catraca engatando (29H-B) | 720 ms | 9,2 KB | 96 kbps mono |

Total: **51,9 KB**. Todos abaixo do teto de 40 KB por arquivo (lei do app leve).
Nenhum viaja dentro do pacote da loja: `preparar-nativo.js` deixa `sons/` de
fora e o app busca do site em tempo de execução (`urlAsset`).

## As receitas

### Tique (≈ 60 ms) — o rolo passando um símbolo

**Máquina e videogame ao mesmo tempo** (16A). Duas camadas de igual peso:

1. **O clique mecânico** — 1 ms de impulso de ruído com rampa descendente,
   passado por um passa-banda biquad (receita RBJ) na faixa mecânica, e um
   decaimento exponencial de ~7 ms. O centro do filtro é o que muda entre as
   variantes: **2600 / 3000 / 3450 Hz** (Q = 1,1), cada um com ±3% de sorteio.
2. **O tom de tecla** — metade onda **quadrada**, metade **triangular**, em
   **1600 / 1900 / 2200 Hz** (±0,5%), **30 ms**, ataque instantâneo (uma
   amostra, sem rampa) e cauda de 7 ms. A amplitude é medida contra a camada de
   baixo: **metade do pico do clique, ou seja −6 dB**, como o dono pediu.
   A cauda é curta de propósito — o tom é quatro vezes mais longo que o clique,
   e com cauda maior viraria um bip solto em vez de "máquina + videogame".

Medido nos MP3 prontos, nos primeiros 40 ms: o pico do espectro cai exatamente
em 1600 / 1900 / 2200 Hz, um por variante. O transiente mais alto do arquivo
continua sendo o clique de metal (é ele que define o pico normalizado).

As três variantes existem para o trem de tiques não soar de máquina de escrever
elétrica: o app alterna 1 → 2 → 3 a cada tique.

### Clac (≈ 120 ms) — o rolo travando

Peso primeiro, metal por cima:

1. **O "thunk"** — seno varrendo **90 → 60 Hz** (a massa parando), com a fase
   acumulada amostra a amostra — somar fase é o que evita o estalo que uma
   varredura ingênua produz na emenda. Decaimento de 38 ms.
2. **O clique da trava** — 12 ms de ruído em passa-banda **5200 Hz** (Q = 0,9),
   decaimento de 3,5 ms.

### Jackpot (3,6 s) — a slot machine que acabou de dar prêmio

**Lei do dono (16A): nada desce.** Cada movimento entra mais agudo que o
anterior, e o arranjo é uma escada. O timbre de sino vem da mesma função de
sempre: seno fundamental + harmônicos 2× e 3× + um parcial **inarmônico em 4,2×**
e outro em 5,4×, cada parcial decaindo mais rápido que o de baixo. O inarmônico é
o que separa "sino" de "flauta" — metal real vibra fora da série harmônica.

1. **Arpejo ascendente de sinos** (0 → 0,50 s) — Dó maior, **C5-E5-G5-C6-E6-G6**
   (523,25 / 659,25 / 783,99 / 1046,50 / 1318,51 / 1567,98 Hz), 90 ms entre
   notas, **subindo em volume** (0,40 → 0,69). As caudas são curtas e encurtam
   com a altura (0,46 → 0,31 s): na 14A o sino de uma nota velha ainda soava
   depois de a frase ter subido, e o tom "voltava para trás".
2. **Voz de videogame** (0 → 1,35 s) — por cima do arpejo, nas **mesmas** notas,
   staccato de 85 ms, e depois **C7 (2093 Hz) segurada** por 0,86 s. É ela que
   sustenta o tom entre o arpejo e a chuva. Timbre de chip: quadrada de 25% de
   ciclo somada a uma triangular, mas a quadrada entra por harmônicos ímpares
   **limitados** (3º a 0,30 e 5º a 0,15) — assim a fundamental continua sendo a
   nota mais forte do espectro, no celular e na medição.
3. **Chuva de moedas ASCENDENTE** (1,20 → 2,70 s) — 46 impactos de ruído em
   passa-banda estreito (Q = 5) com tilintar tonal por cima. O tom **sai do
   instante**, nunca de sorteio: sobe de **2,5 kHz a 6 kHz** em oitavas iguais no
   tempo. A densidade **cresce até o fim** (instantes pela CDF inversa de uma
   densidade linear crescente, x = √u) e o volume acompanha (0,62 → 1,02).
4. **Fecho** (2,55 → 3,60 s) — primeiro a **varredura para cima**: uma oitava em
   150 ms (G7 → G8, 3136 → 6272 Hz), com a fase acumulada amostra a amostra e de
   propósito **discreta** (0,20) — ela passa por baixo da chuva, que nesse
   instante já está nos 5,5 kHz. Depois o **acorde de Dó maior brilhante**
   (C6-E6-G6-C7 em sinos, entradas de 12 ms, ~1,0 s de sustain) com uma quadrada
   em C7 e a **quinta três oitavas acima (G8, 6271,93 Hz)** a segurar o brilho na
   altura onde a chuva terminou. As vozes graves entram repartidas (0,30 cada):
   no fecho, 71% da energia está no acorde (900-2500 Hz) e 16% no brilho de
   6,3 kHz — ouve-se um acorde com brilho por cima, não um chiado.

### Alavanca (720 ms) — a slot machine manual (Rodada 29H-B)

Três gestos em sequência, todos entre 250 Hz e 1,4 kHz (mais um "ping" de 4 kHz)
— de propósito FORA da faixa dos tiques (1,6–3,45 kHz), que começam a correr no
mesmo instante: a alavanca se ouve por baixo do trem de tiques sem brigar com ele.

1. **A puxada** (0 → 0,29 s) — o braço descendo: ruído branco num passa-banda
   cujo centro **varre de 900 para 350 Hz** ao longo do gesto (receita RBJ
   recalculada a cada amostra, com o estado do filtro contínuo — filtrar em
   pedaços estalaria nas emendas), com a envoltória de um gesto (sobe até 45% e
   cai). Por cima, **a mola**: um tom metálico (fundamental + 2º harmônico a 0,30)
   descendo **1400 → 950 Hz** com vibrato de 7 Hz (±2,5%), fase acumulada — é o
   que separa "alavanca de metal" de "sopro".
2. **A catraca** (0,27 → 0,64 s) — **12 cliques** de impulso de 1,2 ms de ruído em
   passa-banda **1150 Hz** (Q 2,2, ±2% de sorteio por clique) com um ping de
   **4 kHz** (3 ms) por cima, **cada vez mais juntos** (42 → 21 ms, em progressão
   geométrica) e um pouco mais altos (0,55 → 0,85): o mecanismo engatando e
   ganhando velocidade.
3. **O engate** (0,635 → 0,72 s) — o "clunk": seno **140 → 95 Hz** (a massa
   assentando; fase acumulada, decaimento de 45 ms) e o clique metálico da trava,
   5 ms de ruído em **2,3 kHz** (Q 1,2).

**Variante 2 ("pesada")**, só para comparar: puxada mais longa e mais grave
(0,35 s; 700 → 250 Hz; mola 1000 → 650 Hz), 8 cliques mais espaçados (48 →
27 ms, centro 900 Hz, ping 3,2 kHz) e clunk mais fundo (120 → 80 Hz, 60 ms).
720 ms. Fica em `scripts/capturas/rodada-29h/alavanca-v2.mp3`.

Medido nos MP3 prontos (janelas de 50 ms): o pico da puxada cai aos 0,10–0,20 s,
a catraca sobe de 0,27 a 0,64 s e o engate é o transiente mais alto do arquivo.

**Por que 0,72 s de som e não 0,8:** o teto do dono vale para o que o aparelho
TOCA, e o `<audio>.duration` do Safari/WebKit é maior que o som sintetizado —
o LAME acrescenta ~25 ms de atraso de codificação, arredonda a quadros de 1152
amostras (26 ms) e o Safari ainda conta o quadro de cabeçalho Xing/Info. Medido:
0,78 s de som davam 0,836 s; 0,74 s davam 0,81 s; **0,72 s dão 0,784 s**. O
gerador confere isso (`medirMp3`, que conta os quadros como o WebKit) e falha
se qualquer variante passar de 0,8 s no decodificador.

#### A prova de que nada desce

`scripts/prova-tom.mjs` mede o **MP3 já pronto** (não o buffer): ffmpeg devolve
PCM, o arquivo é cortado em janelas de **50 ms** com Hann, cada janela passa por
uma **FFT de 4096** (radix-2, escrita ali; nenhuma dependência nova) e o pico do
espectro entre 250 Hz e 9 kHz é afinado por interpolação parabólica. Janelas
abaixo de −38 dB da mais forte não contam como "tom".

A regra: cada janela com tom tem de vir **igual ou mais aguda** que a anterior
(3% de folga para o jitter da FFT). `node scripts/gerar-sons.mjs` desenha a linha
em `scripts/capturas/16a-jackpot-tom.png` e **sai com erro** se houver uma queda.

Medido na versão que ficou: 523 → 1568 Hz (arpejo), patamar em 2093 Hz (o C7
segurado), rampa de 2,7 a 6,3 kHz (as moedas) e patamar final em 6272 Hz (o
fecho). **Zero quedas** em 70 janelas com tom. Para comparar, o jackpot da 14A
tinha **10 quedas** — a pior de 4047 Hz para 524 Hz aos 2,40 s, que é exatamente
o "tan tan tan tan que soa a derrota" que o dono apontou.

## Regras que valem para todos

- **Normalização a −1 dBFS**, medida no pico. Nada clipa: conferido decodificando
  os MP3 de volta para PCM — zero amostras em ±1,0.
- **96 kbps mono**, com um degrau abaixo só quando o teto de 40 KB exige. O
  `jackpot` é o único caso: a 96 kbps cabem 3,41 s em 40 KB e ele precisa de
  3,6 s, então desce para 80 kbps. Mesmo assim é **mais bits por canal** do que
  os sons que o app usava antes — aqueles eram 96 kbps *estéreo*, 48 por canal.
- **Mono** de propósito: são efeitos de interface, ninguém os ouve em estéreo no
  celular, e custam metade.

## Como o sorteio usa

Quem manda é o `src/components/somSorteio.js` (módulo selado — animação nunca
mexe em player de áudio direto). Volumes: tique **0,5**, clac **0,7**, jackpot
**1,0**, alavanca **0,65**.

**Site × app (29H-B):** os arquivos são os mesmos nos dois — o site e o app da
loja buscam `/sons/*` do mesmo `public/` (o app, de `VITE_ASSETS_URL`), e
`git diff main dev -- public/sons` está vazio. O que soava diferente era a
**regra de autoplay do Safari**: no site um `<audio>` só toca se o seu `play()`
veio de dentro de um toque; o WKWebView do Capacitor nasce com
`mediaTypesRequiringUserActionForPlayback` vazio e toca de qualquer lugar. A
cerimônia dispara os efeitos de temporizadores, segundos depois do toque em
"Sortear" (que ainda faz um POST e uma navegação) — no site, nada tocava. Agora
`SomSorteio.prepararNoGesto()` é chamado síncrono dentro do gesto ("Sortear" no
Jogo; a alavanca na cerimônia) e destrava cada elemento com um `play()` mudo. Ligado por padrão para quem toca em "Sortear"; desligado para quem só
abre o resultado; a escolha fica lembrada no aparelho; botão de mudo sempre
visível — a lei do som, em `CLAUDE.md`.
