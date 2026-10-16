// Futty v2.0 — o botão "Confirmar e entrar" do e-mail de cadastro chega aqui: futtyapp.com.br/c/confirmar?token_hash=…&type=signup (ou
// /auth/confirmar, o mesmo). No celular com o app o sistema abre o APP neste link (lib/linkDoSite.js, o mesmo caminho do convite); sem o app,
// o site. Nos dois o token_hash vira sessão aqui (supabase.auth.verifyOtp), sem pedir a senha de novo.
//
// Depois de confirmar:
//   · no app, e no navegador onde a pessoa se cadastrou (o bilhete de lib/cadastroPendente.js está lá): onboarding — as boas-vindas do time
//     se ela veio de um convite (o bilhete do convite mora no mesmo aparelho), senão o "Começar" e o Início;
//   · num navegador que não é o do cadastro (o e-mail lido no computador; o celular sem o app): a conta também entra aqui, e a tela diz para
//     voltar ao app e tocar em Entrar (lá o e-mail já está preenchido, e a tela de espera do app percebe sozinha se ainda estiver aberta).
//
// O token_hash só vale uma vez e por 1 hora. Por que o link não é o do Supabase ({{ .ConfirmationURL }}): aquele abre o site do Supabase e
// volta por redirecionamento, que o sistema não entrega ao app; este é do nosso domínio, que o iPhone e o Android já mandam para o app.
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ehNativo } from '../lib/plataforma';
import { lerCadastroPendente, guardarCadastroPendente, limparCadastroPendente } from '../lib/cadastroPendente';
import { explicarLinkRecusado, lerLinkDeConfirmacao, mensagemDoReenvio } from '../utils/confirmacaoDoEmail';
import FuttyLogo from '../components/FuttyLogo';
import LoadingFutty from '../components/LoadingFutty';
import '../styles/app.css';
import '../styles/auth.css';

// O que o reenvio manda junto: o mesmo destino do cadastro (Register.jsx).
const destinoDoLink = () => `${window.location.origin}/onboarding`;

export default function ConfirmarEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  // Lidos uma vez, na chegada: o token sai da barra de endereço logo a seguir.
  const [link] = useState(() => lerLinkDeConfirmacao(location.search));
  const [pendente] = useState(() => lerCadastroPendente());
  const [fase, setFase] = useState('confirmando'); // confirmando | confirmado-fora | recusado
  const [recusa, setRecusa] = useState(null); // explicarLinkRecusado(...)
  const [reenvio, setReenvio] = useState({ enviando: false, frase: '', foi: false });
  const comecou = useRef(false); // o StrictMode do dev roda o efeito 2×; o token só pode ir ao Supabase uma vez

  async function confirmar() {
    setFase('confirmando');
    if (!link) {
      // Endereço sem o token (cortado ao copiar, aberto à mão): quem já está dentro segue; quem não está, volta ao e-mail.
      const { data: atual } = await supabase.auth.getSession();
      if (atual?.session) { navigate('/home', { replace: true }); return; }
      setRecusa({ tipo: 'incompleto', titulo: 'Link incompleto', frase: 'Esse endereço veio cortado. Abra de novo pelo botão "Confirmar e entrar" do e-mail.' });
      setFase('recusado');
      return;
    }
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: link.tipo });
    if (!error && data?.session) {
      limparCadastroPendente();
      if (ehNativo() || pendente) navigate('/onboarding', { replace: true });
      else setFase('confirmado-fora');
      return;
    }
    const { data: atual } = await supabase.auth.getSession();
    setRecusa(explicarLinkRecusado(error, { msDesdeOEnvio: pendente ? Date.now() - pendente.em : null, temSessao: !!atual?.session }));
    setFase('recusado');
  }

  useEffect(() => {
    if (comecou.current) return;
    comecou.current = true;
    // O token fora da barra de endereço (histórico, recarregar, relatório de erro): ele já foi lido.
    try { window.history.replaceState(window.history.state, '', location.pathname); } catch { /* sem history */ }
    confirmar();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- uma vez só, na chegada
  }, []);

  async function mandarOutro() {
    setReenvio({ enviando: true, frase: '', foi: false });
    const { error } = await supabase.auth.resend({ type: 'signup', email: pendente.email, options: { emailRedirectTo: destinoDoLink() } });
    const frase = mensagemDoReenvio(error);
    if (!frase) guardarCadastroPendente(pendente.email);
    setReenvio({ enviando: false, frase: frase || `Mandamos outro e-mail para ${pendente.email}. Toque em "Confirmar e entrar" nele.`, foi: !frase });
  }

  const entrar = () => navigate('/login', { replace: true, state: pendente ? { email: pendente.email } : undefined });

  if (fase === 'confirmando') return <LoadingFutty motivo="confirmar-email" />;

  let titulo;
  let frase;
  let acoes;
  if (fase === 'confirmado-fora') {
    titulo = 'E-mail confirmado';
    frase = 'Volte ao app e toque em Entrar.';
    acoes = (
      <>
        <p className="auth-subtitle" style={{ fontSize: 13, margin: '0 0 4px' }}>Sem o app? Siga por aqui mesmo.</p>
        <button type="button" className="auth-btn auth-btn--secundario hud-corners-s" onClick={() => navigate('/onboarding', { replace: true })} data-continuar-no-site>
          Continuar no site
        </button>
      </>
    );
  } else {
    titulo = recusa.titulo;
    frase = recusa.frase;
    const tentarDeNovo = ['conexao', 'espera', 'falhou'].includes(recusa.tipo);
    const podeMandarOutro = !!pendente && ['vencido', 'usado-ou-trocado'].includes(recusa.tipo) && !reenvio.foi;
    // Link vencido = a conta ainda não confirmou: o principal é pedir outro e-mail. Nos outros casos ela pode já ter confirmado: Entrar.
    const outroEmPrimeiro = podeMandarOutro && recusa.tipo === 'vencido';
    const botaoMandarOutro = (classe) => (
      <button type="button" className={classe} onClick={mandarOutro} disabled={reenvio.enviando} data-mandar-outro>
        {reenvio.enviando ? 'Enviando…' : 'Mandar outro e-mail'}
      </button>
    );
    const botaoEntrar = (classe) => <button type="button" className={classe} onClick={entrar} data-entrar>Entrar</button>;
    const DOURADO = 'auth-cta cta-gold hud-corners';
    const ROXO = 'auth-btn auth-btn--secundario hud-corners-s';
    acoes = (
      <>
        {reenvio.frase && (
          <div role={reenvio.foi ? 'status' : 'alert'} className={`auth-alert auth-alert--${reenvio.foi ? 'success' : 'error'} hud-corners-s`} data-frase-do-reenvio>
            {reenvio.frase}
          </div>
        )}
        <div className="cta-gold-glow">
          {recusa.tipo === 'usado' ? (
            <button type="button" className={DOURADO} onClick={() => navigate('/home', { replace: true })}>Continuar</button>
          ) : tentarDeNovo ? (
            <button type="button" className={DOURADO} onClick={confirmar}>Tentar de novo</button>
          ) : outroEmPrimeiro ? botaoMandarOutro(DOURADO) : botaoEntrar(DOURADO)}
        </div>
        {outroEmPrimeiro ? botaoEntrar(ROXO) : podeMandarOutro && botaoMandarOutro(ROXO)}
      </>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-card__inner" data-confirmar-email={fase === 'recusado' ? recusa.tipo : fase}>
          <div className="auth-brand" style={{ opacity: 1, display: 'flex', justifyContent: 'flex-start' }}>
            <FuttyLogo variant="icone" size={40} />
          </div>
          <h1 className="auth-title">{titulo}</h1>
          <div className="auth-rule" aria-hidden="true" />
          <p className="auth-subtitle" style={{ marginBottom: 20 }} data-frase-do-link>{frase}</p>
          <div className="auth-form">{acoes}</div>
        </div>
      </div>
    </div>
  );
}
