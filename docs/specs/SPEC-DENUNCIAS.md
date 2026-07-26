# SPEC — Denúncias + Triagem IA (o cérebro)

> **IMPLEMENTADA** (Tijolo 3 Fase B · backend `94a5430` · frontend `eaa4c58`):
> store JSON append-only, triagem Fable+fallback com leis duras, anti-abuso, rotas,
> modal 6 categorias, fila do admin (preview borrado), desfecho discreto, agregados.
>
> Papel, não código. Tijolo 3 da fase Segurança (SPEC-SEGURANCA v2, camada b).
> **Fase A = desenho + mockups. Zero app real.** Mockup antes de código.
> Princípio-mãe: **o dono é cego ao conteúdo** — vê só agregados. Quem decide é a
> IA (óbvios) + o admin da equipa (ambíguos). Conservador por desenho.

---

## 1. CATEGORIAS (o utilizador escolhe 1)

Hoje o código tem 4 motivos genéricos (`linguagem_inapropriada`, `spam`,
`conteudo_ofensivo`, `outro` — migração 009). São vagos demais para triagem: a IA e
o admin precisam de saber **que tipo de dano** para decidir. Novas 6:

| Categoria | Cobre | Porquê separada |
|---|---|---|
| **Nudez / sexual** | nudez, ato sexual, conteúdo explícito | dano + jurídico distintos; casa com o filtro NSFW |
| **Violência / ódio** | agressão, gore, ódio a grupo, ameaças | escala de dano diferente de assédio pessoal |
| **Assédio / bullying** | ataque a pessoa concreta, humilhação | é **quem** é atingido, não o quê — precisa de contexto humano |
| **Spam / golpe** | publicidade, links falsos, burla | quase sempre auto-resolúvel; baixo risco emocional |
| **Perigo a menor** | menor sexualizado/exposto/em risco | **REGRA DURA** (ver §2) — nunca é "só mais uma" |
| **Outro** | o que não encaixa | válvula de escape; sempre vai a humano |

**Migração dos 4 antigos:** `linguagem_inapropriada`→assédio/bullying;
`conteudo_ofensivo`→violência/ódio (ou nudez, à escolha do denunciante);
`spam`→spam/golpe; `outro`→outro. Denúncias antigas mantêm-se; o CHECK novo aceita
os 6 + os 4 legados (não se reescreve histórico).

**Ajuste proposto (justificado):** manter as 6 como estão. Considerei fundir
"violência/ódio" em dois, mas na escala amadora isso pede ao utilizador uma
distinção que ele não faz bem no calor do momento — 1 toque, 6 opções claras, chega.
"Perigo a menor" fica **sempre visível e sem fricção** (não exige "provar"): o
precaucionismo vale mais que a exatidão da etiqueta.

---

## 2. MATRIZ DE TRIAGEM (categoria × tipo de conteúdo)

Decisão da IA por caso: **REMOVER** (auto, óbvio infrator) · **ARQUIVAR
IMPROCEDENTE** (auto, claramente inócuo) · **FILA HUMANA** (ambíguo → admin da
equipa). Tipos: **foto**, **texto**, **perfil** (avatar+nome+bio).

| Categoria | Foto | Texto | Perfil |
|---|---|---|---|
| **Nudez/sexual** | IA remove se explícito claro; senão fila | fila (texto sexual é contexto) | fila |
| **Violência/ódio** | fila (gore óbvio → remove) | IA remove ódio/ameaça inequívoca; dúvida→fila | fila |
| **Assédio/bullying** | fila | **fila SEMPRE** (precisa saber a quem se dirige) | fila |
| **Spam/golpe** | IA arquiva se inócuo | **IA resolve** (remove golpe / arquiva) | IA remove perfil-spam óbvio; dúvida→fila |
| **Perigo a menor** | **ESCALA SEMPRE** | **ESCALA SEMPRE** | **ESCALA SEMPRE** |
| **Outro** | fila | fila | fila |

### REGRA DURA — "Perigo a menor"
- **NUNCA auto-arquiva. NUNCA a IA decide sozinha "improcedente".** Sempre **escala**:
  **fila PRIORITÁRIA** (topo, marca vermelha) + **registo permanente** imediato.
- A IA pode, no máximo, **ocultar preventivamente** o conteúdo enquanto espera o
  humano (nunca apagar de vez sem registo). O admin da equipa vê primeiro; casos
  desta fila também ficam sinalizados para **encaminhamento externo** (fora do v1,
  mas o registo nasce pronto para isso).
- Precaução > exatidão: um falso alarme aqui custa um clique; um falso negativo custa
  uma criança.

### Conservadorismo geral
- A IA **só auto-REMOVE** em alta confiança (≥ limiar duro, ver §3). **Só
  auto-ARQUIVA** quando o conteúdo é claramente inócuo E a categoria é de baixo risco
  (spam). Tudo o resto → **fila humana**. Dúvida nunca vira remoção.

---

## 3. O PROMPT DE TRIAGEM (o real)

Modelo: **Fable** (juízo curto, barato, PT). Recebe conteúdo + categoria + contexto;
devolve **só JSON**. Conteúdo sensível: o texto do prompt fala de "avaliar", nunca
pede descrição gráfica; imagens vão como referência ao classificador + amostra.

```
És o moderador de triagem do Futty, uma app de futebol amador entre amigos.
Recebes UMA denúncia e decides o encaminhamento. És CONSERVADOR: na dúvida,
mandas para revisão humana — nunca removes por engano, nunca arquivas um caso
sério como improcedente.

DENÚNCIA
- categoria escolhida pelo denunciante: {categoria}
- tipo de conteúdo: {foto|texto|perfil}
- conteúdo: {texto do post/comentário/bio, ou "IMAGEM — scores do classificador:
  porn={p} hentai={h} sexy={s}; legenda={...}"}
- contexto: equipa {nome}, autor é membro há {tempo}, {n} denúncias anteriores
  sobre este autor, denunciante com peso {0..1}.

REGRAS
1. Se a categoria for "perigo a menor": decisão = "escalar" SEMPRE. Nunca outra.
2. Só "remover" se a infração for INEQUÍVOCA e grave (confiança alta).
3. Só "arquivar_improcedente" se for CLARAMENTE inócuo E categoria de baixo risco
   (spam). Nunca arquives assédio, ódio, nudez ou menor.
4. Qualquer ambiguidade, contexto pessoal, ou categoria sensível → "fila_humana".

RESPONDE só com JSON:
{
  "decisao": "remover" | "arquivar_improcedente" | "fila_humana" | "escalar",
  "confianca": 0.0-1.0,
  "justificativa": "uma frase curta, factual, sem citar conteúdo gráfico"
}
```

- **Limiar duro de auto-remoção:** `decisao=="remover"` só se aplica com
  `confianca ≥ 0.90`; abaixo disso, a decisão degrada para `fila_humana` (o servidor
  força, não confia só no modelo). "escalar" ignora confiança (é sempre).
- **Imagens:** a IA NÃO "vê" a foto crua para decidir remover sozinha — usa os
  **scores do NSFW** (tijolo 2) + legenda. Remoção automática de foto só quando o
  NSFW já dava explícito e a categoria bate certo; resto → humano com preview borrado.

---

## 4. ANTI-ABUSO (denúncia também se abusa)

- **Peso do denunciante (0..1), começa em 1.0.** Cada denúncia **arquivada como
  improcedente** baixa o peso; denúncias **confirmadas** sobem-no de volta. Peso
  baixo NÃO silencia (a denúncia entra na mesma) mas **desprioriza** na fila e conta
  menos para "várias pessoas denunciaram".
- **Limite diário:** máx **N denúncias/dia por utilizador** (arranque: 10). Acima →
  bloqueia com "já recebemos as tuas denúncias de hoje". (Rate-limit dedicado —
  fecha a lacuna B5 do mapa de vulnerabilidades.)
- **Uma denúncia por (alvo, denunciante)** — já garantido pelo UNIQUE atual (idempotente).
- **Denúncia coordenada (brigada):** muitas denúncias do mesmo alvo por peso-baixo
  ≠ sinal forte; a fila mostra "peso agregado", não contagem crua.
- "Perigo a menor" **ignora peso e limite** — nunca se estrangula por anti-abuso.

---

## 5. REGISTO (o escudo jurídico)

- **Toda decisão fica em log permanente e imutável** (append-only): denúncia →
  triagem IA (decisão+confiança+justificativa) → ação humana (se houve) → desfecho.
  Campos: alvo, categoria, denunciante, decisor (IA/admin+id), quando, porquê,
  ação tomada, snapshot mínimo (hash/ref do conteúdo, não o conteúdo em claro no log).
- **Retenção:** casos de "perigo a menor" retêm mais e marcam para encaminhamento.
- **O dono vê SÓ agregados** (lei já selada, SPEC-SEGURANCA v2 §c → SPEC-GABINETE):
  nº por categoria, % auto-resolvida, tempo médio, zero conteúdo, zero identidade em
  claro. O log detalhado é acessível só ao admin da equipa (o seu convívio) e ao
  fluxo legal, nunca ao dono como leitura casual.

---

## 6. FLUXO (ponta a ponta)

```
denúncia (categoria, 1 toque)
   │  (rate-limit + peso do denunciante)
   ▼
TRIAGEM IA (Fable) ──► "escalar" (menor) ─────────► FILA PRIORITÁRIA + registo
   ├─ "remover"  (conf ≥ 0.90) ──► remove + registo + apaga ficheiro (tijolo 1B)
   ├─ "arquivar_improcedente" ───► fecha + registo + ajusta peso do denunciante
   └─ "fila_humana" / conf baixa ─► FILA DO ADMIN (preview borrado) 
                                       │  admin: remover | manter | avisar
                                       ▼
                                    registo + desfecho
   ▼
DESFECHO ao denunciante: "a tua denúncia foi analisada — obrigado por cuidares
da casa." (sem veredicto detalhado, nunca expõe o que aconteceu ao alvo)
```

---

## 7. ORDEM DE CONSTRUÇÃO (Fase B, com ordem própria)
1. Schema: categorias novas + `peso_denunciante`, `denuncia_log` (append-only),
   estados da denúncia (pendente/ia_resolveu/fila/resolvida/escalada).
2. Endpoint de triagem (chama Fable; força limiar duro; regra do menor no servidor).
3. Fila do admin (a que já existe, enriquecida: preview borrado, categoria, ações).
4. Desfecho + notificação discreta ao denunciante.
5. Agregados → Gabinete do Dono.
> Cada peça: mockup aprovado antes do código.
