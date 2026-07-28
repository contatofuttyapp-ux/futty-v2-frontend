# SPEC — UNIFORMES (decisões estruturais; ZERO código agora)

## 1. Modelo único, para sempre
- O **corte preto atual** é O uniforme do app **para sempre** — nunca se criam
  outros modelos/cortes. Varia **só a cor de destaque** (accent) sobre o preto.
- Simplicidade deliberada: uma silhueta reconhecível, infinitas cores.

## 2. Paleta = família do sorteio
- **OURO · ROXO · PRATA · BRONZE** (as cores da casa / dos kits do sorteio).
- Papéis novos:
  - **OURO → exclusivo premium** (deixa de ser o default).
  - **ROXO → o padrão** de todos os utilizadores.
  - **PRATA / BRONZE → alternativas livres** (grátis).
- **Migração:** testers atuais **mantêm o dourado** até ao lançamento; contas
  **novas nascem em roxo**. (Não retirar o ouro a quem já o tem — só muda o default.)

## 3. Uniforme próprio da equipa (premium) — 2 fases
### v1 (PRÉ-Segurança) — por CORES
- O admin da equipa escolhe **cores** (primária + destaque) num **picker limitado
  a tons legíveis no cânone** (nada que suma no fundo escuro / choque com a aurora).
- Os avatares dos jogadores desse time passam a usar o **modelo único** com essas
  cores.

### v2 (PÓS-Segurança, gated) — por FOTO do uniforme
- Upload da **foto do uniforme real** → a **IA valida** e, se aceite, gera.
- **Fotos:** **frente obrigatória** + até **2 opcionais** (costas / detalhe).
- **GUIA VISUAL no upload** — como fotografar: frente inteira, **esticado ou
  vestido**, boa luz, sem sombras fortes. Exemplos **certo/errado**, incluindo
  explicitamente **"patrocínio local OK" vs "escudo de clube profissional NÃO"**.

## 4. Regra de Ouro da validação IA (v2) — 3 faixas
- **PASSA:** cores; padrões genéricos; **patrocinadores LOCAIS** (lojas/negócios da
  cidade — a realidade do futebol amador; coberto pelo termo de responsabilidade).
- **RECUSA:** escudos / nomes de **clubes profissionais**; **logos de marcas
  desportivas globais** (Nike, Adidas, Puma, etc.).
- **DÚVIDA** (texto/logo que a IA reconhece como marca global famosa fora de
  contexto): **recusa com motivo + como corrigir**. **Texto local desconhecido
  passa sempre** (não penalizar o amador por um patrocínio que a IA não conhece).
- Mensagens: aceite → **"Uniforme aceite"** + gera; recusa → **motivo claro + como
  a foto/design deve vir**.

## 5. Termo de responsabilidade (1 clique, no upload)
> "Declaro que tenho o direito de usar este design, **incluindo os patrocínios nele
> presentes**; a responsabilidade é minha."
- **Aceite + timestamp guardados** (quem, quando, que campeonato/equipa/versão).
- É o que legitima o "patrocínio local PASSA" da Regra de Ouro.

## 6. Custo de IA — sob controlo
- Regeneração **ON-DEMAND**: só quando **cada jogador abre a figurinha** (nunca em
  massa ao trocar a cor/uniforme da equipa).
- **Máx. 1 troca de uniforme por mês, por equipa** (trava de custo e de spam).

## Fase / ordem
- v1 (cores) pode entrar **antes** da Segurança; **v2 (upload + IA + termo) é
  PÓS-Segurança** e não toca na v1. A migração de default (ouro→roxo) alinha com o
  lançamento.

## KIT 2 — Dark Purple (oficial)
- **Gerado** do dark-gold (fal `gpt-image-1.5/edit`, só o dourado → roxo #8b5cf6);
  asset em bucket **público `kits`** (`kits/kit2-dark-purple.png`). Ambos os kits
  (dark-gold, dark-purple) **ativos e LIVRES por agora**.
- **Regra de gating (só no LANÇAMENTO):** **roxo = padrão novo** (default) ·
  **ouro = premium** (gated no plano). Até lá, ambos livres — não aplicar o gating.
- **Nota de infra:** assets de kit = do APP (não PII) → bucket público `kits` (o tijolo
  1C privatizou `avatars` e partia o fal + as thumbnails; saíram de `avatars/Kits/`).
  Pendência separada: o **input** do avatar-IA (foto do utilizador em `avatars` privado)
  deixou de ser alcançável pelo fal → o pipeline precisa de recarregar a foto no storage
  do fal (decisão própria, fora deste fecho).

## Geração — o que dispara o quê (LEI, medido no código)
- **(a) Upload gera SÓ o padrão do kit ATIVO** (default dark-gold), **on-demand** ao abrir
  a figurinha — 1 avatar, **NUNCA os 4 automáticos**. Kits extra são **sob demanda**
  (o utilizador escolhe): a 1ª geração de cada kit gasta 1 crédito IA e **guarda-se no
  slot para SEMPRE** (`user_avatar_slots`); vestir um kit já gerado = **sem geração, sem
  quota**.
- **(b) O SORTEIO NUNCA dispara gerações.** Os times diferenciam-se por **cor / colete /
  escudo** (índice do kit → cor); reusa o `avatar_url` que já existe. Zero IA no sorteio.
- **(c) UNIFORME PRÓPRIO — v2 (pós-Segurança + material do utilizador):** pertence à
  **EQUIPA**, não ao indivíduo. O **admin** sobe a foto da **camisa real** (passa pelo
  **filtro** + **termo de 1 clique**) → a IA converte → vira o **"Kit da equipa"** para
  todos os membros. **Gating premium.** No nível **individual**, só o **catálogo da casa**
  — **zero marcas de terceiros** no cromo individual.

## UNIFORME DA EQUIPA — QUEM PAGA E A VALIDAÇÃO (spec registada 28 jul 2026)
- **Quem paga:** o uniforme próprio da equipa (item c acima) é pago pelo **admin**, em
  **créditos por geração**, à razão de **~1 crédito por jogador** da equipa (o kit tem de
  vestir todo mundo — o custo escala com quem o usa, não é um preço fixo). O admin vê o
  custo em créditos ANTES de confirmar o upload.
- **Validação por IA da foto ANTES de gastar créditos:** a foto da camisa real sobe primeiro
  a um passo de **validação** (é uma camisa? dá para reconhecer padrão/cores? não é uma foto
  de outra coisa por engano?) — só se passar é que a geração real corre e os créditos são
  debitados. Foto fraca/irreconhecível → mensagem digna **"Manda outra foto"** (na linguagem
  da recusa NSFW: fala da IMAGEM, nunca da pessoa) — **sem cobrar** nada nessa tentativa.
  Isto evita o pior cenário: admin gasta créditos numa geração ruim porque a foto não prestava.
