// Futty v2.0 — Página de convite: aceitar entrada numa equipa.
// Centrada, sem cartão; marca atual no alto (F dourado + FUTTY espaçado, o lockup do
// e-mail); o logo do time grande no centro; nome em destaque; três fatos; UM botão. O desenho vive em convite.css.
// O link é o longo (/convite/<uuid>) ou o curto (/c/<código>) — a mesma tela; quem chega sem conta (ou
// com conta que ainda não terminou o onboarding) deixa o bilhete do convite no aparelho e segue para o cadastro / o onboarding,
// que ABRE nas boas-vindas do time; time sem logo = só o nome em destaque, sem quadrado de iniciais.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MapPin, Users } from 'lucide-react';
import { apiFetch, assetUrl } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { usePerfil } from '../context/PerfilContext';
import FuttyLogo from '../components/FuttyLogo';
import { urlImagem } from '../utils/avatar';
import { fatosDoConvite, fraseDoConvite } from '../utils/convite';
import { guardarConvitePendente, tomarConvitePendente } from '../lib/convitePendente';
import { preaquecerOnboarding } from '../lib/preaquecerOnboarding';
import '../styles/app.css';
import '../styles/convite.css';

const MOTIVOS = {
  nao_encontrado: 'Este convite não existe.',
  expirado: 'Este convite expirou.',
};

// O calendário não está entre os ícones que o arranque já carrega (lucide vive num chunk de arranque com teto de
// 320 KiB): aqui vai como traço inline, no mesmo desenho 24×24 do lucide, e custa só o chunk desta página.
function IconeCalendario({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2v4M16 2v4M3 10h18" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
    </svg>
  );
}
const ICONE_DO_FATO = {
  membros: <Users size={15} aria-hidden="true" />,
  jogo: <IconeCalendario />,
  cidade: <MapPin size={15} aria-hidden="true" />,
};

/**
 * O escudo do time: o logo. Sem logo não há escudo (nada de quadrado com iniciais — o nome em destaque basta).
 * `vazio` = esqueleto enquanto o convite carrega.
 */
function Escudo({ team, vazio = false }) {
  if (vazio) return <div className="convite__escudo convite__escudo--vazio" aria-hidden="true" />;
  if (!team?.logo_url) return null;
  return (
    <div className="convite__escudo" style={{ background: team.cor_fundo || '#1a1a2e' }}>
      <img src={urlImagem(assetUrl(team.logo_url), 384)} alt={`Logo do ${team.nome}`} decoding="async" />
    </div>
  );
}

export default function Convite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const { perfil, deCache, carregando: perfilCarregando } = usePerfil();
  // Conta que existe mas ainda não terminou o onboarding (cadastro por e-mail, Google ou Apple em andamento): o convite vai
  // para o onboarding, não para "Entrar no time". `!deCache`: nunca decide a partir de um perfil guardado no aparelho.
  const contaSemOnboarding = !!session && !deCache && perfil?.user?.onboarding_completo === false;

  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  // P1-2 — saída do beco: pedir entrada na equipa que o token identifica.
  const [pedindo, setPedindo] = useState(false);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);

  useEffect(() => {
    // Espera a sessão resolver para que o pedido vá autenticado (saber se já é membro)
    if (authLoading) return;
    let active = true;
    apiFetch(`/api/convite/${token}`)
      .then((data) => {
        if (active) setInfo(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, authLoading]);

  // O bilhete do convite: sem conta, ou com conta que ainda não terminou o onboarding, o convite fica guardado
  // no aparelho DESDE QUE a página abre — o cadastro por e-mail, o Google e a Apple levam a pessoa para fora (e o OAuth perde o
  // `state` do roteador), mas o bilhete sobrevive. O Onboarding o lê e começa nas boas-vindas do time; ao final, aceita o convite.
  // Para quem já tem conta pronta não há bilhete: "Entrar no time" resolve aqui mesmo.
  useEffect(() => {
    if (!info?.valido || info.jaMembro || !info.team) return;
    if (!session || contaSemOnboarding) guardarConvitePendente(token, Date.now(), info.team);
    if (contaSemOnboarding) navigate('/onboarding', { replace: true });
  }, [info, session, contaSemOnboarding, token, navigate]);

  // O próximo passo é o cadastro/onboarding: o chunk dele e as boas-vindas do time já vêm a caminho (item 4).
  useEffect(() => { if (!session) preaquecerOnboarding({ convidado: true }); }, [session]);

  // Sem conta: cadastro (o bilhete no aparelho traz a pessoa de volta a este convite depois da foto e do e-mail).
  function criarContaEEntrar() {
    guardarConvitePendente(token, Date.now(), info?.team);
    navigate('/register');
  }

  async function aceitar() {
    // Não autenticado → cadastro, e volta para este convite
    if (!session) {
      criarContaEEntrar();
      return;
    }
    setError('');
    setAccepting(true);
    try {
      const { team, jaMembro } = await apiFetch(`/api/convite/${token}/aceitar`, { method: 'POST' });
      tomarConvitePendente(); // entrou: o bilhete cumpriu a função (se houvesse)
      // `primeiraEntrada`: a página do time abre as boas-vindas — só para quem acabou de entrar.
      navigate(`/time/${team.slug}`, { replace: true, state: jaMembro ? undefined : { primeiraEntrada: true } });
    } catch (err) {
      setError(err.message);
      setAccepting(false);
    }
  }

  // P1-2 — convite morto mas o token diz-nos a equipa: em vez de beco, pede
  // entrada (o admin decide, o desfecho aparece no Início). Sem sessão → login
  // e volta a este convite.
  async function pedirEntrada() {
    const alvo = info?.team;
    if (!alvo) return;
    if (!session) {
      navigate('/login', { state: { from: { pathname: `/convite/${token}` } } });
      return;
    }
    setError('');
    setPedindo(true);
    try {
      const r = await apiFetch(`/api/teams/${alvo.slug}/pedir-entrada`, { method: 'POST', body: JSON.stringify({}) });
      if (r?.entrou) {
        navigate(`/time/${alvo.slug}`, { replace: true });
        return;
      }
      setPedidoEnviado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setPedindo(false);
    }
  }

  const team = info?.team;

  // Saídas partilhadas pelos estados de convite morto (P1-2): pedir entrada (se
  // conhecemos a equipa) e/ou procurar no Explorar.
  const saidas = (alvo) => (
    <div className="convite__acoes">
      <div className="convite__sec">
        {alvo ? (
          pedidoEnviado ? (
            <div className="convite__aviso" style={{ margin: 0 }}>
              Pedido enviado a {alvo.nome}. O admin decide, você vê o desfecho no Início.
            </div>
          ) : (
            <button type="button" className="btn cta-gold convite__cta" onClick={pedirEntrada} disabled={pedindo}>
              {pedindo ? 'Enviando…' : session ? `Pedir entrada em ${alvo.nome}` : `Entre na conta para pedir entrada em ${alvo.nome}`}
            </button>
          )
        ) : null}
        <Link to="/explorar" className="btn" style={{ width: '100%', border: '1.5px solid rgba(255,255,255,0.22)', color: 'var(--text-dim)' }}>
          Procurar times no Radar de peladas
        </Link>
      </div>
      <Link to="/home" className="convite__ja-tenho">
        Ir para a página inicial
      </Link>
    </div>
  );

  return (
    <main className="convite" data-convite>
      <div className="convite__col">
        <div className="convite__marca" aria-label="Futty">
          <FuttyLogo variant="icone" size={46} />
          <span className="convite__marca-nome" aria-hidden="true">FUTTY</span>
        </div>

        {loading || (!!session && perfilCarregando) || (contaSemOnboarding && info?.valido && !info.jaMembro) ? (
          <>
            <Escudo vazio />
            <p className="convite__espera">Validando convite…</p>
          </>
        ) : error ? (
          <>
            <h1 className="convite__titulo">Ops…</h1>
            <div className="alert alert--error convite__erro">{error}</div>
            {saidas(info?.team)}
          </>
        ) : !info?.valido ? (
          <>
            {team ? <Escudo team={team} /> : null}
            <h1 className="convite__titulo" style={{ marginTop: team?.logo_url ? 22 : 0 }}>Convite inválido</h1>
            <p className="convite__frase">
              {MOTIVOS[info?.motivo] || 'Este convite não está disponível.'}
              {team ? ' Mas você ainda pode entrar no time:' : ''}
            </p>
            {saidas(team)}
          </>
        ) : (
          <>
            <Escudo team={team} />
            <h1 className={`convite__nome${team?.logo_url ? '' : ' convite__nome--sozinho'}`}>{team?.nome}</h1>
            <p className="convite__frase">{fraseDoConvite({ convidadoPor: info.convidadoPor, nomeTime: team?.nome })}</p>

            {(() => {
              const fatos = fatosDoConvite(info);
              return fatos.length ? (
                <ul className="convite__fatos" aria-label="Sobre o time">
                  {fatos.map((f) => (
                    <li key={f.chave} className="convite__fato">
                      {ICONE_DO_FATO[f.chave]}
                      {f.texto}
                    </li>
                  ))}
                </ul>
              ) : null;
            })()}

            {error && <div className="alert alert--error convite__erro">{error}</div>}

            {info.jaMembro ? (
              <>
                <div className="convite__aviso">Você já é membro deste time.</div>
                <div className="convite__acoes">
                  <Link to={`/time/${team?.slug}`} className="btn cta-gold convite__cta">
                    Ir para o time
                  </Link>
                </div>
              </>
            ) : (
              <div className="convite__acoes">
                <button type="button" className="btn cta-gold convite__cta" onClick={aceitar} disabled={accepting}>
                  {accepting ? 'Entrando…' : session ? 'Entrar no time' : 'Criar conta e entrar'}
                </button>
                {!session && (
                  <Link to="/login" state={{ from: { pathname: `/convite/${token}` } }} className="convite__ja-tenho">
                    já tenho conta
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
