// Futty v2.0 — Termos de Uso (/termos). Página legal mínima, PT-BR.
import { Link } from 'react-router-dom';
import '../styles/app.css';

const H = { fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, color: '#fff' };
const h2 = { ...H, fontSize: 18, margin: '24px 0 6px' };
const p = { fontSize: 15, lineHeight: 1.6, color: 'var(--text-dim)', margin: 0 };

export default function Termos() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 48px' }}>
        <Link to="/" style={{ fontSize: 14, color: 'var(--text-dim)' }}>← Voltar</Link>

        <h1 style={{ ...H, fontSize: 30, margin: '16px 0 4px' }}>Termos de Uso</h1>

        <h2 style={h2}>1. Aceitação</h2>
        <p style={p}>Ao usar o Futty, concordas com estes termos.</p>

        <h2 style={h2}>2. O serviço</h2>
        <p style={p}>
          O Futty é uma plataforma de gestão de peladas amadoras — sorteio de times, rankings e
          figurinhas. Não nos responsabilizamos por actividades físicas realizadas durante os jogos.
        </p>

        <h2 style={h2}>3. Contas</h2>
        <p style={p}>
          Deves ter pelo menos 18 anos para criar conta. És responsável pela segurança da tua conta.
        </p>

        <h2 style={h2}>4. Conteúdo</h2>
        <p style={p}>
          Podes fazer upload de fotos pessoais. Não é permitido conteúdo ilegal, ofensivo ou que
          viole direitos de terceiros.
        </p>

        <h2 style={h2}>5. Planos e pagamentos</h2>
        <p style={p}>
          Os planos Pro e Elite são pagos mensalmente. Cancelamentos têm efeito no fim do período
          pago. Não há reembolsos de períodos parciais.
        </p>

        <h2 style={h2}>6. Encerramento</h2>
        <p style={p}>Podemos suspender contas que violem estes termos.</p>

        <h2 style={h2}>7. Contacto</h2>
        <p style={p}>suporte@futty.app</p>

        <p style={{ ...p, fontSize: 13, marginTop: 32, color: 'var(--label-color)' }}>
          Última actualização: Janeiro 2025
        </p>
      </div>
    </div>
  );
}
