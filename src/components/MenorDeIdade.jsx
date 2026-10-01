// Futty v2.0 — Rodada 29G (1-out): a tela de quem tem conta com data de nascimento menor de 18 anos.
//
// O Futty é 18+ de ponta a ponta. O cadastro novo barra o menor antes de a conta nascer (Register,
// Onboarding, motor e banco); a conta que JÁ existia com data menor de 18 entra aqui: o AuthGuard
// troca o app por esta tela cheia — a frase da casa e o botão "Excluir minha conta". O motor não
// apaga conta existente sozinho; quem decide excluir é a pessoa (2 toques: botão → "Excluir de vez").
// Lazy: só carrega para quem precisa dela (o arranque tem teto).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { limparCacheLocal } from '../lib/cacheLocal';
import { useAuth } from '../hooks/useAuth';
import { MSG_MENOR } from '../utils/idade';
import { CONFIRMACAO_EXCLUIR } from '../utils/confirmarExclusao';
import FuttyLoader from './FuttyLoader';

const RAJ = "'Rajdhani', sans-serif";

export default function MenorDeIdade() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [confirmando, setConfirmando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState('');

  // Mesmo caminho do Perfil → Conta → Excluir conta: o motor exige 'EXCLUIR' exato e faz tudo no servidor
  // (times, Storage, conta); aqui só resta limpar o aparelho e sair.
  async function excluir() {
    if (excluindo) return;
    setExcluindo(true);
    setErro('');
    try {
      await apiFetch('/api/me', { method: 'DELETE', body: JSON.stringify({ confirmacao: CONFIRMACAO_EXCLUIR }) });
      limparCacheLocal();
      await signOut();
      navigate('/', { state: { toast: 'Conta excluída.' } });
    } catch (e) {
      setErro(e.message || 'Não deu para excluir a conta agora. Tente de novo.');
      setExcluindo(false);
    }
  }

  return (
    <div
      role="alert"
      style={{
        minHeight: '100dvh', background: '#050810', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24, textAlign: 'center',
      }}
    >
      <FuttyLoader size={110} label={null} />

      <h1 style={{ fontFamily: RAJ, fontSize: 24, fontWeight: 700, letterSpacing: '0.06em', color: '#fff', margin: 0, maxWidth: 300, lineHeight: 1.25 }}>
        {MSG_MENOR}
      </h1>

      {confirmando ? (
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, maxWidth: 300, lineHeight: 1.5, margin: 0 }}>
          Isso apaga seu perfil, sua figurinha, suas fotos e suas participações. Times em que você é o único membro são apagados; os outros continuam com o time. Não dá para desfazer.
        </p>
      ) : null}

      {erro ? (
        <p role="status" style={{ color: '#f8b4b4', fontSize: 13, maxWidth: 300, lineHeight: 1.45, margin: 0 }}>{erro}</p>
      ) : null}

      <div style={{ display: 'grid', justifyItems: 'center', gap: 12, marginTop: 4, width: '100%', maxWidth: 260 }}>
        {confirmando ? (
          <>
            <button
              type="button"
              className="btn hud-corners-s"
              disabled={excluindo}
              onClick={excluir}
              style={{
                width: '100%', fontFamily: RAJ, fontSize: 15, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', background: 'var(--danger)', border: '1px solid rgba(239,68,68,0.5)', color: '#fff',
              }}
            >
              {excluindo ? 'Excluindo…' : 'Excluir de vez'}
            </button>
            <button
              type="button"
              className="btn btn--purple-outline hud-corners"
              disabled={excluindo}
              onClick={() => { setConfirmando(false); setErro(''); }}
              style={{ width: '100%', height: 42, fontSize: 14 }}
            >
              Voltar
            </button>
          </>
        ) : (
          <>
            <div className="cta-gold-glow" style={{ display: 'flex', width: '100%' }}>
              <button type="button" className="btn hud-corners cta-gold" style={{ width: '100%' }} onClick={() => setConfirmando(true)}>
                Excluir minha conta
              </button>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              style={{ border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}
            >
              Sair
            </button>
          </>
        )}
      </div>
    </div>
  );
}
