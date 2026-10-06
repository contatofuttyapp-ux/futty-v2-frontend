// Futty v2.0 — Política de Privacidade (/privacidade). Página legal, PT-BR, sem login. Sem aviso de
// revisão jurídica, sem nome de pessoa física (identificação do responsável mediante solicitação;
// trocar por razão social + CNPJ quando a empresa for constituída), sem travessões. Seções:
// transferência internacional, backups, registros de moderação e alterações da política.
// Infraestrutura real (Cloud Run São Paulo + Cloudflare); Resend, Sentry e RevenueCat na lista de
// fornecedores; exclusão de conta pelo próprio app (Perfil → Conta) como via principal. Diagnóstico de
// desempenho anônimo (telemetria de velocidade, sem vínculo com a identidade).
// Compras no app: a loja (Apple / Google) processa o pagamento e o Futty nunca vê o cartão; guardamos
// só transação, produto, valor, moeda e data. A CLAUSULA_PAGAMENTO_FUTURA (o item Apple / Google) fica
// na seção 3.
// O Futty é para maiores de 18 anos: a seção 5 é "Idade mínima" (o número vem de IDADE_MINIMA,
// utils/idade.js) e a idade mínima é dita no cadastro.
import { Link } from 'react-router-dom';
import { IDADE_MINIMA } from '../utils/idade';
import '../styles/app.css';

const H = { fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, color: '#fff' };
const h2 = { ...H, fontSize: 18, margin: '24px 0 6px' };
const p = { fontSize: 15, lineHeight: 1.6, color: 'var(--text-dim)', margin: 0 };
const ul = { ...p, margin: '4px 0 0', paddingLeft: 20, display: 'grid', gap: 4 };
const strong = { color: '#f0c94a', fontWeight: 700 };

const ULTIMA_ATUALIZACAO = '1 de outubro de 2026 (v6)';
const CONTATO = 'contato@futtyapp.com';

export default function Privacidade() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 48px' }}>
        <Link to="/" style={{ fontSize: 14, color: 'var(--text-dim)' }}>← Voltar</Link>

        <h1 style={{ ...H, fontSize: 30, margin: '16px 0 4px' }}>Política de Privacidade</h1>
        <p style={{ ...p, fontSize: 13 }}>Futty. Última atualização: {ULTIMA_ATUALIZACAO}</p>

        <h2 style={h2}>Responsável pelo tratamento</h2>
        <p style={p}>
          O responsável pelo tratamento dos dados é o operador do Futty. Para qualquer
          assunto de privacidade, incluindo a identificação completa do responsável, escreva
          para <a href={`mailto:${CONTATO}`} style={{ color: 'var(--neon)' }}>{CONTATO}</a>.
        </p>

        <h2 style={h2}>1. Dados que coletamos</h2>
        <ul style={ul}>
          <li>Nome, nome de jogador e e-mail (no cadastro)</li>
          <li>Data de nascimento (para confirmar que você tem {IDADE_MINIMA} anos ou mais)</li>
          <li>Foto de perfil, usada para gerar seu card com inteligência artificial</li>
          <li>Dados de jogo: presenças confirmadas, votos recebidos, posição em campo, resultados</li>
          <li>Conteúdo que você publica na Resenha (posts, comentários, fotos)</li>
          <li>Localização aproximada <em>do seu time</em>, nunca a sua (ver seção 4)</li>
          <li>Dados de desempenho do app, não vinculados à sua identidade (ver abaixo)</li>
          <li>Dados das compras feitas no app: produto, valor, moeda, data, loja e o identificador da transação (nunca dados de cartão)</li>
        </ul>
        <p style={{ ...p, marginTop: 6 }}>
          <span style={strong}>Diagnóstico de desempenho:</span> para saber se o app está rápido no
          aparelho de quem usa, ele envia quanto cada tela levou para abrir e quanto cada chamada ao
          servidor demorou, com a versão do app, o sistema (iOS, Android ou web), o tipo de rede
          quando o aparelho informa e uma faixa genérica de aparelho. São dados{' '}
          <span style={strong}>não vinculados à sua identidade</span>: não levam nome, e-mail, conta,
          endereço IP nem identificador do aparelho, e são apagados depois de 30 dias.
        </p>

        <h2 style={h2}>2. Como usamos os dados</h2>
        <ul style={ul}>
          <li>Criar e gerenciar seu perfil de jogador e o card que aparece para o seu time</li>
          <li>Gerar seu card personalizado por inteligência artificial</li>
          <li>Mostrar estatísticas, ranking e histórico do seu grupo</li>
          <li>Enviar notificações sobre jogos, sorteios e votações</li>
          <li>Triagem de denúncias de conteúdo, para manter o app seguro</li>
          <li>Creditar as compras feitas no app e atender pedidos de reembolso</li>
        </ul>
        <p style={{ ...p, marginTop: 6 }}>
          <span style={strong}>Base legal:</span> o tratamento se baseia no seu consentimento,
          dado no momento do cadastro, que pode ser revogado a qualquer momento pedindo a
          eliminação da conta. Para as compras, a base legal é a execução do contrato de compra
          que você fez. Seguimos a LGPD (Lei Geral de Proteção de Dados, Brasil). Os mesmos direitos valem para quem usa o Futty em Portugal e em qualquer outro país.
        </p>

        <h2 style={h2}>3. Com quem compartilhamos</h2>
        <p style={p}>
          Não vendemos os seus dados a ninguém. Compartilhamos apenas com fornecedores
          técnicos necessários ao funcionamento do serviço, e cada um vê só o mínimo necessário:
        </p>
        <ul style={ul}>
          <li><span style={strong}>Supabase</span>: banco de dados, autenticação e armazenamento de arquivos (fotos ficam em bucket privado)</li>
          <li><span style={strong}>Google Cloud</span> (Cloud Run, São Paulo): hospedagem do motor do app</li>
          <li><span style={strong}>Cloudflare</span>: entrega das telas do app e proteção de rede</li>
          <li><span style={strong}>Resend</span>: envio dos e-mails de conta (confirmação, redefinição de senha), só vê o seu e-mail</li>
          <li><span style={strong}>Sentry</span>: registro de erros técnicos, sem dados pessoais além do id da conta</li>
          <li><span style={strong}>fal.ai</span>: recebe só a foto enviada no momento de gerar o card, não vê o resto do seu perfil</li>
          <li><span style={strong}>Anthropic</span>: recebe só o conteúdo denunciado, para triagem automática, sem a sua identidade</li>
          <li><span style={strong}>Apple / Google</span>: processam os pagamentos na App Store e no Google Play; o cartão e os dados de cobrança ficam com a loja, e o Futty só recebe a confirmação da compra</li>
          <li><span style={strong}>RevenueCat</span>: confirma para o Futty as compras feitas nas lojas; recebe o identificador da sua conta no Futty, os dados da compra, o time a que o pacote se destina e os dados técnicos do aparelho necessários para confirmar a compra, nunca o cartão</li>
        </ul>
        <p style={{ ...p, marginTop: 6 }}>
          <span style={strong}>Pagamentos:</span> o pagamento é feito na App Store ou no Google
          Play, e o Futty nunca vê o seu cartão. De cada compra guardamos só o identificador da
          transação, o produto, o valor, a moeda e a data, para creditá-la, atender reembolsos e
          cumprir obrigações legais.
        </p>

        <h2 style={h2}>4. Localização, a regra clara</h2>
        <p style={p}>
          A <span style={strong}>sua posição pessoal nunca é enviada nem guardada</span> pelo
          Futty. Ela vive só no seu navegador, durante a busca por times, e desaparece
          quando você sai da tela. Existe apenas a localização <span style={strong}>do time</span>, aproximada (cerca de 1 km), que o administrador escolhe mostrar
          publicamente para facilitar a descoberta. Times privados nunca aparecem na busca.
        </p>

        <h2 style={h2}>5. Idade mínima</h2>
        <p style={p}>
          Para usar o Futty você precisa ter {IDADE_MINIMA} anos ou mais. Se descobrirmos uma
          conta de menor de {IDADE_MINIMA}, ela é apagada. A data de nascimento é pedida no
          cadastro (por e-mail, Google ou Apple) e, abaixo dessa idade, a conta não é criada:
          nada fica guardado. A idade é calculada a partir dessa data e conferida também em
          dois lugares: nas páginas públicas de sorteio (sem entrar na conta) o rosto só aparece
          para quem confirmou a idade e deixou o rosto liberado no Perfil, e publicidade
          classificada como 18+ só é mostrada a quem tem {IDADE_MINIMA} anos ou mais pela data
          (sem data, nunca).
        </p>

        <h2 style={h2}>6. Onde os dados ficam</h2>
        <p style={p}>
          O banco de dados e o motor do Futty ficam no Brasil, em São Paulo. Os demais
          fornecedores listados na seção 3 podem processar dados em servidores fora do
          Brasil (por exemplo, nos Estados Unidos e na Europa). Nesses casos, a transferência
          acontece com as salvaguardas contratuais desses fornecedores, que atendem aos
          padrões internacionais de proteção de dados.
        </p>

        <h2 style={h2}>7. Retenção e eliminação: apagar apaga</h2>
        <p style={p}>
          Guardamos seus dados enquanto a sua conta estiver ativa. A forma mais rápida de
          apagar é pelo próprio app: <span style={strong}>Perfil → Conta → Excluir conta</span>,
          exclusão imediata. Veja o passo a passo em{' '}
          <Link to="/excluir-conta" style={{ color: 'var(--neon)' }}>Excluir conta</Link>. Se
          você não conseguir entrar no app, escreva para{' '}
          <a href={`mailto:${CONTATO}`} style={{ color: 'var(--neon)' }}>{CONTATO}</a>, com
          prazo de até 7 dias para o pedido ser atendido. Quando você apaga um post ou uma
          foto, o arquivo é removido do armazenamento, sem ficar órfão em outro lugar.
        </p>
        <ul style={{ ...ul, marginTop: 6 }}>
          <li>Cópias de segurança podem reter dados apagados por até 30 dias antes de serem sobrescritas.</li>
          <li>Registros de moderação e denúncias podem ser mantidos mesmo após a eliminação da conta, pelo tempo necessário para segurança e cumprimento de obrigações legais.</li>
          <li>Registros de compras (identificador da transação, produto, valor, moeda e data) podem ser mantidos após a eliminação da conta, sem os seus dados de perfil, pelo prazo exigido pela legislação fiscal.</li>
        </ul>

        <h2 style={h2}>8. Cookies e armazenamento local</h2>
        <p style={p}>
          Usamos <code>localStorage</code> para manter sua sessão e preferências. Não usamos
          cookies de rastreamento de terceiros. Você pode gerenciar isso nas configurações do
          seu navegador.
        </p>

        <h2 style={h2}>9. Segurança</h2>
        <p style={p}>
          Seus dados ficam em servidores com acesso controlado. Senhas são criptografadas e
          nunca guardadas em texto simples. Imagens passam por um filtro automático antes de
          serem publicadas, para bloquear conteúdo explícito.
        </p>

        <h2 style={h2}>10. Os seus direitos</h2>
        <p style={p}>
          Você tem direito a acessar os seus dados, corrigir informações incorretas, solicitar
          a eliminação completa, se opor ao tratamento e pedir a portabilidade. Para exercer
          qualquer um desses direitos, escreva para{' '}
          <a href={`mailto:${CONTATO}`} style={{ color: 'var(--neon)' }}>{CONTATO}</a>. Você
          também pode apresentar reclamação à ANPD, a autoridade brasileira de proteção de dados.
        </p>

        <h2 style={h2}>11. Alterações desta política</h2>
        <p style={p}>
          Esta política pode ser atualizada. Mudanças significativas serão avisadas no app,
          com a data de atualização sempre indicada no topo desta página.
        </p>

        <h2 style={h2}>12. Contato</h2>
        <p style={p}><a href={`mailto:${CONTATO}`} style={{ color: 'var(--neon)' }}>{CONTATO}</a></p>

        <ul style={{ ...ul, marginTop: 20 }}>
          <li>Veja também os <Link to="/termos" style={{ color: 'var(--neon)' }}>Termos de Uso</Link>.</li>
          <li>Quer apagar a sua conta? Veja o passo a passo em <Link to="/excluir-conta" style={{ color: 'var(--neon)' }}>Excluir conta</Link>.</li>
        </ul>
      </div>
    </div>
  );
}
