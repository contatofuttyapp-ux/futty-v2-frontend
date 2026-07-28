// Futty v2.0 — Termos de Uso (/termos). Página legal, PT-BR, sem login. Base: os
// termos da v1 (FUT App), atualizados ao estado real do app v2 — sem Stripe (IAP das
// lojas), com moderação de conteúdo (denúncias + bloqueio entre jogadores), regras de
// menores. Documento em revisão jurídica (ver rodapé).
import { Link } from 'react-router-dom';
import '../styles/app.css';

const H = { fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, color: '#fff' };
const h2 = { ...H, fontSize: 18, margin: '24px 0 6px' };
const p = { fontSize: 15, lineHeight: 1.6, color: 'var(--text-dim)', margin: 0 };
const ul = { ...p, margin: '4px 0 0', paddingLeft: 20, display: 'grid', gap: 4 };
const strong = { color: '#f0c94a', fontWeight: 700 };

const ULTIMA_ATUALIZACAO = '28 de julho de 2026';
const CONTATO = 'contatofuttyapp@gmail.com';

export default function Termos() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 48px' }}>
        <Link to="/" style={{ fontSize: 14, color: 'var(--text-dim)' }}>← Voltar</Link>

        <h1 style={{ ...H, fontSize: 30, margin: '16px 0 4px' }}>Termos de Uso</h1>
        <p style={{ ...p, fontSize: 13 }}>Futty — última atualização: {ULTIMA_ATUALIZACAO}</p>

        <h2 style={h2}>1. O que é o Futty</h2>
        <p style={p}>
          O Futty é uma plataforma para grupos de futebol amador: confirmar presença,
          sortear os times, votar nos companheiros de jogo, montar campeonatos e criar o
          seu card (figurinha) personalizado. Ao usar o Futty, você concorda com estes termos.
        </p>

        <h2 style={h2}>2. Elegibilidade</h2>
        <p style={p}>
          Você precisa de pelo menos 13 anos para usar o Futty. Menores de idade contam com
          proteções específicas no app (rosto sempre em silhueta nas páginas públicas,
          publicidade 18+ nunca exibida). Ao se cadastrar, você confirma que as informações
          fornecidas são verdadeiras — o Futty não verifica a veracidade dos dados.
        </p>

        <h2 style={h2}>3. Responsabilidade do usuário</h2>
        <p style={p}>
          Você é responsável por todas as informações que fornece e por manter sua conta
          seguro. O Futty não é responsável por disputas, desentendimentos ou conflitos entre
          membros de qualquer time, nem por atividades físicas realizadas durante os jogos.
        </p>

        <h2 style={h2}>4. O seu card Futty</h2>
        <p style={p}>
          O seu card é seu. Você pode fazer print, compartilhar nas redes sociais, mandar pelo
          WhatsApp ou publicar em qualquer lugar, sem restrição — esse é o objetivo: mostrar ao
          mundo que você faz parte do seu time.
        </p>

        <h2 style={h2}>5. Conteúdo gerado por você</h2>
        <p style={p}>
          Você é o único responsável pelo conteúdo que publica na Resenha (posts, comentários,
          fotos). O Futty não revisa o conteúdo antes da publicação, mas se reserva o direito
          de remover qualquer conteúdo que viole estes termos, a qualquer momento. É proibido:
          linguagem ofensiva, racismo, discriminação, assédio, ameaças, conteúdo sexual e
          difamação. A violação pode levar à suspensão da conta.
        </p>
        <p style={{ ...p, marginTop: 6 }}>
          Toda imagem enviada passa por um filtro automático antes de ser publicada, para
          bloquear conteúdo explícito. Você também pode <span style={strong}>bloquear</span>{' '}
          qualquer outro jogador — ao bloquear, vocês deixam de ver o conteúdo um do outro na
          Resenha, e a outra pessoa não é avisada.
        </p>

        <h2 style={h2}>6. Avatares e imagem</h2>
        <p style={p}>
          Os avatares gerados pela plataforma a partir das suas fotos são representações
          artísticas criadas por inteligência artificial e podem não reproduzir fielmente a sua
          aparência. Ao enviar uma foto, você confirma que tem o direito de usá-la e autoriza
          sua utilização para a criação do avatar. Você recebe uma licença de uso pessoal do seu
          avatar, mas não detém a propriedade intelectual sobre a técnica de geração.
        </p>

        <h2 style={h2}>7. Planos e pagamento</h2>
        <p style={p}>
          O Futty tem planos Free, Pro e Elite. Pagamentos são processados exclusivamente pela
          loja de aplicativos (App Store ou Google Play) — o Futty não processa cartões
          diretamente. Cancelamentos e reembolsos seguem a política da loja usada.
        </p>

        <h2 style={h2}>8. Publicidade</h2>
        <p style={p}>
          O Futty pode mostrar publicidade de parceiros. Anúncios classificados como 18+ nunca
          são exibidos a contas de menores de idade — essa regra nunca falha a favor do anúncio.
        </p>

        <h2 style={h2}>9. Disponibilidade do serviço</h2>
        <p style={p}>
          O serviço pode ser interrompido para manutenção, atualizações ou por razões técnicas,
          sem aviso prévio.
        </p>

        <h2 style={h2}>10. Encerramento de conta</h2>
        <p style={p}>
          Podemos suspender ou encerrar contas que violem estes termos. Você pode pedir a
          eliminação da sua conta a qualquer momento — veja a Política de Privacidade.
        </p>

        <h2 style={h2}>11. Alterações aos termos</h2>
        <p style={p}>O Futty pode atualizar estes termos. Mudanças significativas serão avisadas no app.</p>

        <h2 style={h2}>12. Resolução de conflitos</h2>
        <p style={p}>
          Em caso de disputa entre você e o Futty, as partes se comprometem a tentar resolver o
          conflito de forma amigável antes de recorrer à Justiça.
        </p>

        <h2 style={h2}>13. Propriedade intelectual</h2>
        <p style={p}>
          O nome Futty, o design, os logotipos e todo o código são propriedade do Futty. É
          proibida a cópia, reprodução ou distribuição sem autorização por escrito.
        </p>

        <h2 style={h2}>14. Contato</h2>
        <p style={p}><a href={`mailto:${CONTATO}`} style={{ color: 'var(--neon)' }}>{CONTATO}</a></p>

        <ul style={{ ...ul, marginTop: 20 }}>
          <li>Veja também a <Link to="/privacidade" style={{ color: 'var(--neon)' }}>Política de Privacidade</Link>.</li>
        </ul>

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
