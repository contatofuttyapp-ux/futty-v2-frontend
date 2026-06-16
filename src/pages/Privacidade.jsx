// Futty v2.0 — Política de Privacidade (/privacidade). Página legal mínima, PT-BR.
import { Link } from 'react-router-dom';
import '../styles/app.css';

const H = { fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, color: '#fff' };
const h2 = { ...H, fontSize: 18, margin: '24px 0 6px' };
const p = { fontSize: 15, lineHeight: 1.6, color: 'var(--text-dim)', margin: 0 };
const ul = { ...p, margin: '4px 0 0', paddingLeft: 20, display: 'grid', gap: 4 };

export default function Privacidade() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 48px' }}>
        <Link to="/" style={{ fontSize: 14, color: 'var(--text-dim)' }}>← Voltar</Link>

        <h1 style={{ ...H, fontSize: 30, margin: '16px 0 4px' }}>Política de Privacidade</h1>

        <h2 style={h2}>1. Dados que recolhemos</h2>
        <ul style={ul}>
          <li>Email e nome (registo)</li>
          <li>Foto de perfil (opcional, upload do utilizador)</li>
          <li>Dados de jogo (presenças, votos, resultados)</li>
          <li>Dados de pagamento (processados pelo Stripe — não guardamos dados de cartão)</li>
        </ul>

        <h2 style={h2}>2. Como usamos os dados</h2>
        <ul style={ul}>
          <li>Operar e melhorar o serviço</li>
          <li>Enviar notificações sobre os teus jogos</li>
          <li>Processar pagamentos dos planos</li>
        </ul>

        <h2 style={h2}>3. Partilha de dados</h2>
        <p style={p}>Não vendemos os teus dados. Partilhamos apenas com:</p>
        <ul style={ul}>
          <li>Supabase (base de dados e autenticação)</li>
          <li>Stripe (pagamentos)</li>
          <li>fal.ai (geração de avatar IA, só a tua foto)</li>
        </ul>

        <h2 style={h2}>4. Os teus direitos</h2>
        <p style={p}>
          Podes pedir a eliminação da tua conta e dados a qualquer momento através de
          suporte@futty.app.
        </p>

        <h2 style={h2}>5. Cookies</h2>
        <p style={p}>
          Usamos localStorage para preferências de sessão. Não usamos cookies de tracking de
          terceiros.
        </p>

        <h2 style={h2}>6. Contacto</h2>
        <p style={p}>suporte@futty.app</p>

        <p style={{ ...p, fontSize: 13, marginTop: 32, color: 'var(--label-color)' }}>
          Última actualização: Janeiro 2025
        </p>
      </div>
    </div>
  );
}
