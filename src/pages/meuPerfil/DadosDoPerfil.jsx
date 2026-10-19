// Futty v2.0 — Perfil: a seção Dados (o nome de jogador e os outros campos).
import { CARD, inputNomeStyle, inputStyle, labelStyle } from './estilos';
import { SecLabel } from './pecas';

export default function DadosDoPerfil({ guardarDados, nomeJogFocus, savingDados, setField, setNomeJogFocus, u, user }) {
  return (
    <>
        {/* 2. SECÇÃO DADOS */}
        <SecLabel>Dados</SecLabel>
        <div className="perfil-form" style={{ ...CARD, padding: 14, display: 'grid', gap: 12 }}>
          {/* NOME DE JOGADOR — tratamento de cromo.
              É o único campo desta página que sai daqui e vai desenhado na placa da
              figurinha; os outros dois são administrativos (o nome completo é
              privado, o email nem se edita). Por isso ganha bloco próprio, moldura
              dourada e corpo maior: a hierarquia passa a dizer o que a página faz,
              em vez de alinhar três campos como se pesassem o mesmo. */}
          <div className="perfil-nome-glow">
          <label className="perfil-nome-campo hud-corners-s" style={{ display: 'grid', gap: 6, padding: 14 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: "'Rajdhani', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#d4a017' }}>
              <span>Nome de jogador</span>
              {nomeJogFocus ? (
                <span style={{ letterSpacing: 0, fontWeight: 600, color: (u.nome_jogador || '').length >= 18 ? '#d4a017' : 'rgba(255,255,255,0.35)' }}>{(u.nome_jogador || '').length}/18</span>
              ) : null}
            </span>
            {/* O shine é irmão do input, não ::after dele: <input> não tem
                pseudo-elementos. O relative é o berço do overlay. */}
            <span className="hud-corners-s" style={{ position: 'relative', display: 'block' }}>
              <input
                value={u.nome_jogador || ''}
                onChange={(e) => setField('nome_jogador', e.target.value.slice(0, 18))}
                onFocus={() => setNomeJogFocus(true)}
                onBlur={() => setNomeJogFocus(false)}
                maxLength={18}
                placeholder="Como te chamam no campo?"
                style={inputNomeStyle}
              />
              <span className="perfil-nome-shine" aria-hidden="true" />
            </span>
            {/* Hint discreto: fecha o circuito perfil → cromo. Leitura, não estrutura
                → fica no --sans (var(--sans)), como manda a régua. */}
            <span className="texto-apoio" style={{ fontFamily: 'var(--sans)', marginTop: 0 }}>
              É esse o nome que aparece na sua figurinha.
            </span>
          </label>
          </div>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={labelStyle}>Nome completo (privado)</span>
            <input value={u.nome || ''} onChange={(e) => setField('nome', e.target.value.slice(0, 60))} placeholder="Nome completo" className="hud-corners-s" style={inputStyle} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={labelStyle}>E-mail</span>
            <div className="hud-corners-s" style={{ ...inputStyle, color: 'var(--text-dim)' }}>{u.email || user?.email || '—'}</div>
          </label>
          {/* OUTLINE ROXO RECUADO: fundo transparente, borda 1.5px e o texto a levar a
              cor — lê-se como botão sem gritar. É a única acção da secção Dados; tem de se
              perceber que se clica. Nem o roxo cheio (.btn--purple: rgba(124,58,237,0.18) +
              borda --purple), que era o bloco mais saturado da página e disputava o primeiro
              olhar com o nome de jogador, que é o hero; nem rgba(139,92,246,0.07) com texto
              branco, que sumia.
              NÃO vai para .cta-gold: um segundo dourado a berrar tinha o mesmo
              problema ao contrário, e a Lei dos Gémeos não ganha um 4º irmão por isto.
              #a78bfa e não #b69cff: o segundo não é --purple nem --neon, não existe na
              paleta, e é um dos órfãos que foram varridos — reintroduzi-lo aqui era
              reabrir o que se fechou. O #a78bfa é o roxo recuado dos links da auth:
              mesma leitura, dentro da casa. */}
          <button
            type="button"
            className="btn hud-corners-s"
            style={{
              width: '100%',
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: 'transparent',
              border: '1.5px solid rgba(167,139,250,0.45)',
              color: '#a78bfa',
            }}
            disabled={savingDados}
            onClick={guardarDados}
          >
            {savingDados ? 'Salvando…' : 'Salvar dados'}
          </button>
        </div>
    </>
  );
}
