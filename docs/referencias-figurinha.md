# Referências da Figurinha — few-shot do Olheiro (v3)

Este ficheiro guarda os prompts/exemplos canônicos que o Olheiro (`backend/utils/olheiroFigurinha.js`)
deveria usar como few-shot dentro das próprias instruções — exemplos concretos de como
descrever `preserve`/`pose`/`vibe_words` para um sujeito real, para calibrar o "olho" do
modelo antes de qualquer geração.

## PENDENTE — 2 exemplos canônicos do dono

O dono referenciou dois exemplos já partilhados nesta conversa — **"o veterano de azul"**
e **"o estiloso de óculos"** — como material que o Olheiro deveria usar. Procurei em todo
o repositório e em todas as pastas de bancada (scratchpads desta e da sessão anterior) e
não encontrei o texto desses dois prompts em lado nenhum acessível — não foram commitados,
não estão em nenhum ficheiro de bancada, e não sobreviveram à compactação da conversa.

**Não inventei conteúdo de substituição.** Fabricar um "veterano de azul" ou um "estiloso
de óculos" a partir do nada apresentaria como canônico algo que o dono nunca escreveu —
corromperia exatamente a base que este ficheiro deveria fornecer.

**Ação pendente:** o dono precisa re-colar o texto exato dos dois prompts (ou apontar o
ficheiro/conversa onde vivem) para este documento ser preenchido com conteúdo real.
Enquanto isso, o Olheiro funciona SEM few-shot — só com a instrução em prosa (regra de
ouro da pose, regra do build, regra da vibe) em `olheiroFigurinha.js`.

## Formato (para quando os 2 exemplos chegarem)

Cada exemplo deve ter: a foto de referência (ou descrição dela), e o JSON completo que o
Olheiro deveria ter produzido para essa foto — `preserve` (cabelo, barba, acessórios,
formato do rosto, tom de pele, idade aparente, gênero aparente, build) + `pose` (gesto já
presente ou pose escolhida + porquê) + `vibe_words`. Esse par (foto → JSON exemplar) é o
que entra como few-shot na instrução do Olheiro.

### 1. "O veterano de azul" — PENDENTE
### 2. "O estiloso de óculos" — PENDENTE
