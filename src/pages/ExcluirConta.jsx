// Futty v2.0 — Excluir conta (/excluir-conta). Página legal, PT-BR, sem login
// — é a URL que o formulário de segurança de dados do Google Play pede.
// Mesmo visual de /termos e /privacidade.
import { Link } from 'react-router-dom';
import '../styles/app.css';

const H = { fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, color: '#fff' };
const h2 = { ...H, fontSize: 18, margin: '24px 0 6px' };
const p = { fontSize: 15, lineHeight: 1.6, color: 'var(--text-dim)', margin: 0 };
const ol = { ...p, margin: '4px 0 0', paddingLeft: 20, display: 'grid', gap: 4 };
const strong = { color: '#f0c94a', fontWeight: 700 };

const CONTATO = 'contatofuttyapp@gmail.com';

export default function ExcluirConta() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 48px' }}>
        <Link to="/" style={{ fontSize: 14, color: 'var(--text-dim)' }}>← Voltar</Link>

        <h1 style={{ ...H, fontSize: 30, margin: '16px 0 4px' }}>Excluir conta</h1>
        <p style={{ ...p, fontSize: 13 }}>Como apagar a sua conta e os seus dados do Futty.</p>

        <h2 style={h2}>Pelo app (mais rápido)</h2>
        <ol style={ol}>
          <li>Abra o Futty e entre na sua conta</li>
          <li>Toque em <span style={strong}>Perfil</span></li>
          <li>Vá até a seção <span style={strong}>Conta</span> e toque em <span style={strong}>Excluir conta</span></li>
          <li>Digite <span style={strong}>EXCLUIR</span> para confirmar</li>
        </ol>
        <p style={{ ...p, marginTop: 10 }}>
          A exclusão apaga seu perfil, sua figurinha, suas fotos e suas participações. Times em
          que você é o único membro são apagados; os outros continuam existindo para o resto do
          grupo. Não dá para desfazer.
        </p>

        <h2 style={h2}>Não consegue entrar no app?</h2>
        <p style={p}>
          Peça a exclusão por e-mail para{' '}
          <a href={`mailto:${CONTATO}`} style={{ color: 'var(--neon)' }}>{CONTATO}</a>, informando
          o e-mail da sua conta. O pedido é atendido em até <span style={strong}>7 dias</span>.
        </p>

        <h2 style={h2}>O que é apagado</h2>
        <ul style={ol}>
          <li>Perfil, nome, foto e figurinha gerada por inteligência artificial</li>
          <li>Participações em jogos, votos e estatísticas</li>
          <li>Posts, comentários e fotos publicados na Resenha</li>
          <li>Times em que você é o único membro</li>
        </ul>
        <p style={{ ...p, marginTop: 6 }}>
          Times com outros membros continuam existindo para o resto do grupo — sua conta só sai
          deles. Mais detalhes sobre retenção e prazos de backup estão na{' '}
          <Link to="/privacidade" style={{ color: 'var(--neon)' }}>Política de Privacidade</Link>.
        </p>
      </div>
    </div>
  );
}
