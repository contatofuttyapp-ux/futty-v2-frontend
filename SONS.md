# Sons do sorteio — receita e autoria

**Gerado por código, sem material de terceiros.**

Criados em **16 de setembro de 2026** (Rodada 14A) e reafinados em **17 de
setembro de 2026** (Rodada 16A, avaliação do dono no aparelho). Em **2 de outubro
de 2026** (Rodada 29H-B) entraram o sexto e o sétimo arquivos, a **mecânica** e o
**engate** (a 1ª tentativa desse 4º efeito, a alavanca, foi reprovada pelo dono no
mesmo dia e saiu) — os cinco de antes não mudaram um bit (ver abaixo). Os sete efeitos
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
perfeito"; a lei de 16-set fica — sem música, sem v2 dos três; decisão final à
noite, depois de ouvir a alavanca v1/v2):

- **Mecânica** — o 4º efeito: uma camada discreta que toca **enquanto os rolos
  giram** e some quando o **último** trava, em loop (trecho de **3,0 s**), a
  **−10 dB do tique**. Cliques metálicos curtos e secos a **~11 por segundo**
  (intervalo ~90 ms, ±10 ms para não soar robótico), energia principal entre
  **1 e 8 kHz** (agulha/engrenagem), com um "tum" leve por baixo entre 150 e
  400 Hz a cada clique; **sem whoosh, sem sopro, sem ruído contínuo de ar** —
  o timbre foi medido numa referência do dono (licenciada: não se usa o arquivo,
  sintetiza-se). **1ª rodada**, três variantes em `scripts/capturas/rodada-29h/`:
  `mecanica-v1.mp3` (só os cliques), `mecanica-v2.mp3` (cliques + tum) e
  `mecanica-v3.mp3` (a v2 a ~13/s). **2ª rodada** (o dono: a v2 foi a melhor das
  três, mas longe da referência; a Freaky mediu as duas a 16 kHz, janelas de 5 ms):
  `mecanica-v4.mp3` (**a que está ligada**, `public/sons/mecanica.mp3`), com o
  fundo contínuo de motor a −14 dB dos cliques, cadência 110 ms com toque duplo a
  cada 6 cliques e clique com corpo; `mecanica-v5.mp3` (fundo a −11 dB) e
  `mecanica-v6.mp3` (fundo a −17 dB). A régua e a tabela estão abaixo.
- **Engate** — o instante em que o giro começa: o mecanismo pegando, em **160 ms**
  de som (0,235 s como o Safari mede o MP3; teto do dono: 0,3 s). Nasce junto com
  a mecânica e o 1º tique.
- **A alavanca (1ª tentativa) foi REPROVADA** pelo "sopro agudo" — o whoosh do
  braço descendo (ruído em passa-banda varrendo 900 → 350 Hz). Saiu do app, do
  gerador e das capturas; fica aqui só o registro.
- **Os cinco de sempre, selados por MD5.** A mecânica usa sementes próprias e o
  engate nasce DEPOIS dos cinco na semente deles, então nenhuma tiragem deles
  muda; e o gerador **falha** se o MD5 de qualquer um dos cinco sair diferente
  do registrado (`ASSINATURAS` em `gerar-sons.mjs`): `tique-1` b17ecfcd…,
  `tique-2` 655a349a…, `tique-3` 0d5bca1f…, `clac` b06c5105…, `jackpot` 7c4e3e14….

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
| `mecanica.mp3` | a mecânica da máquina (v4: cliques + motor), em loop enquanto os rolos giram (29H-B) | 3,0 s | 35,9 KB | 96 kbps mono |
| `engate.mp3` | o mecanismo pegando, no instante em que o giro começa (29H-B) | 160 ms | 2,8 KB | 96 kbps mono |

Total: **81,3 KB**. Todos abaixo do teto de 40 KB por arquivo (lei do app leve).
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

### Mecânica, 1ª rodada (v1-v3) — só cliques (Rodada 29H-B)

A camada que toca por baixo do trem de tiques enquanto os rolos giram. Nesta 1ª
rodada, nada de tom, nada de ar: só **cliques** e **silêncio digital** entre
eles. (Ficou longe da referência do dono — ver a v4 abaixo, que é a do app.)

1. **O clique metálico** (~4 ms de som) — 0,8 ms de impulso de ruído com rampa
   descendente passado por **três passa-bandas em paralelo** (receita RBJ):
   **1,7 kHz** (Q 2,0, peso 1,0), **3,4 kHz** (Q 2,4, 0,8) e **6,2 kHz** (Q 2,8,
   0,55), cada centro com ±6% de sorteio por clique; a soma é apagada por um
   decaimento de **2,2 ms**. É agulha e engrenagem, não uma nota — acaba antes de
   o ouvido ler altura. A força de cada clique varia (0,85–1,0): nenhum igual ao
   anterior.
2. **A grade** — a `porSegundo` cliques por segundo (**11** na v1/v2 → intervalo
   ~90 ms; **13** na v3 → ~77 ms), cada intervalo com **±10 ms** de sorteio e os
   intervalos reescalados para a grade fechar exatamente no trecho: o 1º clique
   entra a 1/3 de um intervalo do início e o último a 1/3 do fim. A **emenda do
   loop** é, portanto, mais um intervalo (2/3 de intervalo + o que o decodificador
   acrescenta: ~56 ms de atraso de codificação e quadro de cabeçalho) — entre 60 e
   120 ms conforme o aparelho, uma vez a cada 3 s, por baixo de um trem de tiques
   10 dB mais alto.
3. **O "tum"** (v2 e v3) — a cada clique, um seno entre **170 e 360 Hz** (sorteado
   por clique, com gerador próprio: a v2 tem exatamente a grade da v1), ataque de
   0,8 ms, decaimento de **7 ms**, a **−15 dB do pico do clique**. Leve de
   propósito: um seno de 7 ms carrega muito mais energia que 1 ms de metal — com o
   ganho medido no buffer cru ele ficava 17× mais forte que o clique, e a −11 dB
   ainda era metade da energia. Assim o que manda no espectro continua a ser o
   metal agudo.

**Medido nos MP3 prontos** (`analisarMecanica` em `gerar-sons.mjs`; cliques pela
envoltória de 1 ms cruzando 20% do máximo, bandas por FFT de 2^18 pontos,
silêncio pelo percentil 30 do RMS de janelas de 5 ms):

| variante | cliques | por segundo | intervalo | 1-8 kHz | 150-400 Hz | > 8 kHz | entre cliques |
|---|---:|---:|---:|---:|---:|---:|---:|
| v1 (só cliques) | 33 | 10,9/s | 92 ±7 ms | 81% | 0,1% | 17% | −180 dBFS |
| v2 (cliques + tum; a do app na 1ª rodada) | 33 | 10,9/s | 92 ±7 ms | 57% | 26% | 12% | −89 dBFS |
| v3 (a v2 a ~13/s) | 39 | 12,9/s | 78 ±6 ms | 59% | 26% | 11% | −80 dBFS |

A geração **falha** se alguma variante sair da régua: cadência fora de 10-12/s
(12-14/s na v3), variação fora de 3-14 ms, energia principal fora de 1-8 kHz, tum
ausente (v2/v3) ou presente (v1), som contínuo entre cliques acima de −60 dBFS,
taxa diferente de 96 kbps, duração diferente de 3,0 s.

### Mecânica v4 (3,0 s em loop) — a 2ª rodada, contra a referência do dono

O dono ouviu as três: a v2 foi a melhor, mas longe da referência dele. A Freaky
mediu as duas com o mesmo método (**16 kHz, janelas de 5 ms**) e apontou três
diferenças: (a) a referência tem um **fundo contínuo de motor** entre os cliques
(piso ≈ 20% do pico, −14 dB; a v2 tinha silêncio absoluto); (b) a cadência é de
**~110 ms** com um **toque duplo** a cada ~6 cliques (par de 40 + 70 ms; a v2 era
regular a 90 ms); (c) o espectro tem mais corpo em 800-2500 Hz e menos acima de
6 kHz (centroide 3,1 kHz; a v2 estava em 3,6). A v4 parte da v2 e corrige as três:

1. **O fundo de motor** — ruído branco filtrado na banda **300-2500 Hz** com a
   amplitude modulada por uma vibração de **120 Hz** (profundidade 0,6): o zumbido
   de um motor elétrico pequeno. Os filtros são de **1ª ordem** (6 dB/oitava: o
   corpo em 300-2500, respirando acima — passa-altas em 180 Hz, passa-baixas em
   3,5 kHz) porque o fundo é ~57% da energia do trecho e a referência tem metade
   da energia acima de 2,5 kHz: com encostas de 24 dB/oitava (1ª tentativa) o
   centroide afundava em 1,5 kHz. O nível é **calibrado medindo o buffer com a
   régua** (piso = mediana do RMS das janelas de 5 ms; pico = a janela mais
   forte): v4 **−14 dB**, v5 **−11 dB**, v6 **−17 dB**.
   **Sem falhas no loop:** o ruído nasce 60 ms mais longo e as pontas são cruzadas
   (fade de potência igual: o começo do trecho é a continuação do fim), e 3,0 s ×
   120 Hz são 360 ciclos inteiros — a modulação acaba na fase em que começa.
2. **A cadência** — 110 ms ±7 ms (sorteio por intervalo, intervalos reescalados
   para a grade fechar no trecho), e a cada 6 cliques o 6º ganha um **segundo
   toque 40 ms depois** (0,9 da força) com o clique seguinte 70 ms depois desse: o
   par ocupa um intervalo normal. A grade começa e acaba a meio intervalo das
   pontas, então a emenda do loop é mais um intervalo de 110 ms (com o loop exato
   do Web Audio — ver "Como o sorteio usa").
3. **O clique com corpo** — o metal da v2 (três passa-bandas) passado por um
   **passa-baixas suave em 6 kHz** (2ª ordem, Q 0,5) e somado a uma **ressonância
   curta de madeira/metal**: dois modos (~1,0 e ~1,9 kHz, ±8% por clique), senos
   decaindo em 8 ms (a cauda acaba em ~25 ms), a −16 dB do pico do metal. O
   **tum** de 150-400 Hz fica (seno sorteado por clique, 6 ms, −15 dB do pico).

**A régua** (`medirRegua` em `gerar-sons.mjs`), no MP3 pronto, reamostrado a
16 kHz com **sinc janelado** (um biquad em 7 kHz como anti-aliasing comia a banda
6-8 kHz e a régua não batia com a da Freaky; com o sinc, a v2 dá 23% em 6-8 kHz
contra os 22% que ela mediu): picos pela envoltória de 1 ms acima de 2,2× o piso
**e subindo ≥ 1,2× o piso em 1 ms** (o ataque — a vibração do motor sobe devagar e
nunca tanto), 25 ms de refratário; picos/s = picos ÷ duração; intervalo = mediana
dos intervalos ≥ 90 ms ± desvio; pares = intervalos < 55 ms; piso/pico nas
janelas de 5 ms; bandas e centroide por FFT de 2^16 pontos (fração da energia
entre 20 Hz e 8 kHz). A geração **falha** se a v4-v6 sair de: 9-12 picos/s,
intervalo 103-118 ms, ≥ 3 pares, piso a ±2 dB do pedido, centroide 2,6-3,6 kHz,
6-8 kHz ≤ 20% e 800-1500 ≥ 12%, 96 kbps, 3,0 s.

| arquivo | picos/s | intervalo (ms) | pares | piso/pico | 150-400 | 400-800 | 800-1500 | 1500-2500 | 2500-4000 | 4000-6000 | 6000-8000 | centroide |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| referência (dono) | 9,9 | 110 | — | 20% (−14 dB) | 7% | 8% | 16% | 16% | 16% | 20% | 14% | 3,1 kHz |
| v2 (1ª rodada) | 11,0 | 98 ±4 | 0 | 0% (−53 dB) | 28% | 2% | 5% | 10% | 16% | 14% | 23% | 3,2 kHz |
| **v4 (a do app)** | 10,7 | 111 ±4 | 5 | 20% (−14 dB) | 8% | 6% | 15% | 19% | 22% | 17% | 13% | 3,0 kHz |
| v5 (fundo −11 dB) | 10,7 | 112 ±4 | 5 | 29% (−11 dB) | 6% | 7% | 15% | 19% | 21% | 18% | 14% | 3,1 kHz |
| v6 (fundo −17 dB) | 10,3 | 112 ±4 | 4 | 14% (−17 dB) | 11% | 5% | 16% | 20% | 23% | 15% | 11% | 2,8 kHz |

A grade tem exatamente 4 pares (aos 617, 1275, 1935 e 2612 ms); o 5º que a régua
lê na v4/v5 é um pico a mais que o ruído do motor arranca do detector (±1 em 32).
O que ainda difere da referência: 1500-4000 Hz um pouco cheio (+9 pontos) e
4-6 kHz um pouco vazio (−3) — é a assinatura do motor de 1ª ordem; para ir além
seria preciso um fundo mais brilhante do que "banda 300-2500".

### Engate (160 ms) — o mecanismo pegando (Rodada 29H-B)

Nasce no mesmo instante da mecânica e do 1º tique. Tudo seco — nenhuma varredura
de ruído, nenhum sopro:

1. **A trava** (0 ms) — o clique mais pesado (centros mais graves: 1,3 / 2,7 /
   5,2 kHz, decaimento de 3 ms) e o peso assentando: seno **210 → 150 Hz** com a
   fase acumulada (uma varredura ingênua estala na emenda), 22 ms de decaimento, a
   −7 dB do clique.
2. **Dois dentes da catraca pegando** (45 e 85 ms), mais leves (0,6 e 0,45), cada
   um com o seu tum pequeno — o mecanismo entrando na cadência da mecânica.

**Por que 160 ms de som e não 300:** o teto do dono vale para o que o aparelho
TOCA, e o `<audio>.duration` do Safari/WebKit é maior que o som sintetizado —
o LAME acrescenta ~25 ms de atraso de codificação, arredonda a quadros de 1152
amostras (26 ms) e o Safari ainda conta o quadro de cabeçalho Xing/Info (medido
na alavanca: 0,72 s de som davam 0,784 s). **160 ms dão 0,235 s no
decodificador.** O gerador confere isso (`medirMp3`, que conta os quadros como o
WebKit) e falha se o engate passar de 0,3 s.

### Alavanca — reprovada (registro)

A 1ª tentativa do 4º efeito (2-out, tarde): puxada (ruído em passa-banda varrendo
900 → 350 Hz + mola 1400 → 950 Hz), catraca (12 cliques acelerando) e engate
(clunk 140 → 95 Hz), 720 ms, com uma variante "pesada". O dono reprovou as duas
pelo **sopro agudo** — a varredura de ruído da puxada. Saiu do app
(`public/sons/alavanca.mp3`), do gerador e das capturas.

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
**1,0**, mecânica **0,158** (= 0,5 × 10^(−10/20): **−10 dB do tique**, os dois
arquivos normalizados ao mesmo pico de −1 dBFS), engate **0,6**.

**A vida da mecânica (29H-B):** `girar()` dispara o engate, liga a mecânica e o
1º tique no mesmo instante; `pararGiro()` para só o trem de tiques — os rolos
ainda giram devagar enquanto travam um a um; `travar()`, chamado quando o
**último** rolo recebe `.stop`, apaga a mecânica em 80 ms (cortar um clique ao
meio estalaria). Medido na cerimônia real (cena `rodada29hb`, bloco G): engate,
mecânica e tique a ≤ 1 ms um do outro; `travar` no instante do 4º `.stop`,
430-440 ms depois de `pararGiro`; parada 124 ms depois.

**O loop sem emenda (v4):** o fundo de motor é contínuo, e um `<audio loop>` com
MP3 deixa um **buraco na emenda** — o Safari toca o atraso de codificação e o
quadro de cabeçalho do LAME (~56 ms de silêncio a cada volta; o Chrome os
desconta). Por isso a mecânica toca por **Web Audio**: o trecho é baixado e
decodificado UMA vez no gesto (`prepararNoGesto` / `toggle`: `fetch` +
`decodeAudioData`; `/sons/*` tem CORS para o app nativo) e um
`AudioBufferSourceNode` em loop é exato até a amostra, com os pontos do loop na
primeira e na última amostra com som, recuados 1/120 s cada (um ciclo da
vibração: a modulação segue na mesma fase) — o silêncio do decodificador fica de
fora. `travar()` apaga pelo `GainNode` (rampa de 80 ms) e para a fonte. Se o Web
Audio faltar, falhar ou o trecho ainda não estiver pronto no instante do giro,
vale o `<audio loop>` de sempre (com o buraco). Provado na cena `rodada29hb`:
bloco H (Chromium) — trecho decodificado com 3,000 s, loop 8 → 2992 ms, fonte em
loop com o ganho da lei, parada 90 ms depois de `travar`; bloco G (o WebKit do
Playwright, que não tem Web Audio) — o caminho de reserva inteiro.

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
