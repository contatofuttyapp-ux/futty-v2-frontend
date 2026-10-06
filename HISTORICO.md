# HISTORICO — a memória de quando e por que cada coisa foi feita

Este arquivo guarda os comentários de história (rodadas, achados, datas, decisões, bancadas) que foram retirados do código em 6-out-2026 (Arrumação 0, bloco 1-F).
O código guarda só as regras vivas — o PORQUÊ de cada regra, sem data nem número de rodada; a cronologia mora aqui.
Cada item traz a linha aproximada do arquivo no momento da retirada, um trecho de 1 linha do código a que o comentário se referia e o texto original, sem corte;
quando o comentário misturava história e regra, a regra ficou no código e o original completo está aqui.
A lista mestra de decisões continua em C:\Users\phfer\Desktop\FUT\LISTA-CURTA.md e nos RODADA-*.md.

## src/App.jsx

- (linha ~30, `const Login = lazyComRetry(() => import('./pages/Login'));`) Páginas em lazy loading (cada uma no seu chunk), com retry (build 10 —
  ver utils/lazyComRetry.js) para quando o chunk falha a carregar (deploy
  novo publicado com a pessoa já de app aberto, ou resposta ruim transitória
  da CDN).

  As cinco abas da barra de baixo importam-se através de lib/preaquecerAbas.js:
  são as MESMAS funções que a BottomNav usa para as pré-carregar em ócio
  (VELOCIDADE 4). Partilhar a função é o que garante que pré-aquecer e navegar
  falam do mesmo módulo — o registo do browser devolve a mesma promessa.
- (linha ~73, `function IndexRedirect() {`) "/" → /home se autenticado; senão a landing page (visitante).

  VELOCIDADE 5 (14-set) — este `loading` é o do AuthProvider e agora só é verdade
  quando NÃO há sessão guardada no aparelho: com sessão, o AuthProvider já nasce
  com ela (leitura síncrona do localStorage) e nunca se passa por aqui. Quem chega
  a ver este F é o visitante de primeira viagem, e só enquanto o Supabase responde.
- (linha ~86, `function PaginaNaoEncontrada() {`) Rodada 29L (achado 126): o 404 de quem não tem sessão leva à landing e ao cadastro; o de quem tem, ao Início e ao Explorar.
- (linha ~92, `function RedirecionaEquipa() {`) Rodada 29I (achado 103): as rotas em português de Portugal (/equipa/…, /criar-equipa) viraram /time/… e /criar-time. As antigas
  CONTINUAM valendo — link que já foi para o grupo do WhatsApp, favorito, notificação já enviada — e levam para as novas, com a
  query (?entrou=1), o # e o state de quem chegou.
- (linha ~135, `['/time/:slug/jogo/passado', JogoPassado],`) 29S-B: o passo a passo (abre de "Jogo passado →" no Marcar jogo)
- (linha ~141, `['/diagnostico', Diagnostico, true],`) VELOCIDADE 4 — a caixa-preta do app. RODADA 28: só o super-admin, pelo Gabinete; o número
  de todo mundo vem da telemetria anônima (sem botão).
- (linha ~152, `function AnimatedRoutes() {`) Rotas animadas: o PageTransition (keyed pelo pathname) faz o fade/deslize de
  entrada em CSS. Trocar a key remonta o div e é isso que recomeça o keyframe.

  BUILD 11 — SAIU O <AnimatePresence mode="wait">. Servia para segurar a página
  nova até a animação de SAÍDA da antiga acabar; ou seja, punha a visibilidade
  do app atrás de uma animação JS ter de terminar — exatamente o que fez o app
  abrir invisível (ver components/PageTransition.jsx). Uma saída de 0,18s não
  paga esse risco, e sem ela o React troca a página na hora.
- (linha ~173, `<Route path="/equipa/*" element={<RedirecionaEquipa />} />`) Os endereços antigos (29I, achado 103): redirecionam para /time e /criar-time.
- (linha ~177, `<Route path="/avise-me" element={<Navigate to="/" replace />} />`) Rodada 29P: a página do Avise-me saiu (a inicial já é a de verdade); os links antigos das redes caem na inicial.
- (linha ~180, `<Route path="/c/:token" element={<ConviteRoute />} />`) Rodada 29H (item 7): o link curto do convite, futtyapp.com.br/c/<código> — a mesma tela.
- (linha ~185, `<Route path="/s/:codigo" element={<SorteioCurto />} />`) 29I, bloco 3 (item 74): o link curto do sorteio, futtyapp.com.br/s/<código> — leva à vista pública de sempre.
- (linha ~187, `{ROTAS_PRIVADAS.map(([path, Tela, soSuper]) => (`) Rodada 29B (D.3): as rotas com login vêm da tabela ROTAS_PRIVADAS (um <Route> + AuthGuard
                repetido 25 vezes custava ~1,4 KB do arranque).
- (linha ~204, `export default function App() {`) VELOCIDADE 5 (14-set) — SEM TEMPO ARTIFICIAL no arranque. Havia aqui um overlay
  que ficava 1200 ms fixos mais 400 ms de fade, em TODA abertura, olhasse ou não o
  app para o que já estava pronto: um segundo e meio cobrado a quem já tinha tudo
  em cache. O único loading de arranque passa a ser o LoadingFutty, e só enquanto
  a sessão for mesmo desconhecida. No app da loja quem cobre o boot é a tela de
  abertura do sistema, que sai quando a WebView pinta — o overlay duplicava-a.

## src/components/AdCard.jsx

- (linha ~1, `import { useEffect, useRef } from 'react';`) Futty v2.0 — Card de publicidade REAL: consome /api/ads?pagina=X (serving do Gabinete,
  com filtro etário fail-closed + toggle por página no servidor). Conta impressão (ao
  aparecer) e clique (ao tocar) via /api/ads/evento. Sem campanha elegível OU página OFF
  → não renderiza nada. Variants: 'native' (Início/feed) e 'banner' (sorteio).

  Dentro do Início (pagina='inicio', InicioProvider montado — ver Layout.jsx),
  o anúncio já veio dentro de GET /api/inicio (11-set, "1 pedido só") — lê de lá
  em vez de disparar o seu próprio GET /api/ads. O POST /api/ads/evento de
  impressão/clique mantém-se sempre, para qualquer origem do anúncio.
- (linha ~22, `export default function AdCard({ pagina = 'inicio', variant = 'native', ad: adP…`) `ad`/`prontoExterno` (Velocidade 6B, 15-set): quando a tela já pediu o anúncio
  no seu topo — em paralelo com os dados dela, em vez de esperar por eles — passa-o
  por prop e este componente não pede nada. Sem prop, mantém o comportamento
  antigo (pede sozinho ao montar).
- (linha ~34, `const daLoja = useAd(pagina, { ativo: !usaDoInicio && !vemDeFora });`) Velocidade 9: sem prop e fora do Início, lê-se a loja da sessão (lib/ads.js)
  em vez de pedir um anúncio só para esta tela.
- (linha ~51, `const iab = variant === 'banner320x100';`) RODADA 12A — 'banner320x100' é a medida IAB padrão (a "large mobile
  banner"), para a página do sorteio. Uma campanha comprada em qualquer rede
  vem nesta proporção e entra sem recorte. Vai por aspect-ratio e não por
  altura fixa: a caixa reserva o lugar antes de a imagem chegar (nada salta) e
  encolhe junto com a largura em telas estreitas, sem nunca passar dos 360.

## src/components/AtalhosDoInicio.jsx

- (linha ~1, `import { Link } from 'react-router-dom';`) Futty v2.0 — Rodada 29Q: os dois atalhos do Início, "Radar de peladas" e "Criar time", em dois cartões lado a lado logo embaixo do
  card "Seus times" (para quem não administra time, embaixo do avatar, do nome e da nota). Antes eram os dois últimos chips da fila de
  filtro dos jogos, onde ninguém chegava ("definitivamente no lugar errado", dono, 4-out). O cartão inteiro é o link (área de toque cheia).
  Visual da casa: vidro, chanfro de 45° (.hud-corners), Rajdhani. O Radar veste o roxo da casa; o Criar time, o dourado (decisão do dono).

## src/components/AuthGuard.jsx

- (linha ~1, `import { Navigate, useLocation } from 'react-router-dom';`) Futty v2.0 — Protege rotas privadas: redireciona para /login se não autenticado.
  Também sela a conta SUSPENSA: se o PerfilContext (/api/me) devolver o código
  CONTA_SUSPENSA (gate em requireAuth), mostra um ecrã digno em vez do app — a
  conta não entra, sem apagar nada. A Super age sobre a plataforma, nunca o conteúdo.
  Achado 3/23: o perfil já vem do PerfilContext (carregado 1x por sessão) — este
  guard deixou de sondar /api/me por conta própria.
  Rodada 29G: conta com data de nascimento menor de 18 anos também não entra — vê a tela
  de MenorDeIdade (a frase da casa + "Excluir minha conta"). Conta sem data segue (o onboarding e o
  Início pedem a data).
- (linha ~33, `if (suspenso) {`) Rodada 29B (D.3): o layout é o do ErrorPage (a ContaSuspensa era uma cópia dele aqui).

## src/components/AvatarGenericoSheet.jsx

- (linha ~1, `import { createPortal } from 'react-dom';`) Futty v2.0 — Seletor do avatar genérico (31-jul, ordem do dono). Bottom sheet
  com os 6 thumbnails (masc m1-m3, fem f1-f3); toque escolhe e fecha. Mesmo padrão
  do sheet de idioma em MeuPerfil.jsx: .modal-overlay + .hud-corners-topo, PORTAL
  para o <body> (o sheet nasce dentro de PageTransition, que cria um contexto de
  empilhamento próprio — sem o portal a bottom nav pintava por cima).

## src/components/AvisoDeJogo.jsx

- (linha ~1, `import EscudoEquipa from './EscudoEquipa';`) Futty v2.0 — Rodada 29T (bloco A, achado 168): o aviso do topo do Início para o jogo que espera resposta. A pessoa abre o app para
  responder "vou ou não vou": o próximo jogo com presença aberta e sem resposta sobe para o topo, com os botões ali mesmo.
  Os botões chamam a MESMA função dos cards dos Próximos jogos (`onPresence(idDoJogo, vou)`); este componente só desenha.
  Dia e hora no relógio do campo (utils/dataHora.js), com o rabicho da cidade do time quando a pessoa está noutro relógio.

## src/components/BarraPintura.jsx

- (linha ~1, `export default function BarraPintura({ situacao, estimativaSegundos }) {`) Futty v2.0 — Rodada 29B (bloco 2, A): a barra de progresso honesta da pintura (vive dentro do card da figurinha).
  Só apresenta o que utils/progressoPintura.js#situacaoDaPintura calculou: nada de tempo, rede ou estado aqui.
  Estilo INLINE de propósito: CSS de página lazy entra no mapa de pré-carga do arranque (teto de 320 KiB).

## src/components/BoasVindas.jsx

- (linha ~1, `import { useEffect, useLayoutEffect, useRef, useState } from 'react';`) Futty v2.0 — Rodada 29C: as boas-vindas do time — UMA página, as duas máquinas da prova aprovada pelo dono
  (FUT/DESIGN/prova-boas-vindas-v2.html): a DEITADA (A), para time sem logo, com o nome como letreiro na janela; e a
  QUADRADA (B), com dois anéis contínuos de lâmpadas, para time com logo. Quem vê é o `convidado` (1ª vez no time depois de
  aceitar o convite ou de ter o pedido aceito). 29H (item 1): o convidado vê esta tela como a 1ª página do onboarding
  (`comConvite`: "Você foi convidado para o <time>. …", `gravar={false}`: a pessoa ainda não é do time, então a escolha linha/gol
  só volta no onClose e é gravada depois de entrar). A variante de quem só baixou o app saiu na 29D (o Onboarding ganhou o mini
  sorteio); a do criador saiu na 29P (a festa passou para o fim do Criar time, que reaproveita `MaquinaDoTime`). Lâmpadas de CSS,
  0 KB de mídia, sem som (não há gesto); prefers-reduced-motion: tudo parado e sem "tchan". Quem mostra e marca "visto" é a Equipa.

## src/components/BottomNav.jsx

- (linha ~13, `useEffect(() => preaquecerAbas(), []);`) VELOCIDADE 4: a barra aquece os próprios destinos. Cada aba vive num chunk
  separado que, até agora, só começava a ser lido no toque — e o toque ficava
  com cara de morto enquanto isso. Corre em ócio, depois da tela actual estar
  desenhada, e só uma vez por sessão.

## src/components/CampeonatoVistas.jsx

- (linha ~1, `import { useState } from 'react';`) Futty v2.0 — Vistas do campeonato (Vaga 11B), partilhadas pela página do
  membro e pela vista pública: tabela (pontos), bracket (mata), lista de jogos
  com lançamento de resultado (admin) e celebração do campeão.

## src/components/CampoBairro.jsx

- (linha ~1, `import { useEffect, useId, useRef, useState } from 'react';`) Futty v2.0 — Rodada 29H (item 12), refeito na 29T (bloco B, achado 157): o campo "Bairro" do time (Criar time e Ajustes do time). Opcional.
  O bairro é de LISTA, como a cidade (dono, 4-out: "só aceita o que tiver lá"): no Brasil os bairros do IBGE (Censo 2022), em Portugal as
  freguesias — `itens` é a lista da cidade escolhida (hooks/useBairrosDaCidade.js: { linha: [bairro, lat, lng], chave }[]). Sem texto livre:
  o que a pessoa digita só busca; vale o que ela ESCOLHE. Texto que a lista não tem volta ao que valia antes (o bairro já escolhido, ou o
  que o time já tinha salvo — o bairro antigo escrito à mão continua até alguém editar). Quem usa o campo só o desenha quando a cidade TEM
  lista (cidade sem bairros na lista = sem campo) e põe `key` com a cidade, para a escolha de uma cidade nunca vazar para a outra.
  `aoMudar(texto, escolha)`: `escolha` é { bairro, bairro_origem: 'lista', bairro_lat, bairro_lng } quando veio da lista, null enquanto digita.
  O texto de apoio ("Só o bairro e a cidade, nunca o endereço.") é de quem usa o campo (cada tela o põe na sua diagramação).

## src/components/CampoCidade.jsx

- (linha ~1, `import { useEffect, useId, useRef, useState } from 'react';`) Futty v2.0 — Rodada 29B (D): o campo "Cidade" com sugestão (Explorar, criar time, painel do time).

  Busca a lista (Brasil e Portugal) SÓ no foco, sugere a partir de 2 letras sem acento nem maiúscula e mostra
  "Cidade, UF" / "Concelho, Portugal". Escolher manda { cidade, uf, pais, lat, lng, origem: 'lista' } — o motor guarda a
  coordenada da própria lista, sem chamada externa. Quem digita uma cidade que não está na lista segue com texto livre
  (o motor tenta o Nominatim e avisa o que achou). `aoMudar(texto, escolha)`: escolha é null enquanto a pessoa digita.
  Carregado em lazy (ver CampoCidadeLazy.jsx): o JSON e o código só descem quando o campo aparece.
- (linha ~29, `useEffect(() => {`) Rodada 29P: quem usa o campo pode querer saber se a lista tem sugestão para o texto (a cidade obrigatória do Criar time conta
  o texto livre só quando a lista não sugere nada). Sem a lista (ainda não desceu, ou falhou), zero: nunca trava quem está fora.
- (linha ~35, `useEffect(() => {`) A lista fecha com um toque FORA do campo (e ao escolher, e no Esc) — não no blur. No iPhone o blur do campo chega
  antes do clique na sugestão: a lista sumia debaixo do dedo e a escolha nunca acontecia (achado da cena).

## src/components/CampoCidadeLazy.jsx

- (linha ~1, `import { Suspense, lazy } from 'react';`) Futty v2.0 — Rodada 29B (D): o CampoCidade em lazy, com um campo comum enquanto o código (e depois a lista) não chega.
  As três telas que têm o campo (Explorar, criar time, painel do time) importam ESTE arquivo; o de verdade só desce
  quando o campo aparece — o arranque do app tem teto de 320 KiB e não paga nada por isto.

## src/components/camposDoAdmin.js

- (linha ~1, `export const inputStyle = {`) Futty v2.0 — Rodada 29S, bloco B: os três estilos de campo dos formulários do admin (AdminPanel e ResultadoModal), numa fonte só — o
  ResultadoModal saiu do AdminPanel para components/ e os dois precisam dos mesmos campos.
  fontSize 16: abaixo disso o iPhone dá zoom ao focar (Rodada 8A, ver index.css).

## src/components/CardSeuTime.jsx

- (linha ~1, `import { useState } from 'react';`) Futty v2.0 — O card "Seu time" do Início (Rodada 29I, bloco 3, item 1). Só para quem administra algum time, no topo, com a cara dos
  outros cards do Início. É o que era o Dashboard do painel do admin: as pendências, uma por linha (pedido de entrada, jogo sem
  presença aberta, resultado por lançar, denúncia), e quatro atalhos com nome — Novo jogo · Sortear · Convidar · Ajustes.
  SEMPRE aparece para o admin (decisão do dono); sem pendência fica compacto, com "Tudo tranquilo por aqui.".
  As pendências vêm prontas do motor (GET /api/inicio → seu_time); o texto e o destino de cada linha, em utils/seuTime.js.

  Rodada 29L (achado 127, decisão do dono de 3-out): com UM time o card é o de sempre, byte a byte. Com DOIS ou mais, vira UM card só,
  "Seus times": cada time numa linha compacta (escudo · nome · a pendência, se houver) e os quatro atalhos aparecem ao tocar na linha.
  Antes, dois cards de quatro botões ocupavam a primeira tela inteira e os PRÓXIMOS JOGOS ficavam abaixo da dobra.
  Rodada 29T (achado 168): "Seus times" mostra até 2 linhas; com mais, "Ver todos (N)" abre o resto no lugar (e "Ver menos" fecha). Quatro times
  empurravam o rótulo "Próximos jogos" para 973 px numa tela de 844.
  Rodada 29T-B (ajuste da Freaky): os times com pendência vêm primeiro (depois, a ordem de hoje) e um time com pendência nunca fica escondido atrás
  do "Ver todos": a lista fechada tem 2 linhas OU todos os times com pendência, se forem mais.
- (linha ~92, `const seuTime = timesComPendenciaPrimeiro(doMotor);`) 29T-B: os times com pendência vêm primeiro e nenhum deles fica atrás do "Ver todos" (a lista fechada cresce até caberem todos).

## src/components/CerimoniaSorteio.jsx

- (linha ~38, `const SIMB = [`) LEI v8.25 — SÓ O BARALHO OFICIAL SELADO gira nos rolos: 5 bichos v9 + 4 cartas
  da casa (baralho final, registado em SPEC-SORTEIO). As 2 cartas-F antigas
  (dourada C / roxa C especular) morreram — a HÍBRIDA (palco ouro + F ametista)
  ficou aprovada mas arquivada, não entra aqui (correção do dono).
  13-set: .png → .webp (1024×1536 a 416×624 — o rolo é flex:0 1 78px, nunca passa
  de 78px de largura). 20 MB → 350 KB. E cada src passa por urlAsset(): na web
  não muda nada, no app nativo estes arquivos não viajam dentro do pacote, vêm
  da web. Estes <img> entram por innerHTML, sem onError: se um caminho aqui não
  bater com o arquivo, sai o ícone de imagem quebrada e ninguém avisa. Mexer
  nesta lista pede conferir public/.
- (linha ~56, `const GLINTS = [`) RODADA 16B — os pontos de brilho do prêmio: [x%, y%, atraso s, tamanho px], em
  posições FIXAS do interior, ao redor das cartas. Dez, não mais: elegantes,
  nunca partículas a cair (a chuva de moedas foi reprovada pelo dono).
- (linha ~65, `const SOM_PADRAO_QUEM_SORTEIA = true;`) RODADA 12A — som ligado para QUEM SORTEIA.

  A lei da casa é "som é opt-in, desligado por omissão", e ela continua de pé
  para toda a gente que abre um resultado: pelo link, pela lista de jogos, por
  notificação. A excepção é uma só — quem acabou de tocar em "Sortear" pediu o
  espectáculo naquele segundo, e entregá-lo mudo é entregá-lo pela metade.

  Fica atrás desta constante porque é o dono que decide se a excepção existe:
  `false` devolve o app ao comportamento antigo sem tocar em mais nada. E nunca
  sobrepõe uma escolha já feita no aparelho (ver SomSorteio.ligarPorOmissao).
- (linha ~107, `function BannerSorteio() {`) BannerAd do sorteio — agora SERVIDO a valer (/api/ads?pagina=sorteio): respeita o
  toggle do dono (default OFF) e o filtro etário fail-closed no servidor. Mantém o look
  selado da .faixaAd; conta impressão/clique. Sem campanha OU página OFF → não aparece.
  VELOCIDADE 9 (23-set): lê a loja da sessão (lib/ads.js) como o AdCard — este
  banner era o último sítio com pedido próprio por tela, e a cerimónia do
  sorteio é justamente onde uma ida à rede a mais se sente.
- (linha ~131, `export default function CerimoniaSorteio({ resultado, autoStart = true, aoTermi…`) `bannerInterno` (Rodada 12A): a página do sorteio passou a ter o seu próprio
  slot IAB 320×100, servido pelo AdCard e só depois da cerimónia acabar — dois
  anúncios na mesma tela seriam duas impressões pela mesma vista. Quem tem slot
  próprio passa `false`; o /p/ e o Campeonato continuam com a faixa de sempre.
- (linha ~142, `const [compartilharOn, setCompartilharOn] = useState(false);`) RODADA 14B — compartilhar vive AQUI, logo abaixo do retângulo dos times, e é
  o único lugar. Escondido enquanto a cerimónia corre (é o momento de olhar,
  não de agir); sobe 5,1 s depois do jackpot, ou no fim se a pessoa saltou. A
  alavanca esconde-o outra vez ao recomeçar.
- (linha ~148, `const [gerandoQual, setGerandoQual] = useState(null); // índice do time cujo 9:…`) Achado 90: "9:16 · Time A" não dava retorno nenhum. O toast da máquina é `position: fixed` dentro da página animada (o transform do
  [data-page] vira o "chão" do fixed) e podia ficar fora da tela, longe do botão. Agora o retorno é DO LADO do botão: ele diz
  "Gerando…" enquanto trabalha e, no fim, uma linha de status logo abaixo diz o que aconteceu (salvo, ou compartilhado).
- (linha ~163, `const [pilula, setPilula] = useState(null);`) RODADA 14B — a pílula-guia do rodapé (só quando o botão está fora da tela).
  null = escondida; { base } = na tela, com `base` a dizer onde assenta: acima
  da bottom-nav quando ela existe (Campeonato), ou null para a safe-area
  (CSS) na página do sorteio, que não tem nav.
- (linha ~202, `const acordadores = new Set();`) Achado 89: "» concluir já" levava 2,1 s medidos — o flag só era lido ENTRE as esperas, e a que estava em curso (o giro de 1,2 s, a
  desaceleração de 0,6 s, o voo do jogador) corria até o fim. Agora cada espera pode ser acordada na hora: ao saltar, todas
  as que estão dormindo acordam juntas e as novas nem dormem — o salto vai direto ao final.
- (linha ~218, `const vis = (j, ti) => ({`) — visual de um jogador real: foto (urlAsset) ou silhueta da cor (privacidade).
    ti < 0 → RESERVA (silhueta cinza-aço).
    RODADA 27: a foto vem no 2:3 do recorte (SEM quadrado): as molduras são 3:4 e o CSS as cobre do
    topo (object-position 50% 0%), então aparecem as laterais inteiras e o topo do recorte — o que a
    pessoa enquadrou. Com sq=1 o servidor mandava o quadrado do topo e o cover cortava 25% das laterais.
- (linha ~325, `function flashTela() {`) — RODADA 14B: o flash de tela inteira. Vai para o body (não para o root):
    dentro do [data-page] um ancestral com transform/filter prenderia o
    `fixed` à página. Entra no `clones` para o cleanup o apanhar.
- (linha ~333, `function premioAbrir() {`) — RODADA 14B: O PRÊMIO. Corre UMA vez, no instante em que "TIMES SORTEADOS"
    acende — o mesmo instante do jackpot.mp3. Marquise em sequência, título,
    varreduras de brilho, pulsos de glow e pontos de brilho são o estado
    .premio (só CSS); aos 3 s vira .premioCalmo, o brilho suave que fica.
    Nada disto roda enquanto a cerimónia ainda sorteia.
    RODADA 16B: a chuva de moedas (canvas-confetti) e os raios a girar atrás
    dos avatares saíram — reprovados pelo dono no aparelho. Esta tela não
    importa mais a biblioteca de confete.
- (linha ~366, `q('.janela').classList.add('encerrada');`) Rodada 29M (achado 144): a janela dos rolos já fez o que tinha de fazer. Esconde-se junto com o véu (o desfoque cobre o salto), em vez de
  ficar uma caixa preta vazia, de ~60 px, no topo do resultado. Volta quando a cerimônia recomeça (corpo / girarTime).
- (linha ~370, `SomSorteio.fecharTime();`) O time inteiro acabou de aparecer: o jackpot (Rodada 14A) e o prêmio
  (Rodada 14B) nascem no mesmo instante — é o segundo de "ganhei".
- (linha ~387, `await sleep(4000);`) Rodada 12C: sem a Victory, a festa das molduras deixa de esperar por
  música nenhuma — dura o mesmo com o som ligado ou desligado.
- (linha ~394, `q('.rolos').innerHTML = ''; q('.quem').textContent = ''; q('.janela').classList…`) achado 144: sem caixa vazia no resultado
- (linha ~405, `maq.classList.remove('premio', 'premioCalmo');`) Rodada 14B: a alavanca repete a cerimónia — o prêmio da corrida anterior
  apaga-se antes de os rolos voltarem a girar.
- (linha ~447, `const ligouPorOmissao = euSorteei && SOM_PADRAO_QUEM_SORTEIA && !SomSorteio.esc…`) ── som (opt-in, lembrado) ──
  Rodada 12A: antes de pintar o botão, quem sorteou ganha o som ligado — só
  se nunca escolheu nada neste aparelho. O `ligouPorOmissao` fica guardado
  para o cleanup o desfazer: senão o som ficava ligado para o resto da
  sessão e vazava para as telas que têm de nascer mudas.
- (linha ~460, `if (import.meta.env.DEV) SomSorteio.autoTeste();`) 13-set: o autoTeste dá load() nos 5 sons para logar "SOM OK 5/5" — 43 KB
  baixados ao abrir a cerimônia, inclusive com o som desligado, que é o
  padrão. Fica só em desenvolvimento; em produção os sons entram um a um,
  no primeiro uso (as rodas do somSorteio.js nascem preguiçosas).
- (linha ~479, `const onDown = (e) => { if (aCorrer) return; SomSorteio.prepararNoGesto(); arra…`) 29H-B: o toque na alavanca é o gesto que destrava o áudio no site (ver prepararNoGesto) — síncrono, antes de qualquer espera.
- (linha ~511, `if (ligouPorOmissao) SomSorteio.desfazerOmissao();`) Rodada 12A: o som que esta cerimónia ligou sozinha morre com ela. Se a
  pessoa tocou no botão pelo caminho, a escolha dela fica (o
  desfazerOmissao não mexe em quem já escolheu).
- (linha ~526, `async function compartilharTimes() {`) Rodada 8A: na web baixa; no app abre a folha de compartilhar (o <a download>
  não faz nada no WebView). A folha já é o retorno; fechada sem escolher nada,
  não se diz "salvo".
- (linha ~594, `<div className="premioShine" aria-hidden="true"><i /><i /><i /></div>`) Rodada 16B — a luz do prêmio, por cima do bloco dos times e por
                    baixo do título: 3 varreduras de brilho na diagonal e 10 pontos
                    de brilho em cruz, em posições fixas. Só CSS (transform/opacity),
                    e o estado natural dos dois é invisível — sem .premio não se vê.
- (linha ~609, `<div className="premioGlow" aria-hidden="true" />`) Rodada 16B — o glow dourado das bordas do retângulo: pulsa 3 vezes com
                  o jackpot e assenta no brilho suave. Por dentro, porque o clip-path
                  da .maq cortaria qualquer sombra por fora.
- (linha ~620, `` <div className={`compartilhar${compartilharOn ? ' on' : ''}`}> ``) RODADA 14B — UM caminho para compartilhar, logo abaixo do retângulo dos
            times: a imagem dos dois times na receita do "Ver sorteio" (.cta-gold +
            glow + pulso), e por baixo uma linha discreta com o 9:16 de cada time.
- (linha ~638, `<p role="status" aria-live="polite" data-aviso-cartao style={{ margin: avisoCar…`) Achado 90: o que aconteceu, logo abaixo dos botões (e lido por leitor de tela). Some sozinho.

## src/components/Comentarios.jsx

- (linha ~404, `<span`) RODADA 12C — avatar e nome abrem a vitrine do autor. O caminho já
                existia (irParaPerfil, usado nas menções @); o que faltava era a
                porta mais óbvia. Sem `teamSlug` o irParaPerfil não navega, então
                fica um clique inerte em vez de um link partido.
- (linha ~543, `{apagarId ? createPortal(`) Modal de confirmação de apagar — portal para o body (Rodada 8A), mesma
            razão do LoadingFutty.jsx: fixed dentro do [data-page] não ancora na tela.
- (linha ~575, `{imgFull`) Fullscreen de anexo — portal para o body (15-set), mesma razão do
            LoadingFutty.jsx: fixed dentro do [data-page] animado não confia no
            viewport no WebKit do iPhone.

## src/components/ComporTimes.jsx

- (linha ~22, `export default function ComporTimes({ nomes, pool, atrib, onChangeAtrib, cores,…`) Rodada 29S: o texto de ajuda vem de QUEM USA (`ajuda`) — o Campeonato tem o dele ("Quem sobra não joga…", "ex.: 5º A vs 5º B"), o Jogo e o Jogo
  passado têm o seu. `opcional` (omissão: sim, como no Campeonato) escreve o "(opcional)" do título; no Jogo montar os times não é opcional.
  `semJogadores` troca a frase de quando não há ninguém para pôr nos times (a de omissão manda "voltar atrás", que só existe nos passos).
  Bloco B: `titulo` (omissão: "Monte os times") — o Jogo passado escreve o seu NO PASSADO, porque tudo ali já aconteceu; `titulo={null}` o esconde.

## src/components/CookieBanner.jsx

- (linha ~1, `import { useEffect, useRef, useState } from 'react';`) Futty v2.0 — Banner de consentimento de cookies/armazenamento local.
  Fixo no fundo, mas ACIMA da BottomNav (a navegação nunca é tapada); uma linha;
  fecha ao Aceitar OU na primeira interação real (scroll/toque/tecla). Só aparece
  enquanto localStorage 'futty_cookies' não for 'aceite'.
  Só no SITE (29V, 5-out): no app da loja (Capacitor) ela não existe — foi ela que gerou as perguntas da Apple na revisão.
- (linha ~73, `bottom: navVisivel ? 'var(--altura-barra-nav)' : 'env(safe-area-inset-bottom, 0…`) ACIMA da BottomNav quando ela existe — a navegação nunca é tapada.
  Sem nav, o inset é só do banner (14-set, VELOCIDADE 5: era `0` fixo
  — colava na barra de gesto nas rotas sem BottomNav, ex. /jogo/:id).
  Rodada 29L (achado 125): a altura da barra vem de UM lugar (--altura-barra-nav, app.css). Eram 58 px "de cabeça" para uma
  barra de 75: 17 px da faixa ficavam por baixo e o "Aceitar" encostava no "PERFIL".

## src/components/CropModal.jsx

- (linha ~132, `overflow: 'hidden',`) Achado 124 (29K): o wrapper não deixa um arrasto fora do cropper (o Cropper cuida do
  seu próprio gesto) encadear a rolagem para o body por trás, no WebKit.
- (linha ~157, `<div style={{ padding: '16px 16px max(16px, env(safe-area-inset-bottom, 0px))',…`) Controlos — fixed inset:0 escapa à casca do Layout (createPortal), por
            isso o inset de baixo é resolvido aqui (14-set, VELOCIDADE 5): sem
            isto, "Confirmar"/"Cancelar" nasciam debaixo da barra de gesto.
- (linha ~161, `{miniatura ? (`) A miniatura ao vivo (29H-B): a moldura real do app, com a janela do quadrado tracejado.

## src/components/DeepLinkListener.jsx

- (linha ~28, `const doSite = caminhoDoLinkDoSite(url);`) Rodada 29B (C): link https do site (convite, time, jogo) — abre a mesma tela que o site abriria (lib/linkDoSite.js).
  Na abertura a frio o Capacitor guarda a URL até este ouvinte existir, e o roteador já está de pé.
- (linha ~48, `const supabase = await obterSupabase();`) Velocidade 8: este componente está montado na RAIZ, por isso um import
  estático do supabase-js aqui punha-o de volta no modulepreload. Ele só
  é preciso quando um link de retorno chega mesmo — e nessa altura o
  AuthProvider já o pediu há muito.

## src/components/DenunciaModal.jsx

- (linha ~39, `return createPortal(`) Portal para o body (Rodada 8A): abre de dentro de um post ou comentário, no
  meio do [data-page] — fixed ali ancora na página, não na tela (LoadingFutty.jsx).

## src/components/EditorEscudo.jsx

- (linha ~1, `import { useState } from 'react';`) Futty v2.0 — "Escudo do time" (Rodada 29I, bloco 3, achado 102): UM controle no lugar dos dois de antes ("Cor" e "Cor de fundo do
  avatar", sem dizer a diferença). Cor principal + padrão + segunda cor, da paleta fixa (utils/escudo.js), com a prévia ao vivo nos
  três tamanhos em que o escudo aparece no app (84, 36 e 20 px — os das bancadas do dono). Cada toque grava na hora, como a
  visibilidade do time; se o motor recusar (sem a migração 077: "Essa opção ainda não está disponível."), volta ao que era.

## src/components/ErrorBoundary.jsx

- (linha ~18, `gravarUltimoErro(error, window.location.pathname);`) Build 10: sem isto, um crash no celular morria no console — ninguém
  tinha acesso remoto na hora. Fica em localStorage (Perfil → Diagnóstico
  lê); "Algo deu errado" continua a mensagem principal, isto é só a letra
  pequena por baixo, para quem sabe o que está a ler.
- (linha ~27, `return <ErrorPage onRetry={() => this.setState({ hasError: false, error: null }…`) 29I (achado 75): a linha técnica ("Failed to fetch dynamically imported module: …/LandingPage-xxx.js") NÃO vai para a tela — ficou
  no console (componentDidCatch) e no Diagnóstico (gravarUltimoErro). Na tela, só a frase da casa.

## src/components/ErrorPage.jsx

- (linha ~1, `import FuttyLoader from './FuttyLoader';`) Futty v2.0 — Página de erro (404 / crash), na linguagem da casa.

  FASE 3.61 — ANTES ESTAVA PARTIDA. Usava `import Lottie from 'lottie-react'` para uma
  bola a saltar, mas o pacote tem duplo default (interop CJS→ESM): o default é o
  objecto {LottiePlayer, default, useLottie, useLottieInteractivity}, não o componente.
  O React rebentava com "Element type is invalid... got: object" — e como esta é
  justamente a página que o ErrorBoundary mostra, QUALQUER 404 ou crash dava ECRÃ
  BRANCO. O bug escondia-se a si próprio.

  A correcção mata o import problemático em vez de o remendar: o Lottie sai e entra o
  F da casa (o mesmo FuttyLoader de todo o app). Menos uma dependência, menos um
  asset, e a página de erro passa a falar a linguagem do resto.
- (linha ~15, `export default function ErrorPage({ onRetry, mensagem, titulo, acao, larguraTex…`) Rodada 29B (D.3): é também a tela cheia dos avisos do shell — "Conta suspensa" (AuthGuard) e
  "Sem permissão" (SuperAdminGuard) eram cópias deste layout (~1 KB do arranque, que tem teto).
    acao          — { rotulo, aoTocar }: troca o botão de ouro e tira o 2º elo (retry/descobrir peladas).
    larguraTexto  — maxWidth do parágrafo (padrão 280).
    semSessao     — Rodada 29L (achado 126): a pessoa ainda não tem conta. O "início" dela é a landing (o /home a mandaria para o login) e a
                    porta alternativa é criar a conta: o Explorar exige conta, então oferecê-lo aqui era um beco que terminava no login.
- (linha ~46, `{/* A acção primária (ouro) tira o utilizador do beco: se há como repetir, repe…`) Rodada 29I (achado 75): a linha técnica em letra pequena (build 10) saiu da tela — inglês cru ("Failed to fetch dynamically
            imported module…") numa tela que fala com a pessoa. A mensagem técnica fica no console e no Diagnóstico (lib/ultimoErro).

## src/components/EscolhaLinhaGol.jsx

- (linha ~1, `export const TEXTO_APOIO_LINHA_GOL = 'Vale para os sorteios deste time. Dá para…`) Futty v2.0 — Rodada 29A (G) / 29H (item 8): a escolha entre jogar na linha ou no gol. Vivia num chip no meio da página do
  time e o dono não a achou; na 29A virou um botão "Você joga na linha · trocar" no card do próprio jogador e no Perfil.
  29H: dois chips LADO A LADO — "Jogo na linha" | "No gol" —, um aceso (dourado), padrão linha: é a mesma escolha das
  boas-vindas do time, e a pessoa vê as duas opções sem adivinhar o que o toque faz. Quem grava é quem usa
  (PATCH /api/equipas/:slug/membros/posicao, que já existia): `aoTrocar(true)` = no gol, `aoTrocar(false)` = na linha.
- (linha ~8, `export const TEXTO_ADMIN_E_POSICAO = 'Admin é quem organiza o time. Não tem nad…`) Item 69 (Rodada 29, no bloco 3 da 29I): "admin" e "posição em campo" são coisas separadas — gente achava que virar admin mudava
  onde jogava, ou que o goleiro tinha de ser o admin.
- (linha ~12, `export const TEXTO_APOIO_PAPEL = 'Você cuida de tudo, mas não entra na lista de…`) Rodada 29B (E): o papel de quem administra o time. "Só organizo" administra tudo (jogos, sorteio, resultados, Resenha)
  mas fica fora da lista de presença, do sorteio, do ranking e do pacote de figurinhas. Mora aqui (e não num arquivo novo)
  porque o Criar time e o painel do time o usam, e um módulo compartilhado a mais pesaria no arranque do app.
  29H (item 43): o texto acompanha a opção marcada (antes ficava sempre o de "só organizo", mesmo com "Eu jogo" aceso).

## src/components/EscolherUniformeTime.jsx

- (linha ~1, `import { useState } from 'react';`) Futty v2.0 — O dono escolhe o uniforme das figurinhas do time (Pagamentos P2, 26-set).

  O pacote comprado na loja chega sem uniforme quando o time ainda não tinha um — e sem uniforme
  ninguém do time gera. Esta tela abre logo depois da compra (Planos), pelo recado do Início e
  pelo botão da Figurinha (/planos?uniforme=<time>). Grava em PUT /api/teams/:slug/brilhante-kit:
  só o dono, só com o pacote ativo, e trocar só enquanto ninguém gerou (o motor diz o porquê).
  Mesma grade dos fundos e uniformes da Figurinha (.fig-seletor-grade, regra de 15-set).

## src/components/EscudoEquipa.jsx

- (linha ~1, `import { useState } from 'react';`) Futty v2.0 — O escudo do time. Com logo, o logo; sem logo, as iniciais sobre o escudo que o admin escolheu (Rodada 29I, bloco 3):
  cor principal + segunda cor + padrão, da paleta fixa — utils/escudo.js. O desenho é o das bancadas aprovadas pelo dono
  (DESIGN/escudo-cores.html e escudo-padroes.html): círculo, anel claro de 1,5 px, sombra curta, iniciais 800 com sombra. Legível em
  84, 36 e 20 px. Tamanhos livres via `size`.
  Rodada 29T (achado 160): o logo que não carrega (endereço quebrado, foto apagada) cai nas iniciais — o escudo nunca fica vazio.
- (linha ~17, `const srcDoLogo = raw ? (raw.startsWith('blob:') || raw.startsWith('data:') ? r…`) Velocidade 6B: o escudo vive entre 20 e 84 px CSS — 192 cobre tudo em 2x.

## src/components/FaixaRolavel.jsx

- (linha ~1, `import { ChevronLeft, ChevronRight } from 'lucide-react';`) Futty v2.0 — Rodada 29L (achado 130): a faixa que rola e AVISA que rola. A borda por onde ainda há conteúdo esmaece (CSS em app.css,
  `[data-mais-dir]` / `[data-mais-esq]`) e uma seta, que também é botão, rola uma "página". Sem conteúdo escondido, não aparece nada.
  `className` e o resto vão para o trilho (é nele que mora o `overflow-x`); `envoltorioClassName` é para o que o trilho fazia de caixa
  (largura, margem) — a seta fica presa ao envoltório, não rola junto.

## src/components/FuttyIconeFlutuante.jsx

- (linha ~1, `import FuttyLogo from './FuttyLogo';`) Futty v2.0 — Rodada 29D: o ícone do app flutuando, para a landing e o Avise-me — a mesma física do FuttyLoader (sombra
  no chão → bob → sway, classes em app.css). Substitui o FuttyLockup: o F solto como marca saiu (lei da casa, 29D), o F de
  marca vai dentro do ícone da loja (FuttyLogo variant="icone"). Na landing a aura (.landing-glow) fica atrás, intacta.

## src/components/FuttyLoader.jsx

- (linha ~1, `import { useId } from 'react';`) Futty v2.0 — Loader oficial da marca: o monograma F é PINTADO de um gesto.
  Substitui os loadings genéricos (spinner do lucide, texto "Carregando…").

  FASE 3.46 — antes animava-se o CONTORNO do F (lia-se como linha dupla). Agora
  anima-se o ESQUELETO: uma polyline que percorre a espinha do F, com um traço
  grosso (110) RECORTADO pelo contorno real. À medida que o stroke-dash avança, a
  escova pinta a letra; o clip garante que a forma é exactamente a do logo, por isso
  o esqueleto só precisa de estar dentro do listel, não de ser um eixo medial exacto.

  GEOMETRIA (medida em public/favicon.svg, viewBox 1080): o F é um listel contínuo de
  largura ~98 que faz DOIS ganchos — sobe a banda esquerda, sai na barra de topo,
  inverte, volta, desce, sai na barra do meio, inverte, volta, desce a haste. Ou seja
  o "gesto único" é literalmente a forma. Os pontos do esqueleto são os centros do
  listel em cada canto (média das duas margens). Cada gancho precisa de DOIS pontos
  (fim da ida + início da volta): com um só, o miter não fecha a cunha do canto
  superior direito e ficavam 6% do F por pintar (medido: 94.07% vs 99.99%).
  As duas pontas são prolongadas 70 para lá da borda — o clip corta-as rente, dando
  remates rectos perfeitos sem depender do strokeLinecap.

  PELE — a FORMA é a de sempre (F_CONTORNO/F_ESQUELETO); só a pintura mudou: a escova
  já não é ouro chapado, é a PELE METÁLICA v4 (gradiente ouro escuro→claro no stroke,
  bisel specular, glow leve) aprovada no harness. À medida que o pincel percorre a
  espinha, o metal biselado revela-se; no fim cobre o F inteiro.
- (linha ~27, `export default function FuttyLoader({ size = 59, label = 'Carregando…' }) {`) FASE 3.48 — +35% em todos os tamanhos (default 44 → 59; overlay 64 → 86; botão 16 → 22).
- (linha ~39, `<div style={{ position: 'relative', width: size, height: size }}>`) FASE B — flutuação. As camadas (sombra no chão → bob → sway → svg) e o porquê
            de serem separadas estão explicados no app.css, em ".futty-f-bob". A mesma
            estrutura vive no FuttyIconeFlutuante (landing): mesma física nas duas marcas.

## src/components/FuttyLogo.jsx

- (linha ~1, `import { useId } from 'react';`) Futty v2.0 — Logo da marca.
  variant: 'icone' (Rodada 29D, lei da casa: o F como MARCA vai dentro do quadrado de cantos arredondados do ícone da
  loja) | 'flat'/'metallic' (F SOLTO — F_CONTORNO, viewBox 1080 — com a PELE METÁLICA v4: SVG inline, casa com o loader;
  desde a 29D só onde o F é mecânica: LoadingFutty, figurinha, máquina do sorteio) | 'wordmark' (lettering "FUTTY").

## src/components/golsEPremios.js

- (linha ~1, `export const GOLS = { titulo: 'Gols de cada um', apoio: 'Registra quantos gols…`) Futty v2.0 — Rodada 29O: os títulos, as frases e as regras de "Gols de cada um" e dos prêmios do dia. Uma fonte só: o passo 2 do
  Criar time e os Ajustes do time leem daqui, para dizerem a mesma coisa e funcionarem igual.

## src/components/Icon.jsx

- (linha ~17, `width={size}`) VELOCIDADE 4: width/height como ATRIBUTOS (além do style) dão ao browser
  a caixa antes de o CSS chegar — e há cinco destes na barra de baixo, em
  toda tela. decoding="async" tira a descodificação do caminho da pintura:
  o ícone entra um instante depois em vez de segurar a tela inteira.

## src/components/ImagemDoPost.jsx

- (linha ~1, `import { useState } from 'react';`) Futty v2.0 — Rodada 29L (achado 141): a foto de um post que não carrega. No campo de várzea, com sinal ruim, vai acontecer muito. Antes,
  a <img> quebrada ficava com a altura reservada (width/height na tag): ~400 px de buraco com o ícone de imagem quebrada. Agora a
  foto que falha vira UMA linha curta, na voz da casa, e um toque tenta de novo (o endereço ganha ?r=N, para o navegador não reaproveitar o
  erro). A foto boa é o que sempre foi: um botão que abre a imagem em tela cheia. Os dois nunca se aninham (botão dentro de botão).

## src/components/IngressoDoJogo.jsx

- (linha ~1, `import { MapPin } from 'lucide-react';`) Futty v2.0 — Rodada 29S, bloco A (achados 155 e 156): o "ingresso" do jogo no topo do Marcar jogo. Preenche-se enquanto a pessoa digita:
  escudo e nome do time, o dia por extenso, a hora e o local. Visual da casa (vidro, chanfro de 45°, Rajdhani), sem imagem nova.
  Dia e hora SÓ pela dataHora.js (lei da hora do jogo): o rabicho com a cidade do time só aparece quando o relógio do time é outro.

## src/components/Layout.jsx

- (linha ~29, `const { perfil, deCache } = usePerfil();`) Achado 4 (roteiro 10-set): usava o seu próprio useApi('/api/me') — como o
  Layout envolve TODAS as rotas, era um pedido extra em toda sessão nova. Agora
  lê do PerfilContext partilhado.

  BUG (13-set → corrigido 14-set, "Velocidade 3"): onboarding em loop sem
  fim. Ao concluir, Onboarding.jsx grava onboarding_completo=true no
  servidor e navega para /home; na recarga o cache local (Velocidade 3)
  mostra primeiro o perfil VELHO (onboarding_completo ainda false) — esta
  gate disparava o redirect de volta para /onboarding antes de o /api/me
  fresco chegar para corrigir. `!deCache` (nunca decide a partir de cache)
  fecha o loop.
- (linha ~56, `/^\/(convite|c)\//,`) 29H: o link longo e o curto do convite
- (linha ~57, `/^\/onboarding/,`) Rodada 29E2 (item 33 da RODADA-29): a pessoa ainda não entrou — sem barra nas 3 páginas
- (linha ~64, `const HIDE_NAV_SEM_SESSAO = [/^\/termos/, /^\/privacidade/];`) Rodada 29H (item 2): páginas que existem para quem ainda não tem conta (os Termos e a Privacidade abertos do cadastro ou do
  "Saiba mais" do banner) — sem sessão a barra do app não faz sentido; com sessão (Perfil → Termos) ela continua.
- (linha ~104, `const { perfil: perfilDaConta } = usePerfil();`) Rodada 29G: conta com data menor de 18 anos vê a tela de exclusão (AuthGuard) — sem a barra por cima.
- (linha ~134, `const naInicio = pathname === '/home';`) Início (11-set): 1 pedido só (GET /api/inicio) alimenta a tela E a BottomNav
  (equipas, votacao-status) enquanto o utilizador está nela — ver InicioContext.
  Fora do /home o Provider nem monta; tudo o resto continua como sempre.
- (linha ~146, `<div style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: showN…`) ÁREA SEGURA — UM lugar só (14-set, VELOCIDADE 5). Este div embrulha TODA
  rota (App.jsx monta Layout por cima de AnimatedRoutes), por isso é a
  "casca" onde o topo se resolve para o app inteiro de uma vez —
  index.html ganhou viewport-fit=cover para o WebView desenhar por baixo
  do relógio/ilha, e é este padding-top que devolve o espaço.

  O de BAIXO fica em dois sítios, não um: a .bottom-nav (app.css) já tinha
  o seu próprio env(safe-area-inset-bottom) desde a Velocidade 4 — cresce
  sem empurrar os tabs (a altura deles não muda, só a folga por baixo). O
  que faltava era este padding aqui, que reserva o espaço da página para
  essa nav mais alta: os 70px fixos assumiam uma nav sem faixa de gesto por
  baixo — num iPhone com Home Indicator ela cresce para ~96px, e o fim da
  página ficava tapado pelos ~26px que sobravam.

  .app-topbar (sticky) tem o SEU PRÓPRIO top: env(safe-area-inset-top) no
  app.css — o padding-top daqui só acerta a posição INICIAL (antes de
  rolar); um elemento sticky, ao colar, esquece o padding do ancestral e
  volta a colar-se ao y=0 REAL do ecrã se o "top" dele continuar 0. Os
  dois têm de mudar juntos.

  Modais/sheets que fazem createPortal para document.body (CropModal,
  AvatarGenericoSheet) escapam a este div por completo — o inset deles é
  resolvido à parte, no próprio componente.

  Android: Capacitor 8.5.0 (o instalado aqui) não tem a chave
  `android.adjustMarginsForEdgeToEdge` em nenhum pacote @capacitor/*
  (conferido no node_modules — grep sem resultado nenhum); não foi
  escrita no capacitor.config.json para não inventar uma opção que a
  versão instalada não reconhece. O MainActivity.java é um BridgeActivity
  sem overrides — o Capacitor já expõe os WindowInsets do Android como os
  MESMOS env(safe-area-inset-*) do iOS, então o CSS daqui serve os dois
  sem bifurcar; falta só medir no aparelho real quando o Pedro tiver um à
  mão (o Chrome do desktop não emula insets do Android).

## src/components/ListaDeJogos.jsx

- (linha ~1, `import { Link } from 'react-router-dom';`) Futty v2.0 — A lista de jogos do time (cards com a data em destaque dourada + estado em badge 45°). Era o corpo da página /time/:slug/jogos;
  Rodada 29I, bloco 3: é também a aba JOGOS da página do time para quem não é admin (o admin vê JogosDoAdmin, com o que se faz em cada
  jogo). Data e hora no relógio do time, com o rabicho "· horário de <cidade>" para quem está noutro relógio.
- (linha ~43, `const { day, month } = dayMonth(g.data, team?.fuso);`) 29I: a data é a do time (fuso do time)

## src/components/LoadingFutty.jsx

- (linha ~1, `import { useEffect, useState } from 'react';`) Futty v2.0 — O ÚNICO loading de ecrã do app: o F grande, sozinho, centrado.

  FASE 3.58 — CENTRADO POR CONSTRUÇÃO. Antes vivia no fluxo com
  minHeight: calc(100dvh - 120px), e o centro dependia do que cada página tinha por
  cima: a Figurinha punha-o num <main> com minHeight próprio, o Ranking a seguir a um
  header, os Jogos dentro de um div com margem. Três wrappers, três centros — e o
  calc só podia acertar num deles. Agora sai do fluxo: fixed + inset 0 → o F cai no
  centro GEOMÉTRICO do viewport, igual em todas as páginas, seja o que for que exista
  acima ou abaixo. É a mesma técnica que arrumou o overlay de geração na 3.57.

  zIndex 40: abaixo da bottom nav (50) e da topbar (100), para as duas ficarem
  visíveis por cima — o utilizador continua a ver onde está e pode sair.
  pointerEvents: none — este ecrã não bloqueia nada. É informativo, não modal: durante
  o carregamento nada há para clicar por baixo, mas se houvesse não queremos que um
  div invisível de ecrã inteiro engula os cliques.

  Excepção: micro-loadings dentro de botões e o overlay de geração (que é relativo ao
  CARD, não ao viewport) usam o <FuttyLoader> directo e não este componente.
- (linha ~27, `export default function LoadingFutty({ legenda = 'Bola parada…\nO servidor tá d…`) P3-14 — se o carregamento passar dos 4s, uma legenda discreta aparece por baixo do F
  (contexto: "não travou, ainda estamos a puxar"). `legenda` é opcional — cada página
  pode passar a sua; por omissão, a linha da casa em PT-BR (texto-base = chave i18n),
  com tom de jogo — escolhida pelo dono a 31-jul.
  Achado 3/23 (roteiro 10-set): a 3s a legenda aparecia em quase toda navegação —
  subiu para 4s enquanto o backend não fica consistentemente mais rápido.
  `motivo` (Velocidade 7B) só vai para o Diagnóstico: diz quem segurou a pintura
  ('codigo' = chunk da tela, 'sessao' = AuthGuard, 'tela' = a tela sem dados).
- (linha ~42, `useEffect(() => {`) VELOCIDADE 4: enquanto este F estiver no ecrã, a tela real ainda não está —
  a caixa-preta só marca "pintou" depois de o último loader sair.
- (linha ~48, `return createPortal(`) PORTAL PARA O BODY (15-set): o [data-page] (.page-transition) leva a animação
  pageEntra (app.css), que anima `transform`. Com animation-fill-mode:both, o
  computed style do transform DEPOIS da animação acabar não volta ao keyword
  `none` — fica uma matriz identidade (a animação continua "associada" ao
  elemento) — e por spec isso É containing block de `position:fixed`. Não é só
  um capricho do WebKit do iPhone (onde o bug apareceu primeiro): confirmado
  também no Chromium via scripts/testar-visibilidade.mjs. Ajustar só o keyframe
  não bastava; o F centrava-se na ÁREA da página (que pode começar abaixo da
  topbar), não no viewport. Renderizando direto em document.body o F nunca tem
  esse ancestral no meio, ponto final.

## src/components/MedidorNavegacao.jsx

- (linha ~1, `import { useEffect, useLayoutEffect } from 'react';`) Futty v2.0 — Cronómetro das navegações (VELOCIDADE 4).

  Não desenha nada. Existe para responder, com número, à pergunta que o dono
  fez de outra forma ("surreal de devagar"): entre tocar numa aba e ver a tela,
  quanto tempo passa — e quanto desse tempo é esperar dados.

  O relógio parte na mudança de rota e para quando a tela REAL está desenhada
  (não o loader: ver loaderEntrou/loaderSaiu em lib/diagnostico.js). A leitura
  sai na tela de Diagnóstico (super-admin, pelo Gabinete) e, sem nome nenhum, na
  telemetria anônima de velocidade (Rodada 28, lib/telemetria.js).
- (linha ~19, `useLayoutEffect(() => {`) VELOCIDADE 8 — o 1º commit da árvore inteira. Os efeitos de layout correm
  de baixo para cima depois do commit, e este componente está na raiz (App.jsx,
  dentro do BrowserRouter): quando esta linha corre, o React já montou tudo.
  É o "b ms" do resumo do arranque — o que a compilação custou fica antes
  dele (marcarArranque, no main.jsx), e o que a 1ª tela custa vem depois.
- (linha ~38, `useEffect(() => {`) Rodada 28: a telemetria anônima de velocidade chega depois da 1ª tela, fora do arranque.

## src/components/MenorDeIdade.jsx

- (linha ~1, `import { useState } from 'react';`) Futty v2.0 — Rodada 29G (1-out): a tela de quem tem conta com data de nascimento menor de 18 anos.

  O Futty é 18+ de ponta a ponta. O cadastro novo barra o menor antes de a conta nascer (Register,
  Onboarding, motor e banco); a conta que JÁ existia com data menor de 18 entra aqui: o AuthGuard
  troca o app por esta tela cheia — a frase da casa e o botão "Excluir minha conta". O motor não
  apaga conta existente sozinho; quem decide excluir é a pessoa (2 toques: botão → "Excluir de vez").
  Lazy: só carrega para quem precisa dela (o arranque tem teto).

## src/components/MiniSorteio.jsx

- (linha ~1, `import { useEffect, useState } from 'react';`) Futty v2.0 — Rodada 29E2/29E3: o mini sorteio ao vivo do passo 1 do Onboarding — a máquina pequena na receita da máquina do
  sorteio (styles/sorteio-maquina.css: .maq, .luz em mqCalm, .janela, .baseluz) e, dentro, dois grupos, TIME A (ouro) e
  TIME B (roxo), com 4 ROLOS de slot machine cada (29E3, dono: 4 jogadores por time; .rolo/.strip/.scel de lá, a 56×75, 4 por
  linha). Os 8 rolos giram rápido com as 8 figurinhas FICTÍCIAS (utils/miniSorteio.js); a partir de 0,4 s um por vez desacelera
  (.slow, 1,5 s) e trava (.stop) na figurinha sorteada, que entra por cima na moldura do sorteio real (.rev com revPop, micro-
  lâmpadas .mb piscando, nome), alternando A/B a cada 0,75 s (29H-B: giro inicial pela metade, revelação 1,5×); quando o 8º trava
  (7,15 s), as réguas dão UM pulso (premio, 0,8 s) e os times seguram 2,5 s; fade 0,4 s; os rolos voltam a girar e recomeça com outra
  ordem — ciclo de ~10,7 s, sem som (não há
  gesto), só CSS + um relógio de setTimeout. prefers-reduced-motion: os 8 travados, sem giro. Estado natural (antes do JS
  correr): os 8 travados.
- (linha ~116, `<p className="msq-legenda">SORTEIO&nbsp;JUSTO&nbsp;· RANKING&nbsp;· FIGURINHA&n…`) Legenda (dono, 2-out): o estilo do subtítulo. Os espaços dentro de cada frase são duros — em tela estreita a linha só
            quebra depois de um "·", em duas linhas parecidas, nunca uma palavra sozinha.

## src/components/NumberStepper.jsx

- (linha ~1, `const BTN = {`) Futty v2.0 — Selector numérico +/- (ex.: jogadores por time).
  Clampa entre min e max; o valor é sempre um número inteiro.
  Rodada 29S (achado 156): `cor` pinta o seletor com uma cor de destaque (o Novo jogo usa o ROXO quando o número vale "só neste jogo");
  sem `cor`, é o seletor de sempre.

## src/components/PlayerAvatar.jsx

- (linha ~24, `const px = size || (lg ? PX.lg : md ? PX.md : sm ? PX.sm : PX.base);`) Velocidade 6B: pede ao motor o tamanho que a caixa realmente mostra. O dobro
  do px CSS cobre as telas de 2x/3x sem ficar borrado; acima de 128 CSS já é
  cartão grande, e aí vale o degrau de 512.
- (linha ~28, `const src = bruto ? urlImagem(bruto, px <= 64 ? 128 : px <= 128 ? 256 : 512, {…`) Rodada 29B (E): a caixa é SEMPRE quadrada (.pavatar), então o quadrado vem do motor (`sq=1`): é o do TOPO, o mesmo que o
  CSS (object-position: top) mostrava — e é nele que o motor aplica o recorte que a pessoa escolheu para a miniatura.
- (linha ~50, `<img src={src} alt="" decoding="async" onError={() => setFalhou(true)} />`) Sem width/height nem loading="lazy" (Velocidade 7B): quem dá o tamanho
  é a caixa (.pavatar img, 100%), e um avatar de 8 KB não ganha nada em
  esperar a rolagem — só abria mais uma porta para o Safari errar.

## src/components/PreferenciasNotificacoes.jsx

- (linha ~1, `import { useEffect, useState } from 'react';`) Futty v2.0 — Perfil → Notificações (Rodada 29I, bloco 3, item 4): um interruptor por tipo — jogos e presença; pedidos de entrada (só
  para quem administra algum time); figurinha pronta; Resenha. Todos ligados por padrão. A escolha mora na conta (motor,
  users.notificacoes) e vale em qualquer aparelho: o motor nem manda o aviso do tipo desligado. Os avisos que o admin manda
  ("Avisar o time") não se desligam aqui: é o time falando.
  Sem a migração 079 o motor responde `salvavel: false`: a tela mostra tudo ligado, sem deixar mexer, e diz por quê.

## src/components/Reacoes.jsx

- (linha ~160, `background: 'rgba(20,20,24,0.96)', border: '1px solid rgba(255,255,255,0.12)',…`) VELOCIDADE 8 (16-set) — SEM backdrop-filter. Um backdrop-filter
  obriga o compositor a ler o que está por trás e a desfocá-lo a cada
  quadro; aqui está dentro de uma LISTA que rola, e o pano de fundo é
  sempre o mesmo escuro da casa — o desfoque não tinha nada para
  mostrar. O tom fica: 0,72 + blur sobre #050810 dá praticamente o
  mesmo cinzento que 0,96 chapado.

## src/components/ResultadoEditor.jsx

- (linha ~1, `import { useState } from 'react';`) Futty v2.0 — Editor do resultado do jogo (admin): 4 níveis de detalhe.
  Rodada 29S, bloco B: dois modos. `salvar` (o de sempre, no Jogo): escolhe o nível, salva em PATCH /api/games/:id/resultado. `devolver` (o passo
  "Como terminou?" do Jogo passado): o jogo ainda não existe, então nada é salvo aqui — a cada toque o editor devolve o que foi preenchido
  (`aoMudar`) e quem usa grava tudo no fim. Em `devolver` não há seletor de nível: é UMA pergunta (quem ganhou); o placar é opcional e os gols
  de cada um aparecem depois dela; o nível sai das contas de utils/resultadoDoJogo.js.
- (linha ~20, `const inputPlacar = { width: 48, textAlign: 'center', padding: '8px 6px', borde…`) 29T-B: a borda se vê (era #222 sobre #0c0c0c: duas caixas pretas, sem forma) e o "0" apagado mostra o que se escreve ali (class placar-input, app.css).
- (linha ~26, `function jaComecouJogo(game) {`) Achado 9: sem resultado antes do jogo acontecer — exceto jogo histórico
  (criado pelo "Jogo passado"), que não tem essa trava.

## src/components/RolinhosData.jsx

- (linha ~1, `import { useEffect, useLayoutEffect, useRef, useState } from 'react';`) Futty v2.0 — Rodada 29H (item 3): a data de nascimento em ROLINHOS (dia · mês · ano), um componente só para o
  cadastro, o onboarding e o banner do Início — igual no iPhone, no Android e no computador (o <input type="date">
  era um seletor diferente em cada sistema, e o do iPhone nem mostrava o dia).

  Regras: nenhum ano futuro (a lista de anos acaba em ano atual − IDADE_MINIMA, o mesmo teto de `nascimentoMaximo()`);
  o dia acompanha o mês (30, 31, fevereiro 28/29). O componente só entrega a data (`onChange('AAAA-MM-DD')`) quando a
  pessoa mexeu nos TRÊS rolos (rolou, tocou na coluna ou apertou as setas) — o valor de partida é só um lugar para os
  rolos começarem, nunca uma resposta; tocar na coluna já vale como "mexi" (quem nasceu no dia 15, o dia de partida,
  confirma o 15 só de tocar nele). Quem decide se a idade serve é quem chama (`menorQueIdadeMinima`, `MSG_MENOR`); aqui um mês/dia depois do teto no último
  ano continua escolhível de propósito, para a frase da casa aparecer em vez de o rolo recusar em silêncio.

  Rolo = lista com rolagem e `scroll-snap` (CSS em app.css, ".rolinhos"): o item no centro é o escolhido. Toque num
  item o leva ao centro; setas ↑ ↓ andam um item (teclado e leitor de tela: role="listbox"). Estado natural visível,
  sem animação em JS.

## src/components/RotuloGerar.jsx

- (linha ~1, `export default function RotuloGerar() {`) Futty v2.0 — Rodada 29L (achado 132): o texto do botão "Gerar minha figurinha". Quebrava em duas linhas ao lado de "Trocar foto" em uma, e o par
  ficava torto. Agora é uma linha só (.fig-gerar, app.css: sem quebra e com o mesmo respiro lateral do "Trocar foto"); em tela de 410 px ou
  menos (o 390 do iPhone padrão inclusive: o longo precisa de ~221 px e sobram 216), o rótulo encurta para "Gerar figurinha" (a frase da
  VOZ-FUTTY §4) em vez de quebrar. O curto é escondido por CSS (.rotulo-gerar-*), então só um dos dois existe para o leitor de tela.

## src/components/RSVPCard.jsx

- (linha ~7, `function formatarPrazo(iso, fuso, cidade) {`) "até qui., 8 de out. · 20:00" — o prazo, como o jogo, é lido no relógio do CAMPO (fuso do time, 29I achado 83).
  29T (achado 165): com o rabicho, a cidade é a do time ("horário de Brasília"), não a do fuso.
- (linha ~13, `const BASE_BOTAO = {`) RODADA 12A — a paleta de presença da casa (--presenca-* em index.css), a mesma
  do "Vou"/"Não vou" do card de jogo. O verde #16a34a e o vermelho #dc2626 que
  estavam aqui saíram: num app dourado e roxo o par de semáforo lê-se como
  alerta de sistema. Dizer que não é uma resposta legítima, não um erro — por
  isso os dois são fantasma, e não um botão saturado a gritar. RODADA 13: o
  "Vou" deixou de ser dourado (agora é só do "Ver sorteio"/"Sortear") e passou
  a usar a MESMA receita do "Não vou" — só a cor muda.
- (linha ~56, `async function responder(status) {`) Rodada 29I (achado 86): estado OTIMISTA. O botão escolhido acende e o contador de confirmados mexe NA HORA (`onResposta` já
  aplica o novo estado na tela do Início); o pedido segue por trás. Se falhar, volta ao que estava e diz o que fazer. Antes a
  tela só mudava depois de a resposta chegar (ou só depois de recarregar), e a pessoa tocava de novo sem ver nada.
- (linha ~87, `<div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>até {form…`) Rodada 29L (achado 137): o --label-color (branco a 40%, ~3,7:1) não chega a 4,5:1; o --text-dim passa folgado.

## src/components/SeloHonra.jsx

- (linha ~1, `const TROFEU = 'M13 9 L35 9 L31 25 L17 25 Z M13.5 11 L8 11 L8 17 L15 20 M34.5 1…`) Futty v2.0 — Selo de honra (Vaga 11C) — forma A (postal denteado), base metálica
  por tier (ouro/prata/bronze), troféu da casa + faixa com o texto, varrimento de
  vidro (~6s; reduced-motion estático). Usado no olhinho da Figurinha e na vitrine.

## src/components/somSorteio.js

- (linha ~47, `const VOL = { tique: 0.5, clac: 0.7, jackpot: 1.0 };`) Volumes da lei (Rodada 14A). Vivem AQUI, não em quem chama.
- (linha ~60, `let escolheu = false;`) RODADA 12A — "nunca escolheu" e "escolheu desligado" deixam de ser a mesma
  coisa. Os dois davam som desligado, mas só o primeiro pode ser sobreposto pelo
  padrão de quem toca em "Sortear": quem desligou à mão desligou, e o app não
  tem o direito de voltar a ligar sozinho.
- (linha ~119, `get escolhido() { return escolheu; },`) A pessoa já decidiu sobre o som neste aparelho? (Rodada 12A)
- (linha ~128, `ligarPorOmissao() {`) Liga o som por omissão para quem acabou de tocar em "Sortear" (Rodada 12A).

  NÃO grava nada: o localStorage guarda a escolha da PESSOA, e um padrão
  gravado vazava para as aberturas seguintes — inclusive as de quem só abre o
  resultado pelo link, que tem de continuar em silêncio. Quem já escolheu
  alguma coisa neste aparelho manda, ligado ou desligado.
- (linha ~141, `desfazerOmissao() {`) Desfaz o `ligarPorOmissao` quando a cerimónia sai de cena sem ninguém ter
  tocado no botão de som (Rodada 12A).

  Sem isto, `ligado` ficava verdadeiro para o resto da SESSÃO: quem sorteava
  um jogo e a seguir abria o resultado de outro — ou a vista pública /p/ —
  ouvia som numa tela que a lei manda entregar muda.
- (linha ~171, `prepararNoGesto() {`) Destrava o áudio no gesto (29H-B). Chamar SÍNCRONO dentro do toque — "Sortear" no Jogo, a alavanca na cerimônia —, antes de
  qualquer await. Cria as rodas de todos os efeitos e dá a cada elemento um play() mudo seguido de pause(): no Safari/WebKit do
  site é isso que autoriza o play() de depois, vindo de um temporizador. Não liga o som nem grava nada (quem manda nisso continua
  sendo a escolha da pessoa e o ligarPorOmissao); quem desligou à mão nem baixa os arquivos.

## src/components/SuperAdminGuard.jsx

- (linha ~12, `if (loading || deCache) {`) deCache (14-set): bloqueio/permissão desta área nunca decide a partir do
  cache local — mesma regra do OnboardingGate/suspenso, senão um admin
  recém-promovido (ou rebaixado) veria por um instante o ecrã errado até o
  /api/me fresco confirmar.
- (linha ~21, `return (`) Rodada 29B (D.3): o layout é o do ErrorPage (era uma cópia dele aqui).

## src/components/TeamAvatar.jsx

- (linha ~1, `import EscudoEquipa from './EscudoEquipa';`) Futty v2.0 — Avatar do time nos tamanhos de sempre (sm/md/lg). Rodada 29I, bloco 3: é o MESMO escudo do resto do app
  (EscudoEquipa) — a "cor de fundo do avatar", que era um segundo controle de cor sem explicação (achado 102), saiu.

## src/components/TimesDoJogo.jsx

- (linha ~1, `import { useState } from 'react';`) Futty v2.0 — Rodada 29S, bloco A (achados 151 e 152): os times no JOGO, onde a pessoa já sabe quem confirmou.
    · EscolhaDosTimes: "Como vão sair os times?" e dois cartões lado a lado — Sortear (dourado, a máquina) e Montar à mão (roxo, a pessoa escolhe).
    · MontarTimesAMao: a composição à mão com quem confirmou + os convidados sem app da tela; "Salvar times" só quando cada time tem 1 jogador.
  Quem desenha só desenha: o Jogo.jsx guarda o estado, chama o sorteio e o POST /api/games/:id/times-manuais.

## src/components/TimesEditor.jsx

- (linha ~221, `fontSize: 16,`) abaixo de 16 o iPhone dá zoom ao focar (Rodada 8A, ver index.css)

## src/components/Toast.jsx

- (linha ~1, `import { useEffect, useRef, useState } from 'react';`) Futty v2.0 — Toast: o aviso de uma linha, no MEIO da tela (Rodada 29A, pedido do dono, 30-set).
  Um componente só, sem exceção por tela: todas as chamadas `showToast(...)` das páginas acabam aqui.
    · centrado, largura máx. 320, fundo escuro com desfoque, ícone por tipo (✓ sucesso · ! erro · i info);
    · some sozinho em 2 s (6 s quando leva ação); ERRO fica até a pessoa tocar nele;
    · entra e sai em 180 ms; com `prefers-reduced-motion` aparece e some sem animar (estilos: index.css).
  Pagamentos P2: `acao` opcional ({ rotulo, aoTocar }) — um botão dentro do toast (ex.: "Tentar de
  novo" depois de uma compra que falhou).
- (linha ~60, `return createPortal(`) Portal para o body (15-set): position:fixed dentro do [data-page] animado
  (pageEntra em app.css) não centra/ancora ao viewport de forma confiável no
  WebKit do iPhone — ver a nota em LoadingFutty.jsx.
  Sem ação e sem precisar de toque, o aviso não intercepta toques: a pessoa continua a mexer na tela por baixo.

## src/components/Topbar.jsx

- (linha ~1, `import { useLayoutEffect, useRef, useState } from 'react';`) Futty v2.0 — Barra de topo. Com `back`: chevron "← Voltar". Com `title` (sem back):
  só o título centrado. Com `hud`: wordmark dourado à esquerda + linha HUD (estilo
  circuito). Sem nenhum: logo F flat (fallback de marca). Linha gradiente por baixo.

  RODADA 12C — `back` passa a aceitar a string 'voltar' além de uma URL.

  Com uma URL o chevron é um <Link> para um lugar FIXO, e isso está certo para
  telas com um pai só (Planos → Perfil). Deixou de estar para a vitrine do
  jogador, que agora se abre de quatro sítios: voltar sempre para o Ranking
  mandava para uma tela onde a pessoa nunca esteve.

  Com 'voltar' o chevron vira um <button> que desfaz o último passo do
  histórico. Quem chega por link direto (sem histórico interno) não tem passo
  para desfazer — aí vale o `backFallback`, e sem ele o Início.
- (linha ~54, `useLayoutEffect(() => {`) VELOCIDADE 8 (16-set) — mede UMA VEZ POR MONTAGEM, não a cada rota.

  Duas coisas mudaram. Primeira: as deps eram [hud], e como a Topbar é
  remontada a cada troca de tela (o PageTransition leva key={pathname}),
  TODA navegação voltava a ligar um ResizeObserver, a pedir dois
  getBoundingClientRect (que forçam layout síncrono) e a pendurar-se outra vez
  no document.fonts.ready — em cima do momento em que a tela nova está a
  pintar. Segunda: o ResizeObserver dispara SEMPRE uma vez ao observar, logo a
  seguir ao medir() de arranque: eram duas medições iguais por montagem, e a
  segunda podia ainda disparar um setState a meio da pintura.

  Agora: uma medição na montagem, e só se volta a medir se a largura do SVG
  mudar de verdade (rodar o telemóvel) ou quando as fontes assentarem — que é
  quando o fim do texto muda de sítio, o único motivo real para remedir.

## src/context/AuthContext.jsx

- (linha ~12, `function limparAparelho() {`) Celular compartilhado (13-set): ao sair, nada da conta fica no aparelho — o cache local, o
  pré-aquecimento e o cromo do Início (IndexedDB), que é a cara da pessoa.
- (linha ~20, `let saidaPedida = false;`) RODADA 28 — a sessão acabou SEM a pessoa pedir (outro aparelho saiu de todos, conta apagada,
  refresh revogado). O aparelho é limpo e o login explica porquê (Login.jsx lê esta marca).
- (linha ~33, `function sessaoGuardada() {`) VELOCIDADE 5 (14-set) — SESSÃO OTIMISTA.

  O app inteiro esperava por `supabase.auth.getSession()` antes de desenhar o que
  quer que fosse. Parece barato e não é: quando o token já passou da hora (mais de
  1 h desde a última abertura, que é o caso normal de quem abre o app uma vez por
  dia), esse getSession faz um refresh PELA REDE até São Paulo — e só depois a
  primeira tela começa a existir. Era o pedaço mais caro da primeira abertura no
  iPhone.

  Aqui lê-se a MESMA sessão que o Supabase guardou, do mesmo sítio e de forma
  SÍNCRONA, a tempo do primeiro render. Não é um atalho: é o dado que o próprio
  getSession ia devolver, só que sem esperar pela ida e volta. A tela sai do cache
  local na hora e o refresh continua a correr por trás — quando chega, o
  onAuthStateChange substitui a sessão; se falhar de vez (refresh token inválido),
  a sessão vai a null e o AuthGuard manda para /login como sempre mandou.

  O token lido pode estar expirado, e tudo bem: quem fala com a API é o
  lib/api.js, que chama getSession() e aí sim espera pelo token fresco. A troca é
  exactamente essa — a tela desenha já, os DADOS chegam quando chegarem.
- (linha ~76, `useEffect(() => {`) VELOCIDADE 8 (16-set) — o supabase-js chega por import dinâmico (ver
  lib/supabaseAsync.js). O download começa aqui, no mesmo instante em que
  começava antes; o que sai do caminho é a COMPILAÇÃO de 201 KB antes da 1ª
  pintura. A sessão que desenha a 1ª tela já veio do localStorage, síncrona,
  lá em cima (sessaoGuardada) — este efeito só confirma e passa a ouvir.
- (linha ~90, `const semRede = error?.name === 'AuthRetryableFetchError';`) Rodada 28: sem rede no arranque, a sessão guardada fica (as telas abrem do cache); só
  quando o Supabase RECUSOU a renovação é que ela acabou — e aí o login diz porquê.
- (linha ~119, `signOut: async () => {`) Celular compartilhado (13-set): limpa o cache local ANTES do signOut —
  a próxima conta que entrar neste aparelho não pode ver, nem por 1
  render, o perfil/equipas de quem saiu.
  RODADA 28: "Sair" é SÓ deste aparelho (scope local). O padrão do Supabase
  é 'global', que derrubava a sessão da pessoa em TODOS os aparelhos — o
  Pedro trocou de conta no celular e o Gabinete da Freaky no Chrome morreu.

## src/context/InicioContext.jsx

- (linha ~1, `import { createContext, useCallback, useContext, useEffect, useRef, useState }…`) Futty v2.0 — Contexto do Início (11-set). Faz 1 pedido só (GET /api/inicio)
  em vez dos ~9 que a tela disparava em paralelo — motor em São Paulo, quem usa
  em Lisboa paga ~240ms por pedido, e cada um deles era um round-trip só para
  abrir a tela.

  Montado condicionalmente em Layout.jsx (só quando pathname === '/home'),
  envolvendo children + BottomNav — assim o próprio BottomNav (que também
  precisa de "equipas do utilizador" e do estado de votação) pode ler daqui em
  vez de disparar os seus próprios pedidos enquanto está na página do Início.
  Fora dessa página o contexto não existe (useInicio() devolve null) e tudo
  volta ao comportamento de sempre.
- (linha ~24, `const IDADE_PARA_RECARREGAR_MS = 60000;`) VELOCIDADE 8 (16-set) — quando o app volta do segundo plano, a partir de que
  idade vale a pena ir buscar o Início outra vez. 60 s: abaixo disso a tela é
  praticamente a mesma e o pedido só gastava rede; acima, pode já haver jogo
  novo, presença confirmada ou resultado lançado. Foi o que o Pedro apanhou no
  build 19: horas com o app aberto, nenhum jogo novo à vista.
- (linha ~64, `if (d?.me) hidratarPerfil(d.me, { doInicio: true });`) O /api/me do AuthGuard já correu antes de qualquer rota montar (é ele
  que decide se a conta está suspensa) — isto não evita ESSE pedido, mas
  mantém o PerfilContext fresco com o `me` que /api/inicio acabou de
  trazer, sem o Início disparar um /api/me próprio por cima.
  doInicio: este `me` vem no payload que este contexto grava logo abaixo (Rodada 27).
- (linha ~73, `if (d?.votacao_status !== undefined) hidratarVotacaoStatus(d.votacao_status, d?…`) O slug vai junto (Velocidade 9): sem ele o SessaoContext não sabe a que
  time este status pertence e volta a pedi-lo na tela seguinte.
- (linha ~76, `if (d?.ads) semearAds(d.ads);`) Velocidade 9: os slots de publicidade de TODAS as telas vieram aqui —
  nenhuma delas precisa de pedir o seu (lib/ads.js). Só do dado FRESCO:
  anúncio de cache podia ser de uma campanha que já acabou.
- (linha ~89, `useEffect(() => {`) Carga inicial ao montar (mesmo padrão do PerfilContext: o efeito chama a
  API diretamente, em vez de invocar `carregar`, para o setState correr
  dentro do .then()/.catch() e não sincronamente no corpo do efeito).

  BUG (13-set → corrigido 14-set, "Velocidade 3"): este Provider é montado
  em Layout.jsx por PATHNAME (pathname === '/home'), FORA do AuthGuard —
  ao contrário do que o comentário acima sugeria, isto NÃO espera o
  getSession() do Supabase resolver. Com deps [] (carrega 1x ao montar), o
  efeito capturava `userId` (e hidratarPerfil/hidratarTeams/
  hidratarVotacaoStatus, cada um fechado sobre ESSE userId nulo) do
  primeiro render — se esse primeiro render acontecia antes da sessão
  resolver, `gravarCache(null, …)` era ignorado (cacheLocal.js exige
  userId) e as hidratações para outros contextos silenciosamente não
  escreviam nada. Em localhost a sessão já vinha resolvida do storage antes
  do 1º paint (raro reproduzir); em produção (rede real) não. Agora o
  efeito depende de [userId] e sai cedo sem ele — corre de novo, com o
  userId certo, assim que a sessão resolver.
- (linha ~111, `const doCache = lerCache(userId, CACHE_CHAVE);`) Cache local (13-set, "Velocidade 3"): mostra o Início da última visita
  na hora (sem LoadingFutty) — o /api/inicio de verdade corre por trás e
  substitui (e regrava o cache) assim que responder. Hidrata Perfil/Sessao
  também a partir do cache, para o resto da app sentir o mesmo ganho.
- (linha ~138, `if (d?.ads) semearAds(d.ads);`) Velocidade 9 — ver `carregar()`
- (linha ~140, `preaquecer(userId, d);`) IDEIA DO DONO (Velocidade 6B): com o Início já pintado, o app aproveita
  o aparelho parado para baixar os dados e as imagens das outras abas.
  O primeiro toque em qualquer aba passa a não custar rede nenhuma.
- (linha ~158, `useEffect(() => {`) VELOCIDADE 8 (16-set) — o app voltou à frente. Se o último /api/inicio já
  tem mais de 60 s, busca-se outra vez POR TRÁS: `carregar()` troca os dados
  quando a resposta chegar e `carregando` continua falso (só é verdade sem
  dados nenhuns), por isso a pessoa nunca vê um F de carregamento — vê a tela
  que deixou e, um instante depois, a tela actualizada.

## src/context/PerfilContext.jsx

- (linha ~1, `import { createContext, useCallback, useContext, useEffect, useRef, useState }…`) Futty v2.0 — Contexto do perfil (/api/me), fonte única partilhada por toda a app.
  Achado 3/23 (roteiro 10-set): cada página que precisava do utilizador chamava o
  seu próprio useApi('/api/me') — Início, Equipa, Perfil (2x!), Planos, os guards —
  cada navegação repetia o mesmo pedido. Agora carrega UMA vez por sessão (login) e
  todos os consumidores partilham o mesmo estado.
- (linha ~13, `const ESPERA_HIDRATACAO_MS = 3000;`) Quanto se espera pela hidratação vinda do /api/inicio antes de pedir /api/me
  por conta própria (Velocidade 6B). De Lisboa o /api/inicio responde em ~900 ms;
  3 s é folga suficiente sem deixar a tela presa se ele nunca vier.
- (linha ~20, `let alinhador = null;`) RODADA 27 — quem alinha os caches guardados com um perfil confirmado (lib/cacheCard.js) só faz falta
  QUANDO o card muda, então mora fora do arranque (o teto de 320 KiB do verificar-dist é de JS que o WebKit
  compila antes da 1ª tela) e se REGISTRA aqui ao carregar — junto das telas em que o card muda (Figurinha,
  Início, Perfil; ver lib/alinharCard.js). Import dinâmico custava ~1 KiB de cola de pré-carga no arranque.
  Sem registro (nenhuma dessas telas abriu) não há o que alinhar: nada mudou.
- (linha ~43, `function adiantarFotoDoCromo(user) {`) VELOCIDADE 9 (23-set) — põe a foto do cromo a caminho assim que se sabe qual
  é, sem esperar pela tela.

  O relatório do build 28 trouxe `cromo · avatar:decodificar 458 ms` como a
  fase mais cara de compor o cromo do Início — e a maior parte disso é a ida a
  São Paulo, não a descodificação: o pedido da imagem só partia quando a
  composição chegava à linha do avatar, bem depois do arranque. Aqui ele parte
  com o perfil (incluindo o do cache local, antes de qualquer rede).

  É de propósito um `new Image()` e não o `carregarImagem` do
  utils/figurinhaCanvas: importar o canvas aqui punha um módulo grande no
  chunk do arranque, para poupar um decode de 512 px. O que interessa — os
  bytes — fica no cache do browser, e a composição encontra-os lá.
- (linha ~100, `const perfilRef = useRef(null);`) RODADA 27 — o perfil em exibição AGORA (não o que o último render viu). Duas coisas dependem disto:
  saber se o rosto mudou quando chega um perfil confirmado (lib/cacheCard.js) e a guarda de hidratar() —
  o cache nunca pisa um dado confirmado (deCacheSet diz se o que está em exibição veio do cache).
- (linha ~145, `const doCache = lerCache(userId, CACHE_CHAVE);`) Cache local (13-set, "Velocidade 3", stale-while-revalidate): mostra o
  último /api/me bom na hora (sem LoadingFutty) enquanto o pedido de
  verdade corre por trás — motor em São Paulo, quem está longe sente
  ~240ms mesmo já com tudo centralizado num pedido só por sessão.
- (linha ~151, `adiantarFotoDoCromo(doCache?.user);`) VELOCIDADE 9: a foto do cromo começa a ser baixada AQUI — no arranque,
  a partir do cache, antes de qualquer resposta do motor. Era a fase mais
  cara de compor o cromo do Início (458 ms no relatório do build 28), e
  quase toda ela era a ida a São Paulo a começar tarde. Ver
  `adiantarFotoDoCromo`.
- (linha ~165, `const rota = typeof window !== 'undefined' ? window.location.pathname : '';`) VELOCIDADE 6B (15-set): a abrir DIRETO no Início, o /api/inicio já traz o
  `me` dentro do payload agregado e hidrata este contexto (hidratarPerfil).
  Pedir /api/me aqui era um segundo pedido para a mesma coisa, a competir
  com o /api/inicio logo no arranque — o pior momento possível.

  Este provider vive ACIMA do BrowserRouter (ver App.jsx), por isso não há
  useLocation: lê-se o pathname do arranque, que é o que interessa (o efeito
  só corre uma vez por sessão). E, como nada garante que a hidratação venha
  — o /api/inicio pode falhar ou ficar pendurado —, arma-se um prazo: se
  ninguém hidratar a tempo, pede-se /api/me na mesma.
- (linha ~271, `adiantarFotoDoCromo(data?.user);`) Velocidade 9 — ver a nota na carga inicial
- (linha ~289, `suspenso: erroCode === 'CONTA_SUSPENSA' && !deCache,`) Conta suspensa (requireAuth do backend) — o AuthGuard usa isto para mostrar
  o ecrã próprio em vez do app. `&& !deCache` (14-set): decisão de gate
  nunca a partir de cache — erroCode só é preenchido pelo /api/me fresco
  (a exibição do cache limpa erroCode), mas o guard fica explícito mesmo
  assim, como invariante, não como dependência de como o resto do efeito
  está escrito hoje.

## src/context/SessaoContext.jsx

- (linha ~1, `import { createContext, useCallback, useContext, useEffect, useRef, useState }…`) Futty v2.0 — Contexto de sessão (12-set, "Velocidade 2"): equipas do
  utilizador (/api/teams) e votação da equipa principal, carregadas 1x por
  sessão e partilhadas por toda a app — mesmo problema que o PerfilContext já
  resolveu para /api/me, agora para /api/teams. Achado da varredura: Layout,
  BottomNav (fora do Início), Feed, MeuPerfil e Ranking disparavam cada um o
  seu próprio GET /api/teams a cada navegação; Layout em particular tinha um
  bug real — chamava useTeams() no seu PRÓPRIO corpo, mas o InicioProvider é
  montado como FILHO do Layout, então useInicio() aí dentro nunca via o
  contexto do Início (contexto só flui para descendentes). Por isso este
  provider tem de ficar ACIMA do Layout na árvore (ver App.jsx).

  Na rota /home o InicioContext já traz teams/votacao_status dentro do
  payload agregado de /api/inicio (1 pedido só, decisão de 11-set) — para não
  duplicar esse pedido, este provider ADIA a sua própria carga inicial
  enquanto o pathname ATUAL for /home (reavaliado a cada navegação — nunca
  travado num pathname "da 1ª renderização": a "/" redireciona para "/home"
  via <Navigate>, e travar no pathname inicial perderia esse caso). Em vez
  disso o InicioContext HIDRATA este contexto (hidratarTeams/
  hidratarVotacaoStatus) assim que /api/inicio responde — o mesmo padrão que
  já usa para hidratar o PerfilContext com `me`. Se a hidratação nunca vier
  (ex.: /api/inicio falhou) e o utilizador sair de /home sem dados, o efeito
  reavalia e faz a carga própria como rede de segurança.
- (linha ~41, `const noInicioAgora = pathname === '/home' || pathname === '/';`) "/" conta como Início (Velocidade 7B): no arranque frio a rota é "/" por um
  instante antes do <Navigate> para "/home", e bastava esse instante para
  disparar /api/teams + votacao-status em paralelo com o /api/inicio que traz
  os dois — 3 pedidos frios em vez de 1. O PerfilContext já fazia o mesmo.
- (linha ~111, `const doCache = lerCache(userId, CACHE_TEAMS);`) Cache local (13-set, "Velocidade 3"): mostra as equipas da última visita
  na hora, sem `carregandoTeams` a tapar a tela — carregarTeams() por
  trás substitui assim que a resposta fresca chegar.
- (linha ~132, `const slug = teams[0]?.slug || lerCache(userId, CACHE_TEAMS)?.[0]?.slug || null;`) VELOCIDADE 6B (15-set): este efeito esperava `teams` — ou seja, esperava o
  /api/teams responder — antes de sequer começar o votacao-status. Duas idas
  a São Paulo em fila, ~500 ms só de espera. Mas o slug do time principal
  está no cache local desde a última visita: dá para arrancar já com ele.
  Se o /api/teams trouxer outro slug (a pessoa mudou de time principal), o
  efeito corre de novo com o slug certo — votacaoTentadaParaRef trata disso.
- (linha ~153, `const doCache = lerCache(userId, CACHE_VOTACAO);`) Cache local (13-set, "Velocidade 3"): mostra o status da última visita
  na hora; o pedido por trás substitui assim que responder.
- (linha ~188, `const hidratarTeams = useCallback((novasTeams) => {`) userIdRef.current em vez do `userId` da closure (13-set → corrigido
  14-set, "Velocidade 3"): estas funções são chamadas de FORA (o
  InicioContext guarda a referência que recebeu de useSessao() no seu
  próprio efeito) — se essa chamada vier de um efeito cujo useCallback foi
  criado num render anterior (userId ainda nulo), gravarCache(null, …)
  seria ignorado mesmo com a chamada em si a acontecer depois da sessão
  resolver. O ref é sempre o userId ATUAL, não o congelado na criação da
  função — por isso as duas ficam com deps [] (identidade estável, nunca
  recriadas à toa).
- (linha ~206, `const hidratarVotacaoStatus = useCallback((status, slug = undefined) => {`) VELOCIDADE 9 (23-set) — `slug` passa a vir de quem hidrata.

  A marca "já tentei para este time" era lida de `teamsRef.current`, e quem
  hidrata (InicioContext) chama `hidratarTeams` e `hidratarVotacaoStatus` no
  MESMO instante: a ref ainda tem o valor anterior — numa abertura fria, uma
  lista vazia. A marca ficava `null`, e quando os times entravam o efeito de
  baixo via "slug diferente do que tentei" e pedia o votacao-status outra
  vez — exactamente o dado que o /api/inicio tinha acabado de trazer. Não se
  via no Início (lá o efeito não corre); aparecia na tela SEGUINTE, uma ida a
  São Paulo ao mudar para a Resenha.

## src/hooks/useAd.js

- (linha ~1, `import { useEffect, useState } from 'react';`) Futty v2.0 — Anúncio de uma página (Velocidade 6B, 15-set).

  O AdCard buscava o anúncio ele próprio, e na Resenha ele só é montado entre o
  3º e o 4º item do feed — ou seja, o pedido do anúncio só COMEÇAVA depois do
  /api/feed inteiro ter chegado e a lista ter sido pintada. Duas idas a São
  Paulo em fila por uma faixa de 100 px.

  VELOCIDADE 9 (23-set): deixou de haver pedido POR TELA. Os slots das cinco
  páginas vêm todos juntos — dentro do /api/inicio, ou de um `/api/ads/sessao`
  para quem não entrou pelo Início — e ficam em lib/ads.js por alguns minutos.
  Este hook só lê de lá; quando já há resposta em mãos (o caso normal a partir
  da segunda tela), devolve o anúncio no primeiro render, sem rede nenhuma.

## src/hooks/useApi.js

- (linha ~6, `export function useApi(path, opts = {}) {`) Dois componentes a pedir o MESMO path ao mesmo tempo dão uma ida à rede só:
  desde a Velocidade 7B essa coalescência vive no próprio apiFetch (lib/api.js),
  e vale também para quem chama apiFetch direto (pré-aquecimento, Figurinha).
- (linha ~10, `export function useApi(path, opts = {}) {`) @param {string|null} path - null = não busca.
  @param {{ pausado?: boolean }} [opts] - `pausado` não dispara ao montar, mas
    mantém o `path` vivo para o `reload()` (Velocidade 6B: o cache está fresco,
    não vale a pena pedir — mas se a pessoa puxar para atualizar, pede).

## src/hooks/useApiComCache.js

- (linha ~1, `import { useCallback, useEffect, useState } from 'react';`) Futty v2.0 — Wrapper de useApi com cache local (13-set, "Velocidade 3":
  stale-while-revalidate). Mostra a última resposta boa na hora (sem
  LoadingFutty) e busca por trás.

  VELOCIDADE 6B (15-set), duas mudanças:

  1. A leitura do cache passou a ser SÍNCRONA, no useState inicial. Antes
     acontecia num microtask depois do primeiro render — ou seja, o primeiro
     render era sempre sem dados, e a tela piscava o LoadingFutty a CADA troca
     de aba mesmo tendo tudo em cache.

  2. `frescoMs`: se a entrada foi gravada há menos de X (o pré-aquecimento
     acabou de passar por ali — ver lib/preaquecerDados.js), nem se pede de
     novo. Passa-se path=null ao useApi e pronto: trocar de aba não custa
     pedido nenhum. Passado esse prazo, volta ao comportamento de sempre
     (pinta do cache, revalida por trás). O `reload()` manual ignora a janela.
- (linha ~49, `const esperaPara = (entrada) => adiarRevalidacao && !!entrada && !ehFresco(entr…`) RODADA 8A — revalidar DEPOIS de pintar (opt-in; o Ranking usa). Nos
  relatórios do iPhone (builds 17 e 18, mesma conta e aparelho) o Ranking com
  cache VELHO pintou em 1389, 2121 e 1866 ms — os dados chegaram antes da
  pintura (704, 436, 809) —, e com cache FRESCO, sem pedido nenhum, em 226 a
  332 ms. A 1ª pintura dessa tela é cara no iPhone (23 linhas, pódio e botões
  animados), e a resposta a chegar a meio dela custava mais um segundo. Com
  isto a lista do cache pinta sozinha, e o pedido sai dois quadros depois.
  O WebKit do PC não reproduz a demora; as marcas novas do Diagnóstico
  (lista, listaNova, 1º quadro, maior quadro) confirmam no próximo relatório.
- (linha ~111, `useEffect(() => {`) VELOCIDADE 8 (16-set) — o app voltou à frente: a aba que está na tela
  revalida, se o que ela mostra já passou da janela de frescor. A idade lê-se
  do cache OUTRA VEZ (não do `doCache` em estado): aquela foi medida no
  instante da montagem e não envelhece sozinha — o app pode ter passado uma
  hora em segundo plano com o mesmo objeto em memória.

  reloadBase(), não reload(): o `forcado` é para o "puxar para atualizar" da
  pessoa e, uma vez ligado, desliga a janela de frescor para o resto da vida
  do componente. Uma revalidação de fundo não deve deixar essa marca. E não
  acende loading nenhum (ver useApi.reload): a tela não pisca.

## src/hooks/useBairrosDaCidade.js

- (linha ~1, `import { useEffect, useState } from 'react';`) Futty v2.0 — Rodada 29T (bloco B, achado 157): os bairros da cidade que a pessoa escolheu, para o Criar time e os Ajustes do time.
  O campo Bairro só aparece quando a cidade TEM bairros na lista (IBGE no Brasil, freguesias em Portugal); este hook diz em que pé está:
    'sem-cidade'  nenhuma cidade da lista (vazia, ou digitada à mão fora do Brasil e de Portugal): sem campo
    'carregando'  buscando a lista (alguns décimos de segundo): sem campo ainda
    'sem-lista'   a cidade não tem bairros na lista (ou a lista não veio): sem campo
    'lista'       tem: `itens` ({ linha: [bairro, lat, lng], chave }[]) para o campo sugerir

## src/hooks/useConfetti.js

- (linha ~1, `let confettiPromessa = null;`) Futty v2.0 — Celebrações premium com canvas-confetti.

  FLUIDEZ 2 (16-set) — a biblioteca passa a ser buscada SÓ quando há festa.

  O `import confetti from 'canvas-confetti'` no topo era estático, e o Ranking e
  o Início importam este arquivo. Resultado: 12 KB de confete entravam no chunk
  de cada uma dessas telas e o WebKit compilava-os na PRIMEIRA visita, antes de
  haver qualquer coisa na tela — para uma festa que quase nunca acontece (só
  quem está no top 3, só quando o campeonato acaba).

  Com `import()` dentro da função, o download e a compilação só acontecem no
  instante em que se vai mesmo disparar. E cada celebração é `async` sem que
  ninguém tenha de esperar por ela: nenhuma chamada usa o retorno — é festa,
  não é dado.
- (linha ~33, `const FESTA = ['#d4a017', '#f5e070', '#8b5cf6', '#a78bfa', '#ffffff'];`) RODADA 16B (17-set): a chuva de moedas do prêmio do sorteio (F, Rodada 14B)
  saiu — reprovada pelo dono no aparelho. A cerimónia do sorteio deixou de
  importar este arquivo; a biblioteca continua a servir as outras festas.

## src/hooks/useIndicadorDeRolagem.js

- (linha ~1, `import { useEffect, useState } from 'react';`) Futty v2.0 — Rodada 29L (achados 130 e 138): diz se um trilho horizontal tem mais conteúdo escondido à esquerda e/ou à direita. Quem usa
  põe `ref={aoMontar}` no trilho e `data-mais-esq` / `data-mais-dir` nele (o CSS da casa, em app.css, esmaece a borda e a pessoa vê que continua).
  Só re-renderiza quando um dos dois lados MUDA (não a cada pixel rolado).

## src/hooks/useListaProgressiva.js

- (linha ~1, `import { startTransition, useEffect, useState } from 'react';`) Futty v2.0 — Listas em duas levas (VELOCIDADE 8, 16-set).

  O PROBLEMA: a Resenha punha os 20 itens do feed no MESMO commit do React —
  cada um com avatar, foto, barra de reações e a prévia de até 2 comentários com
  mais avatares. Isso é uma leva de layout e de pintura enorme, num só quadro, e
  a pessoa não vê nada até ela acabar. O Ranking faz o mesmo com 23 linhas, cada
  uma com moldura, pódio e botões animados (os relatórios do iPhone: 1389, 1866
  e 2121 ms para pintar).

  A ideia é simples: os primeiros itens — os que cabem na tela — pintam já; o
  resto entra dois quadros depois, quando a pessoa já tem alguma coisa à frente.
  Dois quadros porque o primeiro ainda cai antes do desenho e o segundo já corre
  com a 1ª leva pintada (o mesmo critério da pintura em lib/diagnostico.js).

  startTransition: diz ao React que a 2ª leva é trabalho de fundo. Se a pessoa
  tocar em alguma coisa a meio, o toque passa à frente em vez de esperar que o
  resto da lista acabe de montar.
- (linha ~29, `export function soCresceuNoFim(anterior, nova) {`) A lista só CRESCEU no fim (Rodada 29B, a Resenha em páginas: "Ver mais antigos" acrescenta 20 itens depois dos que já estão na
  tela)? Então o que já foi desenhado continua desenhado: voltar aos 6 primeiros encolheria a página debaixo do dedo e perderia a
  posição da rolagem. Os itens antigos têm de ser os MESMOS objetos, nas mesmas posições (a ponta e o último da lista anterior).
- (linha ~41, `const POR_LOTE = 5;`) FLUIDEZ 2 (16-set) — o "resto" deixa de ser UMA leva.

  A Velocidade 8 partiu a lista em duas: os primeiros já, o resto dois quadros
  depois. Só que "o resto" continuava a ser um commit único — numa Resenha com
  20 posts, o segundo commit monta 14 cartões de uma vez, cada um com avatar,
  foto, barra de reações e prévia de comentários. É menos mau do que 20 num só
  quadro, mas ainda é um quadro que a pessoa sente.

  Agora o resto entra de 5 em 5, com um quadro entre lotes. Cinco porque é
  pouco mais do que cabe numa tela de telemóvel: grande o suficiente para a
  lista não demorar a completar-se, pequeno o suficiente para nenhum lote
  segurar a tela.

## src/hooks/usePushNotifications.js

- (linha ~12, `if (Capacitor.isNativePlatform()) return 'nao_suportado';`) 14-set (Android): Web Push não existe dentro do WebView do Capacitor — o banner
  "Ativar notificações" (Inicio.jsx) e o toggle (MeuPerfil.jsx) já escondem sozinhos
  com 'nao_suportado', então basta a origem do estado saber que está no nativo.
  Entra depois via FCM (@capacitor/push-notifications), quando existir.
- (linha ~23, `let jaSincronizou = false;`) COFRE 25-set — o par VAPID do motor foi trocado, e uma subscrição de push nasce amarrada à chave com que foi
  feita: as antigas passam a ser recusadas (403) sem a pessoa ver nada. Uma vez por abertura do app, quem já
  autorizou as notificações e tem subscrição confere a chave que o motor serve hoje e, se mudou, se inscreve de novo
  — em silêncio: a permissão já foi concedida, então nem pergunta nada nem mostra aviso. Ver lib/chavePush.js.
  Corre com o aparelho PARADO (lib/ritmo: 1ª pintura feita + 3 s sem toque, no máximo 15 s): são dois pedidos e uma
  ida ao push service que não podem competir com o /api/inicio nem com o primeiro toque da pessoa.
  Falhou (sem rede, push service fora)? Tenta de novo da próxima vez que uma tela que usa o hook montar.

## src/hooks/useRanking.js

- (linha ~1, `import { useApiComCache } from './useApiComCache';`) Futty v2.0 — Hook de dados do ranking de uma equipa (modelo definitivo).
  Cache local (13-set, "Velocidade 3"): mostra o ranking da última visita na
  hora, atualiza por trás.
- (linha ~6, `const VAZIO = [];`) Velocidade 8: uma lista vazia ESTÁVEL. `data?.ranking || []` criava um array
  novo a cada render enquanto os dados não chegavam — e uma identidade nova a
  cada render faz qualquer consumidor que compare listas (useMemo, useEffect,
  useListaProgressiva) achar que a lista mudou, sempre.
- (linha ~14, `` const { data, loading, error, reload } = useApiComCache(path, slug ? `ranking:$… ``) revalidarDepoisDaPintura (Rodada 8A): com cache velho, a lista pinta antes de
  o pedido sair — ver a nota em useApiComCache.js.

## src/hooks/useTeam.js

- (linha ~6, `export function useTeams() {`) Lista de equipas do utilizador autenticado. Lê do SessaoContext (12-set,
  "Velocidade 2") — carregado 1x por sessão e partilhado por toda a app, em
  vez de cada tela disparar o seu próprio /api/teams a cada navegação. Na
  rota /home o SessaoContext é hidratado pelo InicioContext a partir do
  payload agregado de /api/inicio (11-set, "1 pedido só") — este hook não
  precisa saber disso, só lê o resultado final.
- (linha ~19, `export function useTeam(slug) {`) Detalhes de uma equipa + membros. Cache local (13-set, "Velocidade 3"):
  mostra a última visita na hora, atualiza por trás.

## src/index.css

- (linha ~18, `--presenca-sim-borda: rgba(74, 222, 128, 0.45);`) Presença — "Vou" / "Não vou" (Rodada 12A → revertido na Rodada 13,
       decisão do dono, build 22). O "Vou" dourado durou uma rodada: o dourado
       tinha de ser único e forte, e o "Ver sorteio"/"Sortear" — a ação mais
       importante do app — é quem precisa dele, não um botão de presença. O
       "Vou" vira fantasma VERDE, o gémeo exato do "Não vou" vermelho: mesma
       opacidade (0.45 na borda, 0.15 no preenchimento), mesmo peso — só troca a
       cor. Nenhum dos dois pode ler-se como semáforo saturado nem como dourado.
- (linha ~188, `pausa TUDO, e é isso que a torna perigosa para uma classe de animação`) VELOCIDADE 8 (16-set) — com o app em segundo plano ou a tela bloqueada, nada
     se anima. O `data-oculto` é posto no <html> por lib/ritmo.js a ouvir o
     visibilitychange; o CSS não tem como ver o document.hidden sozinho.
     Vale para TODAS as animações DECORATIVAS: se ninguém está a ver, nada do que
     parar pode mudar de aspeto. `paused` (e não `none`) é o que faz a animação
     retomar de onde ficou quando a pessoa volta, sem saltos.
- (linha ~194, `html[data-oculto] *:not(.page-transition):not(.inicio-reveal):not(.page-reveal)…`) HOTFIX (23-set) — tela preta após login com Google no Chrome. Esta regra
     pausa TUDO, e é isso que a torna perigosa para uma classe de animação
     específica: as de ENTRADA DE CONTEÚDO (fade de opacity 0 → 1 ao montar, com
     `animation-fill-mode: backwards`/`both`). Se um desses elementos nasce com
     `document.hidden = true` (aba em 2º plano durante o redirect do OAuth, ou
     qualquer outra forma de a página montar escondida), esta regra pausa a
     animação em currentTime 0 ANTES de ela correr um só quadro — e o
     `backwards`/`both` mantém o elemento no estado "antes de começar", que é
     invisível. Sem outro gesto a acontecer, fica assim para sempre: conteúdo no
     DOM, tela preta. Violação direta da lei "Visibilidade nunca depende de
     animação JS" (CLAUDE.md) — só que aqui quem prende é o PRÓPRIO CSS, pausado
     pela nossa regra.
     Busca em app.css por keyframes com opacity de 0 a 1: das que decidem se
     CONTEÚDO aparece (excluídas abaixo) — `.page-transition` (pageEntra, todas
     as rotas), `.inicio-reveal`/`.page-reveal` (inicioReveal, Início e a maioria
     das outras páginas), `.fig-card-enter` (figCardIn, o card da Figurinha),
     `.perfil-tile` (perfilTile, os blocos de estatística do Jogador) — e das que
     são só efeito visual e continuam pausáveis: aurora (index.css, acima),
     shine/glint/twinkle (cardShine, nomeShine, futtyFrameShine, ctaGlint,
     figGlint*, futtyDotTwinkle, planosCoroaTwinkle), pulso/respiração
     (heroicPulse, cromo-previa-pulso, homeBreath, silRespira, rankEsqueletoRespira),
     e tudo da Cerimónia do Sorteio (cerLuz/cerClunk/cerFlash/cerChase/cerBob/
     cerSeg/cerCoin, campConfete, campCoin) — nenhuma delas esconde conteúdo: só
     atrasa um brilho, o que não é o mesmo defeito.
     As de entrada de conteúdo ficam de fora desta pausa: melhor uma animação de
     180 ms a correr com a aba escondida (custo zero de bateria — dura menos que
     o olho vê) do que o risco de a página nunca mais aparecer.
     FICOU DE FORA na varredura original (achado no mesmo dia, hotfix separado):
     `.anim-slide-in` (notifSlide, `backwards` — os cards da Resenha em /feed e o
     card do jogo no Início) e `.futty-lockup-f` (futtyLockupIn, `both` — o F da
     LandingPage). Mesmo defeito (conteúdo preso em opacity 0), mesma correção:
     entram na exclusão. Rodada 29A: `.futty-toast` (components/Toast.jsx) também — um aviso que nasce com a aba
     escondida não pode ficar preso em opacity 0.
- (linha ~240, `#root,`) Guarda contra rolagem lateral (Velocidade 7B). Se algo passar da largura da
     tela, o WebKit do iPhone alarga a viewport para caber e ENCOLHE a página
     inteira (o print da Resenha a ~66%). `clip` corta sem virar contêiner de
     rolagem — o sticky da topbar continua a funcionar, ao contrário de `hidden`,
     que também forçaria overflow-y:auto. Safari < 16 ignora (sem guarda, sem dano).
- (linha ~283, `input,`) ZOOM DO iOS (Rodada 8A, 15-set). Campo com fonte abaixo de 16 px faz o iPhone
     dar zoom na página inteira ao focar — e o zoom não volta sozinho: a Resenha
     "desenquadrava" ao tocar no comentário (13 px). 16 px é o PISO de todo campo:
     maior pode, menor nunca. Estilo inline ganha desta regra, por isso os campos
     com fontSize inline também foram subidos para 16. O index.html leva ainda
     maximum-scale=1.
- (linha ~316, `A entrada é @keyframes com o estado natural VISÍVEL (opacity 1 no CSS base): se…`) VAGA 3 — lineReveal/lineShimmer removidos: eram as linhas decorativas do nome do
     Início, que saiu quando o cromo real (com a placa do nome) passou a ser o
     destaque. Zero consumidores.
- (linha ~320, `.futty-toast {`) Toast (Rodada 29A, 30-set) — o aviso de uma linha no MEIO da tela. Um componente só (components/Toast.jsx).
     A entrada é @keyframes com o estado natural VISÍVEL (opacity 1 no CSS base): se a animação for pausada no
     quadro 0 (ver `data-oculto` acima) o pior caso é o aviso aparecer sem animar — e `.futty-toast` está na lista
     de exclusão daquela pausa, como as outras entradas de conteúdo. A saída é `transition` (não anima parado).
- (linha ~404, `.texto-apoio {`) Texto de apoio (Rodada 29A, 30-set): a frase de ajuda que fica debaixo de um campo ou de um título. Um tamanho
     só (13 px), cor apagada, largura máxima de ~34 em (não vira uma linha comprida), altura de linha 1,5 e
     alinhada ao campo a que se refere (à esquerda; `--centro` para as telas que centram o bloco). `display: block`
     porque o `max-width` e a margem de cima não valem em <span> solto. Frases curtas.

## src/lib/ads.js

- (linha ~1, `import { apiFetch } from './api';`) Futty v2.0 — Publicidade de uma SESSÃO, não de uma tela (VELOCIDADE 9, 23-set).

  O PROBLEMA, medido no relatório do dono (build 28, iPhone, Lisboa): num
  percurso de 20 segundos, 7 dos 22 pedidos eram publicidade — quatro
  `GET /api/ads?pagina=…` (498, 539, 578, 323 ms) e três `POST /api/ads/evento`
  (255, 264, 542 ms). Trabalho de servidor: 0 a 20 ms. Era tudo distância, paga
  outra vez em cada tela, por uma faixa de 100 px.

  As campanhas não mudam a meio de uma sessão (a rotação entre elegíveis é por
  minuto, no servidor). Então:

    · os slots das cinco páginas vêm JUNTOS — dentro do /api/inicio (quem abre
      no Início não paga pedido nenhum) ou de um `GET /api/ads/sessao` para
      quem entra por outra porta;
    · as impressões e os cliques ficam numa fila e saem em LOTE, quando a tela
      já não está à espera de nada — nunca no caminho da pintura.
- (linha ~45, `export function semearAds(ads) {`) Guarda o que veio de fora (o /api/inicio traz `ads` desde a Velocidade 9).
  É o caminho normal: quem abre o app no Início nunca pede anúncios.

## src/lib/alinharCard.js

- (linha ~1, `import { registrarAlinhador } from '../context/PerfilContext';`) Futty v2.0 — Liga o alinhamento dos caches ao PerfilContext (RODADA 27). Só importar este módulo já
  basta (efeito de carga): quem muda o card — Figurinha, Início, Perfil — o importa, e a partir daí cada
  perfil confirmado alinha o Início, o Ranking e o Feed guardados (ver lib/cacheCard.js). Fica num módulo
  à parte porque cacheCard.js é lógica pura (testada no Node) e o PerfilContext puxa React.

## src/lib/api.js

- (linha ~6, `const MOTOR = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/,…`) VELOCIDADE 4 — de onde sai o /api depende de onde a tela está a correr:

    web em produção  → caminho RELATIVO (''). O /api passa a viver no mesmo
      domínio das telas, servido pela Cloudflare Pages Function
      (functions/api/[[path]].js), que reencaminha para o Cloud Run. Mesma
      origem = o browser não faz preflight nenhum. Cada chamada perde o OPTIONS
      de ida e volta que a antecedia.

    app nativo → URL do Cloud Run. O WebView tem origem própria
      (capacitor://localhost no iOS, https://localhost no Android) e não existe
      "mesma origem" possível: o que torna o preflight barato lá é o
      Access-Control-Max-Age do backend (server.js), que o faz acontecer uma
      vez em vez de a cada pedido.

    dev (web) → URL do .env (localhost:3001 ou o IP da máquina no modo rede).
      A Pages Function não corre no vite dev server; manter absoluto aqui é o
      que deixa o LIGAR-FUTTY.bat e o teste no celular funcionarem como sempre.

  A mídia NÃO segue esta regra: continua a sair de VITE_API_URL/VITE_ASSETS_URL
  em utils/avatar.js, com URL absoluta, para não perder o cache longo.
- (linha ~29, `export const MSG_SEM_REDE = 'Sem internet agora. Tente de novo.';`) A frase da casa para "a rede caiu" (Rodada 29G): é o que o `apiFetch` devolve no lugar do erro cru do navegador.
- (linha ~35, `const getsEmVoo = new Map();`) VELOCIDADE 7B — o mesmo GET em paralelo é UMA ida à rede: quem chega com um
  pedido igual ainda no ar recebe a mesma promessa. O caso real: o
  pré-aquecimento pedia /api/me/selos (e o ranking) e a tela, aberta nesse
  instante, pedia outra vez. Só GET sem corpo; a entrada sai assim que a
  resposta chega (não é cache — esse é o cacheLocal). A chave leva o token:
  sessões diferentes nunca partilham resposta. Quem recebe o mesmo objeto não o
  deve alterar — nenhuma tela o faz (o estado do React é trocado, não mexido).

  Qualquer ESCRITA esvazia o mapa: um GET só aproveita outro que começou depois
  da última escrita. Sem isto, votar e recarregar o ranking podia pegar carona
  num GET que saiu antes do voto e devolver a lista velha.
- (linha ~48, `let aoSessaoInvalida = null;`) RODADA 28 — 401 do motor quer dizer "a sessão acabou" (saiu de todos os aparelhos noutro lugar,
  conta apagada, refresh revogado): o motor só o devolve quando o Supabase recusou o token (com o
  Supabase fora do ar é 503). Quem decide o que fazer é o AuthContext — renova UMA vez; se não der,
  sai só deste aparelho e o login avisa porquê. Registro, não import: o AuthContext já importa isto.
- (linha ~61, `const supabase = await obterSupabase();`) VELOCIDADE 8: o cliente chega por import dinâmico (lib/supabaseAsync.js).
  Aqui já se está dentro de uma função assíncrona que ia esperar pelo
  getSession de qualquer maneira — o await a mais não custa ida à rede
  nenhuma, e o AuthProvider já pediu o módulo na montagem.
- (linha ~93, `for (let volta = 0; ; volta += 1) {`) Rodada 28: no máximo duas voltas — a 2ª só depois de a sessão ter sido renovada por um 401.
- (linha ~101, `const t0 = performance.now();`) VELOCIDADE 4 — a caixa-preta mede AQUI, no único sítio por onde todas as
  chamadas passam. Só rota, estado e tempos; nunca corpo nem token.
- (linha ~145, `export async function apiUploadCampos(path, campos, { method = 'POST' } = {}) {`) RODADA 19 — variante com vários campos (ex.: "avatar" + "original" no
  mesmo pedido) e método à escolha (POST/PUT). RODADA 28: passa pelo mesmo
  apiFetch de tudo (sessão, 401, caixa-preta — o tempo do upload da foto entra
  no Diagnóstico e na telemetria); era uma segunda cópia da lógica de sessão.

## src/lib/appleAuth.js

- (linha ~1, `import { Capacitor } from '@capacitor/core';`) Futty v2.0 — Entrar com a Apple (13-set, iOS). Partilhado por
  LandingPage/Login/Register, irmão do lib/googleAuth.js.

  Por que existe: a App Store exige o Entrar com a Apple em qualquer app que
  ofereça login por outra rede social (Guideline 4.8) — o Futty tem o do Google.
  Só aparece no iOS nativo: na web e no Android o botão não é desenhado.

  Ao contrário do Google, aqui NÃO há Custom Tab nem deep link. O iOS mostra a
  folha nativa do sistema, devolve um identityToken (um JWT assinado pela Apple)
  e a sessão nasce de supabase.auth.signInWithIdToken, tudo dentro da app. Por
  isso o DeepLinkListener não participa deste fluxo.
- (linha ~14, `import { obterSupabase } from './supabaseAsync';`) Velocidade 8: por obterSupabase(), como o googleAuth — o supabase-js não pode
  voltar ao modulepreload por um caminho de import estático qualquer.

## src/lib/bairrosDados.js

- (linha ~1, `import { Capacitor } from '@capacitor/core';`) Futty v2.0 — Rodada 29T (bloco B, achado 157): busca a lista de bairros da cidade que a pessoa escolheu, só então, e nunca no bundle nem no pacote
  nativo (a pasta dados/ sai em scripts/preparar-nativo.js; no app nativo vem de VITE_ASSETS_URL, como cidades.json e freguesias.json).
    Brasil    um arquivo por estado (public/dados/bairros/<UF>.json, de 0,5 a 35 KB comprimidos), buscado quando a cidade é escolhida: é preciso
              saber se ela TEM bairros na lista antes de mostrar o campo. Cada estado é buscado uma vez só.
    Portugal  o freguesias.json de sempre (lib/freguesiasDados.js).
  Falhou a rede? A promessa é descartada e a próxima escolha de cidade tenta de novo; sem a lista o campo (opcional) simplesmente não aparece.

  A URL é montada AQUI, com a mesma regra do urlAsset (web: mesma origem; nativo: VITE_ASSETS_URL), e não chamando o urlAsset de utils/avatar.js —
  o mesmo motivo de lib/cidadesDados.js (importar aquele módulo daqui o separaria num chunk próprio dentro do arranque).

## src/lib/brilhantes.js

- (linha ~1, `import { apiFetch } from './api';`) Futty v2.0 — O que as telas precisam saber sobre Figurinhas Brilhantes
  (SPEC-FIGURINHA-3, 22-set). Um sítio só, para Planos, Figurinha e Início não
  escreverem três versões da mesma pergunta.
- (linha ~14, `return await apiFetch('/api/brilhantes/estado', { segundoPlano });`) `segundoPlano` (Velocidade 9): revalidação por trás, com a tela já aberta
  a partir do que o /api/inicio trouxe. Marca a chamada como de fundo no
  diagnóstico — não é espera de ninguém, e não pode entrar na conta de
  "dados" da tela.
- (linha ~20, `return { direito: { fonte: null, team_id: null, kit_id: null, restantes: 0 }, c…`) indisponivel: a tela mostra 'ninguém tem nada', mas isto NÃO é uma resposta do servidor — quem guarda
  o estado (cacheCard.espelharBrilhantesNoInicio) não pode guardá-lo como verdade (Rodada 27).

## src/lib/cacheCard.js

- (linha ~1, `import { PREFIXO, chaveCompleta } from './cacheLocal';`) Futty v2.0 — O card mudou: tudo o que guarda o rosto antigo muda junto (RODADA 27, 25-set).

  Relato do dono, conta backup no celular: "não sei se o reenquadramento chega ao Início". Não chegava
  direito. A foto nova entrava no perfil (PerfilContext) e no cache `me`, mas o cache do Início
  (`inicio`, com o `me` de ANTES lá dentro) e os do Ranking, do Feed e dos times seguiam com o rosto
  velho — e o Início, ao montar, hidratava o perfil A PARTIR desse cache velho e pintava o cromo
  antigo por ~2 s, até o /api/inicio responder (medido no iPhone simulado: "cromo antigo → cromo novo",
  3,9 s; o Ranking nem trocou, porque o cache dele é "fresco" por 30 s e a tela nem pede de novo).

  Aqui mora tudo o que se faz DEPOIS de uma mudança no card, num sítio só:

    · `alinharCachesComOPerfil` — quando um perfil CONFIRMADO chega (o PATCH da Figurinha, o GET
      /api/me depois de gerar, o /api/inicio), o `me` guardado no Início passa a ser esse, e, se o
      rosto mudou (foto, recorte, figurinha, genérico), cada objeto que é ESTA pessoa nos outros
      caches (linha do Ranking, presença, post do Feed, membro do time) recebe os campos novos.
      Não renova o carimbo: a resposta continua tão velha quanto era, só concorda com a mudança;
    · `aquecerImagensDoRosto` — o browser começa a baixar a foto nova nos tamanhos que as telas
      pedem (o motor já deixa os derivados prontos no upload; ver backend/utils/derivadosMidia.js),
      e a primeira tela que a pedir a encontra no cache HTTP.

  Só troca campos que o objeto JÁ tem: uma linha do Ranking sem `foto_url` não ganha `foto_url`.
- (linha ~44, `export function emendarCache(userId, chave, emendar) {`) Reescreve o conteúdo de uma entrada que JÁ existe, SEM renovar o carimbo (Rodada 27).

  Emendar não é buscar: a resposta continua tão velha quanto era (é a idade dela que decide se a
  tela revalida por trás), só que agora concorda com uma mudança que a própria pessoa acabou de
  fazer — trocou a foto, o enquadramento, o genérico. Sem isto, a foto nova morava no perfil e a
  antiga ficava viva no cache do Início, do Ranking, da Resenha, e voltava a aparecer na primeira
  tela que a lesse (o "reenquadramento não chega ao Início" do relato do dono).

  `emendar(dados)` recebe o conteúdo já lido e devolve o novo — ou `undefined` para deixar a
  entrada como está (nada é regravado). Devolve true se regravou. Nunca lança.

## src/lib/cacheLocal.js

- (linha ~1, `export const PREFIXO = 'futty_cache_v1:';`) Futty v2.0 — Cache local por utilizador (13-set, "Velocidade 3": "mostrar na
  hora, atualizar por trás"). Guarda a ÚLTIMA resposta boa de cada pedido em
  localStorage — ao montar, os contextos/telas mostram esse dado IMEDIATAMENTE
  (sem LoadingFutty) e disparam o pedido normal por trás; quando a resposta
  fresca chega, substitui o estado e regrava o cache. Motor em São Paulo, quem
  está longe (Lisboa) sente ~240ms mesmo com tudo já otimizado — isto tira essa
  espera da frente do olho em toda navegação depois da 1ª.

  userId é passado explicitamente pelo chamador (não adivinhado daqui via
  supabase.auth.getSession() — isso corria em paralelo com a MESMA subscrição
  que o AuthContext já mantém, e a 1ª leitura ficaria numa corrida com o
  getSession() inicial). Os contextos/hooks que usam isto já têm o userId à
  mão (useAuth()/useSessao()), por isso passá-lo é mais simples e sem corrida.

  Nunca global: celular compartilhado não pode mostrar o perfil da conta
  anterior — a chave leva o userId, e limparCacheLocal() (chamada no signOut
  do AuthContext) apaga tudo.
- (linha ~34, `export function lerCacheComIdade(userId, chave) {`) Como lerCache, mas diz também QUANDO foi gravado. A Velocidade 6B (15-set)
  precisa disto: se o pré-aquecimento acabou de passar por esta chave, a tela
  pinta do cache e NÃO repete o pedido — ver `frescoMs` em useApiComCache.
  Devolve `{ dados, idadeMs }` ou null.

## src/lib/chavePush.js

- (linha ~1, `const ehArrayBuffer = (v) => v instanceof ArrayBuffer || Object.prototype.toStr…`) Futty v2.0 — a chave VAPID do push e a re-inscrição silenciosa (COFRE 25-set).

  O par VAPID do motor foi trocado (o antigo vazou). Uma subscrição de push nasce amarrada à chave pública com que foi
  feita: depois da troca o push service recusa os envios do motor (403) e a subscrição de cada pessoa vira letra morta —
  sem a pessoa saber e sem nenhum erro na tela. Aqui mora o que faz o app se curar sozinho: comparar a chave com que a
  subscrição foi feita com a que o motor serve HOJE e, se mudou, refazer a inscrição (sem pedir permissão de novo: ela
  já foi concedida) e avisar o motor.

  Sem React, sem rede e sem `window`: só contas e a ordem das chamadas, com as dependências injetadas — para poderem
  ser provadas no Node (scripts/unidade/chave-push.test.mjs). O hook (hooks/usePushNotifications.js) traz as de verdade.

## src/lib/cidadesDados.js

- (linha ~1, `import { Capacitor } from '@capacitor/core';`) Futty v2.0 — Rodada 29B (D): busca a lista de cidades (public/dados/cidades.json) UMA vez, só quando o campo "Cidade"
  ganha foco. Nunca no bundle: servida do site (no app nativo, de VITE_ASSETS_URL — o pacote leva só a casca, ver
  scripts/preparar-nativo.js) e guardada pelo navegador (ver public/_headers). Falhou a rede? A promessa é descartada
  e o próximo foco tenta de novo; o campo continua aceitando texto livre.

  A URL é montada AQUI, com a mesma regra do urlAsset (web: mesma origem; nativo: VITE_ASSETS_URL), e não chamando o
  urlAsset de utils/avatar.js: importar aquele módulo daqui fez o bundler separá-lo num chunk próprio DENTRO do
  arranque (+320 B, e o arranque tem teto de 320 KiB — medido na Rodada 29B). Se a regra do urlAsset mudar, mude aqui.

## src/lib/convitePendente.js

- (linha ~1, `const CHAVE = 'futty_convite_pendente';`) Futty v2.0 — Rodada 29B (A) / 29H (item 1): o bilhete do convite. Quem abre um convite sem conta (ou com conta que ainda não
  terminou o onboarding) passa por cadastro, foto, nome e, às vezes, confirmação por e-mail ou login pelo Google/Apple antes de
  voltar ao time. O caminho do login leva o `from` junto, o do cadastro e o do OAuth não: este bilhete no aparelho guarda o convite
  até a pessoa chegar lá. Dois leitores:
    · o Onboarding, que começa pelas boas-vindas DO TIME (quem convidou, nome, logo — o bilhete leva uma cópia deles para a
      tela abrir sem esperar a rede) e guarda ali a escolha linha/gol, que só vale depois de entrar;
    · o Início, que devolve a pessoa a /convite/:token (uma vez só) — mas só se a conta já terminou o onboarding (senão o Início
      "roubava" o bilhete antes do Onboarding e a pessoa nunca via as boas-vindas do time).
  O `token` pode ser o longo (uuid) ou o código curto de /c/<código>: o motor aceita os dois.
  Módulo pequeno, sem import: fica FORA do arranque (só Convite, Onboarding e Início o importam, todos lazy).

## src/lib/cromoCache.js

- (linha ~1, `const BD = 'futty';`) Futty v2.0 — Cache do cromo do Início entre aberturas (VELOCIDADE 4).

  O cromo é a figurinha real desenhada em canvas: 600×600, decodificar o avatar
  e o fundo, compor, exportar. No celular isso leva de um a três segundos — e
  até 14-set a tela do Início ESPERAVA por ele para aparecer. Agora a tela
  aparece primeiro; isto aqui é o que faz o cromo aparecer na hora na abertura
  seguinte, em vez de se redesenhar do zero toda vez.

  Porquê IndexedDB e não o cacheLocal (localStorage) do resto da casa: o PNG tem
  algumas centenas de KB. Em localStorage teria de ir em base64 (+33%) e, com os
  ~5 MB de quota partilhados por TODOS os caches da app, uma figurinha grande
  sozinha despejaria o resto. O IndexedDB guarda o Blob como ele é, sem inflar e
  sem disputar essa quota.

  Chave por utilizador, como todo o cache da casa: celular partilhado não pode
  mostrar a figurinha de quem saiu. limparCromos() é chamada no mesmo signOut
  que limpa o cacheLocal (context/AuthContext.jsx).

  Nunca lança: cache é otimização, jamais dependência. Modo privado, quota
  cheia, IndexedDB desligado — tudo cai no mesmo sítio, que é "não há cache".

## src/lib/diagnostico.js

- (linha ~77, `const nav = navegacaoAberta;`) Rodada 28: as chamadas da TELA (não as do pré-aquecimento) seguem com ela para a telemetria.
- (linha ~83, `export function marcarDadosDaTela() {`) Chegaram dados PARA A TELA: contam para o "dados prontos" da navegação aberta
  (a última a chegar é a que manda). Velocidade 7B: só leituras pedidas pela
  própria tela — o pré-aquecimento e as escritas (impressão de anúncio, voto)
  entravam aqui, e o Ranking aparecia com "dados em 436 ms" que nem eram dele.
- (linha ~94, `if (nav.gestoEm == null && ultimoToque > nav.t0) nav.gestoEm = ultimoToque;`) VELOCIDADE 9 (23-set) — `msDados` era "a última leitura que chegou nesta
  rota", e ia sendo empurrada para a frente enquanto a pessoa MEXIA na tela.
  O relatório do build 28 trouxe "/figurinha dados 5260 ms" e não era espera
  nenhuma: a tela abriu em 1,1 s e os 4 s seguintes foram o dono a tocar em
  três fundos — cada toque manda um PATCH /api/me e uma releitura atrás. O
  número mandava consertar a coisa errada.

  A abertura acaba no primeiro toque DESTA navegação: daí para a frente o que
  chega é consequência do que a pessoa fez, não custo de abrir. Fica guardado
  à parte (`msDadosAposToque`) — é trabalho real, mas de outra natureza.
- (linha ~109, `const registo = nav.registo;`) Rodada 8A: dados que chegam DEPOIS da pintura também entram no registo já
  guardado. Antes ficava "dados —" e o doCache nunca podia ser verdade (o
  registo copiava o msDados no instante da pintura, quando ainda era null):
  "pintaram do cache: 0" em todos os relatórios.
- (linha ~123, `let jaHouveInicio = false;`) FLUIDEZ 2 (16-set) — a PRIMEIRA ida ao Início desta abertura.

  A Velocidade 8 protegia o `arranque.inicioMs` com uma janela de 10 s, para um
  regresso ao Início lá mais à frente não ser contado como arranque. Só que a
  janela apanhava o caso certo pelo motivo errado: quem abre o app em `/login`
  (ou em `/`, com redireccionamento) leva mais de 10 s a chegar ao Início — o
  tempo de escrever a senha conta — e o relatório vinha com "Início —", que é
  justamente o número que se queria.

  O que distingue o arranque de um regresso não é o relógio, é a ORDEM: o
  arranque é a primeira vez que se NAVEGA para o Início. Se essa primeira vez
  não chegou a pintar (a pessoa saiu antes), não se marca nada — melhor sem
  número do que com um número de outra coisa.
- (linha ~138, `let aoFecharTela = null;`) Rodada 28: quem quer saber quando uma tela FECHA (a telemetria anônima, lib/telemetria.js, que
  chega depois do arranque e se registra aqui). Fechar = começou outra navegação.
- (linha ~160, `export function marcarInstante(nome) {`) ─── Marcas finas da navegação (Rodada 8A, 15-set) ───────────────────────────
  O build 18 mandou "Ranking: pintura 1866 ms, dados 809, esperou []" — nenhum
  loader na frente e mesmo assim mais de um segundo e meio sem tela. Sem saber
  ONDE esse tempo caiu, qualquer conserto é palpite. Cada navegação guarda agora
  os instantes (ms desde a troca de rota):
    lista     — a tela commitou o conteúdo (quem chama: useLayoutEffect)
    listaNova — a resposta fresca substituiu o que veio do cache (idem)
    loaderSaiu — o último F de carregamento saiu
    dados     — (o msDados de sempre)
    imagem    — a 1ª imagem da tela terminou de carregar
    efeito    — o agendamento da pintura correu (efeito passivo do React)
    quadro1   — o 1º quadro (requestAnimationFrame) depois da troca
    quadroMaior / quadroMaiorEm — o quadro mais longo antes da pintura: se for
                grande, a thread principal ou o desenho travaram
  e o MAIOR intervalo entre instantes seguidos até a pintura vai para `esperou`
  (ex.: "dados→pintura 1057ms"), ao lado dos loaders.
- (linha ~186, `const QUADRO_LEVE_MS = 50; // > 50 ms: a rolagem já se sente aos solavancos`) ─── Medidor de travadas (VELOCIDADE 8, 16-set) ──────────────────────────────
  O Pedro, build 19: "quando atualizo ou reinstalo, a primeira vez trava muito
  até fluir; depois flui bem; mesmo assim às vezes engasga ao trocar de página".
  "Trava" não é medida: isto transforma-o em número. UM laço de
  requestAnimationFrame para o app inteiro (o de antes nascia e morria a cada
  navegação) conta os quadros que demoraram mais do que deviam e — o que
  interessa mesmo — diz em que FASE do app cada travada caiu. Sem a fase,
  "travou 900 ms" não aponta para nenhum conserto.

  O mesmo laço alimenta as marcas finas da navegação (quadro1/quadroMaior da
  Rodada 8A): é a mesma leitura, não vale a pena fazê-la duas vezes.
- (linha ~208, `let ultimoToque = -Infinity;`) Velocidade 9: só DEDO/tecla — `ultimoGesto` inclui `scroll`, e o app rola
  sozinho ao trocar de tela (subir ao topo). Para atribuir travadas à rolagem
  isso é o certo; para saber se a PESSOA já mexeu (ver marcarDadosDaTela) daria
  falso positivo em toda navegação.
- (linha ~216, `const QUADRO_IMPOSSIVEL_MS = 15000;`) RODADA 12A (16-set) — o app em segundo plano não é uma travada.

  O build 21 veio com "pior 96003 ms" no relatório. Não houve travada nenhuma: o
  Pedro trocou de app e o requestAnimationFrame PAROU, como o WebKit manda. O
  intervalo entre o último quadro antes de sair e o primeiro à volta é o tempo
  com o telefone noutra coisa — e entrava na conta como o pior engasgo de todos,
  afogando os números verdadeiros.

  Agora esse tempo é medido à parte, e nenhum intervalo que atravesse uma ida ao
  segundo plano conta como travada.
  Acima disto nenhum quadro é trabalho nosso: é o sistema a ter parado o app.
  O pior engasgo verdadeiro medido em campo foi 6,4 s (build 20, o cromo a
  compor); 15 s dá folga de sobra sem deixar passar uma suspensão.
- (linha ~254, `const tarefas = new Map(); // nome -> quantas vezes aberta (aninhamento)`) ─── Tarefa em curso (RODADA 12A) ────────────────────────────────────────────
  A fase diz QUANDO a travada caiu; isto diz o que estava a correr. No build 21
  ficou uma travada de 5,7 s aos 9,9 s do arranque marcada só como "arranque" —
  e "arranque" não aponta para conserto nenhum. Quem faz trabalho que pode
  segurar a thread abre uma tarefa e fecha-a no fim; o que estiver aberto no
  instante do quadro perdido fica anotado com ele.
- (linha ~309, `if (voltouEm > inicio || gap > QUADRO_IMPOSSIVEL_MS || (typeof document !== 'un…`) O intervalo atravessou uma ida ao segundo plano (ou ainda estamos lá): o
  relógio parou por decisão do sistema, não por trabalho nosso. Já foi contado
  em `segundoPlano` pelo ouvinte de visibilidade — aqui só não vira travada.

  O teto é a rede para quando o `visibilitychange` NÃO chega: o WKWebView
  suspenso com o ecrã bloqueado é um caso conhecido no Capacitor, e sem isto o
  "pior 96003 ms" do build 21 voltava por outra porta. Nenhum trabalho nosso
  segura a thread principal por mais de QUADRO_IMPOSSIVEL_MS — o pior medido
  em campo foi 6,4 s.
- (linha ~349, `const nav = navegacaoAberta;`) Marcas finas da navegação em curso (Rodada 8A), enquanto ela não pinta.
- (linha ~366, `const arranque = { compilacaoMs: null, reactMs: null, inicioMs: null, entrouPor…`) ─── Marcas do arranque (VELOCIDADE 8) ───────────────────────────────────────
  `compilacaoMs` é o performance.now() lido na PRIMEIRA linha do corpo do
  main.jsx. Por ser ESM, nessa altura todos os módulos importados já foram
  buscados, lidos e executados — ou seja, o número é HTML + download + parse +
  COMPILAÇÃO de tudo o que está no modulepreload. É o custo que o Pedro sente
  na primeira abertura depois de instalar/atualizar, quando o WebKit ainda não
  tem cache de bytecode nenhum.
  `entrouPor` (Fluidez 2): a rota em que o app abriu. Sem ela o `inicioMs` é
  ambíguo — 1200 ms a abrir direto no Início e 18000 ms a passar pelo login são
  números de coisas diferentes, e o relatório tem de dizer qual é qual.
- (linha ~466, `const loadersAtivos = new Map(); // motivo -> quantos`) Loaders de ecrã montados agora, por motivo. Sem isto, a medição de "primeira
  pintura" contava o instante em que o LOADER apareceu — que é rapidíssimo e não
  é o que a pessoa quer ver. Enquanto houver loader no ecrã, a tela real ainda
  não está lá, e o relógio continua a correr.

  O motivo (Velocidade 7B) diz QUEM segurou a pintura: 'codigo' (o chunk da tela
  a carregar), 'sessao' (AuthGuard à espera da sessão/perfil) ou 'tela' (a
  própria tela sem dados). Fica gravado em cada navegação.
- (linha ~486, `if (navegacaoAberta && navegacaoAberta.msPintura == null) {`) O ÚLTIMO a sair antes da pintura é o que conta (Rodada 8A).
- (linha ~520, `msDadosAposToque: nav.msDadosAposToque,`) Velocidade 9: leituras que a PESSOA provocou depois de a tela abrir
  (tocar num fundo, votar). Não é custo de abertura — ver marcarDadosDaTela.
- (linha ~523, `esperou: [...nav.esperou, ...(intervalo ? [intervalo] : [])],`) Que loaders a pintura esperou (vazio = nenhum) e, desde a Rodada 8A, o
  maior intervalo entre instantes seguidos até a pintura.
- (linha ~526, `marcas: nav.marcas,`) Rodada 8A: os instantes finos (ver marcarInstante). É o MESMO objeto das
  marcas da navegação: uma imagem que chega depois da pintura ainda entra.
- (linha ~529, `doCache: nav.msDados != null && nav.msPintura < nav.msDados,`) Pintou ANTES de os dados chegarem = veio do cache local. É exactamente o
  que a "Velocidade 3/4" foi buscar, e aqui vê-se se está a acontecer.
- (linha ~537, `if (arranque.inicioMs == null && nav.primeiraIdaAoInicio) {`) VELOCIDADE 8 — a 1ª tela a pintar é o sinal de partida do resto (ver
  aposPrimeiraPintura). E se essa tela for o Início, o instante fica no
  arranque: é o "c ms" do resumo.

  Fluidez 2: quem manda é a ORDEM, não o relógio (ver primeiraIdaAoInicio).
- (linha ~548, `let preaquecimento = null;`) Algo que devia ter aparecido e não apareceu (VELOCIDADE 5).

  Chamadas que falham já se veem pelo estado na lista de cima; isto é para o
  que morre em silêncio — o cromo do Início que fica no placeholder para
  sempre, por exemplo. Sem um registo destes, a única prova de que aconteceu é
  a pessoa dizer "ficou desfocado", e isso não diz PORQUÊ.

  `area` diz onde ('cromo'), `causa` diz o quê ('timeout-indexeddb',
  'blob-nulo', 'erro'), `detalhe` é a mensagem do erro quando há uma. Nunca
  leva dados do utilizador.
- (linha ~560, `let preaquecimento = null;`) ─── Velocidade 6B (15-set) ──────────────────────────────────────────────────
- (linha ~584, `const imagens = [];`) Imagens do proxy: quantas, quanto tempo, e quantas vieram do cache do browser.
  `transferSize === 0` numa entrada de performance significa exatamente isso —
  o pedido existiu, mas não gastou rede. É o número que diz se a Velocidade 6B
  está a funcionar no aparelho de verdade.
- (linha ~595, `const temTamanhos = entrada.transferSize > 0 || entrada.encodedBodySize > 0 ||…`) Velocidade 7B: o Safari (e qualquer navegador numa imagem de outra origem sem
  Timing-Allow-Origin — o caso do app nativo) devolve TODOS os tamanhos a 0, e
  "transferSize === 0" marcava 100% do cache. Sem tamanho nenhum visível, quem
  decide é a duração.
- (linha ~607, `let largura = null;`) ─── Largura da tela (Velocidade 7B) ─────────────────────────────────────────
  Para apanhar em campo o (b): se algo passar da largura da tela, o WebKit do
  iPhone alarga a viewport e encolhe a página inteira. Guarda a largura do
  aparelho, a maior viewport e a maior largura rolável vistas, e em que tela.
- (linha ~613, `const orientacao = { mudancas: 0, atual: null, jaEsteveDeitado: false };`) RODADA 12A — o telefone virado não é um transbordo.

  O build 21 trouxe "maior vista 932px" num aparelho de 430: era o iPhone
  deitado. Em paisagem os lados TROCAM, e a largura do aparelho passa a ser o
  lado maior da tela — comparar sempre com o lado menor transformava cada
  rotação num alarme, e um alarme que toca sozinho deixa de se ler.

  A orientação passa a ficar no relatório: sem ela, "932px em /feed" não se
  distingue de um card que rebentou a tela, que é o defeito que isto caça.
- (linha ~714, `const cromoFases = new Map(); // cenário -> { somaMs, piorFase, piorMs, fases[]…`) ─── Fases do cromo (FLUIDEZ 2, 16-set) ──────────────────────────────────────
  O build 20 mandou `/figurinha dados=8836 ms` e uma travada de 6402 ms na fase
  "outro" — a composição do cromo do Início. "O canvas é lento" não aponta para
  conserto nenhum: é preciso saber QUAL fase. Cada composição regista aqui o
  tempo de cada passo (decodificar o avatar, encher o fundo, os glints, a
  moldura, o texto, o toBlob) e a tela de Diagnóstico mostra a soma e a mais
  cara. Guarda-se a PIOR composição de cada cenário, não a última: a que dói é
  a primeira, com os caches todos frios.
- (linha ~752, `export function estadoDaCaixaPreta() {`) RODADA 28 — o estado cru da caixa-preta, para quem monta o relatório fora do arranque
  (lib/diagnosticoRelatorio.js). As listas e objetos são os PRÓPRIOS daqui: quem lê copia
  antes de guardar. Nada de sessão nem de dados de pessoa — só medições.
- (linha ~787, `if (typeof window !== 'undefined') window.__futtyDiagnostico = () => import('./…`) A bancada do iPhone simulado lê daqui (ver scripts/ver-iphone.mjs, cena
  `velocidade9`). Sem isto a prova antes/depois teria de raspar o texto da tela
  de Diagnóstico — frágil, e sem as marcas finas por navegação. Rodada 28: devolve
  uma PROMESSA (o montador do relatório chega sob demanda); o page.evaluate da
  bancada espera por ela sozinho.

## src/lib/diagnosticoRelatorio.js

- (linha ~1, `import { Capacitor } from '@capacitor/core';`) Futty v2.0 — O relatório da caixa-preta (Rodada 28).

  lib/diagnostico.js COLETA (chamadas, navegações, travadas...) e mora no arranque do app; este arquivo
  MONTA o que a tela de Diagnóstico mostra e o relatório envia. Separados porque montar só interessa a
  quem abre essa tela (o super-admin, pelo Gabinete) e à bancada do iPhone simulado — o resto das
  pessoas nunca precisou destes bytes antes da 1ª tela, e o arranque tem teto de 320 KiB.
- (linha ~49, `export function lerDiagnostico() {`) Tudo o que a tela de Diagnóstico mostra e o relatório envia.

  Velocidade 9: a bancada do iPhone simulado (scripts/ver-iphone.mjs) lê os MESMOS números pelo
  `window.__futtyDiagnostico` (lib/diagnostico.js), em vez de raspar texto da tela. Só leitura, só
  medições — nada de sessão nem de dados de pessoa que já não estivesse no relatório.
- (linha ~72, `imagens: imagens.length`) Velocidade 6B: "imagens: n, média ms, % do cache".
- (linha ~81, `largura: s.largura,`) Velocidade 7B + Rodada 12A: { aparelho, maiorViewport, maiorRolavel,
  maiorTransbordo, rota, orientacao, em }. O que conta é o maiorTransbordo
  (quanto passou da tela NA ORIENTAÇÃO da altura): acima de zero, alguma
  coisa rebentou a largura em campo.
- (linha ~86, `orientacao: { ...s.orientacao },`) Rodada 12A: quantas vezes o aparelho virou. Sem isto, uma largura de
  paisagem no relatório não se distingue de um card que rebentou a tela.
- (linha ~89, `travadas: {`) Velocidade 8 + Rodada 12A: quantos quadros passaram do tempo, em que
  fase do app e com que TAREFA a correr (ver tarefaEmCurso).
- (linha ~98, `segundoPlano: { ...s.segundoPlano },`) Rodada 12A: tempo com o app noutra coisa. NÃO entra nas travadas — o
  requestAnimationFrame para em segundo plano e o intervalo de volta
  aparecia como o pior engasgo de todos (96 s no build 21).
- (linha ~102, `arranque: { ...s.arranque },`) Velocidade 8: compilação = HTML + download + execução de tudo o que está
  no modulepreload; React = 1º commit da árvore; Início = 1ª pintura do /home.

## src/lib/enquadroAvatar.js

- (linha ~1, `export const ENQUADRO_FIGURINHA = 'top';`) Futty v2.0 — Rodada 29A (D): o enquadramento de um avatar numa moldura pequena, numa função só.

  A figurinha de IA leva a cabeça no topo da imagem, com folga: `objectPosition: 'top'` é o certo. A foto
  crua do card grátis (a pessoa como ela é, com o fundo dela) tem o rosto mais para o meio: com 'top' o corte
  come o rosto. Quem diz o que é cada coisa é o NOME do arquivo — a mesma regra do motor
  (backend/utils/figurinhaRegra.js): figurinha nossa mora no bucket `avatars` e leva `-ai-<kit>` no nome.
  No app a URL chega pelo proxy (`/api/media/<token>`), e o token é `base64url(JSON {b: bucket, p: caminho})`
  + assinatura: dá para LER o caminho sem chave nenhuma (a assinatura só serve para o servidor confiar).

  O recorte 2:3 do CARD (Rodada 28) já vai assado no arquivo do avatar (PUT /api/me/avatar/recorte); o zoom
  (−/+) do card só vive na tela da Figurinha. RODADA 29B (bloco 3, E): a MINIATURA tem recorte próprio —
  a janela quadrada {x, y, escala} que a pessoa escolhe no editor (components/EnquadroMiniatura.jsx), gravada em
  users.avatar_recorte. O motor a aplica em todas as miniaturas quadradas (`sq=1`) e a deixa na URL do proxy
  como `?rc=x,y,escala` — por isso aqui basta LER a URL: quem a recebe sabe se há recorte, de quem for o avatar.
- (linha ~59, `export const avatarQuadrado = (url) => tipoDoAvatar(url) !== 'foto' || temRecor…`) Pedir ao motor o quadrado (`sq=1`) corta SEMPRE a partir do topo — o que serve à figurinha e come o rosto da
  foto crua. Para a foto, o app pede o derivado inteiro (2:3) e o `enquadroAvatar` escolhe a janela. Com recorte
  escolhido (`?rc=`), o quadrado vem do motor JÁ na janela da pessoa — também para a foto crua (Rodada 29B, E).
- (linha ~66, `export const ESCALA_MAX_RECORTE = 3;`) ─── O recorte da miniatura (Rodada 29B, bloco 3, E) ──────────────────────────────────────────────────────────
  ATENÇÃO: `validarRecorte` e `janelaDoRecorte` são cópias de backend/utils/recorteAvatar.js — a ÚNICA definição da
  janela que o motor corta. Os dois lados são provados contra a MESMA tabela de casos (scripts/unidade/enquadro-recorte.test.mjs
  ↔ backend/tests/recorte-avatar.test.js): o que a pessoa vê ao arrastar a miniatura é o que o proxy entrega depois.
    x, y    o CENTRO da janela, em fração da imagem (0–1)
    escala  o zoom: 1 = a janela tem a largura da imagem (o maior quadrado que cabe); até ESCALA_MAX_RECORTE
- (linha ~104, `export const recorteDaMolduraUnica = (largura, altura) => recortePadrao(largura…`) Rodada 29H-B (item 55): o ENQUADRAMENTO ÚNICO. O quadrado tracejado dentro da moldura 2:3 do card (CropModal com `miniatura`) é
  o quadrado do TOPO, da largura do card — a mesma janela que o motor corta sem recorte para a figurinha. Gravá-lo em
  users.avatar_recorte (lib/miniatura.js) é o que faz a FOTO crua (que sem recorte o app mostrava em 50%/35%) seguir o que a
  pessoa viu no tracejado. `largura`/`altura` são as do arquivo que sai do recorte (2:3).

## src/lib/freguesiasDados.js

- (linha ~1, `import { Capacitor } from '@capacitor/core';`) Futty v2.0 — Rodada 29H (item 12): busca a lista de freguesias (public/dados/freguesias.json) UMA vez, só quando a pessoa
  escolhe uma cidade de Portugal e toca no campo "Bairro". Mesma regra do lib/cidadesDados.js: servida do SITE (no app nativo,
  de VITE_ASSETS_URL), nunca no bundle, e a URL montada aqui (importar utils/avatar.js daqui separaria aquele módulo num chunk
  próprio dentro do arranque). Falhou a rede? A promessa é descartada e o próximo foco tenta de novo; o campo continua
  aceitando texto livre.

## src/lib/googleAuth.js

- (linha ~1, `import { Capacitor } from '@capacitor/core';`) Futty v2.0 — Login com Google, partilhado entre LandingPage/Login/Register (14-set,
  Android). Web mantém o redirect direto de sempre; nativo abre o OAuth do Google numa
  Chrome Custom Tab (skipBrowserRedirect + Browser.open) porque um WebView não pode
  completar o login do Google (a Google recusa OAuth dentro de WebView desde 2021).
  O retorno chega pelo esquema com.futty.app://auth/callback, capturado globalmente
  por components/DeepLinkListener.jsx — não pelo chamador desta função.

  VELOCIDADE 8 (16-set): o cliente chega por obterSupabase(). Não é capricho —
  o DeepLinkListener está montado na RAIZ e importa daqui a constante
  CALLBACK_URL_NATIVO; com o `import { supabase }` estático, essa constante de
  40 caracteres arrastava os 200 KB do supabase-js para o modulepreload do
  arranque. Um import estático não se paga por símbolo, paga-se por módulo.

## src/lib/i18n-catalogo.js

- (linha ~86, `fr: {`) Francês (entrou 31-jul no lugar do pt-PT). LOTE 1 cuidado; restantes lotes a preencher.

## src/lib/i18n.js

- (linha ~12, `export const MOSTRAR_IDIOMA = false;`) Achado 7 (roteiro 10-set): trocar de idioma só muda o rótulo do seletor — nav,
  Início e Perfil continuam em pt-BR. Enquanto o i18n não estiver completo, o
  seletor fica escondido (o catálogo e a lógica ficam intactos, só a UI some).
- (linha ~17, `export const IDIOMAS = [`) As 6 línguas. `nome` = o idioma NA PRÓPRIA LÍNGUA (quem procura o seu idioma
  procura a palavra que conhece). Bandeira do Reino Unido para o inglês; Chéquia (cs).
  31-jul (ordem do dono): pt-PT REMOVIDO (o português do app é um só, BR);
  francês ENTRA. Preferências antigas 'pt-PT' caem sozinhas em pt-BR (idiomaGuardado
  só aceita ids desta lista e a deteção manda qualquer 'pt*' para pt-BR).
- (linha ~44, `if (l.startsWith('pt')) return 'pt-BR';`) qualquer português → BR (31-jul)

## src/lib/linkDoSite.js

- (linha ~1, `export const HOST_DO_SITE = 'futtyapp.com.br';`) Futty v2.0 — Rodada 29B (bloco 3, C): os links https do SITE que abrem no app (universal links / app links).

  Tocar em https://futtyapp.com.br/convite/<token> (ou no link curto /c/<código>, 29H)  no WhatsApp abre o app em vez do Safari/Chrome — se o app estiver instalado.
  O sistema decide isso lendo, no site, public/.well-known/apple-app-site-association (iOS) e assetlinks.json (Android), e o
  app declara o mesmo no entitlement `applinks:` (ios/App/App/App.entitlements) e no intent-filter do AndroidManifest.xml.
  Os QUATRO lugares têm de falar dos mesmos domínio e caminhos: scripts/unidade/link-do-site.test.mjs lê os arquivos e confere
  com estas duas constantes. Sem o app, o link abre o site como sempre.

  Chega ao app pelo evento nativo `appUrlOpen` (components/DeepLinkListener.jsx) com a URL inteira; aqui se decide se é uma que
  o app sabe abrir e qual caminho do roteador ela é. Só https, só o domínio do site, só os prefixos abaixo — qualquer outra coisa
  (outro domínio, outro caminho, `..`, esquema estranho) é null e o app não navega.
- (linha ~13, `` export const ORIGEM_DO_SITE = `https://${HOST_DO_SITE}`; ``) A origem dos links que a pessoa COPIA e manda para o grupo (convite, jogo, sorteio, campeonato) — Rodada 29I, achados 87 e 105.
  Sempre o site de verdade, nunca `window.location.origin`: no app nativo a origem é `capacitor://localhost` (iPhone) ou
  `https://localhost` (Android), e em teste é `http://localhost:5173` — links que só funcionam no aparelho de quem mandou.
  (Os de AUTENTICAÇÃO — Login, Register, ForgotPassword, LandingPage — usam a origem de onde a pessoa está, de propósito:
  o retorno do Google/e-mail tem de voltar para o lugar dela.)
- (linha ~19, `export const PREFIXOS_DE_LINK = ['/convite/', '/c/', '/time/', '/equipa/'];`) 29H: entrou o link curto do convite (/c/<código>) e saiu /jogo/ — o app não tem a rota /jogo/<id> (o jogo mora em
  /time/<slug>/jogo/<id>, já coberto por /time/), então um link /jogo/… abria o app numa página inexistente.
  29I (achado 103): o time passou de /equipa para /time (o link que a pessoa copia para o grupo). O antigo /equipa/ continua na lista:
  link já enviado no WhatsApp abre o app e a rota antiga redireciona para a nova (App.jsx). Android: o intent-filter novo (/time) só vale
  depois de um build novo do app; até lá o link /time abre no navegador, que funciona.

## src/lib/loja.js

- (linha ~1, `import { Capacitor } from '@capacitor/core';`) Futty v2.0 — A loja (Pagamentos P2, 26-set): o ÚNICO lugar do app que fala com o RevenueCat.

  O app compra pela App Store / Google Play através do SDK do RevenueCat
  (@revenuecat/purchases-capacitor). Quem credita é o MOTOR: o webhook do RevenueCat chega a
  POST /api/compras/webhook/revenuecat, e o "sincronizar" daqui só diz ao motor que transações
  procurar — ele confirma cada uma na API do RevenueCat antes de creditar (backend/docs/COMPRAS.md).

  Só existe no app nativo. Na web, e no nativo sem a chave pública do SDK no build
  (VITE_RC_APPLE_KEY / VITE_RC_GOOGLE_KEY), tudo aqui devolve `{ disponivel: false }` e as telas
  seguem no "Pedir ativação" — nunca quebra, nunca finge vender.

  Mora FORA do arranque (teto de 320 KiB): quem o carrega são as telas que vendem (Figurinha,
  Planos) através de lib/ligarLoja.js, que o liga ao PerfilContext — a conta que entra configura
  o SDK com o próprio users.id (é esse o app_user_id que o webhook procura); a que sai faz logOut,
  para compras de duas contas no mesmo celular nunca se misturarem.

## src/lib/miniatura.js

- (linha ~1, `import { apiFetch } from './api';`) Futty v2.0 — Rodada 29H-B (item 55, dono 2-out): o ENQUADRAMENTO ÚNICO. A pessoa enquadra a foto UMA vez, ao escolher ou trocar
  (CropModal com `miniatura`): a moldura 2:3 do card com um quadrado tracejado dourado dentro, marcando o que vira a foto da
  miniatura do Início, do ranking e do sorteio. Arrastar/aproximar ajusta os dois de uma vez. Depois de a foto subir, este módulo
  grava esse quadrado em users.avatar_recorte (migração 070, PUT /api/me/avatar/enquadro) — o motor passa a cortar TODAS as
  miniaturas desse arquivo exatamente nele (as dela e as que os outros veem). O editor da miniatura à parte ("Enquadrar", 29B) saiu.

  O quadrado é SEMPRE o do topo do 2:3, da largura do card (lib/enquadroAvatar.js#recorteDaMolduraUnica): é o mesmo que o motor
  corta sem recorte nenhum (`sq=1`) para a figurinha — gravá-lo explicitamente é o que faz a FOTO crua (que sem recorte o app
  mostrava em 50%/35%) seguir o que a pessoa viu no tracejado.

  Best-effort de propósito: sem a migração 070 o motor responde 503, sem rede falha — a foto já subiu, e a miniatura segue na regra
  de sempre até dar. Nunca lança; devolve o avatar_url novo (já com `?rc=`) ou null.

## src/lib/planos.js

- (linha ~49, `nome: 'Pacote do time',`) Item 65 (Rodada 29): o cartão chama "Pacote do time" — a seção em volta já se chama "Figurinhas do time" (não repetir o título).
- (linha ~93, `nome: 'Pacote do time',`) Item 65 (Rodada 29): o cartão chama "Pacote do time" — a seção em volta já se chama "Figurinhas do time" (não repetir o título).

## src/lib/preaquecerAbas.js

- (linha ~1, `import { esperarSeOcupado, quandoParado, respirar } from './ritmo';`) Futty v2.0 — Pré-aquecimento dos chunks das abas (VELOCIDADE 4).

  Cada tela vive no seu próprio chunk (lazy() em App.jsx) e, até 14-set, esse
  chunk só começava a ser lido no TOQUE: a pessoa tocava em "Resenha" e ficava
  a olhar para a tela antiga enquanto o ficheiro era buscado, lido e executado.
  Na web isso é uma ida à rede; no app é leitura de disco mais o custo de
  executar o módulo — menos, mas ainda o suficiente para o toque parecer morto.

  Aqui as quatro vizinhas do Início são carregadas quando o aparelho está
  PARADO, depois da primeira tela já estar desenhada.

  VELOCIDADE 8 (16-set) — "parado" era requestIdleCallback com setTimeout(1200)
  de reserva. O Safari não tem requestIdleCallback: no iPhone era sempre o
  setTimeout, e 1,2 s depois de abrir o app cinco chunks de JS chegavam ao
  mesmo tempo para serem COMPILADOS — em cima do primeiro toque da pessoa.
  Destes cinco, quatro são telas que ela talvez nem visite. É o mais caro dos
  trabalhos de segundo plano (compilar é trabalho de thread principal; uma
  imagem pelo menos descodifica-se de lado), por isso é o que mais tinha a
  ganhar em esperar. Agora quem decide é o lib/ritmo.js, e as abas entram UMA
  DE CADA VEZ, com um toque a mandar parar entre elas.

  As mesmas funções servem o lazy() em App.jsx — é de propósito. O registo de
  módulos do browser devolve sempre a MESMA promessa para o mesmo import(), por
  isso pré-aquecer e depois navegar não descarrega duas vezes, e pré-aquecer a
  meio de um lazy() em curso não atrapalha nada.
- (linha ~27, `import { esperarSeOcupado, quandoParado, respirar } from './ritmo';`) Velocidade 7B: cada função lembra o módulo depois de carregado
  (`jaCarregado()`). O React.lazy suspende na primeira renderização sempre que
  recebe uma promessa — mesmo já resolvida — e ainda segura o fallback ~300 ms;
  com o módulo em mãos, utils/lazyComRetry.js entrega-o sem suspender.
- (linha ~63, `const cancelar = quandoParado(async () => {`) Velocidade 9: com teto de 6 s. Os chunks das abas são o adiantamento mais
  barato que existe (o do Feed são 49 KB) e o mais rentável — sem eles, cada
  primeira ida a uma aba espera ~300 ms só pelo ficheiro, com a tela antiga à
  frente. Esperar por silêncio absoluto era esperar para sempre.

## src/lib/preaquecerDados.js

- (linha ~1, `import { apiFetch } from './api';`) Futty v2.0 — Pré-aquecimento (VELOCIDADE 6B, 15-set). IDEIA DO DONO:

    "o app abre leve e, em segundo plano, baixa o resto — dados e imagens de
     todas as abas — para que o primeiro toque em qualquer aba seja instantâneo."

  Corre UMA vez por abertura do app, depois de o Início já estar pintado, e só
  quando o aparelho está parado (requestIdleCallback). Os dados vão para as
  MESMAS chaves do cache local que cada tela lê — não há caminho especial nem
  formato paralelo: a tela nem sabe que isto existe, só encontra o cache cheio.
  As imagens vão para o cache HTTP do WebView através de `new Image()`, nos
  mesmos tamanhos que as telas pedem, para a tela depois nem ir à rede.

  Regras de boa educação:
    · um pedido de cada vez (nunca competir com o que a tela está a fazer);
    · nada disto acontece em ligação fraca ou com poupança de dados ligada;
    · qualquer falha é silenciosa — isto é adiantamento, nunca uma dependência.
- (linha ~23, `const IMAGENS_EM_PARALELO = 2;`) VELOCIDADE 8 (16-set) — 4 → 2. Quatro imagens ao mesmo tempo não é só banda:
  são quatro descodificações a disputar a thread com a tela que a pessoa está a
  tocar. Duas adiantam quase tanto e não se sentem.
- (linha ~27, `const MAX_IMAGENS = 12;`) Teto de imagens por aquecimento: um time grande tem 30+ avatares e não vale
  a pena descer todos — as primeiras são as que aparecem nas listas. 24 → 12 na
  Rodada 29B (conta pesada): a conta com a Resenha cheia de fotos disputava o
  aparelho com 24 downloads logo depois de abrir; as 12 primeiras são o que cabe
  em duas telas.
- (linha ~33, `const FRESCO_MS = 30000;`) Velocidade 7B: a mesma janela de frescor das telas (useApiComCache, Figurinha).
  Se a pessoa abriu a Figurinha antes de o aquecimento chegar aos selos, a tela
  já os buscou e gravou — pedir de novo por trás era o "selos em dobro".
- (linha ~45, `function ligacaoPermite() {`) VELOCIDADE 8 — O emRepouso() de antes usava requestIdleCallback e caía num
  setTimeout(1500) quando ele não existe. O Safari NÃO TEM requestIdleCallback:
  no iPhone era SEMPRE o setTimeout, ou seja, isto arrancava 1,5 s depois do
  Início — em cima do primeiro toque da pessoa. Agora quem decide é o
  lib/ritmo.js: 1ª pintura feita + 3 s sem toque nenhum (mais 5 s na primeira
  abertura de uma versão nova, que é a pior de todas).
- (linha ~149, `` const fimDaTarefa = tarefaEmCurso(`preaquecimento:${chave}`); ``) Rodada 12A: o passo fica anotado em qualquer travada que caia aqui. O
  caro não é esperar a rede, é o gravarCache logo abaixo (JSON.stringify
  de um payload grande é trabalho síncrono a valer) — e sem o nome do
  passo o relatório dizia só "pré-aquecimento".
- (linha ~199, `}, { aoAgendar: marcarPreaquecimentoAgendado, esperaMaximaMs: 9000 });`) Velocidade 9: teto de 9 s. O relatório do build 28 mostrou este trabalho
  "adiado (toques)" a sessão inteira — e a Figurinha, logo a seguir, a
  pagar 540 ms pelos selos que já estariam em casa. Os passos continuam a
  ceder a vez entre si (esperarSeOcupado), por isso correr não atropela.

## src/lib/preaquecerOnboarding.js

- (linha ~1, `import { urlAsset } from '../utils/avatar';`) Futty v2.0 — Rodada 29H (item 4): a página 1 do onboarding abria devagar (o dono viu duas vezes, a 2ª menos). O que ela
  espera é, na ordem: o chunk lazy do Onboarding (+ o CSS do mini sorteio), o /api/me do AuthGuard e as 8 figurinhas fictícias
  (WebP, ~24 KB, servidas do site). O cadastro e o login são o último lugar em que a pessoa passa antes dela, e ali ela
  gasta segundos digitando — por isso eles chamam isto ao montar: o chunk e as 8 imagens já vêm a caminho quando a pessoa
  toca em "Criar conta"/"Entrar". Em tempo ocioso, uma vez por carga da página, sem bloquear nada; falha em silêncio (é só
  um aquecimento: a página abre do mesmo jeito, só mais devagar). Módulo pequeno e sem React: só as telas lazy o importam.
  Quem vem de um convite (`convidado`) não vê o mini sorteio — a 1ª página dele são as boas-vindas do time: aquece o chunk delas
  em vez das 8 figurinhas.

## src/lib/regresso.js

- (linha ~1, `import { Capacitor } from '@capacitor/core';`) Futty v2.0 — "O app voltou para a frente" (VELOCIDADE 8, 16-set).

  O PEDRO, build 19: ficou horas com o app aberto e não viu um jogo novo. Não é
  um bug de dados — é que nada, em lado nenhum, dizia ao app que ele tinha
  voltado. O /api/inicio corria uma vez ao montar o InicioContext e mais nunca;
  com o app em segundo plano a tela continuava a mostrar a fotografia do
  momento em que foi deixada, por mais tempo que passasse.

  São DOIS sinais, não um, e é preciso ouvir os dois:
    visibilitychange — o do browser. Cobre a web e também o WebView quando o
      sistema o esconde.
    appStateChange (@capacitor/app) — o do app nativo. Há casos em que o iOS
      devolve a app ao primeiro plano sem que o WebView dispare
      visibilitychange (volta do seletor de apps, desbloqueio de tela).
  Os dois podem disparar quase ao mesmo tempo para o mesmo regresso, por isso há
  uma janela de silêncio: dois avisos a menos de 1 s são o mesmo regresso.

## src/lib/ritmo.js

- (linha ~1, `import { aoGesto, aposPrimeiraPintura, ultimoGestoEm } from './diagnostico';`) Futty v2.0 — O ritmo do trabalho em segundo plano (VELOCIDADE 8, 16-set).

  O PROBLEMA, medido: tudo o que o app faz "quando o aparelho estiver parado"
  usava requestIdleCallback. O Safari NÃO TEM requestIdleCallback — nem o do
  iPhone, nem o WebView do app da loja. Então caía sempre no setTimeout de
  reserva (1500 ms no pré-aquecimento de dados, 1200 ms no dos chunks das abas),
  que não é "parado": é "daqui a um bocado", olhe o aparelho para o que estiver
  a olhar. E daqui a um bocado é exactamente quando a pessoa está a tocar na
  tela pela primeira vez. Daí o "às vezes engasga".

  "Parado de verdade" aqui é uma coisa só: a 1ª tela já pintou E passaram N
  segundos sem um toque, uma rolagem ou uma tecla. Quem tem essa informação é o
  lib/diagnostico.js (é ele que marca a pintura e que já ouve os gestos para
  atribuir as travadas) — aqui só se lê.

  E há um caso especial: a PRIMEIRA abertura de uma versão nova. É a única em
  que o WebKit não tem cache de bytecode nenhum e tem de compilar tudo outra
  vez; é a abertura de que o Pedro se queixa. Nessa, tudo o que é adiantamento
  espera mais 5 s. A chave de versão é o nome do ficheiro de entrada, que leva
  o hash do conteúdo — muda sozinho a cada build, sem ninguém ter de se lembrar
  de bumpar nada.
- (linha ~131, `let vigiaLigada = false;`) ─── Animações param quando ninguém está a ver (VELOCIDADE 8) ────────────────
  O fundo aurora (4 blobs com filter: blur(161px), a cada um 40-60% da tela, a
  derivar e a rodar para sempre) está montado no Layout, ou seja em TODAS as
  rotas. É a maior conta de desenho contínua do app — e continuava a correr com
  o app em segundo plano ou com a tela bloqueada, a gastar bateria a desenhar
  para ninguém.

  O CSS não sabe o que é document.hidden, por isso marca-se o <html> e o
  index.css trata do resto (`html[data-oculto]`). Para as DECORATIVAS, não só
  o fundo: escondido é escondido, nada do que pare pode mudar de aspeto.

  EXCEÇÃO (hotfix 23-set, tela preta após login com Google no Chrome) — as
  animações de ENTRADA DE CONTEÚDO (`.page-transition` e as outras listadas em
  index.css) já saem de baixo da pausa geral por seletor: `html[data-oculto]`
  nem chega a tocar-lhes. Não há no app um sítio a depender de `animationend`
  para AVANÇAR ESTADO (isso continua verdade) — mas há sítios cuja
  VISIBILIDADE dependia de a animação correr até ao fim, e essa é a diferença
  que este hotfix trata.
- (linha ~151, `const SELETORES_ENTRADA_DE_CONTEUDO = '.page-transition, .inicio-reveal, .page-…`) As mesmas classes excluídas da pausa em index.css — mantidas aqui para a
  rede de segurança abaixo, não para decidir a pausa (isso é só CSS).
  .anim-slide-in e .futty-lockup-f entraram no hotfix "cards invisíveis" (23-set,
  mesma família da tela preta acima, caso que tinha ficado de fora).
- (linha ~167, `document.querySelectorAll(SELETORES_ENTRADA_DE_CONTEUDO).forEach((el) => {`) REDE DE SEGURANÇA (hotfix 23-set) — a exclusão em index.css já impede
  estas animações de nascerem pausadas; isto é o cinto por cima do fio: se
  por qualquer motivo uma ficou a meio (outra aba a pausar globalmente,
  uma corrida rara), `.finish()` salta-a para o fim (opacity 1, o que a
  animação tiver definido como estado final) assim que a página volta a
  ficar visível — em vez de confiar que ela retoma sozinha.

## src/lib/rotasAntigas.js

- (linha ~1, `export function caminhoNovoDeEquipa(pathname) {`) Futty v2.0 — Rodada 29I (achado 103): as rotas em português de Portugal viraram PT-BR (/equipa → /time, /criar-equipa → /criar-time,
  ?tab=equipa → ?tab=time), e as antigas continuam valendo: link que já foi para o grupo do WhatsApp, favorito, notificação já enviada.
  Puro (sem React), para testar no Node; App.jsx e AdminPanel.jsx usam estas contas.
- (linha ~16, `export const ABAS_DO_TIME = ['jogos', 'elenco', 'ajustes'];`) ─── Rodada 29I, bloco 3: "admin não é um lugar" ───────────────────────────────────────────────────────────────────────
  O painel /admin/<slug>?tab=… acabou: cada seção mudou para uma aba da página do time (/time/<slug>?aba=jogos|elenco|ajustes) ou
  para o Ranking. O endereço antigo continua valendo e leva para a casa nova da mesma seção.

## src/lib/rsvp.js

- (linha ~1, `export const MSG_FALHA_RSVP = 'Não deu para registrar sua resposta. Tente de no…`) Futty v2.0 — o pedido de presença (RSVP), a frase de quando ele falha e o jeito de responder com estado OTIMISTA. Vive aqui, e não no
  RSVPCard, porque o card "Confirme presença" e o "Vou / Não vou" do jogo no Início respondem pelo MESMO caminho (Rodada 29I,
  achado 86: um destino só, um número só). O miolo é puro de React, para testar no Node.
- (linha ~13, `export async function responderComOtimismo({ gameId, status, anterior, aplicar,…`) Responde presença com estado otimista (achado 86): `aplicar(status)` roda ANTES do pedido — o botão acende e o contador mexe na
  hora —, o pedido segue por trás, e se ele falhar `aplicar(anterior)` desfaz e o retorno traz a frase curta do erro. Se o jogo
  estava cheio e a pessoa entrou na fila (`espera`), o "Vou" não valeu: desfaz também e devolve a posição.
    anterior  a resposta de antes ('confirmado' | 'recusado' | null), para onde voltar
    aplicar   põe na tela uma resposta (o `setState` de quem chama)
    otimista  false = não mexe na tela antes (o jogo cheio, em que "Vou" é entrar na fila)
    enviar    o pedido (só o teste troca)
  @returns {Promise<{ ok: boolean, espera?: number, erro?: string }>}

## src/lib/sentryLigar.js

- (linha ~1, `import { captureException, init } from '@sentry/react';`) Futty v2.0 — A casca do Sentry (VELOCIDADE 8, 16-set).

  Existe por uma razão só, e é de empacotamento: `await import('@sentry/react')`
  devolve o NAMESPACE inteiro do módulo, e um namespace tem de estar completo —
  o bundler deixa de poder sacudir o que não se usa. Medido: o chunk passava de
  84 KB para 471 KB, quase 400 KB a mais dentro do pacote da loja (e a regra da
  casa é "app leve", ver AUDITORIA-TAMANHO.md).

  Com este módulo no meio, o import dinâmico aponta para CÁ e o @sentry/react
  entra por imports NOMEADOS — que se sacodem como sempre. O Sentry continua a
  chegar 3 s depois da 1ª pintura (lib/sentryTardio.js); só o transporte mudou.

## src/lib/sentryTardio.js

- (linha ~1, `import { Capacitor } from '@capacitor/core';`) Futty v2.0 — Sentry, mas depois (VELOCIDADE 8, 16-set).

  O Sentry.init() corria na 5ª linha do main.jsx, síncrono, e por isso os 84 KB
  do @sentry/react tinham de ser buscados, lidos e COMPILADOS antes de o React
  existir. Isso é caro exactamente quando dói: na 1ª abertura depois de
  instalar/atualizar, com o WebKit sem cache de bytecode nenhum.

  Um relatório de erro não tem pressa nenhuma — o que tem pressa é a tela. Aqui
  o módulo chega 3 s DEPOIS da 1ª pintura, e até lá nada se perde: dois
  ouvintes baratos (window.onerror e unhandledrejection) guardam o que
  acontecer numa fila, e a fila é despejada no Sentry assim que ele está de pé.

  No app da loja `tracesSampleRate` vai a 0: um trace é trabalho e rede que se
  gasta a medir, e o app nativo já tem o Diagnóstico próprio (lib/diagnostico.js)
  a medir melhor, de graça e sem sair do aparelho. Os ERROS continuam a ir —
  é para isso que o Sentry lá está.
- (linha ~20, `const ESPERA_MS = 3000;`) Depois da 1ª pintura ainda há trabalho por acabar (dados a chegar, imagens a
  decodificar). 3 s é o pedido do dono e é o mesmo espírito do resto da
  Velocidade 8: nada em segundo plano enquanto a tela ainda se está a compor.

## src/lib/sessao.js

- (linha ~1, `export async function sairDesteAparelho(obterSupabase) {`) Futty v2.0 — O que fazer quando a sessão dá problema (Rodada 28, bloco B). Usado pelo AuthContext;
  separado dele para o teste de unidade provar as regras sem React nem rede.

## src/lib/supabase.js

- (linha ~5, `const supabaseChave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.m…`) Rodada 28: a chave publishable nova (sb_publishable_…) manda; a anon antiga (JWT) só vale enquanto a
  nova não estiver no ambiente do build. As duas convivem até as antigas serem desligadas no painel.
- (linha ~15, `export const supabase = createClient(supabaseUrl, supabaseChave, {`) flowType 'pkce' explícito (Android, 14-set): o login Google nativo e os links de
  e-mail (recuperar senha) trocam um `code` por sessão à mão —
  components/DeepLinkListener.jsx chama exchangeCodeForSession(code) porque o
  WebView do Capacitor nunca navega para a URL de retorno (ela é entregue via
  appUrlOpen), então o detectSessionInUrl automático nunca dispara. Isso só
  funciona com PKCE (o link traz `code`, não o token direto).

## src/lib/supabaseAsync.js

- (linha ~1, `let promessa = null;`) Futty v2.0 — O cliente Supabase POR PEDIDO (VELOCIDADE 8, 16-set).

  ACHADO: o chunk de 201 KB que o index.html mandava pré-carregar com o nome
  "futtyMonograma" não tem nada de monograma — os dois caminhos do F são 700
  bytes. O chunk é o @supabase/supabase-js inteiro. O rolldown junta os módulos
  partilhados num chunk só e batiza-o pelo primeiro que lhe aparece; o nome
  mentia, e a leitura que se fazia dele ("os caminhos SVG do F pesam 201 KB")
  mandava consertar a coisa errada.

  201 KB é um TERÇO de tudo o que o arranque tinha de compilar — e compilar é
  exactamente o que dói na 1ª abertura depois de instalar/atualizar, quando o
  WebKit ainda não tem cache de bytecode. E não é preciso: a sessão que o app
  usa para desenhar a 1ª tela é lida do localStorage de forma SÍNCRONA
  (AuthContext, "sessão otimista" da Velocidade 5), sem tocar no supabase-js.

  Então o cliente passa a chegar por import dinâmico. Quem o pede primeiro é o
  próprio AuthProvider, no efeito de montagem — ou seja, o download começa no
  mesmo instante em que começaria antes; o que muda é que a 1ª pintura já não
  espera pela COMPILAÇÃO dele.

  A promessa é guardada: o registo de módulos do browser devolve sempre a mesma
  para o mesmo import(), e o createClient corre uma vez só (dois clientes na
  mesma página disputariam o refresh do token).

  Quem importa './supabase' DIRETO continua a poder fazê-lo: são telas em lazy
  (Login, Register, ForgotPassword, AlterarPassword, Figurinha), e o chunk delas
  já carrega fora do arranque. O que não pode voltar a acontecer é um import
  estático a partir da raiz (App.jsx e o que ele arrasta) — era isso que punha
  o supabase-js no modulepreload.

## src/lib/telemetria.js

- (linha ~1, `import { Capacitor } from '@capacitor/core';`) Futty v2.0 — Telemetria ANÔNIMA de velocidade (Rodada 28, bloco E).

  Substitui o botão de Diagnóstico para todo mundo: quando uma tela fecha (a pessoa foi para outra),
  o app manda — uma vez por tela por sessão — quanto ela levou para ficar útil (a pintura sem F de
  carregamento, a mesma régua do Diagnóstico) e quanto cada chamada ao motor custou nela.

  Anônima por construção:
    · sem Authorization, sem cookie: o motor não tem como saber de quem é;
    · telas e rotas seguem como PADRÃO (/time/:slug/ranking) — slug de time, id, token, e-mail e
      número nunca saem do aparelho (o motor normaliza de novo, com a mesma regra);
    · o aparelho vai como faixa genérica ("android-medio"), nunca modelo nem id.

  Chega depois da 1ª pintura (components/MedidorNavegacao.jsx) — o arranque tem teto de 320 KiB — e
  se liga à caixa-preta por registrarFechoDeTela.
- (linha ~29, `const ANTES_DO_SLUG = new Set(['teams', 'equipas', 'equipa', 'time', 'admin']);`) 'equipa' = o endereço antigo (29I: /equipa → /time)
- (linha ~105, `const CHAVE_ENVIADAS = 'futty_telemetria_telas';`) Uma vez por tela por SESSÃO — a aba do site ou a abertura do app. Guardada na sessionStorage para
  valer também depois de recarregar a página (a cena rodada28 viu o /home ir duas vezes); sem ela
  (modo privado), vale a memória desta abertura.

## src/lib/ultimoErro.js

- (linha ~1, `const CHAVE = 'futty_ultimo_erro';`) Futty v2.0 — Último erro fatal (ErrorBoundary), guardado para o Pedro ler
  depois em Perfil → Diagnóstico (build 10, achado real: o app não abria
  depois de um deploy e ninguém tinha o console do Chrome remoto no bolso
  para ver porquê). localStorage, não a caixa-preta em memória de
  lib/diagnostico.js: o crash costuma vir seguido de um reload (ver
  lazyComRetry.js), que apagaria qualquer coisa guardada só em memória.

## src/main.jsx

- (linha ~10, `marcarArranque(performance.now());`) VELOCIDADE 8 (16-set) — PRIMEIRA LINHA DO CORPO, de propósito. Em ESM os
  imports acima já foram buscados, lidos e EXECUTADOS quando esta linha corre,
  por isso este performance.now() é o custo inteiro de pôr o app de pé antes de
  uma única linha nossa: HTML + download + parse + compilação de tudo o que
  está no modulepreload do index.html. É o número que explica o "a primeira vez
  trava muito até fluir" — na 1ª abertura depois de instalar/atualizar o WebKit
  compila tudo sem cache de bytecode. Também é aqui que o medidor de travadas
  liga, para não perder nenhum quadro do arranque.
- (linha ~25, `prepararSentry();`) Error tracking (só em produção; DSN via VITE_SENTRY_DSN). VELOCIDADE 8: o
  módulo chega 3 s depois da 1ª pintura; até lá uma fila guarda os erros para
  não se perder nenhum (lib/sentryTardio.js).
- (linha ~30, `observarImagens();`) Velocidade 6B: passa a contar quantas imagens do proxy vieram do cache do
  aparelho — é o número que diz se o ganho é real no celular de verdade.
- (linha ~34, `pararAnimacoesForaDeVista();`) Velocidade 8: com o app fora de vista, nada se anima (o fundo aurora é a maior
  conta de desenho contínua do app e está em todas as rotas).
- (linha ~44, `if (ehNativo()) {`) Capgo (6-out) — atualização ao vivo das telas, sem passar pela loja (CAPGO.md). `notifyAppReady` avisa a camada
  nativa de que ESTE bundle abriu: sem o aviso (10 s por padrão) o Capgo acha que o app travou e desfaz a atualização.
  A doc manda chamar logo no arranque, antes de qualquer rede — por isso aqui, colado ao render, e não numa tela.
  Import dinâmico e só no nativo: o plugin não entra no peso do arranque e a web nunca o carrega. Falhar aqui só
  vai para o log; o app segue (o pior caso é o Capgo voltar ao bundle anterior, nunca o app ficar sem abrir).

## src/pages/AdminPanel.jsx

- (linha ~1, `import { useCallback, useEffect, useMemo, useRef, useState } from 'react';`) Futty v2.0 — O que o admin faz no time. Rodada 29I, bloco 3 (decisão do dono): ADMIN NÃO É UM LUGAR, é um conjunto de botões a mais
  nas telas que já existem. O painel /admin/<slug>, com 10 seções numa barra lateral que não conversava com o resto do app, acabou;
  nada dele se perdeu, mudou de casa:
    · Dashboard            → card "Seu time" no Início (pendências + Novo jogo · Sortear · Convidar · Ajustes)
    · Jogos + Resultados + Campeonato → aba JOGOS da página do time (JogosDoAdmin)
    · Membros + Convites   → aba ELENCO (ElencoDoAdmin; as ações de cada membro abrem com um toque no nome, sem o "⋯")
    · Time + Comunicação + Denúncias + Zona de perigo → aba AJUSTES (AjustesDoTime; a zona virou AÇÕES DEFINITIVAS e, na 29R, a única
      ação dela virou o cartão "Nova temporada de notas")
    · Estatísticas         → Ranking do time (EstatisticasDoTime), para o admin
  /admin/<slug>?tab=… (link antigo, favorito) continua valendo: leva à aba nova (lib/rotasAntigas.js#caminhoDoAdminAntigo).
  A página do time carrega este arquivo só para quem é admin (lazy): o jogador não paga por ele.
- (linha ~47, `const VIS_OPCOES = [`) Opções de visibilidade (a "cor de fundo do avatar" saiu — 29I, bloco 3, achado 102: o escudo é UM controle, EditorEscudo).
- (linha ~53, `const VIS_DESC = {`) 29H (item 45): os textos de entrada aprovados pelo dono (2-out), os mesmos do Criar time; 29P: "Radar de peladas" (era Explorar).
- (linha ~61, `function haQuantoTempo(iso) {`) "há 5 h": tempo decorrido, não data de calendário — não tem fuso (29I, achado 83); vale o relógio de quem olha.
- (linha ~77, `function RabichoDaHora({ fuso, cidade }) {`) O rabicho embaixo de um campo de hora (29I, bloco 3): "horário de São Paulo" só para quem está noutro relógio que o do time; vazio
  para quem está no mesmo (quase todo mundo). O rótulo do campo é sempre "Hora do jogo" ou "Hora" — nunca "fuso".
- (linha ~111, `function ConfirmModal({ texto, confirmarLabel = 'Confirmar', perigo = false, co…`) Pequeno modal de confirmação reutilizável. Os três modais desta página vão por
  PORTAL para o body (Rodada 8A): fixed dentro do [data-page] animado ancora na
  página, não na tela — ver a nota em LoadingFutty.jsx.
- (linha ~150, `function AvisarOTime({ slug, showToast }) {`) ─── AJUSTES → AVISAR O TIME ─────────────────────────────────────────────────
  29I, bloco 3 (dono): "Avisar o time" = push + anúncio na Resenha, num formulário só (eram dois cartões com dois títulos e duas
  mensagens). As duas saídas vêm ligadas; dá para mandar só uma. O push é o aviso que não se desliga no Perfil (é o admin falando).
- (linha ~365, `const [cidadeEscolha, setCidadeEscolha] = useState(null);`) Rodada 29B (D): escolha da lista (null enquanto digita), o último texto GUARDADO (só se manda a cidade quando mudou)
  e o que o motor disse da cidade depois de salvar ({ tipo: 'ok' | 'aviso', texto }).
- (linha ~370, `const [bairro, setBairro] = useState(team.bairro || '');`) 29H (item 12): o bairro (opcional). `bairroEscolha` = a freguesia da lista (Portugal) com a coordenada; null enquanto digita.
- (linha ~375, `const bairros = useBairrosDaCidade(cidade, cidadeEscolha);`) 29T (bloco B, achado 157): o bairro é de LISTA (IBGE no Brasil, freguesias em Portugal) — o campo só existe quando a cidade tem lista.
- (linha ~386, `const [mostrarArtilheiro, setMostrarArtilheiro] = useState(team.mostrar_gols !=…`) 29H (item 44): "Artilheiro do dia" / "Destaque do dia" — ligados, o editor de resultado oferece a seção.
  29I (achado 78): o artilheiro depende dos gols — com os gols desligados ele aparece desligado (um time antigo que ficou com a
  combinação incoerente é mostrado como o motor a trata: sem artilheiro).
- (linha ~391, `const [joga, setJoga] = useState(team.joga !== false);`) Rodada 29B (E): "Eu jogo" / "Só organizo o time"
- (linha ~394, `const [removendoLogo, setRemovendoLogo] = useState(false);`) Achado 118 (29J): sem isto não havia volta — quem subisse um logo errado ficava preso, e o
  editor de escudo (864 combinações) ficava inalcançável em qualquer time com logo.
- (linha ~400, `const [porTime, setPorTime] = useState(team.jogadores_por_time || 5);`) Item 68 (Rodada 29): jogadores por time é UM padrão do time — o "Novo jogo" já vem com ele. Grava sozinho, um instante depois do
  último toque no seletor (sem um pedido por toque); sem a migração 079 o motor diz "ainda não está disponível" e o número volta.
- (linha ~439, `async function removerLogo() {`) Achado 118 (29J): remove o logo — o escudo do time (EditorEscudo) volta a aparecer.
- (linha ~456, `async function guardarModo(novoModo, sobreNovo = null) {`) Modo de visibilidade (guarda logo ao selecionar; reverte em erro).
  29T (achado 157): tornar o time aberto ao público sem "Sobre o time" pede o texto ANTES de salvar (a pergunta abaixo); com ele, o texto vai junto
  no mesmo pedido, então um time público nunca fica sem apresentação no motor.
- (linha ~480, `async function guardarJoga(novo) {`) Meu papel (Rodada 29B, E): guarda logo ao tocar, como a visibilidade; reverte em erro (o motor diz o porquê).
- (linha ~497, `async function guardarMostrarGols(v) {`) "Gols de cada um" (29O): desligar leva o artilheiro junto, no mesmo pedido (o motor recusa "gols desligados, artilheiro ligado").
  Religar os gols NÃO religa o artilheiro: quem decide é a pessoa.
- (linha ~548, `if (faltaSobre({ modo, sobre: descricao })) {`) 29T (achado 157): time aberto ao público se apresenta — sem o "Sobre o time" não salva.
- (linha ~555, `const corpo = { nome: nome.trim(), localizacao: localizacao.trim(), descricao:…`) Rodada 29B (D): a cidade só vai no corpo quando MUDOU (antes ia a cada "Salvar" e geocodificava de novo).
  Da lista: o pacote todo (o motor usa a coordenada da lista); digitada: só o texto; vazia: sai da busca.
- (linha ~560, `const textoDoBairro = bairro.trim();`) 29H (item 12), 29T (achado 157): o bairro vai quando mudou, e SÓ o da lista (leva a coordenada). Apagado, sai ('' — também quando a CIDADE
  mudou: o bairro é da cidade antiga e o campo foi limpo). Texto que ninguém escolheu não vai; o bairro antigo escrito à mão fica como está.
- (linha ~596, `<p className="texto-apoio" data-texto-admin-posicao style={{ marginTop: 0 }}>{T…`) Item 69 (Rodada 29): "admin" e "posição em campo" são coisas separadas.
- (linha ~623, `{bairros.estado === 'lista' ? (`) 29H (item 12), 29T (achado 157): o bairro, opcional, é de LISTA — os do IBGE no Brasil, as freguesias em Portugal — e põe o time no ponto do
            bairro (e não no centro da cidade). Cidade sem bairros na lista: o campo não aparece; o bairro antigo escrito à mão fica salvo até alguém editar.
- (linha ~643, `<label style={{ display: 'grid', gap: 6 }}>`) 29T (achado 157): era "Descrição". É o que o time diz de si no Radar de peladas; obrigatório no time aberto ao público.
- (linha ~682, `{previewLogo || logoUrl ? (`) ESCUDO DO TIME (29I, bloco 3): só para o time sem logo — com logo, é o logo que aparece.
- (linha ~724, `<Interruptor ligado={mostrarGols} aoTrocar={guardarMostrarGols} rotulo={GOLS.ti…`) GOLS (29O): os mesmos títulos e frases do passo 2 do Criar time (golsEPremios.js).
- (linha ~727, `<div style={{ display: 'grid', gap: 8 }}>`) PRÊMIOS DO DIA (29O): o editor de resultado só oferece o artilheiro / o destaque quando ligados.
- (linha ~839, `const [abertoId, setAbertoId] = useState(null);`) o membro cujo painel está aberto (29I, bloco 3: um toque no nome)
- (linha ~918, `async function setGoleiro(m, ligado) {`) Liga/desliga o goleiro de um membro (optimista) via endpoint dedicado.
  Rodada 10B: `goleiro` é o campo único (grava categoria) — este botão e o
  chip do próprio jogador (Equipa.jsx) nunca mais podem discordar.
- (linha ~991, `{aberto`) O painel do membro (folha de baixo): tudo o que o admin faz com ele, num toque. Portal para o body (15-set): fixed dentro do
            [data-page] animado não confia no viewport no WebKit do iPhone (ver LoadingFutty.jsx).
            Achado 124 (29K): overflow hidden + overscroll-behavior contain no véu (sem isso, um arrasto nele encadeia para o body por
            trás, no WebKit — ao fechar a folha, o body fica rolado numa posição que não bate com o conteúdo, "dois terços no topo em
            preto"); o mesmo contain na folha, que já rola por si (overflowY: auto).
- (linha ~1009, `<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>`) Rodada 9/10B: goleiro ou linha, mais nada — o MESMO campo do card do próprio jogador.
- (linha ~1102, `function linkDe(token, codigo) {`) 29H (item 7): o link curto (/c/<código>) quando o motor deu um código; senão o longo.
- (linha ~1197, `const fmtPrazoAdmin = (iso, fuso, cidade) => formatarDataHora(iso, fuso, { cida…`) ─── TAB: JOGOS ──────────────────────────────────────────────────────────────
  "sex., 20 de jun. · 22:00" para o prazo do RSVP — no relógio do campo (fuso do time, 29I achado 83).
  29T (achado 165): com o rabicho, a cidade do time ("horário de Brasília"), não a do fuso.
- (linha ~1222, `function RSVPAdmin({ gameId, slug, cidade = null, navigate, showToast, abrirIni…`) Gestão do RSVP de um jogo (admin): abrir / acompanhar / fechar / sortear.
  Rodada 29R (achado 147): `abrirInicial` = a pessoa chegou pela linha "presença ainda não aberta" do Início; o "Abrir presença" deste jogo
  já nasce aberto e, quando o cartão tem a forma final (a presença carregou), `aoPronto` rola até ele e o destaca. Só vale no nascimento.
- (linha ~1258, `useEffect(() => {`) 29R: com a presença carregada (ou o erro dela na tela) o cartão não muda mais de altura; é a hora de rolar até ele. Uma vez só.
- (linha ~1468, `const [destaque, setDestaque] = useState(null);`) 29R: o jogo que a linha do Início apontou, em destaque por um instante
- (linha ~1470, `useEffect(() => {`) Rodada 29R (achado 147): o parâmetro vale UMA vez. Com a lista na tela (o RSVPAdmin do jogo certo acabou de nascer lendo-o), sai do
  endereço — achado ou não (jogo cancelado, já passado ou de outro time): voltar e recarregar não reabrem nada.
- (linha ~1566, `{g.confirmados === 0 ? (`) Rodada 29L (achado 139, decisão do dono de 3-out): "Excluir" só existe DEPOIS de cancelar. Cancelar avisa o time e
                          é o primeiro passo; excluir apaga. Antes, os dois ficavam lado a lado, em vermelho, num dedo grosso. O motor só
                          apaga jogo futuro SEM confirmados (409 "Cancele-o em vez de excluí-lo" nos outros); por isso o botão só aparece
                          quando o motor aceita, em vez de oferecer o que ele vai recusar.
- (linha ~1680, `const campos = camposNoCampo(jogo.data, fuso);`) Data e hora do formulário são as do CAMPO (fuso do time, 29I achado 83): é o que o motor lê ao salvar. Antes vinham do relógio
  do aparelho — o admin em Lisboa via, e salvava, a hora de Lisboa.
- (linha ~1761, `const topPresenca = [...membros].sort((a, b) => (b.presencas || 0) - (a.presenc…`) 29I (achado 104): "Presença" é presença — os jogos em que a pessoa ESTEVE, ordenado por isso (antes listava vitórias).
- (linha ~1883, `function NotificacoesDoAdmin({ showToast }) {`) ─── AJUSTES → NOTIFICAÇÕES DO ADMIN ─────────────────────────────────────────
  29I, bloco 3: o admin recebe push quando chega pedido de entrada (o dono pediu) e pode desligar aqui. As outras ficam em Perfil →
  Notificações (é a mesma escolha, guardada na conta).
- (linha ~1916, `function PedirVotarDeNovo({ slug, showToast }) {`) ─── AJUSTES → NOVA TEMPORADA DE NOTAS ──────────────────────────────────────────
  Rodada 29R (achado 150, dono): era "Pedir para votar de novo", em vermelho dentro de "Ações definitivas" — parecia "excluir a conta".
  Agora é "Nova temporada de notas": cartão próprio, botão dourado da casa. O perigo (zera as notas, sem volta) fica dito só na
  confirmação, que segue vermelha. O motor não mudou: POST pedir-revotacao com zerar: true. (O nome do componente e o data-attribute
  ficaram os de antes: as provas apontam para eles.)
- (linha ~1956, `export function JogosDoAdmin({ slug, team, showToast, navigate, abrirPresencaDe…`) ─── As abas da página do time (Rodada 29I, bloco 3) ─────────────────────────
- (linha ~1968, `<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>`) Rodada 29L (achado 140): o par era 50%/50% e "Criar jogos recorrentes" quebrava em duas linhas ao lado de "Criar campeonato" em uma.
            Agora cada botão tem a largura do próprio texto (e divide a sobra), nunca parte o rótulo; se a tela for estreita demais para os
            dois, o segundo desce inteiro para a linha de baixo.
- (linha ~1997, `<MetricCard valor={stats ? stats.total_jogos ?? 0 : '–'} label={plural(stats?.t…`) Rodada 29L (achado 136): o rótulo concorda com o número ("1 jogo", "1 membro") e a média sem casa decimal quando é inteira ("0", não "0.0").
- (linha ~2000, `<MetricCard valor={stats ? formatarMedia(stats.media_confirmacoes ?? 0) : '–'}…`) Achado 101: é a média de CONFIRMADOS por jogo (stats.media_confirmacoes), não de gols.
- (linha ~2040, `<Secao titulo="Notas do time">`) 29R: cartão próprio. "Ações definitivas" só tinha esta ação; sem ela a seção ficaria vazia e saiu.

## src/pages/AlterarPassword.jsx

- (linha ~17, `fontSize: 16,`) abaixo de 16 o iPhone dá zoom ao focar (Rodada 8A, ver index.css)

## src/pages/Campeonato.jsx

- (linha ~1, `import { useEffect, useState } from 'react';`) Futty v2.0 — Campeonato (Vaga 11B): hub (lista + criar) e detalhe (tabela/
  bracket + lançar resultado + celebração). Modelo N times, Storage no backend.
  A cerimónia do sorteio é REUTILIZADA para montar os times.
- (linha ~19, `const AJUDA_DOS_TIMES = 'Toque em um jogador para colocá-lo no time selecionado…`) O texto de ajuda do ComporTimes é de quem o usa (29S): o Campeonato mantém o de sempre.
- (linha ~94, `const [atrib, setAtrib] = useState([]);`) Vaga 11C — plantel por time (chaves)
- (linha ~186, `<div className="section-title" data-convidado-titulo>{CONVIDADO_TITULO}</div>`) 29Q: os textos vêm de utils/convidadoSemApp.js, os mesmos do Jogo e do Novo jogo (aqui não há ranking, a linha é a do campeonato).

## src/pages/CampeonatoPublico.jsx

- (linha ~1, `import { useEffect, useState } from 'react';`) Futty v2.0 — Vista pública do campeonato (Vaga 11B): o link partilhável.
  Sem login. Marca FUTTY + tabela/bracket + campeão celebrado + CTA de registo.

## src/pages/Convite.jsx

- (linha ~1, `import { useEffect, useState } from 'react';`) Futty v2.0 — Página de convite: aceitar entrada numa equipa.
  Rodada 29B (A): refeita inteira. Centrada, sem cartão; marca atual no alto (F dourado + FUTTY espaçado, o lockup do
  e-mail); o logo do time grande no centro; nome em destaque; três fatos; UM botão. O desenho vive em convite.css.
  Rodada 29H (itens 1 e 7): o link é o longo (/convite/<uuid>) ou o curto (/c/<código>) — a mesma tela; quem chega sem conta (ou
  com conta que ainda não terminou o onboarding) deixa o bilhete do convite no aparelho e segue para o cadastro / o onboarding,
  que ABRE nas boas-vindas do time; time sem logo = só o nome em destaque, sem quadrado de iniciais.
- (linha ~42, `function Escudo({ team, vazio = false }) {`) O escudo do time: o logo. Sem logo não há escudo (29H, item 23: nada de quadrado com iniciais — o nome em destaque basta). `vazio` = esqueleto enquanto o convite carrega.
- (linha ~89, `useEffect(() => {`) O bilhete do convite (29H, item 1): sem conta, ou com conta que ainda não terminou o onboarding, o convite fica guardado
  no aparelho DESDE QUE a página abre — o cadastro por e-mail, o Google e a Apple levam a pessoa para fora (e o OAuth perde o
  `state` do roteador), mas o bilhete sobrevive. O Onboarding o lê e começa nas boas-vindas do time; ao final, aceita o convite.
  Para quem já tem conta pronta não há bilhete: "Entrar no time" resolve aqui mesmo.
- (linha ~119, `` navigate(`/time/${team.slug}`, { replace: true, state: jaMembro ? undefined : {… ``) `primeiraEntrada`: a página do time abre as boas-vindas (Rodada 29B, C) — só para quem acabou de entrar.

## src/pages/CriarEquipa.jsx

- (linha ~1, `import { useCallback, useEffect, useRef, useState } from 'react';`) Futty v2.0 — Criar time: o WIZARD do admin (3 passos de escolha + a tela de convites que vem depois de criar, SPEC-EQUIPAS v2).
  A página antiga (formulário único com selector de cor) morreu: a cor é fallback
  automático interno (o backend cai para 'verde'; muda-se nas definições do admin).
  Passos: (1) nome + cidade — a cidade sempre exigida (29P): da lista, ou texto livre quando a lista não sugere nada — + escudo-iniciais ao vivo ·
  (2) "Você também joga?" e "O que contar nos jogos?" (gols, artilheiro e destaque do dia — tudo nasce desligado, 29O) ·
  (3) política de entrada → POST /api/teams (+ PATCH modo_visibilidade) · depois de criar, a FESTA (29P): a máquina das boas-vindas
  com o nome do time como letreiro, "Seu time está no ar!" e o link do convite. Não é um passo da criação: o contador é 3/3 e ela
  diz "Pronto" (29I, achado 79). "Ir para o time" não reabre boas-vindas: a pessoa já comemorou aqui.

  29I (achado 80): cada passo é UMA entrada do histórico (location.state.passo) — o Voltar do sistema (Alt+seta, o gesto do Android, o
  swipe do iPhone) recua um passo por vez, igual ao "← voltar" da tela, em vez de jogar no Início e apagar tudo. Antes do passo 1
  há uma entrada-guarda: o Voltar a partir do passo 1 pergunta "Sair da criação?" antes de sair. Depois de criado, o Voltar sai direto
  (o time já existe: voltar a um passo e criar de novo faria um time repetido).
  29H: o texto do papel acompanha a opção (43); textos de entrada aprovados pelo dono (45); o aviso do "só organizo" que
  ficava num toast de 2 s ilegível (46) virou texto fixo na tela do passo 4; bairro opcional (42); a frase do WhatsApp (47)
  e o link curto /c/<código> (49).
  29Q: o link do convite chega PRONTO na festa (gerado sozinho assim que o time existe); o botão "Gerar link do convite" só volta, como
  reserva, se a geração falhar.
  29T-B (achado 157): o bairro é de LISTA (IBGE no Brasil, freguesias em Portugal) e o campo só aparece quando a cidade tem lista; no passo 3, "Aberto" e
  "Só com a sua aprovação" pedem o "Sobre o time" (sem ele o time não é criado), que o Radar de peladas mostra no card do time.
- (linha ~59, `padding: '13px 20px', cursor: rest.disabled ? 'not-allowed' : 'pointer', width:…`) Apagado não é clicável e não pode parecer: cursor not-allowed (o mesmo do "Publicar" da Resenha) — achado 82.
- (linha ~73, `function Lbl({ children, grande = false }) {`) `grande`: a régua do passo 1 (29P), onde o nome do time é a estrela da tela.
- (linha ~78, `function Falta({ children }) {`) O que falta para seguir: uma linha curta abaixo do botão apagado (achado 82). Texto pela VOZ: diz o que fazer, sem cerimônia.
- (linha ~96, `const [cidadeEscolha, setCidadeEscolha] = useState(null);`) Rodada 29B (D): a escolha da lista ({ cidade, uf, pais, lat, lng, origem: 'lista' }) — null enquanto a pessoa digita.
- (linha ~98, `const [temSugestoes, setTemSugestoes] = useState(false);`) 29P: a cidade é obrigatória. Da lista vale sempre; texto livre só quando a lista não tem sugestão para ele (quem está fora do
  Brasil e de Portugal nunca trava). `temSugestoes` vem do próprio campo.
- (linha ~104, `const [bairro, setBairro] = useState('');`) 29H (item 12): o bairro opcional. 29T (bloco B): de LISTA, no Brasil (IBGE) e em Portugal (freguesias) — o campo só existe quando a cidade tem
  lista, e só vale o que a pessoa escolhe. `bairroEscolha` é o bairro da lista, com a coordenada; null enquanto digita.
- (linha ~109, `const [sobre, setSobre] = useState('');`) 29T (achado 157): o "Sobre o time" é pedido no passo 3 quando o time é aberto ao público (aberto ou com aprovação); "Fechado" não pede.
- (linha ~113, `const [mostrarGols, setMostrarGols] = useState(false);`) Tudo nasce desligado (29O): a pessoa liga o que quiser.
- (linha ~118, `const [joga, setJoga] = useState(true);`) Rodada 29B (E): "Eu jogo" (padrão) / "Só organizo o time"
- (linha ~127, `const [conviteFalhou, setConviteFalhou] = useState(false);`) 29Q: a geração sozinha falhou — só então o botão de reserva aparece
- (linha ~143, `const passoDoEndereco = Number(location.state?.passo) || 1;`) ── Os passos no histórico (achado 80) ───────────────────────────────────────────────────────────────────────────────────────────
  `passo` não é um useState: vem da entrada do histórico em que a pessoa está (location.state.passo). Time criado = tela de convites
  (4), sempre. Passo 2 ou 3 sem nome (a entrada sobreviveu a um recarregar, o formulário não) volta ao 1.
- (linha ~226, `if (modo !== 'privado' && !cidade.trim()) {`) Cidade é obrigatória em times públicos (14-set): é como jogadores perto
  encontram o time no Explorar/distância. No privado fica opcional. Manda
  de volta ao passo 1 (onde fica o campo) com um toast claro.
- (linha ~234, `if (faltaSobre({ modo, sobre })) {`) Defesa (o botão já fica apagado): o time aberto ao público se apresenta (29T, achado 157).
- (linha ~246, `if (cidade.trim() && bairros.estado === 'lista' && bairroEscolha && bairroEscol…`) O bairro só existe dentro de uma cidade e só vale o da LISTA (29T): leva a coordenada da lista; texto que ninguém escolheu não vai.
- (linha ~248, `if (sobre.trim()) bodyCriar.descricao = sobre.trim().slice(0, MAX_SOBRE_O_TIME);`) O "Sobre o time" (29T): obrigatório no time aberto ao público; no fechado vai se a pessoa escreveu.
- (linha ~251, `if (!mostrarGols) bodyCriar.mostrar_gols = false;`) 29I (achado 78): os gols vão no próprio POST (antes iam num PATCH logo depois) e o artilheiro nunca vai ligado com os gols
  desligados — o app apaga um quando o outro é desligado, e o motor recusa a combinação incoerente.
- (linha ~257, `const sobreCidade = avisoDaCidade(geo, cidade.trim());`) 29P: a cidade achada vira informação do time na festa (só "Brasília, DF", sem "Encontramos:"); o aviso fica só quando deu errado.
- (linha ~296, `pedirConvite(t.slug).catch((e) => {`) 29Q: o link do convite chega PRONTO. Gerado aqui, uma vez só: o passo 4 nasce com o time e não há outro caminho até ele (o time
  criado trava o histórico, então voltar não repete a chamada). Sem await: a festa abre na hora e o link entra quando chegar.
- (linha ~309, `async function pedirConvite(slug) {`) 29Q: a chamada do convite é uma só — a da geração sozinha (logo que o time existe) e a do botão de reserva.
- (linha ~335, `const cidadeOk = cidadePreenchida({ texto: cidade, escolha: cidadeEscolha, temS…`) 29P: o Continuar do passo 1 só existe com nome E cidade. A cidade conta da lista, ou como texto quando a lista não sugere nada.
- (linha ~338, `const faltaCidade = modo !== 'privado' && !cidade.trim();`) Defesa (não deve mais aparecer, 29P): time aberto sem cidade — o motor não deixa criar (é como se acha o time no "Radar de peladas").
- (linha ~348, `<div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0 20p…`) barra de progresso: 3 passos de escolha (3/3 é o último — tem o botão CRIAR O TIME). A tela de convites, depois de criar,
              não é um passo: a barra fica cheia e o rótulo diz "Pronto" (achado 79: dizia 3/4 sem existir um 4º).
- (linha ~359, `<h1 style={SO_LEITOR}>Passo 1 de 3</h1>`) 29P: sem título nem subtítulo; a tela começa no nome (a estrela), em letra maior. O escudo das iniciais fica — é a parte
                  divertida — sem o texto que o explicava. Rótulos limpos, sem marca de campo exigido: sem nome e cidade o Continuar fica apagado (29T).
- (linha ~366, `{bairros.estado === 'lista' ? (`) 29H (item 12), 29T (achado 157): o bairro, opcional, é de LISTA — os do IBGE no Brasil, as freguesias em Portugal. Cidade sem bairros
                  na lista (ou ainda sem cidade): o campo nem aparece, e o time mostra só a cidade.
- (linha ~399, `<div style={{ marginTop: 24 }}>`) 29T (achado 166): o Continuar está aí desde o começo, apagado, e acende com nome e cidade — a pessoa vê que existe um próximo passo.
- (linha ~441, `{ k: 'privado', t: 'Fechado', d: 'Só entra quem receber o seu link de convite.'…`) 29H (item 45): textos aprovados pelo dono (2-out); 29P: o Explorar virou "Radar de peladas" (em frase, entre aspas).
- (linha ~451, `{precisaDeSobre(modo) ? (`) 29T (achado 157): quem acha o time no "Radar de peladas" só tem isto para decidir. Aberto ou com aprovação pedem; Fechado não.
- (linha ~481, `<div className="bv bv--festa" data-festa aria-labelledby="festa-nome">`) 29P: a FESTA. A máquina das boas-vindas (deitada sem logo, quadrada com logo) com o nome do time como letreiro, na hora em
                  que o time nasce. Embaixo do nome, a cidade (e o bairro) como informação do time. Sem som; prefers-reduced-motion para tudo.
- (linha ~531, `` <Cta cheio onClick={() => navigate(`/time/${team.slug}`)}>Ir para o time</Cta> ``) 29P: sem state nenhum — a comemoração já aconteceu aqui; a página do time abre direto.
- (linha ~539, `{perguntaSair`) Achado 80: o Voltar do sistema a partir do passo 1 pergunta antes de jogar fora o que foi preenchido. Portal para o body (overlay
            fixo nunca dentro do [data-page], ver LoadingFutty.jsx).

## src/pages/Diagnostico.jsx

- (linha ~1, `import { useState } from 'react';`) Futty v2.0 — Diagnóstico: o que o app mediu de si próprio (VELOCIDADE 4).

  Existe para trocar "está lento" por números, e sobretudo para separar as duas
  coisas que toda gente confunde:

    MOTOR — quanto o servidor levou a responder (header Server-Timing, que o
            backend põe em todo pedido). Se for alto, o problema é nosso, no
            código do servidor.
    REDE  — o que sobra. É a distância a cobrar: de Lisboa a São Paulo são
            ~250 ms de ida e volta, e nenhum código nosso encurta isso.

  RODADA 28 — só o super-admin chega aqui (App.jsx: SuperAdminGuard), pelo
  Gabinete. Para toda gente, quem traz o número do aparelho agora é a telemetria
  anônima de velocidade (lib/telemetria.js → Gabinete, aba Velocidade), sem botão.
- (linha ~53, `const NOMES_MARCAS = [`) Rodada 8A: os instantes finos de uma tela, numa linha só
  ("lista 12 · 1º quadro 30 · maior quadro 1800@40 · imagem 850").
- (linha ~70, `function linhaDeTravadas(t) {`) Velocidade 8 — "travadas >100 ms: n (pior x ms, fase y)".
- (linha ~84, `function linhaDeArranque(a) {`) Velocidade 8 — "arranque: compilação a ms, React b ms, Início c ms".
  Fluidez 2 — diz também POR ONDE o app entrou: 1200 ms a abrir direto no
  Início e 18000 ms a passar pelo login são números de coisas diferentes.
- (linha ~166, `{ultimoErro ? (`) ─── Último erro fatal (build 10) ───
- (linha ~172, `{new Date(ultimoErro.data).toLocaleString('pt-BR')} · rota {ultimoErro.rota ||…`) 29I (achado 83): o instante do crash é lido no relógio de quem olha (o do aparelho que travou), não no fuso de time nenhum.
- (linha ~197, `<div className="hud-corners-s" style={CARTAO}>`) ─── Fluidez (VELOCIDADE 8) ───
              Uma travada é um quadro que demorou mais do que devia: acima de 50 ms
              a rolagem sente-se aos solavancos, acima de 100 ms a pessoa vê a tela
              parar. A FASE é o que aponta para o conserto — travar no arranque, no
              pré-aquecimento ou ao trocar de tela são três problemas diferentes.
- (linha ~220, `{resumo.segundoPlano?.vezes ? (`) Rodada 12A: o tempo com o app noutra coisa, separado das travadas
                  (ver o porquê em lib/diagnostico.js).
- (linha ~237, `{t.tarefas?.length ? <span style={{ color: '#b69cff' }}>{' · '}{t.tarefas.join(…`) Rodada 12A: o que estava a correr. "arranque" sozinho não
                        aponta para conserto nenhum; "arranque · cromo:compor" sim.
- (linha ~259, `{resumo.imagens ? (`) Velocidade 6B: quantas imagens o app mostrou e quantas nem foram
                  à rede. É o número que diz se o ganho é real no aparelho.
- (linha ~267, `{resumo.largura ? (`) Velocidade 7B + Rodada 12A: o que conta é o transbordo contra a
                  tela NA ORIENTAÇÃO da altura — deitado, 932 em 932 é zero.
- (linha ~303, `{falhas.length > 0 ? (`) ─── Falhas silenciosas (VELOCIDADE 5) ───
- (linha ~375, `{n.esperou?.length ? <span style={{ color: '#f0c94a', fontSize: 11 }}> · espero…`) Velocidade 7B: que loader a pintura esperou (código da tela, sessão, a própria tela).

## src/pages/Equipa.jsx

- (linha ~1, `import { Suspense, lazy, useCallback, useEffect, useState } from 'react';`) Futty v2.0 — A página do time (hub no cânone, transversal lote 1): vidro + hud-corners + chips 45° + Rajdhani + .cta-gold. Posição
  do jogador em DESTAQUE (regra: o próprio decide; GR no roxo).

  Rodada 29I, bloco 3 (dono): ADMIN NÃO É UM LUGAR. A página ganha abas no estilo da Figurinha — JOGOS · ELENCO · AJUSTES — e o que
  era o painel /admin/<slug> mora nelas: Jogos (+ resultados + campeonato), Elenco (+ convites) e Ajustes (só o admin vê, com o selo
  ADMIN). A aba fica no endereço (?aba=elenco), trocar de aba não empilha histórico, e "Voltar" volta para onde a pessoa estava.
  As partes do admin vêm de pages/AdminPanel.jsx em lazy: quem não é admin não baixa nada delas.
- (linha ~32, `const BoasVindas = lazy(() => import('../components/BoasVindas'));`) Rodada 29B (C) / 29C — EM LAZY: as boas-vindas só aparecem uma vez por time (convidado na 1ª entrada, criador ao
  tocar "Ir para o time"; uma página, um botão; substituíram o modal de 3 passos e o tour do Início) e não têm motivo
  para pesar no arranque.
- (linha ~36, `const JogosDoAdmin = lazyComRetry(() => import('./AdminPanel').then((m) => ({ d…`) O que só o admin usa (29I, bloco 3): um chunk só, baixado quando a pessoa é admin do time.
- (linha ~81, `const ESTILO_ABA = (on) => ({`) As abas, no estilo das da Figurinha (as mesmas medidas). Ajustes só para o admin, com o selo ADMIN.
  Achado 117 (29J): o Ranking era uma barra solta, de largura total, acima desta linha — parecia
  banner, não botão. Agora é um item do MESMO tamanho das abas, na mesma linha (mas é navegação
  para outra página, não um aba.: por isso fica fora do role="tablist", sem role="tab").
  Rodada 29L (achado 129): tudo o que decide a LARGURA da aba (fonte, espaçamento, selo) saiu do estilo em linha e foi para a classe
  .aba-time (app.css), que muda por largura de tela. Com `flex: 1` (partes iguais) a aba "Ajustes" + selo ADMIN não cabia na sua parte
  e empurrava o resto; agora cada aba tem a largura do próprio texto e divide a sobra. Em telas estreitas o selo vira um ponto dourado.
- (linha ~161, `const abrirPresencaDe = searchParams.get('abrir-presenca');`) Rodada 29R (achado 147): a linha "presença ainda não aberta" do Início chega com ?abrir-presenca=<game_id>. A aba Jogos rola até o
  jogo e abre o "Abrir presença" dele; depois de usado o parâmetro sai do endereço (troca a entrada do histórico, não empilha), então
  "Voltar" e recarregar não reabrem nada.
- (linha ~201, `const souGoleiroNoTime = !!members.find((m) => m.id === meuId)?.goleiro;`) Rodada 10B: `goleiro` é o campo único (fonte: team_members.categoria) —
  a pastilha "GR" do admin e este chip nunca mais podem discordar.
- (linha ~205, `const [onboardingDispensado, setOnboardingDispensado] = useState(false);`) Boas-vindas (Rodada 29B, C + 29C), uma vez por time (localStorage por equipa, a mesma marca do modal antigo):
  `convidado` — 1ª vez de um jogador que não fundou a equipa, logo depois de aceitar o convite (a página do convite
  manda `state.primeiraEntrada`) ou, como antes, sem avatar ainda. O admin que acabou de criar o time já comemorou no
  fim do Criar time (29P): aqui não abre nada para ele.
- (linha ~211, `const entrouAgora = !!location.state?.primeiraEntrada || new URLSearchParams(lo…`) Rodada 29D: quem foi aceito num pedido também chega como primeira entrada — pelo card do Início (state) ou pela
  notificação do motor (`/time/:slug?entrou=1`).
- (linha ~232, `async function escolherGoleiro(ligado) {`) Liga/desliga o goleiro do time (Rodada 10B: booleano só, grava categoria).
- (linha ~246, `useEffect(() => {`) Onboarding dia-1: "você é goleiro?" ficou em pref local — aplica-se aqui, no
  1º time em que o jogador entra ainda como jogador de linha (e a pref morre).
  Rodada 8A: o cadastro já não pergunta; isto só serve a quem respondeu antes.
  (set-state-in-effect justificado: é uma acção one-shot pós-onboarding — dispara
  o MESMO fluxo do clique no chip, uma única vez, e a pref morre.)
- (linha ~296, `setInviteLink(linkDoConvite({ origem: ORIGEM_DO_SITE, token, codigo }));`) 29H (item 7): o link curto (/c/<código>) quando há código; o longo continua valendo.
- (linha ~344, `{meuId && members.some((m) => m.id === meuId) ? (`) O card do PRÓPRIO jogador, no topo (Rodada 29A): linha ou gol, escrito por extenso.
                  Antes era um chip no meio da página e ninguém o achava. Rodada 10B: `goleiro` é o campo
                  único (team_members.categoria) — a pastilha "GR" do admin e esta escolha nunca discordam.
                  Rodada 9: ligado, cada jogo deste time já nasce com você no gol.
- (linha ~416, `<a`) 29H (item 7): a frase aprovada pelo dono já vem escrita no WhatsApp ("Bora jogar? Você foi chamado para o <time> no Futty…").

## src/pages/Explorar.jsx

- (linha ~46, `function AcaoDoTime({ equipa, busy, aoPedir, aoCancelar, larga = false }) {`) O que fica à direita do time, no card e no pop-up (29T, achado 157): o botão Entrar / Pedir entrada, o pedido enviado (com cancelar), o
  "Você entrou!" (com "Ver o time", achado 159) ou o "Você já é membro". `larga`: no pop-up o botão ocupa a linha inteira.
- (linha ~86, `function CardDoTime({ equipa, busy, aoTocar, aoPedir, aoCancelar }) {`) O card do time (29T, achado 157): embaixo do nome, "Bairro · Cidade" e o "Sobre o time" em até 2 linhas, cortado com "…". Tocar no card (fora do botão)
  abre o pop-up com tudo; quem já é membro vai direto ao time, como sempre foi.
- (linha ~98, `<span data-nome-do-time style={{ display: 'block', fontFamily: RAJ, fontWeight:…`) Rodada 29Z (item 3e): o nome do time quebra em duas linhas em vez de ser cortado com "…" ("Racha da Asa Norte" saía "Racha da As…"
              em 360 px, com o botão "Pedir entrada" ao lado).
- (linha ~119, `function PopupDoTime({ equipa, busy, aoPedir, aoCancelar, aoFechar }) {`) O pop-up do time (29T, achado 157): escudo, nome, bairro e cidade, membros, aberto ou com aprovação, o "Sobre o time" inteiro e o mesmo botão.
  Portal para o body (overlay fixo nunca dentro do [data-page], ver LoadingFutty.jsx). Esc, o X e o toque fora fecham.
- (linha ~160, `const [zona, setZona] = useState('');`) Rodada 29B (D): a cidade da pessoa, escolhida na lista (ou digitada)
- (linha ~163, `const [origemPos, setOrigemPos] = useState(null); // 'localizacao' | 'cidade' |…`) 29T (achado 161): de onde veio a posição decide o título da lista ("Perto de você" só com a localização; "Em <cidade>" com a cidade).
- (linha ~189, `const filtradasTexto = equipas.filter(`) Rodada 29B (D): time SEM coordenada (a cidade dele nenhuma lista nem o Nominatim achou) aparece para quem escreve
  a cidade EXATAMENTE — sem acento, maiúscula nem espaço sobrando (mesma regra do motor).
- (linha ~256, `setEquipas((cur) => depoisDePedirEntrada(cur, equipa.slug, entrou));`) 29T (achado 159): quem acabou de entrar não é "já era membro": o card comemora ("Você entrou!" + "Ver o time") e a contagem sobe 1.
- (linha ~307, `<div style={{ marginTop: 12 }}>`) Alternativa à permissão do browser: a MINHA cidade (Rodada 29B, D). Da lista (Brasil e Portugal) o ponto vem
              da própria lista, na hora, sem chamada externa; fora dela o botão abaixo a geocodifica NO browser (nunca no
              nosso servidor). A posição resultante fica só em memória.
- (linha ~351, `{tituloDoRadar({ origem: origemPos, cidade: cidadeDaPos })} · {filtradas.length}`) 29I (achado 106): a lista traz times de entrada aberta E times com aprovação (com o botão PEDIR ENTRADA); o título antigo prometia só os abertos.

## src/pages/Feed.jsx

- (linha ~50, `const dataExtensa = (iso, fuso) => formatarData(iso, fuso);`) ─── Helpers de data ──────────────────────────────────────────────────────────
  A data e a hora do jogo são as do CAMPO (`fuso` do time, que o motor manda em cada jogo — 29I, achado 83).
- (linha ~64, `function LinkVitrine({ teamSlug, userId, style, children }) {`) RODADA 12C — envolve o que estiver dentro num link para a vitrine do jogador.
  Sem `teamSlug` ou sem `userId` não há rota possível: devolve o conteúdo cru,
  e a Resenha fica exactamente como era. É o mesmo destino que o avatar do
  Ranking já abria — o que mudou é ter mais uma porta para ele.
- (linha ~194, `<ImagemDoPost`) Foto de post: lazy; os atributos só reservam a proporção, o CSS manda no tamanho. Velocidade 9: 512 na lista (o toque abre o
  original). Rodada 29L (achado 141): se a foto falha, vira uma linha curta com "tentar de novo" (ImagemDoPost).
- (linha ~450, `<LinkVitrine teamSlug={teamSlug} userId={p.author_id} style={{ lineHeight: 0, f…`) RODADA 12C — avatar e nome abrem a vitrine do autor, como já
              acontecia no Ranking. Só com `teamSlug`: a vitrine vive dentro de um
              time, e sem ele não há rota. Sem slug ficam como eram, texto seco —
              um nome que não leva a lado nenhum é melhor do que um link morto.
- (linha ~539, `<ImagemDoPost`) VELOCIDADE 9: 512, não 1024. A caixa tem 362 pt de largura — 1024 é quatro vezes mais pixels para descodificar do que o que
  cabe, e essa descodificação é na thread principal, a meio da rolagem. O toque abre o ORIGINAL em tela cheia (onOpenImage leva
  a url sem `w`), por isso ninguém perde detalhe nenhum: perde-se só o que estava a ser deitado fora na miniatura.
  Rodada 29L (achado 141): foto que falha vira uma linha curta com "tentar de novo", não um buraco de 460 px.
- (linha ~610, `{confirmar ? createPortal(`) Modal de confirmação de apagar — portal para o body (Rodada 8A), mesma
            razão do LoadingFutty.jsx: fixed dentro do [data-page] não ancora na tela.
- (linha ~898, `function ResenhaEsqueleto() {`) Achado 93: a Resenha levava mais de 5 s para mostrar os posts e, enquanto isso, parecia vazia (só o campo de postar e "Ver mais antigos").
  Enquanto não há NADA para mostrar, três cartões-esqueleto com a forma dos de verdade (avatar, linhas, foto) ocupam o lugar.
- (linha ~934, `const { data: feedData, loading: feedCarregando, error: feedErro } = useApiComC…`) VELOCIDADE 4 — a Resenha era a única das cinco abas sem cache nenhum: um
  apiFetch cru dentro de um efeito, e o loader a tapar a tela inteira até a
  resposta chegar de São Paulo. Quem está em Lisboa pagava essa espera em
  TODA visita à aba. Agora entra no mesmo stale-while-revalidate do resto da
  casa: pinta o feed da última visita na hora e actualiza por trás.
  RODADA 29B (bloco 2, B — conta pesada): a Resenha vem em PÁGINAS de 20 (jogos e posts juntos); "Ver mais antigos" busca a seguinte pelo
  cursor `proximo`. Antes vinham até 120 itens de uma vez — com comentários, reações e fotos de todos os times da pessoa.
- (linha ~943, `const { ad: adFeed, pronto: adPronto } = useAd('resenha');`) VELOCIDADE 6B (15-set): o anúncio é pedido AQUI, no topo, em paralelo com o
  feed. Antes o AdCard só era montado entre o 3º e o 4º item da lista, por
  isso o pedido dele só começava depois do /api/feed inteiro ter chegado e
  sido pintado — duas idas a São Paulo em fila por uma faixa de 100 px.

  RODADA 12C: a página passa a ser 'resenha' (era 'inicio' emprestado, por
  não existir toggle próprio). Agora o dono liga e desliga esta tela sem
  mexer no Início — eram duas decisões presas numa chave só.
- (linha ~1007, `const aDesenhar = useListaProgressiva(filtrados, 6);`) VELOCIDADE 8 (16-set) — os 6 primeiros no 1º commit, o resto dois quadros
  depois. Um card da Resenha não é uma linha de texto: traz avatar, foto,
  reações e a prévia de até 2 comentários (com mais avatares) — vinte deles no
  mesmo commit é uma leva de layout e pintura que segura a tela inteira.
  Os comentários em si já não montavam fechados (Comentarios devolve null
  quando `visivel` é falso, e os efeitos dele saem cedo) — confirmado.
- (linha ~1086, `<div className="empty-state" data-resenha-vazia style={{ marginTop: 8 }}>`) Estado vazio de verdade (achado 93): diz que está vazio e o que fazer — não só um "não há jogos". Com um time escolhido
  no chip, a frase é desse time.
- (linha ~1160, `style={{ position: 'fixed', inset: 0, zIndex: 150, background: '#000', display:…`) Achado 124 (29K): sem isto, um arrasto no véu encadeia a rolagem para o body por trás (WebKit).

## src/pages/Figurinha.jsx

- (linha ~1, `import { useEffect, useRef, useState } from 'react';`) Futty v2.0 — Figurinha (/figurinha): selos de honra (Vaga 11C) no cromo + olhinho.
  Futty v2.0 — Figurinha (/figurinha): "card studio". Card 2:3 com tilt 3D e
  entrada animada; opções em tabs (Fundo/Frame/Uniforme) + toggles compactos.
  Trocar foto é preview local (sem backend). Tudo no cliente (canvas).
- (linha ~16, `import '../lib/alinharCard';`) Rodada 27: liga o alinhamento dos caches ao perfil (foto/genérico novo chega ao Início, Ranking, Feed).
- (linha ~52, `const FUNDOS = [`) Chaves nomeadas (iguais às guardadas em users.cor_frame / fundo_figurinha).
  GATES CONFIRMADOS (ordem do dono): Aura, Golden e Royal são PREMIUM (verdade no
  servidor, ver FUNDOS_PREMIUM em backend/routes/auth.js; o `premium: true` aqui é
  só o cadeado do desejo). Épico virou GRÁTIS (15-set, decisão do dono) — deixou de
  ter `premium`. LEI DA REGRA JUSTA: quem já tinha Aura equipado mantém — o gate só
  corre ao TROCAR (ver escolherFundo).
- (linha ~59, `{ k: 'preto', label: 'Neutro' },`) ORDEM (dono, 15-set — 3ª revisão): Neutro, Épico, Estádio, Aura, Golden, Royal
  — os GRÁTIS primeiro (Neutro, Épico, Estádio), os pagos depois (Aura, Golden,
  Royal). Revoga a ordem de 14-set (Neutro, Estádio, Épico, Aura...). Só o
  SELETOR muda: o fundo de quem não escolheu continua a ser 'estadio'
  (useState abaixo e cromoFundo no Início).
- (linha ~65, `{ k: 'gradiente', label: 'Épico' },`) chave interna 'gradiente' (estado), label novo — GRÁTIS (15-set)
- (linha ~68, `{ k: 'golden', label: 'Golden', premium: true }, // 1º fundo PREMIUM (gated) —…`) REVERSÃO (dono, 3-out, Rodada 29J): "Golden" e "Royal" são nomes de PRODUTO batizados pelo dono em
  15-set, não texto de interface — ficam em inglês, como "Golden" fica no cadeado GOLDEN. O bloco 2 da
  29I traduziu para "Dourado"/"Real" por conta própria; a regra do PT-BR vale para o que o app DIZ, não
  para o que o app BATIZA. Não reabrir sem o dono pedir.
- (linha ~82, `preto: 'linear-gradient(180deg, #16161c 0%, #1d1d24 50%, #101014 100%)',`) FASE 3.51 — 'preto' (label "Neutro") re-baseado: mesma base escura do épico, sem
  padrão. O tile é o gradiente liso, condizente com o card real.
- (linha ~85, `aura: 'radial-gradient(ellipse 140% 112% at 50% 44%, rgba(212,160,23,0.7125) 0%…`) 'aura' — tile fiel ao glow do card: elipse dourada (mesmos stops) sobre o escuro da casa. O card real desenha o glow com
  blur no canvas; aqui a elipse já é suave. 29H-B: o dobro do tamanho (70%×56% → 140%×112%) e os alphas a 3/4, como no canvas.
- (linha ~137, `const RECADO_FOTO_RECUSADA = 'Essa foto não deu certo. Escolha outra: de frente…`) 6-out (dono): a cabeça cortou nas duas tentativas com esta foto → o recado leva a escolher OUTRA foto. Tentar de novo com ela daria o mesmo.
- (linha ~144, `const FOTO_ZOOM_MAX = 1.4;`) RODADA 28 — zoom do card com a FOTO: 1 = a foto cobre a moldura por completo (o piso — nunca faixa
  vazia nem borda à mostra, ver enquadrarFotoComum); cada toque aproxima 10%, até 40%.
- (linha ~187, `const FRESCOR_DO_INICIO_MS = 60000;`) ─── O que a Figurinha aproveita do Início (VELOCIDADE 9, 23-set) ────────────

  Esta tela abria com três pedidos: o anúncio, os selos e /api/brilhantes/estado
  (539 + 540 + 606 ms no relatório do build 28 — de Lisboa, tudo distância).
  Nenhum dos três traz novidade nenhuma para quem chegou aqui pelo Início: o
  /api/inicio já traz o direito, os créditos, os pedidos vivos e — desde esta
  rodada — as colunas do pacote em cada time. Fica tudo no cache de sessão, com
  a mesma chave que o InicioContext usa; daqui só se lê.
- (linha ~232, `const { perfil, erro: erroPerfil, deCache: perfilDeCache, recarregar: recarrega…`) Velocidade 2 (12-set): esta página tinha o seu próprio GET /api/me — o
  PerfilContext já carrega isso 1x por sessão; agora só usa o `perfil` de lá
  para inicializar o espelho local `me` (que continua a existir porque a
  página precisa de merges finos — slots, kit_ativo, avatar_url — que o card
  usa de imediato, sem esperar round-trip) e as escolhas guardadas
  (fundo/avatar genérico/fase da estreia).
- (linha ~249, `const [pintura, setPintura] = useState(() => lerPinturaGuardada(userId));`) RODADA 29B (bloco 2, A) — a pintura roda em SEGUNDO PLANO no motor: o POST devolve um jobId e o app consulta
  GET /api/figurinha/job/:id. `pintura` = { jobId, kit, estreia, estimativaSegundos, etapa, decorridoMs, baseEm } (o
  decorridoMs do motor + o relógio local desde `baseEm`). Nasce do que ficou guardado no aparelho: quem saiu da tela
  (ou fechou o app) e volta reencontra a pintura — pronta, ou ainda correndo. `agora` é o relógio da barra.
- (linha ~256, `const [kitParaPintar, setKitParaPintar] = useState(null);`) RODADA 21 — kit escolhido na grelha que ainda não foi pintado: abre o
  diálogo "Pintar no uniforme X?" em vez do window.confirm() de antes (não
  tem como levar o "N gerações" nem o "~45s" no texto de um confirm nativo).
- (linha ~265, `const [toast, setToast] = useState(null);`) Toast curto e genérico (build 9): { mensagem, tipo }. Dois usos — aviso
  quando /avatar/ai reutiliza o slot (mesma foto de antes, sem isto o botão
  "carregava e nada acontecia"), e erro do PATCH de fundo (ver escolherFundo).
- (linha ~269, `const [fotoTrocadaSemGerar, setFotoTrocadaSemGerar] = useState(false);`) Destaque pulsante no botão Gerar (build 9): true assim que uma foto NOVA
  sobe nesta sessão, até a próxima geração terminar (reutilizada ou não) —
  guia quem trocou a foto e não percebeu que falta tocar em Gerar.
- (linha ~273, `const [emailNaoConfirmado, setEmailNaoConfirmado] = useState(false);`) gate anti-abuso (11-ago): geração exige e-mail confirmado
- (linha ~277, `const [trocandoModo, setTrocandoModo] = useState(false);`) Rodada 18: PUT /api/me/avatar/modo em voo
- (linha ~284, `const ultimoRecorteMini = useRef(null);`) 29H-B: o quadrado tracejado da miniatura do último recorte (gravado depois de subir)
- (linha ~290, `const [fotoZoom, setFotoZoom] = useState(1);`) Rodada 28: o do card com a foto. Só da vista e do que se baixa/compartilha daqui — o enquadramento
  salvo (Trocar foto → Ajustar enquadramento) continua a ser o de todas as telas; volta a 1 com foto nova.
- (linha ~305, `const [cropFile, setCropFile] = useState(null);`) RODADA 19 — enquadrar dentro de "Trocar foto". cropFile alimenta o
  CropModal nos dois fluxos ("Escolher outra foto" e "Ajustar
  enquadramento"); cropModo decide o que "Confirmar" faz. origParaEnviar só
  é usado no modo 'nova' (a normalizada vai junto do recorte como a "original").
- (linha ~326, `const avatarEhIA = mostraFigurinha(me?.user);`) `avatarEhIA` = o card mostra AGORA uma figurinha (IA). RODADA 28: quem diz é o motor
  (`figurinha_ativa`, pelo nome do arquivo — mostraFigurinha). Era foto_url ≠ avatar_url, e a foto
  do Google em avatar_url virava "figurinha": seletor de fundos e zoom abaixo da moldura numa foto.
- (linha ~330, `const temFigurinhaAlguma = !!me?.user?.tem_figurinha;`) Rodada 18: existe uma figurinha (mesmo que o card esteja em modo 'foto'
  agora) — o sinal certo para "há algo para o interruptor escolher", ao
  contrário de avatarEhIA, que só diz o que está ativo NESTE instante.
  RODADA 20 (achado da 19): era `!!kit_ativo`, mas kit_ativo é só "qual
  uniforme", não "já gerou" — toda conta nova aparecia com o interruptor
  sem nunca ter gerado nada. tem_figurinha vem calculado do servidor
  (services/inicio.js), que sabe de verdade se existe alguma figurinha.
- (linha ~344, `const zoomDaFoto = !avatarEhIA && temFoto;`) RODADA 28 — o "Tamanho −/+" serve aos dois cards: na figurinha é o tamanho do jogador recortado; na
  FOTO é o zoom da foto, com piso em "cobre a moldura por completo" (o − para em 1).
- (linha ~359, `const brilharGerar = fotoTrocadaSemGerar && !gerandoIA;`) RODADA 17 — o botão "Gerar Avatar IA" vira o CTA dourado (receita do "Ver
  sorteio", Inicio.jsx) exactamente na janela em que ele é a única ação que
  falta: foto nova já subiu, ainda não gerou. Fora dessa janela (idle, ou já
  gerando) continua roxo — dourado é reservado para "toque aqui agora".
- (linha ~364, `const [brilhante, setBrilhante] = useState(() => brilhanteDoInicio(userId));`) DIREITO DE GERAR (SPEC-FIGURINHA-3 §5) — quem pode gerar uma Brilhante e
  com que uniforme. Carregado uma vez ao abrir a tela; recarregado depois de
  gerar (o crédito baixa) e depois de pedir ativação.
  VELOCIDADE 9 (23-set): nasce com o que o /api/inicio já trouxe (cache de
  sessão), em vez de null. Era o terceiro pedido desta tela — 606 ms de
  Lisboa no relatório do build 28 — para saber coisas que estavam em casa.
- (linha ~371, `const aplicarBrilhante = (e) => {`) Rodada 27: o estado que chega do servidor (depois de gerar, de pedir ativação) também vai para o
  Início guardado — a Figurinha nasce a partir dele (brilhanteDoInicio), e sem isto o contador
  "N gerações restantes" abria com o número de ANTES de gerar. Uma resposta que falhou (o
  estadoBrilhantes devolve "ninguém tem nada" e marca indisponivel) não vira verdade guardada.
- (linha ~383, `const restantesDireito = brilhante?.direito?.restantes ?? 0;`) RODADA 21 — gerações que sobram no direito ESCOLHIDO (créditos, ou o que
  falta no pacote do time): é o "N" do contador e do diálogo de confirmação.
  Antes só existia para crédito (o pacote não tinha saldo, era 1 tiro só).
- (linha ~407, `const temCredito = fonteDireito === 'credito' || (brilhante?.creditos || 0) > 0;`) BLOCO 2 — o recado do pedido SOBREVIVE a fechar o app: vem do estado
  gravado, não só do clique desta sessão. Pendente diz que está na fila;
  recusado diz o motivo que o dono escreveu no Gabinete; ativado não aparece
  aqui de todo — quem foi ativado já vê o botão dourado, e um recado sobre um
  pedido resolvido só ia competir com ele.
  RODADA 29B (B) — A GRADE DE UNIFORMES (a mesma .fig-seletor-grade dos fundos) é sempre a mesma, nos dois cards
  e para os três casos; o que muda é o estado de cada tile, que sai do DIREITO (utils/uniformesGrade.js):
    grátis — todos com cadeado; o toque leva à Minha Figurinha (Planos, sem preço no app da loja: ehNativo)
    pacote — o uniforme do time aberto (pintável) e os outros com cadeado → Minha Figurinha
    minha  — todos abertos; os ainda não pintados com o selo "pintar · 1 geração · ~45 s"
  Estados de tile: vestido (✓) · pintado (um toque veste, grátis) · geravel (confirma e gasta 1) · trancado.
  Nada de "em breve"; o pacote do time, para o dono, continua no convite "Vire figurinha" mais abaixo.
- (linha ~469, `{estado === 'geravel' ? (`) Gerável (com direito, sem slot): avisa que custa 1 geração e quanto demora — Rodada 21 e 29B.
                      O tile tem 76 px: o selo quebra em duas linhas ("pintar · 1 geração" / "~45 s").
- (linha ~513, `if (!e.indisponivel) espelharBrilhantesNoInicio(userId, e);`) Rodada 27 — ver aplicarBrilhante
- (linha ~518, `const { ad: adFigurinha, pronto: adPronto } = useAd('figurinha');`) SELOS DE HONRA (Vaga 11C): busca os selos do utilizador; mostra no cromo os 2
  de maior prioridade que NÃO estejam ocultos (olhinho, persistido). Vêm já
  ordenados por prioridade (campeonato > ranking) do backend.
  Velocidade 7B: os selos do cache entram JÁ no primeiro render (antes vinham
  num microtask, e essa chegada tardia recomeçava o desenho do cromo). Os
  selos nunca seguram a tela: sem cache, o cromo desenha sem eles e redesenha
  uma vez quando o /api/me/selos chegar.
  Rodada 12C: anúncio pedido no topo da tela, em paralelo com o resto (mesmo
  motivo da Resenha e do Ranking — ver useAd).
- (linha ~541, `const frescos = comIdade && comIdade.idadeMs < 5 * 60 * 1000;`) Velocidade 6B: mesma janela de frescor do useApiComCache. Se o
  pré-aquecimento acabou de trazer os selos, não se pedem outra vez.

  Velocidade 9: a janela sobe de 30 s para 5 minutos NESTA tela. Um selo é
  uma conquista (campeonato, 1º do ranking) — não muda enquanto a pessoa
  escolhe um fundo. Com 30 s, abrir a Figurinha um minuto depois do Início
  pagava 540 ms por dois emblemas que já estavam em casa. Fora da janela,
  revalida por trás: o cromo desenha com os selos do cache e redesenha uma
  vez se algum tiver mudado.
- (linha ~588, `let ativo = true;`) Adiado ao microtask (mesmo padrão do PerfilContext): setState síncrono
  no corpo do efeito dispara cascading renders.

  O `inicializadoRef` é marcado DENTRO do microtask, não antes dele
  (22-set). Marcá-lo aqui fora deixava a página vazia em `npm run dev`: o
  StrictMode monta, desmonta e remonta cada efeito, e o cleanup da
  primeira montagem punha `ativo = false` antes de o microtask correr — o
  setMe nunca acontecia, e na remontagem o guard já estava fechado.
  Resultado: `me` ficava null para sempre e a Figurinha abria a pedir
  "Adicionar foto" numa conta que tem foto e figurinha. Em produção não
  aparecia (uma montagem só), mas o dev e o LIGAR-FUTTY.bat são onde a
  casa testa — uma tela que mente na bancada não serve de bancada.
- (linha ~621, `const frescoAplicadoRef = useRef(false);`) O ESPELHO TEM DE OUVIR O DADO FRESCO UMA VEZ (22-set, relato do dono: "no
  Início já deu certo, na Figurinha ainda está a foto antiga").

  O efeito acima semeia `me` com o PRIMEIRO `perfil` que chega — e o
  PerfilContext entrega primeiro o CACHE LOCAL deste aparelho
  (stale-while-revalidate) e só depois a resposta do /api/me. O guard por ref
  existe por bom motivo (o flow da estreia não pode reiniciar a meio), mas
  apanhava também a actualização: o cromo desta página ficava preso na
  figurinha gravada no cache, enquanto o Início — que lê o contexto directo —
  já mostrava a nova. Quem nunca tinha aberto o app naquele aparelho via o
  certo; quem já tinha, via o antigo. Daí parecer coisa de PC contra celular.

  Sincroniza-se só o que vem do servidor e não se edita aqui. Fundo, zoom e
  avatar genérico ficam como o utilizador os deixou. E se houver acção local
  em voo (upload, geração, foto por gerar), ela é mais nova do que este
  fresco — desiste-se sem aplicar, para não desfazer o que ele acabou de fazer.
- (linha ~654, `figurinha_ativa: perfil.user?.figurinha_ativa ?? m.user?.figurinha_ativa,`) Rodada 28: o que o card mostra anda junto com o avatar_url.
- (linha ~675, `const geracaoCromoRef = useRef(0);`) Velocidade 7B: uma geração do cromo só é jogada fora se já houver cromo NA
  TELA. Antes, qualquer mudança a meio — os selos a chegarem do cache ou da
  rede — descartava o desenho quase pronto e o card ficava no F até a geração
  seguinte acabar: "a Figurinha só pinta quando /api/me/selos chega". Agora a
  primeira a terminar pinta, e a mais nova substitui quando terminar.
- (linha ~720, `}, [me?.user?.id, fundo, avatarZoom, fotoZoom, avatarEhIA, jogador?.avatar_url,…`) `jogador?.foto_url` entra nas deps por causa do modo COMUM (22-set): ali a
  base do card é a FOTO, e trocá-la tem de repintar o cromo — no modo
  brilhante quem muda é o avatar_url, que já estava aqui.
- (linha ~739, `await desenharFundoEpico(cv.getContext('2d'), 120, 120, { intensidade: 3.0 });`) FASE 3.51/3.55 — intensidade 3.0: a 120×120 as arestas a alpha do card (0.065)
  desapareciam. Mesma geometria, alpha subido só para a miniatura se ler.
- (linha ~789, `try {`) RODADA 17 — mesmo marcador do Onboarding (dispararFigurinhaIA): o Início
  lê isto no PRÓPRIO useState inicial (uma vez, ao montar), por isso tem
  de estar gravado ANTES do POST — se a pessoa for para lá enquanto isto
  ainda corre, o Início já nasce sabendo que há uma geração em voo, em vez
  de mostrar o CTA normal por um instante até o status 'gerando' chegar.
- (linha ~805, `const data = await apiFetch('/api/me/avatar/ai', { method: 'POST', body: JSON.s…`) RODADA 29B (bloco 2, A): o POST devolve `{ jobId }` na hora; quem conclui é acompanharPintura (aplicarPinturaPronta
  / aplicarPinturaFalhou). Sem jobId (resposta imediata) o fluxo é o de sempre.
- (linha ~827, `function tratarFalhaDaEstreia(err) {`) SEM_DIREITO (22-set) não é o "limite" morto — mostrar o card de quota
  (que mandaria "Ver Brilhantes" para um 403 que já significa isso)
  seria só ruído; o card comum já está pronto, é só revelar. `subirFoto`
  só chama a geração da estreia quando já há direito confirmado, mas o direito
  pode ter acabado entre a checagem e a resposta (corrida rara) — cai
  aqui na mesma, sem erro na tela. Serve ao POST e ao desfecho 'falhou' do job.
- (linha ~840, `function faseAposFalhaDaEstreia(err) {`) 6-out: FOTO_RECUSADA na estreia volta a "Adicione uma foto" com o recado (a pessoa escolhe outra); as outras falhas seguem ao cromo, como sempre.
- (linha ~845, `async function subirFoto(file, emEstreia, original, recorteMini = null) {`) Trocar foto: upload para o servidor e, CONFIRMADO o 200, preview local imediato.
  Antes o preview (e a linha "Foto trocada") nasciam ao escolher o arquivo, antes
  do upload: com o upload falhando a tela dizia que a foto já tinha mudado
  (Hotfix 26). Agora só há preview depois do 200; com erro, só o erro.
  Na estreia, dispara automaticamente a geração da Brilhante — só quando já
  há direito (crédito ou pacote do time); sem ele, a comum já está pronta.
  Núcleo do upload, reutilizado pelo "tentar de novo" (P1-5). `emEstreia` decide
  se dispara a geração IA automática a seguir. RODADA 19: `file` já é o
  RECORTE (saído do CropModal); `original` (opcional) é a foto de antes do
  recorte, mandada junto para "Ajustar enquadramento" mais tarde.
  29H-B: `recorteMini` é o quadrado tracejado da miniatura (enquadramento único), gravado em users.avatar_recorte depois do 200 —
  só quando o card passa a mostrar a FOTO (com figurinha ativa, o arquivo do avatar continua sendo a figurinha; o recorte dela fica).
- (linha ~897, `if (temDireitoDeGerar) await gerarAvatarIAEstreia();`) SPEC-FIGURINHA-3 (22-set): a estreia só tenta gerar a Brilhante com
  direito confirmado (crédito ou pacote do time) — sem isso o POST
  dava 403 SEM_DIREITO e a tela mostrava o card de "limite" (que nem
  existe mais). Sem direito, a comum já está pronta (o upload acima
  gravou foto_url): só falta revelar o cromo, sem tentar nem errar.
- (linha ~913, `function gravarMiniaturaDaFoto(recorteMini) {`) 29H-B: grava o quadrado tracejado como a miniatura de verdade (best-effort, sem segurar a tela); com o 200, o avatar_url novo
  já traz o `?rc=` e as miniaturas de todo lado passam a cortar nele.
- (linha ~923, `async function enviarRecorte(blob, recorteMini = null) {`) RODADA 19 — "Ajustar enquadramento": regrava só o recorte (PUT), sem
  mandar original nenhuma (a que já está guardada não muda).
- (linha ~962, `async function abrirAjustarEnquadramento() {`) "Ajustar enquadramento": reabre o CropModal sobre a foto ORIGINAL
  guardada (foto_original_url). Fail-safe (fotos de antes desta rodada, ou
  sem a migração 057): sem original, reabre sobre o RECORTE atual — dá
  para aproximar, não para recuperar área perdida no primeiro recorte.
- (linha ~991, `const recorteMini = extra?.recorte || null;`) 29H-B: o quadrado tracejado da miniatura
- (linha ~1016, `function carregarHistorico() {`) RODADA 19 — "Minhas figurinhas": até 6, mais recente primeiro. Recarrega
  toda vez que o modal "Sua foto" abre (pode ter mudado desde a última).
- (linha ~1047, `const avisoUploadErro = uploadErro ? (`) Aviso de erro partilhado (P1-5): erro de upload com mensagem accionável +
  "tentar de novo" inline; senão, o erro genérico da página. No studio o erro do
  upload sai SOB O CARD (`avisoUploadErro`), onde a pessoa está olhando, e o fim da
  página fica só com o genérico (`avisoErroGenerico`): Hotfix 26 — um erro que mora
  abaixo das abas ninguém vê, e a tela ainda dizia que a foto já tinha mudado.
- (linha ~1067, `async function partilharCromo() {`) Partilha do cromo no momento da estreia (imagem do card + texto viral).
  No app (Rodada 8A) vai direto à folha de compartilhar do sistema: o
  navigator.share do WebView não é garantido, e o <a download> é ignorado.
- (linha ~1098, `try {`) RODADA 17 — mesmo marcador de gerarAvatarIAEstreia/dispararFigurinhaIA
  (Onboarding): cobre a TROCA de foto/uniforme, não só o cadastro. Antes
  do POST — é o que o Início lê ao montar, se a pessoa sair desta tela
  enquanto a geração ainda corre.
- (linha ~1117, `const data = await apiFetch('/api/me/avatar/ai', { method: 'POST', body: JSON.s…`) RODADA 29B (bloco 2, A): o POST devolve `{ jobId }` na hora e a pintura segue em segundo plano (ver
  acompanharPintura). Uniforme já pintado da mesma foto responde na hora com a figurinha, sem job.
- (linha ~1137, `if (data.reutilizado) setToast({ tipo: 'info', mensagem: 'Sua figurinha já esta…`) reutilizado:true (motor, build 9) — o slot deste kit já valia para a
  foto atual e não gerou de novo. Sem aviso, parecia que o toque no
  botão não fez nada.
- (linha ~1151, `if (err?.code === 'EMAIL_NAO_CONFIRMADO') setEmailNaoConfirmado(true);`) EMAIL_NAO_CONFIRMADO: gate anti-abuso (11-ago) — mesmo status 403 do limite
  de quota, por isso tem de ser verificado PRIMEIRO (código distingue os dois).
- (linha ~1154, `else if (err?.code === 'SEM_DIREITO') {`) SEM_DIREITO (22-set, SPEC-FIGURINHA-3) — também 403, mas não é limite
  nenhum: é o direito que acabou (ou o pacote do time que não existe).
  Recarrega o estado para o bloco "Vire Brilhante" aparecer sozinho; o
  card de quota do plano NÃO serve aqui, e mostrá-lo seria mentir.
- (linha ~1166, `setFotoRecusada(true);`) FOTO_RECUSADA (6-out): a cabeça cortou nas duas tentativas com esta foto — o motor já não a pinta. O
  overlay mostra o recado e leva a escolher outra foto (sem "tentar de novo", que daria o mesmo).
- (linha ~1172, `if (['FOTO_INVALIDA', 'TETO_DIARIO_ATINGIDO', 'IA_INDISPONIVEL', 'FOTO_DESATUAL…`) FOTO_INVALIDA / TETO_DIARIO_ATINGIDO / IA_INDISPONIVEL / FOTO_DESATUALIZADA / FIGURINHA_DEFEITUOSA:
  causas acionáveis com mensagem digna própria, em vez do genérico
  "não deu desta vez". IA_INDISPONIVEL (14-set: fal recusou por
  chave/crédito, falha do MOTOR) usa a mensagem que já vem do backend —
  nunca sugere "tente outra foto", porque o problema não é a foto.
  FOTO_DESATUALIZADA (22-set) é a trava de hash do motor: a foto que
  ele baixou ainda não era a que acabou de subir, e ele recusou gerar
  em vez de fazer a figurinha da foto errada. Nada a corrigir do lado
  de cá — é esperar uns segundos e tocar de novo, e o botão de repetir
  do overlay já está lá. Resto (fal fora do ar, etc.) mantém o genérico
  com retry, que já cobre bem o transitório.
- (linha ~1188, `function iniciarPintura(data, { kit, estreia = false }) {`) ── A PINTURA EM SEGUNDO PLANO (Rodada 29B, bloco 2, A) ──────────────────────────────────────────────
  O POST respondeu `{ jobId, estimativaSegundos }`: a barra começa e o app passa a consultar o motor.
- (linha ~1305, `async function reenviarEmailConfirmacao() {`) Reenvia o e-mail de confirmação (gate anti-abuso, 11-ago) — supabase.auth.resend
  usa a MESMA sessão activa, não precisa senha nem novo login.
- (linha ~1325, `if (kit.estado === 'breve' || (avatarEhIA && kit.id === kitAtivo) || gerandoIA)…`) Rodada 28: "já vestido" só vale com a figurinha no card — no card com a FOTO nenhum uniforme está
  vestido (kit_ativo nasce 'dark-gold' pelo default da coluna), e tocar nele tem de pintar/vestir.
- (linha ~1328, `if (slotsKits.includes(kit.id)) {`) 22-set: o cadeado deixou de ser por PLANO e passou a ser por DIREITO
  (§5). Vestir um uniforme que já se gerou é sempre livre (slot, custo
  zero); gerar um novo precisa de crédito ou do pacote do time — e é isso
  que /planos resolve. Um membro do pacote via o PRÓPRIO uniforme do time
  trancado, porque o dark-purple estava marcado "pro".
- (linha ~1359, `function aplicarNoPerfilGlobal(campos) {`) VELOCIDADE 9 (23-set) — escrever no perfil SEM o reler a seguir.

  O relatório do build 28 trouxe seis `/api/me` seguidos (530/311/279/276/
  380/305 ms) e a leitura óbvia — "polling" — estava errada: eram três PARES
  PATCH+GET. Cada toque num fundo gravava a preferência e chamava
  `recarregarPerfilGlobal()` atrás, que é um GET /api/me inteiro para saber
  uma coisa que o próprio toque acabou de decidir. Numa tela feita para
  experimentar fundos e uniformes, isso é meia ida a São Paulo por toque.

  `hidratar` põe o mesmo estado no contexto (e no cache local) sem rede. A
  releitura só se justifica quando a escrita muda coisas que não sabemos —
  é o caso da geração de figurinha, que mexe em créditos e estado; essas
  continuam a chamar `recarregarPerfilGlobal()`.
- (linha ~1377, `async function trocarModo(modo) {`) Rodada 18 — interruptor "Mostrar minha foto" / "Mostrar minha figurinha"
  (modal "Sua foto"): troca o que o card mostra sem apagar nada — a
  figurinha continua no slot, sempre. avatarEhIA já diz qual dos dois está
  ativo agora, então um toque no modo já ativo não faz nada.
- (linha ~1404, `const anterior = fundo;`) 22-set (SPEC-FIGURINHA-3 §4/§9): os 6 fundos vêm COM a Brilhante — são
  composição do card, custo zero. O gate antigo era por plano (Pro/Elite),
  e os planos saíram das telas: um membro do pacote do time via o Aura
  trancado no card que o time acabou de pagar, com "Os 6 fundos liberados"
  escrito na compra. Sem Brilhante não há seletor nenhum, portanto chegar
  aqui já significa ter direito ao fundo.
  Guarda o anterior para reverter se o PATCH falhar (build 9, achado real:
  constraint do Royal sem a migração aplicada dava 500 — o tile ficava
  marcado no fundo novo com o banco silenciosamente no antigo).
- (linha ~1425, `async function escolherAvatarGenerico(k) {`) Escolha do avatar genérico (31-jul) — mesmo padrão optimista do fundo.
- (linha ~1478, `function escolherOutraFoto() {`) 6-out: foto recusada → o botão do recado leva direto ao seletor de foto (o mesmo de "Trocar foto"). Nada gasta.
- (linha ~1486, `const overlayGerando = (`) Overlay do card: "a gerar" OU, se a geração falhou (≠403), estado de ERRO com
  retry. No erro o logo fica ESTÁTICO — sinal de que parou.

  FASE 3.57 — usa o FuttyLoader DIRECTO, não o <LoadingFutty />. O LoadingFutty é o
  padrão de ECRÃ e traz minHeight: calc(100dvh - 120px) (~724px); dentro deste card
  de ~450px transbordava e empurrava o F para baixo. Aqui o centro é o do CARD, e
  quem o dá é o placeItems:center do próprio overlay.
- (linha ~1494, `<div style={{ position: 'absolute', inset: 0, zIndex: 8, clipPath: CLIP_OCTOGON…`) Velocidade 8: sem backdrop-filter. Este overlay fica por cima do card
  ENQUANTO o F de carregamento se pinta — ou seja, o compositor teria de
  refazer o desfoque a cada quadro da animação, e o que está por baixo é a
  figurinha parada. 0,75 + blur ≈ 0,92 chapado no mesmo tom.
- (linha ~1515, `<div style={{ display: 'grid', justifyItems: 'center', gap: 12, padding: 16, te…`) 6-out: a cabeça cortou nas duas tentativas com ESTA foto. Tentar de novo daria o mesmo: o recado leva a outra foto.
- (linha ~1534, `<div style={{ display: 'grid', justifyItems: 'center', gap: 14, padding: 12 }}>`) RODADA 29B (bloco 2, A) — a barra HONESTA: avança pelo tempo típico até 90%, segura em "finalizando…" e
  nunca marca 100% antes de a imagem existir. O F continua pintando em cima.
- (linha ~1573, `:`) GRUPO B 6a — enquanto o preview não gera, mostra o F a carregar e
                       não o PlayerCard. O PlayerCard é a geração ANTERIOR do cromo (DOM,
                       sem octógono, sem placa, sem o enquadramento das fases 3.2x–3.4x):
                       usá-lo aqui fazia o utilizador ver, por instantes, um cromo
                       visivelmente diferente do final — um salto, não um carregamento.
                       VAGA 3 — o Início deixou de o usar (mostra este mesmo cromo,
                       composto); o PlayerCard só sobrevive na LandingPage.
- (linha ~1666, `{/* GOLDEN — mina encantada VIVA no preview: poeira de diamante a z3,`) FASE 3.31 — Névoa REMOVIDA no fundo Épico: o facetado é gráfico,
                          não atmosférico; a bruma por cima embaçava o lapidado. As
                          partículas (chuva) ficam — dão o "premium discreto" sem embaçar.
- (linha ~1745, `{!avatarEhIA && !temFoto && !fotoLocal && !uploadFoto && !gerandoIA && !erroIA…`) Trocar visual — só quando o card veste o genérico da casa: sem Brilhante E SEM FOTO.
                  RODADA 27 (25-set, conta backup no celular): com foto o card mostra a foto, o
                  genérico não aparece em lugar nenhum e o botão "não mudava nada" — era um botão
                  sem efeito. Sem foto, a escolha vale para todas as telas (Início, Ranking, Presença).
- (linha ~1763, `{/* Foto subida mas ainda sem avatar IA gerado (a foto não entra no card).`) (Faixa "Avatar IA ativo · Ver foto" removida na FASE 3.21 — a informação
              passou toda para o modal "A tua foto", aberto pelo botão Trocar foto.)
- (linha ~1766, `{gerandoIA ? (`) Foto subida mas ainda sem avatar IA gerado (a foto não entra no card).
              RODADA 17 — gerandoIA vem PRIMEIRO: fotoLocal só é limpo no sucesso/
              falha de gerarAvatarIA (não no início), então sem esta ordem as duas
              geração já em curso mostrava "Foto carregada, gere seu avatar" por
              cima do botão já dizendo "Gerando…" — duas mensagens discordando.
              HOTFIX 26 — depois vêm o envio e o erro do upload, ANTES de "Foto
              trocada": essa linha só existe depois do 200 (fotoLocal nasce lá), e
              com o upload falhando a pessoa vê o erro aqui, sob o card.
- (linha ~1775, `<div role="status" data-pintando-aviso style={{ display: 'grid', justifyItems:…`) 29H (item 59): antes era UMA linha de 11 px com as duas frases coladas (quebrava no meio, sem alinhamento). Agora o
  título numa linha, com o F, e a explicação embaixo no texto de apoio da casa (≤ 34 em, 2 linhas, centrada).
- (linha ~1802, `{(avatarEhIA || temFoto) && !fotoLocal ? (`) FASE 3.36 — Zoom saiu de cima do card: linha discreta ABAIXO, à direita.
                Mesma família visual das tabs. RODADA 28: também no card com a FOTO (ver zoomDaFoto).
- (linha ~1805, `<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center'…`) Rodada 29L (achado 131): os botões − e + tinham 24 px; o mínimo para o dedo é 44. A linha cresce para 44 e as margens negativas
  crescem junto (−13 e −15 no lugar de −4 e −6): a altura que ela ocupa na página continua a mesma (44 − 13 − 15 = 16 = 26 − 4 − 6),
  então o card e os botões de baixo não se mexem e a figurinha continua cabendo na primeira tela.
- (linha ~1830, `<div style={{ display: 'grid', gap: 4 }}>`) Trocar foto + Gerar Avatar IA (na mesma linha). Rodada 29L (achado 132): em telas estreitas demais para os dois lado a lado (320 px),
                o "Gerar" desce inteiro para a linha de baixo, em vez de estourar a tela ou partir o rótulo em duas linhas.
- (linha ~1853, `<span className="cta-gold-glow pulse-glow" style={{ flex: 1, display: 'flex' }}>`) RODADA 17 — EXACTAMENTE a receita do "Ver sorteio" (Inicio.jsx
  ~337): o glow fica no WRAPPER, em drop-shadow (filter não é
  cortado pelo clip-path); o pulso de BORDA fica no botão (essa
  metade sobrevive ao recorte a 45° do hud-corners). fig-io-btn
  continua nas duas classes só para a ALTURA: .cta-gold sozinho
  vale 46px e quebraria a linha com "Trocar foto" (40px, 34px em
  ecrãs curtos) — o par .fig-io-btn.cta-gold no app.css resolve
  esse empate de especificidade a favor da grade existente.
- (linha ~1893, `{restantesDireito > 0 ? (`) Contador de gerações restantes (RODADA 21, §7). Desde a 059 o
                  pacote do time também tem saldo (2 por jogador desde a Rodada 29A, não
                  "uma por time") — o contador passou a valer para os dois direitos.
- (linha ~1902, `</div>`) "Pode demorar até 30 segundos" (própria, sob o botão) saiu nesta
                  rodada: virou redundante e desatualizada com a mensagem nova
                  acima da linha ("Seu avatar está sendo criado… leva uns 45
                  segundos"), que já cobre gerandoIA com o tempo real do motor
                  em duas passadas. Duas legendas de tempo diferentes ao mesmo
                  tempo (30s aqui, 45s ali) confundia mais do que ajudava.
- (linha ~1910, `{/* VIRE BRILHANTE ✨ (SPEC-FIGURINHA-3 §3/§7) — o convite do card com a`) O editor da miniatura à parte ("Enquadrar", Rodada 29B) SAIU na 29H-B (item 55): o enquadramento é um só, ao
                escolher ou trocar a foto — o quadrado tracejado dentro do card, no CropModal com `miniatura`.
- (linha ~1913, `{!avatarEhIA && temFoto && !temDireitoDeGerar && brilhante ? (`) VIRE BRILHANTE ✨ (SPEC-FIGURINHA-3 §3/§7) — o convite do card com a
                FOTO para quem ainda não tem geração. Um exemplo FIXO (o modelo
                fictício da conta demo, nunca gerado na hora: gerar um exemplo
                custaria US$0,11 por pessoa que abrisse a tela). `loading="lazy"` +
                WebP no dobro do tamanho de exibição (lei do app leve, 14-set).
                RODADA 28: o "Pedir a minha" saiu daqui — a escolha agora é a grade
                de uniformes logo abaixo (cadeado → Planos). Fica o pacote para o
                dono do time: resolve o time inteiro.
- (linha ~1992, `{limiteIA ? (`) (l) 403 sem código conhecido — defensivo: hoje o motor só devolve
                EMAIL_NAO_CONFIRMADO ou SEM_DIREITO (cada um com seu próprio
                card), tratados ANTES deste no catch. Isto é o que sobra se um
                dia aparecer um terceiro — mensagem digna, nunca "limite do mês"
                (não há limite mensal desde 22-set).
- (linha ~2007, `{emailNaoConfirmado ? (`) (m) E-MAIL NÃO CONFIRMADO — gate anti-abuso (11-ago), mesma família HUD.
- (linha ~2029, `{avatarEhIA ? (`) Tab strip — SÓ com a figurinha (SPEC-FIGURINHA-3 §3). Os fundos são composição
                no card, custo zero, mas são um prêmio de quem pagou — e a foto já tem o fundo
                dela. RODADA 28: só as abas ficam exclusivas daqui; o card com a FOTO ganha a grade
                de uniformes (logo abaixo, no outro ramo), e as ações, o anúncio e os selos voltam a
                valer para os dois (desde 22-set este bloco embrulhava também o Baixar/Compartilhar,
                e o card com a foto não tinha como ser baixado nem compartilhado).
- (linha ~2070, `<FaixaRolavel className="fig-seletor-grade" envoltorioClassName="faixa-rolavel-…`) UMA linha só, scroll horizontal (nunca 2 linhas — ordem do dono). Tiles
  com largura FIXA (não fração do container) para não encolher/quebrar;
  scroll-snap para o gesto de arrastar assentar num tile de cada vez.
  Grade partilhada com a tab Uniforme (.fig-seletor-grade / .fig-seletor-tile
  em app.css) — ver nota de 15-set ali.
- (linha ~2078, `return (`) Cadeado premium (mesma regra dos kits): fundo premium + plano não pago.
  `!sel` — LEI DA REGRA JUSTA: quem já está equipado neste fundo (ficou de
  antes do gate) não vê cadeado no que já é seu; o cadeado é só para quem
  tentaria EQUIPAR agora. O gate real (escolherFundo) não muda: ao trocar
  pra outro fundo e tentar voltar, sel vira false e o cadeado aparece.
  Os 6 são de quem tem Brilhante (§4) — e este seletor só existe
  com Brilhante. Nenhum cadeado aqui desde 22-set.
- (linha ~2125, `<>`) Grade partilhada com a tab Fundo (.fig-seletor-grade / .fig-seletor-tile em app.css, nota de
  15-set). RODADA 29B: a MESMA grade nos três casos (grátis, pacote do time, Minha Figurinha) — o
  que não se pode pintar aparece com cadeado (leva à Minha Figurinha) em vez de sumir. No pacote
  já não há cartão de texto à parte ("o uniforme do time vem por conta do pacote" saiu): o
  uniforme do time é o tile aberto, e o "Refazer" virou ação pequena embaixo da grade.
- (linha ~2148, `<div style={{ display: 'grid', gap: 8 }}>`) RODADA 28 — card com a FOTO: sem seletor de fundos (o fundo é o da própria foto) e, no lugar
  do "Pedir a minha", os uniformes — o 1º liberado, os outros com cadeado (ver gradeDeUniformes).
- (linha ~2160, `{/* Rodada 29L (achado 134, decisão do dono de 3-out): "Baixar" VOLTA ao lado d…`) 3. AÇÕES — logo abaixo do painel de tiles. Mais altas (46px) que os
                botões do topo (40px) → hierarquia: topo = configurar, fundo = agir.

                VELOCIDADE 8 (16-set) — NO APP FICA UM BOTÃO SÓ. Os dois faziam
                exactamente a MESMA coisa: no nativo não existe "baixar" (o <a
                download> é ignorado pelo WKWebView), por isso tanto o "Salvar /
                compartilhar" como o "Compartilhar" caíam em salvarOuCompartilhar
                e abriam a mesma folha do sistema — a folha que já tem "Salvar
                imagem" lá dentro. Dois botões para uma ação não são uma escolha,
                são uma dúvida: a pessoa pára a decidir qual é qual, e qualquer
                que escolha vê o mesmo ecrã. Fica o dourado, à largura toda.
                Na WEB os dois continuam, porque lá são mesmo coisas diferentes:
                "Baixar" grava o ficheiro, "Compartilhar" abre o navigator.share.
- (linha ~2173, `<div style={{ display: 'flex', gap: 12 }}>`) Rodada 29L (achado 134, decisão do dono de 3-out): "Baixar" VOLTA ao lado de "Compartilhar", também no celular. A 29H (item 58)
                o tinha tirado do celular por parecer o mesmo botão; o dono quer os dois: compartilhar abre a folha do sistema (WhatsApp,
                Instagram), baixar guarda a figurinha para a pessoa (no navegador, o arquivo; no app da loja, a folha do sistema, que tem
                "Salvar imagem" — gravar direto no rolo da câmera pede um plugin nativo, que não está instalado).
- (linha ~2189, `<div className="cta-gold-glow" style={{ flex: 1, display: 'flex' }}>`) FASE 3.47 — CTA dourado partilhado com o "Assinar Pro" dos Planos:
                  gradiente, texto, altura, glow e shine vivem em .cta-gold/.cta-gold-glow
                  (app.css). O glow fica no wrapper SEM clip porque o clip-path do botão
                  cortaria a sombra.
- (linha ~2206, `<div style={{ marginTop: 18 }}>`) RODADA 12C — o anúncio entra DEPOIS da linha de ações, nunca antes
                da figurinha: esta tela é a figurinha, e uma faixa por cima dela
                venderia o lugar errado. Aqui já se rolou uma dobra, a figurinha
                foi vista e a ação principal foi tomada.
- (linha ~2214, `{selos.length ? (`) SELOS DE HONRA (Vaga 11C) — SECÇÃO PRÓPRIA full-width, ABAIXO da linha
                Baixar/Compartilhar; alcançável só por scroll (nunca empurra a 1ª dobra).
                Olhinho: mostra/oculta cada selo do cromo (máx 2; a honra fica na vitrine).
- (linha ~2256, `{modalFoto`) Modal "A tua foto" — foto actual + estado do avatar IA + carregar nova.
            Portal para o body (15-set): fixed dentro do [data-page] animado não
            confia no viewport no WebKit do iPhone — ver nota em LoadingFutty.jsx.
- (linha ~2305, `{temFigurinhaAlguma ? (`) Rodada 18 — interruptor "Mostrar minha foto" / "Mostrar minha
                  figurinha": só aparece pra quem já tem uma figurinha gerada
                  (mesmo que o card esteja mostrando a foto agora). Um toque
                  troca avatar_url na hora — a prévia abaixo segue junto.
- (linha ~2351, `<div className="hud-corners" style={{ width: '100%', background: '#0d0d12' }}>`) FASE 3.35 — moldura ADAPTATIVA: sem height fixa, o container cresce com
                   a foto (o maxHeight trava as muito altas). As barras que sobrem em
                   #0d0d12 lêem como moldura intencional, não como corte.
- (linha ~2356, `src={fotoLocal || urlImagem(urlAsset(fotoOriginal), 512)}`) Rodada 27: logo depois de trocar a foto/o enquadramento o preview é o LOCAL (o recorte
  que o servidor acabou de confirmar). Trocar só o src deixava a foto ANTIGA na tela
  até o derivado novo chegar pelo proxy.
- (linha ~2368, `<div style={{ marginTop: 14 }}>`) Estado do card — prévia ao vivo do que os outros veem (Rodada
                  18: muda na hora com o interruptor acima, sem esperar reload).
- (linha ~2411, `{historico.length ? (`) RODADA 19 — "Minhas figurinhas": até 6, miniaturas + "Usar esta"
                  (sem custo — troca avatar_url/kit_ativo, respeita card_modo).
                  Some sozinha sem histórico (conta nova, ou 057 por aplicar).
- (linha ~2448, `<div style={{ display: 'flex', gap: 8, marginTop: 16 }}>`) Duas ações (decisão do dono, 23-set): "Escolher outra foto" leva
                  ao CropModal 2:3 de sempre; "Ajustar enquadramento" reabre o
                  MESMO CropModal sobre a foto original guardada, sem upload novo.
                  A 2ª só existe havendo foto (nada para ajustar sem ela).
- (linha ~2480, `{cropFile ? (`) RODADA 19 — o mesmo CropModal do Onboarding, para "Escolher outra
            foto" (cropModo='nova') e "Ajustar enquadramento" (cropModo='ajustar');
            só o que aoConfirmarCrop faz com o resultado muda entre os dois.
- (linha ~2487, `{kitParaPintar`) RODADA 21 — "Pintar no uniforme X?" antes de qualquer geração nova
            (SPEC-FIGURINHA-3 §2). Mesmo padrão do DenunciaModal (modal-overlay/
            modal-card, portal no body); fecha ao tocar fora, igual aos outros.
- (linha ~2500, `const n = kitDoTime && kitParaPintar.id !== kitDoTime && temCredito ? (brilhant…`) Rodada 28: uniforme que não é o do pacote do time sai dos CRÉDITOS (o motor
  usa o crédito para ele) — o número é o dos créditos, não o do pacote.

## src/pages/ForgotPassword.jsx

- (linha ~25, `const redirectTo = Capacitor.isNativePlatform()`) 14-set (Android): no nativo, o link do e-mail tem de voltar pelo esquema
  custom — components/DeepLinkListener.jsx troca o code e manda para
  /alterar-password sozinho. Na web, aponta direto pra lá (era /reset-password,
  rota que nunca existiu — bug corrigido de passagem).

## src/pages/Gabinete.jsx

- (linha ~1, `import { useEffect, useState } from 'react';`) Futty v2.0 — Gabinete do Dono (/gabinete). Gabinete 2.0 (11-set,
  PAINEL-E-CUSTOS.md secção 6): substitui as duas páginas antigas (/gabinete
  com 16 secções + /super) por UMA página com 7 abas, desktop primeiro (menu
  lateral de abas à esquerda, conteúdo largo à direita, tabelas sem esconder
  colunas). No celular as abas viram scroll horizontal no topo.

  Um pedido só (GET /resumo) alimenta Visão geral/Dinheiro/Segurança/
  Registros; Pessoas & times e Anúncios usam os endpoints próprios
  (paginação e ações; campanhas com métricas ao vivo). Ajuste do dono
  (11-set): Anúncios virou aba própria (interruptor geral + interruptores
  por página + campanhas + receita), Burn & margem voltou para o fim de
  Dinheiro, e Cobertura de venda ganhou aba própria — as três saíram da
  flag MOSTRAR_AVANCADO. Só ficaram atrás dela DPAs por operador e
  Documentos & canal do titular (aba Segurança) e MRR (sem cartão próprio,
  sem fonte real ainda).
- (linha ~38, `const inp = { fontSize: 16, color: '#e8e8ef', background: 'rgba(255,255,255,.04…`) fontSize 16: abaixo disso o iPhone dá zoom ao focar (Rodada 8A, ver index.css).
- (linha ~59, `const fmtUSD = formatarUSD;`) Rodada 29Z: dinheiro do sistema em PT-BR ("US$12,34", "€7,24"), pelo helper único de src/utils/numero.js.
- (linha ~95, `const { aoMontar: montarFaixaDeAbas, esquerda: abasEscondidasEsq, direita: abas…`) Rodada 29L (achado 130): no celular as abas viram uma faixa que rola; a borda esmaece onde há mais abas escondidas.
- (linha ~164, `<div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between…`) Rodada 29L (achado 133): em 390 px o título e os dois links não cabem numa linha e cada um quebrava em duas. Agora o bloco
              dos links nunca parte ao meio (cada link numa linha só) e, sem largura, desce inteiro para baixo do título.
- (linha ~169, `<Link to="/diagnostico" style={{ fontSize: 12, color: 'var(--text-dim)', textDe…`) Rodada 28: a caixa-preta DESTE aparelho mora aqui (saiu do Perfil de todo mundo).
- (linha ~397, `const NOMES_PAGINA = {`) As telas com espaço de publicidade. Rodada 12C (16-set): entraram Resenha,
  Ranking e Figurinha — a Resenha pedia o anúncio do Início emprestado (não dava
  para ligar uma sem a outra) e as outras duas não tinham slot nenhum.
  A ordem aqui é a ordem em que aparecem na tela do dono.
- (linha ~431, `<p style={{ ...muted, marginBottom: 14 }}>`) Regra de 15-set (dono): publicidade passou a valer para todos os planos —
            Pro/Elite veem metade das oportunidades elegíveis, nunca zero. 22-set
            (SPEC-FIGURINHA-3): Free/Pro/Elite saíram das telas sem nunca terem
            cobrado nada, e ninguém tem `plan` pago hoje — na prática todo mundo
            vê. A régua de metade (services/inicio.js#metadeDasVezes) fica no
            código, dormente, para quando existirem planos pagos de anúncios.
- (linha ~509, `function SecaoDiagnostico() {`) ─── ABA 4: SEGURANÇA ────────────────────────────────────────────────────────
  VELOCIDADE 4 — relatórios que os testadores enviaram do próprio aparelho
  (Perfil → Diagnóstico). Cada linha já traz as médias; o JSON inteiro só é
  buscado quando se abre um, porque é o que tem as 50 chamadas.

  A leitura que interessa: MOTOR alto é problema nosso, no servidor; REDE alta é
  a distância a São Paulo, e essa não se resolve com código. "Na frente" é o
  tempo entre tocar numa aba e a tela real aparecer.

## src/pages/gabinete/AviseMe.jsx

- (linha ~1, `import { useState } from 'react';`) Futty v2.0 — Gabinete, aba "Avise-me" (Rodada 29B, F): quem deixou o e-mail no site para ser avisado quando o Futty
  chegar nas lojas. A contagem, de onde veio cada um (utm) e os mais recentes; "Baixar CSV" leva TODOS (para o dia do
  lançamento). O ENVIO do "chegou nas lojas" não existe ainda — é no dia do lançamento, e esta aba é a fonte da lista.
  A lista vive em `avisos_lancamento` (migração 068); sem ela a aba diz que falta aplicar.
- (linha ~15, `const dataCurta = (iso) => {`) 29I (achado 83): data de SISTEMA (quando algo aconteceu na conta/no time), lida pelo dono no Gabinete — vale o relógio de quem está olhando,
  não o fuso de time nenhum. É de propósito: o fuso do time é só para a hora de JOGO (src/utils/dataHora.js).

## src/pages/gabinete/Brilhantes.jsx

- (linha ~32, `const inp = { fontSize: 16, color: '#e8e8ef', background: 'rgba(255,255,255,.04…`) fontSize 16: abaixo disso o iPhone dá zoom ao focar (Rodada 8A).
- (linha ~35, `function fmtData(iso) {`) 29I (achado 83): data de SISTEMA (quando algo aconteceu na conta/no time), lida pelo dono no Gabinete — vale o relógio de quem está olhando,
  não o fuso de time nenhum. É de propósito: o fuso do time é só para a hora de JOGO (src/utils/dataHora.js).
- (linha ~65, `function nomeKit(id) {`) "dark-gold" → "Ouro Escuro". O catálogo é do motor (KITS_IA); o nome em português sai de utils/kitsFigurinha.js (29I, achado 91).
- (linha ~90, `const [emailCredito, setEmailCredito] = useState('');`) RODADA 21 — "Dar crédito a um e-mail": quem ainda não tem pedido nem
  crédito nenhum não aparece em nenhuma das duas listas abaixo.
- (linha ~124, `function darCreditosPorEmail() {`) RODADA 21 — mesma rota, mas SEM userId em mãos: quem ainda não pediu nada
  (0 créditos, nenhum pedido) não está em nenhuma das listas que o Gabinete
  já lê; o servidor resolve o e-mail para userId (routes/gabinete.js).
- (linha ~313, `<td style={td}>{t.jogadores ?? 0}/{t.limite}</td>`) Rodada 28: jogadores (vagas do pacote usadas, de 25) e gerações (cada um pode
                          refazer até 5) são coisas diferentes — antes "geradas" contava pessoas.
- (linha ~356, `<Secao titulo="Dar crédito a um e-mail" sub="Para quem ainda não pediu nada e n…`) ── 3. DAR CRÉDITO A UM E-MAIL — RODADA 21: quem ainda não pediu nada
            (0 créditos, nenhum pedido) não aparece em nenhuma lista acima nem
            abaixo; este é o único jeito de ativar essa pessoa. ──

## src/pages/gabinete/PessoasTimes.jsx

- (linha ~39, `const botaoTitulo = { background: 'none', border: 0, padding: 0, color: 'inheri…`) Título clicável (Rodada 29Y): o botão herda a cara do título; o navegador não a põe sozinho.
- (linha ~43, `function fmtData(iso) {`) 29I (achado 83): data de SISTEMA (quando algo aconteceu na conta/no time), lida pelo dono no Gabinete — vale o relógio de quem está olhando,
  não o fuso de time nenhum. É de propósito: o fuso do time é só para a hora de JOGO (src/utils/dataHora.js).
- (linha ~128, `function TabTeams({ showMsg }) {`) ─── SUB-ABA: EQUIPAS ────────────────────────────────────────────────────────
  Rodada 29Y: a lista sai na ordem escolhida (seletor "Ordenar por" ou clique no título). A escolha fica lembrada no aparelho
  e sobrevive a excluir/suspender/reativar: o reload só troca os dados; o critério é estado desta aba.

## src/pages/gabinete/Velocidade.jsx

- (linha ~1, `import { Link } from 'react-router-dom';`) Futty v2.0 — Gabinete, aba "Velocidade" (Rodada 28, bloco E).

  O que os aparelhos de todo mundo mediram, sem ninguém dentro: a telemetria anônima (lib/telemetria.js)
  manda, uma vez por tela por sessão, quanto a tela levou para ficar útil e quanto cada chamada ao motor
  custou. Aqui só chegam AGREGADOS (p50/p95 calculados no banco, migração 061) — nenhum evento
  individual, de propósito. p50 é a tela de sempre; p95 é a pior de cada 20.

## src/pages/Inicio.jsx

- (linha ~9, `import '../lib/alinharCard';`) Rodada 27: liga o alinhamento dos caches ao perfil (foto/genérico novo chega ao Início, Ranking, Feed).
- (linha ~47, `function diaDoJogo(iso, fuso) {`) "quinta-feira, 08/10" — o dia do jogo na pergunta do aviso de ausência. No relógio do CAMPO (fuso do time, 29I achado 83).
- (linha ~52, `function AgoraNao({ onClick }) {`) 29T-C: o "Agora não" dos lembretes sem prazo — esconde o lembrete por 7 dias neste aparelho e a fila anda (a conta está em utils/lembretes.js).
- (linha ~61, `const cromoCache = new Map();`) ----- O cromo do Início -----
  É a figurinha REAL (o mesmo canvas da /figurinha), reduzida e clicável — não o
  PlayerCard, que era a geração anterior do cromo e mostrava outra coisa.

  COMPOSTO, nunca em camadas: o teatro do studio (partículas entre o fundo e o
  jogador, luz direccional, glint a percorrer o frame) é exclusivo da /figurinha.
  Aqui o cromo é um OBJECTO, não um palco — por cima dele só a física da casa:
  bob e sway dessincronizados (7.2s/9.3s) e a sombra no chão em contra-fase. São
  as .fig-* do studio, partilhadas de propósito: já trazem o prefers-reduced-motion.

  FORMATO: retrato QUADRADO nativo (600×600, sem placa nem nome) — não o card 2:3.
  O quadrado é mais baixo, deixa a página respirar e o nome vive em texto livre por
  baixo. O card 2:3 com placa continua canónico na Figurinha e no download.

  CACHE: cada geração é um canvas 600×600 mais a descodificação do avatar e do
  stadium_bg, e o Início remonta a cada volta da bottom nav. O dataURL fica em
  módulo (sobrevive ao unmount, ao contrário de um estado) com chave = tudo o que
  mexe nos pixéis. Mudar o fundo na Figurinha muda a chave e regenera sozinho:
  não há invalidação manual para alguém se esquecer de chamar.

  VELOCIDADE 4: este Map morre quando a aba morre. O cromo guardado em
  IndexedDB (lib/cromoCache.js) é o que atravessa ABERTURAS — sem ele, toda
  abertura do app redesenhava a figurinha do zero.
- (linha ~108, `function fundoDaPrevia(fundo) {`) Presentacional: recebe o cromo JÁ gerado (dataURL) do Início.

  VELOCIDADE 4 — até 14-set a página inteira esperava o cromo estar desenhado
  para aparecer, e por isso este componente nunca precisava de um estado
  intermédio. Agora é o contrário: a tela aparece primeiro e o cromo chega
  quando fica pronto, então há um instante sem ele. Esse instante é preenchido
  com a própria foto da pessoa (`previa`), no mesmo sítio e no mesmo tamanho —
  sem isso a tela nascia com um buraco quadrado no meio, que é pior do que
  esperar. Sem avatar IA o canvas já veio com o genérico da casa desenhado (ver
  `jogadorCard` em Inicio()) — não há overlay de convite: o card em si é o
  convite (rodízio 31-jul).
  O fundo do cromo, em CSS, para a prévia. Os que têm asset usam o MESMO
  ficheiro que o canvas desenha (e com o mesmo enquadramento: `cover` ancorado a
  22% do topo é o biasTopo do retrato quadrado). Os desenhados ficam pela base —
  o honeycomb do Épico é alpha 0.065 e não se distingue num placeholder.
- (linha ~134, `const PRAZO_AVATAR_MS = 1500;`) A PRÉVIA — o cromo inteiro composto em DOM, pronto na primeira pintura.
  O avatar é medido e posicionado com a conta do canvas (enquadrarAvatar), em
  percentagens: assim os dois põem o jogador no mesmo sítio e a troca da prévia
  pelo cromo desenhado não salta.

  RODADA 12A (16-set) — a composição entra INTEIRA, num quadro só.

  Até aqui a moldura dourada pintava no primeiro quadro e o avatar entrava
  depois, no onLoad: no aparelho isso é uma moldura vazia à espera de uma cara,
  e foi o que o Pedro viu no build 21. Agora nada da composição vai à tela antes
  de a imagem estar DECODIFICADA — decode(), não onLoad: o onLoad garante os
  bytes, não os pixéis prontos a desenhar, e é entre um e outro que o WebKit
  segura o quadro. Até lá fica só a área reservada com o fundo escolhido: o
  mesmo lugar, o mesmo tamanho, sem forma pela metade.

  Se a foto não chegar em PRAZO_AVATAR_MS, a composição aparece na mesma com a
  silhueta da casa (SVG, não espera rede nenhuma) e a foto entra quando chegar.
  Uma espera sem fim não é transição, é defeito — a mesma lição da Velocidade 5.
- (linha ~154, `const INSET_DO_ANEL = 1.75;`) RODADA 27 — o anel dourado da prévia: o conteúdo mora `inset: 1.75%` dentro dele (app.css,
  .cromo-previa__dentro), que é o corpo grosso do frame do canvas (7*k, k = lado/400).
- (linha ~255, `const PISO_NOME = 9;`) Nome por baixo do cromo, em texto livre grande (o quadrado não o traz baked). Base
  44px; encolhe até caber numa linha, como o nome da figurinha (29T, achado 164: o piso de 28px
  cortava "Chavo, el matad…" no computador — agora a letra desce até o nome caber, em qualquer
  largura). Só como defesa teórica há um piso (PISO_NOME) e, abaixo dele, a reticência.
  A medição é impura (scrollWidth) → useLayoutEffect, antes do paint, para o utilizador não
  ver um salto de tamanho. Reajusta em resize e quando as fontes carregam (a Rajdhani mede
  diferente da fallback).
- (linha ~297, `color: '#f0c94a',`) Sem forçar maiúsculas (29I, achado 94): o nome sai como a pessoa escreveu, igual à Resenha e ao resto do app.
- (linha ~320, `const soOrganizo = game.eu_jogo === false;`) Rodada 29B (E): só organiza este time — não responde presença
- (linha ~350, `<span className="gcard__title">`) Achado 84: o card inteiro abre a tela do jogo. Link de verdade (abre em nova aba, dá para copiar o endereço): o <a> está
                no título e a camada que cobre o card é o ::after dele (.gcard__link, app.css) — os botões "Vou / Não vou" e "Ver sorteio"
                ficam por cima (z-index) e continuam funcionando sem abrir o jogo. Sem botão dentro de <a>.
- (linha ~383, `<span className="cta-gold-glow pulse-glow" style={{ display: 'flex', marginTop:…`) RODADA 13 — ver o sorteio é A ação do card: dourado forte,
                  largura total, nada mais no card compete (chips e bordas ficam
                  nos tons apagados). Mesmo par de sempre para o clip a 45°: o
                  glow no wrapper (drop-shadow atravessa o recorte), o
                  .pulse-active no botão (a metade dele que anima a borda
                  sobrevive ao clip-path).
- (linha ~390, `<button type="button" className="btn hud-corners cta-gold pulse-active" style={…`) Achado 88: tocar e não ver nada por vários segundos parecia botão quebrado. Agora o botão responde NA HORA ("Abrindo…",
                    apagado, sem tocar duas vezes) e a tela abre pelo roteador, sem recarregar o app inteiro.
- (linha ~466, `const navigate = useNavigate();`) Rodada 29B (A): quem tocou em "Criar conta e entrar" no convite passou pelo cadastro e chegou aqui — o bilhete que a
  página do convite deixou no aparelho a devolve ao convite (uma vez só; sem bilhete, nada acontece).
- (linha ~470, `const onboardingCompleto = me?.user?.onboarding_completo;`) Rodada 29H (item 1): o bilhete só é tomado por conta que JÁ terminou o onboarding. Antes, uma conta nova do Google/Apple que
  caía aqui por um instante (a trava do onboarding só a manda para /onboarding no mesmo ciclo) tinha o bilhete tomado e era
  levada à página do convite sem foto e sem nome — e o Onboarding abria sem saber do convite.
- (linha ~480, `const inicio = useInicio();`) Início (11-set): 1 pedido só (GET /api/inicio, via Layout.jsx que monta o
  InicioProvider só nesta rota) alimenta jogos, RSVP, campeonato, pedidos,
  votações pendentes, desfechos de denúncia e o anúncio — em vez dos ~9
  pedidos que esta página disparava em paralelo. As AÇÕES (confirmar
  presença, ausência, etc.) continuam a ir direto à API de sempre.
- (linha ~488, `const [cromo, setCromo] = useState(null);`) O cromo é gerado AQUI (não dentro do CromoInicio) porque o Início é quem
  sabe o avatar, o fundo e o nome. VELOCIDADE 4: já NÃO segura a página —
  começa a null, a tela aparece na mesma, e ele entra quando estiver pronto
  (do IndexedDB na hora, ou do canvas um segundo depois).
- (linha ~501, `const { aoMontar: montarFaixaDeChips, esquerda: chipsEscondidosEsq, direita: ch…`) Rodada 29L (achado 138): a faixa de chips de time rola; a borda esmaece onde há mais, e o "Várzea FC" cortado deixa de parecer erro.
- (linha ~509, `const [dobInput, setDobInput] = useState('');`) Pedido ÚNICO de data de nascimento (Opção B): sem ela, o /p/ cai em silhueta e o anúncio 18+
  nunca aparece (a idade manda; o app é 18+, Rodada 29G). Banner não-bloqueante e dispensável.
- (linha ~514, `const [agoraNaoDeles, setAgoraNaoDeles] = useState(() => lembretesEscondidos([.…`) 29T-C: o "Agora não" dos lembretes sem prazo (figurinha para gerar, recado, uniforme, card, data de nascimento — e a figurinha que não saiu) esconde o
  lembrete por 7 dias NAQUELE aparelho (utils/lembretes.js, com try/catch) e a fila anda. O estado guarda o mesmo para a tela atual, mesmo sem localStorage.
- (linha ~554, `const [abrindoSorteioId, setAbrindoSorteioId] = useState(null);`) "Ver sorteio": a cerimónia corre na PÁGINA do sorteio (SPEC-SORTEIO §13d).
  Achados 88 e 89: antes a tela abria por um recarregamento da página — o app INTEIRO de novo (vários segundos, sem indicador nenhum). Agora navega
  pelo roteador (como o botão "Sortear" da tela do jogo já fazia) e o botão mostra "Abrindo…" no mesmo instante do toque. Sem state
  `euSorteei`: quem só vai ver o resultado abre com o som desligado (regra da casa, 16-set).
- (linha ~578, `async function onPresence(gameId, going) {`) Presença com estado otimista + chamada à API (Rodada 29I, achado 86): o botão escolhido acende e o contador de confirmados
  mexe NA HORA; se o pedido falhar, volta ao estado de antes e diz o que fazer.
  Devolve como acabou: true (valeu), false (falhou e a tela voltou ao que era) ou 'espera' (o jogo estava cheio). O aviso do topo usa isto
  para dizer "Presença confirmada" só quando valeu.
- (linha ~633, `async function responderDoAviso(gameId, going) {`) O "Vou / Não vou" do aviso do topo (29T): a mesma chamada dos cards; só acrescenta a confirmação, porque o aviso some assim que a resposta vale.
- (linha ~641, `const nome = nomeExibicao(user);`) a regra única do nome (nome de jogador → nome completo → "Jogador"; nunca o e-mail) — 29I, achado 94
- (linha ~643, `const cromoAvatarEhIA = mostraFigurinha(user);`) Figurinha IA no card agora? Quem diz é o motor (Rodada 28, mostraFigurinha) — mesma regra da Figurinha.
- (linha ~650, `const [figurinhaSessaoMarcada, setFigurinhaSessaoMarcada] = useState(() => {`) Figurinha automática do cadastro (12-set): o Onboarding dispara a geração
  em fundo e marca o sessionStorage; aqui o Início mostra "criando..." em vez
  do CTA normal, com polling de /api/me até sair de 'gerando'. O sessionStorage
  cobre o instante entre o disparo e o /api/me confirmar 'gerando' — sem ele o
  usuário veria o CTA normal piscar por 1 beat antes do estado de loading.
- (linha ~663, `const figurinhaGerando = figurinhaStatus === 'gerando' || (figurinhaSessaoMarca…`) RODADA 17 — `&& !user?.avatar_url` saiu: só cobria o cadastro (1ª figurinha
  de todas, sem avatar_url nenhum ainda). Numa TROCA de foto/uniforme
  (Figurinha.jsx, gerarAvatarIA) o usuário já tem avatar_url — o antigo — e
  essa condição bloqueava o marcador exactamente no caso que ele existe para
  cobrir: navegar para o Início enquanto a geração ainda corre, antes de o
  /api/me fresco confirmar 'gerando'. O marcador continua a sumir sozinho
  (linhas abaixo) assim que figurinhaStatus sai de 'gerando' — nunca fica
  preso mostrando "sendo criada" para sempre.
- (linha ~711, `const [sheetAvatarAberto, setSheetAvatarAberto] = useState(false);`) Escolha do avatar genérico (31-jul): undefined = usa o que veio do servidor;
  definido = override otimista local (PATCH em curso ou já confirmado).
- (linha ~721, `if (me?.user) hidratarPerfil({ ...me, user: { ...me.user, avatar_generico: key…`) Achado 4: o PerfilContext partilhado aprende a escolha — outras páginas (Perfil, Figurinha,
  Ranking) que leem o avatar genérico sem override próprio ficam frescas. RODADA 27: sem reler o
  /api/me inteiro (a escolha é o que o PATCH acabou de gravar); o hidratar também alinha os
  caches do Ranking e do Feed com o genérico novo (lib/cacheCard.js).
- (linha ~733, `useEffect(() => {`) Gera o cromo assim que o user existe. corFrame/zoom são os defaults FIXOS da
  Figurinha — divergir dava dois cromos diferentes para o mesmo utilizador.

  VELOCIDADE 4 — a ordem passa a ser: memória → IndexedDB → canvas. Só se
  chega ao canvas (o passo de um a três segundos no celular) quando não há
  nada guardado, ou quando a composição mudou. Nada disto segura a tela.
- (linha ~755, `` const chave = `q${cromoFundo === 'aura' ? '2' : ''}|${modoCromo}|${jogadorCard.… ``) O modo entra na chave: a mesma pessoa com a mesma foto desenha DUAS
  coisas diferentes antes e depois de ter Brilhante, e servir o cromo
  errado do cache seria o bug de 22-set outra vez, por outra porta.
  29H-B: a aura mudou de desenho (dobro do tamanho, −25% de opacidade) — a chave dela muda, senão o IndexedDB servia o cromo antigo.
- (linha ~770, `let desenhou = false;`) VELOCIDADE 5 (14-set) — o cromo não pode depender de ninguém para sempre.
  No iPhone da loja apanhámos o placeholder desfocado eternamente: o
  lerCromo() do IndexedDB não tinha prazo e, com o WebKit a travar a base
  (outra aba a segurar o upgrade, modo privado, disco a responder mal), a
  promessa nunca assentava — e como o desenhar() estava DENTRO do .then(),
  o canvas também nunca corria. Uma otimização de cache a segurar a coisa
  que ela devia acelerar.

  Agora quem manda é o relógio: passados 400 ms sem resposta do cache,
  desenha-se na mesma. Perde-se o atalho, nunca a figurinha.

  FLUIDEZ 2 (16-set) — o canvas deixa de esperar o aparelho PARAR.

  A Velocidade 8 pô-lo atrás do `quandoParado` (3 s sem tocar na tela)
  porque compor era de um a três segundos de thread principal. Isso resolvia
  o engasgo e criava outro: o relatório do build 20 mostra a travada de
  6402 ms aos 82 s — o cromo a compor quando a pessoa finalmente parou, ou
  seja no pior momento possível, já depois de ter desistido de esperar.

  Agora compor custa ~100 ms e é fatiado (ver figurinhaCanvas), por isso o
  certo é o contrário: começar CEDO, dois quadros depois da primeira
  pintura. Dois quadros porque o primeiro ainda cai antes do desenho e o
  segundo já corre com a tela na frente — o mesmo critério da marcação da
  pintura em lib/diagnostico.js. Os atalhos (memória e IndexedDB) continuam
  imediatos: é deles que vem o cromo instantâneo de quem já abriu o app.
- (linha ~818, `const fimDaTarefa = tarefaEmCurso('cromo:compor');`) Rodada 12A: enquanto o canvas compõe, qualquer quadro perdido fica
  anotado com esta tarefa. É o que faltava à travada de 5,7 s do build 21.
- (linha ~854, `const vigia = setInterval(() => {`) Rede de segurança: se ao fim de 4 s A DESENHAR ainda não há cromo no ecrã,
  foi o próprio canvas que não chegou ao fim (decodificar avatar e fundo é o
  passo caro). Fica registado para se ver no Gabinete — é a diferença
  entre "o cromo demora" e "o cromo não vem".

  Velocidade 8: a vigia conta a partir do INÍCIO do desenho, não da montagem
  — agora o canvas espera o aparelho parar, e contar da montagem daria um
  alarme falso sempre que a pessoa estivesse a mexer na tela.
- (linha ~892, `const proximosJogos = filtered.filter((g) => g.status !== 'finished');`) Achado 8: "Próximos Jogos" só mostra o que ainda vai acontecer (nem encerrado
  nem cancelado); o que já passou vai para "Últimos jogos" (máx. 3, mais recente
  primeiro — a lista vem ordenada por data ascendente).
- (linha ~901, `async function definirAusencia(novo) {`) Aviso de ausência ao próximo jogo (declaração proactiva, sem RSVP).
  Rodada 8A: "Não vou ao próximo jogo / Afinal vou" lia como ESTADO, não como
  ação. Agora o botão diz o que faz ("Avisar que não vou"), pergunta antes, e
  depois fica a faixa "Você avisou que não vai · Desfazer". O servidor já
  fazia o resto: quando o admin abre o RSVP, quem avisou entra como "Não vou"
  (routes/rsvp.js), e a marca zera quando o resultado do jogo é lançado.
- (linha ~934, `const proximoSoOrganizo = proximoJogo?.eu_jogo === false;`) O RSVPCard do próximo jogo está na tela (e com ele o Vou / Não vou).
  Rodada 29B (E): quem só organiza o time não responde presença — nem o cartão, nem o aviso de ausência.
- (linha ~946, `const jogoDoRsvpId = (dadosInicio?.convites?.games || []).find((g) => g.status…`) O que o card do próximo jogo mostra enquanto o RSVP está aberto (29I, achado 86): UM número só — os confirmados do RSVP, que é
  o que o "Vou" grava — e a resposta da pessoa. `minhaResposta` já inclui o estado otimista; o número parte do que o motor
  contou e soma/tira a diferença entre a resposta de agora e a que o motor conhecia. Sem RSVP aberto vale o que o motor mandou.
  O RSVP que o motor mandou é o do 1º jogo não encerrado de TODOS os times; com um chip de time escolhido o "próximo" da tela pode
  ser outro jogo — aí o RSVP não é dele, e o card dele fica com o que o motor contou para ele.
- (linha ~982, `const semDadosPorErro = !!inicio.erro && !dadosInicio;`) RODADA 28 (bug visto 25-set no Chrome): com a sessão morta o /api/inicio devolvia 401 e o Início
  dizia "Bem-vindo, crie seu time" a quem TEM time. "Sem time" só depois de uma resposta que diga
  isso; falha sem dado nenhum é erro com "Tentar de novo" (e 401 já vai para o login, lib/api.js).
- (linha ~988, `const destinoCromo = noTeams`) Rodada 12C: para onde o cromo leva. A vitrine vive DENTRO de um time (a
  rota é /time/:slug/jogador/:id), por isso só existe com time e com
  sessão carregada; até lá, a Figurinha continua a ser um destino honesto.
- (linha ~1021, `const jogosParaAviso = (games || []).map((g) => (rsvpValeParaOJogo(g.id)`) Rodada 29T (achado 168): UM aviso por vez no topo, o mais importante primeiro (a fila inteira, montada logo abaixo, depois dos estados de cada aviso).
  O aviso do jogo não segue o chip de time: quem tem jogo esperando resposta o vê em qualquer filtro. Para o jogo do RSVP a resposta de agora é a
  do RSVP (a otimista inclusive).
- (linha ~1047, `const cardSemFoto = !meLoading && !!user && !user.foto_url;`) Rodada 29T-B (ajuste da Freaky, 4-out): TODOS os avisos do topo numa fila só, um por vez (utils/avisosDoInicio.js tem a ordem: jogo sem resposta →
  pedido pendente → votação → figurinha pronta → os demais → ativar notificações por último). Cada um mantém a regra de "vale agora" que já tinha;
  o que mudou é que só o primeiro da fila aparece, e fechar ou resolver faz entrar o próximo.
- (linha ~1051, `const aviso = proximoAviso({`) 29T-C: primeiro o que aconteceu ou tem prazo, depois os lembretes sem prazo (cada um com o "Agora não" de 7 dias), por último ativar notificações.
- (linha ~1085, `{aviso?.tipo === 'jogo' ? (`) Rodada 29T (achado 168): UM aviso por vez, o mais importante primeiro. O que pede ação sobe; o resto é consulta.
- (linha ~1132, `<RolinhosData id="inicio-nascimento" onChange={setDobInput} />`) 29H (item 3): rolinhos dia · mês · ano, como no cadastro e no onboarding.
- (linha ~1164, `{p.status === 'approved' && p.team?.slug ? (`) Rodada 29D: quem foi aceito entra no time como primeira entrada (abre as boas-vindas do time).
- (linha ~1201, `{aviso?.tipo === 'figurinha-nascendo' && aviso.item.estado === 'gerando' ? (`) Figurinha automática do cadastro (12-set) e QUALQUER geração daqui em
              diante (RODADA 17: troca de foto/uniforme dispara o mesmo marcador,
              ver figurinhaGerando acima) — enquanto a IA gera em fundo, mostra a
              foto da pessoa com um brilho dourado passando em vez do CTA normal —
              sem isso pareceria que nada está acontecendo por ~45s (motor em duas
              passadas, 22-set).
- (linha ~1226, `<span style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#f8b4b4', lineHeight…`) Texto neutro (14-set): 'falhou' também cobre IA_INDISPONIVEL (motor
                  recusado pela fal, nada a ver com a foto) — "tente outra foto" seria
                  enganoso nesse caso.
- (linha ~1294, `{aviso?.tipo === 'card' && aviso.item.variante === 'sem-foto' ? (`) CARD PERSISTENTE — sem FOTO não há cromo: moldura V1 vazia + convite.
              Sem X: persiste até haver foto (a estratégia "quase-obrigatória" do
              onboarding dia-1).
              22-set: a condição passou de `!user.avatar_url` para `!user.foto_url`.
              Quem tem foto já tem figurinha (a comum) — continuar a pedir "complete
              sua figurinha" a quem acabou de a completar era o convite a mentir.
- (linha ~1334, `<CromoInicio cromo={cromo} previa={previaCromo} modoPrevia={modoDoCromo} fundo=…`) RODADA 12C — o cromo abre a VITRINE, não a oficina.
                  O cromo é o retrato da pessoa como jogadora; o destino natural
                  de tocar nele é a página que mostra o que ela fez (nota, gols,
                  conquistas), a mesma que se abre pelo avatar no Ranking. Editar
                  a figurinha continua a um toque, na aba Figurinha da barra de
                  baixo. Sem time não há vitrine (ela vive dentro de um time): aí
                  o destino é a Figurinha, e sem conta nenhuma, criar o time.
- (linha ~1358, `{teams[0] && !(dadosInicio?.seu_time || []).length ? (`) Com o card "Seus times" logo abaixo, o nome do time sai daqui: o card já diz o time (29N, decisão da Freaky).
- (linha ~1378, `<CardSeuTime seuTime={dadosInicio?.seu_time || []} teams={teams || []} games={g…`) Rodada 29N: embaixo do avatar, decisão do dono. Era a primeira coisa da página (29I, bloco 3: o card "Seu time", só para
              quem administra algum time — o Dashboard do painel do admin); o olho da pessoa cai no avatar, não no topo (achado 146).
- (linha ~1390, `<AtalhosDoInicio />`) Rodada 29Q: o Radar de peladas e o Criar time à vista, logo embaixo do "Seus times" (ou do avatar, quem não administra
                  time). Eram os dois últimos chips da fila, onde ninguém chegava (dono, 4-out).
- (linha ~1426, `</div>`) Rodada 29Q: a fila é só o filtro dos jogos por time. "Criar time" (29H, item 62) e "Radar de peladas" (29P) saíram daqui
                    para os dois cartões acima (<AtalhosDoInicio />).
- (linha ~1436, `{proximoJogo && proximoJogo.team_slug && !rsvpAbertoNoProximo && !proximoSoOrga…`) Aviso de ausência (Rodada 8A). Com o RSVP aberto para ESTE jogo, some
                  — o card acima já tem Vou / Não vou, e é a resposta dele que vale.
- (linha ~1482, `{!loadingGames && ultimosJogos.length > 0 ? (`) Achado 8: jogos já encerrados saem do "Próximos Jogos" e ficam aqui,
                  no máximo 3, mais recente primeiro.

## src/pages/JogadorPerfil.jsx

- (linha ~41, `function fmtLongo(iso, fuso) {`) A data de cada jogo do histórico é a do CAMPO (fuso do time, 29I achado 83).
- (linha ~110, `` const { data, loading, error } = useApiComCache(`/api/teams/${slug}/jogador/${u… ``) RODADA 12C — a vitrine deixa de nascer em branco a cada visita.

  Com o cromo do Início, o botão do Perfil e os autores da Resenha a abrirem
  esta tela, ela passou de "uma visita por sessão, vinda do Ranking" a um
  destino frequente — e cada abertura pagava a ida inteira a São Paulo antes
  de mostrar o que já se sabia. Chave por time+jogador: a vitrine do João não
  pode pintar com os dados da Maria enquanto a resposta dela não chega.
- (linha ~205, `` <Topbar hud="PERFIL" back="voltar" backFallback={`/time/${slug}/ranking`} /> ``) Rodada 12C: volta para onde a pessoa estava (Início, Resenha, Perfil,
            Ranking…). O Ranking fica como destino de quem abriu o link direto e
            não tem histórico para desfazer.
- (linha ~229, `{/não é membro/i.test(error) ? (`) 29I (achado 97): "só entre companheiros" é a resposta ao 403 do motor (quem não é do time) — não a de qualquer erro.
                  A própria pessoa nunca cai aqui por falta de time; e um tropeço de rede não pode dizer que o perfil "não está acessível".
- (linha ~302, `{selos.length ? (`) 2b. SELOS DE HONRA (Vaga 11C) — todas as honras (ativas + históricas).
- (linha ~340, `<div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 7…`) Achado 119 (29J): era "--" aqui, "—" e "--" nos tiles ao lado — três formas pro mesmo "sem nota
  ainda" já dito (bem) no cabeçalho desta página (linha 272). Uma mensagem só, no lugar dos três.

## src/pages/Jogo.jsx

- (linha ~36, `const LINK_DISCRETO = { minHeight: 44, padding: '0 4px', border: 'none', backgr…`) Os dois links discretos de "Trocar os times" (29S): texto sublinhado com área de toque de 44 px de altura.
- (linha ~85, `const [montando, setMontando] = useState(false);`) 29S: a composição à mão aberta (quem confirmou + os convidados da tela) e o POST dos times em curso.
- (linha ~142, `` const confirmar = (confirmado, goleiro) => runAction(`/api/games/${id}/confirma… ``) `goleiro` omitido = o motor decide (o que já estiver marcado neste jogo ou,
  se ainda não houver, a flag de goleiro do time — Rodada 9).
- (linha ~149, `SomSorteio.prepararNoGesto();`) 29H-B: este toque é o único gesto de quem sorteia antes de a cerimônia tocar os efeitos (segundos depois, de temporizadores).
  No site (Safari) o áudio só toca destravado por um gesto; o app da loja não tem a regra. Síncrono, antes do primeiro await.
- (linha ~161, `` navigate(`/time/${slug}/jogo/${id}/sorteio`, { state: { euSorteei: true } }); ``) A cerimónia corre na PÁGINA do sorteio (SPEC §13d). `euSorteei` (Rodada
  12A) diz à cerimónia que quem chega ali acabou de pedir o sorteio — é a
  única vista que pode nascer com som. Vai no state da navegação, não na
  URL: o link partilhado nunca pode trazer isto colado.
- (linha ~173, `async function salvarTimes(corpo) {`) Montar à mão (29S): o motor grava os times direto (sem seed, sem cerimônia, sem avisar ninguém) e exige que quem tem conta esteja confirmado —
  por isso o pool é quem confirmou (mais os convidados sem app desta tela). Presença já está marcada: não há "presenças" a mandar antes.
- (linha ~203, `const soOrganizo = rsvpEstado?.eu_jogo === false;`) Rodada 29B (E): o motor diz (rsvp.eu_jogo) se a pessoa só organiza o time — aí não há presença a confirmar.
- (linha ~208, `const nomeTimeA = nomeDoTimeNaTela(timesSorteio[0]?.nome, 0);`) Achado 143 (29M): o placar também chama os times pelo nome da cerimônia ("Time Ouro × Time Roxo"), não pelo "Time A" do motor.
- (linha ~303, `<div className="header-actions">`) Rodada 29L (achado 142): era um chip "Ranking" solto, sem dizer o que era nem de quem. Agora diz: "Ranking do time", com o troféu.
- (linha ~325, `<span style={{ fontFamily: RAJ, color: 'var(--presenca-sim-texto)', fontWeight:…`) Rodada 12A: o verde saturado saiu — quem está confirmado
                        veste o dourado da casa, como o "Vou" do card de jogo.
- (linha ~457, `<div data-convidado-titulo style={{ fontFamily: RAJ, fontSize: 15, fontWeight:…`) 29Q: os textos vêm de utils/convidadoSemApp.js, os mesmos do Novo jogo e do Campeonato.
- (linha ~488, `{isAdmin && game.sorteio_realizado && (confirmacao === 're-sorteio' || confirma…`) Trocar os times de um jogo que JÁ tem times (29S): os dois caminhos pedem confirmação antes, no padrão inline de sempre ("sair da
                  equipa"). Texto em PT-BR: o replay só entra na frase quando havia sorteio (tem seed); os times à mão não têm replay.
- (linha ~515, `{isAdmin && montando ? (`) SEM TIMES ainda (29S, achados 151 e 152): "Como vão sair os times?" e dois cartões lado a lado — Sortear (a máquina, como sempre) ou
                  Montar à mão (a pessoa escolhe, com quem confirmou). Só o Sortear pulsa, com a regra de sempre (RODADA 12A: gente para dois times).
- (linha ~548, `{isAdmin && game.sorteio_realizado && !montando && confirmacao !== 're-sorteio'…`) Trocar os times (29S): discreto, embaixo. Sortear de novo ou Montar à mão — os dois pedem confirmação antes (acima).

## src/pages/JogoPassado.jsx

- (linha ~1, `import { useEffect, useRef, useState } from 'react';`) Futty v2.0 — Jogo passado (/time/:slug/jogo/passado, só admin). Rodada 29S, bloco B (achados 153 e 154).
  Um jogo que já rolou, em quatro passos — Quando foi · Quem jogou · Times · Como terminou — TUDO NO PASSADO. O jogo SÓ É GRAVADO NO FIM
  ("Salvar jogo"): quem desiste no meio não deixa um jogo vazio para trás. Antes, "Continuar → montar" gravava o jogo no primeiro passo.

  Cada passo é UMA entrada do histórico (location.state.passo), como no Criar time (achado 80): o Voltar do sistema (Alt+seta, o gesto do Android,
  o swipe do iPhone) e o chevron do topo recuam um passo por vez. O que a pessoa preencheu fica nesta página: voltar a um passo não apaga nada.

  "Salvar jogo" grava em sequência (utils/jogoPassado.js#planoDoJogoPassado): POST /api/games (historico: true) → presenças → (com times) times à mão
  → (com resultado) resultado do jogo → (com campeão ou prêmio) resultado do feed. Se um pedido falha no meio, a pessoa fica no passo 4 com o aviso e
  "Tentar de novo" continua de onde parou, sem criar outro jogo (executarPlano guarda o progresso).
  Avisos: presença e times não avisam ninguém. O último pedido avisa o time ("Resultado registrado!"), como hoje quando o admin lança qualquer resultado.
  Fotos e rodada de cerveja ficam de fora: dá para pôr depois, em Ajustes → Jogos.
- (linha ~118, `const passoDoEndereco = Number(location.state?.passo) || 1;`) ── Os passos no histórico (achado 80) ───────────────────────────────────────────────────────────────────────────────────────────
  `passo` não é um useState: vem da entrada do histórico em que a pessoa está (location.state.passo). Entrada de passo 2 em diante sem data
  (a entrada sobreviveu a um recarregar, o formulário não) volta ao 1. Com o jogo já criado (um pedido falhou no meio) é sempre o 4: voltar a
  um passo e mudar quem jogou não mudaria o que já foi gravado.

## src/pages/Jogos.jsx

- (linha ~1, `import { Link, useParams } from 'react-router-dom';`) Futty v2.0 — Lista de jogos do time (cânone, transversal lote 1). O corpo é o components/ListaDeJogos.jsx — o MESMO da aba Jogos da
  página do time (Rodada 29I, bloco 3). "Voltar" volta para onde a pessoa estava (histórico); sem histórico, a página do time.

## src/pages/LandingPage.jsx

- (linha ~1, `import { useState } from 'react';`) Futty v2.0 — Boas-vindas (rota "/") para visitantes não autenticados.
  Tela ÚNICA sem scroll (decisão 31-jul): o F oficial com a aura da casa, o slogan, a frase do que o app faz e as portas de
  entrada. As secções antigas (figurinha/como-funciona/planos/CTA final) morreram — quem quer saber mais entra. O bloco
  "Avise-me" (29B) saiu na 29P: a página inicial já é a de verdade; a lista de e-mails continua no Gabinete.
- (linha ~17, `const [tamanhoF] = useState(() => (typeof window !== 'undefined' && window.inne…`) O F ganha a tela (29P): em tela curta (iPhone SE) encolhe para tudo continuar numa tela só.
- (linha ~58, `<div`) O miolo fica centrado como sempre; o rodapé legal (29I, achado 76) desce para o pé da tela.
- (linha ~91, `<p className="texto-apoio" style={{ margin: '-6px 0 0', maxWidth: 310, fontSize…`) Rodada 29O: o nome e o que o app faz, para quem chega sem ler nada (é o que o Google pede para verificar a marca).
- (linha ~163, `<footer data-rodape-legal style={{ width: '100%', maxWidth: 320, margin: '0 aut…`) Rodapé legal (Rodada 29I, achado 76): as lojas pedem a Privacidade acessível SEM precisar de conta, e o aviso dos 18 anos
              tem de estar antes do cadastro, não só dentro dele. As duas páginas já existem (/termos, /privacidade). Discreto: letra
              pequena, cor apagada, um link por palavra, sem ocupar o lugar dos botões.

## src/pages/Login.jsx

- (linha ~29, `const [aviso] = useState(() => {`) RODADA 28 — avisos curtos, uma vez só: a sessão acabou sem a pessoa pedir (AuthContext: 401 do
  motor, refresh recusado) ou o cadastro parou nos 18 anos (Onboarding: o motor apagou a conta).
  A marca só é LIDA aqui e apagada no efeito, depois de a tela montar: o Login chega por import
  dinâmico e o React 19 renderiza-o duas vezes antes de fixar a tela (medido na cena rodada28) —
  apagada na 1ª renderização, a 2ª, que é a que fica, nascia sem o aviso.
- (linha ~60, `useEffect(() => { preaquecerOnboarding({ convidado: temConvitePendente() }); },…`) Rodada 29H (item 4): quem entra pelo Google/Apple numa conta nova cai no onboarding — o chunk e as 8 figurinhas dele já vêm.

## src/pages/MeuPerfil.jsx

- (linha ~1, `import { useRef, useState } from 'react';`) Futty v2.0 — Perfil (/perfil): a página mais pessoal — define como o
  utilizador aparece em todo o lado. Mobile-first, dark theme.

  VAGA 2 (B2) — a página entra no cânone: topbar HUD (a mesma da Figurinha e dos
  Planos), cantos a 45° em vez do radius 12, Rajdhani no que é estrutura.
- (linha ~14, `import '../lib/alinharCard';`) Rodada 27: liga o alinhamento dos caches ao perfil (foto/genérico novo chega ao Início, Ranking, Feed).
- (linha ~69, `function LinhaMeuTime({ time, meuId, semBorda, aoErro }) {`) Rodada 29A (G): uma linha de "Meus times" — o time e a escolha "Você joga na linha/no gol · trocar".
  Lê o time pela MESMA chave de cache da página do time (`team:<slug>`), então as duas telas nunca discordam;
  depois de gravar, recarrega essa chave. O estado (`goleiro`) vem de team_members.categoria, no motor.
- (linha ~91, `<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-bet…`) Rodada 29Z (item 3e): a linha quebra — o nome do time ocupa a linha de cima e "Jogo na linha | No gol" desce, quando os dois não cabem
  lado a lado (em 360 px o nome ficava com 16 px e virava "D…"); e o nome quebra em duas linhas em vez de ser cortado.
- (linha ~94, `` <Link to={`/time/${time.slug}`} data-meu-time={time.slug} style={{ minWidth: 0,… ``) 29I, bloco 3: cada time leva à página dele (o admin acha lá a aba Ajustes).
- (linha ~113, `const { perfil: perfilCtx, carregando: perfilCarregando, erro: erroCtx, recarre…`) Achado 4 (roteiro 10-set): /api/me vem do PerfilContext partilhado — carregado
  1x por sessão, em vez desta página o pedir 2x por conta própria (como fazia).
- (linha ~117, `const [perfil, setPerfil] = useState(perfilCtx);`) Rodada 29I, bloco 3: o "Painel de administração" saiu daqui — admin não é um lugar. Cada time de "Meus times" leva à página do time,
  onde o admin tem a aba Ajustes (e o resto do que era o painel, nas abas Jogos e Elenco).
- (linha ~134, `const { data: blocksData, reload: reloadBlocks } = useApiComCache('/api/blocks'…`) Bloqueio entre jogadores (Apple UGC 1.2): lista de quem EU bloqueei.
  Velocidade 6B: entra no mesmo stale-while-revalidate do resto da casa — a
  lista de bloqueados quase nunca muda, e o pré-aquecimento já a trouxe.
- (linha ~146, `const [sheetExcluir, setSheetExcluir] = useState(false);`) Excluir conta (LGPD/exigência das lojas, 14-set).
- (linha ~151, `const confirmacaoOk = confirmacaoExcluirValida(confirmExcluir);`) Rodada 29A: "excluir", "Excluir " e "EXCLUIR" valem (o teclado do iPhone corrige a palavra).
- (linha ~182, `window.location.href = 'mailto:contato@futtyapp.com?subject=Problema%20no%20Fut…`) Rodada 28: suporte@futty.app era um domínio que não é nosso — o e-mail da casa é o dos Termos.
- (linha ~224, `recarregarPerfil();`) Achado 4: invalida o PerfilContext partilhado depois de salvar — as outras
  páginas (Início, Figurinha, guards) deixam de ver dados velhos.
- (linha ~250, `return (`) FASE 3.53 — era o shell da página com o título + <p>Carregando…</p>, e lia-se
  como "branco + texto". Passa ao padrão único: só o F, sem título nem legenda.
  O ramo de ERRO mantém a página com título — aí o utilizador precisa do contexto.
- (linha ~266, `const vitrineSlug = teams[0]?.slug || null;`) O `creditos` (avatar_ia_creditos) saiu com o teaser de IA — só ele o lia.
  Rodada 12C: o time principal (o primeiro da lista) é o que dá a vitrine —
  com mais de um, é o mesmo critério que o Início já usa para o campeonato.
- (linha ~318, `{vitrineSlug ? (`) RODADA 12C — a vitrine de jogador, a um toque.
              Estas três estatísticas aqui em cima são o resumo do que a vitrine
              mostra inteiro (radar, conquistas, histórico, evolução). Até aqui só
              se chegava lá pelo avatar de outra pessoa no Ranking — a própria
              vitrine, que é a que interessa mostrar aos amigos, não tinha porta.
              Só com time: a vitrine vive dentro de um (/time/:slug/jogador/:id).
- (linha ~395, `<button`) OUTLINE ROXO RECUADO. Percurso, para quem vier a seguir:
                era .btn--purple (roxo cheio, rgba(124,58,237,0.18) + borda --purple) e,
                depois de tudo à volta assentar, passou a ser o bloco mais saturado da
                página — disputava o primeiro olhar com o nome de jogador, que é o hero.
                Recuou até rgba(139,92,246,0.07) com texto branco e aí passou ao extremo
                oposto: sumia. É a única acção da secção Dados; tem de se perceber que se
                clica. Meio-termo: fundo transparente, borda 1.5px e o texto a levar a
                cor — assim lê-se como botão sem voltar a gritar.
                NÃO vai para .cta-gold: um segundo dourado a berrar tinha o mesmo
                problema ao contrário, e a Lei dos Gémeos não ganha um 4º irmão por isto.
                #a78bfa e não #b69cff: o segundo não é --purple nem --neon, não existe na
                paleta, e é um dos órfãos que esta vaga varreu — reintroduzi-lo aqui era
                reabrir o que se acabou de fechar. O #a78bfa é o roxo recuado que a Vaga 1
                fixou nos links da auth: mesma leitura, dentro da casa.
- (linha ~467, `<SecLabel>Meus times</SecLabel>`) SECÇÃO MEUS TIMES (Rodada 29A): a escolha linha/gol de cada time, à vista. Antes só existia num chip
              dentro da página do time e o dono não a achou. Vale para os sorteios de cada time.
- (linha ~480, `<Link to="/criar-time" className="btn btn--purple-outline hud-corners" data-cri…`) Rodada 29H (item 62): criar o próprio time sempre à mão, com ou sem time (a seção aparece mesmo vazia).
- (linha ~544, `<SecLabel>Notificações</SecLabel>`) SEÇÃO NOTIFICAÇÕES (29I, bloco 3): neste aparelho (ligar/desligar o push) e, por tipo, o que você quer receber.
- (linha ~576, `{souSuperAdmin ? (`) RODADA 28 — o Diagnóstico saiu daqui: o número de todo mundo vem da
                telemetria anônima; a tela ficou para o super-admin, dentro do Gabinete.
- (linha ~697, `{sheetExcluir ? createPortal(`) Bottom sheet "Excluir conta" — mesmo padrão do sheet de idioma (portal
            para o <body>, painel encostado em baixo; ver nota longa acima de
            sheetIdioma sobre o porquê do portal). Fechar por fora fica ativo
            mesmo aqui: é reversível até o clique em "Excluir de vez".
            Rodada 29A: com o teclado aberto a folha não some — o painel nunca passa de
            100dvh, o texto rola dentro dele e o botão fica num rodapé que não rola.
- (linha ~819, `fontSize: 16,`) abaixo de 16 o iPhone dá zoom ao focar (Rodada 8A, ver index.css)

## src/pages/NovoJogo.jsx

- (linha ~1, `import { useState } from 'react';`) Futty v2.0 — Marcar jogo (/time/:slug/jogo/novo, só admin).
  Rodada 29S, bloco A (achados 151 a 156): a página abre DIRETO no "Marcar jogo" — um jogo que vai acontecer. Saíram os três chips (Sortear /
  Times à mão / Já aconteceu): COMO os times se formam (sorteio ou à mão) é uma decisão do JOGO, depois das confirmações (Jogo.jsx).
  No topo, o "ingresso" do jogo se preenche enquanto a pessoa digita; a hora nasce em 20:00 (ou na hora do último jogo do time, se já está em
  cache); "Só neste jogo" aparece em ROXO. "Jogo passado →" é uma linha discreta embaixo do botão.
  Bloco B: o "Jogo passado →" leva ao passo a passo (/time/:slug/jogo/passado, pages/JogoPassado.jsx) — o destino mora em utils/novoJogo.js
  (caminhoDoJogoPassado), um ponto só. O modo antigo "Já aconteceu" (?passado=1) e a fase de montar saíram daqui: um link antigo para esta
  página abre o Marcar jogo.
- (linha ~24, `const ROXO = '#8b5cf6';`) O roxo do "Só neste jogo" (achado 156): o que vale só para este jogo se distingue do padrão do time.
- (linha ~38, `const [horaDigitada, setHoraDigitada] = useState(null);`) A hora nasce em 20:00 (achado 155) — ou na hora do último jogo do time no fuso do time, se os jogos do time já estão em cache (o do Início):
  nenhum pedido novo só para isso. `null` = a pessoa ainda não mexeu; a sugestão vale até ela digitar.
- (linha ~44, `const [porTime, setPorTime] = useState(null);`) Item 68 (Rodada 29): jogadores por time é UM padrão do time (Ajustes) — o jogo já nasce com ele, dobrado em "Padrão do time: 5 ·
  mudar só neste jogo". `porTime` null = o padrão (o motor usa o do time); com número, vale só para este jogo (ROXO, achado 156).
- (linha ~59, `const iso = instanteNoCampo(data, hora, team?.fuso);`) 29I (achado 83): a data e a hora digitadas são as do CAMPO (fuso do time), não as do aparelho de quem cria o jogo — o admin
  em Lisboa que marca "quinta 20:00" para um time de São Paulo está marcando 20:00 de São Paulo.
- (linha ~87, `<form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.03)', bo…`) Rodada 29Z (item 3e): a coluna do cartão é `minmax(0, 1fr)`, não a implícita `auto` — a `auto` cresce até o conteúdo mínimo (dois
              campos de data e hora lado a lado, 327 px) e, num celular de 360 px (caixa de 310), o recorte de 45° do cartão cortava 17 px à
              direita: sumia o fim de "Hora do jogo", a borda do campo Local e a do botão "Criar jogo". Data e hora ficam lado a lado só se
              cada uma tem 146 px (o "12/10/2026" em Rajdhani 18 px precisa disso; medido: a 133 px a primeira letra some); senão, uma por linha.
- (linha ~100, `<label htmlFor="hora" style={ROTULO_COM_ICONE}><Clock size={15} aria-hidden="tr…`) 29I, bloco 3 (dono): "Hora do jogo" — nunca "fuso". O rabicho (a cidade do time, só para quem está noutro relógio) mora no ingresso, ao lado da hora.
- (linha ~137, `<p data-jogo-passado style={{ textAlign: 'center', margin: '8px 0 0', fontSize:…`) A porta do outro caminho. Importância menor (dono, 4-out): uma linha discreta, nunca um cartão do mesmo peso do botão.

## src/pages/Onboarding.jsx

- (linha ~1, `import { Suspense, lazy, useEffect, useRef, useState } from 'react';`) Futty v2.0 — Onboarding dia-1 (3 passos): boas-vindas → FOTO (quase-obrigatória)
  → identidade. Só para REGISTOS NOVOS (o Register navega para cá; contas antigas
  nunca passam aqui). Pede SÓ o que o dia-1 usa — equipa entra-se/cria-se no Início.
  Foto: selfie (capture="user") OU galeria → CropModal da casa (2:3, ENQUADRAMENTO ÚNICO da 29H-B: o quadrado tracejado da
  miniatura dentro do card) → POST /api/me/avatar → PUT /api/me/avatar/enquadro (lib/miniatura.js, best-effort). A foto nunca é
  espelhada (item 54): aparece como foi tirada.
  "Deixar para depois" só aparece aos ~2s (29H); quem salta leva o card persistente no Início.
  RODADA 28/29G: quem chega sem data de nascimento (Google/Apple não a trazem) passa
  por "Quando você nasceu?" ANTES da foto. Menor de 18: o motor apaga a conta e o login explica.
  RODADA 29D (dono): o passo 1 ganhou o mini sorteio ao vivo (MiniSorteio.jsx) e o ícone do app no lugar do F solto;
  RODADA 29E (dono): o ícone de volta a 110 px flutuando, figurinhas fictícias caindo em dois times no mini sorteio, textos da landing.
  RODADA 29H (item 1): quem chega por um convite (bilhete no aparelho: lib/convitePendente.js) NÃO vê a página "Começar": a
  1ª página é a boas-vindas DO TIME (BoasVindas, variante convidado: "Você foi convidado para o <time>. …", linha/gol, "Vamos
  lá") → foto → nome → o time (o convite é aceito aqui, no fim; sem passar de novo pelo Início nem pela página do convite).
  A escolha linha/gol vale depois de entrar. Convite que morreu (apagado, vencido) vira cadastro comum.
  29H (item 3): "Quando você nasceu?" em rolinhos dia/mês/ano (RolinhosData). 29H (item 4): o Register/Login aquecem o chunk
  e as 8 imagens desta página (lib/preaquecerOnboarding.js).
- (linha ~76, `function MolduraFoto({ src, size = 170 }) {`) Moldura V1 grande — vazia (gancho) ou, com a foto subida, o CARD 2:3 como ele vai ficar (29H-B): o quadrado tracejado da
  miniatura por cima (o mesmo do enquadramento único) e, ao lado, a miniatura na moldura real do app. O arquivo que subiu É o
  recorte 2:3: a janela da miniatura é o quadrado do topo (recorteDaMolduraUnica), sem adivinhar posição nenhuma.
- (linha ~138, `const ultimoRecorteMini = useRef(null);`) 29H-B: o quadrado tracejado desse blob, gravado depois de a foto subir
- (linha ~189, `async function subirRecorte(blob, extra) {`) O CADASTRO NÃO GERA NADA (SPEC-FIGURINHA-3 §3, 22-set). A figurinha que
  nasce aqui é a COMUM: a foto da pessoa na moldura, custo zero, pronta no
  instante em que a foto sobe. A geração automática de IA de 12-set saiu —
  era o item mais caro do app a nascer de graça em cada cadastro (US$0,11),
  para quem talvez nunca pagasse. A Brilhante passa a ter dono: crédito
  comprado ou pacote do time (não há mais presente de quem cria time).

  O que ficou no lugar: nada. Não há o que esperar, por isso também não há
  marcador de "gerando" nem retry de FOTO_DESATUALIZADA — a trava de hash
  continua no motor, mas só a Brilhante passa por ela.
- (linha ~214, `const recorteMini = ultimoRecorteMini.current;`) 29H-B: o quadrado tracejado vira a miniatura de verdade (users.avatar_recorte). Best-effort e sem segurar a tela: a foto já
  subiu; se o motor ainda não tem a migração 070, a miniatura segue na regra de sempre.
- (linha ~226, `async function confirmarNascimento() {`) RODADA 28/29G — "Quando você nasceu?". Quem decide é o motor (PATCH /api/me): 18 anos ou mais, a data
  fica e segue para a foto; menos de 18, ele apaga a conta (403 MENOR_DE_18) — aqui só se sai do
  aparelho, e o login diz "O Futty é para maiores de 18 anos."
- (linha ~255, `async function concluir() {`) Fim: nome de jogador (PATCH /api/me). A pergunta "Você é goleiro?" saiu do
  cadastro (Rodada 8A, decisão do dono): o sorteio só usa game_players.goleiro,
  marcado na confirmação de presença (Jogo.jsx, "Sou goleiro (GR)") ou pelo admin.
- (linha ~264, `const fresco = await recarregarPerfil();`) 14-set ("Velocidade 3"): recarrega o PerfilContext AQUI — busca o
  /api/me fresco e regrava o cache local — antes de navegar. Sem isto, a
  navegação dura remontava o Layout com o cache local AINDA velho e a
  gate mandava de volta para /onboarding num loop sem fim.
- (linha ~269, `const base = fresco || perfil;`) VELOCIDADE 5 (14-set) — CINTO E SUSPENSÓRIO. A causa raiz do loop era
  outra: o cache de SESSÃO do backend (middleware/auth.js, TTL 60s)
  continuava a devolver onboarding_completo:false ao /api/me de cima —
  corrigido lá (routes/auth.js chama invalidarSessaoDoPedido depois do
  updateUserById). Mas esta tela não pode voltar a depender de o /api/me
  vir certo para conseguir sair: aplica-se onboarding_completo:true por
  CIMA do que quer que o fresco tenha respondido, otimista, e hidratar()
  já regrava o cache local com ele. Se o backend um dia voltar a servir
  stale, é esta linha que impede o loop — não o inverso.
- (linha ~280, `window.location.assign((deConvite && (await aceitarConvite())) || '/home');`) 29H (item 1): o convite do bilhete é aceito AQUI — a pessoa cai direto no time, que ela já viu nas boas-vindas. Se o
  convite falhar (venceu entre uma tela e outra), o bilhete fica e o Início a leva à página do convite, que explica.
- (linha ~284, `if (e.code === 'MENOR_DE_18') {`) Rodada 29G: data de menor de 18 que veio do cadastro por e-mail — o motor apagou a conta.
- (linha ~332, `<div style={{ fontFamily: RAJ, fontSize: 15, fontWeight: 700, letterSpacing: '0…`) Rodada 29E (dono): uma voz só — o mesmo subtítulo da landing (a pontuação final é o item 26 e vale para os dois).
- (linha ~337, `<div className="cta-gold-glow" style={{ display: 'flex', justifyContent: 'cente…`) Rodada 29E2 (dono): o CTA dourado da casa (o "Vamos lá" das boas-vindas) — 50 px, máx. 290, 24 px de respiro
                  acima e abaixo. O glow vive no wrapper porque o clip dos cantos cortaria o drop-shadow (ver .cta-gold no app.css).
- (linha ~361, `<RolinhosData id="onb-nascimento" onChange={(v) => { setNascimento(v); setErroN…`) 29H (item 3): rolinhos dia · mês · ano, sem ano futuro, teto ano atual − 18.
- (linha ~377, `<p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', margin…`) 31-jul (dono): metade do texto, sem "cara" (no BR é rude — usa-se rosto).
- (linha ~409, `<button`) "deixar para depois" — surge aos ~2s (29H, item 5; era ~4 s). Escondido até lá (visibility), para um toque
                      antes da hora não valer; o convite do Início continua até haver foto.

## src/pages/Planos.jsx

- (linha ~1, `import { Fragment, useEffect, useRef, useState } from 'react';`) Futty v2.0 — Brilhantes (/planos): os três produtos da Figurinha Brilhante.

  SPEC-FIGURINHA-3 (22-set): Free/Pro/Elite saíram — nunca chegaram a cobrar
  nada e prometiam "avatares IA por mês" num modelo que a casa abandonou. No
  lugar ficam três compras de uma vez só (pacote do time, manto próprio, minha
  Brilhante), cuja tabela vive em lib/planos.js.

  PAGAMENTOS P2 (26-set) — duas maneiras, nunca misturadas na mesma tela:
    · LOJA LIGADA (o motor diz `loja_pronta`, é o app nativo e o SDK do RevenueCat tem a chave —
      lib/loja.js#lojaLigada): o botão diz "Comprar · R$9,90", com o preço que a LOJA formata, e
      abre a folha de compra da App Store / Google Play. Depois da compra a tela pede ao motor para
      conferir (sincronizar) e mostra o que chegou; o pacote abre a escolha do uniforme do time.
    · SEM LOJA (a web, ou a loja desligada no motor): o botão NÃO diz "em breve" nem fica
      desativado — cria um pedido de ativação de verdade, que o dono resolve no Gabinete. A regra da
      casa é que o botão diga a verdade — e "a gente ativa e avisa" é verdade.
- (linha ~33, `const SWAY_DUR = { pacote: '7.1s', manto: '9.7s', minha: '8.3s' };`) FASE A — durações do sway por card. Não partilham divisores comuns úteis, por isso as
  três oscilações nunca caem em fase: a página respira em vez de pulsar em bloco.
- (linha ~66, `function dataCurta(iso) {`) 29I (achado 83): data de COMPRA (do sistema), no relógio de quem olha — o fuso do time é só para a hora de jogo.
- (linha ~115, `function aplicarEstado(novo) {`) Guarda o estado novo na tela e no Início guardado (Rodada 27: a Figurinha nasce dele).
- (linha ~214, `const timeNovo = (novo?.times || []).find((t) => t.id === time?.id);`) Sem uniforme, ninguém do time gera: a escolha abre na hora (achado do P1).
- (linha ~270, `<div`) ATMOSFERA — partículas douradas atrás dos cards. Reusa .fig-particle/futtyFall
            da figurinha; o container leva containerType:size (o keyframe usa cqh).
            FASE 3.57 — durações ×1.45 (média 10.3s → 15.0s, ~86 → ~59 px/s): com o dobro
            das partículas e +50% de tamanho, a mesma velocidade lia-se agitada.
            AFINAÇÃO — a contagem e o tamanho recuaram, mas as durações FICAM: a queda
            lenta é o que faz isto ler-se como atmosfera e não como confete.
- (linha ~297, `<p className="texto-apoio texto-apoio--centro" data-planos-apoio style={{ margi…`) 29H (item 60): duas frases, duas linhas — antes eram uma só, quebrando no meio. A palavra "IA" fica: a figurinha
                é arte gerada por IA e a casa diz isso (VOZ §3).
- (linha ~303, `{!ehNativo() ? (`) Achado 110 (29K): no site os cartões aparecem sem preço e sem "Comprar" — certo, o preço é
                da loja e só existe no app nativo —, mas sem isto ninguém entende por quê.
- (linha ~337, `if (p.soDono && !meusTimes.length) return null;`) 29H (item 60): o pacote e o manto são DO TIME — só aparecem para quem é dono de um (antes apareciam para todo mundo,
  trancados com "Só para quem criou um time", sem explicar do que se tratava). A seção ganha título e uma linha de apoio.
- (linha ~368, `background: 'rgba(255, 255, 255, 0.03)',`) FASE 3.63 — MATERIAL DE CARD DO CÂNONE: o véu do Perfil, extraído
  dos valores computados reais dessa página. Não é escuro translúcido
  (era rgba(13,13,18,0.45) + blur 4px até à 3.57) — é um VÉU BRANCO a
  3%, sem blur nenhum: o card não tapa o fundo, tinge-o. As partículas
  passam a ver-se mais, não menos.
  O radius 12px do Perfil NÃO vem junto: os cantos são os 45° do
  .hud-corners. O Perfil é candidato a vaga; o que se herda dele é o
  material, não o que nele viola o cânone.
- (linha ~399, `<span className="hud-corners-s" style={{ fontFamily: "'Rajdhani', sans-serif",…`) FASE 3.49 — cantos 45° (.hud-corners-s) em vez do radius-pill:
  era o último elemento redondo órfão da linguagem HUD.
- (linha ~407, `{p.preco ? (`) FASE 3.63 — text-shadow SÓ no preço. O véu de 3% quase não escurece,
                      por isso o texto assenta no fundo variável da página. Medido: features
                      (branco 0.8) e nome passam em todos os cenários (mín. 5.88); o preço
                      #d4a017 sobre o pico do blob DOURADO cai a 3.42 — dourado sobre
                      dourado, abaixo do AA 4.5. A sombra devolve-lhe a leitura sem mexer na
                      opacidade do card.
                      P2: o preço é o que a LOJA formatou (priceString) — só existe com a loja ligada.
- (linha ~504, `return (`) FASE A — SUSPENSÃO. Os três cards ganham sombra no chão + sway; só o Pro
  faz bob, e só a sombra dele responde em contra-fase.

  A ordem das camadas mudou face à 3.40, por física: antes a sombra vivia
  DENTRO do .planos-bob e subia com o card — uma sombra que acompanha o
  objecto não é sombra, é decalque. Agora o wrapper exterior é estático, a
  sombra fica no chão, e só o card sobe por cima dela.

## src/pages/Privacidade.jsx

- (linha ~1, `import { Link } from 'react-router-dom';`) Futty v2.0 — Política de Privacidade (/privacidade). Página legal, PT-BR, sem
  login. Versão final para uso (31-jul): sem aviso de revisão jurídica, sem nome
  de pessoa física (identificação do responsável mediante solicitação; trocar por
  razão social + CNPJ quando a empresa for constituída), sem travessões, com as
  seções novas: transferência internacional, backups, registros de moderação e
  alterações da política.
  v2 (13-set): infraestrutura real (Cloud Run São Paulo + Cloudflare, não mais
  Railway/Vercel), Resend e Sentry na lista de fornecedores, exclusão de conta
  pelo próprio app (Perfil → Conta) como via principal.
  v3 (25-set): sem pagamento por enquanto; o item da Apple / Google fica em CLAUSULA_PAGAMENTO_FUTURA.
  v4 (25-set, Rodada 28): diagnóstico de desempenho anônimo (telemetria de velocidade, sem vínculo com a
  identidade) e a idade mínima dita no cadastro.
  v5 (26-set, Pagamentos P2): compras no app. A loja (Apple / Google) processa o pagamento e o Futty nunca vê
  o cartão; o RevenueCat entra na lista de fornecedores; guardamos só transação, produto, valor, moeda e data.
  A CLAUSULA_PAGAMENTO_FUTURA (o item Apple / Google) voltou, revista, à seção 3.
  v6 (1-out, Rodada 29G): o Futty é para maiores de 18 anos. A seção 5 virou "Idade mínima" (o número vem
  de IDADE_MINIMA, utils/idade.js) e a de menores de 13 / proteções de menores saiu.

## src/pages/Ranking.jsx

- (linha ~30, `const marcarImagem = () => marcarInstante('imagem');`) Diagnóstico (Rodada 8A): a 1ª imagem da tela que terminou de carregar.
- (linha ~33, `function FrameAvatar({ avatarUrl, userId = null, avatarGenerico = null, size =…`) Moldura de avatar do cânone (V1): quadrado + cantos-L dourados + interior no material
  da casa + véu. Moldura única da página — rows, pódio e modal partilham-na.
  Sem foto nem figurinha, mas com identidade (userId), mostra o avatar genérico que a pessoa ESCOLHEU —
  o mesmo da Presença, da Equipa e do Início — e nunca a silhueta "?" (Rodada 27: o Ranking ignorava a escolha).
- (linha ~103, `<div className="rank-votes" style={{ marginTop: 4, fontSize: 12 }}>`) Rodada 29I (achado 95): a ordem do ranking é por PONTOS (o `score` 0–100 do motor: vitórias, gols, destaques, presença e
                nota), e a tela só mostrava a nota — que não acompanha a posição (1º 10.0, 2º 8.7, 3º 9.3…) e fazia o ranking parecer
                quebrado. Agora o número que ordena aparece, rotulado "pontos", com a nota ao lado.
                Rodada 29Z: nunca mais reticências. Os pontos e a nota são dois grupos que não se partem por dentro; se os dois não cabem na
                mesma linha (celular de 360 px, o botão "Alterar" ao lado), a nota desce para a segunda linha — e o "·" que os separava
                fica de fora (ver .rank-votes no CSS). O "você deu / por votar" só aparece onde há folga: o botão ao lado já diz o mesmo.
- (linha ~146, `function ListaRanking({ ranking, children }) {`) A lista. O useLayoutEffect corre no commit, antes do desenho: é o instante
  "lista commitada" do Diagnóstico (Rodada 8A) — daí até a pintura, o tempo é do
  navegador (estilo, layout, desenho), não dos dados. `ranking` muda de identidade
  quando a resposta fresca substitui a do cache: esse commit é a "lista nova".
- (linha ~190, `const EstatisticasDoTime = lazyComRetry(() => import('./AdminPanel').then((m) =…`) Rodada 29I, bloco 3: as estatísticas do time (eram a aba Estatísticas do painel do admin) moram no Ranking do time, só para o admin, e
  só são baixadas quando ele abre (o mesmo chunk das abas do admin na página do time).
- (linha ~201, `const linhasADesenhar = useListaProgressiva(ranking, ranking.length > 15 ? 10 :…`) VELOCIDADE 8 (16-set) — listas grandes pintam em duas levas. As 10 primeiras
  são as que cabem na tela (e são as caras: o pódio leva moldura, glow e
  flutuação); o resto entra dois quadros depois. Os relatórios do iPhone dão
  1389, 1866 e 2121 ms para pintar esta tela com 23 linhas.
  Só divide acima de 15 linhas: abaixo disso a 1ª leva é a lista toda e o hook
  devolve-a inteira à primeira — dividir o que já cabe num quadro só
  acrescentava um quadro de espera.
- (linha ~209, `const { ad: adRanking, pronto: adPronto } = useAd('ranking');`) Rodada 12C: o anúncio é pedido no topo da tela, em paralelo com o ranking —
  o mesmo motivo da Resenha (ver useAd): montado no meio da lista, o pedido
  dele só partiria depois de a lista inteira ter pintado.
- (linha ~231, `useEffect(() => {`) Confetti uma vez se o utilizador estiver no pódio (top 3). Velocidade 7B: sai
  400 ms depois de a lista estar na tela — criar o canvas de tela cheia e o
  worker do confetti no mesmo instante da primeira pintura disputava-a.
- (linha ~276, `{equipaAtual && teams.length <= 1 ? (`) Cabeçalho: escudo + nome da equipa actual. Achado 96: com mais de um time os chips logo abaixo JÁ dizem qual é o atual
                  (o ativo é o dourado, com escudo e nome) — o título repetia o mesmo nome em cima do chip. O nome do time aparece UMA vez:
                  no título quando há um time só (não há chips), no chip ativo quando há vários.
- (linha ~329, `<p className="texto-apoio" data-ranking-criterio style={{ margin: '0 0 12px' }}>`) Quanto vale cada coisa: uma linha, no topo, para a ordem não parecer defeito (achado 95). Texto pela régua da VOZ.
- (linha ~335, `idx === 2 ? (`) RODADA 12C — o anúncio entra DEPOIS do pódio: o top-3 é a
  razão de a pessoa abrir esta tela, e nada se mete entre o
  primeiro e o terceiro. Da 4ª linha em diante já é lista, e
  aí a faixa cabe sem atravessar o assunto.
- (linha ~348, `{ranking.slice(linhasADesenhar.length).map((p, i) => (`) RODADA 12A — as linhas que ainda não montaram ficam como
                      esqueleto, nunca como espaço vazio. A lista entra de 5 em 5
                      (useListaProgressiva) e até aqui quem rolava depressa via a
                      lista acabar a meio e voltar a crescer — lê-se como defeito,
                      não como carregamento. O esqueleto tem a altura exata da
                      linha, por isso a rolagem já nasce do tamanho certo e nada
                      salta quando a linha real ocupa o lugar.
- (linha ~356, `` <div key={`esqueleto-${p.user_id}`} className={`rank-row-esqueleto ${i < 6 ? 'r… ``) Só os primeiros respiram. Todos reservam a altura — é para
  isso que existem —, mas animar 50 camadas com clip-path para
  sempre, num time grande, é carga contínua na tela que esta
  rodada quer desafogar. Os que estão fora do alcance da
  rolagem não têm quem os veja piscar.
- (linha ~385, `{voteModal && createPortal(`) Modal de votação (meias estrelas). PORTAL para o body (Rodada 8A): dentro
            do [data-page], o transform da animação de entrada vira o "chão" do
            position:fixed e o modal centrava-se na PÁGINA inteira, não na tela — com
            a lista rolada ficava fora de quadro e a barra de baixo por cima do véu.

## src/pages/Register.jsx

- (linha ~36, `useEffect(() => { preaquecerOnboarding({ convidado: temConvitePendente() }); },…`) Rodada 29H (item 4): a próxima parada é o onboarding — o chunk e as 8 figurinhas dele vêm a caminho enquanto a pessoa digita.
- (linha ~47, `const acabouDeCadastrar = useRef(false);`) Rede de segurança para "já está autenticado": cobre chegar aqui já logado
  e o login nativo pela Apple/Google, cuja sessão nasce de um evento fora
  desta tela (a folha da Apple; o appUrlOpen do Google — este já navega
  sozinho no DeepLinkListener, mas o efeito é reforço).

  Rodada 29H (item 4): quem ACABOU de criar a conta (cadastro com sessão imediata) vai a /onboarding — e não a /home. Antes,
  o evento de sessão chegava depois do navigate('/onboarding') do envio e este efeito mandava para /home (medido: 60 ms
  depois); o Início era carregado (chunk grande + /api/inicio) só para a trava do onboarding devolver a pessoa a /onboarding
  quando a resposta chegava. Era essa a demora da página 1 (medida: ~3,8 s; o Onboarding em si pesava ~0,3 s).
- (linha ~82, `if (menorQueIdadeMinima(birthdate)) {`) Rodada 29G: abaixo de 18 anos a conta não é criada — nem chega ao Supabase.
- (linha ~252, `<RolinhosData id="birthdate" onChange={setBirthdate} rotulo="Data de nascimento…`) Rodada 29H (item 3): rolinhos dia · mês · ano, sem ano futuro e com teto ano atual − 18 (RolinhosData.jsx).
                    A data acima do teto (último ano, mês/dia depois de hoje) mostra a frase da casa no envio.

## src/pages/SorteioCurto.jsx

- (linha ~1, `import { Link, Navigate, useParams } from 'react-router-dom';`) Futty v2.0 — O link curto do sorteio, futtyapp.com.br/s/<código> (Rodada 29I, bloco 3, item 74 da Rodada 29). Sem login, como a vista
  pública: pergunta ao motor para onde o código leva (GET /api/s/:codigo) e abre a página de sempre, /p/<slug>/<id do jogo>, no lugar
  (replace: o "Voltar" do navegador não cai de novo aqui). O link longo continua valendo.

## src/pages/SorteioPublico.jsx

- (linha ~21, `` const { data, loading, error, reload } = useApi(`/api/p/${gameId}`); ``) Achado 120 (29J): `error` tem de sair distinto de "ainda não aconteceu" — mesma
  regra do SorteioShow (a página com login), para a vista pública não repetir o erro.
- (linha ~27, `const quandoOnde = quandoOndeDoJogo(data?.jogo, data?.equipa);`) Achado 112 (29K): a página mostrava o time, a cerimônia e os times — e mais nada. Quem recebe
  o link no grupo não descobria quando nem onde é o jogo, que é o que foi ali procurar.
- (linha ~30, `const [verCerimonia, setVerCerimonia] = useState(false);`) Achado 114 (29K): quem chega pelo link do grupo quer ver os times, não assistir a cerimônia
  inteira (+20s). Aqui o resultado já vem montado; "Ver sorteio" é a cerimônia, pra quem quiser.

## src/pages/SorteioShow.jsx

- (linha ~27, `const [euSorteei] = useState(() => !!location.state?.euSorteei);`) Rodada 12A: só quem chegou aqui pelo botão "Sortear" traz isto (ver Jogo.jsx).
  Lido UMA vez e apagado do histórico a seguir: o state vive na entrada do
  histórico, e voltaria a valer se a pessoa recuasse e avançasse, ou se o
  WebView recarregasse a rota ao retomar o app — som ligado sem ninguém ter
  tocado em "Sortear", que é o oposto do que a regra diz.
- (linha ~37, `` const { data, loading, error, reload } = useApi(`/api/games/${id}`); ``) Achado 120 (29J) — REGRESSÃO: um erro de rede/sessão aqui caía no MESMO `!resultado`
  do sorteio nunca feito, e a tela dizia "ainda não foi realizado" com o sorteio
  intacto no banco. `error` distingue os dois agora (como Jogo.jsx já fazia).
- (linha ~43, `const [codigoCurto, setCodigoCurto] = useState(null);`) Item 74 (29I, bloco 3): o link curto do sorteio (/s/<código>), pedido assim que a página abre — a cópia sai na hora do toque.
- (linha ~60, `const dataCartaz = game?.data`) A data do cartaz é a do CAMPO (fuso do time, 29I achado 83): "8 out 2026".
- (linha ~120, `<CerimoniaSorteio`) RODADA 14B — compartilhar vive DENTRO da cerimónia, logo abaixo do
                  retângulo dos times: um botão dourado com a imagem dos dois times e
                  uma linha discreta com o 9:16 de cada um. É o único lugar: a barra
                  presa ao fundo da 12A (que cobria o retângulo) e os "Salvar" /
                  "Compartilhar" que a máquina tinha embaixo saíram.
- (linha ~134, `{jaTerminou ? (`) RODADA 12A — o espaço de publicidade da página do sorteio: IAB
                  320×100, servido com pagina='sorteio' (toggle do dono no
                  Gabinete, filtro etário fail-closed no servidor). Só depois da
                  cerimónia: durante ela a tela é para olhar. Sem campanha o
                  AdCard devolve null e não fica buraco nem promessa na tela.
- (linha ~153, `Quem abrir o link vê o mesmo sorteio, do mesmo jeito, sem precisar do app.`) Achado 145 (29M): a "semente" é o nosso nome técnico do número que torna o sorteio reproduzível; para quem joga não quer dizer nada.
                      A ideia é o que vale: quem abrir o link vê o mesmo sorteio, do mesmo jeito.

## src/pages/Super.jsx

- (linha ~1, `import { Navigate } from 'react-router-dom';`) Futty v2.0 — /super vira só um redirect (Gabinete 2.0, 11-set). O conteúdo
  (usuários, times, denúncias) mudou-se para a aba "Pessoas & times" de
  /gabinete — ver src/pages/gabinete/PessoasTimes.jsx. Esta rota fica para não
  quebrar links/favoritos antigos.

## src/pages/Termos.jsx

- (linha ~1, `import { Link } from 'react-router-dom';`) Futty v2.0 — Termos de Uso (/termos). Página legal, PT-BR, sem login.
  Versão final para uso (31-jul): sem aviso de revisão jurídica, sem travessões,
  com as cláusulas de proteção novas (fotos de terceiros, uso aceitável, créditos,
  limitação de responsabilidade, lei e foro).
  25-set: §7 sem cobrança por enquanto; o texto anterior fica em CLAUSULA_PAGAMENTO_FUTURA.
  26-set (Pagamentos P2): §7 volta a falar de compras. A CLAUSULA_PAGAMENTO_FUTURA, revista para os
  produtos de hoje (compras avulsas e consumíveis pela App Store / Google Play, sem assinatura), entrou
  no lugar do "7. Cobrança" e saiu do comentário.
  1-out (Rodada 29G): o Futty é para maiores de 18 anos. §2 traz a cláusula de idade (o número vem de
  IDADE_MINIMA, utils/idade.js), §7 perde o aviso de responsável e §8 diz que o anúncio 18+ depende da data.

## src/styles/app.css

- (linha ~16, `top: env(safe-area-inset-top, 0px);`) env(), não 0 (14-set, VELOCIDADE 5): o padding-top da casca (Layout.jsx)
       só acerta a posição INICIAL, antes de rolar — ao colar (sticky), este
       "top" é que decide onde ela para, e um valor fixo em 0 cola-a no y=0 REAL
       do ecrã, debaixo do relógio/ilha, assim que a página rola.
- (linha ~740, `.rank-row-esqueleto--respira {`) A respiração fica só nos primeiros (ver Ranking.jsx): num time de 60, animar
     50 camadas recortadas para sempre é carga contínua na tela que esta rodada
     veio desafogar — e ninguém vê piscar o que está muito abaixo da dobra.
- (linha ~869, `.figurinha-gerando-moldura {`) Figurinha automática do cadastro (12-set): brilho dourado passando na
     moldura enquanto a IA gera em fundo — mesmo padrão do .rank-shimmer acima,
     cor dourada em vez de branca.
- (linha ~924, `.rank-votes {`) Rodada 29Z: "77,9 pontos · nota 9,1" nunca mais leva reticências. Os pontos e a nota são dois grupos que não se partem por dentro; se
     os dois não cabem na mesma linha (360 px com o botão "Alterar" ao lado), a nota desce para a segunda. O "·" que os separa é desenhado
     no vão entre os grupos (::before do segundo, 10 px à esquerda): se o segundo desce, o "·" cai fora da caixa e o overflow o apara —
     nunca sobra um ponto solto no fim da primeira linha. O "você deu / por votar" só aparece onde há folga (acima de 480 px).
- (linha ~985, `.pavatar img {`) min-width/min-height 0 (Velocidade 7B): a caixa é um grid e a <img> um item
     dele. Com o mínimo automático, o WebKit do iPhone estica a linha do grid até
     a altura que a foto teria pela proporção dela — num avatar retrato (a
     silhueta genérica é 368×680) a linha fica quase o dobro da caixa, e o
     place-items:center empurra a imagem 20–27 px para baixo: cabeça no fundo,
     resto cortado. Foto quadrada não mexe, por isso "só alguns" saíam errados.
     O Chrome não faz isto.
- (linha ~1075, `.feed-card {`) Cards da Resenha (Velocidade 7B): nunca mais largos que a coluna, e nenhuma
     imagem dentro deles mais larga que o card.
- (linha ~1125, `overflow: hidden;`) Achado 124 (29K): sem overflow/overscroll-behavior próprios, um arrasto no véu (fora do
       card, onde não há nada para rolar) ENCADEIA para o body por baixo — no WebKit do iPhone,
       isso rola a página por trás do modal; ao fechar, o body fica numa posição que não bate
       com o conteúdo novo (achado 124: "dois terços do topo em preto"), e só um reload acerta.
       `overflow: hidden` + `overscroll-behavior: contain` fazem o véu ABSORVER o arrasto, em
       vez de deixá-lo passar para trás.
- (linha ~1133, `padding: max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset…`) max(): nunca menos que os 16px de sempre, mais o que o notch/gesto exigir
       (14-set, VELOCIDADE 5) — um modal alto não pode nascer com o card colado
       ao relógio ou à barra de gesto. Sheets de fundo (AvatarGenericoSheet, o
       de idioma em MeuPerfil.jsx) sobrepõem `padding: 0` inline e resolvem o
       próprio inset de baixo à parte — não são afetados por isto.
       Laterais (Rodada 8A): o mesmo max() — com o iPhone deitado, o recorte da
       câmera fica de lado.
- (linha ~1142, `.modal-card {`) O modal é filho do BODY, por portal (Rodada 8A — Ranking, Resenha, comentários,
     denúncia, admin, onboarding do time). Dentro do [data-page] o transform da
     animação de entrada vira o "chão" do position:fixed: o modal centrava-se na
     página inteira e, com a lista rolada, saía de quadro.
- (linha ~1161, `overscroll-behavior: contain;`) Achado 124 (29K): quando o conteúdo é alto e leva overflow-y: auto próprio (ex.: o modal de
       resultado), rolar até à borda não pode encadear para o body por baixo do véu.
- (linha ~1456, `.gcard {`) VAGA 3 — o card do jogo passou a levar cantos a 45° (.hud-corners, no use site).
     Como clip-path corta TUDO o que o elemento pinta para fora da caixa, a elevação
     mudou-se para o wrapper .gcard-lift e aqui fica só o que o recorte respeita:
     fundo, bordas, padding e o inset (pintado DENTRO da caixa — esse sobrevive).
- (linha ~1690, `.fig-studio-card {`) Conjunto completo (card + botões + tabs + tiles + Baixar/Compartilhar) cabe
     em 100dvh SEM rolagem (build 9 — revoga a versão de 14-set que aceitava
     "rolagem ligeira" em ecrãs curtos: deixou de ser aceitável, Baixar/
     Compartilhar têm de estar sempre visíveis). RESERVA = tudo o que não é o
     card, remedido linha a linha: Topbar HUD 44 + app-main padTop 10 + zona do
     card (padding 4+16) 20 + grelha de controlos (gap 14 × 4) 56 + linha de
     zoom 26 + Trocar-foto/Gerar 40 + tabs 36 + painel de tiles ~105 + Baixar/
     Compartilhar 46 + app-main padBottom 24 + reserva da bottom nav (fixed,
     Layout.jsx) 70 = 477px. Faltava aqui a CAUSA do bug (build 8, "Velocidade
     5"): a área segura do iPhone (relógio/ilha em cima, barra de gesto embaixo)
     passou a empurrar tudo com env(safe-area-inset-top/bottom) — sem somar os
     dois ao cálculo, a reserva ficava pequena demais em qualquer aparelho com
     notch, e o card nascia grande demais para caber. Sem tiers por breakpoint
     (a divergência entre 3 números copiados à mão foi o que deixou este cálculo
     sair de sincronia da última vez) — UMA fórmula, o card encolhe sozinho em
     qualquer altura de ecrã. Tecto 78vw (card não cresce demais em ecrãs largos).
- (linha ~1711, `.fig-io-btn.cta-gold { height: 40px; }`) RODADA 17 — quando o "Gerar Avatar IA" vira o CTA dourado (.cta-gold, que
     sozinho vale 46px de altura própria), .fig-io-btn TEM de ganhar o empate:
     a linha ao lado do "Trocar foto" não pode saltar de altura só porque o
     botão pulsou dourado. Duas classes na seletor (especificidade 0,0,2,0)
     ganham de .cta-gold sozinho (0,0,1,0) INDEPENDENTE da ordem no ficheiro —
     sem isto, dependeria de qual das duas regras vem depois aqui embaixo.
- (linha ~1719, `e entra com um fade suave. Antes disto, o LoadingFutty segura o ecrã sozinho —…`) ─────────────────────────────────────────────────────────────────────────────
     CROMO DO INÍCIO. O retrato QUADRADO da /figurinha (600×600, sem placa), reduzido
     e clicável.

     A MEDIDA: pela LARGURA da tela, min(49vw, 236px) — 191 px num iPhone de 390, teto
     de 236 px no computador. Igual em qualquer navegador. Até 3-out (29N-B) a largura
     era 78% da do card da Figurinha, a mesma fórmula do .fig-studio-card (acima) com a
     altura da tela dentro; a Figurinha precisa disso, porque tem de caber sem rolar. O
     Início rola, e a ancoragem dependia de 100dvh: no Safari do iPhone com as barras
     (100dvh = 664) o avatar saía com 97 px, no app da tela de início (844) com 191 px,
     e mudava de tamanho quando as barras sumiam ao rolar. O avatar segue a largura, não
     a altura. Não voltar a ligar esta regra ao .fig-studio-card.

     SEM .hud-corners: o octógono a 45° já vem desenhado no PNG do canvas — recortar
     por cima só arriscava desalinhar dois octógonos.

     O feedback (press/hover/focus) vive AQUI e não no .fig-bob/.fig-sway: aqueles
     dois têm transform animado, e um transform de :active no mesmo elemento
     substituiria o keyframe em vez de se somar a ele. Em camadas separadas, compõem.
     ─────────────────────────────────────────────────────────────────────────────
- (linha ~1763, `de tela, promover a página inteira a camada própria e recompô-la a cada quadro`) Transição de entrada de TODA página (components/PageTransition.jsx, build 11).
     Era framer-motion e deixava o app invisível quando a rota suspendia depois de
     já ter montado — ver o comentário no PageTransition.jsx. Aqui quem toca é o
     motor do browser: o estado natural do elemento é VISÍVEL (opacity 1), a
     animação só encena a entrada, e se ela não correr por qualquer motivo a página
     aparece na mesma. É a diferença que importa — nenhum JS precisa de terminar
     para o conteúdo ser visto.
- (linha ~1770, `@keyframes pageEntra {`) VELOCIDADE 8 (16-set) — SÓ OPACIDADE. O deslize de 8 px custava, a cada troca
     de tela, promover a página inteira a camada própria e recompô-la a cada quadro
     — e a tela inteira, no iPhone 15 Pro Max, é 430×932 a 3x, ou seja 3,6 milhões
     de pixéis por quadro. Oito pixéis de deslize não pagam isso, e é o momento em
     que o Pedro diz que "engasga ao trocar de página".
     De lambuja resolve de vez o `position: fixed` com chão falso: sem transform no
     keyframe, a .page-transition nunca pode ser containing block de ninguém —
     a razão pela qual a Rodada 9 teve de trocar `both` por `backwards`.
- (linha ~1782, `pela Freaky. Medido em futtyapp.com.br/home: o conteúdo estava no DOM, mas`) `backwards`, não `both` (Rodada 9). Com `both` o keyframe final ficava
     CONGELADO no elemento para sempre — e um `transform: none` animado resolve-se
     em `matrix(1, 0, 0, 1, 0, 0)`, que não move nada mas faz da página o "chão" de
     todo `position: fixed` lá dentro. Era isso que atirava o banner do Jogo para
     3051 px (fora da tela), punha o toast do sorteio abaixo da dobra e fazia o
     fundo dos Planos rolar com a página. Registo histórico — ver o hotfix abaixo,
     que troca `backwards` por `none`: sem transform nenhum no keyframe desde a
     Velocidade 8, nenhum dos dois fill-mode tem chão falso para congelar.
- (linha ~1790, `.page-transition {`) HOTFIX (23-set) — tela preta após login com Google no Chrome, reproduzida
     pela Freaky. Medido em futtyapp.com.br/home: o conteúdo estava no DOM, mas
     `.page-transition` tinha opacity 0 porque a animação nascia PAUSADA em
     currentTime 0 — a página montou com document.hidden=true (aba em 2º plano
     durante o redirect do OAuth) e a regra de index.css (`html[data-oculto] *`)
     pausou `pageEntra` antes de ela correr um só quadro. Com `backwards`, o
     estado "antes de começar" é `from { opacity: 0 }` — e paused-no-nascimento
     FICA nesse estado antes de começar, para sempre, porque nunca chega a haver
     um quadro rodado que o tire de lá.
     `none` é a correção: o "antes de começar" deixa de ter estado próprio — o
     elemento mostra o seu estilo normal (opacity 1, nenhuma outra regra define
     `.page-transition { opacity: ... }`), e a animação só ACRESCENTA o fade de
     180 ms enquanto de facto corre. Junto com a exclusão em index.css (que impede
     este congelamento de acontecer) e a rede de segurança em lib/ritmo.js
     (`pararAnimacoesForaDeVista`, que termina qualquer entrada pendurada ao
     voltar a ficar visível) — a lei do build 11 continua de pé: o estado natural
     é VISÍVEL, e agora vale também para o caso "nasceu escondida".
- (linha ~1811, `.page-transition { animation: inicioReveal 0.12s ease-out none; }`) Só o fade, sem deslize — e mais curto. Mesmo hotfix: `none`, não `both`.
- (linha ~1829, `lugar" e passou a ser O CROMO INTEIRO, composto em DOM: fundo escolhido +`) A foto que segura o lugar do cromo enquanto o canvas desenha. Quando o cromo
     real entra, a troca é entre duas imagens do mesmo tamanho, no mesmo sítio —
     sem salto. A respiração morre com prefers-reduced-motion.

     VELOCIDADE 5 (14-set) — NÍTIDA. Nasceu desfocada (blur 2px, opacity 0.4) para
     se ler como "ainda a compor", e a ideia só se aguenta enquanto o cromo chega
     logo a seguir. No iPhone da loja não chegava: a pessoa ficava a olhar para a
     própria cara borrada, sem nunca perceber que aquilo era uma espera. Uma
     espera que não acaba não é um estado de transição, é um defeito — e entre
     mostrar o rosto nítido ou desfocado, quando pode ser o último quadro, mostra-se
     nítido. O pulso (mais discreto agora) é o que continua a dizer "vem aí mais".
- (linha ~1840, `.cromo-previa {`) FLUIDEZ 2 (16-set) — a prévia deixou de ser "a foto da pessoa a segurar o
     lugar" e passou a ser O CROMO INTEIRO, composto em DOM: fundo escolhido +
     avatar no mesmo enquadramento + moldura dourada. Antes, o primeiro quadro
     mostrava um retrato solto no meio da página e a moldura só aparecia quando o
     canvas acabava — o Pedro apanhou isso no aparelho ("o frame do cromo do
     Início aparece depois do avatar"). Agora a pessoa vê um cromo desde a
     primeira pintura, e o que o canvas traz depois é o acabamento, não a forma.

     O enquadramento do avatar NÃO está aqui: vem do enquadrarAvatar() do
     figurinhaCanvas, a mesma conta que o canvas usa, aplicada em percentagens.
     Duas contas divergiriam e a troca saltava à vista.

     O dourado fica POR BAIXO e o conteúdo por cima, encolhido: o anel que sobra é
     a moldura. É mais barato que recortar um buraco e dá o mesmo desenho.
- (linha ~1888, `.cromo-previa__avatar--comum {`) RODADA 27 — a figurinha COMUM: a foto é o fundo (cover), sem sombra — o canvas também não a
     desenha (não há nada a flutuar). A posição vem do enquadrarFotoComum, a mesma conta do canvas.
- (linha ~1894, `.cromo-previa__reserva {`) RODADA 12A — o lugar do cromo enquanto o avatar ainda não decodificou. Só a
     silhueta octogonal e o fundo escolhido: SEM a moldura dourada, porque uma
     moldura sozinha lê-se como cromo partido — o defeito que esta rodada corrige.
     Mesma área e mesmo recorte da .cromo-previa, para a composição não saltar
     quando entrar.
- (linha ~1948, `.hud-corners {`) FASE 3.29 — Cantos a 45° (identidade HUD), partilhados pelos controlos.
     O clip-path MANDA: qualquer border-radius existente deixa de ter efeito.
     ATENÇÃO: clip-path corta box-shadows → para glow, pôr o shadow num wrapper
     SEM clip e o clip só no elemento interior (ver botão Compartilhar).
- (linha ~2026, `@media (max-height: 700px) {`) Ecrãs curtos (iPhone SE e afins, <700px): a fórmula base já encolhe o card
     sozinha, mas os botões Trocar-foto/Gerar (.fig-io-btn) ainda valem 40px de
     reserva fixa — 6px a menos aqui devolvem-se ao card, e saem do cálculo
     acima só neste tier (a reserva de 477 assume os 40px cheios nos ecrãs
     normais). Build 9: revoga o tier anterior, que aceitava rolagem.
- (linha ~2036, `.fig-seletor-grade {`) Figurinha studio — grade do seletor (fundo/uniforme) PADRONIZADA (15-set): os dois
     painéis (tab Fundo e tab Uniforme) usam a MESMA classe — antes cada um tinha o seu
     85%/tamanho de tile em inline style e desalinhavam na tela do dono (iPhone). Uma
     única classe compartilhada: mesma largura total, mesmo tile, mesmo gap, mesmo
     padding lateral, mesma rolagem horizontal (scroll-snap) mesmo quando o conteúdo
     cabe sem precisar rolar (caso do Uniforme, hoje com só 4 kits).
- (linha ~2066, `[data-mais-dir="1"] {`) Rodada 29L (achados 130 e 138) — FAIXA QUE ROLA AVISA QUE ROLA. O hook useIndicadorDeRolagem põe data-mais-esq / data-mais-dir no
     trilho quando ainda há conteúdo escondido daquele lado; a borda esmaece (a peça cortada deixa de parecer "o fim da fila" e passa a
     dizer "continua"). Vale para qualquer trilho que use o hook: fundos e uniformes da Figurinha, abas do Gabinete, chips de time do Início.
- (linha ~2220, `.fig-zoom-btn {`) Rodada 29L (achado 131): a área de toque é de 44 px (o mínimo para o dedo); o que se VÊ continua o de antes — o ícone e, ao tocar, o
     círculo dourado de 24 px (agora no ::before). Eram 24 px de botão.
- (linha ~2249, `.fig-gerar { white-space: nowrap; min-width: 0; padding-left: 12px; padding-rig…`) Rodada 29L (achado 132): "Gerar minha figurinha" numa linha só, com o mesmo respiro lateral do "Trocar foto" (12 px, não os 20 do .btn); o
     rótulo curto (components/RotuloGerar.jsx) só aparece nas telas estreitas.
- (linha ~2277, `@keyframes planosBob {`) FASE 3.40 — PLANOS: hierarquia de movimento. Mesmas curvas/durações da figurinha,
     mas com amplitude REDUZIDA: o card Pro é herói da página sem competir com o cromo.
     FASE A — SUSPENSÃO: os TRÊS cards passam a ter sombra no chão + sway (durações
     7.1/8.3/9.7s, definidas por card no JSX → nunca sincronizam). Só o Pro tem bob
     vertical, e só a sombra DELE responde em contra-fase. É isso que mantém a
     hierarquia: todos flutuam, um só respira.
- (linha ~2326, `@media (prefers-reduced-motion: reduce) {`) FASE 3.47 — o shine do CTA Pro (era .planos-cta-shine, 4.2s/16%) foi absorvido pela
     classe partilhada .cta-gold, agora ao ritmo do card (8s/45%). Ver "LEI DOS GÉMEOS".
- (linha ~2337, `@keyframes futtyLoaderDraw {`) FASE 3.42/3.46 — Loader oficial: o monograma F é PINTADO por uma escova que corre
     a sua espinha (ver FuttyLoader.jsx). O traço usa pathLength="1" no SVG, daí o
     dasharray/offset serem 1 e não o comprimento real do esqueleto.

     FASE 3.61 — CICLO DE 3 TEMPOS (2.7s), em vez do corte seco a 1.6s:
       desenho  0 → 59.3%  (1.6s — inalterado)
       respiro  59.3 → 77.8%  (0.5s: o F inteiro segura, e é AQUI que o glint passa)
       fade-out 77.8 → 100%   (0.6s, ease-out: dissolve-se)
     O fade vive na ESCOVA e não no <svg>: assim o trilho ténue do F fica sempre, e no
     reinício a escova volta a opacity 1 já com dashoffset 1 (nada pintado) — sem flash.
     Fazer o fade no svg inteiro faria o trilho piscar na emenda do loop.
- (linha ~2372, `FuttyIconeFlutuante: mesma física, não duas imitações uma da outra.`) Rodada 29D: o lockup da landing (o F solto em metal, .futty-lockup-f, glint) saiu — o F de marca vai dentro do ícone do
     app (FuttyLogo variant="icone", FuttyIconeFlutuante); a flutuação abaixo é a mesma.
- (linha ~2375, `@keyframes futtyFBob {`) FASE B — FLUTUAÇÃO DAS DUAS MARCAS. Classes partilhadas pelo FuttyLoader e pelo
     FuttyIconeFlutuante: mesma física, não duas imitações uma da outra.

     Porque são TRÊS wrappers e não tudo no <svg>: cada camada anima uma propriedade
     diferente e o CSS só deixa uma animação por propriedade num elemento. O bob mexe
     translateY, o sway mexe rotate — ambos são `transform`, logo teriam de competir.
     E no lockup o próprio <svg> já anima transform (a entrada, scale 0.92→1). Separados,
     compõem-se; juntos, a última ganhava e as outras desapareciam.

     A sombra fica FORA do bob — no chão. Se subisse com o F não era sombra, era decalque
     (o mesmo erro que a Fase A corrigiu nos Planos).
- (linha ~2442, `color: #a78bfa;`) Rodada 29L (achado 137): --neon sobre o chip roxo translúcido dava ~4,3:1 em 10 px; #a78bfa (da paleta) passa de 4,5:1 com folga.
- (linha ~2467, `color: #a78bfa;`) Rodada 29L (achado 137): o roxo da casa (#8b5cf6) sobre o roxo translúcido do chip dava ~4,1:1 em 9 px. O #a78bfa (já da paleta) dá ~7:1.
- (linha ~2490, `color: var(--text-dim);`) Rodada 29L (achado 137): era #333333 (~1,6:1) — a contagem de confirmados, que diz se vale ir ao jogo, quase sumia. O --text-dim
       (#aaaaaa) dá ~8:1 sobre o card, bem acima do 4,5:1 do WCAG AA para texto normal.
- (linha ~2543, `.pbtn-pulse {`) RODADA 13 — o "Vou" perde o dourado (ver --presenca-* em index.css): o glow
     do wrapper segue o mesmo verde da borda/preenchimento. Classe própria (não
     .pulse-glow) porque é o único wrapper de presença que pulsa — "Não vou" é
     fantasma parado.
- (linha ~2583, `.pbtn--go {`) RODADA 13 (decisão do dono, build 22) — o "Vou" perde o dourado: no card o
     dourado passa a ser só o "Ver sorteio"/"Sortear", a ação mais importante.
     "Vou" vira fantasma verde, o gémeo exato do "Não vou" (ver --presenca-* em
     index.css) — mesma receita, cores trocadas.
- (linha ~2640, `.gcard .badge--sorteado { color: #a78bfa; }`) Rodada 29L (achado 137): no card de jogo o "Sorteado" em --neon sobre o roxo translúcido dava ~4,3:1; o #a78bfa passa de 4,5:1 com folga.
- (linha ~2684, `NADA reescalado: o harness É a resposta. Palco 330×470; glow 300×344 (blur 46, a`) ═══════════════════════════════════════════════════════════════════════════════
     VAGA 6 — VITRINE DO JOGADOR (/time/:slug/jogador/:id)
     Herói = recorte puro com aura + respiração; stats-espectáculo (anel/radar/
     sparkline/tiles em cascata). Namespace .perfil-*, aditivo. reduced-motion estático.
     ═══════════════════════════════════════════════════════════════════════════════
- (linha ~2859, `.cer-jack { position: fixed; inset: 0; z-index: 120; display: grid; place-items…`) Velocidade 8 (16-set): o estado PARADO já não declara backdrop-filter. Um
     `blur(0)` não desfoca nada — mas declarar backdrop-filter num elemento fixo de
     ecrã inteiro obriga o WebKit a manter uma raiz de composição para ele durante
     a cerimónia inteira, que é o momento mais animado do app. O `.on` fica como
     está: é o palco selado do sorteio.
- (linha ~2894, `.camp-title{font-family:'Rajdhani',sans-serif;font-weight:800;font-size:24px;le…`) ===================================================================
     CAMPEONATO (Vaga 11B) — tabela, bracket, celebracao e wizard.
     Canone: vidro 45, lider dourado, campeao familia jackpot ouro/roxo.
     ===================================================================
- (linha ~2986, `.camp-podio{display:flex;align-items:flex-end;justify-content:center;gap:8px;ma…`) PODIO (Vaga 11C) — degraus 2 · 1 · 3, escudo por cima, 1o ouro maior+glow
- (linha ~2995, `.camp-cel__confete{position:absolute;inset:0;pointer-events:none;z-index:0;over…`) CHUVA DE CONFETE (Vaga 11C celebracao v3) — ambiente, nao protagonista.
     Duas camadas (tras desfocada .3 / frente nitida .5), TODAS nascem acima do
     ecra (top:-8%) e caem para baixo de 100%; loop recomeca sempre no topo, nada
     aparece/some no meio. Atras do escudo/nome (z-index). reduced-motion = estatico.
     (O jackpot do SORTEIO mantem as moedas — .cer-* nao se toca.)
- (linha ~3016, `.seloh{position:relative;aspect-ratio:5/6;flex:0 0 auto;`) SELO DE HONRA (Vaga 11C) — forma A postal denteado + varrimento de vidro.
- (linha ~3040, `.feed-item{contain:layout paint;content-visibility:auto;contain-intrinsic-size:…`) FLUIDEZ 2 (16-set) — cada cartão da Resenha é uma ilha.
     `contain: layout paint` diz ao motor que nada dentro do cartão afecta o que
     está fora dele, nem transborda: um cartão que muda (uma reação, uma imagem a
     chegar) deixa de obrigar a recalcular a lista inteira.
     `content-visibility: auto` salta layout e desenho dos cartões fora da tela, e
     o `contain-intrinsic-size` guarda a altura que eles tinham, para a barra de
     rolagem não saltar. 420px é a altura típica de um post com foto.
- (linha ~3062, `de .perfil-glow, padrão Aura — copiar, nunca reescalar o selado). Reusa respira…`) ═══════════════════════════════════════════════════════════════════════════════
     BOAS-VINDAS (31-jul) — tela única. Namespace .landing-*, aditivo.
     ═══════════════════════════════════════════════════════════════════════════════
- (linha ~3104, `do onboarding depois de a foto subir), o quadrado tracejado dourado marca o que…`) A barra de compartilhar presa ao fundo (Rodada 12A) saiu na Rodada 14B:
     cobria parte do retângulo dos times. Compartilhar vive agora dentro da
     cerimónia — ver .compartilhar em sorteio-maquina.css.
- (linha ~3108, `.reactEasyCrop_CropArea.crop-area--miniatura::after,`) Rodada 29H-B (item 55): o ENQUADRAMENTO ÚNICO. Dentro da moldura 2:3 do card (a área de recorte do react-easy-crop, ou a moldura
     do onboarding depois de a foto subir), o quadrado tracejado dourado marca o que vira a foto da miniatura (Início, ranking,
     sorteio): o quadrado do TOPO, da largura do card — a conta de lib/enquadroAvatar.js#recorteDaMolduraUnica. Só desenho: o
     pointer-events: none deixa o arrasto passar para o cropper.
- (linha ~3126, `.rolinhos {`) Rodada 29H (item 3): a data de nascimento em rolinhos (components/RolinhosData.jsx). Três rolos com scroll-snap; o item no
     centro é o escolhido, a faixa dourada o marca. 5 linhas de 40 px = 200 px; as pontas somem num degradê. Antes de a pessoa
     mexer nos três, o item do centro fica apagado (é só o ponto de partida, não uma resposta).
- (linha ~3183, `.gcard { position: relative; }`) Rodada 29I (achado 84) — o card do jogo inteiro abre a tela do jogo, com um link de verdade. O <a> é o título (.gcard__link); a camada que
     cobre o card é o ::after dele. Os controles de dentro (Vou / Não vou, Ver sorteio) sobem de nível (z-index) e seguem funcionando sem abrir
     o jogo. Nada de botão dentro de <a>. O clip-path de 45° do .gcard também recorta a camada: o toque nos cantos cortados não pega.
- (linha ~3195, `.feed-esqueleto {`) Rodada 29I (achado 93) — o esqueleto da Resenha: enquanto os posts não chegam, três cartões com a forma dos de verdade (avatar, linhas, foto)
     em vez de uma tela que parece vazia. Mesmo brilho que passa devagar do .rank-row-esqueleto/Explorar; sem movimento para quem pede menos.
- (linha ~3226, `respiro + 54 do toque + 1 da linha + 12 de base, ou a barra de gesto do iPhone…`) ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
     RODADA 29L — a varredura visual em 390 px.
     ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
- (linha ~3230, `:root {`) Achado 125 — A ALTURA DA BARRA DE NAVEGAÇÃO, num lugar só. A faixa de cookies ficava a 58 px do fundo, mas a barra tem 75 (8 de
     respiro + 54 do toque + 1 da linha + 12 de base, ou a barra de gesto do iPhone se for maior): 17 px da faixa ficavam por baixo e o
     "Aceitar" perdia 9, encostando no "PERFIL". Esta conta tem de bater com .bottom-nav (padding 8 + .bottom-nav__tab 54 + borda 1 +
     max(12, safe-area)); o teste de unidade e a prova de navegador travam isso.
- (linha ~3238, `.aba-time {`) Achado 129 — as abas do time (Jogos · Elenco · Ajustes[ADMIN] · Ranking). Cada uma tem a largura do próprio texto e divide a sobra
     (flex: 1 1 auto), em vez de partes iguais, onde "Ajustes" + selo estourava a sua parte e empurrava o "Ranking" para a borda.
- (linha ~3271, `.jogo-destaque { animation: jogoDestaque 2.4s ease-out 1; }`) Rodada 29R (achado 147): o jogo que a linha "presença ainda não aberta" do Início apontou (aba Jogos do admin). Um anel dourado que
     acende e some em 2,4 s; a classe sai do cartão aos 2,6 s (AdminPanel, TabJogos). Estado natural = cartão normal, nada fica escondido.
     Movimento reduzido: sem animação, só a borda dourada fixa enquanto a classe estiver lá (o !important vence o estilo em linha do cartão).
- (linha ~3283, `.placar-input::placeholder {`) Rodada 29T-B: as caixas do placar (ResultadoEditor) mostram um "0" apagado enquanto vazias — a pessoa vê o que se escreve ali.

## src/styles/auth.css

- (linha ~1, `.auth-shell {`) Futty v2.0 — Estilos partilhados das páginas de autenticação

  VAGA 1 (B2) — a porta de entrada ganha o cânone.

  Porque é que estas páginas tinham deriva própria: são as ÚNICAS do app que não
  importam o app.css (todas as outras fazem `import '../styles/app.css'`). Sem ele
  não havia .hud-corners-s, não havia .cta-gold — o vocabulário da casa não chegava
  cá, e o que cresceu no vazio foi um dialecto: roxo neon, cantos redondos, azul de
  focus do browser. O Login e o Registo passam a importar o app.css como toda a
  gente; este ficheiro é só a camada por cima.

  O trio fecha completo: Login, Registo e ForgotPassword. Os três importam o app.css,
  os três usam o CTA dourado da casa. Não sobra porta com dialecto.
- (linha ~139, `.auth-field label,`) Label = estrutura → Rajdhani 600. O valor que se escreve no input é leitura e
     fica no --sans: a régua da Vaga 1 é "Rajdhani estrutural, leitura no resto".
- (linha ~177, `.auth-input:-webkit-autofill,`) O AZUL ÓRFÃO. Ele existe, e não está em stylesheet nenhum: é o autofill do
     Chrome, que pinta os campos guardados com rgba(70,90,126,0.4) — um azul-ardósia
     — por cima do que aqui se declarar. Sobre o #101012 do card dá ~rgb(38,46,61).
     Por isso não se encontrava a grep: não é código nosso, é o browser. Atropelava
     duas regras da Vaga 1 ao mesmo tempo (fundo escuro translúcido, zero azul).
     O background-color não o vence — o UA ganha sempre. O que o vence é um
     box-shadow inset opaco, que o autofill não sobrepõe. Sendo opaco, não pode ser
     translúcido: leva o valor JÁ COMPOSTO do design sobre o card (rgba(255,255,255,
     0.03) sobre #101012 = rgb(23,23,25)), portanto o olho vê exactamente o mesmo.
     O inset não briga com o clip-path do .hud-corners-s: pinta dentro da caixa e é
     recortado com o resto — ao contrário de uma sombra exterior, que seria cortada.
     O -webkit-text-fill-color é preciso à parte: o autofill também força a cor do
     texto (escuro), e o `color` não lhe toca.

## src/styles/boas-vindas.css

- (linha ~1, `.bv{position:relative;width:min(92vw,360px);max-height:calc(100dvh - 32px);over…`) Futty v2.0 — Rodada 29C: boas-vindas para todo mundo (components/BoasVindas.jsx). CSS, geometria e tempos copiados da
     prova aprovada pelo dono (FUT/DESIGN/prova-boas-vindas-v2.html, v2.2): a receita da máquina do sorteio
     (sorteio-maquina.css — .maq, .luz, mqCalm, premioLampa/premioBranco, .baseluz), escopada em .bv e com os keyframes
     prefixados (bv*) para não disputar com os do sorteio quando as duas folhas estão na página. Só o BoasVindas importa
     (chunk lazy, fora do arranque). Lei dos builds 10-12: estado natural visível — nada aqui depende de JS para aparecer.
- (linha ~7, `.bv.bv--festa{width:100%;max-height:none;overflow:visible;padding:0;gap:10px;ba…`) Rodada 29P: a festa no fim do Criar time — a mesma máquina, dentro da página (sem a caixa do diálogo).

## src/styles/convite.css

- (linha ~1, `.convite {`) Futty v2.0 — Rodada 29B (A): a página do convite. Centrada, sem cartão: a marca no alto, o logo do time grande no meio,
     o nome em destaque, três fatos e UM botão. Só o Convite importa este arquivo (chunk lazy) — fora do arranque.
- (linha ~97, `.convite__nome--sozinho {`) Time sem logo (29H, item 23): sem escudo, o nome é o destaque — maior, sem a folga de cima que o escudo pedia.

## src/styles/mini-sorteio.css

- (linha ~1, `.msq{width:100%;margin:22px auto 0}`) Futty v2.0 — Rodada 29E2/29E3: o mini sorteio do Onboarding (components/MiniSorteio.jsx). A receita da máquina do sorteio
     (sorteio-maquina.css: .maq, .luz em mqCalm, .janela, .baseluz) numa caixa de 290 de largura e, dentro, a janela do sorteio
     REAL com os ROLOS de lá: .grupo/.ghead/.srow → .rolo (clip octogonal) com a .strip girando em spinY (.scel por figurinha),
     .slow ao desacelerar, .stop ao travar; por cima, a figurinha sorteada na moldura do sorteio (.rev com revPop: .fr, micro-
     lâmpadas .mb, nome .nm). As réguas dão UM pulso (premioLampa) quando o 8º trava. Escopado em .msq, keyframes prefixados
     (msq*) para não disputar com os do sorteio. Só o Onboarding importa (chunk lazy).
     29E3 (dono): 4 jogadores por time — 2 linhas de 4 rolos de 56 (224 nos 242 de dentro da janela a 290: 3 espaços de 6).
     Estado natural: sem JS, os 8 travados (o JSX nasce cheio); com movimento reduzido, tudo parado.
- (linha ~23, `.msq .srow{display:flex;justify-content:space-between}`) 4 rolos por linha (29E3): os 4×56 ocupam a largura da janela e os 3 espaços repartem a sobra (6 px a 290; em tela estreita
     os espaços encolhem antes de qualquer rolo estourar ou ser cortado pelo overflow da janela).
- (linha ~26, `.msq .rolo{position:relative;width:56px;height:75px;flex:none;overflow:hidden;b…`) O rolo: a peça da máquina real (.rolo/.strip/.scel) a 56×75. A tira tem as 8 figurinhas duas vezes: o spinY vai a −50 % e
     fecha sem emenda. Rápido a girar (.35 s a volta), ~1,5 s ao desacelerar (.slow; 29H-B: era 1 s, a revelação ficou 1,5× mais
     longa), parado ao travar (.stop).
- (linha ~34, `.msq .scel{width:56px;height:75px;position:relative;overflow:hidden;border-bott…`) 29H (item 4): antes de a figurinha chegar da rede a célula já é a MOLDURA vazia (fundo em degradê e filete interno), e a imagem
     entra por cima — o rolo gira desenhado desde o primeiro quadro, sem buraco preto.
- (linha ~55, `e da janela encolhem (14→8 e 8→5) e as linhas voltam a ter os 3 espaços de 6, c…`) Legenda (dono, 2-out): o estilo do subtítulo da landing — Rajdhani 700, caixa alta, .14em, #c9c2d6, 12,5 px. Cabe numa
     linha onde dá; em tela estreita, text-wrap:balance divide em duas linhas parecidas (os únicos pontos de quebra são depois
     dos "·": os espaços de cada frase são duros no JSX), nunca uma palavra sozinha.

## src/styles/sorteio-maquina.css

- (linha ~94, `.smaq .somBtn{position:absolute;right:10px;top:10px;z-index:8;width:38px;height…`) RODADA 12A — o mudo tem de se ver DURANTE a cerimónia: com o som ligado por
     omissão para quem sorteia, calar é uma saída que a pessoa pode precisar em
     dois segundos (de noite, no trabalho). Era 30×26 em cinza-fantasma sobre uma
     máquina cheia de luzes. Agora é 38×32, com o contraste do véu por baixo.
- (linha ~107, `.smaq .janela.encerrada{display:none}`) Rodada 29M (achado 144): terminada a cerimônia, a janela dos rolos fica sem rolos e sem "Girando · …". Em vez de uma caixa preta vazia no topo
     do resultado, ela sai de cena (a cerimônia pôs a classe junto com o véu e a tira quando recomeça).
- (linha ~166, `.smaq .mmold img{position:absolute;inset:0;width:100%;height:100%;object-fit:co…`) RODADA 19 (23-set): 50% 0% (era 10%) — o recorte 2:3 já garante o rosto no
     terço de cima (CropModal + proxy `sq=1`, ambos "pelo topo" agora); um corte
     exatamente no topo do quadrado usa isso em vez de adivinhar com um degrau.
- (linha ~348, `moldura do retângulo — o que muda é o que elas fazem. O branco é um ::after por`) ═══ RODADA 14B — O FIM DO SORTEIO COMO PRÊMIO (16-set) ═══════════════════════
     O instante em que os times aparecem é "acabou de ganhar" numa slot machine.
     Nada aqui redesenha a máquina: são estados novos (.maq.premio → .maq.premioCalmo)
     sobre as peças que já existem, e três camadas de luz (16B) por cima do bloco
     dos times. Tudo em transform/opacity — nem filter nem box-shadow animados. O
     flash e a pílula vivem no body (prefixo .smaqx-, fora do escopo .smaq de propósito).

     RODADA 16B (17-set, avaliação do dono no aparelho): saíram a chuva de moedas
     e os raios cônicos a girar atrás dos avatares — "nada gira dentro do
     retângulo". Marquise, flash, título, botão e pílula ficam como estavam.

     Linha do tempo, contada do jackpot (T0 = "TIMES SORTEADOS" acende):
       T0        flash (100 ms a 0,35) · marquise em sequência · título · 1º pulso de glow
       T0..3,0 s 3 varreduras de brilho (0,05 / 1,05 / 2,05 s, cada uma mais fraca)
                 · 10 pontos de brilho a acender e apagar até 2,5 s
                 · pulsos de glow nas bordas nos 3 ataques do jackpot (0 · 0,54 · 2,70 s)
       T0+3,0 s  marquise e glow passam a brilho suave (.premioCalmo) — fica assim
       T0+5,1 s  o botão "Compartilhar os times" sobe (ver .compartilhar)
- (linha ~386, `.smaq .interiorConteudo{position:relative;z-index:1}`) (iii) MAIS LUZ — Rodada 16B. Três camadas, todas em transform/opacity, todas
     com o estado natural INVISÍVEL: sem .premio nada se vê; o que fica depois é o
     brilho suave de .premioCalmo. O conteúdo sobe um nível (z 1); as luzes ficam
     por cima dele (z 2-3) e por baixo do título (z 50).

     (a) .premioShine — 3 varreduras de brilho a atravessar o retângulo na diagonal
         (banda inclinada por skewX, a andar da esquerda para a direita), uma por
         segundo, cada uma um degrau mais fraca (1 → 0,62 → 0,38). A banda começa
         fora do retângulo à esquerda e acaba fora à direita: nos dois extremos
         da animação, e sem animação, não há nada na tela.

## src/utils/avatar.js

- (linha ~18, `const PASTAS_REMOTAS = ['/avatares/', '/sorteio-assets/', '/sons/', '/dados/',…`) ─── Mídia que não viaja dentro do app ───────────────────────────────────────
  13-set. O pacote da loja leva só a casca: código, CSS, fontes, ícones, splash
  e os fundos que entram em canvas. O resto da mídia é buscado da web na hora e
  fica em cache no aparelho (Cache-Control immutable — ver public/_headers).

  Só estas pastas (Rodada 29B, D: + /dados/, a lista de cidades do campo "Cidade", ~230 KB). As imagens de fundo da figurinha (stadium_bg,
  futty-logo-flat, as chapas) continuam DENTRO do app de propósito: elas entram
  em canvas com crossOrigin desligado, e servi-las de outra origem contaminaria
  o canvas — o toBlob() passaria a lançar e o download da figurinha morria.
  São 457 KB; não vale o risco.
- (linha ~56, `const DEGRAUS = [128, 256, 512, 1024];`) ─── Tamanho da imagem (Velocidade 6B, 15-set) ───────────────────────────────
  O motor (Velocidade 6A) passou a servir o proxy de imagem já redimensionado e
  em WebP: `?w=128|256|512|1024`. Antes, uma lista de 20 jogadores baixava 20
  figurinhas em tamanho de cartaz (418 KB cada) para as mostrar a 48 px.

  Só mexe em URLs do NOSSO proxy. Tudo o resto passa intacto de propósito: os
  kits e avatares genéricos (bucket público `kits`), a foto do login Google
  (lh3.googleusercontent.com), os assets de public/ e as imagens das campanhas
  de publicidade — nenhum deles entende `?w=`, e acrescentá-lo só quebraria o
  cache do CDN de terceiros.

## src/utils/avatarGenerico.js

- (linha ~1, `const BASE = 'https://ynzmjcvqdljffgbeqglh.supabase.co/storage/v1/object/public…`) Futty v2.0 — Avatar genérico da casa (31-jul, ordem do dono). Jogador faceless
  vestindo o kit Dark Gold, usado como card do jogador ENQUANTO ele não gera o
  avatar IA próprio — substitui as iniciais e o empty state "espera por você".
  6 variantes (masc m1-m3, fem f1-f3): o app NÃO pergunta sexo — a pessoa escolhe
  o dela num seletor (ver AvatarGenericoSheet); sem escolha, rodízio masculino por
  hash do id (comportamento original, antes de existir escolha).

## src/utils/aviseMe.js

- (linha ~1, `export function emailParecePronto(valor) {`) Futty v2.0 — Rodada 29B (F): o que a tela "Avise-me" decide sozinha (puro, sem React nem rede). O motor valida de novo
  (backend/utils/aviseMe.js): aqui só se poupa a ida quando o erro é óbvio e se diz de onde a pessoa veio.

## src/utils/avisosDoInicio.js

- (linha ~1, `export const ORDEM_DOS_AVISOS = [`) Futty v2.0 — Rodada 29T (achado 168), a fila dos avisos do topo do Início. UM aviso por vez, o mais importante primeiro; respondeu ou fechou, entra o próximo.
  Mais de um do mesmo tipo → o mais próximo e um "+N" discreto.

  Bloco A: jogo sem resposta → pedido de entrada pendente → ativar notificações.
  Bloco B (ajuste da Freaky, 4-out): os outros avisos que ficavam empilhados abaixo da fila entram na MESMA fila, um por vez.
  Bloco C (a fila não trava, Freaky, 4-out): primeiro o que ACONTECEU ou TEM PRAZO, depois os lembretes SEM PRAZO, por último ativar notificações.
  Os lembretes sem prazo (LEMBRETES_SEM_PRAZO) ganham "Agora não", que os esconde por 7 dias naquele aparelho (utils/lembretes.js): a fila anda. A ordem
  (ORDEM_DOS_AVISOS):
    1. jogo sem resposta (o próximo jogo com presença aberta e sem Vou / Não vou) — a pessoa abre o app para responder "vou ou não vou";
    2. pedido de entrada pendente;
    3. a resposta do pedido de entrada (aceito / recusado);
    4. votação (você tem colegas para avaliar / nova temporada de notas);
    5. o desfecho da denúncia;
    6. a figurinha nascendo (ou que não saiu);
    — daqui para baixo, lembretes sem prazo —
    7. "Você tem uma figurinha para gerar" · 8. o recado do pedido de figurinha · 9. o uniforme por escolher · 10. "Complete seu card" · 11. a data de nascimento;
    12. ativar notificações, por último.
  Puro (sem React, sem rede): o Início só desenha o que esta fila devolve, e o teste roda no Node.

## src/utils/bairros.js

- (linha ~1, `import { normalizarCidade } from './cidades';`) Futty v2.0 — Rodada 29T (bloco B, achado 157): o campo "Bairro" do time é de LISTA, como a cidade (dono, 4-out: "só aceita o que tiver lá").
  Puro (sem React, sem rede).

  Brasil: a lista oficial do IBGE (Censo 2022), um arquivo por estado em public/dados/bairros/<UF>.json (scripts/gerar-bairros.mjs):
  [[codigoIbge, municipio, [[bairro, lat, lng], …]], …]. O IBGE só tem bairros em 895 dos 5.571 municípios; nos outros entram os distritos e subdistritos
  oficiais do mesmo IBGE quando o município tem 2 ou mais (29T-C: o DF, São Paulo capital, Goiânia, Palmas…; 2.590 municípios no total). Cidade sem nada na
  lista (Rio Branco, São Luís: um distrito só) = o campo Bairro NÃO aparece (ele é opcional) e o time mostra só a cidade.
  Portugal: as freguesias (utils/freguesias.js), como desde a 29H.
  A lista de cidades (public/dados/cidades.json) não traz o código do IBGE, então o campo liga o bairro à cidade escolhida por NOME + UF
  (o script grava o município com a mesma grafia do cidades.json). Escolher da lista manda a coordenada junto.

## src/utils/campeonatoCartao.js

- (linha ~1, `import { podioDe } from './campeonatoPodio';`) Futty v2.0 — Cartões 9:16 do campeonato (v2) — espelho da celebração aprovada.
  Canvas 1080×1920, fundo da casa, marca FUTTY. Troféu DA CASA (mesmo path do Icon)
  desenhado grande; escudos dos times; confete composto à mão (não aleatório feio).
  PNG entregue por utils/salvarImagem.js (Rodada 8A): baixa na web, folha de
  compartilhar no app. Dois cartões: campeão e pódio.

## src/utils/campeonatoPodio.js

- (linha ~1, `export function podioDe(campeonato) {`) Futty v2.0 — Pódio do campeonato (Vaga 11C). Puro (sem React) para ser
  partilhado pela vista (CampeonatoVistas) e pelo cartão 9:16 (campeonatoCartao).
  pontos: top-3 da tabela final. mata: campeão / vice (perdedor da final) /
  semifinalistas eliminados (3º partilhado quando há 2 semis).

## src/utils/cidades.js

- (linha ~1, `const MINIMO_DE_LETRAS = 2;`) Futty v2.0 — Rodada 29B (D): a lista de cidades do campo "Cidade" (CampoCidade). Puro (sem React, sem rede).

  A lista é public/dados/cidades.json (scripts/gerar-cidades.js): um vetor de [nome, uf|distrito, país, lat, lng] com
  os 5.571 municípios do Brasil e os 308 concelhos de Portugal. O app a busca SÓ quando o campo ganha foco
  (lib/cidadesDados.js) e nunca a leva no bundle. A normalização é a MESMA do motor (backend/utils/cidade.js) — o
  Explorar casa por texto comparando as duas pontas, então as duas têm de concordar letra por letra.
- (linha ~75, `export function cidadePreenchida({ texto, escolha, temSugestoes }) {`) A cidade conta como preenchida (Rodada 29P): escolhida da lista, ou um texto para o qual a lista não tem sugestão nenhuma
  (cidade fora do Brasil e de Portugal: o motor geocodifica). Com sugestões na lista, a pessoa escolhe uma. Nunca trava quem está fora.

## src/utils/comTentativa.js

- (linha ~1, `export function comTentativa(src, tentativa) {`) Futty v2.0 — Rodada 29L (achado 141): o endereço da foto na N-ésima tentativa. A primeira é o endereço de sempre; as outras ganham ?r=N (ou &r=N),
  para o navegador não reaproveitar a resposta que falhou. O token da mídia (/api/media/:token) vive no caminho, então a query não o altera.

## src/utils/confirmarExclusao.js

- (linha ~1, `export const CONFIRMACAO_EXCLUIR = 'EXCLUIR';`) Futty v2.0 — Rodada 29A (A): a confirmação de "Excluir minha conta".
  No iPhone o teclado corrige "EXCLUIR" para "Excluir" (ou "excluir ", com espaço) e o botão, que só
  ligava com as 7 letras em maiúsculas, ficava cinza sem explicar — e a Apple exige exclusão fácil de
  concluir. Aqui a comparação é normalizada: sem espaço nas pontas, sem diferença de maiúsculas e sem
  acento. O motor (DELETE /api/me) continua exigindo `{ confirmacao: 'EXCLUIR' }` exato: o app manda
  sempre CONFIRMACAO_EXCLUIR, nunca o que a pessoa digitou.

## src/utils/convidadoSemApp.js

- (linha ~1, `export const CONVIDADO_TITULO = 'Alguém sem o app vai jogar?';`) Futty v2.0 — Rodada 29Q: os textos do "convidado sem app", numa fonte só. Jogo (caixa do admin antes do Sortear), Novo jogo e
  Campeonato importam daqui; ninguém escreve a frase por conta própria. A regra não muda: só o nome, entra no sorteio, nunca em
  `users` nem no ranking. O Campeonato não tem ranking, então a linha dele não promete nem desmente nada sobre ele.
- (linha ~9, `export const CONVIDADO_TITULO_PASSADO = 'Alguém sem o app jogou?';`) Rodada 29S, bloco B: a versão no PASSADO, do Jogo passado (o jogo já rolou: "jogou", não "vai jogar"). O botão é o mesmo.

## src/utils/convite.js

- (linha ~1, `import { plural } from './plural';`) Futty v2.0 — Rodada 29B (A): o que a página do convite escreve. Puro (sem React, sem rede), para testar no Node.
- (linha ~7, `export function dataCurta(iso, { agora = new Date(), fuso = TZ_PADRAO } = {}) {`) Data curta do próximo jogo, no relógio do CAMPO (fuso do time — Rodada 29I, achado 83): "hoje", "amanhã" ou "sáb, 4 out".
  "Hoje" e "amanhã" também são os do campo: o jogo de amanhã às 20h em São Paulo é "amanhã" para quem abre o convite de Lisboa.
  `fuso` é o do time (o motor manda em `info.fuso`); sem ele vale TZ_PADRAO, nunca o relógio do aparelho. `agora` só existe para o
  teste ser determinístico.
- (linha ~47, `export function linkDoConvite({ origem, token, codigo }) {`) O link do convite que vai para o grupo (29H, item 7): o curto, futtyapp.com.br/c/<código>, quando o motor deu um código
  (migração 072); senão o longo, /convite/<uuid>, que continua valendo. `origem` é a do SITE (ORIGEM_DO_SITE em lib/linkDoSite.js),
  nunca a de quem está olhando (29I, achados 87 e 105).
- (linha ~56, `export function textoDoConvite({ nomeTime, link }) {`) A frase do WhatsApp (dono, 2-out): "Bora jogar? Você foi chamado para o <time> no Futty. Entre pelo link: <link>".

## src/utils/dataHora.js

- (linha ~1, `export const TZ_PADRAO = 'America/Sao_Paulo';`) Futty v2.0 — Rodada 29I (achado 83): UM lugar só para escrever data e hora de jogo.

  A hora de um jogo é a hora do CAMPO, sempre: quem viaja continua vendo "quinta, 20h". O jogo chega do motor como instante
  (ISO, UTC) e o time diz em que relógio ele se lê (`fuso`, nome IANA: America/Sao_Paulo, Europe/Lisbon…). Tudo aqui usa
  Intl.DateTimeFormat com timeZone EXPLÍCITO e locale pt-BR — nunca o relógio do aparelho. Sem `fuso` (resposta antiga, time
  sem a migração 076) vale TZ_PADRAO.

  Onde o relógio do aparelho vale de propósito (e este arquivo NÃO se usa): o Gabinete (o dono olhando datas do sistema, no
  relógio dele), o "há 5 h" (tempo decorrido, não data de calendário) e o Diagnóstico.

  A PALAVRA NA TELA (dono, 3-out): "Hora do jogo", ou só "Hora" — nunca "hora do campo", "fuso" ou "horário de Brasília". O jogador
  não tem de saber que existe fuso. A única exceção é o RABICHO: quando o relógio do time é outro que o de quem está olhando, a hora
  ganha "· horário de São Paulo" (o nome da CIDADE do time, nunca o identificador IANA) — quem viajou, ou entrou num time de outro
  país, não chega atrasado. Para quem está no mesmo relógio (quase todo mundo) não aparece nada. Ver rabichoDoFuso.

## src/utils/dataRolinhos.js

- (linha ~1, `import { nascimentoMaximo } from './idade';`) Futty v2.0 — Rodada 29H (item 3): as contas puras dos rolinhos da data de nascimento (components/RolinhosData.jsx). Sem React.

## src/utils/escudo.js

- (linha ~1, `export const PALETA = [`) Futty v2.0 — Rodada 29I, bloco 3 (achado 102 + bancadas aprovadas pelo dono em 2-out): o escudo do time sem logo.

  UM controle, "Escudo do time": cor principal + segunda cor + padrão. Paleta FIXA de 12 cores, igual no motor
  (backend/utils/escudo.js) e na regra do banco (migração 077); 6 padrões = 864 escudos, todos legíveis em 84, 36 e 20 px.
  O desenho é o das bancadas DESIGN/escudo-cores.html e DESIGN/escudo-padroes.html, copiado de lá (não reescalado).
  Reprovados pelo dono e fora daqui: RGB livre, quadriculado, listras finas, pontinhos, gradiente.

  A cor principal continua em teams.cor. A chave antiga 'verde' sempre foi mostrada como ROXO (#8b5cf6) e segue assim — por isso
  o verde de verdade da paleta tem a chave 'gramado' (na tela, "Verde").

## src/utils/estadoSorteio.js

- (linha ~1, `export function estadoSorteio({ loading, error, resultado }) {`) Futty v2.0 — o que a tela do sorteio mostra, dado o que a API devolveu (Rodada 29J, achado 120:
  REGRESSÃO onde um erro de rede/sessão caía no MESMO "ainda não foi realizado" do sorteio nunca
  feito — a tela dizia isso com o sorteio intacto no banco, só porque a ida à API falhou).
  Usado por SorteioShow (com login) e SorteioPublico (link /p/): as duas leem de `useApi`, as duas
  precisam do MESMO critério — 'erro' nunca se confunde com 'nao_feito'.

## src/utils/faixaRolavel.js

- (linha ~1, `export const FOLGA_PX = 4;`) Futty v2.0 — Rodada 29L (achados 130 e 138): uma faixa que rola para o lado tem de DIZER que rola. Esta é a conta, pura para testar no
  Node: dado o que o navegador mede num trilho horizontal, há mais coisa à esquerda? à direita?

## src/utils/figurinhaCanvas.js

- (linha ~8, `function cronometro() {`) ─── Cronómetro de fases (FLUIDEZ 2, 16-set) ─────────────────────────────────
  Cada composição diz quanto custou cada passo. Sem isto, "o canvas leva 8,8 s"
  não aponta para conserto nenhum — com isto vê-se que o custo é o blur por
  software, não o desenho. Os números vão para a caixa-preta (lib/diagnostico)
  e aparecem na tela de Diagnóstico como "cromo: fases".
- (linha ~87, `function canvasParaBlob(canvas) {`) VELOCIDADE 9 (23-set): quem manda a foto do cromo à frente é o
  context/PerfilContext.jsx, mal o perfil aparece (inclusive vindo do cache
  local, antes de qualquer rede) — com um `new Image()` na MESMA URL que o
  `construirCard` pede aqui em baixo (urlImagem(…, 512)). O adiantamento tem de
  viver lá, não aqui: importar este módulo no arranque para poupar um decode
  seria pôr o desenhador inteiro no caminho da primeira pintura.
- (linha ~118, `function desenharBaseEscura(ctx, W, H) {`) FASE 3.51 — BASE ESCURA partilhada: fonte de verdade única do gradiente vertical.
  O 'épico' constrói-se por cima dela; o 'neutro' é ela + vinheta, e nada mais. Antes
  o neutro era preto puro (#000) e destoava — agora os dois fundos partem do mesmo
  sítio e mudam só no que se lhes acrescenta.
- (linha ~131, `function desenharVinheta(ctx, W, H) {`) FASE 3.51 — VINHETA partilhada (elíptica, só nas margens), pelo mesmo motivo.
- (linha ~151, `export const AURA_ESCALA = 2;`) Fundo "Aura" — réplica FIEL do glow SELADO da vitrine (variante A, app.css .perfil-glow):
  base escura da casa + aura dourada elíptica ATRÁS do jogador. Valores COPIADOS do palco
  selado (330×470; glow box 300×344; ellipse 50%×48% @ 50%,45%; stops .55/.24/.07/0 @
  0/34/56/78%; blur 46) e só reescalados ao 2:3 do cromo. NÃO toca no palco selado.
  FLUIDEZ 2 (16-set) — o glow desfocado é PRÉ-DESENHADO, uma vez por sessão.

  Medido no WebKit: o `ctx.filter = blur(56px)` a transferir o glow para um card
  de 600×600 custava 785 ms de thread principal, numa fatia só. Era a fase mais
  cara de todo o canvas.

  A solução vem da natureza do próprio desenho: o glow é uma elipse de gradiente
  radial DESFOCADA — ou seja, uma mancha suave, sem um único detalhe fino. Uma
  imagem dessas desenhada a 160 px e ampliada para 600 é indistinguível da
  desenhada a 600, porque não há lá nada que a ampliação possa borrar. E o
  desfoque custa área × raio: a 160 px, com o raio na mesma proporção, sai por
  ~2% do que custava.

  Fica em cache por PROPORÇÃO (o card 2:3 e o retrato quadrado têm caixas de
  glow diferentes), não por tamanho: como tudo no desenho escala com W, a mesma
  mancha serve qualquer resolução.

  RODADA 29H-B (dono, 2-out, item 56): a aura no DOBRO do tamanho e com 25% MENOS opacidade. A caixa do glow dobra
  (AURA_ESCALA) e cada parada do degradê sai com 3/4 do alpha (AURA_OPACIDADE) — a elipse continua centrada no mesmo ponto,
  só cresce e suaviza. O palco selado da vitrine (.perfil-glow) NÃO muda: é a aura do CARD que o dono pediu.
- (linha ~196, `const g = octx.createRadialGradient(0, 0, 0, 0, 0, 1);`) DOSE glow ×2 (mesmo desenho, dobra opacity/spread): alphas dobrados (clamp) e
  stops empurrados para fora (mais alcance). Base seladas: .55/.24/.07 @ 0/34/56/78.
  29H-B: os alphas de antes (0,95 / 0,48 / 0,16) vezes AURA_OPACIDADE (0,75) — o dobro do tamanho vem da caixa, em desenharFundoAura.
- (linha ~221, `const gw = Math.max(2, Math.round(W * (300 / 330) * AURA_ESCALA));`) b) glow do tamanho do "glow box" (300/330 × 344/470 do palco), já desfocado — e, desde a 29H-B, no DOBRO (AURA_ESCALA): a
  mancha passa a sangrar além do card, de propósito; o que sobra é cortado pelo próprio canvas.
- (linha ~247, `const PALETAS_PREMIUM = {`) 29H-B (decisão do dono, 2-out, noite): o GOLDEN FICA O ATUAL, com as estrelas e os brilhos. As variantes A/B da prancha
  (ouro fosco / ouro escuro, brilho só nas bordas) foram descartadas e saíram do app; o PNG em FUT/DESIGN fica só como registro.
- (linha ~352, `const MAX_PADROES = 3;`) Fundo "Épico" — honeycomb alinhado ao ângulo do F + monograma como marca de água,
  placa 3D (pseudo-perspectiva), luz central e vinheta. EXPORTADO para o tile da UI
  renderizar o FUNDO REAL em miniatura (em vez de uma imitação em CSS/SVG).
  Ordem: base → [hexágonos + F, DESFOCADOS] → luz central → vinheta.

  `intensidade` multiplica SÓ o alpha das arestas do honeycomb. O card usa 1 (a
  discrição desenhada); o tile de 120×120 usa 3.0, senão o padrão desaparece na
  miniatura — a mesma geometria, legível à escala a que é vista.
  FLUIDEZ 2 (16-set) — o padrão do Épico é construído UMA vez por tamanho.

  Medido no WebKit: `epico:blur` custava 725 ms no card e 659 ms no cromo — a
  fase mais cara depois do Aura. E era refeita a cada composição, apesar de o
  desenho ser DETERMINÍSTICO (seed fixa 20240): o mesmo tamanho dá sempre
  exactamente os mesmos pixéis.

  Duas mudanças: o desfoque passa a ser por faixas (ver desfocarPorFaixas — o
  mesmo resultado, em fatias de poucos ms) e a camada pronta fica em cache. A
  segunda figurinha com fundo Épico não desenha um hexágono sequer.

  Três entradas chegam: o cromo do Início, o card do download e o tile do
  seletor de fundos. Cada uma é um canvas com alpha, por isso não se deixa
  crescer sem conta.
- (linha ~448, `const aPassiva = 0.065 * intensidade;`) FASE 3.51 — as arestas passivas eram brancas (0.022); passaram a DOURADAS
  (o dourado sobre esta base tem menos contraste que o branco, daí o alpha
  subir). FASE 3.55 — mais dourado: 0.045 → 0.065 e 0.08 → 0.115. As "vivas"
  são 12% das células. `intensidade` só existe para o tile (ver assinatura).
- (linha ~483, `cctx.transform(1.02, -0.085, 0.07, 0.98, 0, 0);`) FASE C — pseudo-perspectiva mais assumida: skews b -0.06 → -0.085 e c 0.05 → 0.07
  (~+40%). A ROTAÇÃO do padrão fica nos 14.52° do futty-logo-flat.png (fase 3.33) —
  a fonte canónica. Medi fresco o F do kit fotografado e deu 15.52°, mas o Δ de 1° é
  ruído: o logo no kit tem 51x61px, está impresso em tecido curvo e com sombra. Um
  grau, num padrão com blur 1.2px e alpha 0.065, ninguém vê — e alinhar a marca pela
  fotografia do produto em vez do vector seria ancorá-la no derivado.
- (linha ~520, `const SELO_TROFEU = ['M13 9 L35 9 L31 25 L17 25 Z', 'M13.5 11 L8 11 L8 17 L15 2…`) Desenha o card 2:3 num canvas próprio (largura×altura). `k` escala os valores
  fixos (fontes, badge, frame) para render nativo a qualquer resolução.
  Selos de honra (Vaga 11C) — desenhados no cromo (top-right). Path do troféu da
  casa (= icons/trofeu.svg) + tiers metálicos. Forma A (postal denteado).
- (linha ~569, `const EYE_FRAC = 0.215;`) FLUIDEZ 2 (16-set) — ONDE o avatar fica dentro do card. Extraído do desenho
  para poder ser usado também pela PRÉVIA em DOM do Início (ver CromoInicio):
  os dois têm de pôr o jogador exactamente no mesmo sítio, senão a troca da
  prévia pelo cromo desenhado salta à vista. Uma conta só, um sítio só.

  FASE 3.44 — Zoom ANCORADO AOS OLHOS. Antes fixava-se o topo (dy = H*0.12) e,
  como dh cresce com avatarZoom, o olhar descia ao ampliar. Agora ancora-se o
  ponto dos olhos: dy = EYE_Y - dh*EYE_FRAC. Como dh já inclui o zoom, os olhos
  ficam sempre em EYE_Y e o corpo cresce à volta desse ponto.
  EYE_FRAC medido no avatar gerado (445x680, já com trim+extend): pupila esquerda
  a 20.9% e direita a 22.2% da altura do PNG (cabeça inclinada) → média 21.5%.
- (linha ~595, `const ANCORA_DO_ROSTO_Y = 1 / 3;`) RODADA 27 — onde a foto da figurinha COMUM fica dentro do card. Era uma conta solta dentro do
  construirCard; agora é uma função, porque a prévia em DOM do Início (PreviaCromo) tem de pôr a foto
  no MESMO sítio que o canvas põe, senão a troca da prévia pelo cromo desenhado salta à vista (medido:
  47,9 px de desvio numa caixa de 184 px, porque a prévia usava a conta da Brilhante).

  A foto preenche o card inteiro (cover) e, quando sobra altura, fica alinhada ao TOPO: numa 2:3 com
  margem o que sobra é chão, não cabeça (a regra de sempre — a coroa nunca é comida). O recorte 2:3 do
  CropModal já é o enquadramento que a pessoa escolheu; num card 2:3 ele aparece inteiro, num quadrado
  aparece o quadrado do topo dele.

  RODADA 28 — zoom (−/+) na Figurinha. O PISO é 1 = a foto cobre a moldura por completo (nunca faixa
  vazia, nunca a borda da foto à mostra); acima disso aproxima em torno do rosto — o centro na
  horizontal e o terço de cima na vertical, onde o CropModal pede o rosto — sem nunca descobrir a
  borda. Com zoom 1 a conta é EXATAMENTE a de antes: o enquadramento salvo continua a ser o de todas
  as telas (o Início e a prévia dele usam sempre 1).
- (linha ~633, `export function mostraFigurinha(user) {`) RODADA 28 — o card mostra AGORA uma figurinha (IA)? Quem diz é o motor (`figurinha_ativa`, pela regra
  única do nome do arquivo — backend/utils/figurinhaRegra.js). As telas decidiam por foto_url ≠
  avatar_url, e a foto do Google em avatar_url entrava no card como figurinha: seletor de fundos, zoom
  abaixo da moldura, faixas vazias. A conta antiga só vale para uma resposta guardada de antes desta
  rodada, sem o campo, até o /api/me fresco chegar.
- (linha ~661, `const ehComum = modo === 'comum';`) 'comum' (SPEC-FIGURINHA-3 §3, 22-set) — a figurinha GRÁTIS: a foto da
  pessoa COMO ELA É, com o fundo dela, a preencher o card inteiro (cover),
  sem IA, sem recorte de fundo e sem os fundos da casa. Mesma moldura, mesma
  placa, mesmo 2:3 da Brilhante — é o mesmo álbum, e essa é a razão de ser.
  'brilhante' é tudo o que existia antes deste dia: avatar recortado a
  flutuar sobre o fundo escolhido, dentro do octógono.
- (linha ~697, `const octagonoLados = (t, r, b, l) => {`) FASE 3.45 — Variante com inset POR-LADO. O `cut` é o mesmo nos quatro cantos, por
  isso as diagonais continuam a 45° mesmo com insets diferentes (dx = dy = cut).
- (linha ~733, `const nomeFonte = 46 * k;`) tamanho base da fonte do nome (FASE 3.36: era 52*k)
- (linha ~745, `const { dx, dy, dw, dh } = enquadrarFotoComum({ W, H, nw: avatar.naturalWidth,…`) Alinhado ao TOPO quando a foto sobra em altura (enquadrarFotoComum, acima do construirCard);
  o zoom (Rodada 28) só aproxima — nunca abaixo de cobrir a moldura.
- (linha ~758, `const insetTopo = 11.1 * k;`) FASE 3.26/3.45 — Clip OCTOGONAL: o avatar nunca é desenhado sobre o CORPO
  dourado grosso do frame, em nenhum lado. Geometria medida do próprio frame:
    corpo grosso : path a 3.5*k, lineWidth 7*k  → ocupa [0, 7*k] de cada borda
    linha fina   : path a 8.5*k, lineWidth 1.2*k → ocupa [7.9*k, 9.1*k]
  3.45 — as LATERAIS deixam de parar na linha fina e vão até à borda interior do
  corpo grosso (7*k) + 1*k de respiro = 8*k. A linha fina deixa de ser fronteira
  lateral: o braço pode sobrepô-la na faixa [8, 9.1]*k (1.1*k). Topo e base ficam
  nos 11.1*k da 3.26 — irrelevantes na prática (a 130% a cabeça está a y=84, com
  73px de folga, e a placa cobre a base).
- (linha ~836, `const fonteMin = 22 * k;`) FASE 3.55: nome nunca corta (era 36*k)
- (linha ~882, `const desenharFrame = () => {`) FASE 3.46 — FRAME extraído para função. Antes vivia solto no fim (passo 6) e só
  o card completo e a moldura o desenhavam; agora a camada de topo do preview
  também o pede, para o preview ter a MESMA ordem de desenho do download
  (frame por cima do avatar). Deve ser chamado SEMPRE depois do ctx.restore()
  que remove o clip octogonal — o frame é inset e não quer recorte.
- (linha ~991, `if (ehComum && avatar) desenharGradienteInferior();`) RODADA 28 — na COMUM a foto cobre o card inteiro: o gradiente de baixo, que no PNG baixado vem
  POR CIMA da foto, tem de vir nesta camada. Na camada do fundo ele ficava escondido atrás da foto
  e a prévia da Figurinha saía mais clara que o card que a pessoa baixa e compartilha.
- (linha ~999, `function desenharSelos() {`) SELOS DE HONRA (Vaga 11C) — máx 2, canto sup. direito, sobre o frame. Hoisted:
  desenha no card completo (download) E na camada apenasPlacaNome (topo do preview).
- (linha ~1013, `if (apenasPlacaNome) {`) MODO CAMADA SÓ-PLACA+NOME+FRAME: camada de TOPO do preview. FASE 3.46 — passa a
  incluir o frame, para o braço (que agora chega ao corpo grosso) ficar por baixo
  da linha fina, tal como no card único do download.
- (linha ~1032, `desenharFundoNeutro(ctx, W, H);`) FASE 3.51 — 'preto' (label "Neutro") era #000 puro e destoava do épico. Passa a
  partilhar a base escura: mesmo gradiente + vinheta, sem honeycomb/F/luz.
- (linha ~1044, `const desenhar = fundo === 'golden' ? desenharFundoGolden : desenharFundoRoyal;`) GOLDEN/ROYAL premium — chapa foil + poeira de cristal (atrás do avatar), MESMO
  pipeline (desenharFundoPremium). No PREVIEW (apenasMoldura) do GOLDEN a chapa
  entra SEM glints baked → a "mina" vive no overlay animado (z3); no card completo
  (download) os glints saem NO PICO (frame mais rico).
  ROYAL (decisão do dono, 2-out, noite): o app renderiza EXATAMENTE como a prancha
  golden-variantes.png — chapa roxa + os 14 brilhos no pico, também na prévia. O
  overlay vivo nunca existiu para o Royal, e a prévia entrava com a chapa nua (0 de
  14 brilhos, medido em scripts/prova-royal.mjs): a poeira passa a ser desenhada na
  própria camada de fundo, atrás do jogador, como no download.
- (linha ~1114, `if (!apenasMoldura) {`) 6. FRAME — FASE 3.46: no card completo continua a desenhar-se aqui (depois do
  avatar). Na camada `apenasMoldura` deixa de o ser: passou para a camada de topo
  do preview (apenasPlacaNome), para o preview e o download ficarem idênticos.
- (linha ~1127, `const LADO_MAX_CROMO = 600;`) Figurinha normal: card 2:3 a 400×600 → PNG completo (com jogador). Usado no
  Baixar/Compartilhar (uma imagem só). Com formato:'quadrado' devolve o RETRATO
  quadrado 600×600 (sem placa/nome) que o Início mostra — mesma moldura e fundos.
  FLUIDEZ 2 (16-set) — o retrato QUADRADO passa a ser gerado no tamanho a que
  vai ser VISTO, não sempre a 600×600.

  O cromo do Início é um elemento de tela, e a sua largura vem do CSS
  (`.cromo-inicio`: 49% da largura da tela, teto de 236 px): num iPhone de 390 dá
  191 px, num computador 236 px. A 600×600 fixos, o iPhone gerava ~10× mais pixéis
  do que mostra — e cada pixel a mais é rasterização e codificação de PNG.

  Tecto de 600 (o tamanho canónico de sempre — nunca se gera MAIOR do que o que
  já se desenhava) e piso de 300, para o cromo nunca sair mole se a medição da
  tela vier errada. O card 2:3 do download não entra aqui: ali o tamanho é o
  produto, não uma medida de tela.
- (linha ~1164, `export async function gerarCamadasFigurinha(opts = {}) {`) Três camadas para o preview do studio, para o avatar inteiro não tapar nada:
    fundoBlob   = fundo+holofotes+gradiente, SEM avatar/placa/nome E SEM FRAME
    jogadorBlob = só o avatar (transparente) — vai por cima das partículas
    placaBlob   = placa+nome+FRAME (transparente) — camada de topo, sempre visível
  Partículas entram entre fundo e jogador; placa+frame ficam acima do jogador.
  FASE 3.46 — o frame saiu do fundo para o topo: o braço encosta ao corpo dourado e
  a linha fina desenha-se POR CIMA dele, exactamente como no card único do download.
  Ordem no preview: fundo (z2) → partículas (z3) → jogador (z4) → placa+frame (z5).

## src/utils/format.js

- (linha ~12, `export function formatDateTime(iso, fuso, opcoes) {`) Data + hora do jogo (ex.: "qua., 18 de jun. · 22:00") no relógio do CAMPO: `fuso` é o do time (Rodada 29I, achado 83).
  Uma forma só em toda tela — a de src/utils/dataHora.js, com o rabicho "· horário de <cidade>" para quem está noutro relógio
  (`opcoes.cidade`: a do time).
- (linha ~28, `export const SEM_NOTA_AINDA = 'sem nota ainda';`) Achado 119 (29J): "★ -" no Elenco, "--" no Início e no Perfil, "—" na vitrine — quatro formas
  para a mesma coisa. Uma só, que diga o que é (a vitrine já dizia certo: "Sem nota ainda").
- (linha ~32, `export function formatRating(value) {`) Nota formatada em PT-BR com UMA casa ("9,1") ou SEM_NOTA_AINDA se não houver votos. Rodada 29Z: era "9.10".

## src/utils/frameColors.js

- (linha ~1, `export const FRAME_COLORS = {`) Futty v2.0 — Mapa de cores do frame do jogador (fonte única do getFrameColor).
  ⚠️ users.cor_frame é MORTO CONFIRMADO (vaga 4 do B2): nenhum UI o escreve e NADA o
  lê de forma viva. getFrameColor é sempre chamado com 'dourado' fixo (Figurinha,
  figurinhaCanvas) ou com um valor de DEMO (PlayerCard na LandingPage). O Ranking —
  que se assumia ser o último leitor — nunca leu a coluna: pinta ouro hardcoded
  (AvatarFrame) e o pódio por posição. O backend ainda faz SELECT/retorna a coluna
  (auth.js, ranking.js) mas o valor é ignorado. Candidato a morte na limpeza final:
  coluna users.cor_frame + os dois SELECT + esta tabela (fica só se um kit colorido
  voltar a usar frames não-dourados). Ver [[playercard-candidato-a-morte]].

## src/utils/freguesias.js

- (linha ~1, `import { normalizarCidade } from './cidades';`) Futty v2.0 — Rodada 29H (item 12): o campo "Bairro" do time. Puro (sem React, sem rede).

  Em Portugal o "bairro" é a freguesia: public/dados/freguesias.json (scripts/gerar-freguesias.js, CAOP + Wikidata das ilhas) traz
  [[concelho, distrito|ilha, [[freguesia, lat, lng], …]], …] e o campo sugere as freguesias do concelho da cidade que a pessoa
  escolheu. Rodada 29T (bloco B): no Brasil o bairro também é de lista (IBGE, utils/bairros.js) e a pessoa só escolhe o que a lista tem —
  sem texto livre, no Brasil nem em Portugal. A normalização é a MESMA de utils/cidades.js (e do motor): sem acento, sem maiúscula, espaços duplos fora.
- (linha ~9, `export const TEXTO_APOIO_BAIRRO = 'Só o bairro e a cidade, nunca o endereço.';`) O texto de apoio do campo (dono, 2-out).

## src/utils/haQuantoTempo.js

- (linha ~1, `import { plural } from './plural';`) Futty v2.0 — "há 5 h": tempo decorrido, não data de calendário. Não tem fuso (29I, achado 83): vale o relógio de quem olha.
  Rodada 29L (achado 136): estava copiada em três lugares (Resenha, comentários, painel do admin) e dizia "há 1 meses" entre 56 e 59 dias.
  Uma só, concordando em tudo.

## src/utils/idade.js

- (linha ~1, `export const IDADE_MINIMA = 18;`) Futty v2.0 — A régua de idade do cadastro (Rodada 29G, 1-out: o Futty é 18+ de ponta a ponta). A MESMA
  do motor (backend/utils/idade.js): o app avisa antes, o motor confere de novo e é quem decide.
  O número mora SÓ aqui (e no motor): telas e textos usam IDADE_MINIMA / MSG_MENOR.

## src/utils/jogosFuturoPassado.js

- (linha ~1, `export function separarFuturosPassados(games, agora) {`) Futty v2.0 — separa os jogos do time em "futuros" e "passados" (aba Jogos do admin).
  Achado 115 (Rodada 29J): a API (`GET /api/teams/:slug/games`) devolve `data` DECRESCENTE —
  certo para "Passados" (o mais recente primeiro), errado para "Futuros" (mostrava o jogo mais
  DISTANTE no topo e o próximo por último). Aqui "Futuros" sai sempre crescente: o próximo jogo
  primeiro. "Passados" mantém a ordem que chegou (decrescente, o mais recente primeiro).

## src/utils/kitsFigurinha.js

- (linha ~14, `export const KITS_FIGURINHA = [`) Os 5 kits do lançamento (31-jul, dono): mesmo design, cores diferentes. Os NOMES são em português (29I, achado 91: "Dark Gold", "White Gold"…
  eram inglês numa casa toda PT-BR); os ids continuam os de KITS_IA no motor — são chaves internas, nunca aparecem na tela. Este
  seletor só existe para quem já tem Brilhante — o cadeado de cada tile é
  DIREITO (crédito ou pacote do time, ver escolherKit), não plano; `estado`
  só distingue 'breve' (kit sem asset, nem aparece) dos demais.

## src/utils/lazyComRetry.js

- (linha ~1, `import { lazy } from 'react';`) Futty v2.0 — lazy() com retry para falhas de chunk (build 10, achado real:
  uma resposta ruim transitória da CDN ficou presa no cache do service worker
  — ver public/sw.js — e o import dinâmico de uma tela quebrava com "Failed
  to fetch dynamically imported module"; o ErrorBoundary caía em "Algo deu
  errado" e, no iPhone, o sintoma era o F carregar e ficar só o fundo.

  Duas camadas de defesa:
  1. Retry simples (o sw.js já não guarda respostas ruins — ver comentário
     lá — então uma 2ª tentativa já deve ir à rede de verdade). Cache-busting
     por query string NÃO dá para fazer aqui: o import() do Vite é estático
     (resolvido em build para a URL com hash), e o Safari — o browser que
     importa neste app — não expõe a URL que falhou na mensagem de erro
     (ao contrário do Chrome), então não há como reconstruir um pedido
     "fresco" manualmente de forma confiável entre browsers.
  2. Se o retry falhar de novo, o chunk provavelmente já não existe mesmo
     (deploy novo apagou o hash antigo do CDN) — a única saída real é
     recarregar a PÁGINA, que busca um index.html novo com os hashes
     certos. Um reload só, guardado por sessionStorage: se mesmo assim
     continuar a falhar, mostra o ErrorBoundary normal em vez de entrar
     num loop de recarregar para sempre.
- (linha ~36, `const pronto = importarFn.jaCarregado?.();`) Velocidade 7B: módulo já carregado (lib/preaquecerAbas.js) vai por um
  thenable SÍNCRONO — o React.lazy resolve-o na própria renderização e a
  tela aparece sem passar pelo F do Suspense (e sem os ~300 ms que o React
  segura o fallback antes de revelar). Uma promessa, mesmo resolvida, suspende.

## src/utils/lembretes.js

- (linha ~1, `export const DIAS_DO_AGORA_NAO = 7;`) Futty v2.0 — Rodada 29T-C: o "Agora não" dos lembretes sem prazo do Início. Esconde o lembrete por 7 dias NAQUELE aparelho (localStorage) e a fila anda;
  passados os 7 dias ele volta sozinho. Puro: o armazém e o relógio entram por parâmetro, o teste roda no Node. Tudo com try/catch — o localStorage some em
  janela privada, com dados bloqueados e em pré-visualização; sem ele o lembrete só fica escondido enquanto a tela está aberta (o Início guarda o mesmo em estado).

## src/utils/linkDoSorteio.js

- (linha ~1, `import { apiFetch } from '../lib/api';`) Futty v2.0 — Rodada 29I, bloco 3 (item 74 da Rodada 29): o link do sorteio que vai para o grupo.

  Era futtyapp.com.br/p/<slug do time>/<uuid de 36 caracteres> — comprido e feio no WhatsApp. Agora, quando o motor dá um código
  (POST /api/games/:id/link-curto, migração 078), é futtyapp.com.br/s/<código de 8>, no mesmo molde do /c/<código> do convite. Sem
  código (migração por aplicar, motor fora), o longo de sempre — que continua valendo.

## src/utils/logoTime.js

- (linha ~1, `export const LOGO_TIPOS = ['image/png', 'image/jpeg', 'image/webp'];`) Futty v2.0 — Rodada 29A (H): o logo do time na criação. Opcional, 2 MB, png/jpg/webp — o mesmo que o motor aceita
  em POST /api/teams/:slug/logo (a moderação e a verificação de imagem real acontecem lá, não aqui).

## src/utils/luzesSlot.js

- (linha ~1, `export function reguaDeLuzes({ n, inicio = 0 }) {`) Futty v2.0 — Rodada 29C: as lâmpadas das duas máquinas das boas-vindas (components/BoasVindas.jsx), com a geometria
  da prova aprovada pelo dono (FUT/DESIGN/prova-boas-vindas-v2.html). Puro (sem React): só números. A animação é CSS e
  acende cada lâmpada pela ordem do `i` (animation-delay: calc(var(--i) * -.09s)) — é o `i` que faz a onda correr.

## src/utils/miniSorteio.js

- (linha ~1, `const VERSOES = typeof __VERSOES_ONBOARDING__ !== 'undefined' ? __VERSOES_ONBOA…`) Futty v2.0 — Rodada 29E2/29E3: o que o mini sorteio do Onboarding (components/MiniSorteio.jsx) sorteia e QUANDO. Puro (sem React).
  Oito FIGURINHAS FICTÍCIAS (modelos gerados por IA, 20–40 anos, nunca pessoa real; bancada
  backend/scripts/_bench/gerar-modelos-ficticios.js --jovens..--jovens7; bustos em public/onboarding/, servidos do site) em oito
  ROLOS de slot machine, 4 por time (29E3, dono: 4 jogadores por time) — TIME A (ouro) e TIME B (roxo). Os 8 giram; um por vez
  desacelera e trava, alternando A/B; os times seguram; fade; recomeça com outra ordem. Nomes fictícios curtos (dono): nunca nomes
  de gente real do app. GONÇALO (29E3, dono) é o nome do busto j12 — o arquivo é goncalo.webp (o id não leva cedilha: é URL).
  A ordem natural (ciclo 0) alterna A/B: TIME A = bruninho, gonçalo, rafa, nando · TIME B = tiagão, pedrão, dudu, caio — 2 do
  Brasil e 2 de Portugal em cada time.
- (linha ~10, `const VERSOES = typeof __VERSOES_ONBOARDING__ !== 'undefined' ? __VERSOES_ONBOA…`) Rodada 29H (item 37): o arquivo leva ?v=<hash do conteúdo> (vite.config.js define __VERSOES_ONBOARDING__ a cada build). O _headers
  serve /onboarding/* com cache de 1 ano, imutável, e o nome do arquivo não muda quando a arte muda — sem a versão, quem já viu
  o busto antigo continuava vendo. Fora do Vite (os testes no Node) não há versão e o caminho fica limpo.
- (linha ~35, `export const TEMPOS = { giroMs: 400, passoMs: 750, desaceleraMs: 1500, pulsoMs:…`) O ciclo (~10,7 s). Rodada 29H-B (dono, 2-out, item 40): o giro inicial caiu pela metade (0,8 → 0,4 s) e a revelação ficou 1,5×
  mais longa (um rolo a cada 0,75 s em vez de 0,5; a desaceleração acompanha, 1,5 s em vez de 1 s); a comemoração é a mesma.
  Os 8 rolos girando rápido → a partir de 0,4 s um rolo por vez desacelera (1,5 s) e trava, alternando A/B a cada 0,75 s (o 8º trava
  em 7,15 s) → quando o 8º trava, um pulso único de 0,8 s nas réguas e os times seguram 2,5 s → fade 0,4 s → os rolos voltam a girar
  (0,6 s de respiro) → recomeça com outra ordem.

## src/utils/nomeDoTime.js

- (linha ~1, `export const NOMES_DAS_CORES = ['Time Ouro', 'Time Roxo', 'Time Prata', 'Time B…`) Futty v2.0 — Rodada 29M (achado 143): UM nome por time em todo o sorteio. A cerimônia chama os times pelas cores ("Time Ouro", "Time Roxo"…),
  mas o motor grava "Time A" e "Time B"; a tela mostrava os dois nomes ao mesmo tempo (a lista dizia "TIME OURO", os botões de baixo
  "9:16 · TIME A") e quem acabou de ver "Time Ouro" tinha de adivinhar qual cartão era o dele. Esta é a regra, para a cerimônia, os botões, o
  cartão 9:16 e a página pública:
    · nome genérico do motor ("Time A", "Time 1") ou já de cor ("Time Ouro") → o nome da COR daquela posição;
    · nome que a equipe escolheu de verdade (um campeonato com "Os Boleiros") → esse nome, nos dois lugares.
  Passando de 4 times as cores repetem; o nome ganha o número da volta ("Time Ouro 2"), para dois times nunca terem o mesmo nome.

## src/utils/normalizarFoto.js

- (linha ~1, `export async function normalizarFoto(file) {`) Futty v2.0 — Normaliza a orientação EXIF de uma foto ANTES do CropModal
  (build 9, achado real: selfie no iPhone aparecia girada 180°). Causa: a
  câmera do iPhone grava o pixel "deitado" e só a tag EXIF Orientation diz
  como desenhar em pé; nem todo canvas/lib respeita essa tag por igual
  (o CropModal usa react-easy-crop sobre uma <img>, que segue o EXIF no
  próprio browser — mas o buffer que SOBE para o servidor, se for lido cru
  depois, pode perder essa informação num passo intermédio). Resolve-se uma
  vez, aqui, redesenhando em pixels JÁ orientados: createImageBitmap com
  imageOrientation:'from-image' lê a tag e devolve o bitmap corrigido; o
  canvas grava sem tag nenhuma (reencode = sem EXIF), então NINGUÉM
  downstream (CropModal, upload, backend) precisa de voltar a interpretar
  orientação — já está certa nos pixels.

## src/utils/novoJogo.js

- (linha ~1, `import { dataComDiaPorExtenso, diaDeCalendario, formatarHora, instanteNoCampo,…`) Futty v2.0 — Rodada 29S, bloco A (achados 151 a 156): as contas do "Marcar jogo" (Novo jogo), puras, para testar no Node.
- (linha ~4, `export const HORA_PADRAO = '20:00';`) A hora de uma pelada: o jogo nasce às 20:00 (achado 155), não na hora do relógio de quem abriu a página.

## src/utils/numero.js

- (linha ~1, `const formatadores = new Map();`) Futty v2.0 — Rodada 29Z: UM lugar só para escrever número com casa decimal na tela.

  Brasileiro escreve 77,9 e 9,1 — nunca 77.9 nem 9.10. Antes cada tela formatava por conta própria (toFixed, toFixed + replace, uma
  delas com duas casas) e a vírgula só aparecia onde alguém lembrou. Agora toda casa decimal que é TEXTO passa por aqui: Intl.NumberFormat
  com locale pt-BR explícito, nunca o do aparelho (a mesma lei da hora em dataHora.js: o número lê-se igual para todo mundo).

  Fica de fora só o que não é texto: valor de CSS (calc, translate, gradiente), ponto de SVG, atraso de animação, mapa de canvas. Esses
  continuam com toFixed — a máquina lê ponto, a pessoa lê vírgula. O teste scripts/unidade/numero-ptbr.test.mjs trava as duas metades.

## src/utils/ordenarTimes.js

- (linha ~1, `const colatorNome = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric:…`) Futty v2.0 — Gabinete, "Pessoas & times → Times" (Rodada 29Y): a ordem da lista de equipas.
  Funções puras (sem React, sem rede): a tela e os testes leem a mesma regra.

  Nome A–Z é ordem de DICIONÁRIO PT-BR: Intl.Collator com sensitivity 'base' ignora maiúscula e acento ("gajos" fica junto do G,
  "Éden" junto do E). `numeric` põe "Time 2" antes de "Time 10".

## src/utils/plural.js

- (linha ~20, `export function contar(n, singular, pluralForm) {`) Rodada 29L (achado 136): o número e a palavra concordando — contar(1, 'jogo', 'jogos') → '1 jogo'; contar(0, …) → '0 jogos'.

## src/utils/posicoes.js

- (linha ~1, `export const POSICOES = [{ k: 'GL', label: 'Goleiro' }];`) Futty v2.0 — Posição do jogador. Rodada 9 (decisão do dono, 16-set):
  GR/DEF/MEI/ATA saiu do app. Só existe goleiro ('GL') ou jogador de linha
  (null) — é isso que o sorteio usa. O motor já normaliza a leitura, então os
  DEF/MEI/ATA que ainda estão no banco nunca chegam aqui.

## src/utils/precos.js

- (linha ~1, `const FUSOS_BRASIL = [`) Futty v2.0 — Região por FUSO HORÁRIO do aparelho (13-set, "Velocidade 3"), só
  caindo para o IDIOMA quando o fuso não está disponível — nunca por IP/geo-
  localização (sem permissão a pedir, sem custo de rede, funciona offline).

  Ordem (13-set — motivo: brasileiro em Lisboa com o celular ainda em pt-BR
  pagava em real; o fuso é o sinal mais forte de ONDE a pessoa está agora):
   1) fuso está na lista FECHADA de fusos do Brasil → real;
   2) fuso existe e NÃO é do Brasil → euro (mesmo com idioma pt-BR);
   3) sem fuso (Intl indisponível) → idioma pt-BR → real, senão euro.
  Computado 1x ao carregar o módulo — a moeda não muda durante a sessão (SPA
  sem SSR: navigator e Intl sempre existem no browser).

  Os preços em si (Brilhantes do time / manto / Minha Brilhante, por moeda)
  vivem em lib/planos.js — aqui só se decide QUAL moeda usar.

## src/utils/presenca.js

- (linha ~1, `export function respostaNoRsvp(rsvp, meuId) {`) Futty v2.0 — Rodada 29I (achado 86): as contas da presença (RSVP) que o Início faz na tela — puras (sem React, sem rede), para testar no Node.

  O "Vou / Não vou" grava no RSVP do jogo. A tela mostra o resultado NA HORA (estado otimista) e, se o pedido falhar, volta ao que
  estava: tudo se resume a "qual é a resposta de agora" — `respostaAgora` — e o número de confirmados e o status do botão saem dela.

## src/utils/primeiroNome.js

- (linha ~1, `const PONTUACAO_NO_FIM = /[\s,.;:\-–—]+$/u;`) Futty v2.0 — Rodada 29I (achado 92): o primeiro nome de uma pessoa, sem a pontuação colada.

  A conta "CHAVO, EL MATADOR" virava "Solte a resenha, Chavo,…" — o app cortava no primeiro espaço e a vírgula ia junto. Qualquer nome
  com vírgula, ponto ou hífen no fim da primeira palavra fazia isso. Puro (sem React), para testar no Node.

## src/utils/quandoOndeDoJogo.js

- (linha ~1, `import { formatarDataHora } from './dataHora';`) Futty v2.0 — Rodada 29K, achado 112: "qui., 8 de out · 20:00 · Society Madalena — campo 2" —
  a linha de quando e onde é o jogo, para a página pública do sorteio (/p/, /s/), no relógio do
  CAMPO (fuso do time, achado 83) com o rabicho da cidade quando for diferente do de quem olha.

## src/utils/radar.js

- (linha ~1, `export const TITULO_SEM_LOCAL = 'Peladas abertas a novos jogadores';`) Futty v2.0 — Rodada 29T (bloco A, achados 159 e 161): o que o Radar de peladas diz depois de entrar num time e o título da lista.
  Título (161): "Perto de você" só com a localização ligada; com uma cidade escolhida, "Em <cidade>"; sem nenhuma das duas a lista é de TODOS os
  times abertos, e o título conta isso. Antes dizia "Times perto de você" para quem não tinha dado posição nenhuma (e a lista trazia Lisboa).
- (linha ~7, `export function localDoTime({ bairro, cidade, localizacao } = {}) {`) Rodada 29T (bloco B, achado 157): o time se apresenta no Radar. Dentro do card, embaixo do nome: "Bairro · Cidade" e o "Sobre o time" em até 2 linhas;
  tocar no card abre um pop-up com tudo (escudo, nome, local, membros, aberto ou com aprovação, o "Sobre o time" inteiro e o botão de entrar).
- (linha ~36, `export function depoisDePedirEntrada(equipas, slug, entrou) {`) A lista do Radar depois de "Entrar" / "Pedir entrada" num time (achado 159). Entrou (time aberto): o card comemora — `entrou_agora`
  troca o "Você já é membro" por "Você entrou!" + "Ver o time" — e a contagem sobe 1 (a lista foi lida antes de a pessoa entrar).
  "Você já é membro" fica só para quem já era membro quando abriu a tela. Pediu (time com aprovação): fica o pedido pendente.

## src/utils/resultadoDoJogo.js

- (linha ~1, `export function somaDeGolsPorTime(golsMap, jogadores) {`) Futty v2.0 — Rodada 29S, bloco B: as contas do resultado de um jogo, puras (sem React, sem rede), para os DOIS editores — o ResultadoEditor (o do
  Jogo: PATCH /api/games/:id/resultado) e o ResultadoModal (o de Ajustes: PATCH /api/feed/games/:id/resultado) — e para o passo a passo do Jogo
  passado, onde eles devolvem os dados em vez de salvar. Um corpo só por pedido, montado aqui, seja qual for a tela que o manda.

## src/utils/salvarImagem.js

- (linha ~1, `import { Directory, Filesystem } from '@capacitor/filesystem';`) Futty v2.0 — Salvar/compartilhar uma imagem gerada no app (Rodada 8A, 15-set).

  "Baixar figurinha" não fazia nada no iPhone: o <a download> é ignorado pelo
  WKWebView (e pelo WebView do Android) — num app não há "Transferências". No
  nativo o caminho é o do sistema: grava o PNG na pasta de cache do app
  (Filesystem) e abre a folha de compartilhar (Share), que já traz "Salvar
  imagem", WhatsApp, Instagram etc. Na web continua o <a download> de sempre.

  iOS: o "Salvar imagem" dessa folha grava nas Fotos dentro do processo do app,
  e por isso o Info.plist precisa de NSPhotoLibraryAddUsageDescription — sem
  esse texto o iOS fecha o app no toque.

## src/utils/seuTime.js

- (linha ~1, `import { dataComDiaPorExtenso, formatarData } from './dataHora';`) Futty v2.0 — Rodada 29I, bloco 3: as linhas do card "Seu time" do Início (components/CardSeuTime.jsx), puras para testar no Node.
  As pendências vêm prontas do motor (GET /api/inicio → seu_time); aqui vira texto e destino de cada linha, na ordem da tela.
- (linha ~11, `` if (p.presenca) linhas.push({ chave: 'presenca', para: `${base}?aba=jogos${p.pr… ``) Rodada 29L (achado 128): "Sexta, 9 de out.: presença ainda não aberta" (era "Jogo de sex., 9 de out. sem presença aberta", que lia mal).
  Rodada 29R (achado 147): o toque levava à aba Jogos sem dizer onde agir. Agora leva ao jogo certo e já abre o "Abrir presença" dele
  (?abrir-presenca=<game_id>, que a página do time lê e apaga do endereço). Sem game_id (resposta antiga do motor): a aba, como antes.
- (linha ~25, `export function timesComPendenciaPrimeiro(seuTime = []) {`) Rodada 29T-B (ajuste do bloco A, decisão da Freaky): em "Seus times" os times com pendência vêm primeiro; depois, a ordem de hoje (a que o motor mandou).
  A ordem dentro de cada grupo não muda. Devolve uma lista nova.
- (linha ~49, `export function resumoDoTime(time) {`) Rodada 29L (achado 127): o que a linha de um time mostra FECHADA no card "Seus times" (2 times ou mais). Sem pendência: nada (a linha é
  só escudo e nome). Uma pendência: o texto dela. Mais de uma: a contagem, e o detalhe aparece ao tocar na linha.

## src/utils/sobreOTime.js

- (linha ~1, `export const MAX_SOBRE_O_TIME = 300;`) Futty v2.0 — Rodada 29T (bloco B, achado 157): o "Sobre o time" — a bio que o time mostra no Radar de peladas. Puro (sem React, sem rede).
  É a coluna `teams.descricao` (até 300 letras) que o motor já aceita e devolve; só o nome na tela mudou (era "Descrição" em Ajustes).
  Time aberto ao público (aberto ou com aprovação) PRECISA dizer como ele é: quem pede para entrar são estranhos, e quem acha o time no Radar
  só tem isto para decidir. Time fechado não pede.

## src/utils/sorteioCartao.js

- (linha ~1, `import { urlAsset, urlImagem } from './avatar';`) Futty v2.0 — Cartazes do sorteio (SPEC-SORTEIO §9: a via de imagem — o vídeo morreu).
  Duas saídas, MESMA identidade visual (peças partilhadas, não imitação):
    gerarCartao916      — 1 imagem POR equipa (botões "9:16 · Time X").
    gerarCartazEscalacao — o cartaz ÚNICO com TODOS os times (botão "Guardar" da máquina).
  Canvas puro (1080×1920) → PNG. A entrega é do utils/salvarImagem.js (Rodada 8A):
  na web baixa; no app abre a folha de compartilhar — o <a download> não faz nada
  dentro do WebView.
- (linha ~49, `function desenharCover(cx, img, dx, dy, dw, dh, focoY = 0) {`) object-fit: cover dentro de (dx,dy,dw,dh); focoY = object-position vertical (0..1). RODADA 27: 0 = do TOPO
  do recorte, como o CSS da cerimônia (object-position 50% 0%) e o canvas do cromo — os 0,08 de antes
  deslocavam a foto do que a pessoa enquadrou (e cada tela, um pouco diferente da outra).
- (linha ~189, `const nomeDoTime = nomeDoTimeNaTela(time.nome, timeIndex);`) Rodada 29M (achado 143): o nome é o MESMO da cerimônia e dos botões ("Time Ouro"), não o "Time A" do motor.
- (linha ~192, `cx.fillStyle = '#a99fc0'; cx.textAlign = 'center'; cx.font = '600 30px Rajdhani…`) Item 73 (Rodada 29, no bloco 3 da 29I): a linha de baixo DESCE — colada no título, ela cobria a cedilha (Ç) e as descendentes
  do nome do time. DESCE_META px abaixo da linha de base: livra a perna mais funda das letras do título (~0,22 do corpo).

## src/utils/teamColors.js

- (linha ~1, `import { PALETA, chaveDaCor } from './escudo';`) Futty v2.0 — Cores dos times (chave -> apresentação) + helpers de avatar.

  Rodada 29I, bloco 3: a fonte das cores é a paleta fixa do escudo (utils/escudo.js, 12 cores, a mesma do motor). Este arquivo só
  apresenta cada chave guardada em teams.cor — inclusive a antiga 'verde', que sempre foi mostrada como ROXO (31-jul: o hex dela
  sempre foi #8b5cf6, o roxo da casa; o rótulo dizia "Verde" por herança e virou "Roxo"). A chave 'verde' NÃO muda no banco.
- (linha ~19, `const LIGACOES = new Set(['do', 'da', 'de', 'dos', 'das', 'e']);`) As palavras que ligam o nome e não entram nas iniciais (29T, achado 158): "Racha do Guará" é RG, não RD.

## src/utils/timesAMao.js

- (linha ~1, `import { NOMES_DAS_CORES } from './nomeDoTime';`) Futty v2.0 — Rodada 29S, bloco A: os times montados à mão, puros (sem React, sem rede). O Jogo (Montar à mão) e o Jogo passado (bloco B)
  montam o corpo do POST /api/games/:id/times-manuais pela MESMA função; o motor grava sem seed (sem cerimônia) e não avisa ninguém.

## src/utils/uniformesGrade.js

- (linha ~1, `export const DESTINO_DO_CADEADO = '/planos?destaque=minha';`) Futty v2.0 — Rodada 29B (B): a grade de uniformes é a MESMA para todo mundo; o que muda é o estado de cada tile,
  e ele sai do DIREITO da pessoa. Puro (sem React, sem rede), para testar no Node.

    direito  gratis — sem geração (card com a foto): todos com cadeado
             pacote — o pacote do time: só o uniforme do time abre (pintável); os outros, cadeado
             minha  — Minha Figurinha (créditos): todos abertos; os ainda não pintados dizem que custam 1 geração
    estado   vestido  — o card mostra este uniforme agora (✓)
             pintado  — já foi gerado: um toque veste, grátis (uniformes guardados, Rodada 21)
             geravel  — o direito pinta este; o toque confirma e gasta 1 geração
             trancado — cadeado: o toque leva aos Planos

## src/utils/uploadErro.js

- (linha ~5, `if (err?.code === 'FOTO_FRACA') {`) FOTO_FRACA (olheiro de entrada, 11-ago): foto pequena/corrompida/preta/estourada
  — reprovada ANTES de guardar, sem gastar nada. Mensagem do backend já é a certa.
- (linha ~11, `if (err?.code === 'SEM_REDE' || m.includes('failed to fetch') || m.includes('ne…`) Falha de rede: o fetch rejeita antes de haver resposta. Pelo apiFetch chega com code 'SEM_REDE'
  (Rodada 29G); as mensagens cruas do navegador seguem reconhecidas por quem não passa por ele.

## scripts/_bench/verificar-gabinete-abas.mjs

- (linha ~2, `import { webkit } from 'playwright';`) Futty v2.0 — LIMPEZA TOTAL (23-set): confere que o Gabinete abre sem erro
  nas 8 abas para um super-admin, contra o par isolado de bancada.

  Usa a conta DESCARTÁVEL "super" de backend/scripts/_bench/contas-varredura.js
  — não mexe na senha real de contatofuttyapp@gmail.com.

  Uso: node scripts/_bench/verificar-gabinete-abas.mjs --url http://localhost:4699

## scripts/_camadas.mjs

- (linha ~1, `import { execFileSync } from 'node:child_process';`) Futty v2.0 — Rodada 29X: as camadas do "ouro vivo" no tamanho cheio, renderizadas pela receita da bancada de 23-set (backend/scripts/_bench/
  testar-icone.js: o F real de futtyMonograma.js em ouro com degradê, reflexo e brilho, sobre a vinheta SEM aro).

  A receita vive no backend e o sharp do backend é OUTRA cópia do libvips (a do frontend é a 0.32, a do backend a 0.35): as duas no mesmo processo
  derrubam o Node (segfault). Por isso a renderização roda num processo filho do backend (scripts/_bench/renderizar-camadas.js), que grava PNG numa
  pasta temporária; aqui eles voltam como Buffer, para o gerar-icones.mjs e o gerar-splash.mjs comporem, redimensionarem e gravarem com o sharp do frontend.

## scripts/capturar-telas.mjs

- (linha ~90, `await contexto.addInitScript(() => { try { Object.defineProperty(window.Notific…`) 29T: o Chromium sem tela nasce com a permissão de notificações NEGADA e o aviso "Ativar notificações" nunca entra na fila do Início. Aqui
  ela fica como no navegador de quem ainda não decidiu ("default") — só leitura da permissão; nada é pedido nem gravado.
- (linha ~103, `if (pedido.method() === 'GET' && /^\/api\/media\//.test(u.pathname)) {`) As fotos de post criadas pelo app em produção ficam GRAVADAS no banco (compartilhado) com o endereço da produção
  (https://<cloud run>/api/media/<token>). O token vale no motor local (mesmo segredo): serve-se a foto por ele, e nada vai à produção.
  Sem isto a foto do post aparece quebrada na captura — e foi o que a varredura de 3-out leu como "buraco de 400 px" (achado 141).
- (linha ~129, `pagina.on('response', async (r) => {`) 29T: o /api/inicio que a página recebeu, para a captura conferir que o estado é o que ela promete (pedido pendente, 4 times…).
- (linha ~132, `try { if (r.request().method() === 'GET' && new URL(r.url()).pathname === '/api…`) 29T-B: o /api/teams/explorar que o Radar recebeu, para a captura dizer se o motor mandou o bairro e o "Sobre o time" de cada time.
- (linha ~208, `const listaDeTimes = [];`) Rodada 29Q: a lista de times da conta e os jogos de cada um, para achar o Várzea FC (a captura 26 abre um jogo dele).
- (linha ~302, `async function exigirLeiDaPrimeiraTela(p) {`) Rodada 29T (achado 168): a lei da primeira tela do Início. UM aviso por vez no topo; o próximo jogo que pede resposta (Vou / Não vou) aparece em
  390×844 sem rolar — no aviso do topo ou, sem aviso de jogo, no rótulo "Próximos jogos". Devolve a medida e reprova se a lei não vale.
- (linha ~335, `arq: '04-inicio', sessao: true, rota: () => '/home', caminho: /^\/home$/, selet…`) Rodada 29T (achado 168): a LEI DA PRIMEIRA TELA mudou (troca a da 29L, achado 127). Em 390×844 o próximo jogo que pede resposta aparece sem rolar —
  no aviso do topo ou na lista. O aviso do jogo (um aviso por vez) sobe para o topo, e é ele que esta captura mostra. Os cartões "Radar de peladas"
  e "Criar time" continuam à vista (29Q). Se o jogo não couber a imagem NÃO sai.
- (linha ~342, `arq: '04b-inicio-pesado', sessao: true, pushPendente: true, rota: () => '/home'…`) Rodada 29T (achado 168): o estado PESADO — pedido pendente + "Ativar notificações" na fila + 4 times em "Seus times". Antes (29Q) o rótulo
  "Próximos jogos" ia a 973 px numa tela de 844; agora o aviso do jogo sobe para o topo, o "Seus times" mostra 2 linhas e o jogo tem de aparecer
  na primeira tela. A permissão de notificações fica "default" (como em quem ainda não decidiu) para o aviso entrar na fila.
- (linha ~363, `arq: '07-time-aba-ajustes', ...aba('ajustes'),`) Rodada 29R (achado 150): o cartão "Nova temporada de notas" é o último dos Ajustes — fica abaixo da primeira tela, então a captura
  rola até ele (sem isso a imagem regenerada não mostraria o que mudou). Só olha: nenhum toque no botão.
- (linha ~411, `arq: '18-explorar', sessao: true, rota: () => '/explorar', caminho: /^\/explora…`) Rodada 29T (achado 161): sem localização nem cidade escolhida a lista não promete "perto de você". A captura só olha: não toca na localização.
- (linha ~417, `const recebidos = p.__explorar?.teams || [];`) 29T-B (achado 157): o time se apresenta dentro do card — "Bairro · Cidade" e o "Sobre o time" em até 2 linhas.
- (linha ~431, `arq: '18b-explorar-time', sessao: true, rota: () => '/explorar', caminho: /^\/e…`) Rodada 29T-B (achado 157): tocar no card (fora do botão) abre o pop-up com escudo, nome, bairro e cidade, membros, aberto ou com aprovação, o "Sobre o time"
  inteiro e o mesmo botão. A captura só ABRE o pop-up: nunca toca em "Entrar" / "Pedir entrada" (e o contexto já responde a qualquer escrita em /api sem chegar ao banco).
- (linha ~463, `arq: '22-criar-time-passo-2', sessao: true, rota: () => '/criar-time', caminho:…`) Rodada 29O: o passo 2 do Criar time, sem título nem subtítulo. Só avança com nome e cidade (29P); não grava nada (o time nasce no passo 3).
- (linha ~474, `arq: '23-criar-time-passo-1', sessao: true, rota: () => '/criar-time', caminho:…`) Rodada 29P/29T: o passo 1 vazio — sem título, rótulos limpos, e o Continuar apagado enquanto não há nome e cidade.
- (linha ~478, `const continuar = p.getByRole('button', { name: 'Continuar' });`) 29T (achado 166): o Continuar existe desde o começo, apagado, e só acende com nome e cidade.
- (linha ~486, `arq: '23-criar-time-passo-1-preenchido', sessao: true, rota: () => '/criar-time…`) Rodada 29P: o passo 1 com nome e cidade — o Continuar aparece e cabe na tela.
- (linha ~495, `arq: '23-criar-time-bairro', sessao: true, rota: () => '/criar-time', caminho:…`) Rodada 29T-B (achado 157): o campo Bairro é de LISTA. Brasília, DF aparece com o campo e, digitando "gu", sugere as Regiões Administrativas do IBGE (Guará…).
  Só preenche e abre a lista na tela: nada é gravado (o time nasce no passo 3).
- (linha ~514, `arq: '24-criar-time-passo-3', sessao: true, rota: () => '/criar-time', caminho:…`) Rodada 29P: o passo 3 sem subtítulo, com os textos do "Radar de peladas". 29T-B (achado 157): em "Aberto" aparece o "Sobre o time" (obrigatório);
  a captura escolhe Aberto e escreve o exemplo do dono — só na tela, nada é gravado.
- (linha ~534, `arq: '25-criar-time-pronto', sessao: true, rota: () => '/criar-time', caminho:…`) Rodada 29P: a FESTA (passo 4). O POST /api/teams é respondido AQUI, com um time de mentira: nada chega ao banco (o contexto
  já bloqueia toda escrita em /api; esta rota da página responde antes dele, com o corpo que a festa precisa).
- (linha ~546, `await p.route('**/api/teams/*/convite', (route) => (route.request().method() ==…`) 29Q: o link do convite chega pronto. O POST do convite também é respondido AQUI, com um código de mentira (nada é gravado).
- (linha ~559, `arq: '26-jogo-convidado', sessao: true, precisa: 'jogoVarzea', dica: 'a conta n…`) Rodada 29Q: a caixa do convidado sem app num jogo do Várzea FC, só abrindo a tela: nenhum toque, nada digitado, nada gravado.
- (linha ~605, `arq: '29-novo-jogo-so-neste', sessao: true, precisa: 'jogoVarzea', dica: 'a con…`) Rodada 29S-A (achado 156): o mesmo, com "mudar só neste jogo" tocado — o selo, o seletor e o bloco em ROXO, e o 6 por time no ingresso.
- (linha ~619, `arq: '30-jogo-como-saem-os-times', sessao: true, precisa: 'jogoVarzea', dica: '…`) Rodada 29S-A (achados 151 e 152): a pergunta "Como vão sair os times?" e os dois cartões, num jogo do Várzea FC ainda sem times. Só olha: não toca em
  "Sortear" nem em "Montar à mão". Se o jogo achado já tem times, a captura sai com o estado COM times e o script diz isso.
- (linha ~652, `arq: '32-jogo-passado-como-terminou', sessao: true, precisa: 'jogoVarzea', dica…`) Rodada 29S-B: o passo 4 (Como terminou?) com 2 times, sem salvar. Passa pelos passos 1 a 3 só na tela (data, quem jogou, os times) e responde "Quem ganhou?".
- (linha ~679, `async function irAoPasso2DoJogoPassado(p) {`) ── O Jogo passado nas capturas (29S-B) ──────────────────────────────────────────────────────────────────────────────────────────
  O passo a passo só tem estado na tela: nada vai ao banco até o "Salvar jogo", que nenhuma captura toca (e o contexto ainda responde a qualquer
  escrita em /api sem chegar a ele). Os dois passos que a captura precisa são: a data (3 dias atrás) e quem jogou.
- (linha ~703, `async function preencherMarcarJogo(p) {`) ── O Marcar jogo nas capturas (29S-A) ───────────────────────────────────────────────────────────────────────────────────────────
  Digita uma data (daqui a 10 dias, no relógio do time) e o local — só no formulário, nada vai ao banco — e confere que o ingresso acompanhou, que
  a hora nasceu em 20:00 e que o time é o Várzea FC. "Criar jogo" tem de caber na primeira tela; se não couber, encolhe o ingresso, nunca a letra.
- (linha ~721, `async function preencherPasso1(p) {`) ── O Criar time nas capturas (29O/29P) ────────────────────────────────────────────────────────────────────────────────────────
  Nome + cidade da lista ("Brasília, DF"): o passo 1 só libera o Continuar com os dois.

## scripts/cena-rodada29h.mjs

- (linha ~1, `import { mkdirSync, readFileSync } from 'node:fs';`) Futty v2.0 — Rodada 29H-A: as cenas dos 14 pontos, no WebKit do iPhone, em servidor LOCAL (CLAUDE.md, 25-set) com as contas de prova
  do backend (scripts/_bench/prova-rodada29b.js) e TODA escrita interceptada (nada chega ao banco; o signUp também é de mentira).

  Roda pelo ver-iphone.mjs (que injeta os utilitários):
    node scripts/ver-iphone.mjs --url http://localhost:5233 --cenas rodada29h --etiqueta r29h

    A · barra de navegação: some em /avise-me, /termos e /privacidade SEM sessão (com sessão fica), no convite (longo e curto, e no
        "Saiba mais" do banner de cookies) e no onboarding                                                               (item 2)
    B · rolinhos de data: dia/mês/ano no cadastro, no onboarding e no Início; sem ano futuro, teto ano atual − 18; dia que acompanha o
        mês; data de menor mostra a frase da casa e o signUp nem sai                                                      (item 3)
    C · convidado: abre nas boas-vindas do time (frase "Você foi convidado…", linha/gol, Vamos lá) → foto → nome → time; o bilhete
        sobrevive a Google/Apple (conta nova que cai em /home vai ao onboarding, não à página do convite); convite morto vira cadastro
        comum; quem já tem conta pronta segue o caminho de sempre                                                      (item 1)
    D · página 1: o Register e o Login aquecem o chunk do Onboarding e as 8 figurinhas; imagens com ?v=<hash>          (itens 4 e 37)
    E · "deixar para depois": escondido até ~2 s e aparece então                                                         (item 5)
    F · Criar time: texto do papel por opção; Artilheiro/Destaque clicáveis e gravados; textos de entrada aprovados; o aviso do
        "só organizo" é texto na tela (nada de toast); bairro opcional; frase do WhatsApp e link curto                   (itens 6, 7, 12)
    G · convite: time sem logo = só o nome em destaque; og:image com o ícone do app 1200×630                             (item 7)
    H · chips linha/gol lado a lado no card do jogador e no Perfil; "＋ Criar time" no Início e no Perfil               (itens 8 e 11)
    I · painel do admin: frase aprovada e nenhum "IA" fora da figurinha                                                  (item 9)
    J · figurinha: um botão só no celular, "Baixar" só no computador; Planos: seção "Figurinhas do time" só para dono, textos
        rediagramados                                                                                                    (item 10)
    K · painel do time: bairro (freguesias em Portugal) e prêmios do dia                                                  (itens 12 e 44)
    L · ajustes finais: o F antes do JavaScript; landing com os pontos; "Você entrou no time <nome>!"                    (item 13)
- (linha ~106, `` const bilhete = (time = { nome: NOME, logo_url: null, cor_fundo: null }) => `tr… ``) Um SCRIPT (string), não uma função: uma função com variáveis de fora perde as variáveis ao ir para a página (a 1ª rodada desta
  cena gravou um bilhete sem time e o onboarding abriu a página "Começar"). O script roda a CADA navegação: o sessionStorage garante
  que o bilhete é posto UMA vez só (senão a cena o repunha depois de a página o gastar).
- (linha ~125, `const { contexto, pagina } = await abrir(null, 'A-avise-me', '/avise-me');`) 29P: a página do Avise-me saiu; o link antigo das redes cai na página inicial (sem barra, como sempre na "/").
- (linha ~420, `await pagina.locator('[data-escolha-papel]').waitFor({ timeout: 15000 });`) passo 2 (29O): o papel sem texto embaixo; gols, artilheiro e destaque nascem desligados; ligar o artilheiro liga os gols junto
- (linha ~462, `await pagina.locator('input[readonly]').waitFor({ timeout: 15000 });`) 29Q: o link do convite chega PRONTO na festa (gerado sozinho); o botão "Gerar link do convite" só volta se a geração falhar.
- (linha ~557, `const chip = pagina.locator('[data-atalho-do-inicio="criar-time"]');`) 29Q: o "Criar time" saiu da fila de chips e virou um cartão (ao lado do "Radar de peladas"), logo embaixo do "Seus times".

## scripts/comparar-canvas.mjs

- (linha ~1, `import { execSync } from 'node:child_process';`) Futty v2.0 — O desenho da figurinha é LEI (FLUIDEZ 2, 16-set).

  A rodada da fluidez mexeu no CAMINHO do canvas (cache do padrão Épico, glow do
  Aura pré-desenhado, imagens descodificadas uma vez). Nada disso pode mudar um
  pixel do que a pessoa vê — e "acho que está igual" não é prova.

  Este script põe as duas versões a desenhar a MESMA figurinha, lado a lado, no
  mesmo WebKit, e conta as diferenças. A versão antiga sai do git (o commit que
  se quiser comparar), não de uma cópia à mão.

  Uso (com `npx vite --port 5175` a correr):
    node scripts/comparar-canvas.mjs
    node scripts/comparar-canvas.mjs --base HEAD --saida ../../COMPARACAO

## scripts/gerar-bairros.mjs

- (linha ~227, `const comBairrosDoCenso = new Set(municipios.keys());`) ── 29T-C: onde o Censo não tem bairros, os distritos e subdistritos oficiais (2 ou mais por município) ─────────────────────────────

## scripts/gerar-icone-email.mjs

- (linha ~2, `import { mkdirSync, writeFileSync } from 'node:fs';`) Futty v2.0 — Rodada 29B (G): gera public/email/icone-app-144.png, o ÍCONE DO APP para os e-mails do Supabase.

  O F solto (logo-144.png) dava ao Gmail uma cara de "qualquer remetente"; o ícone do app — o F dourado dentro do
  quadrado de cantos arredondados, como aparece no iPhone — é o que a pessoa reconhece. Sai de resources/icon.png (o
  mesmo ícone das lojas), reduzido a 144×144 com os cantos arredondados (raio de 22,4%, o do iOS) e transparentes,
  e em PNG de paleta para caber em ≤ 8 KB (o e-mail é carregado de fora, a cada abertura).

  A troca do logo-144.png por este nos 3 templates do Supabase é no painel (EMAILS-SUPABASE.md).

  Uso (a partir de FUTTY-V2/frontend):  node scripts/gerar-icone-email.mjs

## scripts/gerar-icones.mjs

- (linha ~2, `import { writeFileSync } from 'node:fs';`) Futty v2.0 — Rodada 29W/29X: gera os ícones do app a partir das DUAS camadas do ícone adaptativo do Android, que são o "ouro vivo" que o dono
  escolheu em 23-set, sem anel em lugar nenhum (dono, 5-out):
    · fundo  — a vinheta (#1a1826 no centro → #0b0a12 nos cantos), SEM o aro (android/.../mipmap-*/ic_launcher_background.png);
    · frente — só o F ouro vivo com o brilho, transparente, dentro da zona segura (66/108) (android/.../mipmap-*/ic_launcher_foreground.png).
  O F é sempre o asset real: aqui só se compõe, redimensiona e recorta em círculo — nada é desenhado nem gerado. (O gen-icons.mjs antigo
  desenhava um F à mão; saiu na 29V. A 29V também usou o ícone antigo das lojas, F amarelo chapado sobre #050810; a 29W trocou a fonte.)

  A composição (fundo + frente, 108 dp inteiros) é o que vai para:
    · public/icons/icon-512.png e icon-192.png   — o ícone do site ("any maskable"), do "adicionar à tela inicial", do apple-touch-icon e das
      notificações: o F fica dentro do círculo central de 80% do lado, que é o que sobrevive a qualquer recorte. 29X: saem das camadas
      renderizadas no TAMANHO CHEIO (1024 px, pela receita da bancada de 23-set) e reduzidas — não das de 432 px ampliadas, que deixavam a borda do F mole;
    · android/.../mipmap-*/ic_launcher.png (quadrado) e ic_launcher_round.png (o mesmo recortado em círculo, sem anel) — os ícones antigos do
      Android (anteriores ao 8), a partir das camadas de 432 px do repositório (que são só reduzir, nunca ampliar);
    · as camadas do ldpi (81 px), que nasceram da arte antiga e não tinham quem as refizesse: reduzidas das do xxxhdpi;
    · public/icons/badge-96.png — a silhueta do F (branca, fundo transparente) que o Android pede para a barra de status, tirada do
      ic_launcher_monochrome. Não depende das camadas coloridas: sai igual a cada rodada.
  O ícone do iPhone (AppIcon-512@2x.png, com a moldura fina) é do backend (scripts/_bench/aplicar-icone.js --so-ios); o splash é do gerar-splash.mjs;
  o favicon.svg não é de ninguém aqui. NÃO são tocados por este script.

  A receita é a da bancada de 23-set (backend/scripts/_bench/testar-icone.js, variante 1 "ouro vivo", sem aro — a mesma função da variante 2 que o
  aplicar-icone.js usou para o iPhone, menos o aro). Ela roda no backend (processo filho; ver _camadas.mjs) e a conferência abaixo garante que o
  mestre de 1024 px, reduzido a 432, ainda é a camada que está no repositório: se alguém mudar a receita ou a camada, o script para.

  Uso (a partir de FUTTY-V2/frontend, com o backend ao lado e o npm install feito nos dois):  node scripts/gerar-icones.mjs
- (linha ~132, `const ldpi = path.join(RES, 'mipmap-ldpi');`) 3) As camadas do ldpi (108 dp × 0,75 = 81 px): não vieram da receita de 23-set (que vai de mdpi a xxxhdpi) e sobraram da arte antiga — o fundo
  branco chapado e um F amarelo com o escuro embutido. Aqui são as do xxxhdpi, só reduzidas.

## scripts/gerar-og.mjs

- (linha ~2, `import { mkdirSync, writeFileSync } from 'node:fs';`) Futty v2.0 — Rodada 29H (item 7): gera public/og/futty-1200x630-v1.png, a imagem de prévia do link (og:image) do site e do convite.

  A prévia do WhatsApp mostrava o F num círculo (o WhatsApp recortava o ícone pequeno). Agora a prévia é uma imagem de verdade,
  1200×630: o ÍCONE DO APP — o F dourado dentro do quadrado de cantos arredondados, o mesmo das lojas e dos e-mails — centrado
  sobre o fundo da casa (#050810, com o halo dourado e o roxo da landing). Sai de resources/icon.png.

  O nome leva a versão (-v1): a imagem é servida com cache longo e os apps de mensagem guardam a prévia por muito tempo; ao
  trocar a arte, muda o nome (e o og:image do index.html) — ver o item 37 da Rodada 29.

  Uso (a partir de FUTTY-V2/frontend):  node scripts/gerar-og.mjs

## scripts/gerar-sons.mjs

- (linha ~2, `import { writeFileSync, statSync, mkdirSync, unlinkSync } from 'node:fs';`) ═══════════════════════════════════════════════════════════════════════════════
  GERADOR DOS SONS DO SORTEIO — Rodada 16A (17-set-2026; nasceu na 14A, 16-set)

  Direito autoral 100% nosso: cada efeito nasce AQUI, em código. Nenhum arquivo
  baixado, nenhuma biblioteca de áudio, nenhuma IA de música. A semente é fixa,
  então rodar de novo devolve exatamente os mesmos arquivos.

    node scripts/gerar-sons.mjs

  Caminho: síntese em Float32 (mono, 44,1 kHz) → WAV 16 bits → ffmpeg-static
  (já nas devDependencies) → MP3 96 kbps. A receita de cada som está em SONS.md,
  na raiz do frontend — é o registro de autoria.

  O que a 16A mudou (avaliação do dono no aparelho, build 24):
    • TIQUE — o lado digital quase não aparecia. Agora são duas camadas em pé de
      igualdade: o clique mecânico (como estava) e um tom de TECLA de videogame
      a -6 dB dele, 1,6 / 1,9 / 2,2 kHz conforme a variante.
    • JACKPOT — o "tan tan tan tan" descia de tom no fim e soava a derrota.
      Lei nova: no jackpot NADA desce; toda frase sobe ou fica. Foi rearranjado
      e a prova sai em gráfico (scripts/prova-tom.mjs) — se a linha descer, esta
      geração FALHA.
    • CLAC — inalterado, e de propósito: a semente continua a mesma e cada tique
      consome exatamente as mesmas 46 tiragens de antes, então o clac sai
      bit a bit igual ao da 14A.
  ═══════════════════════════════════════════════════════════════════════════════

## scripts/gerar-splash.mjs

- (linha ~2, `import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';`) Futty v2.0 — Rodada 29X: gera o splash (a abertura do app) com o "ouro vivo", e as fontes de reserva do @capacitor/assets (frontend/assets/).

  O splash é o F ouro vivo — a MESMA peça do ícone do iPhone (a receita da bancada de 23-set: backend/scripts/_bench/testar-icone.js, renderizada
  pelo backend/scripts/_bench/renderizar-camadas.js; ver _camadas.mjs) — centrado sobre o fundo SÓLIDO #080808. Sem vinheta: #080808 é a mesma cor de
  colors.xml, de capacitor.config.json e da variável --bg do index.css, e é isso que faz o arranque não ter degrau da abertura para o app.
  O F é sempre o asset real: aqui só se compõe, redimensiona e recorta — nada é desenhado nem gerado.

  O F tem o MESMO tamanho físico do splash de antes: 928 px de altura no quadrado de 2732 px (34,0%), medido nos arquivos que estavam em
  Splash.imageset. (A largura sai 3% maior, 784 contra 761 px: o F da receita é um pouco mais largo que o F chapado de antes.)

    · iPhone — ios/App/App/Assets.xcassets/Splash.imageset: as seis imagens do Contents.json (1x/2x/3x, claro e escuro), 2732×2732, recomprimidas
      em paleta de 256 cores (como estavam; sem canal alfa). Claro e escuro são a mesma imagem: o app é sempre escuro.
    · Android abaixo do 12 — android/.../res/drawable*/splash_logo.png: o F com fundo transparente, em cada densidade (mdpi a xxxhdpi; e o
      drawable/ sem sufixo, que é o xhdpi). O Android pega o da densidade do aparelho, então os cinco precisam trocar juntos. O F tem 117 dp de altura
      (como o de antes: 96×117 dp) e vem com a margem do brilho; o drawable/splash.xml o centra sobre @color/futtyFundo (#080808) sem escalar.
      Em paleta de 256 cores (com alfa), como o do iPhone. O Android 12+ NÃO usa estes: usa o ic_launcher_foreground (windowSplashScreenAnimatedIcon), que já é o ouro vivo.
    · fontes de reserva — assets/splash.png e assets/splash-dark.png (o mesmo splash, sem paleta) e assets/icon.png (cópia do ícone atual do iPhone,
      AppIcon-512@2x.png). Quem rodar `npx @capacitor/assets` parte daqui; nada volta para a arte antiga.

  Uso (a partir de FUTTY-V2/frontend, com o backend ao lado e o npm install feito nos dois):  node scripts/gerar-splash.mjs

## scripts/loja/capturar-telas.mjs

- (linha ~56, `if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(BASE).hostname)) {`) Regra da casa: bancada e capturas nunca contra produção (incidente de 25-set).
- (linha ~92, `localStorage.setItem('futty_agora_nao_nascimento', String(Date.now()));`) 29T-C: o "Agora não" da data de nascimento (7 dias)
- (linha ~177, `const comPonto = textoDaTela.match(NUMERO_COM_PONTO);`) Rodada 29Z: brasileiro escreve 77,9 e 9,1 — peça de loja com "77.9" ou "9.10" não sai (os prints de 5-out saíram assim).
- (linha ~230, `const PASTA_ROSTOS = join(AQUI, '..', '..', 'public', 'onboarding');`) Os rostos da demo: avatares que JÁ existem em public/onboarding/ (nada novo no repositório). O nome casa → o mesmo rosto (Dudu → dudu,
  Tiãozinho → tiagao); o Cabeção fica com o goncalo (ordem do dono, 5-out). Os rostos que sobram (caio, nando, pedrao, rafa) vão, na ordem
  do Ranking, para quem aparece logo depois no alto da lista. Os que não aparecem aqui ficam com a silhueta da casa (a mistura de foto e
  figurinha é de propósito). O Bruninho não entra: continua com a figurinha dele. Nenhum rosto serve a dois jogadores — a tabela é conferida
  abaixo, e por isso nenhum rosto repete numa mesma tela.

## scripts/loja/figurinhas-do-sorteio.mjs

- (linha ~1, `export const FIGURINHAS_DO_SORTEIO = [`) Ajuste 2 do dono (5-out, LOJA-PRINTS-OUT.md): os 4 lugares que ainda eram silhueta no Sorteio da peça 01 ganham FIGURINHA — o cartão
  com peito e uniforme, como o do Bruninho, e não o close do rosto de public/onboarding/. Geradas pela bancada do motor
  (backend/scripts/_bench/gerar-modelos-ficticios.js --loja, receita V6 de produção) em LOJA/demo-avatares/, fora do repositório:
  <arquivo>-avatar.png é o que a captura serve no Sorteio, <arquivo>-card.png é a figurinha na moldura, para a folha.

  "Índio" e "Nego Di" (apelidos de cor/etnia) saem da peça: no lugar do Índio entra o Paredão, fictício novo; no do Nego Di, o próprio
  dono, com o nome do perfil dele (o nome_jogador, que é o que o app mostra no Sorteio). Careca e Zé Gordo ficam e ganham rosto que combina.
  Lido por capturar-telas.mjs (a resposta simulada do jogo) e por gerar-imagens.mjs --avatares (a folha dos 4 cartões).

## scripts/loja/gerar-imagens.mjs

- (linha ~1, `import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';`) Peças das lojas: as 8 capturas com o celular em mockup, a FAIXA 1024×500 da Google Play e a folha de
  revisão. HTML montado aqui, renderizado pelo Chromium do Playwright. Correr a partir de frontend/:

    node scripts/loja/gerar-imagens.mjs --cruas=outubro/cruas --saida=outubro/play-celular
    node scripts/loja/gerar-imagens.mjs --tamanho=1290x2796 --cruas=outubro/apple/cruas --saida=outubro/apple
    node scripts/loja/gerar-imagens.mjs --faixa=outubro                  só a faixa → LOJA/outubro/faixa-1024x500.png
    node scripts/loja/gerar-imagens.mjs --revisao=outubro                folha de revisão (as 8 + a faixa)

  As 8 peças, os rótulos e as frases são a tabela de LOJA-PRINTS-OUT.md (aprovada pelo dono em 5-out).
  A FAIXA segue MARCA.md: o símbolo é o ÍCONE DO APP (MARCA/icone-1024.png), nunca o F solto ao lado da
  palavra ("F FUTTY" está aposentado), com FUTTY em branco e "A sua figurinha." em dourado #f0c94a.
- (linha ~28, `const LAYOUTS = {`) O desenho é feito em 1080 unidades de largura; a peça inteira é escalada para
  a largura pedida. `altura` é a altura em unidades (1920 = 9:16). Celular:
  `celularLargura` é a caixa dentro da moldura, `telaLargura` a captura, `moldura`
  a escala da borda/raio/sombra. Na Google Play a captura (760) é mais estreita que
  a caixa (786) desde 13-set e sobra uma faixa de moldura à direita; fica assim
  para as peças já enviadas. Na App Store a captura enche a caixa.
- (linha ~47, `const PECAS = [`) LOJA-PRINTS-OUT.md, tabela aprovada em 5-out: ordem, rótulo (dourado, pequeno) e frase. As frases da 01, 02 e 05 são as do
  "Ajuste 2" do dono (5-out, noite).
- (linha ~224, `async function fonteDasFrases(page) {`) UM tamanho de frase para as 8 peças (ajuste 2 do dono, 5-out): todas no mesmo tamanho, cada uma em no máximo duas linhas e acima do
  celular. Começa nos 104 de sempre e, se alguma frase não couber, desce de 2 em 2 para TODAS. Antes cada peça encolhia sozinha e as
  frases saíam em tamanhos diferentes. As linhas são contadas pela altura do título (line-height .96), com a Rajdhani já carregada.

## scripts/medir-canvas.mjs

- (linha ~1, `import { writeFileSync } from 'node:fs';`) Futty v2.0 — Bancada do CANVAS da figurinha, no WebKit (FLUIDEZ 2, 16-set).

  A PERGUNTA: o relatório do build 20 (iPhone 15 Pro Max, instalação do zero)
  diz `/figurinha dados=8836 ms` e uma travada de 6402 ms na fase "outro" aos
  82 s — o instante em que o cromo do Início compõe. "O canvas é lento" não é
  um dado: é preciso saber QUAL fase do canvas.

  Mede-se no WEBKIT (o motor do iPhone, e do WebView do app da loja) e não no
  Chrome, porque é exactamente aí que `ctx.filter` e `ctx.shadowBlur` caem em
  desenho por software. No Chrome estas fases custam quase nada e a medição não
  diria nada sobre o aparelho do Pedro.

  Corre contra o servidor de DESENVOLVIMENTO (vite), não contra o dist: assim a
  página pode `import('/src/utils/figurinhaCanvas.js')` e chamar cada função
  directamente, sem entrar login nenhum e sem acrescentar um grama ao pacote da
  loja. O que se mede é trabalho de RASTER (encher gradientes, desfocar, compor)
  — esse não muda entre dev e produção.

  Uso:
    npx vite --port 5175          (noutra janela)
    node scripts/medir-canvas.mjs
    node scripts/medir-canvas.mjs --json depois.json --etiqueta depois

## scripts/medir-estreito.mjs

- (linha ~1, `export function medir(larguraJanela) {`) Futty v2.0 — Rodada 29Z (item 3e): a RÉGUA do celular estreito, uma só para a varredura (scripts/varrer-estreito.mjs, contra o servidor local
  com a conta demo) e para a prova do navegador (scripts/provas/rodada-29z.prova.mjs, com o motor de mentira). Roda DENTRO da página
  (page.evaluate(medir, larguraDaJanela)) e por isso não pode usar nada de fora dela: tudo que precisa mora dentro da função.

  Devolve a lista de defeitos que a pessoa sentiria: rolagem para o lado, texto com reticências, campo/botão/texto cortado por um cartão,
  elemento que passa da borda da janela, e número com PONTO decimal no texto (a lei de números em PT-BR da 29Z).

## scripts/medir-inicio.mjs

- (linha ~1, `import { readFileSync, writeFileSync } from 'node:fs';`) Futty v2.0 — Mede a abertura do app num Chrome de verdade (VELOCIDADE 4;
  contagem de imagens e bytes por aba na VELOCIDADE 6B, 15-set).

  A pergunta que este script responde com número: entre chegar ao Início e ver
  a tela, quanto tempo passa — e quanto passaria com a regra ANTIGA, que só
  revelava a tela depois da figurinha estar desenhada.

  As duas medidas saem da MESMA corrida, o que as torna comparáveis sem margem
  para discussão:
    conteudoMs — quando o nome/estatísticas aparecem (a regra de hoje)
    cromoMs    — quando a figurinha aparece (era exactamente o que a regra
                 antiga esperava: `pageReady = cromoTentado`)

  VELOCIDADE 6B acrescenta, POR ABA e em volta FRIA e QUENTE: quantos pedidos
  /api, quantos /api/media (avatares), quantos bytes vieram DA REDE, e quanto
  tempo até a ÚLTIMA imagem aparecer. Os números saem do PerformanceObserver da
  própria página (`performance.getEntriesByType('resource')`) e não dos eventos
  do Playwright, de propósito: uma imagem servida do cache do browser continua a
  aparecer nas entradas de performance, com `transferSize` 0. É assim que se vê
  a diferença entre "não pediu" e "pediu e veio do cache".

  Uso (com o backend a correr em :3001 e `npm run build` feito):
    npx vite preview --port 4173
    node scripts/medir-inicio.mjs
    node scripts/medir-inicio.mjs --url http://localhost:4173 --json antes.json
- (linha ~110, `await pagina.evaluate(() => new Promise((r) => {`) ─── FRIO: o app a abrir do zero, sem cromo guardado — como acontecia SEMPRE
  antes da Velocidade 4 (a regra antiga não tinha cache nenhum, redesenhava o
  canvas a cada abertura). Tem de ser um RELOAD: apagar o IndexedDB não chega,
  porque o cache em memória do módulo sobrevive à navegação dentro da SPA.
- (linha ~152, `const ABAS = [['Início', 'home'], ['Resenha', 'feed'], ['Ranking', 'ranking'],…`) ─── VELOCIDADE 6B: pedidos, imagens e bytes POR ABA ───
  Duas passagens pelas mesmas 5 abas. A 1ª é FRIA (nunca lá esteve nesta
  sessão); a 2ª é QUENTE (cache local + cache HTTP já cheios). O que tem de
  cair para perto de zero na volta quente é a contagem e os bytes.

## scripts/medir-rolagem.mjs

- (linha ~1, `import { readFileSync, writeFileSync } from 'node:fs';`) Futty v2.0 — Rolagem da Resenha e 1ª visita ao Ranking, no WebKit (FLUIDEZ 2).

  O relatório do build 20 (iPhone 15 Pro Max) diz:
    · rolagem: 61 travadas, as piores de 1338, 1096 e 1066 ms, na Resenha;
    · Ranking na 1ª visita: 40 travadas, pior 1785 ms (nas visitas seguintes
      84-125 ms — ou seja, é o PRIMEIRO desenho que custa, não os dados).

  "Travada" aqui é o que a pessoa sente: um quadro que demorou mais do que devia.
  Mede-se com o mesmo relógio de quadros que o app usa no aparelho
  (lib/diagnostico.js), e não com marcas de fase — no WebKit o desenho é adiado
  e uma fase pode marcar 1 ms com a conta a cair na seguinte.

  Corre no WEBKIT de propósito: é o motor do iPhone e do WebView da loja.
  Precisa do backend local (`LIGAR-FUTTY.bat`) e de um build servido:
    npm run build && npx vite preview --port 4179
    node scripts/medir-rolagem.mjs --etiqueta antes --json antes.json

## scripts/preparar-nativo.js

- (linha ~19, `const REMOVER = ['avatares', 'sorteio-assets', 'sons', 'dados', 'onboarding', '…`) `.well-known` (Rodada 29B, bloco 3, C): os arquivos que o iOS/Android buscam NO SITE para ligar futtyapp.com.br ao app. Dentro
  do pacote não servem a nada — e, ao contrário das outras pastas, o app nunca os pede (fica de fora de PASTAS_REMOTAS).
  'onboarding' (Rodada 29E): os 6 bustos do mini sorteio do onboarding — o app busca do site (PASTAS_REMOTAS).
  'og' (Rodada 29H): a imagem de prévia do link (og:image) — só quem LÊ o link (o robô do WhatsApp) a pede, no site; o app nunca.

## scripts/prova-cache-figurinha.mjs

- (linha ~2, `import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';`) Futty v2.0 — PROVA: a Figurinha fica presa no cache do aparelho? (22-set)

  Relato do dono: depois de trocar a foto, o Início mostrava a nova e a
  Figurinha continuava com a antiga — no PC dele. A suspeita não é o aparelho:
  é que esta página semeia o espelho local `me` com o PRIMEIRO perfil que
  chega, e o PerfilContext entrega primeiro o CACHE LOCAL e só depois o
  /api/me fresco.

  Isto mede sem opinião. Entra na conta demo, rouba o cache que o app acabou
  de gravar, TROCA nele o avatar_url por um marcador impossível de confundir
  (/api/media/CACHE-VELHO-...), abre /figurinha com esse cache já no sítio, e
  olha para duas coisas:

    1. que imagem a página foi buscar — a do marcador (ficou no cache) ou a
       real (ouviu o fresco);
    2. se o controlo "TAMANHO" aparece. Ele só existe quando `avatarEhIA` é
       verdadeiro, e é o mesmo booleano que decide o que entra no cromo.

  Uso (a partir de FUTTY-V2/frontend):
    node scripts/prova-cache-figurinha.mjs --url http://localhost:5174 --etiqueta depois

  Não escreve nada no banco: só GETs e a leitura do localStorage.
- (linha ~48, `const ctxLogin = await navegador.newContext({ viewport: { width: 1280, height:…`) ── 1. Entrar e apanhar sessão + o cache que o app gravou sozinho ──
  serviceWorkers: 'block' — com o SW ligado o route() não intercepta e o
  armazenamento não é o que se pensa que é (achado de rodadas anteriores).

## scripts/prova-royal.mjs

- (linha ~2, `import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } fro…`) Futty v2.0 — Rodada 29H-B, decisão do dono (2-out, noite): o fundo ROYAL do app tem de ser EXATAMENTE o da prancha
  FUT/DESIGN/golden-variantes.png (roxo com estrelas e brilhos). Esta prova compara os dois, lado a lado e em números:
    • a referência — o card Royal recortado da própria prancha, e o MESMO render pelo pipeline real (gerarFigurinhaCanvas, 'pico');
    • o app — a prévia da Figurinha com o Royal escolhido (conta de prova minhaFig; o PATCH do fundo é interceptado, nada vai ao banco);
    • os números — a camada de fundo que a prévia usa (gerarCamadasFigurinha → fundoBlob) contra o fundo da prancha
      (desenharFundoRoyal 'pico'), pixel a pixel na faixa entre a moldura e a placa, e a luz em cada um dos 14 brilhos.
  Antes da correção a prévia entrava SEM brilhos (a chapa nua: o overlay vivo só existia para o Golden); depois, os 14 no pico.

    node scripts/prova-royal.mjs --url http://localhost:5233 --etiqueta antes
    node scripts/prova-royal.mjs --url http://localhost:5233 --etiqueta depois --compor
  Só servidor LOCAL (CLAUDE.md, 25-set). Capturas em scripts/capturas/rodada-29h/ (fora do git); a prancha final vai para FUT/DESIGN.

## scripts/prova-tom.mjs

- (linha ~2, `import { spawnSync } from 'node:child_process';`) ═══════════════════════════════════════════════════════════════════════════════
  PROVA DE TOM — a linha do jackpot sobe ou fica, nunca desce (Rodada 16A).

  Lei nova do dono (16A): no jackpot NADA desce de tom. Isto mede o arquivo MP3
  já pronto — não o buffer em memória — e desenha a prova:

    MP3 → ffmpeg (PCM f32 mono) → janelas de 50 ms com Hann → FFT 4096 →
    frequência dominante de cada janela → PNG com a linha no tempo.

  Só Node: a FFT é radix-2 escrita aqui e o PNG sai à mão (zlib), como no
  gen-icons.mjs. Nenhuma dependência nova.
  ═══════════════════════════════════════════════════════════════════════════════

## scripts/prova-troca-foto.mjs

- (linha ~2, `import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';`) Futty v2.0 — PROVA DO FLUXO REAL: trocar a foto e ver o cromo (22-set).

  O relato do dono: "no Início já deu certo, na Figurinha ainda está a foto
  antiga". A prova sintética (plantar um cache velho) NÃO reproduziu — o
  /api/me de um backend local responde rápido demais para o cache chegar a
  mandar. Então faz-se o que ele fez, na ordem em que ele fez, num navegador
  de verdade, e olha-se para cada passo.

    1. abre /figurinha e regista a figurinha que está lá
    2. troca a foto pela rota real (o mesmo input de ficheiro da tela)
    3. regista o que a tela passa a mostrar ANTES de gerar
    4. toca em Gerar e espera
    5. regista a figurinha nova
    6. vai ao Início, volta à Figurinha (navegação normal, sem F5)
    7. regista o que cada tela mostra no fim

  Cada figurinha é um caminho diferente no bucket, por isso o token do proxy
  de mídia identifica-a sem ambiguidade: é o que se compara.

  Uso (a partir de FUTTY-V2/frontend):
    node scripts/prova-troca-foto.mjs --url http://localhost:5174 --etiqueta ANTES

  CUSTA UMA GERAÇÃO (~US$0,05) — passa mesmo pela fal.

## scripts/provar-navegador.mjs

- (linha ~2, `import { readdirSync } from 'node:fs';`) Futty v2.0 — as PROVAS NO NAVEGADOR (Rodada 29I): telas e gestos que só um Chromium de verdade confirma — o Voltar do sistema, o toque que
  cai no link e não no botão, o salto da cerimônia medido em milissegundos. Os testes de unidade (npm test) travam o texto e as contas; estas
  provam o COMPORTAMENTO, sem login e sem banco: cada prova monta a tela (ou o pedaço dela) numa página-bancada em scripts/provas/*.html,
  servida por um Vite que este script sobe sozinho, com a API de mentira (page.route) quando a tela fala com o motor.

  Nunca contra produção: tudo roda em 127.0.0.1 e nenhuma prova faz pedido de verdade ao motor.

  Uso: npm run provar:navegador            (todas)
       npm run provar:navegador -- criar   (só as provas cujo nome contém "criar")
  Precisa do Chromium do Playwright (`npx playwright install chromium`, o mesmo do build:native).

## scripts/unidade/rodada-29l.test.mjs

- (linha ~175, `test('129 · as abas do time têm a largura do próprio texto, e o selo ADMIN vira…`) ── C9 · achado 129 · C10 · 131 · C11 · 132 · C16 · 134 ───────────────────────────────────────────────────────────────────────────
- (linha ~211, `test('140 · "Criar jogos recorrentes" e "Criar campeonato": cada um numa linha,…`) ── C12 · achado 140 · C13 · 133 · C15 · 142 ─────────────────────────────────────────────────────────────────────────────────────
- (linha ~231, `test('125 · a faixa de cookies fica na altura EXATA da barra de navegação (uma…`) ── C17 · achado 125 · C18 · 126 ───────────────────────────────────────────────────────────────────────────────────────────────────

## scripts/unidade/rodada-29t.test.mjs

- (linha ~251, `test('162 · "Esperando a aprovação do admin" — e nenhum "À espera" de aprovação…`) ── G · achado 162 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
- (linha ~266, `test('163 · a frase "Você só organiza este time, então não entra na lista de pr…`) ── H · achado 163 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
- (linha ~274, `test('165 · o rabicho com a cidade do time: "horário de Brasília" para um time…`) ── I · achado 165 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
- (linha ~307, `test('166 · Criar time, passo 1: o Continuar está lá desde o começo, apagado (n…`) ── J · achado 166 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
- (linha ~316, `test('167 · o bairro não exemplifica "Pinheiros": o placeholder é "Onde vocês j…`) ── K · achado 167 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
- (linha ~352, `test('164 · o nome no Início nunca corta: a letra desce até caber (o piso de 28…`) ── L · achado 164 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

## scripts/varrer-estreito.mjs

- (linha ~1, `import { readFileSync, mkdirSync } from 'node:fs';`) Futty v2.0 — Rodada 29Z (item 3e): a VARREDURA do celular estreito. Anda pelas telas principais com a conta de demonstração, numa janela
  de 360 × 780 (Galaxy A, Moto G — a largura de muito Android comum; a régua da casa é 390), e mede, DENTRO do navegador, o que a pessoa
  perderia:
    · rolagem para o lado (a página inteira mais larga que a janela);
    · campo, botão ou nome CORTADO por um contêiner (o filho passa da borda do pai com overflow escondido) — o defeito do Novo jogo;
    · texto com reticências (text-overflow: ellipsis com o texto maior que a caixa) — o defeito do Radar;
    · elemento que passa da borda da janela sem estar numa faixa que rola de propósito;
    · número com PONTO decimal no texto da tela (o achado do Ranking, "77.9") — vale a lei da 29Z.

  Servidor LOCAL e nada gravado (as mesmas duas regras de scripts/loja/capturar-telas.mjs): a base tem de ser localhost, qualquer pedido a
  produção é abortado e reprova, e toda escrita em /api é respondida aqui mesmo.

  Uso (a partir de frontend/, com o motor em :3001 e o Vite em :5173/:5174):
    node scripts/varrer-estreito.mjs --base=http://localhost:5174                 (360 × 780)
    node scripts/varrer-estreito.mjs --base=http://localhost:5174 --largura=390 --altura=844
    opções: --so=ranking,novo-jogo   --capturas=<pasta>  (grava um print de cada tela)
  Sai com código 1 se achar qualquer defeito. A demo não é super-admin: Gabinete e Diagnóstico ficam de fora (a prova do navegador cobre o texto deles).

## scripts/ver-iphone.mjs

- (linha ~91, `const LATENCIA_MS = Number(opcao('latencia', '400')) || 0;`) VELOCIDADE 9 — atraso artificial por pedido à /api, para a bancada sentir o
  que o dono sente de Lisboa (o piso medido Lisboa↔São Paulo é ~400 ms de ida e
  volta; ver "Velocidade 6" no ONDE-ESTAMOS). 0 = rede local, sem atraso.
- (linha ~210, `function camposDaTela() {`) Rodada 8A: campos de texto visíveis e a fonte COMPUTADA de cada um. Abaixo de
  16 px o iOS dá zoom ao focar (e não desfaz sozinho).
- (linha ~222, `function observadorRanking({ lento }) {`) Rodada 8A: 1ª visita ao Ranking — observado de FORA do app. Quadros (gaps de
  requestAnimationFrame), 1ª linha do ranking no DOM, 1ª imagem de linha
  carregada e o toque na aba. Tudo em performance.now() da própria página, a
  mesma base do Diagnóstico do app.
- (linha ~263, `async function novoContexto(navegador, sessao, { amostrar = true, viewport = nu…`) `amostrar: false` = cenas da Rodada 8A: sem o amostrador de largura e com o
  service worker BLOQUEADO — com ele ativo, o WebKit passa os pedidos da página
  pelo SW e o Playwright deixa de os ver: a interceção das escritas falhava em
  silêncio (medido no 1º "antes": o PATCH da ausência e o POST do Diagnóstico
  chegaram a produção). O app da loja também não usa o SW.
- (linha ~280, `async function travarEscritas(contexto, extra = () => null) {`) Rodada 8A: nas cenas novas nada escreve no banco. Toda escrita à /api é
  respondida aqui; `extra` devolve um corpo próprio para rotas específicas.
- (linha ~301, `const camposLogin = await pagina.evaluate(camposDaTela);`) Rodada 8A: os campos do login também dão zoom no iPhone se a fonte for < 16 px.
- (linha ~556, `function crc32(buf) {`) ─── Cena "resenha": varredura estado a estado ────────────────────────────────
  Rodada 9, item 3. O Pedro no iPhone: "ao adicionar uma foto a tela aumenta e
  fica desproporcional". O WebKit faz isso quando ALGUMA coisa fica mais larga
  que a tela: ele alarga a viewport para caber e encolhe a página inteira. Aqui
  passa-se por cada estado da Resenha e mede-se, em cada um, a largura rolável,
  a escala da viewport, o elemento que passa da borda e as imagens sem travão.

  As fotos são sintéticas (geradas aqui, servidas por interceção) para as
  proporções serem exatas: 3:4 (retrato) e 16:9 (paisagem). Nada é publicado —
  toda escrita é interceptada, o upload devolve a URL falsa.
- (linha ~949, `function medirFixos() {`) ─── Cena "fixos": position:fixed que não ancora na TELA ──────────────────────
  Rodada 9, item 4. O mesmo defeito do modal de votar: um `position: fixed`
  dentro do [data-page] pode ancorar na PÁGINA em vez da tela — basta um
  ancestral com transform, filter, backdrop-filter, perspective, will-change
  dessas, contain ou container-type. Aqui a prova é empírica, não teórica:
  mede-se cada elemento fixo, rola-se a página e mede-se outra vez. Quem se
  mexeu não estava preso à tela.
- (linha ~1149, `await pagina`) Velocidade 8 (16-set): esperar que a aba já aponte para o TIME. O marcador
  (.games-label) pode aparecer com `teams` ainda vazio, e nessa janela o href
  da aba é "/ranking" (a rota sem slug, que mostra "crie o seu time"). Tocar
  aí levava a cena para a tela errada e ela morria num timeout de 30 s à
  espera de uma .rank-row que nunca ia existir — apanhado 3 vezes em 5 nesta
  máquina, onde o backend, o servidor da build e o WebKit disputam a mesma
  CPU. Não era defeito do app (confirmado à parte); era a bancada a medir
  outra coisa. Teto de 5 s para não trocar um timeout por outro.
- (linha ~1161, `await espera(200);`) No relatório do build 18 o toque veio 214 ms depois de o /api/inicio voltar
  (o Início já tinha pintado do cache) — antes do pré-aquecimento (1,5 s).
  force: sem a espera de "elemento parado" do Playwright, que com quadros
  lentos passava de 1 s e perdia a corrida para o aquecimento.
- (linha ~1170, `const pedidoRankingMs = await pagina.evaluate((toque) => {`) Quando o pedido do ranking saiu, contado do toque (o que muda com a Rodada 8A:
  com cache velho, só depois de a lista pintar).
- (linha ~1204, `function vigiarCromo() {`) ─── Cena "rodada12a" (16-set): as provas dos itens 1 a 6 ─────────────────────
  Cada item tem um número que decide sozinho se passou, e uma captura ao lado
  para o Pedro confirmar a olho. Tudo com o service worker bloqueado e as
  escritas interceptadas — nada desta cena chega ao banco.
- (linha ~1217, `const visivel = (el) => {`) VISÍVEL, não "existe no DOM". O código antigo já punha o <img> do avatar na
  árvore desde o primeiro quadro, com opacity:0 até o onLoad o medir — medir a
  presença dava "0 molduras soltas" também no build 21, que é exactamente o
  defeito que esta rodada veio corrigir. Uma prova que não distingue o antes
  do depois não prova nada (apanhado ao correr a etiqueta "antes").
- (linha ~1266, `await pagina.waitForSelector('.cromo-previa, .cromo-previa__reserva, .fig-aura'…`) As três de cima contam do goto, e num arranque frio ainda apanham o F de
  carregamento (a sessão e o perfil demoram mais do que 600 ms). Para se VER o
  que esta rodada mudou, mais três ancoradas no instante em que a área do
  cromo aparece: a primeira é o quadro em que ela nasce.
- (linha ~1381, `barraCaixa: r ? { topo: Math.round(r.top), baixo: Math.round(r.bottom), altura:…`) Presa à TELA: com a página rolada, o topo da barra tem de continuar a
  bater com a altura da janela (é o teste da cena "fixos" da Rodada 9).
- (linha ~1518, `function medirAnuncio() {`) ─── Cena "rodada12c" (16-set): publicidade nas 5 telas, vitrine e mudo ───────
  A campanha de prévia já está ligada de verdade no Gabinete (backend, 12B/12C),
  por isso aqui NÃO se serve anúncio nenhum por interceção: o que a cena mede é
  o que o app recebe da API real. As escritas continuam travadas.
- (linha ~1573, `async function cenaRodada14a(navegador, sessao) {`) RODADA 14A — a linha do tempo do som da cerimônia.

  Ninguém ouve um teste automático, então a prova é outra: instrumenta o
  `Audio.prototype.play` ANTES do app carregar e registra o que foi tocado,
  quando e em que volume. Se o trem de tiques alterna as 3 variantes, se o clac
  sai a cada jogador e se o jackpot sai uma vez só no fim, aparece aqui.
- (linha ~1636, `function medirCompartilhar14b() {`) RODADA 14B — o fim do sorteio como prêmio, e UM caminho para compartilhar.

  Três passagens pela mesma página:
    A) quem SORTEOU (o euSorteei entra por history.state, exatamente como o
       Jogo.jsx o manda no navigate): 6 quadros a contar do instante do jackpot
       (a classe .premio entra no mesmo tick do jackpot.mp3) e o card com o
       botão que sobe aos 5,1 s;
    B) um sorteio 9x9 — o /api/games/:id é reescrito para 18 jogadores: o botão
       cai fora da tela e a pílula-guia tem de aparecer, rolar até ele e sumir;
    C) quem abre o resultado DEPOIS: o estado final, sem o pulso forte.
- (linha ~1874, `function carimbos16b() {`) RODADA 16B — a luz do prêmio, segunda versão (17-set).
  O dono reprovou no aparelho a chuva de moedas (canvas-confetti) e os raios
  cônicos a girar atrás dos avatares. No lugar: 3 varreduras de brilho, pulsos
  de glow nas bordas (retângulo + avatares) nos três ataques do jackpot e 10
  pontos de brilho em cruz em posições fixas. Aqui:
    A) quem sorteou: 6 quadros a contar do instante do jackpot; a meio, a prova
       de que NADA gira no interior (nenhum elemento com rotação na matriz de
       transform nem animação de nome rotativo), nenhum <canvas> de moedas, e
       shine/glints/pulsos a correr; no fim, o estado calmo;
    B) quem abre depois: só o estado final (marquise suave, glow suave, botão
       com glow e sem pulso forte);
    C) movimento reduzido: flash + brilho suave, e mais nada a mexer.
- (linha ~2066, `async function cenaRodada17(navegador, sessao) {`) ═══ RODADA 17 — botão dourado pós-foto + "sendo criada" em toda geração ═══

  Ponta a ponta, sem interceptar nenhuma escrita: troca a foto (upload real,
  grátis) → confere o botão "Gerar Avatar IA" dourado e pulsando → toca nele
  (geração REAL, ~US$0,05) → confere que a Figurinha mostra "sendo criado" →
  vai ao Início NO MEIO da geração e confere "Sua figurinha está sendo
  criada…" (não o card "Complete seu card") → espera acabar → volta e
  confere a figurinha nova. Quem chama isto tem de repor a conta demo depois
  (scripts/_bench/repor-estado-demo.js no backend — tem modo sem custo).
- (linha ~2109, `scrollWidthDoc: document.scrollingElement?.scrollWidth ?? null,`) scrollWidth > innerWidth = algo empurrou a página para o lado (o
  defeito real que o overflow-x:clip existe para conter — Velocidade 7B).
- (linha ~2130, `const caixaBotao = await pagina.evaluate(() => {`) Zoom no botão: prova visual de que o glow não estoura nem é cortado pelo
  overflow-x:clip de #root/[data-page] (index.css, Velocidade 7B).
- (linha ~2174, `async function abrirComoSessao(navegador, sessao, papel, erros, textoDialogo) {`) ═══ FIGURINHA 3 — comum grátis, Brilhante por direito (22-set) ═══

  O percurso de quem chega hoje: cadastro → foto → figurinha COMUM na hora
  (sem esperar IA, sem custo) → o bloco "Vire figurinha" no lugar dos
  seletores → Planos com os três produtos → pedido de ativação.

  Corre com uma conta DESCARTÁVEL e vazia (backend:
  scripts/_bench/conta-de-prova.js escreve a sessão), porque a conta demo tem
  a Brilhante das lojas e não pode ser desfeita para provar a comum.

  SEM a migração 054 aplicada (é o Pedro que a aplica), a metade PAGA do
  percurso não existe: ninguém tem direito, o botão dourado não aparece e o
  pedido responde 503 digno. A cena regista o que encontrar em vez de fingir.
  ═══════════════════════════════════════════════════════════════════════════
  FIGURINHA 3 — BLOCO 2: o pacote do time, de ponta a ponta.

  Três pessoas, três contextos do navegador (sessões separadas, como na vida):
    1. o DONO abre os Planos e pede a ativação do pacote;
    2. o SUPER-ADMIN vê o pedido no Gabinete e ativa com o uniforme escolhido;
    3. o MEMBRO faz o cadastro (figurinha comum, grátis), vê o cartão dourado
       no Início e gera a Brilhante — no uniforme DO TIME, não num à escolha.

  Custa uma geração real (~US$0,11). O resto é grátis.
  ═══════════════════════════════════════════════════════════════════════════
  ═══════════════════════════════════════════════════════════════════════════
  VARREDURA GERAL PÓS-FIGURINHA 3 (22-set) — três cenas:

    1. cenaCriarTime       dono cria o 1º time pela UI, ganha o presente do
                           criador, gera a Brilhante real (~US$0,11)
    2. cenaConviteRecusa   convidado entra pelo link, pede "Minha Brilhante",
                           o super recusa com motivo, o recado volta no
                           Início e na Figurinha — sem gerar nada (grátis)
    3. cenaVarreduraRotas  crawler genérico: 1 sessão, N rotas concretas,
                           checa título, saída, links quebrados, PT-PT,
                           "undefined"/"null"/"NaN" e overflow em 430px

  As sessões vêm de scripts/_bench/contas-varredura.js (backend): um JSON só
  com as 5 contas (novo/membro/dono/super/convidado).
  ═══════════════════════════════════════════════════════════════════════════
- (linha ~2265, `await pagina.getByPlaceholder('Ex.: Brasília').fill('Kyoto');`) 29P: a cidade é obrigatória; "Kyoto" não tem sugestão na lista, então o texto vale e o Continuar aparece.
- (linha ~2286, `passos.ganhouBrilhanteNaTela = /Você ganhou \d+ gerações|Gerar agora/i.test(naP…`) Rodada 29A: o presente do criador foi ABOLIDO — a cena agora exige que ele NÃO exista (API e tela).
- (linha ~2415, `function montarRotasVarredura(incluirEstaticas) {`) Rotas concretas de App.jsx (22-set, varredura pós-Figurinha 3). IDs reais de
  dados demo já existentes (domingueira-fc-demo, vila-olimpica-fc-demo-vila) —
  só leitura em toda a lista, nada aqui clica em nada. `/jogo/:id/sorteio`
  fica de fora de propósito: sortear é uma ação real sobre o jogo pendente do
  time demo, que outras cenas (rodada14a) usam — não se arrisca aqui.
- (linha ~2425, `const CAMPEONATO_B = '11c1e8c8-4faa-4367-bdfc-7a6a6d6497e6'; // "em_curso", pon…`) O campeonato "Vaga 11B" (N times) vive em Storage (utils/campeonatoStore.js),
  não na tabela `campeonatos` (026, 2 times fixos, intocada). Um id daquela
  tabela aqui dava "Campeonato não encontrado" — achado desta varredura, no
  MEU dado de prova, não no produto (ver ONDE-ESTAMOS.md).
- (linha ~2629, `passos.figurinhaDizUniformeDoTime = (await membro.pagina.locator('[data-grade="…`) Rodada 29B (B): a frase "uniforme que o dono escolheu" saiu; o uniforme do time é o tile aberto (pintável) da grade.
- (linha ~2828, `prepararFn: async (pagina) => {`) A cerimónia tem de ACABAR para o slot aparecer (Rodada 12A).
- (linha ~2919, `function acharEPatchear(json, filtro, patch) {`) ─── Cena "rodada13" (16-set): Vou verde, "Ver sorteio" com vida ─────────────
  Item 1 — a paleta de presença troca de novo: "Vou" perde o dourado e vira
  fantasma VERDE, gémeo do "Não vou" vermelho — nenhum dos dois pode sair
  dourado, que agora é só do "Ver sorteio"/"Sortear" (decisão do dono, build
  22). Item 2 — "Ver sorteio" no card do Início ganha a receita cheia do
  .cta-gold: largura total do card, altura 46.

  Acha, na resposta REAL de /api/inicio, o primeiro jogo (em qualquer
  profundidade do payload — não se assume a forma exata) que passa no filtro,
  e aplica um patch nele: zera a presença (estado "nenhum" determinístico) ou
  força "sorteado" quando a conta demo não tiver nenhum jogo nesse estado.
  Sem isto a cena dependeria de sorte de dados. Nada disto grava no banco: é
  um patch na RESPOSTA que o browser recebe, e as escritas continuam travadas.
- (linha ~3031, `async function cenaRodada18(navegador, sessao) {`) ═══ RODADA 18 — "Mostrar minha foto" / "Mostrar minha figurinha" ═══

  A conta demo já tem foto E figurinha (usada nas provas anteriores) — nada
  aqui gera nada nem gasta direito, só exercita o interruptor nela. Termina
  devolvendo o modo a 'figurinha': outras cenas e a revisão da loja contam
  com essa conta mostrando a figurinha.
- (linha ~3120, `async function cenaVelocidade9(navegador, sessao) {`) ═══ VELOCIDADE 9 — o percurso do dono, medido com a distância dele ═══

  O relatório do build 28 veio de Lisboa: motor 77 ms de média, rede 458. Numa
  bancada local a rede é zero e todo defeito de cascata desaparece — uma tela
  que faz três pedidos em fila parece igual a uma que faz um. Por isso aqui
  cada chamada à /api leva `LATENCIA_MS` de atraso antes de sair.

  O percurso é o MESMO do relatório (Início → Resenha → Ranking → jogador →
  Figurinha → Início → Perfil) e os números saem do diagnóstico do próprio app
  (window.__futtyDiagnostico), não de um cronómetro da bancada: é o mesmo
  instrumento que o dono envia, portanto antes e depois são comparáveis com o
  que ele vê.
- (linha ~3203, `const cartoesNaResenha = await pagina.locator('.feed-item').count().catch(() =>…`) Quantos cartões a Resenha chegou a montar (a meta da rodada fala em 60).
- (linha ~3268, `async function escolherDataNosRolinhos(pagina, raiz, data, { so = null } = {}) {`) Rodada 29H (item 3): a data de nascimento são ROLINHOS (components/RolinhosData.jsx), não um <input type="date">. `escolherData` põe cada
  rolo no item pedido (rolagem programática → o mesmo caminho do dedo: onScroll → índice) e espera o rolo confirmar. `so` limita a
  quais rolos mexer (['ano', 'mes']); a ordem é sempre ano → mês → dia, porque o dia depende do mês.
- (linha ~3494, `const DOURADO = /rgba?\(\s*212,\s*160,\s*23|rgba?\(\s*240,\s*201,\s*74|rgba?\(\…`) As cores computadas do dourado antigo (--presenca-sim* de antes da
  Rodada 13): borda/fundo #d4a017, texto #f0c94a, fundo escuro rgba(30,24,8).
- (linha ~3654, `const naRolagem = (d.resumo.travadas?.piores || []).filter((t) => t.fase === 'r…`) A meta da rodada é sobre ROLAR: nenhuma travada > 200 ms com o dedo na tela.
- (linha ~4133, `async function cenaRodada19(navegador) {`) ─── Cena "rodada19" (23-set): enquadrar dentro de "Trocar foto", Minhas
  figurinhas (histórico), miniatura quadrada pelo topo. Lê a sessão gravada
  por scripts/_bench/prova-rodada19.js (backend) — conta já membro de
  domingueira-fc-demo, confirmada em 3 jogos (Ranking já pode listá-la).
- (linha ~4143, `const FOTO_PROBLEMA = path.join(RAIZ, '..', '..', 'BANCADA-FOTOS', 'Menor K chu…`) A foto-problema da bancada anterior (achado: miniatura quadrada mostrava
  o pulso, não o rosto) — mesmo arquivo, para prova direta do antes/depois.
- (linha ~4186, `await capturar('c-foto-trocada', async () => {`) Confirma o recorte — sobe avatar + original juntos. O card grande só
  repinta depois de o canvas BUSCAR a imagem nova pelo proxy (Figurinha.jsx,
  useEffect com jogador.avatar_url nas deps) e desenhar as camadas — esperar
  só o upload não basta (achado desta rodada: 1,5s fixo pegava o card a
  meio da repintura, ainda com o kit genérico). networkidle cobre as
  buscas do canvas sem apostar em qual delas é "a certa".
- (linha ~4238, `async function cenaCerimoniaMista(navegador) {`) ─── Cena "cerimonia-mista" (23-set): sorteio com jogadores de foto e de
  figurinha lado a lado, montado por scripts/_bench/prova-mista.js (backend).
  Lê o estado/sessão gravados por aquele script — não cria nem sorteia nada
  aqui, só reproduz e captura a cerimônia real (replay exacto pela seed).
- (linha ~4279, `await capturar('b-premio', async () => {`) (b) o momento do prêmio — TIMES SORTEADOS + os dois times revelados.
  Janela estreita: o texto entra letra a letra (stagger 70ms × 15 + anim
  500ms, settle ~1,48s) e começa a sair aos 1,7s (finalLockIn) — 1,55s
  pega todas as letras já formadas e ainda opacas (achado desta rodada:
  nada de errado no produto, só a captura cedo/tarde demais).
- (linha ~4329, `async function cenaRodada20(navegador) {`) ─── Cena "rodada20" (23-set): convite reutilizável (30 dias, várias
  entradas pelo MESMO link) + interruptor "Mostrar minha foto/figurinha"
  correto numa conta nova. Lê o estado/sessões gravados por
  scripts/_bench/prova-rodada20.js (backend) — 4 sessões próprias (cada
  captura abre e fecha o SEU contexto, papéis diferentes não se misturam).
- (linha ~4376, `await capturar('b-convite-reutilizado', async () => {`) (b) Convite JÁ usado por outra conta ("primeiro", na bancada) — "segundo"
  ainda entra pelo MESMO link (a prova central desta rodada).
- (linha ~4420, `async function cenaRodada21(navegador) {`) ─── Cena "rodada21" (24-set): gerações generosas + uniformes guardados. Lê a
  sessão gravada por scripts/_bench/prova-rodada21.js (backend) — conta com 3
  créditos, o kit dark-gold já pintado (os outros 4 por pintar), super-admin.
- (linha ~4479, `await capturar('d-planos-numeros-novos', async () => {`) (d) Planos — os números do pacote (por jogador) e da Minha Figurinha (10
  gerações). Sem número fixo aqui: mudou de 3 para 5 na Rodada 22.
- (linha ~4509, `async function cenaRodada22(navegador, sessao) {`) ─── Cena "rodada22" (24-set; números da Rodada 29A): o pacote do time diz "2 gerações por
  jogador" (Planos; eram 5) e o contato vira contato@futtyapp.com nas três telas
  públicas que o mostram (Termos, Privacidade, Excluir conta). Só leitura: usa
  a sessão da demo (o /planos exige login) e nenhuma escrita; nenhuma geração
  de IA (custo zero).
- (linha ~4577, `function bancadaDePreco(navegador, sessao, nomePasta) {`) Ajudantes das cenas "sem preço" (rodada23 e rodada24): abrem a tela como app da loja
  (Capacitor simulado) ou como site, remendam GETs e juntam as verificações.
- (linha ~4589, `const SEM_DIREITO = (j) => ({ ...j, direito: { fonte: null, team_id: null, kit_…`) P2 (26-set): as cenas "sem preço" fixam a loja DESLIGADA no estado (loja_pronta: false) — o resultado não
  depende do PAGAMENTOS_ATIVOS do motor local nem de a build ter a chave do RevenueCat.
- (linha ~4680, `async function cenaRodada23(navegador, sessao) {`) ─── Cena "rodada23" (25-set; textos de 26-set, Pagamentos P2): Loja Apple — sem preço no app
  da loja enquanto a loja não está ligada (Apple 3.1.1 / Google Payments). A conta demo abre Planos e
  Figurinha duas vezes: como app da loja (o Capacitor do navegador enxerga a plataforma "ios" pelo
  CapacitorCustomPlatform, lido quando o módulo carrega) e como site. Nas duas: nenhum R$, €,
  "comprar", "pagar" ou "preço" nessas telas e sem "Manto próprio" — o pedido de ativação.
  P2: o interruptor PAGAMENTOS_ATIVOS saiu do frontend (o --pagamentos morreu com ele). A loja só
  aparece no app nativo com o motor ligado (loja_pronta) E a chave do RevenueCat no build; estas
  cenas fixam loja_pronta: false no estado, então valem com qualquer build e qualquer motor local.
  Nada escreve no banco e nada gera figurinha. A conta demo já tem figurinha e créditos, então o
  estado de cada tela é montado remendando dois GETs (/api/me e /api/brilhantes/estado), senão o
  bloco "Vire figurinha" nem apareceria.
  --url tem de servir uma build com VITE_API_URL VAZIO (`VITE_API_URL= vite build`): o
  app "nativo" pede o /api ao endereço absoluto do motor, que o CORS do motor não
  libera para localhost; vazio, o pedido volta ao mesmo endereço e passa pelo proxy
  do preview. Depois, uma varredura de texto pelas outras telas, só como app.
- (linha ~4713, `for (const nativo of [true, false]) {`) (2) Figurinha, foto sem figurinha e sem gerações: o bloco "Vire figurinha" grande. Desde a
  Rodada 28 ele traz só o convite do pacote para a dona do time (a Minha virou a grade).
- (linha ~4727, `for (const nativo of [true, false]) {`) (3) Figurinha com figurinha feita e sem gerações: aba Uniforme. Desde a Rodada 28 o convite é a
  grade de uniformes (o cadeado leva aos Planos); P2: o tile trancado diz o texto do convite.
- (linha ~4750, `async function cenaRodada24(navegador, sessao) {`) ─── Cena "rodada24" (25-set; textos de 26-set, Pagamentos P2): o SITE continua sem vender. No
  SITE (sem Capacitor simulado, contra a build de produção servida por `vite preview`) Planos e
  Figurinha não mostram preço e usam a mesma lista do app (o pedido de ativação) — a loja só existe
  no app nativo. Termos e Privacidade trazem as cláusulas de compra do P2 (compras avulsas pela App
  Store / Google Play, RevenueCat na lista de fornecedores) e a data de hoje, sem o "não cobra nada"
  de 25-set. Nada escreve no banco e nada gera figurinha (custo de IA zero). Depois, a varredura de
  texto pelas outras telas do site.
- (linha ~4791, `{`) (3) Figurinha no site: aba Uniforme (figurinha feita, sem gerações) — desde a Rodada 28 o convite
  é a grade; P2: o tile trancado diz o texto do convite.
- (linha ~4809, `{`) (4) Termos: §7 de compras (P2), sem o "não cobra nada" de 25-set, com a data de hoje.
- (linha ~4841, `function amostrarCardHotfix26() {`) ─── Cena "hotfix26" (25-set): "Trocar foto" numa conta SEM figurinha muda o card. ───
  A conta vem de scripts/_bench/conta-hotfix26.js (backend), no estado do bug: foto_url e
  um avatar_url DIFERENTE dela que não é figurinha nossa (o que a foto do Google deixava
  lá). Esta cena ESCREVE de verdade (sobe uma foto ao motor local, que grava no Storage e no
  banco de teste), por isso só roda contra servidor LOCAL. Faz o que o dono fez, pela tela:
    1. abre a Figurinha e lê o card. O sinal é o CONTEÚDO, não a animação do card: a fração
       de pixels magenta no miolo (a foto de prova é magenta listrada; nada do card da casa
       tem essa cor);
    2. Trocar foto → escolhe o arquivo → recorte → Confirmar, com o 1º envio FALHANDO de
       propósito (500 depois de 1,5 s): durante o envio, "Enviando sua foto…"; com o erro,
       a mensagem sob o card, "Foto trocada" AUSENTE e o card intacto;
    3. "Tentar de novo" (o envio de verdade): 200; o motor devolve avatar_url = foto_url (a
       foto nova), a linha "Foto trocada" aparece só agora e o card passa a mostrar a foto;
    4. sai para o Perfil e volta SEM recarregar: o card continua com a foto nova;
    5. contexto novo (só a sessão, cache frio): o card mostra a foto nova, vinda do servidor.
  Nenhuma geração de IA (custo zero); toda escrita que não é o envio da foto é interceptada.
- (linha ~5063, `function pngGradiente(w, h, eixo) {`) ─── Cena "rodada27" (25-set): CHECK-UP DA FOTO DE VERDADE ───────────────────────
  O que o dono relatou pelo celular, medido em servidor LOCAL (390×844) antes de corrigir:
    1. "Trocar visual" não muda o genérico de quem já tem foto; sem foto tem de trocar na
       hora, e Ranking/Presença/Início têm de mostrar o MESMO genérico escolhido;
    2. a foto demora a aparecer: tempo do POST, do clique em Confirmar até o card mostrar a
       foto nova, e até o Início, o Perfil e o Ranking mostrarem (cache de sessão);
    3. enquadramento: o que se recorta no CropModal 2:3 tem de ser o que cada tela mostra
       (card 2:3 = o recorte inteiro; quadrado e miniaturas = o quadrado do TOPO; cartão 3:4
       do sorteio = do topo, sem cortar as laterais), com tolerância de 2 px;
    4. troca de tela: o percurso Início → Figurinha → Resenha → Início no diagnóstico do app.

  O INSTRUMENTO DE ENQUADRAMENTO. A foto de prova é um GRADIENTE CINZA (R = G = B): num passe
  o brilho é x/largura, no outro y/altura da imagem de origem, com um anel branco e um
  quadrado de cor em cada canto só para o olho. Cinza porque o brilho é o que os codecs com
  perda (JPEG do recorte, WebP do proxy) preservam melhor — no primeiro desenho, R e G
  coloridos erravam ±2 níveis (±2 px num card) por causa da croma. Uma captura de qualquer
  tela que mostre a foto diz, por regressão sobre o miolo, que janela do recorte ela mostra
  (u0..u1 num passe, v0..v1 no outro). Independe de moldura, de véu e de placa: ficam fora
  do miolo. Um CONTROLE mede o próprio recorte no mesmo pipeline (a imagem numa <img> de
  200×300): as telas se comparam com ele, não com a teoria, e o viés dos codecs some.

  Só roda contra servidor LOCAL e ESCREVE de verdade (sobe fotos, muda o genérico). Custo de IA
  zero. Precisa de backend/scripts/_bench/time-rodada27.js rodado antes (as contas e o time).
    node scripts/ver-iphone.mjs --url http://127.0.0.1:5297 --cenas rodada27 --etiqueta antes
    --partes 1,2,4   (1 = genérico · 2 = foto: tempos, caches e enquadramento · 4 = troca de tela ·
                      5 = "Ajustar enquadramento" chega às telas · padrão: 1,2,4,5)
- (linha ~5446, `item1.semFoto.fasesDoCard = (await B.pagina.evaluate(async () => (window.__futt…`) Rodada 28: o gancho devolve uma promessa (o montador do relatório chega sob demanda).
- (linha ~5835, `const item5 = {};`) ════════════════ 5. AJUSTAR ENQUADRAMENTO: o recorte novo chega a TODAS as telas ════════════════
  "Não sei se o reenquadramento chega ao Início" (dono, 25-set). Um contexto só do começo ao fim — é o cache de
  sessão que se testa: sobe uma foto (gradiente), aquece Início, Ranking e Perfil com ela, REENQUADRA pela tela
  (Trocar foto → Ajustar enquadramento → zoom 2 → Confirmar: PUT do recorte) e olha, em cada tela, QUAL arquivo a
  <img> mostra (e, no Início, se o cromo desenhado é outro). Zoom 2 muda o recorte de verdade: metade da largura.
- (linha ~5950, `async function cenaRodada28(navegador) {`) ─── Cena "rodada28" (25-set): produto, sessão, cadastro 18+ (29G), Diagnóstico, telemetria ─────
  Prova pela tela, em servidor LOCAL (nunca a produção — CLAUDE.md, 25-set), o que a Rodada 28 mudou:
    A · card com a FOTO (conta no estado da "foto do Google": avatar_url ≠ foto_url sem ser figurinha):
        sem seletor de fundos; a foto cobre a moldura (camada do jogador opaca em todo o octógono) e o
        zoom tem piso nisso (o "−" nasce travado); grade de uniformes com o 1º liberado e os outros com
        cadeado → Planos (sem preço); Baixar/Compartilhar voltaram. Conta do pacote: o uniforme do
        time é o 1º, pintável, com aviso — e a cena NÃO pinta (toca em "Agora não");
    B · "Sair" só deste aparelho (outro aparelho da mesma conta continua dentro); 401 do motor: renova e
        repete; 401 de novo → login com "Sua sessão terminou", e o Início nunca diz "Bem-vindo ao Futty.";
    C · cadastro com menos de 18 anos (Rodada 29G; antes 13): o formulário não chama o signUp; o onboarding
        pede a data antes da foto — adulto segue, menor vê o login com "O Futty é para maiores de 18 anos.";
    D · Perfil sem Diagnóstico; /diagnostico só para o super-admin, pelo Gabinete;
    E · telemetria: uma vez por tela, sem Authorization, só os campos combinados, telas como padrão;
    H · Gabinete: aba Figurinhas com jogadores/gerações; aba Velocidade.
  Precisa de backend/scripts/_bench/prova-rodada28.js rodado antes. Escreve de verdade no banco
  (datas de nascimento, onboarding, contas @futtymock) — custo de IA zero.
    node scripts/ver-iphone.mjs --url http://127.0.0.1:5228 --cenas rodada28 --etiqueta r28
- (linha ~6099, `verificar('A3 · grade de uniformes (grátis): 5 tiles, todos com cadeado', estad…`) Rodada 29B (B): sem direito TODOS com cadeado (antes o 1º, o Dark Gold, vinha "livre" e sem cadeado).
- (linha ~6103, `verificar('A · Compartilhar voltou ao card com a foto (um botão só no celular;…`) 29H (item 58): no celular (tela de toque) fica UM botão, "Compartilhar"; "Baixar" só no computador.
- (linha ~6202, `` const dezAnos = `${new Date().getUTCFullYear() - 18}-12-31`; ``) ── C · cadastro com menos de 18 anos ──
  29H: o rolo só vai até o ano atual − 18 — "menor de 18" é o último ano oferecido, no fim de dezembro (sempre menor, salvo em 31/12).
- (linha ~6216, `` await escolherDataNosRolinhos(pagina, '#birthdate', `${new Date().getUTCFullYea… ``) 29H: rolinhos — o ano mais alto é o ano atual − 18; "menor de 18" aqui é o último ano oferecido, no fim de dezembro.
- (linha ~6450, `async function cenaRodada29aCsp(navegador, sessao) {`) ─── Cena "rodada29a-csp" (30-set): violações da CSP em Report-Only (Rodada 29A, parte C). ─────────────
  O `_headers` da Cloudflare só vale no ar; aqui ele é emulado: o cabeçalho Content-Security-Policy-Report-Only
  é lido do próprio public/_headers (bloco `/*`) e posto na resposta de cada DOCUMENTO pelo Playwright. O servidor
  tem de ser o BUILD (`vite preview`), não o `vite dev` (o dev usa scripts inline e WebSocket do HMR, que sujariam
  a lista). Cada `securitypolicyviolation` da página entra na lista; nada é bloqueado — é só relatório.
  Só leitura: toda escrita à /api é interceptada.
- (linha ~6530, `async function cenaRodada29aToast(navegador, sessao) {`) ─── Cena "rodada29a-toast" (30-set): os avisos no MEIO da tela (Rodada 29A, parte E). ──────────────────
  Usa o Perfil: "Salvar dados" (sucesso), o mesmo PATCH devolvendo 500 (erro) e "Relatar um problema" (info).
  Toda escrita à /api é interceptada (nada chega ao banco); o 500 é fabricado aqui.
- (linha ~6625, `{`) 3) info: no Explorar, "Usar minha localização" num aparelho sem localização avisa (sem rede). Rodada 29B (D): o botão
     "usar a cidade escrita" saiu do Explorar (virou o campo de cidade com sugestão); o aviso "i" é o mesmo.
- (linha ~6660, `async function cenaRodada29aApoio(navegador, sessao) {`) ─── Cena "rodada29a-apoio" (30-set): os textos de apoio (.texto-apoio) nas telas (Rodada 29A, parte F). ──────
  Confere, tela a tela, que cada texto de apoio tem 13 px, altura de linha 1,5, largura máxima de 34 em, cor apagada
  e que a tela não ganhou rolagem lateral. Só leitura (toda escrita é interceptada).
- (linha ~6680, `['criar-time-2', '/criar-time', async (pagina) => { await pagina.locator('input…`) 29P: a cidade é obrigatória no passo 1; "Kyoto" não tem sugestão na lista, então o texto vale e o Continuar aparece.
- (linha ~6717, `async function cenaRodada29aLinhaGol(navegador, sessao) {`) ─── Cena "rodada29a-linhagol" (30-set): linha ou gol à vista (Rodada 29A, parte G). ────────────────────
  Na página do time a escolha sobe para o card do próprio jogador, no topo; o Perfil ganha "Meus times".
  A escrita (PATCH /api/equipas/:slug/membros/posicao) é interceptada: a cena confere o CORPO enviado.
- (linha ~6745, `const grupo = '[data-escolha-linha-gol]';`) Rodada 29H (item 8/50): o botão "Você joga na linha · trocar" virou DOIS chips lado a lado — "Jogo na linha" | "No gol" —, um aceso.
- (linha ~6801, `async function cenaRodada29aLogo(navegador, sessao) {`) ─── Cena "rodada29a-logo" (30-set): logo do time na criação (Rodada 29A, parte H). ─────────────────────
  Passo 1 do wizard: campo opcional, prévia redonda, 2 MB, png/jpg/webp. Depois do POST /api/teams: POST
  /api/teams/:slug/logo; se a moderação recusar, o time nasce igual e o passo 4 avisa. NADA chega ao banco:
  o POST /api/teams e o do logo são respondidos aqui (o de recusa, com o 403 que o motor daria).
- (linha ~6843, `await pagina.getByPlaceholder('Ex.: Brasília').fill('Kyoto');`) 29P: a cidade é obrigatória; "Kyoto" não tem sugestão na lista, então o texto vale e o Continuar aparece.
- (linha ~6906, `await pagina.locator('.futty-toast').tap();`) Aviso de erro fica até tocar (Rodada 29A, E): a pessoa toca nele, como faria, e segue.
- (linha ~6917, `async function cenaRodada29bConvite(navegador, sessao) {`) ─── Cena "rodada29b-convite" (30-set): a página do convite refeita (Rodada 29B, parte A). ──────────────────
  GET /api/convite/:token é respondido aqui (nenhum convite real é tocado) e toda escrita é interceptada. Estados:
  válido com logo, sem logo, sem fatos (time novo), expirado, já membro, logado que ainda não é membro; e o caminho
  "Criar conta e entrar" (bilhete no aparelho → Início devolve ao convite). Substitui a cena rodada29a-convite, que
  conferia o desenho antigo (cartão à esquerda, wordmark roxo, iniciais num quadrado azul).
- (linha ~7032, `{`) 2) sem logo: só o nome em destaque (29H, item 23: o quadrado de iniciais saiu)
- (linha ~7116, `async function cenaRodada29bUniformes(navegador) {`) ─── Cena "rodada29b-uniformes" (30-set): a grade de uniformes igual para os três direitos (Rodada 29B, parte B). ──
  Contas de prova do backend (scripts/_bench/prova-rodada29b.js → scripts/capturas/sessao-rodada29b.json): grátis,
  pacote do time (card com a foto e com a figurinha vestida) e Minha Figurinha (idem). Nada gera figurinha e toda
  escrita à /api é interceptada (o toque num uniforme pintado manda PUT /api/me/kit, respondido aqui). Só servidor LOCAL.
- (linha ~7400, `verificar('o texto sob o card avisa que dá para sair da tela ("Pode sair da tel…`) 29H (item 59): o aviso foi rediagramado — título numa linha (com o F) e a explicação embaixo, no texto de apoio da casa.
- (linha ~7488, `async function cenaRodada29bPesada(navegador) {`) ─── Cena "rodada29b-pesada" (1-out): a conta pesada (super-admin, 2 times, histórico) no Início e na Resenha (Rodada 29B, bloco 2, B). ──
  Contas de prova do backend (scripts/_bench/prova-conta-pesada.js → sessao-pesada.json, sessao-leve.json): a pesada está em 2 times (um
  "Missa" com 30 jogos de histórico e 16 posts com foto; um "Várzea" com 22 membros, 9 jogos e 9 posts) e é super-admin; a leve, em 1.
  Prova no navegador: o Início faz UM pedido no arranque e a lista de jogos não carrega o histórico; a Resenha vem em páginas de 20 e o
  "Ver mais antigos" completa a lista sem repetir; o pré-aquecimento baixa no máximo 12 imagens e nada de super-admin sai. Só LEITURA e só
  servidor LOCAL (CLAUDE.md, 25-set).
- (linha ~7604, `async function cenaRodada29bBoasVindas(navegador) {`) ─── Cena "rodada29b-boasvindas" (30-set; refeita na Rodada 29C, 1-out — alias "rodada29c-boasvindas"): as boas-vindas ──
  do time, em UMA página (components/BoasVindas.jsx). Contas de prova (scripts/_bench/prova-rodada29b.js): `novato`
  (membro do time grátis, sem foto), `membroFoto` (membro, com foto) e `gratis` (dono do time grátis). As duas variantes
  (convidado, criador — a de quem só baixou o app saiu na 29D) e as duas máquinas da prova aprovada (deitada para time sem
  logo; quadrada, com dois anéis contínuos, para logo). Toda escrita à /api é interceptada (o "No gol" manda o PATCH de
  posição, o Criar time manda o POST — respondidos aqui); o logo do time entra por cima da resposta REAL do motor (route.fetch).
  Só servidor LOCAL.
- (linha ~7620, `const FRASES = {`) 29P: a variante do criador saiu (a festa passou para o fim do Criar time); só a frase do convidado continua.
- (linha ~7852, `{`) 6) CRIADOR (29P): a festa é o passo 4 do Criar time — a máquina deitada com o nome na janela, na hora em que o time nasce;
     "Ir para o time" NÃO abre boas-vindas nenhuma (a pessoa já comemorou), e nada é gravado como "visto".
- (linha ~7859, `await pagina.getByPlaceholder('Ex.: Brasília').fill('Kyoto');`) 29P: cidade obrigatória; fora da lista, o texto vale
- (linha ~7903, `async function cenaRodada29d(navegador) {`) ─── Cena "rodada29d" (1-out): onboarding em 3 páginas com o mini sorteio, o F dentro do ícone do app, aceite de pedido ──
  com boas-vindas. Contas de prova (scripts/_bench/prova-rodada29b.js): `novato` e `membroFoto` (membros do time grátis).
  O Onboarding abre direto (a gate só manda PARA ele, nunca para fora); o "Entrar" (PATCH /api/me + POST onboarding-completo),
  o convite (GET falso, POST aceitar) e o aceite do pedido (/api/inicio real com um pedido aprovado por cima) são
  interceptados — nada chega ao banco. Só servidor LOCAL.
- (linha ~7989, `{`) 2) Onboarding SEM convite: passo 1 com o ícone (110 px) e 3 traços (o mini sorteio é da cena rodada29e); depois foto e nome
- (linha ~7997, `verificar('passo 1: "BEM-VINDO AO FUTTY" com o ícone do app a 110 px (sem F sol…`) ±2 px: o ícone flutua (bob/sway) e o getBoundingClientRect arredonda no meio do movimento. O mini sorteio é da cena rodada29e.
- (linha ~8005, `await espera(2300);`) "deixar para depois" aparece aos ~2 s (29H; era ~4 s)
- (linha ~8018, `{`) 3) Onboarding COM convite pendente — 29H (item 1): começa nas boas-vindas do time (a máquina), depois foto e nome (3 traços); o convite
     é aceito no fim e a pessoa cai direto no time. A prova completa desse caminho é a cena rodada29h (seção C).
- (linha ~8032, `await espera(2300);`) "deixar para depois" aparece aos ~2 s (29H)
- (linha ~8133, `const anosOferecidos = await pagina.locator('#birthdate [data-rolo="ano"] [data…`) 29H: rolinhos — o ano mais alto que o rolo oferece é o ano atual − 18 (o teto do mês/dia, quem confere é o envio, abaixo).
- (linha ~8233, `await escolherDataNosRolinhos(pagina, '#inicio-nascimento', aniversarioHoje(18,…`) 29H: o rolo só vai até o ano atual − 18; "menor" aqui é quem faz 18 amanhã (último ano oferecido, dia de amanhã).
- (linha ~8277, `async function cenaRodada29e2(navegador) {`) ─── Cena "rodada29e2" (2-out): o mini sorteio do onboarding em ROLOS de slot machine, a legenda e o CTA novos, sem barra ──
  O que prova pela tela, em servidor LOCAL (CLAUDE.md, 25-set), com a conta de prova `novato` (prova-rodada29b.js) e toda
  escrita interceptada:
    A · 1ª página: título e subtítulo; a legenda "SORTEIO JUSTO · RANKING · FIGURINHA DE COLECIONADOR" no estilo do subtítulo
        (Rajdhani 700, caixa alta, .14em, #c9c2d6, 12–13 px) em ≤ 2 linhas — e, a 320 px, em DUAS linhas parecidas sem palavra
        sozinha; o botão Começar é o CTA dourado da casa (.btn.cta-gold dentro de .cta-gold-glow, 50 px, ≤ 290, 24 px acima e abaixo);
    B · a barra de navegação não aparece na 1ª nem na 2ª página do onboarding (a regra é por rota — a 3ª é a mesma rota);
    C · a máquina: 6 rolos (3 por time), cada tira com as 6 figurinhas duas vezes girando em msqSpin; um ciclo inteiro medido na
        página (MutationObserver): o 1º rolo trava ~1,8 s depois de girarem, um a cada ~0,5 s alternando A/B, desacelera ~1 s
        (.slow) antes de parar (.stop + .rev.on com msqRevPop + micro-lâmpadas msqMbPisca), o pulso único das réguas (.maq.premio
        ~0,8 s) quando o 6º trava, seguram ~2,5 s, fade ~0,4 s, ciclo ~7,8 s, e o ciclo seguinte vem noutra ordem;
    D · no fim do ciclo os 6 rolos travados mostram as 6 figurinhas (3 por time, nome e busto 112×150 de /onboarding/);
    E · os 6 arquivos: 200, image/webp, ≤ 6 KB; sem som;
    F · prefers-reduced-motion: os 6 travados, nada gira nem pisca, e 3,5 s depois tudo igual.
    node scripts/ver-iphone.mjs --url http://localhost:5232 --cenas rodada29e2 --etiqueta r29e2
- (linha ~8299, `const NOMES = ['BRUNINHO', 'TIAGÃO', 'GONÇALO', 'PEDRÃO', 'RAFA', 'DUDU', 'NAND…`) 29E3 (dono, 2-out): 4 jogadores por time — 8 figurinhas em 8 rolos (2 linhas de 4); LÉO virou GONÇALO (goncalo.webp).
- (linha ~8347, `const nm = rev?.querySelector('.nm');`) 29E3: o nome tem de caber na cartinha de 56 (GONÇALO como BRUNINHO): a largura do texto medida com um Range.
- (linha ~8395, `geometria: (maq && m.querySelector('.janela')) ? (() => {`) 29E3: a geometria das 2 linhas de 4 — a máquina não pode estourar a largura (nem a 320 px) nem a janela cortar um rolo.
- (linha ~8425, `const geoOk = (G) => !!G && G.docScroll <= G.viewport && G.bodyScroll <= G.view…`) 29E3: a máquina cabe na tela (nada rola de lado), 2 linhas de 4 rolos de 56 dentro da janela (nenhum cortado pelo overflow).
- (linha ~8475, `setTimeout(() => { obs.disconnect(); res({ ok: false, log }); }, 32000);`) 29H-B: dois ciclos de ~10,65 s cabem com folga
- (linha ~8503, `verificar('C · os 8 rolos travam um por vez, alternando A/B a cada ~0,75 s, o 1…`) 29H-B (item 40): giro inicial 0,4 s, um rolo a cada 0,75 s, desacelera 1,5 s → 1ª trava ~1,9 s, 8ª ~7,15 s; ciclo ~10,65 s.
- (linha ~8517, `const nomes = rolosCheio.map((x) => ({ id: x.rev?.id, nome: x.rev?.nome, src: x…`) 29E3: GONÇALO (com cedilha, arquivo goncalo.webp) aparece e cabe na cartinha de 56 como BRUNINHO: texto ≤ 54 px, sem estourar.
- (linha ~8527, `await esperarFase(pagina, 'cheio', 11000);`) 29H-B: o 8º trava 7,15 s depois de girar
- (linha ~8626, `async function cenaRodada29e(navegador) {`) ─── Cena "rodada29e" (1-out): a 1ª página do onboarding — o ícone do app a 110 px flutuando, os textos da landing, e o mini ──
  sorteio com as 6 figurinhas FICTÍCIAS caindo em dois times (TIME A ouro / TIME B roxo) nas molduras do sorteio real: o
  ciclo inteiro medido na página (vazio → 6 entradas alternando A/B a cada 0,45 s → cheio com as micro-lâmpadas piscando por
  2,5 s → esvazia → recomeça noutra ordem), os bustos servidos de /onboarding/ (112×150 WebP, ≤ 6 KB), sem som, e o
  movimento reduzido (os 6 no lugar, parados). Conta de prova `novato` (prova-rodada29b.js). Só servidor LOCAL.
- (linha ~8818, `async function cenaRodada29bCidades(navegador) {`) ─── Cena "rodada29b-cidades" (30-set): o campo "Cidade" com sugestão — criar time, painel do time e Explorar
  (Rodada 29B, parte D). Contas de prova (scripts/_bench/prova-rodada29b.js): `gratis` é dono do time prova-r29b-gratis.
  Toda escrita à /api é interceptada (o POST/PATCH da cidade é respondido aqui, como o motor responderia) e o Nominatim
  do navegador também. A lista vem de public/dados/cidades.json, servida pelo servidor local. Só servidor LOCAL.
- (linha ~8887, `const cidadeDaFesta = async (pagina) => (await pagina.locator('[data-cidade-do-…`) 29P: a cidade achada vira informação do time na festa ("São Paulo, SP", sem "Encontramos:").
- (linha ~9037, `async function cenaRodada29bOrganiza(navegador) {`) ─── Cena "rodada29b-organiza" (30-set): "Só organizo" — o papel de quem administra o time (Rodada 29B, parte E). ──
  A migração 067 (team_members.joga) NÃO está aplicada no banco compartilhado, então esta cena lê as respostas REAIS do
  motor local e troca `joga` / `eu_jogo` por cima (route.fetch + alteração do JSON) — o app é o mesmo, só o dado muda.
  Toda escrita à /api é interceptada (o PATCH do papel e o POST da criação são respondidos aqui). Só servidor LOCAL.
- (linha ~9095, `await pagina.getByPlaceholder('Ex.: Brasília').fill('Kyoto');`) 29P: a cidade é obrigatória; "Kyoto" não tem sugestão na lista, então o texto vale e o Continuar aparece.
- (linha ~9112, `{`) 1) criar o time: "Sim, eu jogo" (padrão) / "Não, só organizo" — sem texto embaixo dos chips (29O)
- (linha ~9145, `await pagina.locator('[data-aviso-papel]').waitFor({ timeout: 8000 }).catch(()…`) 29H (item 46): o aviso era um toast de 2 s, ilegível — agora é texto fixo na tela do passo 4 (nenhum toast).
- (linha ~9201, `verificar('Início (só organiza): a frase de apoio "então não entra na lista de…`) 29T (achado 163): a frase comprida saiu de cima dos Próximos jogos; fica só a linha de dentro do card (acima).
- (linha ~9254, `async function cenaRodada29bAvise(navegador) {`) ─── Cena "rodada29b-avise" (30-set): a lista "Avise-me" — bloco na página inicial, página /avise-me e aba do Gabinete
  (Rodada 29B, parte F). O POST /api/avise-me é respondido AQUI (nenhum e-mail entra na lista de verdade: a migração 068
  não está aplicada) e o Gabinete lê uma lista fabricada. Só servidor LOCAL.
- (linha ~9298, `{`) 1) a página inicial pública (29P): o bloco do Avise-me SAIU — a página já é a de verdade, numa tela só

## scripts/verificar-dist.js

- (linha ~2, `import fs from 'node:fs';`) Futty v2.0 — Confere a integridade do grafo de chunks do build (build 10,
  achado real: um chunk referenciado deixou de existir no CDN depois de um
  deploy e o import dinâmico quebrava em produção, sem NADA no build local
  avisar disso). Lê dist/index.html, segue os imports — estáticos (import
  entre chunks) e dinâmicos (o mapa de preload do rolldown/vite,
  __vite__mapDeps) — e falha se algum .js/.css referenciado não existir
  dentro de dist/assets. Corre depois de `vite build`, antes de publicar.

  VELOCIDADE 8 (16-set) — confere também o PESO DO ARRANQUE: a soma de tudo o
  que o index.html manda o browser buscar e compilar antes de a 1ª tela existir
  (o <script type=module> da entrada mais todos os <link rel=modulepreload>).
  Esse número é o que explica o "na primeira vez trava muito até fluir": na 1ª
  abertura depois de instalar/atualizar o WebKit compila tudo sem cache de
  bytecode. Estava em 592 KiB e passa a ter TETO, senão volta lá sozinho — foi
  exactamente assim que os 200 KB do supabase-js lá foram parar, arrastados por
  uma constante de 40 caracteres importada na raiz.

  Uso: node scripts/verificar-dist.js  (chamado por `npm run build`)
- (linha ~108, `function preloadDoOnboarding(html) {`) Rodada 29H (item 4): o index.html carrega /preload-onboarding.js (plugin preloadDoOnboardingNoFrio do vite.config.js), que no caminho
  /onboarding pede o chunk, o CSS e as 8 imagens da página 1 junto com o index.js. O arquivo é gerado a cada build com os nomes COM hash:
  se um chunk mudar de nome sem o plugin acompanhar, o preload pediria arquivos que não existem (404 por pessoa, em silêncio). Aqui se
  confere que o <script> está no HTML e que TODA URL do arquivo existe em dist/.

  @returns {boolean} false se algo faltar (o chamador falha a build).
- (linha ~163, `const tetoBytes = TETO_ARRANQUE_KIB * 1024;`) Em bytes exatos: o arredondado em KiB esconde os últimos ~100 B, e é a folga
  em bytes que as rodadas negociam (Rodada 29B). Formato fixo, fácil de grepar.
