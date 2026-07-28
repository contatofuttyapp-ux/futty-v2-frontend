# SPEC — Geolocalização de EQUIPAS (busca por distância no Explorar)

> Correção do dono (26 jul 2026): a localização é dado da **EQUIPA**, não de pessoas →
> pode entrar **ANTES da Segurança**. FASE A = **spec + SQL, ZERO código** até aprovação.
> Cross-ref SPEC-REDE-SOCIAL (o Explorar) e SPEC-SEGURANCA (buckets/privacidade).

## Leis fundadoras (invioláveis)
1. **ZERO localização de PESSOAS**, em qualquer circunstância. Nunca guardamos a posição de
   um utilizador — nem a do que procura (ver §3).
2. **Só a EQUIPA** tem localização, e **só se o admin a preencher** (OPT-IN). Sem localização
   → a equipa **não entra** em buscas por distância (aparece na busca por nome/cidade à mesma).
3. **Nunca a morada exata.** As coordenadas são **ARREDONDADAS a ~1 km** (2 casas decimais:
   1° ≈ 111 km → 0.01° ≈ 1.1 km) **no servidor, antes de gravar**. O que fica na BD já é o
   valor grosseiro; a morada real nunca toca a base.
4. **Só equipas PÚBLICAS** (`publica = true` / `modo_visibilidade` público) entram na busca por
   distância. Equipas **privadas nunca** — nem com coordenadas preenchidas.

## (a) O dado na equipa
- Reusa o que existe: **`cidade`** (texto) + **`localizacao`** (texto livre — bairro/referência).
- Novo: **`geo_lat` / `geo_lng`** (arredondados ~1 km). **Preencher = opt-in**; apagar = sair da
  busca por distância. Não há morada, não há ponto exato — só o centro aproximado da zona.
- **Como o admin define o ponto** (DECISÃO PENDENTE — ver §5): geocodificar a `cidade` escrita,
  OU permissão de browser do admin no momento (arredondada), OU escolher num mapa. Seja qual for,
  **o servidor arredonda** antes de gravar.

## (b) Quem entra na busca
- Elegível = **`publica = true` E `geo_lat/geo_lng` não nulos**. Privadas e sem-geo ficam de fora
  (continuam a aparecer na busca por **nome/cidade**, que não usa distância).

## (c) O Explorar — filtro de raio real (5 / 10 / 25 / 50 km)
- A **posição de QUEM PROCURA** vem de uma de duas fontes, à escolha, **e NÃO é guardada**:
  1. **Permissão do browser** (Geolocation API, opt-in explícito) — usada só em memória para o
     cálculo desta busca; nunca enviada crua nem persistida (o cliente pode até arredondar antes
     de mandar, ou mandar só o filtro e receber distâncias).
  2. **Cidade escrita à mão** — geocodificada para um ponto aproximado, também efémero.
- **Cálculo da distância:** Haversine (equipa arredondada ↔ ponto do buscador). Para o volume
  atual (dezenas/centenas de equipas) corre **app-side** sem PostGIS; se um dia escalar, migra-se
  para índice geográfico (decisão futura, não agora).
- Resultado: lista de equipas públicas dentro do raio, ordenadas por distância aproximada.

## O que a base NUNCA tem
- Posição de utilizadores · morada exata de equipas · histórico de localizações · coordenadas
  finas (só o arredondado ~1 km).

## (d) SQL da migração — 042 (correr à mão)
```sql
-- =====================================================================
-- Futty v2.0 — Migração 042: geolocalização de EQUIPAS (busca por distância).
-- Só a EQUIPA tem localização, OPT-IN pelo admin, coordenadas ARREDONDADAS ~1 km
-- (o servidor arredonda antes de gravar — a morada real nunca entra). Só equipas
-- PÚBLICAS com geo entram na busca. ZERO localização de pessoas.
-- Idempotente. ⚠️ Correr manualmente no Supabase (DDL é do utilizador).
-- =====================================================================

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS geo_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geo_lng DOUBLE PRECISION;

COMMENT ON COLUMN public.teams.geo_lat IS
  'Latitude ARREDONDADA a ~1km (2 casas decimais), preenchida so por opt-in do admin. Nunca morada exata. So equipas publicas com geo entram na busca por distancia.';
COMMENT ON COLUMN public.teams.geo_lng IS
  'Longitude ARREDONDADA a ~1km (2 casas decimais). Ver geo_lat.';

-- Índice para varrer só as candidatas (públicas com geo).
CREATE INDEX IF NOT EXISTS idx_teams_geo
  ON public.teams (geo_lat, geo_lng)
  WHERE geo_lat IS NOT NULL AND geo_lng IS NOT NULL;
```
(Reusa `cidade` e `localizacao` já existentes — sem colunas novas de texto.)

## (e) O que falta DECIDIR (antes da FASE B)
1. **Fonte das coordenadas da equipa:** geocodificar a cidade (serviço externo — **Nominatim/OSM
   grátis** vs Google pago), OU permissão de browser do admin, OU mapa. **Recomendo Nominatim
   (OSM), grátis e sem lock-in**, com arredondamento nosso — mas é chamada externa (decisão tua).
2. **Opt-in explícito vs implícito:** "preencher geo = opt-in" (mais simples, recomendado) OU um
   toggle dedicado "aparecer em buscas por distância".
3. **Precisão do arredondamento:** 2 casas (~1.1 km, recomendado) vs 1 casa (~11 km, mais privado).
4. **Fase B só depois destas 3 decisões + a tua aprovação da spec.**
