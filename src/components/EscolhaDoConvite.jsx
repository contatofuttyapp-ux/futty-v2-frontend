// Futty v2.0 — "Qual time te convidou?": a pessoa abriu, no navegador deste celular, convites de mais de um time e depois se cadastrou no
// app (lib/conviteNoMotor.js). Com um só convite ela entra sozinha; com dois ou mais, escolhe aqui. "Nenhum desses" segue sem time — o
// cartão "Recebeu um convite?" continua no Início. Usado no Onboarding (antes das boas-vindas do time) e no Início de quem está sem time.
import EscudoEquipa from './EscudoEquipa';

const RAJ = "'Rajdhani', sans-serif";

export default function EscolhaDoConvite({ convites, onEscolher, onNenhum, entrando = null, erro = '', style }) {
  return (
    <section
      className="hud-corners"
      data-escolha-do-convite
      style={{ width: '100%', padding: '16px 16px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,160,23,0.35)', display: 'grid', gap: 12, ...style }}
    >
      <div>
        <h2 style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 19, margin: 0, color: '#fff' }}>Qual time te convidou?</h2>
        <p className="texto-apoio" style={{ margin: '4px 0 0' }}>Você abriu convites destes times neste celular.</p>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {convites.map((c) => (
          <li key={c.team.slug} data-convite-opcao={c.team.slug} style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'center', gap: 10 }}>
            <EscudoEquipa team={c.team} size={36} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 16, color: '#fff', overflowWrap: 'anywhere', lineHeight: 1.2 }}>{c.team.nome}</div>
              {c.convidadoPor ? <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Convite de {c.convidadoPor}</div> : null}
            </div>
            <button
              type="button"
              className="btn btn--purple btn--hud hud-corners-s"
              data-entrar-no-convite={c.team.slug}
              disabled={!!entrando}
              onClick={() => onEscolher(c)}
              style={{ padding: '0 14px' }}
            >
              {entrando === c.team.slug ? 'Entrando…' : 'Entrar'}
            </button>
          </li>
        ))}
      </ul>
      {erro ? <div role="alert" style={{ fontSize: 13, color: '#f8b4b4', lineHeight: 1.45 }}>{erro}</div> : null}
      <button
        type="button"
        data-nenhum-convite
        onClick={onNenhum}
        disabled={!!entrando}
        style={{ justifySelf: 'center', background: 'none', border: 'none', color: '#8a8398', fontFamily: RAJ, fontSize: 13, letterSpacing: '0.04em', cursor: 'pointer', padding: 4 }}
      >
        Nenhum desses
      </button>
    </section>
  );
}
