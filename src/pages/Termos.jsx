// Futty v2.0 — Termos de Uso (/termos). Página legal, PT-BR, sem login.
// Versão final para uso (31-jul): sem aviso de revisão jurídica, sem travessões,
// com as cláusulas de proteção novas (fotos de terceiros, uso aceitável, créditos,
// limitação de responsabilidade, lei e foro).
// 25-set: §7 sem cobrança por enquanto; o texto anterior fica em CLAUSULA_PAGAMENTO_FUTURA.
// 26-set (Pagamentos P2): §7 volta a falar de compras. A CLAUSULA_PAGAMENTO_FUTURA, revista para os
// produtos de hoje (compras avulsas e consumíveis pela App Store / Google Play, sem assinatura), entrou
// no lugar do "7. Cobrança" e saiu do comentário.
// 25-set (Rodada 28, LGPD art. 14): §2 diz como a idade mínima é conferida no cadastro.
import { Link } from 'react-router-dom';
import '../styles/app.css';

const H = { fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, color: '#fff' };
const h2 = { ...H, fontSize: 18, margin: '24px 0 6px' };
const p = { fontSize: 15, lineHeight: 1.6, color: 'var(--text-dim)', margin: 0 };
const ul = { ...p, margin: '4px 0 0', paddingLeft: 20, display: 'grid', gap: 4 };
const strong = { color: '#f0c94a', fontWeight: 700 };

const ULTIMA_ATUALIZACAO = '26 de setembro de 2026';
const CONTATO = 'contato@futtyapp.com';

export default function Termos() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 48px' }}>
        <Link to="/" style={{ fontSize: 14, color: 'var(--text-dim)' }}>← Voltar</Link>

        <h1 style={{ ...H, fontSize: 30, margin: '16px 0 4px' }}>Termos de Uso</h1>
        <p style={{ ...p, fontSize: 13 }}>Futty. Última atualização: {ULTIMA_ATUALIZACAO}</p>

        <h2 style={h2}>1. O que é o Futty</h2>
        <p style={p}>
          O Futty é uma plataforma para grupos de futebol amador: confirmar presença,
          sortear os times, votar nos companheiros de jogo, montar campeonatos e criar o
          seu card (figurinha) personalizado. Ao usar o Futty, você concorda com estes termos.
          Se não concordar, não use o serviço.
        </p>

        <h2 style={h2}>2. Elegibilidade</h2>
        <p style={p}>
          O Futty é para maiores de 13 anos: você precisa de pelo menos 13 anos para criar
          uma conta, e menores de 13 anos não podem usar o Futty. A data de nascimento é
          pedida no cadastro (por e-mail, Google ou Apple) e, abaixo dessa idade, a conta não
          é criada. Menores de idade contam com proteções específicas no app: o
          rosto aparece sempre em silhueta nas páginas públicas e publicidade classificada
          como 18+ nunca é exibida. Ao se cadastrar, você confirma que as informações
          fornecidas são verdadeiras. O Futty não verifica a veracidade dos dados.
        </p>

        <h2 style={h2}>3. Sua conta e sua responsabilidade</h2>
        <p style={p}>
          Você é responsável pelas informações que fornece e por manter sua conta segura.
          O Futty organiza a parte digital do seu grupo. Os jogos em si acontecem por conta
          e risco dos participantes: o Futty não se responsabiliza por lesões, acidentes,
          disputas, desentendimentos ou conflitos entre membros de qualquer time.
        </p>

        <h2 style={h2}>4. O seu card Futty</h2>
        <p style={p}>
          O seu card é seu. Você pode fazer print, baixar, compartilhar nas redes sociais,
          mandar pelo WhatsApp ou publicar onde quiser, sem restrição. Esse é o objetivo:
          mostrar ao mundo que você faz parte do seu time.
        </p>
        <p style={{ ...p, marginTop: 6 }}>
          Quando dizemos que o card é seu, falamos do arquivo de imagem: uma vez baixado, ele
          é seu para sempre e continua seu mesmo que o Futty deixe de existir. O que depende
          do serviço estar ativo é o que acontece dentro do app: gerar novos cards, trocar
          uniformes e fundos, e usar gerações.
        </p>
        <p style={{ ...p, marginTop: 6 }}>
          O card é uma representação artística criada por inteligência artificial a partir da
          sua foto e pode não reproduzir fielmente a sua aparência. Se uma geração sair com
          defeito evidente, ela não gasta uma geração sua: o Futty pede outra foto em vez de
          entregar um resultado ruim. Ao enviar uma foto, você confirma que tem o direito de
          usá-la e autoriza o seu uso para a criação do card. Você recebe uma licença de uso
          pessoal do seu card, mas não adquire propriedade intelectual sobre a técnica de geração.
        </p>

        <h2 style={h2}>5. Fotos de outras pessoas</h2>
        <p style={p}>
          Ao enviar qualquer foto em que outras pessoas apareçam, você declara que elas
          autorizaram o uso da imagem. Fotos em que apareçam menores de idade só podem ser
          enviadas com o consentimento do responsável legal. A responsabilidade por fotos
          enviadas sem autorização é de quem as enviou.
        </p>

        <h2 style={h2}>6. Conteúdo publicado por você</h2>
        <p style={p}>
          Você é o único responsável pelo conteúdo que publica na Resenha (posts, comentários,
          fotos). O Futty não revisa o conteúdo antes da publicação, mas pode remover qualquer
          conteúdo que viole estes termos, a qualquer momento. É proibido: linguagem ofensiva,
          racismo, discriminação, assédio, ameaças, conteúdo sexual e difamação. A violação
          pode levar à suspensão ou ao encerramento da conta.
        </p>
        <p style={{ ...p, marginTop: 6 }}>
          Toda imagem enviada passa por um filtro automático antes de ser publicada, para
          bloquear conteúdo explícito. Você também pode <span style={strong}>bloquear</span>{' '}
          qualquer outro jogador: ao bloquear, vocês deixam de ver o conteúdo um do outro na
          Resenha, e a outra pessoa não é avisada.
        </p>

        <h2 style={h2}>7. Compras dentro do app</h2>
        <p style={p}>
          Usar o Futty é grátis, e o seu card com a foto também. Algumas coisas são vendidas
          à parte, dentro do app:
        </p>
        <ul style={ul}>
          <li><span style={strong}>Minha Figurinha</span>: 10 gerações de figurinha para você, no uniforme que escolher.</li>
          <li><span style={strong}>Figurinhas do time</span>: 2 gerações por jogador, para até 25 jogadores do time, todos no uniforme escolhido pelo dono do time. Só o dono do time compra.</li>
          <li><span style={strong}>Manto próprio</span>: o uniforme do seu time nas figurinhas, desenhado por quem faz o Futty depois da compra, a partir das cores e do escudo do time, e conferido antes de valer. Exige as Figurinhas do time.</li>
        </ul>
        <p style={{ ...p, marginTop: 6 }}>
          São compras avulsas, pagas uma vez só: não há assinatura nem cobrança recorrente. O
          pagamento é feito exclusivamente pela App Store (Apple) ou pelo Google Play (Google),
          na sua conta da loja, e o preço é o que a loja mostra no momento da compra, na moeda
          da sua conta. O Futty não recebe nem guarda dados do seu cartão. Se você tem menos de
          18 anos, peça autorização ao seu responsável antes de comprar.
        </p>
        <p style={{ ...p, marginTop: 6 }}>
          As gerações são itens consumíveis: cada geração usada é gasta, e uma geração que sai
          com defeito evidente não é descontada (ver a seção 4). Gerações não usadas não viram
          dinheiro, não podem ser transferidas para outra conta e continuam na sua conta enquanto
          o serviço estiver ativo. As gerações das Figurinhas do time pertencem ao time e valem
          para os jogadores dele.
        </p>
        <p style={{ ...p, marginTop: 6 }}>
          Reembolsos são pedidos à loja em que a compra foi feita, segundo a política dela.
          Quando a loja reembolsa uma compra, o que ela liberou deixa de valer: o seu saldo perde
          as gerações daquela compra (sem ficar negativo) e o pacote do time comprado nela é
          desativado. As figurinhas já geradas continuam suas. A opção{' '}
          <span style={strong}>Restaurar compras</span> recupera uma compra paga que ainda não
          tenha chegado à sua conta; o que já foi creditado não é creditado de novo. Os preços
          podem mudar, sem afetar as compras já feitas. Nada disto afasta os seus direitos de
          consumidor (ver a seção 13).
        </p>

        <h2 style={h2}>8. Publicidade</h2>
        <p style={p}>
          O Futty pode mostrar publicidade de parceiros, sempre identificada como tal.
          Anúncios classificados como 18+ nunca são exibidos a contas de menores de idade.
          Essa regra nunca falha a favor do anúncio.
        </p>

        <h2 style={h2}>9. Uso aceitável</h2>
        <p style={p}>
          É proibido: tentar burlar limites do serviço (incluindo limites de geração),
          automatizar o uso por robôs ou scripts, sobrecarregar a infraestrutura, acessar dados de outras pessoas sem autorização e fazer engenharia reversa do app. Contas
          envolvidas nessas práticas podem ser suspensas ou encerradas sem aviso.
        </p>

        <h2 style={h2}>10. Disponibilidade e encerramento do serviço</h2>
        <p style={p}>
          O serviço pode ser interrompido para manutenção, atualizações ou por razões
          técnicas, sem aviso prévio. Se o Futty for descontinuado de forma definitiva, você será avisado com antecedência razoável.
        </p>

        <h2 style={h2}>11. Encerramento de conta</h2>
        <p style={p}>
          Podemos suspender ou encerrar contas que violem estes termos. Você pode pedir a
          eliminação da sua conta a qualquer momento, conforme a Política de Privacidade.
        </p>

        <h2 style={h2}>12. Alterações aos termos</h2>
        <p style={p}>
          O Futty pode atualizar estes termos. Mudanças significativas serão avisadas no app.
          O uso continuado após o aviso vale como concordância com a nova versão.
        </p>

        <h2 style={h2}>13. Limitação de responsabilidade</h2>
        <p style={p}>
          Na máxima medida permitida pela lei, o Futty é fornecido no estado em que se
          encontra, sem garantias de disponibilidade contínua ou de adequação a um fim
          específico. Nada nestes termos afasta direitos que a legislação de proteção ao
          consumidor garanta a você.
        </p>

        <h2 style={h2}>14. Lei aplicável</h2>
        <p style={p}>
          Estes termos seguem a legislação brasileira. Em caso de disputa, as partes se
          comprometem a tentar uma solução amigável antes de recorrer à Justiça. Para quem usa o Futty como consumidor, fica eleito o foro do seu domicílio.
        </p>

        <h2 style={h2}>15. Propriedade intelectual</h2>
        <p style={p}>
          O nome Futty, o design, os logotipos e todo o código são propriedade do Futty. É
          proibida a cópia, reprodução ou distribuição sem autorização por escrito.
        </p>

        <h2 style={h2}>16. Contato</h2>
        <p style={p}><a href={`mailto:${CONTATO}`} style={{ color: 'var(--neon)' }}>{CONTATO}</a></p>

        <ul style={{ ...ul, marginTop: 20 }}>
          <li>Veja também a <Link to="/privacidade" style={{ color: 'var(--neon)' }}>Política de Privacidade</Link>.</li>
        </ul>
      </div>
    </div>
  );
}
