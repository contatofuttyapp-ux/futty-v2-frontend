# SPEC — Segurança & Moderação (ficha)

> Papel, não código. Gate da **estreia pública** da Resenha (rede social). Até estar de pé: círculo de testers.

## Filtro de fotos — fluxo em camadas
1. **Análise pré-publicação (automática):** ao upload, a imagem passa por um classificador (nudez/violência/gore). Veredicto:
   - **limpo** → publica;
   - **suspeito** → segura em fila de revisão (não aparece no feed);
   - **bloqueado** → recusa com mensagem.
2. **Fila de revisão (admin/moderador):** o que ficou "suspeito" espera aprovação humana. Painel simples (aprovar/recusar).
3. **Denúncia (utilizador):** o `DenunciaModal` já existe (look migrado na Vaga 5; comportamento = aqui). Denúncia → fila.
4. **Remoção (admin):** admin remove post/foto; **REQUISITO:** a remoção tem de **apagar o ficheiro no Storage** (hoje só faz cascade na BD — ver auditoria de dados) e registar quem/quando.

## Escolha: LOCAL E GRATUITO (decisão do utilizador)
- **Motor:** **NSFWJS** (TensorFlow.js) a correr em **Node no backend**, no momento do upload. Zero custo por imagem, zero dependência de serviço externo, "menos preciso" **aceite**.
- **Desenho (a rede real faz a moderação, não só o modelo):**
  - o modelo **só bloqueia em ALTA confiança** (ex. `Porn`/`Hentai` > ~0.85) → recusa o upload;
  - **tudo o resto publica** (falsos-positivos custam mais que falsos-negativos numa rede de amigos);
  - **denúncia** (utilizador) + **remoção admin** + **`pode_postar=false` como silenciador** = a moderação real;
  - **camada substituível:** a chamada ao classificador é uma função isolada → trocar por serviço pago (Rekognition/Vision/Hive ≈ 1 milésimo $/img) no futuro **sem redesenho**.
- **Peso:** o modelo NSFWJS (~mob/quant) carrega uma vez no arranque do backend; inferência em memória. Sem custo por request.
- **Implementação:** fase de Segurança (não agora).

## Notas
- **iOS/partilha:** fora deste âmbito (é do sorteio-vídeo).
- **Privacidade cruza aqui:** bucket público + ficheiros órfãos após delete → tratar erasure na fase de Privacidade, moderação nesta.

---

# v2 — MODERAÇÃO EM CAMADAS (decisão do utilizador)

O modelo passa de "filtro + fila" para **3 camadas** com IA de triagem e um princípio jurídico central (o dono é cego ao conteúdo).

## Camada (a) — Filtro automático no upload
- **NSFWJS local** (já decidido acima) corre em **TODA a imagem** no momento do upload.
- **Explícito → bloqueia na hora** (recusa o upload, mensagem clara). Sem passar por humano.
- Tudo o resto publica (falsos-positivos custam mais numa rede de amigos — ver v1).

## Camada (b) — Denúncias com TRIAGEM IA
- Utilizador denuncia (o `DenunciaModal` já existe).
- **Triagem por IA** classifica a denúncia:
  - **óbvio** (claramente infrator) → **auto-resolve**: remove o conteúdo + **regista** (quem/quando/porquê). Sem humano.
  - **ambíguo** → vai para a **fila do ADMIN DA EQUIPA** (não do dono). O convívio é da equipa; quem modera é quem manda na equipa.

## Camada (c) — O DONO É CEGO ("cego por desenho")
- O **dono do app NUNCA vê conteúdo denunciado** — nem na triagem, nem na fila.
- Só vê **agregados** (contagens por categoria, % auto-resolvida, tempo médio) — ver SPEC-GABINETE §segurança.
- **Motivo: proteção jurídica** — quem não vê o conteúdo não responde por ele da mesma forma; a decisão editorial vive na equipa + IA.

## Remoção (mantém o requisito v1)
- Remover conteúdo tem de **apagar o ficheiro no Storage** (não só cascade na BD) + registar. Vale para auto-resolve (IA) e para o admin da equipa.

---

## ORDEM DE CONSTRUÇÃO — fase Segurança
1. **Filtro NSFWJS** (upload).
2. **Denúncias + triagem IA** (auto-resolve / encaminha).
3. **Painel do admin de equipa** (fila do ambíguo).
4. **Gabinete do Dono** (agregados — SPEC-GABINETE).

> **Mockup antes de código em CADA peça** (processo inegociável, CLAUDE.md).
