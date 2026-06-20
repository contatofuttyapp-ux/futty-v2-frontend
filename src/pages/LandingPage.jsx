// Futty v2.0 — Landing page (rota "/") para visitantes não autenticados.
// Página única com secções: hero, figurinha, como funciona, planos, CTA, footer.
// Mobile-first, max-width 480px, tokens CSS + AuroraBg (global via Layout).
import { Link } from 'react-router-dom';
import FuttyLogo from '../components/FuttyLogo';
import PlayerCard from '../components/PlayerCard';
import '../styles/app.css';

// Cromos de exemplo (sem chamada à API — fotos genéricas em /public).
const EXEMPLOS = [
  { nome: 'João Silva', foto: '/avatares/genericos/Tigre.png', nota: 8.4, frame: 'dourado' },
  { nome: 'Carlos M.', foto: '/avatares/genericos/Ninja.png', nota: 7.9, frame: 'roxo' },
  { nome: 'Rui P.', foto: '/avatares/genericos/Astronauta.png', nota: 7.2, frame: 'azul' },
];

const PASSOS = [
  { icon: '⚽', titulo: 'Sorteia os times', texto: 'Confirma presença, sorteia com quem confirmou. Vista em lista ou campo estilo FIFA.' },
  { icon: '🏆', titulo: 'Acompanha o ranking', texto: 'Artilheiro, destaque do jogo, nota média. Campeonato com tabela classificativa.' },
  { icon: '🃏', titulo: 'Cria a tua figurinha', texto: 'Avatar IA personalizado. Compartilha e mostra quem és dentro do campo.' },
];

const PLANOS = [
  { id: 'free', nome: 'Free', preco: 'Grátis', bullets: ['Sorteio e ranking', 'Resenha do grupo', '3 avatares IA'], cta: 'Começar grátis' },
  { id: 'pro', nome: 'Pro ★', preco: 'R$9,90/mês', bullets: ['Tudo do Free', '50 avatares IA/mês', 'Sem anúncios'], cta: 'Assinar Pro', destaque: true },
  { id: 'elite', nome: 'Elite 👑', preco: 'R$24,90/mês', bullets: ['Tudo do Pro', '100 avatares IA/mês', 'Kit Elite dourado'], cta: 'Assinar Elite' },
];

const H = { fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, color: '#fff' };

function irPara(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function LandingPage() {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 40px' }}>
      {/* 1. HERO */}
      <section style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 18, padding: '32px 0' }}>
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <FuttyLogo variant="wordmark" size={56} color="white" />
        </div>
        <h1 style={{ ...H, fontSize: 34, lineHeight: 1.1, margin: 0 }}>O seu time.<br />A sua figurinha.</h1>
        <p style={{ fontSize: 15, lineHeight: 1.55, color: 'rgba(255,255,255,0.8)', margin: 0, maxWidth: 360 }}>
          Sorteio inteligente, ranking, campeonato e o seu cromo estilo Panini — tudo num só app.
        </p>
        <div style={{ display: 'grid', gap: 10, width: '100%', maxWidth: 320, marginTop: 8 }}>
          <Link to="/register" className="btn btn--purple" style={{ height: 48, fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            Criar conta grátis
          </Link>
          <button type="button" className="btn btn--purple-outline" style={{ height: 46 }} onClick={() => irPara('como-funciona')}>
            Ver como funciona
          </button>
        </div>
      </section>

      {/* 2. FIGURINHA EM DESTAQUE */}
      <section id="figurinha" style={{ padding: '40px 0', textAlign: 'center' }}>
        <h2 style={{ ...H, fontSize: 24, margin: 0 }}>A tua figurinha personalizada</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: '8px 0 20px', lineHeight: 1.5 }}>
          Foto real + avatar IA estilo Panini. Compartilha com o grupo.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {EXEMPLOS.map((ex) => (
            <div key={ex.nome} style={{ flex: 1, maxWidth: 140 }}>
              <PlayerCard
                jogador={{ nome: ex.nome }}
                stats={{ nota: ex.nota }}
                fotoOverride={encodeURI(ex.foto)}
                corFrame={ex.frame}
                mostrarStats
                mostrarNome
                cantos={false}
                aspect="2 / 3"
              />
            </div>
          ))}
        </div>
      </section>

      {/* 3. COMO FUNCIONA */}
      <section id="como-funciona" style={{ padding: '40px 0' }}>
        <h2 style={{ ...H, fontSize: 24, textAlign: 'center', margin: '0 0 20px' }}>Como funciona</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {PASSOS.map((p) => (
            <div key={p.titulo} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: 16, borderRadius: 'var(--radius-lg)', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 30, lineHeight: 1, flexShrink: 0 }}>{p.icon}</span>
              <div>
                <div style={{ ...H, fontSize: 17 }}>{p.titulo}</div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0', lineHeight: 1.5 }}>{p.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. PLANOS */}
      <section id="planos" style={{ padding: '40px 0' }}>
        <h2 style={{ ...H, fontSize: 24, textAlign: 'center', margin: '0 0 20px' }}>Planos</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {PLANOS.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'grid',
                gap: 10,
                padding: 18,
                borderRadius: 'var(--radius-lg)',
                background: 'var(--surface-1)',
                border: p.destaque ? '2px solid var(--neon)' : '1px solid var(--border-subtle)',
                boxShadow: p.destaque ? '0 0 16px rgba(139,92,246,0.3)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ ...H, fontSize: 22 }}>{p.nome}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#d4a017' }}>{p.preco}</span>
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
                {p.bullets.map((b) => (
                  <li key={b} style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>✓ {b}</li>
                ))}
              </ul>
              <Link to="/register" className={p.destaque ? 'btn btn--purple' : 'btn btn--purple-outline'} style={{ width: '100%', textAlign: 'center' }}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 5. CTA FINAL */}
      <section style={{ margin: '24px 0', padding: '32px 20px', borderRadius: 'var(--radius-lg)', background: '#d4a017', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 26, color: '#000', margin: 0 }}>Pronto para jogar?</h2>
        <Link
          to="/register"
          className="btn"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 16, height: 48, padding: '0 28px', fontSize: 15, fontWeight: 800, background: '#000', color: '#fff', border: 'none' }}
        >
          Criar conta grátis
        </Link>
      </section>

      {/* 6. FOOTER */}
      <footer style={{ textAlign: 'center', padding: '24px 0 0', fontSize: 12, color: 'var(--label-color)' }}>
        <div>Futty © 2025 · Feito para quem joga de verdade</div>
        <div style={{ marginTop: 8, display: 'flex', gap: 14, justifyContent: 'center' }}>
          <Link to="/termos" style={{ color: 'var(--label-color)' }}>Termos</Link>
          <span>·</span>
          <Link to="/privacidade" style={{ color: 'var(--label-color)' }}>Privacidade</Link>
        </div>
      </footer>
    </div>
  );
}
