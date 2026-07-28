# SPEC — Privacidade & Proteção de Dados (mapa de quem vê o quê)

> Papel. Base para a **política de privacidade pública** (obrigatória p/ LGPD + lojas) e para o
> bloco "Proteção de dados" do Gabinete. Cross-ref SPEC-SEGURANCA, SPEC-GABINETE, SPEC-GEOLOCALIZACAO.

## (a) Papéis (LGPD)
- **O dono do Futty é o CONTROLADOR** — decide o quê e porquê se tratam os dados.
- **Operadores (subcontratantes):** Supabase, Railway, Vercel, fal.ai, Anthropic, e as **lojas**
  (Apple/Google, via IAP — ver SPEC-INFRA). Tratam dados **por ordem** do controlador. **Alojar
  noutro sítio NÃO transfere a responsabilidade** — o controlador responde sempre perante o
  utilizador. (Stripe foi **removido** — pagamentos passam a ser só IAP das lojas.)

## (b) Acesso real de cada operador (princípio do mínimo)
| Operador | O que vê | O que NÃO vê |
|---|---|---|
| **Supabase** | **Tudo** (é a base de dados + auth + storage) | — (é a fonte; protege-se com RLS/buckets privados) |
| **fal.ai** | Só a **foto enviada no momento** da geração de avatar | Resto do perfil, jogos, mensagens |
| **Anthropic** | Só o **conteúdo denunciado** em triagem | Identidade do denunciante/alvo, resto da app |
| **Apple / Google (IAP)** | **Pagamentos da assinatura** (cartão fica na loja) | O **dono NUNCA vê cartões**; a app só recebe o estado do plano |
| **Railway / Vercel** | **Execução e tráfego** (logs técnicos) | Não é destino de dados de negócio |
| **O DONO (Gabinete)** | Só **agregados** (números/gráficos) | **Lei do dono cego:** zero conteúdo/identidade |

## (c) Geolocalização (reforço)
- A **posição do UTILIZADOR nunca é enviada nem guardada** — vive **no browser** durante a busca
  e desaparece (permissão do browser OU cidade escrita à mão; efémera).
- Só existe a **localização da EQUIPA**: **arredondada (~1 km), opt-in do admin, pública**. Nunca
  morada exata; equipas privadas nunca entram na busca. Ver SPEC-GEOLOCALIZACAO.

## (d) TODO (compliance)
1. **Registar os DPAs** (Data Processing Agreements) de cada operador — todos publicam o seu;
   basta aceitar/arquivar o link + data. Estado no Gabinete (bloco "Proteção de dados").
2. **Publicar a política de privacidade** (com este mapa em linguagem simples) — **obrigatória**
   para LGPD e para submeter às lojas (App Store / Play Store). É bloqueador da vaga "App nas lojas".
3. **Direitos do titular:** caminho para exportar/apagar a conta (já há apagar conta; falta o
   pedido formal de exportação — futuro).
