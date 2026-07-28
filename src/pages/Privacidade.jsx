// Futty v2.0 — Política de Privacidade (/privacidade). Página legal, PT-BR, sem
// login. Base: a política da v1 (FUT App), atualizada ao estado real do app v2 —
// operadores atuais (Supabase/Railway/Vercel/fal.ai/Anthropic/lojas), regras de
// menores, geolocalização de equipas, "apagar apaga". Documento em revisão jurídica
// (ver rodapé) — o dono preenche o nome legal do responsável antes de publicar de vez.
import { Link } from 'react-router-dom';
import '../styles/app.css';

const H = { fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, color: '#fff' };
const h2 = { ...H, fontSize: 18, margin: '24px 0 6px' };
const p = { fontSize: 15, lineHeight: 1.6, color: 'var(--text-dim)', margin: 0 };
const ul = { ...p, margin: '4px 0 0', paddingLeft: 20, display: 'grid', gap: 4 };
const strong = { color: '#f0c94a', fontWeight: 700 };

const ULTIMA_ATUALIZACAO = '28 de julho de 2026';
const RESPONSAVEL_NOME = '[NOME DO DONO — preencher]'; // placeholder p/ o dono completar
const CONTATO = 'contatofuttyapp@gmail.com';

export default function Privacidade() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 48px' }}>
        <Link to="/" style={{ fontSize: 14, color: 'var(--text-dim)' }}>← Voltar</Link>

        <h1 style={{ ...H, fontSize: 30, margin: '16px 0 4px' }}>Política de Privacidade</h1>
        <p style={{ ...p, fontSize: 13 }}>Futty — última atualização: {ULTIMA_ATUALIZACAO}</p>

        <h2 style={h2}>Responsável pelo tratamento</h2>
        <p style={p}>
          <span style={strong}>{RESPONSAVEL_NOME}</span>, responsável pelo Futty, é quem decide o
          quê e por que os seus dados são tratados. Contato para qualquer assunto de
          privacidade: <a href={`mailto:${CONTATO}`} style={{ color: 'var(--neon)' }}>{CONTATO}</a>.
        </p>

        <h2 style={h2}>1. Dados que coletamos</h2>
        <ul style={ul}>
          <li>Nome, nome de jogador e e-mail (no cadastro)</li>
          <li>Data de nascimento (para confirmar idade e aplicar as regras de menores)</li>
          <li>Foto de perfil, usada para gerar seu avatar/card com inteligência artificial</li>
          <li>Dados de jogo: presenças confirmadas, votos recebidos, posição em campo, resultados</li>
          <li>Conteúdo que você publica na Resenha (posts, comentários, fotos)</li>
          <li>Localização <em>aproximada da sua equipe</em> (nunca a sua — ver seção 4)</li>
        </ul>

        <h2 style={h2}>2. Como usamos os dados</h2>
        <ul style={ul}>
          <li>Criar e gerenciar seu perfil de jogador e o card que aparece para o seu time</li>
          <li>Gerar seu avatar personalizado por inteligência artificial (fal.ai)</li>
          <li>Mostrar estatísticas, ranking e histórico do seu grupo</li>
          <li>Enviar notificações sobre jogos, sorteios e votações</li>
          <li>Triagem de denúncias de conteúdo, para manter o app seguro</li>
        </ul>
        <p style={{ ...p, marginTop: 6 }}>
          <span style={strong}>Base legal:</span> o tratamento se baseia no seu consentimento,
          dado no momento do cadastro, que pode ser revogado a qualquer momento pedindo a
          eliminação da conta. Seguimos a LGPD (Lei Geral de Proteção de Dados, Brasil); os
          mesmos direitos valem para usuários em Portugal e em qualquer outro país.
        </p>

        <h2 style={h2}>3. Com quem compartilhamos</h2>
        <p style={p}>Não vendemos os seus dados a ninguém. Compartilhamos só com fornecedores técnicos necessários ao funcionamento do serviço, cada um vendo só o mínimo necessário:</p>
        <ul style={ul}>
          <li><span style={strong}>Supabase</span> — banco de dados, autenticação e armazenamento de arquivos (fotos ficam em bucket privado)</li>
          <li><span style={strong}>Railway / Vercel</span> — hospedagem do backend e do app</li>
          <li><span style={strong}>fal.ai</span> — só a foto enviada no momento de gerar o avatar; não vê o resto do seu perfil</li>
          <li><span style={strong}>Anthropic</span> — só o conteúdo denunciado, para triagem automática; não vê sua identidade nem o resto do app</li>
          <li><span style={strong}>Apple / Google</span> — pagamento da assinatura via loja (IAP); o cartão fica com a loja, o Futty só recebe a confirmação do plano</li>
        </ul>

        <h2 style={h2}>4. Localização — a regra clara</h2>
        <p style={p}>
          A <span style={strong}>sua posição pessoal nunca é enviada nem guardada</span> pelo
          Futty — ela vive só no seu navegador, durante a busca por peladas, e desaparece
          quando você sai da tela. Existe apenas a localização <span style={strong}>da
          equipe</span>, aproximada (~1 km), que o administrador escolhe mostrar publicamente
          para facilitar a descoberta. Equipes privadas nunca aparecem na busca.
        </p>

        <h2 style={h2}>5. Menores de idade</h2>
        <p style={p}>
          O Futty é usado por jogadores de todas as idades numa pelada. Para proteger quem é
          menor: o rosto de menores <span style={strong}>nunca aparece</span> em páginas
          públicas (sem login) — aparece sempre como silhueta. Publicidade classificada como
          18+ nunca é mostrada a uma conta menor de idade — a regra falha sempre para o lado
          seguro (fail-closed). A idade é calculada a partir da data de nascimento informada
          no cadastro.
        </p>

        <h2 style={h2}>6. Retenção e eliminação — "apagar apaga"</h2>
        <p style={p}>
          Guardamos seus dados enquanto a sua conta estiver ativa. Você pode pedir a eliminação
          da sua conta e dos seus dados pessoais a qualquer momento, através do e-mail{' '}
          <a href={`mailto:${CONTATO}`} style={{ color: 'var(--neon)' }}>{CONTATO}</a>. Quando
          você apaga um post ou uma foto, o arquivo é removido do armazenamento — não fica
          órfão em algum lugar.
        </p>

        <h2 style={h2}>7. Cookies e armazenamento local</h2>
        <p style={p}>
          Usamos <code>localStorage</code> para manter sua sessão e preferências (como o
          idioma). Não usamos cookies de rastreamento de terceiros. Você pode gerenciar
          isso nas configurações do seu navegador.
        </p>

        <h2 style={h2}>8. Segurança</h2>
        <p style={p}>
          Seus dados ficam em servidores com acesso controlado; senhas são criptografadas e
          nunca guardadas em texto simples. Imagens passam por um filtro automático antes de
          serem publicadas, para bloquear conteúdo explícito.
        </p>

        <h2 style={h2}>9. Os seus direitos</h2>
        <p style={p}>
          Você tem direito a acessar os seus dados, corrigir informações incorretas, solicitar
          a eliminação completa, se opor ao tratamento e pedir a portabilidade dos seus dados.
          Para exercer qualquer um desses direitos, escreva para{' '}
          <a href={`mailto:${CONTATO}`} style={{ color: 'var(--neon)' }}>{CONTATO}</a>.
        </p>

        <h2 style={h2}>10. Contato</h2>
        <p style={p}><a href={`mailto:${CONTATO}`} style={{ color: 'var(--neon)' }}>{CONTATO}</a></p>

        <div style={{ marginTop: 32, padding: '12px 14px', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 8 }}>
          <p style={{ ...p, fontSize: 12.5, color: 'rgba(255,255,255,0.5)' }}>
            Documento em <b>revisão jurídica</b> — o conteúdo reflete a prática real do app
            nesta data, mas ainda não foi validado por um advogado. Última atualização: {ULTIMA_ATUALIZACAO}.
          </p>
        </div>
      </div>
    </div>
  );
}
