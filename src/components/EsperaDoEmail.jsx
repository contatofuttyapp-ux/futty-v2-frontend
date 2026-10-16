// Futty v2.0 — a espera do e-mail de confirmação ("Confirme seu e-mail"), dentro do cartão das páginas de entrada. Aparece depois do cadastro
// por e-mail e no Entrar de uma conta que ainda não confirmou. A confirmação em si acontece no botão do e-mail: no celular com o app, o link
// abre o APP (pages/ConfirmarEmail.jsx abre a sessão e segue); aqui só se espera, se reenvia e se leva a pessoa ao e-mail.
//
// Quando a pessoa confirma em OUTRO lugar (o e-mail aberto no computador, ou no navegador do celular) e volta ao app, esta tela percebe e
// segue sozinha: com a senha que acabou de ser digitada (só na memória, nunca gravada) tenta entrar ao voltar e a cada 20 s, e o Supabase
// diz "falta confirmar" até a confirmação acontecer. Sem a senha na memória (o app foi fechado e reaberto), "Já confirmei" leva ao Entrar
// com o e-mail preenchido.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '../lib/supabase';
import { guardarCadastroPendente, limparCadastroPendente } from '../lib/cadastroPendente';
import { ESPERA_PARA_REENVIAR_S, caixaDeEntrada, contaSemConfirmar, mensagemDoReenvio } from '../utils/confirmacaoDoEmail';
import FuttyLogo from './FuttyLogo';

const esperaRestante = (enviadoEm) => Math.max(0, Math.ceil(ESPERA_PARA_REENVIAR_S - (Date.now() - enviadoEm) / 1000));
// De quanto em quanto tempo a tela pergunta se já confirmou, enquanto está à vista. O Supabase limita as tentativas de entrar por IP
// (30 a cada 5 min no padrão): 20 s deixa folga para outras pessoas na mesma rede.
const CHECAR_A_CADA_MS = 20000;
// Depois de meia hora parada à vista a tela deixa de perguntar sozinha (o "Já confirmei" e o voltar ao app continuam).
const CHECAR_POR_MS = 30 * 60000;

/**
 * @param {object} props
 * @param {string} props.email
 * @param {number} props.enviadoEm hora do último e-mail mandado (lib/cadastroPendente)
 * @param {string} [props.senha] a senha que a pessoa acabou de digitar (só memória): sem ela a tela não consegue perceber a confirmação sozinha
 * @param {string} [props.aviso] frase de abertura (ex.: a conta ainda não foi confirmada)
 * @param {() => void} [props.onConfirmando] vai tentar entrar (quem chamou marca "acabou de cadastrar" antes da sessão nascer)
 * @param {(sessao: object) => void} props.onConfirmado a sessão já está aberta
 * @param {() => void} props.onTrocarEmail volta ao formulário (o bilhete já foi apagado)
 * @param {(email: string) => void} props.onEntrarComSenha "Já confirmei" sem senha na memória: o Entrar com o e-mail preenchido
 * @param {string} props.redirecionarPara destino que o reenvio manda junto (o mesmo do cadastro)
 */
export default function EsperaDoEmail({
  email, enviadoEm, senha, aviso, onConfirmando, onConfirmado, onTrocarEmail, onEntrarComSenha, redirecionarPara,
}) {
  const [erro, setErro] = useState('');
  const [nota, setNota] = useState('');
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);
  const [checando, setChecando] = useState(false);
  // A espera do botão conta do último TOQUE em reenviar (mesmo recusado), não do último e-mail que chegou.
  const [esperaDesde, setEsperaDesde] = useState(enviadoEm);
  const [espera, setEspera] = useState(() => esperaRestante(enviadoEm));
  // A senha deixa de valer se o Supabase a recusar por outro motivo (ex.: trocada pelo "Esqueceu a senha?" em outro aparelho).
  const senhaVale = useRef(!!senha);
  const emCurso = useRef(false);
  const plataforma = Capacitor.getPlatform();
  const caixa = caixaDeEntrada(email, plataforma);

  // Contagem do "Reenviar e-mail": um setTimeout por segundo (sem setInterval solto para limpar à mão).
  useEffect(() => {
    if (espera <= 0) return undefined;
    const t = setTimeout(() => setEspera(esperaRestante(esperaDesde)), 1000);
    return () => clearTimeout(t);
  }, [espera, esperaDesde]);

  /** Tenta entrar com a senha da memória. `manual` = tocou em "Já confirmei" (aí a tela responde; sozinha, fica quieta). */
  const checar = useCallback(async (manual = false) => {
    if (!senhaVale.current) {
      if (manual) onEntrarComSenha(email);
      return;
    }
    if (emCurso.current) return;
    emCurso.current = true;
    if (manual) { setChecando(true); setErro(''); setNota(''); }
    onConfirmando?.(); // antes do pedido: o evento de sessão nova chega ANTES de ele devolver a resposta
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    emCurso.current = false;
    if (manual) setChecando(false);
    if (!error && data?.session) {
      limparCadastroPendente();
      onConfirmado(data.session);
      return;
    }
    if (contaSemConfirmar(error)) {
      if (manual) setNota('Ainda não vimos a confirmação. Toque em "Confirmar e entrar" no e-mail mais recente.');
      return;
    }
    if (error?.status === 400) senhaVale.current = false; // senha recusada: daqui em diante, só o Entrar
    if (manual) onEntrarComSenha(email);
  }, [email, senha, onConfirmado, onConfirmando, onEntrarComSenha]);

  // Voltou ao app (ou à aba) e de 20 em 20 s enquanto à vista: confirmou em outro lugar?
  useEffect(() => {
    if (!senha) return undefined;
    const ate = Date.now() + CHECAR_POR_MS;
    const aoVoltar = () => { if (document.visibilityState === 'visible') checar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoVoltar);
    // No app, o "voltar ao primeiro plano" do sistema (o WebView do Android nem sempre avisa pelo visibilitychange).
    const registo = Capacitor.isNativePlatform() ? CapacitorApp.addListener('resume', () => checar()).catch(() => null) : null;
    const relogio = setInterval(() => {
      if (Date.now() > ate) { clearInterval(relogio); return; }
      if (document.visibilityState === 'visible') checar();
    }, CHECAR_A_CADA_MS);
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', aoVoltar);
      clearInterval(relogio);
      registo?.then((h) => h?.remove());
    };
  }, [senha, checar]);

  async function reenviar() {
    setErro('');
    setNota('');
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
      setReenviado(true);
    }
    // Mesmo recusado (o Supabase pede 60 s entre e-mails), o botão espera de novo antes do próximo toque.
    setEsperaDesde(agora);
    setEspera(ESPERA_PARA_REENVIAR_S);
  }

  // No site, a caixa de entrada do provedor numa aba nova. No app, o app de e-mail: o sistema abre o esquema (message://, googlegmail://…)
  // fora do WebView; se o 1º não abrir nada em 1,5 s (o app daquele esquema não está instalado), tenta o próximo.
  async function abrirEmail() {
    if (plataforma === 'web') {
      window.open(caixa[0], '_blank', 'noopener');
      return;
    }
    for (const alvo of caixa) {
      const saiu = new Promise((resolve) => {
        const prazo = setTimeout(() => { document.removeEventListener('visibilitychange', ver); resolve(false); }, 1500);
        function ver() { if (document.visibilityState === 'hidden') { clearTimeout(prazo); document.removeEventListener('visibilitychange', ver); resolve(true); } }
        document.addEventListener('visibilitychange', ver);
      });
      window.location.assign(alvo);
      if (await saiu) return;
    }
  }

  return (
    <div data-espera-do-email>
      <div className="auth-brand" style={{ opacity: 1, display: 'flex', justifyContent: 'flex-start' }}>
        <FuttyLogo variant="icone" size={40} />
      </div>
      {/* "e-mail" inteiro: em 360 px o título quebrava no hífen ("E-" / "MAIL"). */}
      <h1 className="auth-title">Confirme seu <span style={{ whiteSpace: 'nowrap' }}>e-mail</span></h1>
      <div className="auth-rule" aria-hidden="true" />
      <p className="auth-subtitle" style={{ marginBottom: 20, overflowWrap: 'anywhere' }} data-texto-da-espera>
        Mandamos um link para <strong style={{ color: 'var(--text)' }} data-email-da-espera>{email}</strong>. Toque em Confirmar no e-mail.
        <span style={{ display: 'block', marginTop: 6, fontSize: 12.5 }}>Não chegou? Olhe também no Spam e em Promoções.</span>
      </p>

      <div className="auth-form">
        {aviso && !erro && !reenviado && !nota && (
          <div role="status" className="auth-alert auth-alert--success hud-corners-s">{aviso}</div>
        )}
        {reenviado && !erro && !nota && (
          <div role="status" className="auth-alert auth-alert--success hud-corners-s" data-reenviado>Mandamos outro e-mail. Use o link do mais recente.</div>
        )}
        {nota && !erro && (
          <div role="status" className="auth-alert auth-alert--success hud-corners-s" data-nota-da-espera>{nota}</div>
        )}
        {erro && (
          <div role="alert" className="auth-alert auth-alert--error hud-corners-s" data-erro-da-espera>{erro}</div>
        )}

        {caixa.length > 0 && (
          <div className="cta-gold-glow">
            <button type="button" className="auth-cta cta-gold hud-corners" onClick={abrirEmail} data-abrir-email data-caixa={caixa.join(' ')}>
              Abrir o e-mail
            </button>
          </div>
        )}

        <button
          type="button"
          className="auth-btn auth-btn--secundario hud-corners-s"
          onClick={reenviar}
          disabled={reenviando || espera > 0}
          data-reenviar-email
        >
          {reenviando ? 'Enviando…' : espera > 0 ? `Reenviar e-mail em ${espera}s` : 'Reenviar e-mail'}
        </button>

        <button
          type="button"
          className="auth-btn auth-btn--secundario hud-corners-s"
          onClick={() => checar(true)}
          disabled={checando}
          data-ja-confirmei
        >
          {checando ? 'Conferindo…' : 'Já confirmei'}
        </button>
      </div>

      <p className="auth-footer">
        E-mail errado?{' '}
        <button type="button" className="auth-link-botao" onClick={() => { limparCadastroPendente(); onTrocarEmail(); }}>Trocar e-mail</button>
      </p>
    </div>
  );
}
