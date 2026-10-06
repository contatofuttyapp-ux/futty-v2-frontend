# Capgo — atualização ao vivo das telas (6-out, builds 35/17 = 1.0.1)

*Fonte dos comandos: `--help` da CLI `@capgo/cli` 8.71, README do `@capgo/capacitor-updater` 8.52.1 e capgo.app/docs, conferidos em 6-out. Se a CLI mudar, o `--help` manda.*

## O que é

O app da loja carrega as telas (JS, CSS e imagens leves) de dentro do pacote. O Capgo deixa trocar essas telas **sem passar pela revisão da Apple e do Google**: sobe-se um *bundle* novo, o app o baixa sozinho e passa a usá-lo. Cada build de loja custa dias de espera; o Capgo existe para corrigir uma tela em minutos.

- App no painel: **Futty** (`com.futty.app`), organização Futty. Canal **`production`**: padrão e público, iOS e Android ligados.
- Não vale para o site (Cloudflare Pages): ele segue o publica normal.

## O que o Capgo entrega e o que NÃO entrega

| Entrega (só o que roda dentro da tela) | NÃO entrega → exige build de loja |
|---|---|
| JS e CSS do app (`dist/assets`) | Plugin Capacitor novo (ou versão nova de um existente) |
| Imagens leves que moram no pacote | Permissão nova (câmera, localização, notificações…) |
| Textos, telas, correções de lógica da interface | Ícone, splash, tema da barra, `capacitor.config.json` |
| | Versão nativa (`versionCode`, `MARKETING_VERSION`), Gradle, Xcode |
| | Qualquer coisa do motor (o motor tem o próprio publica) |

Regra de bom senso: o bundle chega a todo celular, também aos que não abriram o app há semanas. Uma tela nova só chama rotas que o **motor de produção já tem** — publica o motor antes.

## Como está ligado no app

- `@capgo/capacitor-updater` 8.x (a linha 8 é a do Capacitor 8).
- `capacitor.config.json` → `plugins.CapacitorUpdater`: `autoUpdate: true` e `appId: "com.futty.app"`. O resto fica no padrão do plugin (`resetWhenUpdate: true` apaga os bundles baixados quando uma versão nativa nova é instalada; `appReadyTimeout` 10 s).
- `src/main.jsx`: logo depois do render, só no nativo (`ehNativo()`), import dinâmico do plugin e `CapacitorUpdater.notifyAppReady()`. **Sem essa chamada o Capgo acha que o app travou e desfaz toda atualização.** O plugin fica em dois chunks fora do arranque (≈ 9 KB); a web nunca o baixa.
- Prova: `npm run provar:navegador -- capgo` (nativo chama `notifyAppReady` uma vez, a web não pede o plugin).

**Quando a pessoa recebe.** `autoUpdate: true` = `"atBackground"`: ao abrir o app (cada volta ao primeiro plano) ele pergunta ao Capgo e baixa em segundo plano; o bundle novo **entra quando o app vai para o segundo plano**, então ao reabrir já é a tela nova. Nunca recarrega no meio do uso. Os modos instantâneos (`always`, `onLaunch`, `atInstall`) **não** se usam: exigem `@capacitor/splash-screen` e seguram a pessoa na tela enquanto baixa.

## Subir um bundle

O bundle é o `dist/` **depois do `preparar-nativo.js`** (sem avatares, sons, dados, sorteio-assets, onboarding, og: o app os busca no site). Isso é o `npm run build:native`. **Nunca** suba o `dist/` de um `npm run build` solto: é o do site, completo e mais pesado.

```
cd C:\Users\phfer\Desktop\FUT\FUTTY-V2\frontend
npm run build:native
npx @capgo/cli@latest bundle upload com.futty.app --channel production --path dist --bundle 1.0.2 --comment "o que mudou"
```

- **`--bundle` é obrigatório.** Sem ele a CLI usa a versão do `package.json` (`0.0.0`), que ela recusa (a versão tem de ser > 0.0.0).
- Antes de subir (do 2º bundle em diante): `npx @capgo/cli@latest bundle releaseType com.futty.app --channel production` imprime `OTA` (pode subir) ou `native` (mudou algo nativo: build de loja, não bundle). `bundle compatibility … --channel production` mostra o detalhe.
- A CLI confere sozinha que o código chama `notifyAppReady()`; se reclamar, **não** use `--no-code-check`: é sinal de que a chamada saiu do `main.jsx`.
- O bundle leva as variáveis `VITE_*` do `.env.production` **desta máquina** (as mesmas chaves públicas do `.aab`). Suba sempre de um PC com o `.env.production` certo e de `main`.
- Conferir: `npx @capgo/cli@latest bundle list com.futty.app`.
- O login da CLI já está no perfil do Windows (feito pelo Pedro). Se `npx @capgo/cli@latest app list` pedir login, para e avisa; a chave nunca passa pelo Claude Code.

## A regra da versão

- **semver, sobe a cada upload e nunca repete**: 1.0.1 → 1.0.2 → 1.0.3… O Capgo recusa versão repetida **e também a de um bundle apagado** ("deleted versions cannot be reused").
- O primeiro bundle é o **1.0.1**, igual ao nativo (bloco C, a partir de `main`): serve só de base. Telas novas = 1.0.2 em diante.
- O canal não entrega bundle de versão **abaixo** da nativa instalada ("updates under native" desligado). Quando sair uma versão nativa nova (ex.: 1.1.0 na loja), o próximo bundle é ≥ 1.1.0.
- O canal está em `Auto Update = major`: um bundle de versão **maior** (2.0.0) não chega a quem está na 1.x; só por loja.

## Desfazer (rollback)

1. **Pelo painel:** capgo.app → Channels → **production** → aba **History** → escolher a versão anterior → confirmar (ou o ícone de coroa ao lado do bundle anterior). Vale só para o canal escolhido. Os celulares recebem a versão anterior **na próxima verificação** (a próxima abertura do app).
2. Pela CLI, equivalente: `npx @capgo/cli@latest channel set production com.futty.app --bundle <versão anterior>` (opção `--bundle` do `channel set`; ainda não exercitada, não há bundle).
3. **Unlink** do bundle no canal pausa as atualizações enquanto se investiga; **Built-in Bundle** volta ao que veio da loja (mais drástico).
4. **Rollback automático no aparelho:** se o `notifyAppReady()` não rodar em 10 s (bundle quebrado que nem abre), o plugin volta sozinho ao bundle anterior. Erro de lógica depois de abrir **não** dispara isso; aí é o passo 1.

## Custo

- Plano **Solo: US$ 14/mês** (a página de preços do Capgo é em dólar, com 20% de desconto no anual; o `BUILDS-35-17.md` fala em "~€12/mês", a mesma ordem de grandeza). Aprovado pelo dono em 6-out, mensal. **14 dias grátis, sem cartão.**
- Limites do Solo: **2.000 usuários ativos por mês**, 20 GiB de armazenamento, 100 GiB de banda por mês, apps e membros ilimitados.
- Passou de 2.000 usuários ativos/mês: o plano seguinte é o Maker, US$ 39/mês (10.000). Rever o plano antes de o app chegar perto desse teto.
- Ordem de grandeza: o bundle tem no máximo ≈ 2,3 MB (o zip sai menor). 100 GiB de banda cobrem dezenas de atualizações completas para 2.000 pessoas.
- O `BUILDS-35-17.md` pede uma linha do Capgo no `CONTAS.md` (conta contatofuttyapp, login Google, plano Solo quando o teste acabar).
