// Futty v2.0 — Perfil → Notificações: um interruptor por tipo — jogos e presença; pedidos de entrada (só
// para quem administra algum time); figurinha pronta; Resenha. Todos ligados por padrão. A escolha mora na
// conta (motor, users.notificacoes) e vale em qualquer aparelho: o motor nem manda o aviso do tipo
// desligado. Os avisos que o admin manda ("Avisar o time") não se desligam aqui: é o time falando.
// Sem a migração 079 o motor responde `salvavel: false`: a tela mostra tudo ligado, sem deixar mexer, e
// diz por quê.
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

const TIPOS = [
  { chave: 'jogos', rotulo: 'Jogos e presença', apoio: 'Jogo novo, sorteio feito, jogo cancelado, vaga que abriu.' },
  { chave: 'pedidos', rotulo: 'Pedidos de entrada', apoio: 'Quando alguém pede para entrar num time que você administra.', soAdmin: true },
  { chave: 'figurinha', rotulo: 'Figurinha pronta', apoio: 'Quando a sua figurinha termina de ser feita.' },
  { chave: 'resenha', rotulo: 'Resenha', apoio: 'Resultado do jogo lançado na Resenha.' },
];

export default function PreferenciasNotificacoes({ aoErro }) {
  const [estado, setEstado] = useState(null); // { preferencias, admin, salvavel }
  useEffect(() => {
    let ativo = true;
    apiFetch('/api/push/preferencias')
      .then((d) => ativo && setEstado(d))
      .catch(() => ativo && setEstado({ preferencias: { jogos: true, pedidos: true, figurinha: true, resenha: true }, admin: false, salvavel: false }));
    return () => {
      ativo = false;
    };
  }, []);

  async function trocar(chave, ligado) {
    const antes = estado;
    setEstado((e) => ({ ...e, preferencias: { ...e.preferencias, [chave]: ligado } }));
    try {
      await apiFetch('/api/push/preferencias', { method: 'PATCH', body: JSON.stringify({ [chave]: ligado }) });
    } catch (e) {
      setEstado(antes);
      aoErro?.(e.message);
    }
  }

  if (!estado) return null;
  const tipos = TIPOS.filter((t) => !t.soAdmin || estado.admin);
  return (
    <div data-preferencias-notificacoes>
      {tipos.map((t) => {
        const ligado = estado.preferencias?.[t.chave] !== false;
        return (
          <div key={t.chave} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ display: 'grid', gap: 3, minWidth: 0 }}>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>{t.rotulo}</span>
              <span className="texto-apoio" style={{ marginTop: 0 }}>{t.apoio}</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              data-notificacao={t.chave}
              checked={ligado}
              disabled={!estado.salvavel}
              onChange={(e) => trocar(t.chave, e.target.checked)}
              style={{ width: 20, height: 20, accentColor: '#8b5cf6', flex: 'none' }}
              aria-label={t.rotulo}
            />
          </div>
        );
      })}
      {estado.salvavel ? null : (
        <p className="texto-apoio" style={{ margin: 0, padding: '0 16px 12px' }}>Por enquanto todas ficam ligadas.</p>
      )}
    </div>
  );
}
