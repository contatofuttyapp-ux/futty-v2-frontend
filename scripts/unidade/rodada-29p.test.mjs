// Futty v2.0 — Rodada 29P: landing para valer, Criar time com mais vida (passo 1 sem título, cidade obrigatória, lixeira do logo,
// a festa no fim) e "Radar de peladas" no lugar de "Explorar". A regra da cidade preenchida é provada na função pura; o resto é
// travado lendo o código, como os outros testes de tela da casa. A prova no navegador está em scripts/provas/criar-time.prova.mjs.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { avisoNaoAchou, cidadePreenchida } from '../../src/utils/cidades.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const existe = (rel) => fs.existsSync(path.join(RAIZ, rel));

test('29P · cidade preenchida: da lista vale sempre; texto livre vale só sem sugestão na lista (e com 2+ letras); nunca trava quem está fora', () => {
  const escolha = { cidade: 'Brasília', uf: 'DF', pais: 'BR', lat: -15.8, lng: -47.9, origem: 'lista' };
  assert.equal(cidadePreenchida({ texto: 'Brasília, DF', escolha, temSugestoes: true }), true, 'escolhida da lista');
  assert.equal(cidadePreenchida({ texto: 'Kyoto', escolha: null, temSugestoes: false }), true, 'fora do Brasil e de Portugal: o texto vale');
  assert.equal(cidadePreenchida({ texto: 'Bras', escolha: null, temSugestoes: true }), false, 'a lista sugere: a pessoa escolhe uma');
  assert.equal(cidadePreenchida({ texto: 'Brasília', escolha: null, temSugestoes: true }), false, 'digitou inteiro mas não escolheu: ainda não');
  assert.equal(cidadePreenchida({ texto: '', escolha: null, temSugestoes: false }), false, 'vazio não vale');
  assert.equal(cidadePreenchida({ texto: '   ', escolha: null, temSugestoes: false }), false, 'só espaço não vale');
  assert.equal(cidadePreenchida({ texto: 'K', escolha: null, temSugestoes: false }), false, 'uma letra não é cidade');
  assert.equal(cidadePreenchida({ texto: 'Ky', escolha: null, temSugestoes: false }), true, 'duas letras sem sugestão valem');
});

test('29P · "Radar de peladas" em frase vai entre aspas (o aviso da cidade não achada)', () => {
  assert.match(avisoNaoAchou('Vila Xyzzy'), /no "Radar de peladas" para quem escrever exatamente 'Vila Xyzzy'\./);
});

test('29P · landing para valer: sem o Avise-me, com o F, o slogan, a frase e as portas; /avise-me leva para "/"', () => {
  const landing = ler('src/pages/LandingPage.jsx');
  assert.doesNotMatch(landing, /AviseMe/);
  assert.doesNotMatch(landing, /Quero ser avisado/);
  assert.doesNotMatch(landing, /soAviseMe/);
  assert.match(landing, /<FuttyIconeFlutuante size=\{tamanhoF\} \/>/);
  assert.match(landing, /O seu time\.<br \/>A sua figurinha\./);
  assert.match(landing, /Futty: sorteio de times, ranking e figurinha de colecionador para o seu futebol\./);
  assert.match(landing, /Entrar com Google/);
  assert.match(landing, /Criar conta/);
  assert.match(landing, /Já tenho conta → /);
  assert.match(landing, /data-rodape-legal/);
  const app = ler('src/App.jsx');
  assert.match(app, /<Route path="\/avise-me" element=\{<Navigate to="\/" replace \/>\} \/>/);
  assert.doesNotMatch(app, /soAviseMe/);
  assert.equal(existe('src/pages/AviseMe.jsx'), false, 'a página do Avise-me saiu (sem lixo no app)');
  assert.equal(existe('src/pages/gabinete/AviseMe.jsx'), true, 'a lista do Gabinete fica');
  assert.doesNotMatch(ler('src/components/Layout.jsx'), /avise-me/);
});

test('29P · Criar time, passo 1: sem título nem textos de apoio; rótulos limpos; Continuar só acende com nome e cidade; lixeira do logo', () => {
  const criar = ler('src/pages/CriarEquipa.jsx');
  const passo1 = criar.slice(criar.indexOf('{passo === 1 && ('), criar.indexOf('{passo === 2 && ('));
  assert.match(passo1, /<h1 style=\{SO_LEITOR\}>Passo 1 de 3<\/h1>/);
  assert.doesNotMatch(passo1, /Dê nome ao seu time|O escudo nasce das iniciais/);
  assert.doesNotMatch(passo1, /texto-apoio/, 'nenhum texto de apoio embaixo dos campos');
  assert.match(passo1, /<Lbl grande>Nome do time<\/Lbl>/);
  assert.match(passo1, /<Lbl grande>Cidade<\/Lbl>/);
  assert.match(passo1, /\{bairros\.estado === 'lista' \? \([\s\S]*?<Lbl grande>Bairro \(opcional\)<\/Lbl>/, '29T-B: o bairro só aparece quando a cidade tem lista');
  assert.match(passo1, /<Lbl grande>Logo do time \(opcional\)<\/Lbl>/);
  assert.doesNotMatch(passo1, /\(obrigatóri[oa]/);
  assert.doesNotMatch(criar, /Falta o nome do time/);
  // 29T (achado 166): o Continuar existe desde o começo, apagado, e só acende com nome e cidade.
  assert.match(passo1, /<Cta cheio disabled=\{!podeContinuar\} data-continuar-passo-1 onClick=\{\(\) => irParaPasso\(2\)\}>Continuar<\/Cta>/, 'o Continuar está lá, apagado, até haver nome e cidade');
  assert.doesNotMatch(passo1, /\{podeContinuar \? \(/, 'e não some mais quando falta nome ou cidade');
  assert.match(criar, /const cidadeOk = cidadePreenchida\(\{ texto: cidade, escolha: cidadeEscolha, temSugestoes \}\);/);
  assert.match(criar, /const podeContinuar = !!nome\.trim\(\) && cidadeOk;/);
  assert.match(passo1, /aoSugestoes=\{aoSugestoes\}/, 'o campo diz se a lista sugere algo');
  assert.match(passo1, /aria-label="Tirar logo"/);
  assert.match(passo1, /<Trash2 /);
  assert.doesNotMatch(passo1, />\s*Tirar\s*</);
  assert.match(passo1, /data-escudo-iniciais/, 'o escudo das iniciais fica');
  assert.match(passo1, /fontSize: 22, fontWeight: 700/, 'o nome do time é a estrela da tela');
  assert.match(criar, /Time aberto precisa de cidade\./, 'a defesa do passo 3 fica');
});

test('29P · Criar time, passo 3: sem subtítulo; os textos citam o "Radar de peladas"', () => {
  const criar = ler('src/pages/CriarEquipa.jsx');
  const passo3 = criar.slice(criar.indexOf('{passo === 3 && ('), criar.indexOf('{passo === 4 && team && ('));
  assert.doesNotMatch(passo3, /Como se entra no seu time/);
  assert.match(passo3, /d: 'Só entra quem receber o seu link de convite\.'/);
  assert.match(passo3, /d: 'Quem achar o time no "Radar de peladas" pede para entrar\. Você aceita ou não\.'/);
  assert.match(passo3, /d: 'Qualquer um que achar o time no "Radar de peladas" entra na hora\.'/);
});

test('29P · Criar time, passo 4 é a festa: a máquina das boas-vindas com o nome, a cidade embaixo, "Seu time está no ar!"', () => {
  const criar = ler('src/pages/CriarEquipa.jsx');
  const passo4 = criar.slice(criar.indexOf('{passo === 4 && team && ('), criar.indexOf('</main>'));
  assert.match(criar, /import \{ MaquinaDoTime \} from '\.\.\/components\/BoasVindas';/, 'reaproveita a máquina, não copia');
  assert.match(passo4, /<div className="bv bv--festa" data-festa/);
  assert.match(passo4, /<MaquinaDoTime nome=\{team\.nome\} logo=\{logoDaFesta\} idNome="festa-nome" \/>/);
  assert.match(passo4, /data-cidade-do-time/);
  assert.match(passo4, /\{bairroDoTime \? `\$\{bairroDoTime\} · ` : ''\}\{cidadeDoTime\}/);
  assert.match(passo4, /Seu time está no ar!/);
  assert.match(passo4, /Chame a galera pelo link\. Ele vale 30 dias\./);
  assert.equal((passo4.match(/!/g) || []).length - (passo4.match(/!==|!\w|!\(|!\/|!\[/g) || []).length, 1, 'um ponto de exclamação só na tela');
  for (const velho of ['Chame o seu time', 'Você pode pular este passo', 'Logo do time enviado', 'data-aviso-cidade="ok"', 'data-aviso-bairro="ok"', 'Encontramos']) {
    assert.ok(!passo4.includes(velho), `saiu do passo 4: ${velho}`);
  }
  assert.match(passo4, /data-aviso-cidade="aviso"/, 'o aviso fica só quando deu errado');
  assert.match(passo4, /data-aviso-logo/);
  assert.match(criar, /setCidadeDoTime\(sobreCidade\?\.tipo === 'ok' \? geo\.nomeOficial : cidade\.trim\(\)\);/);
  assert.match(criar, /const logoDaFesta = logoEnviado \? logoPrevia : null;/);
  assert.match(ler('src/styles/boas-vindas.css'), /\.bv\.bv--festa\{/);
});

test('29P · "Ir para o time" não reabre a festa: sem criouAgora no app; a variante do criador saiu das boas-vindas', () => {
  assert.doesNotMatch(ler('src/pages/CriarEquipa.jsx'), /criouAgora/);
  const equipa = ler('src/pages/Equipa.jsx');
  assert.doesNotMatch(equipa, /criouAgora|'criador'/);
  assert.match(equipa, /const varianteBoasVindas = !team \|\| team\.role === 'admin'\s*\? null/);
  const bv = ler('src/components/BoasVindas.jsx');
  assert.match(bv, /export function MaquinaDoTime\(\{ nome, logo = null, idNome = 'bv-nome' \}\)/);
  assert.doesNotMatch(bv, /FRASES|criador: '/);
  assert.match(bv, /const FRASE_CONVIDADO = 'Aqui a gente confirma presença, sorteia os times, guarda o ranking e faz sua figurinha\.';/);
  assert.match(bv, /<MaquinaDoTime nome=\{nome\} logo=\{logo\} \/>/, 'as boas-vindas do convidado usam a mesma máquina');
});

test('29P · o Explorar virou "Radar de peladas" em tudo o que aparece na tela (a rota continua /explorar)', () => {
  assert.match(ler('src/pages/Explorar.jsx'), /<Topbar hud="RADAR DE PELADAS" back="\/home" \/>/);
  assert.match(ler('src/components/RouteTitle.jsx'), /\['\/explorar', 'Radar de peladas'\]/);
  const inicio = ler('src/pages/Inicio.jsx');
  // 29Q: o chip da fila saiu; o Radar de peladas vive num cartão (components/AtalhosDoInicio.jsx), com o mesmo ícone e o mesmo nome.
  // 30B: + Users, o ícone do "Ver times" (times montados à mão). O Radar continua fora do Início.
  assert.match(inicio, /import \{ RefreshCw, Trophy, Users \} from 'lucide-react';/);
  assert.doesNotMatch(inicio, /<Radar /, 'o ícone do Radar já não vive no Início: foi para o cartão');
  const cartoes = ler('src/components/AtalhosDoInicio.jsx');
  assert.match(cartoes, /import \{ CirclePlus, Radar \} from 'lucide-react';/);
  assert.match(cartoes, /Icone=\{Radar\}[^>]*rotulo="Radar de peladas"/, 'o cartão do Início: ícone Radar + o nome');
  assert.match(inicio, /Sem drama: há mais times no "Radar de peladas"\./);
  assert.match(inicio, /<Link to="\/explorar" className="btn btn--purple hud-corners">\s*Radar de peladas/);
  assert.match(ler('src/components/EstadoSemTime.jsx'), /Radar de peladas/);
  assert.match(ler('src/pages/Convite.jsx'), /Procurar times no Radar de peladas/);
  const painel = ler('src/pages/AdminPanel.jsx');
  assert.match(painel, /privado: 'Só entra quem receber o seu link de convite\. Não aparece no "Radar de peladas"\.'/);
  assert.match(painel, /publico_aprovacao: 'Quem achar o time no "Radar de peladas" pede para entrar\. Você aceita ou não\.'/);
  assert.match(painel, /publico_aberto: 'Qualquer um que achar o time no "Radar de peladas" entra na hora\.'/);
  assert.match(ler('src/App.jsx'), /\['\/explorar', Explorar\]/, 'a rota não muda');

  // Varredura: nenhuma linha de tela (fora comentários, imports e identificadores) ainda escreve "Explorar" para a pessoa.
  const sobras = [];
  const andar = (dir) => {
    for (const nome of fs.readdirSync(dir)) {
      const caminho = path.join(dir, nome);
      if (fs.statSync(caminho).isDirectory()) andar(caminho);
      else if (/\.jsx?$/.test(nome)) {
        ler(path.relative(RAIZ, caminho)).split('\n').forEach((linha, i) => {
          if (/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(linha)) return;
          if (!/Explorar/.test(linha)) return;
          if (/import |lazyComRetry|function Explorar|<Explorar|Explorar\]|\/\/ |\/\* /.test(linha)) return;
          sobras.push(`${path.relative(RAIZ, caminho)}:${i + 1}: ${linha.trim().slice(0, 90)}`);
        });
      }
    }
  };
  andar(path.join(RAIZ, 'src'));
  assert.deepEqual(sobras, [], sobras.join('\n'));
});
