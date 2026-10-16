// Futty v2.0 — a tela do código do e-mail ("Confirme seu e-mail"), dentro do cartão das páginas de entrada. Aparece depois do cadastro por
// e-mail e no Entrar de uma conta que ainda não confirmou. Código certo → a sessão abre aqui mesmo (supabase.auth.verifyOtp), sem sair do
// app e sem pedir a senha de novo; quem chamou decide para onde ir. As frases e a limpeza do que foi digitado vivem em utils/codigoDoEmail.js.
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { guardarCadastroPendente, limparCadastroPendente } from '../lib/cadastroPendente';
import {
  ESPERA_PARA_REENVIAR_S, TAMANHO_DO_CODIGO, limparCodigo, mensagemDoCodigo, mensagemDoReenvio,
} from '../utils/codigoDoEmail';
import FuttyLogo from './FuttyLogo';

const esperaRestante = (enviadoEm) => Math.max(0, Math.ceil(ESPERA_PARA_REENVIAR_S - (Date.now() - enviadoEm) / 1000));

/**
 * @param {object} props
 * @param {string} props.email
 * @param {number} props.enviadoEm hora do último e-mail mandado (lib/cadastroPendente)
 * @param {string} [props.aviso] frase de abertura (ex.: a conta ainda não foi confirmada)
 * @param {() => void} [props.onConfirmando] o código vai ao Supabase (quem chamou marca "acabou de cadastrar" antes da sessão nascer)
 * @param {(sessao: object) => void} props.onConfirmado a sessão já está aberta
 * @param {() => void} props.onTrocarEmail volta ao formulário (o bilhete já foi apagado)
 * @param {() => void} props.onEntrarComSenha quem confirmou pelo link de um e-mail antigo (o bilhete já foi apagado)
 * @param {string} props.redirecionarPara destino do link que ainda vai no e-mail (o reenvio manda o mesmo e-mail do cadastro)
 */
export default function ConfirmarCodigo({
  email, enviadoEm, aviso, onConfirmando, onConfirmado, onTrocarEmail, onEntrarComSenha, redirecionarPara,
}) {
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [ultimoEnvio, setUltimoEnvio] = useState(enviadoEm);
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);
  // A espera do botão conta do último TOQUE em reenviar (mesmo recusado), não do último e-mail que chegou.
  const [esperaDesde, setEsperaDesde] = useState(enviadoEm);
  const [espera, setEspera] = useState(() => esperaRestante(enviadoEm));
  const campo = useRef(null);

  // Contagem do "Reenviar código": um setTimeout por segundo (sem setInterval solto para limpar à mão).
  useEffect(() => {
    if (espera <= 0) return undefined;
    const t = setTimeout(() => setEspera(esperaRestante(esperaDesde)), 1000);
    return () => clearTimeout(t);
  }, [espera, esperaDesde]);

  async function confirmar(valor) {
    if (confirmando || valor.length !== TAMANHO_DO_CODIGO) return;
    setErro('');
    setReenviado(false);
    setConfirmando(true);
    onConfirmando?.(); // antes do verifyOtp: o evento de sessão nova chega ANTES de ele devolver a resposta
    const { data, error } = await supabase.auth.verifyOtp({ email, token: valor, type: 'signup' });
    if (error || !data?.session) {
      setConfirmando(false);
      setErro(mensagemDoCodigo(error, Date.now() - ultimoEnvio));
      // O campo fica com o que foi digitado, todo selecionado: o próximo número digitado já substitui.
      requestAnimationFrame(() => campo.current?.select());
      return;
    }
    limparCadastroPendente();
    onConfirmado(data.session);
  }

  function aoDigitar(e) {
    const limpo = limparCodigo(e.target.value);
    setCodigo(limpo);
    if (erro) setErro('');
    // O 6º número já confirma (também quando o código chega colado ou pelo preenchimento do teclado).
    if (limpo.length === TAMANHO_DO_CODIGO) confirmar(limpo);
  }

  async function reenviar() {
    setErro('');
    setReenviado(false);
    setReenviando(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirecionarPara } });
    setReenviando(false);
    const frase = mensagemDoReenvio(error);
    const agora = Date.now();
    if (frase) {
      setErro(frase);
    } else {
      guardarCadastroPendente(email, agora);
      setUltimoEnvio(agora);
      setReenviado(true);
      setCodigo('');
    }
    // Mesmo recusado (o Supabase pede 60 s entre e-mails), o botão espera de novo antes do próximo toque.
    setEsperaDesde(agora);
    setEspera(ESPERA_PARA_REENVIAR_S);
    campo.current?.focus();
  }

  return (
    <div data-confirmar-codigo>
      <div className="auth-brand" style={{ opacity: 1, display: 'flex', justifyContent: 'flex-start' }}>
        <FuttyLogo variant="icone" size={40} />
      </div>
      {/* "e-mail" inteiro: em 360 px o título quebrava no hífen ("E-" / "MAIL"). */}
      <h1 className="auth-title">Confirme seu <span style={{ whiteSpace: 'nowrap' }}>e-mail</span></h1>
      <div className="auth-rule" aria-hidden="true" />
      <p className="auth-subtitle" style={{ marginBottom: 20, overflowWrap: 'anywhere' }}>
        Digite o código que mandamos para <strong style={{ color: 'var(--text)' }} data-email-do-codigo>{email}</strong>.
        <span style={{ display: 'block', marginTop: 6, fontSize: 12.5 }}>Não chegou? Olhe também no Spam e em Promoções.</span>
      </p>

      <form className="auth-form" onSubmit={(e) => { e.preventDefault(); confirmar(codigo); }}>
        {aviso && !erro && !reenviado && (
          <div role="status" className="auth-alert auth-alert--success hud-corners-s">{aviso}</div>
        )}
        {reenviado && !erro && (
          <div role="status" className="auth-alert auth-alert--success hud-corners-s">Mandamos um código novo. Use o do e-mail mais recente.</div>
        )}
        {erro && (
          <div role="alert" className="auth-alert auth-alert--error hud-corners-s" data-erro-do-codigo>{erro}</div>
        )}

        <div className="auth-field">
          <label htmlFor="codigo">Código</label>
          <input
            ref={campo}
            id="codigo"
            className="auth-input auth-input--codigo hud-corners-s"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            placeholder="000000"
            aria-label={`Código de ${TAMANHO_DO_CODIGO} números`}
            value={codigo}
            onChange={aoDigitar}
            readOnly={confirmando}
            autoFocus
          />
        </div>

        <div className="cta-gold-glow">
          <button type="submit" className="auth-cta cta-gold hud-corners" disabled={confirmando || codigo.length !== TAMANHO_DO_CODIGO}>
            {confirmando ? 'Confirmando…' : 'Confirmar'}
          </button>
        </div>

        <button
          type="button"
          className="auth-btn auth-btn--secundario hud-corners-s"
          onClick={reenviar}
          disabled={reenviando || espera > 0}
          data-reenviar-codigo
        >
          {reenviando ? 'Enviando…' : espera > 0 ? `Reenviar código em ${espera}s` : 'Reenviar código'}
        </button>
      </form>

      <p className="auth-footer" style={{ display: 'grid', gap: 10 }}>
        <span>
          E-mail errado?{' '}
          <button type="button" className="auth-link-botao" onClick={() => { limparCadastroPendente(); onTrocarEmail(); }}>Trocar e-mail</button>
        </span>
        {/* E-mails mandados antes do código (e o link de reserva do e-mail novo) confirmam pelo navegador: aí é só entrar. */}
        <span style={{ fontSize: 12.5 }}>
          Confirmou pelo link do e-mail?{' '}
          <button type="button" className="auth-link-botao" onClick={() => { limparCadastroPendente(); onEntrarComSenha(); }}>Entrar com a senha</button>
        </span>
      </p>
    </div>
  );
}
