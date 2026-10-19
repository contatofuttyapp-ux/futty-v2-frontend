// Futty v2.0 — Perfil: a seção Privacidade e a lista de jogadores bloqueados.
import Icon from '../../components/Icon';
import { CARD } from './estilos';
import { SecLabel } from './pecas';

export default function PrivacidadeDoPerfil({ bloqueados, desbloqueandoId, desbloquear, patchMe, perfil }) {
  return (
    <>
        {/* SECÇÃO PRIVACIDADE (Opção B): o rosto entra por omissão para MAIORES; aqui
            desliga-se para silhueta. No servidor a IDADE manda sempre (sem data de nascimento
            ou sem 18 anos nunca revelam, mesmo com isto ligado). */}
        <SecLabel>Privacidade</SecLabel>
        <div className="hud-corners" style={{ ...CARD, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px' }}>
            <span style={{ display: 'grid', gap: 3, minWidth: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
                <Icon name="cadeado" size={20} color="#d4a017" />
                Mostrar meu rosto em links públicos
              </span>
              <span className="texto-apoio" style={{ marginTop: 0, paddingLeft: 32 }}>
                Seu rosto aparece em links públicos de sorteio. Desligue aqui se preferir silhueta.
              </span>
            </span>
            <input
              type="checkbox"
              checked={perfil.user.mostrar_rosto_publico !== false}
              onChange={(e) => patchMe({ mostrar_rosto_publico: e.target.checked })}
              style={{ width: 20, height: 20, accentColor: '#8b5cf6', flex: 'none' }}
              aria-label="Mostrar meu rosto em links públicos de sorteio"
            />
          </div>
        </div>

        {/* Jogadores bloqueados (Apple UGC 1.2): lista de quem EU bloqueei, com
            desbloquear. Bloquear em si vive no menu do post (Resenha) e no perfil
            público do jogador — aqui é só a gestão da lista já feita. */}
        {bloqueados.length > 0 ? (
          <div className="hud-corners" style={{ ...CARD, overflow: 'hidden', marginTop: 10 }}>
            {bloqueados.map((b, i) => (
              <div
                key={b.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 16px',
                  borderBottom: i < bloqueados.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
              >
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{b.nome}</span>
                <button
                  type="button"
                  disabled={desbloqueandoId === b.id}
                  onClick={() => desbloquear(b.id)}
                  style={{ background: 'none', border: 'none', color: '#8b5cf6', fontSize: 12, fontWeight: 700, cursor: desbloqueandoId === b.id ? 'wait' : 'pointer', padding: '4px 6px' }}
                >
                  {desbloqueandoId === b.id ? 'Desbloqueando…' : 'Desbloquear'}
                </button>
              </div>
            ))}
          </div>
        ) : null}
    </>
  );
}
