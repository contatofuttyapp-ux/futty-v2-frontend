// Futty v2.0 — Rodada 29B (F): "Avise-me". O Futty ainda não está nas lojas e as redes já apontam para o site: quem chega
// interessado deixa o e-mail e é avisado no dia do lançamento. Sem login, sem app. Esta página (/avise-me) é o destino dos
// links das redes; o MESMO formulário (AviseMeForm) também mora na página inicial do site (LandingPage).
// A lista vive no motor (POST /api/avise-me, migração 068); o envio do "chegou nas lojas" é no dia do lançamento.
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import FuttyLockup from '../components/FuttyLockup';
import { TEXTOS_AVISE_ME, emailParecePronto, origemDaUrl } from '../utils/aviseMe';
import '../styles/app.css';

/**
 * O formulário: título, e-mail, botão, UMA linha de consentimento (LGPD) e "Você pode sair da lista quando quiser".
 * `origemPadrao` é de onde a pessoa veio quando o link não traz utm (a página inicial manda "site"; /avise-me, "avise-me").
 */
export function AviseMeForm({ origemPadrao = 'site', comTitulo = true }) {
  const { search } = useLocation();
  const [email, setEmail] = useState('');
  const [isca, setIsca] = useState(''); // campo escondido para robô: gente de verdade nunca o preenche
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(false);
  const [erro, setErro] = useState('');

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;
    setErro('');
    if (!emailParecePronto(email)) {
      setErro(email.trim() ? TEXTOS_AVISE_ME.emailInvalido : 'Escreva seu e-mail.');
      return;
    }
    setEnviando(true);
    try {
      await apiFetch('/api/avise-me', { method: 'POST', body: JSON.stringify({ email: email.trim(), origem: origemDaUrl(search, origemPadrao), site: isca }) });
      setFeito(true);
    } catch (err) {
      setErro(err.message || 'Não deu para anotar agora. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  if (feito) {
    return (
      <div role="status" data-avise-me="feito" style={{ display: 'grid', gap: 6, textAlign: 'center' }}>
        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 18, color: '#f0c94a' }}>{TEXTOS_AVISE_ME.feito}</div>
        <p className="texto-apoio texto-apoio--centro" style={{ margin: '0 auto' }}>{TEXTOS_AVISE_ME.sair}</p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} data-avise-me="form" noValidate style={{ display: 'grid', gap: 10, width: '100%', textAlign: 'center' }}>
      {comTitulo ? (
        <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 18, lineHeight: 1.2, color: '#fff', margin: 0 }}>{TEXTOS_AVISE_ME.titulo}</h2>
      ) : null}
      {/* A isca fica fora da tela e fora da ordem do teclado; leitor de tela a ignora. */}
      <input
        type="text"
        name="site"
        value={isca}
        onChange={(e) => setIsca(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />
      <input
        type="email"
        name="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        className="input input--hud"
        value={email}
        maxLength={254}
        placeholder="seu@email.com"
        aria-label="Seu e-mail"
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: '100%', fontFamily: "'Rajdhani', sans-serif", fontSize: 16, textAlign: 'center' }}
      />
      <button type="submit" className="btn cta-gold hud-corners-s" disabled={enviando} style={{ width: '100%', height: 46, fontFamily: "'Rajdhani', sans-serif", fontSize: 15 }}>
        {enviando ? 'Enviando…' : TEXTOS_AVISE_ME.botao}
      </button>
      {erro ? <p role="alert" style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{erro}</p> : null}
      <p className="texto-apoio texto-apoio--centro" style={{ margin: '0 auto' }}>
        {TEXTOS_AVISE_ME.consentimento}
        <br />
        {TEXTOS_AVISE_ME.sair}
      </p>
    </form>
  );
}

export default function AviseMe() {
  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 24px', position: 'relative' }}>
      <div style={{ width: '100%', maxWidth: 360, display: 'grid', gap: 22, justifyItems: 'center', textAlign: 'center' }}>
        <FuttyLockup size={120} wordmark={false} />
        <div style={{ display: 'grid', gap: 8 }}>
          <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 30, lineHeight: 1.1, color: '#fff', margin: 0 }}>
            O seu time.<br />A sua figurinha.
          </h1>
          <p className="texto-apoio texto-apoio--centro" style={{ margin: '0 auto' }}>
            O Futty está chegando nas lojas. Deixe seu e-mail e a gente avisa no dia.
          </p>
        </div>
        <AviseMeForm origemPadrao="avise-me" />
      </div>
    </main>
  );
}
