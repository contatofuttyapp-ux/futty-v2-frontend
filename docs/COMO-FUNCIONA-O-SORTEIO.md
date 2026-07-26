# Como funciona o sorteio dos times

O sorteio do Futty é **justo, à prova de batota e repetível**. Aqui está, em português simples
(com o termo técnico entre parênteses), o que acontece quando carregas na alavanca.

## A semente e o replay
Cada sorteio nasce de um número secreto sorteado no momento — a **semente** (*seed*). Toda a
"sorte" do sorteio sai de um gerador de números que, **dada a mesma semente, produz sempre a
mesma sequência** (*RNG determinístico — mulberry32*). Essa semente fica guardada com o
resultado, por isso **qualquer pessoa que abra o link vê exatamente o mesmo sorteio, na mesma
ordem, para sempre** (*replay exacto*). Não há "segunda tentativa escondida": o que saiu, saiu.

## O baralhar
Os jogadores são baralhados como um baralho de cartas (*Fisher–Yates*), mas usando aquele
gerador semeado — ou seja, é aleatório **mas reproduzível**. Quando os jogadores têm a mesma
avaliação (ex.: todos a zero no início), o resultado fica **praticamente 100% à sorte**.

## Goleiros e cabeças de chave
- **Goleiros** (*goleiro*): um por time. São espalhados por times diferentes (nunca empilhados
  no mesmo), por ordem de avaliação e com a ordem dos times sorteada. Se houver mais goleiros
  do que times, os que sobram entram como jogadores de linha.
- **Cabeças de chave** (*cabeça de chave*): os craques marcados pelo admin. Distribuídos **um
  por time** em ziguezague (*snake draft*) para equilibrar a força. O excesso também vira linha.

## O equilíbrio (baldes de avaliação)
Os restantes são ordenados por avaliação (*rating*, vindo dos votos) e distribuídos em
**ziguezague**: time A, B, C… e depois ao contrário C, B, A… (*snake draft*). Assim o 1º melhor
vai para um time, o 2º melhor para outro, e a força fica repartida — ninguém apanha só os bons.
Quem tem avaliação igual entra pela ordem baralhada (à sorte).

## O tempero de variedade
Se fosse só o ziguezague, os dois melhores **nunca** cairiam no mesmo time e os jogos ficavam
sempre com a mesma cara. Por isso, antes de repartir, cada avaliação leva uma **pequena
perturbação aleatória** (*ruído derivado da semente*) — o suficiente para dois jogadores de
força parecida **trocarem de ordem de vez em quando**. Resultado: os dois melhores calham
juntos **de vez em quando (~1 em cada 3 sorteios)**, não sempre nem nunca, e a forma dos times
deixa de ser previsível — **sem perder o equilíbrio geral** (a dose é pequena e todos são
misturados). Como o ruído sai da **mesma semente**, o **replay continua exato**: abrir o link
mostra sempre o mesmo sorteio.

## Reservas (o banco)
Se sobrarem jogadores depois de todos os times ficarem com o número exato, formam o **banco de
reservas**, ordenado do melhor para o pior e **numerado pela ordem de entrada** (o 1º é o mais
provável de entrar). Goleiros e cabeças de chave a mais **nunca vão para o banco** — são
colocados como linha primeiro.

## Porque ninguém pode manipular
- O resultado depende **só** da semente + das avaliações + de quem confirmou — **não há botão
  de "arranjar o resultado"**.
- A semente é sorteada no servidor no momento do sorteio; muda a semente, muda tudo — mas o
  admin **não escolhe** a semente.
- Como o sorteio é **reproduzível pela semente**, qualquer um pode confirmar que os times
  saíram mesmo daquele número — **transparência total**, sem confiar na palavra de ninguém.

---

**Frase de bolso** (para dizeres a quem perguntar):
> *"O sorteio é aleatório mas gravado numa semente — sai sempre igual se repetires, equilibra
> goleiros e craques por ziguezague, e ninguém, nem o admin, consegue mexer no resultado."*
