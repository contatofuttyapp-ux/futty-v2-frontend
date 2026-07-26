# SPEC — Rede Social (Resenha)

> Papel vivo. Decisões de produto + fichas de implementação por fase. Sem código aqui.

---

## 1. NOTIFICAÇÕES PUSH

### Stack actual (medido)
- **Web Push nativo (VAPID)** via `web-push` (npm) no backend + **service worker** (`/sw.js`) + `pushManager.subscribe` no cliente (`src/hooks/usePushNotifications.js`). Subscrições em `push_subscriptions` (Supabase). Chave pública em `GET /api/push/vapid-public-key`.
- **NÃO** usa FCM SDK nem OneSignal. É self-hosted sobre o Push API do browser.
- **Custo:** €0 a qualquer escala (1k ou 10k utilizadores). O transporte usa os push services dos browsers (FCM/Mozilla/APNs-web) de forma transparente e gratuita; nós só assinamos com VAPID. Sem custo por mensagem.

### Eventos que notificam (v1 da rede)
| Evento | Destinatário |
|---|---|
| Comentário no meu post | autor do post |
| Resposta ao meu comentário | autor do comentário |
| Reação ao meu post | autor do post |
| Marcação/menção (quando existir) | o mencionado |
| Post do admin / anúncio | membros da equipa |
| Resultado + prémios do jogo | artilheiro / destaque / campeão(es) |

### Preferências por utilizador
- Toggle **por TIPO de evento** + um **master off**. Vive no **Perfil**.
- Default: todos ligados (master on) após conceder permissão de push.

### Fase
- Estreia **junto com a abertura da rede**, logo **após o filtro de moderação** (rede abre → notificações estreiam juntas).

---

## 2. VÍDEO NA RESENHA

### Decisão (v1)
- **SEM upload de vídeo em v1.** O código de upload fica **dormente**: o composer usa `accept="image/*"` (sem `video/mp4`); o backend fica **intacto** (`POST_MEDIA` ainda inclui `video`, multer 50MB) e religa-se por **um toggle** quando houver receita.
- **Motivo:** vídeo é o grosso da fatura de storage/banda projectada. Cortá-lo em v1 poupa **~50–75%** do custo previsto.

### Compensação — LINK EMBUTIDO (implementado)
- URL de **YouTube / TikTok / Instagram** no texto do post → **card de preview** no feed (vidro + 45°). **Zero storage nosso.**
- **YouTube:** thumbnail (`img.youtube.com/vi/<id>/hqdefault.jpg`) + botão play → ao tocar, **embed inline** (`youtube.com/embed/<id>?autoplay=1`).
- **TikTok / Instagram:** card de link (ícone + URL) → abre em **nova aba** (thumbnails exigiriam oEmbed/scraping — fora do "barato"). Reavaliar se surgir via barata.

### Tectos de storage (aplicados)
- **Fotos:** clamp a **1600px** no lado maior + **JPEG 0.9** (client-side no CropModal).
- **Vídeo (upload, dormente):** multer **50MB** + mensagem clara; sem transcodificação.
- **Uso actual do bucket `resenha`:** ~1.9 MB, 4 ficheiros. Plano Supabase Free = 1 GB storage / 5 GB egress-mês (folga enorme).
- **Órfãos:** tratados na fase **Privacidade** (não mexer agora).

---

## 3. ALCANCE DO POST
- Post **nasce e vive na equipa escolhida** (`team_id`); feed agregado filtra por chips. **Alcance global = nunca.** Multi-equipa = backlog de conveniência (cria N posts).

---

## 4. ESCUDO / LOGO DE EQUIPA

### Feito (v1 — fallback barato)
- Componente `EscudoEquipa`: iniciais num escudo do cânone (chanfro 45°, borda na **cor** da equipa, véu vidro). Já mostra `logo_url` se existir.
- Aplicado: **chips do Ranking** (adenda) + **chips da Resenha** + **cabeçalho do Ranking**. Restantes usos de nome de equipa = transversal futura (TeamAvatar redondo ainda vive noutras páginas).

### Backlog — upload de logo pelo admin
- O campo **`logo_url` já existe** na tabela `teams` (o `/api/teams` devolve-o). Falta o **fluxo de upload** (admin escolhe/recorta o logo) e a **gating no filtro de moderação** (fase Segurança) — um logo é conteúdo visível, tem de passar o mesmo filtro das fotos.
- Quando implementar: upload → moderação → `logo_url` preenchido → `EscudoEquipa` mostra a imagem automaticamente (já suportado).

---

## 5. RADAR ADAPTATIVO ↔ FLAG mostrar_gols

O radar da Vitrine (Vaga 6) nasce dos **eixos activos**: 5=pentágono, 4=losango, 3=triângulo (`radarPts` divide por N). Hoje o endpoint devolve os 5 (presença, gols, artilharia, vitórias, notas).

**Ligação ao backlog `mostrar_gols`** (flag do admin, ainda por criar): quando **OFF**, `gols` E `artilharia` saem do radar (são métricas de golo) → o polígono passa a **triângulo** (presença, vitórias, notas) sozinho. Implementação: o endpoint omite esses eixos quando o flag está off; o front já se adapta (filtra `value != null`). Mesmo flag esconde o tile de Gols e o "· N gols" da actividade (ver secção 2 — GOLS CONDICIONAIS).

---

## 6. DECISÕES ESTRUTURAIS (registadas pelo utilizador)

### 6.1 BUSCA DE JOGADORES — APROVADA (fase PÓS-Segurança)
- Procurar pessoas **por nome** → ver **cromo/vitrine pública** + equipas dessa pessoa.
- **Regras definem-se na SPEC-SEGURANCA:** quem é indexável (**opt-out**), **menores NUNCA**
  aparecem em busca pública, **sem dados de contacto** expostos.
- Depende do filtro de moderação e das regras de privacidade estarem selados primeiro.

### 6.2 CRIAR EQUIPA VIA AMIGOS — APROVADA (v2 do wizard)
- Além de link/WhatsApp, escolher da lista de **"pessoas que conheces no app"**
  (colegas de equipas **atuais/passadas**) para semear a equipa nova.
- Entra na **v2 do wizard** de criar equipa (não v1).

### 6.3 MENSAGENS PRIVADAS (DM) — MORTA (decisão do utilizador)
- O Futty **não substitui o WhatsApp**. A conversa vive na **Resenha** (pública, da equipa).
- **Nunca reabrir sem nova ordem expressa.**

### 6.4 SISTEMA DE AMIZADE — NÃO EXISTE (decisão firme)
- O vínculo social do Futty é a **EQUIPA**: "amigos" = **companheiros de equipa**.
  **Sem** pedidos de amizade, **sem** lista de amigos, **sem** grafo social paralelo.
- **Resenha inalterada:** é DA EQUIPA. Buscar/ver o cromo de alguém **não** dá acesso à
  resenha dele — o acesso ao convívio é **entrar na equipa** (pedido → admin).
- **Releitura da 6.2** ("criar equipa via amigos"): "pessoas que conheces no app" =
  **colegas de equipas atuais/passadas**, NÃO uma lista de amizades.

## FEATURES FUTURAS — sem data (registadas 26 jul, vaga "em breve: cumprir ou calar")
Removidas as PROMESSAS do produto (não se vende o que não existe). Voltam quando a fonte existir:
- **Raio de busca por distância (Explorar):** removido o filtro morto + "distâncias em breve".
  Volta **quando a geolocalização existir** (opt-in, atrás da fase Segurança).
- **Kits White Gold / Elite Gold (Figurinha):** saíram do seletor (eram breve/locked). Voltam
  quando forem geráveis a valer (arte + gate premium real).
- **Figurinha animada (Planos):** linha removida da página de Planos. Volta quando a animação
  do cromo existir (feature premium futura).
