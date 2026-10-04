# Licenças de média — FUTTY

## Dados de lugares (`public/dados/`) — buscados do site, fora do pacote nativo

Servidos pelo site e buscados só quando a pessoa escolhe a cidade ou o bairro de um time (nunca no bundle; no app nativo vêm de `VITE_ASSETS_URL`).
Cada arquivo é gerado por um script em `scripts/` (que também guarda a fonte e os tetos de tamanho).

| Pasta / arquivo | O que é | Fonte | Licença |
|---|---|---|---|
| `public/dados/bairros/<UF>.json` (27 arquivos) | Os bairros do Brasil: nome, município (código IBGE) e ponto central em 2 casas. 17.596 bairros em 896 municípios | **IBGE — Censo Demográfico 2022**, malha de bairros (`BR_bairros_CD2022.zip`): <https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/malha_com_atributos/bairros/shp/BR/> · e, só para o Distrito Federal (que o arquivo de bairros não traz), os subdistritos do mesmo Censo (`DF_subdistritos_CD2022.zip`), que são as 33 Regiões Administrativas · gerado por `scripts/gerar-bairros.mjs` | Dados públicos do IBGE, uso livre com citação da fonte: "Fonte: IBGE, Censo Demográfico 2022" |
| `public/dados/freguesias.json` | As freguesias de Portugal (o "bairro" lá), com o ponto central | CAOP 2025 da Direção-Geral do Território (continente) e Wikidata (ilhas) · `scripts/gerar-freguesias.js` | DGT: dados abertos · Wikidata: CC0 |
| `public/dados/cidades.json` | Os 5.571 municípios do Brasil e os 308 concelhos de Portugal | IBGE via `kelvins/municipios-brasileiros` (MIT, © 2016 Kelvin S. do Prado) e Wikidata · `scripts/gerar-cidades.js` | MIT · CC0 |

O IBGE só delimita bairros nos municípios em que eles existem em lei: 895 dos 5.571. São Paulo (capital), Goiânia, São Luís, Palmas, Rio Branco e o
Distrito Federal não estão no arquivo de bairros. Município sem bairros na lista = o campo Bairro não aparece no app (decisão do dono, 4-out). Do DF entram
as 33 Regiões Administrativas (Guará, Núcleo Bandeirante, Candangolândia…), dadas pelo próprio IBGE como subdistritos; "Asa Norte" não existe no Censo (é parte
do Plano Piloto).

## Sons (`public/sons/`) — gerados por nós (16 set 2026, Rodada 14A)

**Todos os sons do app são nossos.** Os cinco efeitos do sorteio
(`tique-1/2/3.mp3`, `clac.mp3`, `jackpot.mp3`) nascem em código, em
`scripts/gerar-sons.mjs` — nenhum arquivo baixado, nenhuma amostra de terceiros,
nenhuma IA de música. Direito autoral 100% nosso; receita, semente fixa e data
em **`SONS.md`** (raiz do frontend), que é o registro de autoria.

Nada nesta pasta precisa de licença de terceiros. A seção abaixo fica como
histórico do kit que saiu do app.

## Histórico — kit do Pixabay (24 jul 2026, fora do app desde 16 set 2026)

Estes ficheiros **já não estão no app**: saíram para `FUT/FORA-DO-APP/sons-musica/`
(a trilha e a Victory na Rodada 12C, por serem música; os outros três na Rodada
14A, por serem de terceiros). Ver o MANIFESTO lá.

Ficheiros escolhidos e descarregados pelo dono no **Pixabay**, sob a
**Pixabay Content License**: uso **comercial permitido**, **sem atribuição
obrigatória** (apreciada), sem revenda dos ficheiros em si, sem uso em marcas
registadas de terceiros. Termos: <https://pixabay.com/service/license-summary/>

| Ficheiro | Papel no sorteio | Fonte | Licença |
|---|---|---|---|
| `trilha-chiptune.mp3` | Ambiente — a cama em loop (volume baixo) | Pixabay | Pixabay Content License |
| `slot-machine.mp3` | O giro dos rolos (corte seco na trava) | Pixabay | Pixabay Content License |
| `Hud UI.MP3` | Toques de interface + micro-doses do brinde | Pixabay | Pixabay Content License |
| `sorteio-finalizado.mp3` | O véu / cascata de travas | Pixabay | Pixabay Content License |
| `Victory.MP3` | A festa da celebração (fade-out no fim) | Pixabay | Pixabay Content License |

> Nota: os URLs de origem exatos de cada faixa não foram registados no download —
> se quiseres o rasto completo, cola-os aqui (1 linha por faixa).
> Sons SINTETIZADOS (Web Audio, no código) permanecem como fallback quando um
> ficheiro falta — zero royalties, zero assets.

### Anexo — README original da pasta (`public/sons/README.txt`)

```
Coloca aqui os ficheiros de som do FUT App:

- tambor.mp3  (celebração do sorteio)
- fanfare.mp3
- sino.mp3

Estes ficheiros não são distribuídos no repositório; adiciona-os localmente para
ouvires os sons após o sorteio (quando activos nas configurações do perfil).
```
