# Sons do sorteio — receita e autoria

**Gerado por código, sem material de terceiros.**

Criados em **16 de setembro de 2026** (Rodada 14A). Os cinco efeitos de
`public/sons/` nascem inteiros em `scripts/gerar-sons.mjs`: síntese em Float32
(mono, 44,1 kHz) → WAV 16 bits → MP3 pelo `ffmpeg-static`. Nenhum arquivo
baixado, nenhuma biblioteca de áudio, nenhuma IA de música, nenhuma amostra de
terceiros — nem de bancos "CC0". O direito autoral é **100% nosso**.

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

Total: **42,7 KB**. Todos abaixo do teto de 40 KB por arquivo (lei do app leve).
Nenhum viaja dentro do pacote da loja: `preparar-nativo.js` deixa `sons/` de
fora e o app busca do site em tempo de execução (`urlAsset`).

## As receitas

### Tique (≈ 60 ms) — o rolo passando um símbolo

Mecânico com um toque digital, "teclas trocando". Duas camadas:

1. **O clique** — 1 ms de impulso de ruído com rampa descendente, passado por um
   passa-banda biquad (receita RBJ) na faixa mecânica, e um decaimento
   exponencial de ~7 ms. O centro do filtro é o que muda entre as variantes:
   **2600 / 3000 / 3450 Hz** (Q = 1,1), cada um com ±3% de sorteio.
2. **O blip digital** — onda quadrada de **1120 / 1200 / 1285 Hz** (±1%), 15 ms,
   decaimento de 4 ms. É o "toque digital" por cima do clique mecânico.

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

Quatro movimentos. O timbre de sino de todos eles vem da mesma função: seno
fundamental + harmônicos 2× e 3× + um parcial **inarmônico em 4,2×** e outro em
5,4×, cada parcial decaindo mais rápido que o de baixo. O inarmônico é o que
separa "sino" de "flauta" — metal real vibra fora da série harmônica.

1. **Arpejo ascendente** (0 → 0,45 s) — Dó maior, **C5-E5-G5-C6-E6-G6**
   (523,25 / 659,25 / 783,99 / 1046,50 / 1318,51 / 1567,98 Hz), 90 ms entre
   notas, cada uma com 1,25 s de cauda e **subindo em volume** (0,42 → 0,73).
2. **Ding-ding-ding** (0,72 / 0,91 / 1,10 s) — três batidas em C6, mais
   brilhantes e mais secas que as do arpejo.
3. **Chuva de moedas** (1,15 → 2,75 s) — 36 impactos de ruído em passa-banda com
   tom sorteado entre **3 e 6 kHz** (Q = 2,2) mais um tilintar tonal por cima.
   Os instantes saem da **CDF inversa de uma triangular**: a densidade cresce
   até o meio da janela e cai depois, e as moedas do miolo batem mais forte.
4. **Acorde de fecho** (2,40 s) — Dó maior sustentado em sinos (C5-E5-G5-C6),
   entradas escalonadas de 12 ms, ~1,2 s de cauda.

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
**1,0**. Ligado por padrão para quem toca em "Sortear"; desligado para quem só
abre o resultado; a escolha fica lembrada no aparelho; botão de mudo sempre
visível — a lei do som, em `CLAUDE.md`.
